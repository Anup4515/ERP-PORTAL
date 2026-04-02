import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { executeQuery, executeTransaction } from "@/app/lib/db"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const school_id = session.user.school_id
    if (!school_id) return NextResponse.json({ error: "No partner profile" }, { status: 400 })

    const partnerRows = await executeQuery<{ user_id: number }[]>(
      "SELECT user_id FROM partners WHERE id = ?",
      [school_id]
    )
    if (partnerRows.length === 0) return NextResponse.json({ error: "Partner not found" }, { status: 404 })
    const partnerUserId = partnerRows[0].user_id

    const body = await request.json()
    const { class_section_id, date, records } = body

    if (!class_section_id || !date || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: "class_section_id, date, and records array are required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const csCheck = await executeQuery<{ id: number }[]>(
      `SELECT ecs.id FROM erp_class_sections ecs
       JOIN erp_sessions es ON es.id = ecs.session_id
       WHERE ecs.id = ? AND es.partner_id = ?`,
      [class_section_id, partnerUserId]
    )
    if (csCheck.length === 0) {
      return NextResponse.json({ error: "Class section not found" }, { status: 404 })
    }

    // Check if date is a holiday (calendar is session-level)
    const holidayCheck = await executeQuery<{ is_holiday: number }[]>(
      `SELECT cd.is_holiday FROM erp_calendar_days cd
       JOIN erp_class_sections ecs ON ecs.session_id = cd.session_id
       WHERE ecs.id = ? AND cd.date = ?`,
      [class_section_id, date]
    )
    if (holidayCheck.length > 0 && holidayCheck[0].is_holiday === 1) {
      return NextResponse.json({ error: "Cannot mark attendance on a holiday" }, { status: 400 })
    }

    const markedBy = session.user.user_id

    await executeTransaction(async (connection) => {
      for (const record of records) {
        const { enrollment_id, status, remarks } = record
        if (!enrollment_id || !status) continue

        // Check if record already exists
        const [existing] = await connection.execute(
          "SELECT id FROM erp_attendance_records WHERE student_enrollment_id = ? AND date = ?",
          [enrollment_id, date]
        )

        if ((existing as any[]).length > 0) {
          // Update existing
          await connection.execute(
            `UPDATE erp_attendance_records
             SET status = ?, remarks = ?, marked_by = ?, updated_at = NOW()
             WHERE student_enrollment_id = ? AND date = ?`,
            [status, remarks || null, markedBy, enrollment_id, date]
          )
        } else {
          // Insert new
          await connection.execute(
            `INSERT INTO erp_attendance_records (student_enrollment_id, date, status, remarks, marked_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
            [enrollment_id, date, status, remarks || null, markedBy]
          )
        }
      }
    })

    return NextResponse.json({ message: "Attendance saved successfully" })
  } catch (error) {
    console.error("Attendance bulk POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
