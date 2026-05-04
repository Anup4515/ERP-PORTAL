import { NextResponse } from "next/server"
import {
  getAuthContext,
  isAuthError,
  ensureCurrentSession,
} from "@/app/lib/auth-utils"
import { executeQuery, executeTransaction } from "@/app/lib/db"
import { assignFeeStructureSchema, parseOrError } from "@/app/lib/validations"
import { slotsForEnrollment } from "@/app/lib/fee-assignment"

interface StructureRow {
  id: number
  partner_id: number
  session_id: number
  class_section_id: number | null
  amount: string
  recurrence: "one_time" | "monthly"
  due_date: string | null
  start_month: string | null
  end_month: string | null
  due_day_of_month: number | null
}

interface EnrollmentRow {
  id: number
  enrollment_date: string | null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const structureRows = await executeQuery<StructureRow[]>(
      `SELECT id, partner_id, session_id, class_section_id, amount,
              recurrence, due_date, start_month, end_month, due_day_of_month
         FROM erp_fee_structures
        WHERE id = ? AND partner_id = ?`,
      [id, ctx.partnerUserId]
    )
    const structure = structureRows[0]
    if (!structure) {
      return NextResponse.json({ error: "Fee structure not found" }, { status: 404 })
    }

    const guard = await ensureCurrentSession(structure.session_id, ctx.partnerUserId)
    if (guard) return guard

    const body = await request.json().catch(() => ({}))
    const parsed = parseOrError(assignFeeStructureSchema, body ?? {})
    if (!parsed.success) return parsed.response
    const { enrollment_ids, class_section_id } = parsed.data

    // Resolve which enrollments to expand into dues.
    let enrollments: EnrollmentRow[] = []

    if (enrollment_ids && enrollment_ids.length > 0) {
      const placeholders = enrollment_ids.map(() => "?").join(", ")
      enrollments = await executeQuery<EnrollmentRow[]>(
        `SELECT se.id, se.enrollment_date
           FROM erp_student_enrollments se
           JOIN erp_class_sections ecs ON ecs.id = se.class_section_id
          WHERE se.id IN (${placeholders})
            AND ecs.session_id = ?
            AND se.partner_id = ?
            AND se.status IN ('active','completed')`,
        [...enrollment_ids, structure.session_id, ctx.partnerUserId]
      )
      if (enrollments.length !== enrollment_ids.length) {
        return NextResponse.json(
          { error: "One or more enrollments not found or not in this session" },
          { status: 404 }
        )
      }
    } else if (class_section_id) {
      if (
        structure.class_section_id !== null &&
        structure.class_section_id !== class_section_id
      ) {
        return NextResponse.json(
          { error: "class_section_id does not match the structure's class section" },
          { status: 400 }
        )
      }
      enrollments = await executeQuery<EnrollmentRow[]>(
        `SELECT se.id, se.enrollment_date
           FROM erp_student_enrollments se
           JOIN erp_class_sections ecs ON ecs.id = se.class_section_id
          WHERE ecs.id = ?
            AND ecs.session_id = ?
            AND se.partner_id = ?
            AND se.status IN ('active','completed')`,
        [class_section_id, structure.session_id, ctx.partnerUserId]
      )
    } else if (structure.class_section_id !== null) {
      enrollments = await executeQuery<EnrollmentRow[]>(
        `SELECT se.id, se.enrollment_date
           FROM erp_student_enrollments se
          WHERE se.class_section_id = ?
            AND se.partner_id = ?
            AND se.status IN ('active','completed')`,
        [structure.class_section_id, ctx.partnerUserId]
      )
    } else {
      enrollments = await executeQuery<EnrollmentRow[]>(
        `SELECT se.id, se.enrollment_date
           FROM erp_student_enrollments se
           JOIN erp_class_sections ecs ON ecs.id = se.class_section_id
          WHERE ecs.session_id = ?
            AND se.partner_id = ?
            AND se.status IN ('active','completed')`,
        [structure.session_id, ctx.partnerUserId]
      )
    }

    if (enrollments.length === 0) {
      return NextResponse.json({
        data: { assigned: 0, skipped: 0, total: 0, students: 0 },
        message: "No matching enrollments",
      })
    }

    // Validate monthly structure has the fields it needs (slotsForEnrollment
    // would silently return [] otherwise, which would mask a config bug here).
    if (
      structure.recurrence === "monthly" &&
      (!structure.start_month || !structure.end_month || !structure.due_day_of_month)
    ) {
      return NextResponse.json(
        {
          error:
            "Monthly structure is missing start_month, end_month, or due_day_of_month",
        },
        { status: 400 }
      )
    }

    interface PreparedRow {
      enrollmentId: number
      period: string
      due_date: string | null
    }

    const rows: PreparedRow[] = []
    let studentsBilled = 0
    let studentsAfterWindow = 0

    for (const e of enrollments) {
      const slots = slotsForEnrollment(structure, e.enrollment_date)
      if (slots.length === 0) {
        // Monthly + joined after window close.
        studentsAfterWindow += 1
        continue
      }
      studentsBilled += 1
      for (const slot of slots) {
        rows.push({ enrollmentId: e.id, period: slot.period, due_date: slot.due_date })
      }
    }

    if (rows.length === 0) {
      return NextResponse.json({
        data: { assigned: 0, skipped: 0, total: 0, students: enrollments.length },
        message:
          studentsAfterWindow > 0
            ? `No dues created — all ${studentsAfterWindow} student(s) joined after the fee window ended.`
            : "Structure produced no due periods.",
      })
    }

    let assigned = 0
    await executeTransaction(async (connection) => {
      const placeholders: string[] = []
      const values: (number | string | null)[] = []

      for (const r of rows) {
        placeholders.push("(?, ?, ?, ?, ?, ?)")
        values.push(
          ctx.partnerUserId,
          structure.id,
          r.period,
          r.enrollmentId,
          structure.amount,
          r.due_date
        )
      }

      // PG: ON CONFLICT DO NOTHING + RETURNING id gives us the same
      // semantic as MySQL's INSERT IGNORE + affectedRows.
      const [insertedRows] = await connection.execute<{ id: number }[]>(
        `INSERT INTO erp_fee_dues
           (partner_id, structure_id, period_label, student_enrollment_id, amount_due, due_date)
         VALUES ${placeholders.join(", ")}
         ON CONFLICT (structure_id, student_enrollment_id, period_label) DO NOTHING
         RETURNING id`,
        values
      )
      assigned = insertedRows.length
    })

    const totalRows = rows.length
    const skipped = totalRows - assigned

    let message = `Created ${assigned} due${assigned === 1 ? "" : "s"} for ${studentsBilled} student${studentsBilled === 1 ? "" : "s"}`
    if (skipped > 0) message += ` · ${skipped} already existed`
    if (studentsAfterWindow > 0) {
      message += ` · ${studentsAfterWindow} student${studentsAfterWindow === 1 ? "" : "s"} skipped (joined after window)`
    }

    return NextResponse.json({
      data: {
        assigned,
        skipped,
        total: totalRows,
        students: studentsBilled,
        students_after_window: studentsAfterWindow,
      },
      message,
    })
  } catch (error) {
    console.error("Fee structure assign error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
