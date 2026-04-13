import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin", "teacher"])
    if (isAuthError(ctx)) return ctx

    const { searchParams } = new URL(request.url)
    const classSectionId = searchParams.get("class_section_id")
    const month = searchParams.get("month") // YYYY-MM format

    if (!classSectionId || !month) {
      return NextResponse.json(
        { error: "class_section_id and month (YYYY-MM) are required" },
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

    const startDate = `${month}-01`
    // Get last day of month
    const [year, mon] = month.split("-").map(Number)
    const lastDay = new Date(year, mon, 0).getDate()
    const endDate = `${month}-${String(lastDay).padStart(2, "0")}`

    // Get all enrolled students
    const students = await executeQuery(
      `SELECT se.id as enrollment_id, se.student_id, se.roll_number,
              s.first_name, s.last_name
       FROM erp_student_enrollments se
       JOIN students s ON s.id = se.student_id
       WHERE se.class_section_id = ? AND se.status = 'active' AND s.deleted_at IS NULL
       ORDER BY se.roll_number, s.first_name`,
      [classSectionId]
    )

    // Get all attendance records for the month
    const records = await executeQuery(
      `SELECT ar.student_enrollment_id, ar.date, ar.status
       FROM erp_attendance_records ar
       JOIN erp_student_enrollments se ON se.id = ar.student_enrollment_id
       WHERE se.class_section_id = ? AND ar.date BETWEEN ? AND ?
       ORDER BY ar.date`,
      [classSectionId, startDate, endDate]
    )

    // Get holidays for the month (calendar is session-level)
    const holidays = await executeQuery(
      `SELECT cd.date, cd.holiday_reason FROM erp_calendar_days cd
       JOIN erp_class_sections ecs ON ecs.session_id = cd.session_id
       WHERE ecs.id = ? AND cd.date BETWEEN ? AND ? AND cd.is_holiday = 1
       ORDER BY cd.date`,
      [classSectionId, startDate, endDate]
    )

    return NextResponse.json({
      data: {
        students,
        records,
        holidays,
        month,
        total_days: lastDay,
      },
    })
  } catch (error) {
    console.error("Attendance monthly GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
