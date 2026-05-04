import { NextResponse } from "next/server"
import { getAuthContext, isAuthError, resolveSessionId, isSessionError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["teacher"])
    if (isAuthError(ctx)) return ctx

    const { searchParams } = new URL(request.url)
    const classSectionId = searchParams.get("class_section_id")
    const month = searchParams.get("month") // YYYY-MM

    if (!classSectionId || !month) {
      return NextResponse.json({ error: "class_section_id and month are required" }, { status: 400 })
    }

    // Verify teacher assignment
    const sess = await resolveSessionId(request, ctx.partnerUserId)
    if (isSessionError(sess)) return sess

    const csCheck = await executeQuery<{ id: number }[]>(
      `SELECT ecs.id FROM erp_class_sections ecs
       WHERE ecs.id = ? AND ecs.session_id = ?
         AND (ecs.class_teacher_id = ? OR ecs.second_incharge_id = ?
              OR ecs.id IN (SELECT DISTINCT class_section_id FROM erp_subjects WHERE teacher_id = ?))`,
      [classSectionId, sess.sessionId, ctx.userId, ctx.userId, ctx.userId]
    )
    if (csCheck.length === 0) {
      return NextResponse.json({ error: "Not authorized for this class" }, { status: 403 })
    }

    const [yr, mon] = month.split("-").map(Number)
    const lastDay = new Date(yr, mon, 0).getDate()
    const startDate = `${month}-01`
    const endDate = `${month}-${String(lastDay).padStart(2, "0")}`

    const students = await executeQuery(
      `SELECT se.id as enrollment_id, se.roll_number, s.first_name, s.last_name
       FROM erp_student_enrollments se
       JOIN students s ON s.id = se.student_id
       WHERE se.class_section_id = ? AND se.status IN ('active', 'completed')
       ORDER BY se.roll_number, s.first_name`,
      [classSectionId]
    )

    const records = await executeQuery(
      `SELECT ar.student_enrollment_id, ar.date, ar.status
       FROM erp_attendance_records ar
       JOIN erp_student_enrollments se ON se.id = ar.student_enrollment_id
       WHERE se.class_section_id = ? AND ar.date BETWEEN ? AND ?
       ORDER BY ar.date`,
      [classSectionId, startDate, endDate]
    )

    const holidays = await executeQuery(
      `SELECT cd.date FROM erp_calendar_days cd
       WHERE cd.session_id = ? AND cd.date BETWEEN ? AND ? AND cd.is_holiday = TRUE
       ORDER BY cd.date`,
      [sess.sessionId, startDate, endDate]
    )

    return NextResponse.json({
      data: { students, records, holidays, total_days: lastDay },
    })
  } catch (error) {
    console.error("Teacher attendance GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
