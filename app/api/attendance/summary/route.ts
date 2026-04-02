import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { executeQuery } from "@/app/lib/db"

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const classSectionId = searchParams.get("class_section_id")
    const type = searchParams.get("type") || "monthly" // monthly or yearly
    const month = searchParams.get("month") // YYYY-MM for monthly

    if (!classSectionId) {
      return NextResponse.json({ error: "class_section_id is required" }, { status: 400 })
    }

    // Verify ownership
    const csCheck = await executeQuery<{ id: number; session_id: number }[]>(
      `SELECT ecs.id, ecs.session_id FROM erp_class_sections ecs
       JOIN erp_sessions es ON es.id = ecs.session_id
       WHERE ecs.id = ? AND es.partner_id = ?`,
      [classSectionId, partnerUserId]
    )
    if (csCheck.length === 0) {
      return NextResponse.json({ error: "Class section not found" }, { status: 404 })
    }

    let startDate: string
    let endDate: string

    if (type === "monthly" && month) {
      startDate = `${month}-01`
      const [year, mon] = month.split("-").map(Number)
      const lastDay = new Date(year, mon, 0).getDate()
      endDate = `${month}-${String(lastDay).padStart(2, "0")}`
    } else {
      // Yearly: use session dates
      const sessionRows = await executeQuery<{ start_date: string; end_date: string }[]>(
        "SELECT start_date, end_date FROM erp_sessions WHERE id = ?",
        [csCheck[0].session_id]
      )
      startDate = sessionRows[0].start_date
      endDate = sessionRows[0].end_date
    }

    // Get working days count (calendar is session-level)
    const workingDaysRows = await executeQuery<{ count: number }[]>(
      `SELECT COUNT(*) as count FROM erp_calendar_days cd
       JOIN erp_class_sections ecs ON ecs.session_id = cd.session_id
       WHERE ecs.id = ? AND cd.date BETWEEN ? AND ? AND cd.is_holiday = 0`,
      [classSectionId, startDate, endDate]
    )
    const totalWorkingDays = workingDaysRows[0]?.count || 0

    // Get per-student summary
    const summary = await executeQuery(
      `SELECT se.id as enrollment_id, se.roll_number,
              s.first_name, s.last_name,
              COUNT(ar.id) as total_marked,
              SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present,
              SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) as absent,
              SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END) as late,
              SUM(CASE WHEN ar.status = 'half_day' THEN 1 ELSE 0 END) as half_day
       FROM erp_student_enrollments se
       JOIN students s ON s.id = se.student_id
       LEFT JOIN erp_attendance_records ar ON ar.student_enrollment_id = se.id
         AND ar.date BETWEEN ? AND ?
       WHERE se.class_section_id = ? AND se.status = 'active'
       GROUP BY se.id, se.roll_number, s.first_name, s.last_name
       ORDER BY se.roll_number, s.first_name`,
      [startDate, endDate, classSectionId]
    )

    return NextResponse.json({
      data: {
        summary,
        total_working_days: totalWorkingDays,
        date_range: { start_date: startDate, end_date: endDate },
        type,
      },
    })
  } catch (error) {
    console.error("Attendance summary GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
