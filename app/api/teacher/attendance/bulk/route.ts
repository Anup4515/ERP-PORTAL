import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery, executeTransaction } from "@/app/lib/db"

export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext(["teacher"])
    if (isAuthError(ctx)) return ctx

    const body = await request.json()
    const { class_section_id, records } = body
    // records: Array of { enrollment_id, date, status }

    if (!class_section_id || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: "class_section_id and records are required" }, { status: 400 })
    }

    // Verify teacher assignment
    const sessRows = await executeQuery<{ id: number }[]>(
      "SELECT id FROM erp_sessions WHERE partner_id = ? AND is_current = 1 LIMIT 1",
      [ctx.partnerUserId]
    )
    if (sessRows.length === 0) {
      return NextResponse.json({ error: "No active session" }, { status: 400 })
    }
    const currentSessionId = sessRows[0].id

    const csCheck = await executeQuery<{ id: number }[]>(
      `SELECT ecs.id FROM erp_class_sections ecs
       WHERE ecs.id = ? AND ecs.session_id = ?
         AND (ecs.class_teacher_id = ? OR ecs.second_incharge_id = ?
              OR ecs.id IN (SELECT DISTINCT class_section_id FROM erp_subjects WHERE teacher_id = ?))`,
      [class_section_id, currentSessionId, ctx.userId, ctx.userId, ctx.userId]
    )
    if (csCheck.length === 0) {
      return NextResponse.json({ error: "Not authorized for this class" }, { status: 403 })
    }

    // Get holiday dates to prevent marking on holidays
    const holidayRows = await executeQuery<{ date: string }[]>(
      `SELECT DATE_FORMAT(date, '%Y-%m-%d') as date FROM erp_calendar_days
       WHERE session_id = ? AND is_holiday = 1`,
      [currentSessionId]
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
