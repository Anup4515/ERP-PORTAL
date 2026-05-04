import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery, executeTransaction } from "@/app/lib/db"

interface PromotionEntry {
  student_id: number
  source_enrollment_id: number
  source_class_section_id: number
  target_class_section_id: number | null // null = graduated (no new enrollment)
  action: "promoted" | "detained" | "graduated"
  roll_number: number | null
}

interface TransitionRequest {
  target_session_name: string
  target_session_start_date: string
  target_session_end_date: string
  copy_subjects: boolean
  copy_teacher_assignments: boolean
  copy_timetable: boolean
  copy_grading_scheme: boolean
  promotions: PromotionEntry[]
}

/**
 * POST /api/sessions/[id]/transition
 *
 * Executes the full session transition in a single transaction:
 * 1. Creates target session (if not exists)
 * 2. Copies class sections with teacher assignments
 * 3. Copies subjects with teacher assignments
 * 4. Copies timetable (optional)
 * 5. Copies grading scheme (optional)
 * 6. Marks old enrollments as 'completed'
 * 7. Creates new enrollments for promoted/detained students
 * 8. Generates calendar for new session
 * 9. Sets new session as current
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sourceSessionId } = await params

    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    // Verify source session belongs to this partner
    const sessionRows = await executeQuery<{ id: number; name: string }[]>(
      "SELECT id, name FROM erp_sessions WHERE id = ? AND partner_id = ?",
      [sourceSessionId, ctx.partnerUserId]
    )
    if (sessionRows.length === 0) {
      return NextResponse.json({ error: "Source session not found" }, { status: 404 })
    }

    const body: TransitionRequest = await request.json()
    const {
      target_session_name,
      target_session_start_date,
      target_session_end_date,
      copy_subjects,
      copy_teacher_assignments,
      copy_timetable,
      copy_grading_scheme,
      promotions,
    } = body

    if (!target_session_name || !target_session_start_date || !target_session_end_date) {
      return NextResponse.json(
        { error: "target_session_name, target_session_start_date, and target_session_end_date are required" },
        { status: 400 }
      )
    }

    if (new Date(target_session_end_date) <= new Date(target_session_start_date)) {
      return NextResponse.json(
        { error: "target end date must be after start date" },
        { status: 400 }
      )
    }

    if (!Array.isArray(promotions) || promotions.length === 0) {
      return NextResponse.json(
        { error: "promotions array is required and cannot be empty" },
        { status: 400 }
      )
    }

    const result = await executeTransaction(async (connection) => {
      // ── Step 1: Create target session ──────────────────────────────
      const [sessionRows] = await connection.execute<{ id: number }[]>(
        `INSERT INTO erp_sessions (partner_id, name, start_date, end_date, is_current, created_at, updated_at)
         VALUES (?, ?, ?, ?, FALSE, NOW(), NOW())
         RETURNING id`,
        [ctx.partnerUserId, target_session_name, target_session_start_date, target_session_end_date]
      )
      const targetSessionId = sessionRows[0].id

      // ── Step 2: Copy class sections with teacher assignments ───────
      // Get source class sections
      const [sourceClassSections] = await connection.execute(
        `SELECT id, class_id, section_id, class_teacher_id, second_incharge_id, max_students
         FROM erp_class_sections WHERE session_id = ?`,
        [sourceSessionId]
      )
      const srcSections = sourceClassSections as any[]

      // Map: old class_section_id → new class_section_id
      const classSectionMap: Record<number, number> = {}

      for (const src of srcSections) {
        const teacherId = copy_teacher_assignments ? src.class_teacher_id : null
        const secondId = copy_teacher_assignments ? src.second_incharge_id : null

        const [insertedRows] = await connection.execute<{ id: number }[]>(
          `INSERT INTO erp_class_sections
            (session_id, class_id, section_id, class_teacher_id, second_incharge_id, max_students, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
           RETURNING id`,
          [targetSessionId, src.class_id, src.section_id, teacherId, secondId, src.max_students]
        )
        classSectionMap[src.id] = insertedRows[0].id
      }

      // ── Step 3: Copy subjects with teacher assignments ─────────────
      if (copy_subjects) {
        const [sourceSubjects] = await connection.execute(
          `SELECT sub.class_section_id, sub.name, sub.code, sub.teacher_id, sub.sort_order
           FROM erp_subjects sub
           WHERE sub.class_section_id IN (${srcSections.map(() => "?").join(",")})
           ORDER BY sub.class_section_id, sub.sort_order`,
          srcSections.map((s: any) => s.id)
        )

        for (const sub of sourceSubjects as any[]) {
          const newCsId = classSectionMap[sub.class_section_id]
          if (!newCsId) continue

          const teacherId = copy_teacher_assignments ? sub.teacher_id : null

          await connection.execute(
            `INSERT INTO erp_subjects
              (class_section_id, name, code, teacher_id, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
            [newCsId, sub.name, sub.code, teacherId, sub.sort_order]
          )
        }
      }

      // ── Step 4: Copy timetable configuration (optional) ────────────
      if (copy_timetable) {
        // Copy timetable_config (period definitions)
        const [srcConfig] = await connection.execute(
          `SELECT period_number, start_time, end_time, slot_type, label
           FROM erp_timetable_config WHERE partner_id = ?
           ORDER BY period_number`,
          [ctx.partnerUserId]
        )
        // Timetable config is per-partner, not per-session, so it persists already.
        // Copy timetable slots (class-section specific)
        for (const oldCsId of Object.keys(classSectionMap)) {
          const newCsId = classSectionMap[Number(oldCsId)]
          const [srcSlots] = await connection.execute(
            `SELECT day_of_week, period_number, subject_id, teacher_id, room_number
             FROM erp_timetable_slots WHERE class_section_id = ?`,
            [oldCsId]
          )

          for (const slot of srcSlots as any[]) {
            // Subject IDs are from old session — we need to find the matching new subject
            // For now copy teacher_id and room, skip subject_id mapping (admin can reassign)
            await connection.execute(
              `INSERT INTO erp_timetable_slots
                (class_section_id, day_of_week, period_number, teacher_id, room_number, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
              [newCsId, slot.day_of_week, slot.period_number, slot.teacher_id, slot.room_number]
            )
          }
        }
      }

      // ── Step 5: Copy grading scheme (optional) ─────────────────────
      if (copy_grading_scheme) {
        const [srcConfig] = await connection.execute(
          `SELECT grading_scheme_id, max_subjects, max_exams, max_parameters,
                  attendance_method, start_month, marks_threshold
           FROM erp_configurations WHERE session_id = ? AND partner_id = ?`,
          [sourceSessionId, ctx.partnerUserId]
        )
        if ((srcConfig as any[]).length > 0) {
          const cfg = (srcConfig as any[])[0]
          await connection.execute(
            `INSERT INTO erp_configurations
              (partner_id, session_id, grading_scheme_id, max_subjects, max_exams, max_parameters,
               attendance_method, start_month, marks_threshold, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              ctx.partnerUserId, targetSessionId, cfg.grading_scheme_id,
              cfg.max_subjects, cfg.max_exams, cfg.max_parameters,
              cfg.attendance_method, cfg.start_month, cfg.marks_threshold,
            ]
          )
        }
      }

      // ── Step 6: Mark old enrollments as 'completed' ────────────────
      const oldCsIds = srcSections.map((s: any) => s.id)
      if (oldCsIds.length > 0) {
        await connection.execute(
          `UPDATE erp_student_enrollments
           SET status = 'completed', updated_at = NOW()
           WHERE class_section_id IN (${oldCsIds.map(() => "?").join(",")})
             AND status = 'active'`,
          oldCsIds
        )
      }

      // ── Step 7: Create new enrollments ─────────────────────────────
      let promotedCount = 0
      let detainedCount = 0
      let graduatedCount = 0

      for (const entry of promotions) {
        if (entry.action === "graduated") {
          // No new enrollment — student has completed their education here
          graduatedCount++
          continue
        }

        // Determine target class section
        let targetCsId: number | null = null

        if (entry.action === "detained") {
          // Detained: same class, new session's class section
          targetCsId = classSectionMap[entry.source_class_section_id] ?? null
          detainedCount++
        } else {
          // Promoted: target_class_section_id refers to a class+section combo
          // The wizard sends the NEW session's class_section_id (already created in step 2)
          targetCsId = entry.target_class_section_id ?? null
          promotedCount++
        }

        if (!targetCsId) continue

        // Resolve the actual new class_section_id from the map if needed
        // If the wizard sent old class_section_ids, map them; otherwise use directly
        const resolvedCsId = classSectionMap[targetCsId] ?? targetCsId

        const studentType = entry.action === "detained" ? "repeater" : "promoted"

        await connection.execute(
          `INSERT INTO erp_student_enrollments
            (student_id, class_section_id, partner_id, roll_number, student_type,
             previous_enrollment_id, enrollment_date, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, CURRENT_DATE, 'active', NOW(), NOW())`,
          [
            entry.student_id,
            resolvedCsId,
            ctx.partnerUserId,
            entry.roll_number,
            studentType,
            entry.source_enrollment_id,
          ]
        )
      }

      // ── Step 8: Generate calendar for new session ──────────────────
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
      const startDt = new Date(target_session_start_date)
      const endDt = new Date(target_session_end_date)

      const batchSize = 50
      let batch: { date: string; day_of_week: string; is_holiday: number; holiday_reason: string | null }[] = []

      for (let d = new Date(startDt); d <= endDt; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = dayNames[d.getDay()]
        const isSunday = d.getDay() === 0
        const yr = d.getFullYear()
        const mo = String(d.getMonth() + 1).padStart(2, "0")
        const da = String(d.getDate()).padStart(2, "0")

        batch.push({
          date: `${yr}-${mo}-${da}`,
          day_of_week: dayOfWeek,
          is_holiday: isSunday ? 1 : 0,
          holiday_reason: isSunday ? "Sunday" : null,
        })

        if (batch.length >= batchSize) {
          const placeholders = batch.map(() => "(?, ?, ?, ?, ?, NOW(), NOW())").join(", ")
          const values = batch.flatMap((dd) => [
            targetSessionId, dd.date, dd.day_of_week, dd.is_holiday, dd.holiday_reason,
          ])
          await connection.execute(
            `INSERT INTO erp_calendar_days
              (session_id, date, day_of_week, is_holiday, holiday_reason, created_at, updated_at)
             VALUES ${placeholders}`,
            values
          )
          batch = []
        }
      }

      // Flush remaining calendar days
      if (batch.length > 0) {
        const placeholders = batch.map(() => "(?, ?, ?, ?, ?, NOW(), NOW())").join(", ")
        const values = batch.flatMap((dd) => [
          targetSessionId, dd.date, dd.day_of_week, dd.is_holiday, dd.holiday_reason,
        ])
        await connection.execute(
          `INSERT INTO erp_calendar_days
            (session_id, date, day_of_week, is_holiday, holiday_reason, created_at, updated_at)
           VALUES ${placeholders}`,
          values
        )
      }

      // ── Step 9: Set new session as current ─────────────────────────
      await connection.execute(
        "UPDATE erp_sessions SET is_current = FALSE, updated_at = NOW() WHERE partner_id = ?",
        [ctx.partnerUserId]
      )
      await connection.execute(
        "UPDATE erp_sessions SET is_current = TRUE, updated_at = NOW() WHERE id = ?",
        [targetSessionId]
      )

      return {
        target_session_id: targetSessionId,
        class_sections_created: Object.keys(classSectionMap).length,
        students_promoted: promotedCount,
        students_detained: detainedCount,
        students_graduated: graduatedCount,
        enrollments_completed: oldCsIds.length > 0 ? promotions.length : 0,
      }
    })

    return NextResponse.json({
      data: result,
      message: "Session transition completed successfully",
    })
  } catch (error: unknown) {
    console.error("Session transition error:", error)
    const err = error as { code?: string }
    // PG: 23505 = unique_violation. (mysql2's "ER_DUP_ENTRY" is no longer
    // emitted; kept the check for any leftover MySQL surface.)
    if (err?.code === "23505" || err?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "A session with this name already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
