import { NextResponse } from "next/server"
import { getAuthContext, isAuthError, resolveSessionId, isSessionError, ensureCurrentSession } from "@/app/lib/auth-utils"
import { executeQuery, executeTransaction } from "@/app/lib/db"

export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext(["teacher"])
    if (isAuthError(ctx)) return ctx

    const { searchParams } = new URL(request.url)
    const sessionIdParam = searchParams.get("session_id")
    if (sessionIdParam) {
      const guard = await ensureCurrentSession(Number(sessionIdParam), ctx.partnerUserId)
      if (guard) return guard
    }

    const body = await request.json()
    const { class_section_id, records } = body
    // records: Array of { enrollment_id, date, status }

    if (!class_section_id || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: "class_section_id and records are required" }, { status: 400 })
    }

    // Verify teacher assignment
    const sess = await resolveSessionId(request, ctx.partnerUserId)
    if (isSessionError(sess)) return sess

    const csCheck = await executeQuery<{ id: number }[]>(
      `SELECT ecs.id FROM erp_class_sections ecs
       WHERE ecs.id = ? AND ecs.session_id = ?
         AND (ecs.class_teacher_id = ? OR ecs.second_incharge_id = ?
              OR ecs.id IN (SELECT DISTINCT class_section_id FROM erp_subjects WHERE teacher_id = ?))`,
      [class_section_id, sess.sessionId, ctx.userId, ctx.userId, ctx.userId]
    )
    if (csCheck.length === 0) {
      return NextResponse.json({ error: "Not authorized for this class" }, { status: 403 })
    }

    // Load session date range — attendance dates must fall within it
    const sessionRows = await executeQuery<{ start_date: string | Date; end_date: string | Date }[]>(
      "SELECT start_date, end_date FROM erp_sessions WHERE id = ?",
      [sess.sessionId]
    )
    if (sessionRows.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }
    const toISO = (d: string | Date) =>
      typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10)
    const sessionStart = toISO(sessionRows[0].start_date)
    const sessionEnd = toISO(sessionRows[0].end_date)

    // Reject if any incoming date is outside the session window
    const outOfRange = records.find(
      (r: { date?: string }) =>
        typeof r.date === "string" && (r.date < sessionStart || r.date > sessionEnd)
    )
    if (outOfRange) {
      return NextResponse.json(
        {
          error: `Attendance dates must be within the session window (${sessionStart} to ${sessionEnd}).`,
        },
        { status: 400 }
      )
    }

    // Get holiday dates to prevent marking on holidays
    const holidayRows = await executeQuery<{ date: string }[]>(
      `SELECT to_char(date, 'YYYY-MM-DD') as date FROM erp_calendar_days
       WHERE session_id = ? AND is_holiday = TRUE`,
      [sess.sessionId]
    )
    const holidaySet = new Set(holidayRows.map((r) => r.date))

    await executeTransaction(async (connection) => {
      for (const record of records) {
        const { enrollment_id, date, status } = record
        if (!enrollment_id || !date || !status) continue
        if (holidaySet.has(date)) continue // skip holidays

        const [existing] = await connection.execute(
          "SELECT id FROM erp_attendance_records WHERE student_enrollment_id = ? AND date = ?",
          [enrollment_id, date]
        )

        if ((existing as any[]).length > 0) {
          await connection.execute(
            `UPDATE erp_attendance_records
             SET status = ?, marked_by = ?, updated_at = NOW()
             WHERE student_enrollment_id = ? AND date = ?`,
            [status, ctx.userId, enrollment_id, date]
          )
        } else {
          await connection.execute(
            `INSERT INTO erp_attendance_records (student_enrollment_id, date, status, marked_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, NOW(), NOW())`,
            [enrollment_id, date, status, ctx.userId]
          )
        }
      }
    })

    return NextResponse.json({ message: "Attendance saved successfully" })
  } catch (error) {
    console.error("Teacher attendance bulk POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
