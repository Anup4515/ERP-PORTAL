import { NextResponse } from "next/server"
import { getAuthContext, isAuthError, resolveSessionId, isSessionError, ensureCurrentSession } from "@/app/lib/auth-utils"
import { executeQuery, executeTransaction } from "@/app/lib/db"
import { createStudentSchema, parseOrError } from "@/app/lib/validations"
import { autoAssignDuesForNewEnrollment } from "@/app/lib/fee-assignment"

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const sess = await resolveSessionId(request, ctx.partnerUserId)
    if (isSessionError(sess)) return sess

    const { searchParams } = new URL(request.url)
    const classSectionId = searchParams.get("class_section_id")
    const search = searchParams.get("search")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)))
    const offset = (page - 1) * limit

    // No session yet — return empty list
    if (sess.sessionId === null) {
      return NextResponse.json({ data: { students: [], total: 0, page: 1, limit: 50 } })
    }
    const sessionId: number = sess.sessionId

    let whereClause = "WHERE e.partner_id = ? AND es.id = ? AND st.deleted_at IS NULL"
    const queryParams: (string | number)[] = [ctx.partnerUserId, sessionId]

    if (classSectionId) {
      whereClause += " AND e.class_section_id = ?"
      queryParams.push(Number(classSectionId))
    }

    if (search) {
      whereClause += " AND (st.first_name LIKE ? OR st.last_name LIKE ?)"
      const searchPattern = `%${search}%`
      queryParams.push(searchPattern, searchPattern)
    }

    const countResult = await executeQuery<{ total: number }[]>(
      `SELECT COUNT(*) as total
       FROM students st
       JOIN erp_student_enrollments e ON e.student_id = st.id
       JOIN erp_class_sections ecs ON ecs.id = e.class_section_id
       JOIN erp_sessions es ON es.id = ecs.session_id
       ${whereClause}`,
      queryParams
    )
    const total = countResult[0].total

    const students = await executeQuery(
      `SELECT st.*, e.id as enrollment_id, e.class_section_id, e.roll_number, e.student_type, e.status as enrollment_status,
              c.name as class_name, sec.name as section_name
       FROM students st
       JOIN erp_student_enrollments e ON e.student_id = st.id
       JOIN erp_class_sections ecs ON ecs.id = e.class_section_id
       JOIN erp_sessions es ON es.id = ecs.session_id
       JOIN classes c ON c.id = ecs.class_id
       JOIN sections sec ON sec.id = ecs.section_id
       ${whereClause}
       ORDER BY st.first_name, st.last_name
       LIMIT ${limit} OFFSET ${offset}`,
      queryParams
    )

    return NextResponse.json({ data: { students, total, page, limit } })
  } catch (error) {
    console.error("Students GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const { searchParams } = new URL(request.url)
    const sessionIdParam = searchParams.get("session_id")
    if (sessionIdParam) {
      const guard = await ensureCurrentSession(Number(sessionIdParam), ctx.partnerUserId)
      if (guard) return guard
    }

    const body = await request.json()
    const parsed = parseOrError(createStudentSchema, body)
    if (!parsed.success) return parsed.response

    const {
      first_name, last_name, email, class_section_id,
      middle_name, gender, date_of_birth, phone, alternate_phone,
      address, city, state, country, postal_code,
      father_name, mother_name, guardian_name, guardian_phone, guardian_email,
      profile_image, status, height, weight, blood_group,
      roll_number, student_type
    } = parsed.data

    // Verify class_section_id belongs to this partner. We also pull session_id
    // here so the auto-assign step inside the transaction doesn't need a
    // second lookup.
    const ownershipCheck = await executeQuery<{ id: number; session_id: number }[]>(
      `SELECT ecs.id, ecs.session_id FROM erp_class_sections ecs
       JOIN erp_sessions es ON es.id = ecs.session_id
       WHERE ecs.id = ? AND es.partner_id = ?`,
      [class_section_id, ctx.partnerUserId]
    )
    if (ownershipCheck.length === 0) {
      return NextResponse.json({ error: "Class section not found" }, { status: 404 })
    }
    const enrollmentSessionId = ownershipCheck[0].session_id

    // Resolve partner billing context for Model 2 (paid school) auto-subscription.
    // Model 1 (tier='free') skips this — students pay their own way.
    const partnerRows = await executeQuery<{
      id: number
      tier: "free" | "paid"
      default_plan_id: number | null
      contract_ends_at: string | null
    }[]>(
      `SELECT p.id, p.tier, p.default_plan_id, p.contract_ends_at
       FROM partners p
       WHERE p.user_id = ?`,
      [ctx.partnerUserId]
    )
    const partner = partnerRows[0]
    const shouldAutoSubscribe = partner?.tier === "paid" && partner.default_plan_id != null

    // For paid partners, look up plan duration so we can compute expires_at
    // when contract_ends_at is unset. Done outside the transaction (read-only).
    let planDurationDays: number | null = null
    if (shouldAutoSubscribe) {
      const planRows = await executeQuery<{ duration_days: number }[]>(
        `SELECT duration_days FROM plans WHERE id = ? LIMIT 1`,
        [partner.default_plan_id]
      )
      planDurationDays = planRows[0]?.duration_days ?? null
    }

    let studentId: number = 0
    let autoAssignResult: { structuresMatched: number; duesInserted: number } = {
      structuresMatched: 0,
      duesInserted: 0,
    }

    await executeTransaction(async (connection) => {
      const [studentResult] = await connection.execute(
        `INSERT INTO students (
          created_by, first_name, last_name, middle_name, gender, date_of_birth,
          email, phone, alternate_phone, address, city, state, country, postal_code,
          father_name, mother_name, guardian_name, guardian_phone, guardian_email,
          profile_image, status, height, weight, blood_group, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          ctx.userId || null, first_name, last_name, middle_name || null,
          gender || null, date_of_birth || null, email, phone || null, alternate_phone || null,
          address || null, city || null, state || null, country || null, postal_code || null,
          father_name || null, mother_name || null, guardian_name || null,
          guardian_phone || null, guardian_email || null, profile_image || null,
          status || "active", height || null, weight || null, blood_group || null
        ]
      )
      studentId = (studentResult as any).insertId

      const [enrollmentResult] = await connection.execute(
        `INSERT INTO erp_student_enrollments (
          student_id, class_section_id, partner_id, roll_number, student_type, enrollment_date, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, CURDATE(), 'active', NOW(), NOW())`,
        [studentId, class_section_id, ctx.partnerUserId, roll_number || null, student_type || "regular"]
      )
      const enrollmentId = (enrollmentResult as { insertId: number }).insertId

      // Auto-assign every fee structure in scope (whole-session + this
      // class_section's structures) to the new enrollment. enrollment_date is
      // CURDATE() per the INSERT above; passing today's date here keeps the
      // monthly window clamping in sync (only the YYYY-MM portion is read).
      const todayISO = new Date().toISOString().slice(0, 10)
      autoAssignResult = await autoAssignDuesForNewEnrollment(
        connection,
        ctx.partnerUserId,
        enrollmentSessionId,
        {
          id: enrollmentId,
          class_section_id,
          enrollment_date: todayISO,
        }
      )

      if (shouldAutoSubscribe) {
        // expires_at: prefer contract end date; otherwise start + plan.duration_days;
        // otherwise leave the row out (logged below) — better than guessing.
        const expiresAtSql = partner.contract_ends_at
          ? "?"
          : planDurationDays != null
            ? "DATE_ADD(NOW(), INTERVAL ? DAY)"
            : null

        if (expiresAtSql) {
          const expiresAtParam = partner.contract_ends_at ?? planDurationDays
          await connection.execute(
            `INSERT INTO student_subscriptions (
              student_id, plan_id, start_date, end_date, is_active,
              status, starts_at, expires_at, payer_type, payer_partner_id,
              created_at, updated_at
            ) VALUES (?, ?, CURDATE(),
              ${partner.contract_ends_at ? "?" : "DATE_ADD(CURDATE(), INTERVAL ? DAY)"},
              1, 'active', NOW(), ${expiresAtSql}, 'partner', ?, NOW(), NOW())`,
            [
              studentId,
              partner.default_plan_id,
              expiresAtParam,
              expiresAtParam,
              partner.id,
            ]
          )
        }
      }
    })

    if (partner?.tier === "paid" && !shouldAutoSubscribe) {
      console.warn(
        `Partner ${partner.id} is tier='paid' but has no default_plan_id — student ${studentId} created without auto-subscription`
      )
    }

    // Surface auto-assigned dues in the response so admins aren't surprised
    // by a fresh student showing up with pending fees later. The frontend can
    // either ignore this or show "Student added · 12 dues assigned".
    let message = "Student created successfully"
    if (autoAssignResult.duesInserted > 0) {
      const { duesInserted, structuresMatched } = autoAssignResult
      message += ` · ${duesInserted} fee due${duesInserted === 1 ? "" : "s"} assigned from ${structuresMatched} fee structure${structuresMatched === 1 ? "" : "s"}`
    }

    return NextResponse.json(
      {
        data: {
          id: studentId,
          fees_assigned: autoAssignResult.duesInserted,
          fee_structures_matched: autoAssignResult.structuresMatched,
        },
        message,
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error("Students POST error:", error)
    const err = error as { code?: string; sqlMessage?: string; message?: string }
    if (err?.code === "ER_DUP_ENTRY") {
      const sqlMsg = err.sqlMessage || err.message || ""

      // Roll-number-in-section collision: look up the next free roll so the
      // caller can recover with one click instead of guessing.
      if (sqlMsg.includes("uq_erp_enrollment_section_roll")) {
        const body = await request.clone().json().catch(() => ({})) as {
          class_section_id?: number
          roll_number?: number | string
        }
        const csId = Number(body.class_section_id)
        let suggested: number | null = null
        if (Number.isFinite(csId) && csId > 0) {
          const rows = await executeQuery<{ next_roll: number | null }[]>(
            `SELECT COALESCE(MAX(roll_number), 0) + 1 AS next_roll
               FROM erp_student_enrollments
              WHERE class_section_id = ?`,
            [csId]
          )
          suggested = rows[0]?.next_roll ?? null
        }
        return NextResponse.json(
          {
            error: `Roll number ${body.roll_number} is already used in this class.${suggested != null ? ` Try ${suggested}.` : ""}`,
            details: {
              field: "roll_number",
              attempted: body.roll_number,
              suggested,
            },
          },
          { status: 409 }
        )
      }

      // Email collision (students.email is unique).
      if (sqlMsg.toLowerCase().includes("email")) {
        return NextResponse.json(
          {
            error: "A student with this email already exists.",
            details: { field: "email" },
          },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: "A student with these details already exists." },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
