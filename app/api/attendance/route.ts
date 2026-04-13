import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin", "teacher"])
    if (isAuthError(ctx)) return ctx

    const { searchParams } = new URL(request.url)
    const classSectionId = searchParams.get("class_section_id")
    const date = searchParams.get("date")

    if (!classSectionId || !date) {
      return NextResponse.json(
        { error: "class_section_id and date are required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const csCheck = await executeQuery<{ id: number }[]>(
      `SELECT ecs.id FROM erp_class_sections ecs
       JOIN erp_sessions es ON es.id = ecs.session_id
       WHERE ecs.id = ? AND es.partner_id = ?`,
      [classSectionId, ctx.partnerUserId]
    )
    if (csCheck.length === 0) {
      return NextResponse.json({ error: "Class section not found" }, { status: 404 })
    }

    // Check if date is a holiday (calendar is session-level)
    const holidayCheck = await executeQuery<{ is_holiday: number }[]>(
      `SELECT cd.is_holiday FROM erp_calendar_days cd
       JOIN erp_class_sections ecs ON ecs.session_id = cd.session_id
       WHERE ecs.id = ? AND cd.date = ?`,
      [classSectionId, date]
    )
    const isHoliday = holidayCheck.length > 0 && holidayCheck[0].is_holiday === 1

    // Get all enrolled students with their attendance for this date
    const students = await executeQuery(
      `SELECT se.id as enrollment_id, se.student_id, se.roll_number,
              s.first_name, s.last_name,
              ar.id as attendance_id, ar.status, ar.remarks
       FROM erp_student_enrollments se
       JOIN students s ON s.id = se.student_id
       LEFT JOIN erp_attendance_records ar ON ar.student_enrollment_id = se.id AND ar.date = ?
       WHERE se.class_section_id = ? AND se.status = 'active' AND s.deleted_at IS NULL
       ORDER BY se.roll_number, s.first_name`,
      [date, classSectionId]
    )

    return NextResponse.json({ data: { students, is_holiday: isHoliday } })
  } catch (error) {
    console.error("Attendance GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
