import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin", "teacher"])
    if (isAuthError(ctx)) return ctx

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("student_id") // enrollment_id
    const month = searchParams.get("month") // YYYY-MM

    if (!studentId || !month) {
      return NextResponse.json(
        { error: "student_id and month (YYYY-MM) are required" },
        { status: 400 }
      )
    }

    // Verify enrollment belongs to partner
    const enrollRows = await executeQuery<{
      id: number
      class_section_id: number
      roll_number: number | null
      first_name: string
      last_name: string
      class_name: string
      section_name: string
      session_id: number
    }[]>(
      `SELECT se.id, se.class_section_id, se.roll_number,
              s.first_name, s.last_name,
              c.name as class_name, sec.name as section_name,
              ecs.session_id
       FROM erp_student_enrollments se
       JOIN students s ON s.id = se.student_id
       JOIN erp_class_sections ecs ON ecs.id = se.class_section_id
       JOIN erp_sessions es ON es.id = ecs.session_id
       JOIN classes c ON c.id = ecs.class_id
       JOIN sections sec ON sec.id = ecs.section_id
       WHERE se.id = ? AND es.partner_id = ? AND s.deleted_at IS NULL AND se.status = 'active'`,
      [studentId, ctx.partnerUserId]
    )

    if (enrollRows.length === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const student = enrollRows[0]
    const startDate = `${month}-01`
    const [year, mon] = month.split("-").map(Number)
    const lastDay = new Date(year, mon, 0).getDate()
    const endDate = `${month}-${String(lastDay).padStart(2, "0")}`

    // Attendance for this student this month
    const attendanceRows = await executeQuery<{ status: string }[]>(
      `SELECT status FROM erp_attendance_records
       WHERE student_enrollment_id = ? AND date BETWEEN ? AND ?`,
      [studentId, startDate, endDate]
    )

    // Holidays count
    const holidayRows = await executeQuery<{ cnt: number }[]>(
      `SELECT COUNT(*) as cnt FROM erp_calendar_days
       WHERE session_id = ? AND date BETWEEN ? AND ? AND is_holiday = 1`,
      [student.session_id, startDate, endDate]
    )
    const holidayCount = holidayRows[0]?.cnt || 0

    // Sundays count (non-working)
    let sundayCount = 0
    for (let d = 1; d <= lastDay; d++) {
      if (new Date(year, mon - 1, d).getDay() === 0) sundayCount++
    }

    const totalWorkingDays = lastDay - sundayCount - holidayCount
    let present = 0, absent = 0, late = 0, halfDay = 0
    for (const r of attendanceRows) {
      if (r.status === "present") present++
      else if (r.status === "absent") absent++
      else if (r.status === "late") late++
      else if (r.status === "half_day") halfDay++
    }
    const attendancePercentage = totalWorkingDays > 0
      ? ((present + late + halfDay * 0.5) / totalWorkingDays) * 100
      : 0

    // Holistic ratings for this student this month
    const holisticRows = await executeQuery<{
      parameter_name: string
      sub_parameter_name: string
      rating_value: number | null
      rating_grade: string | null
    }[]>(
      `SELECT hp.name as parameter_name, hsp.name as sub_parameter_name,
              hr.rating_value, hr.rating_grade
       FROM erp_holistic_ratings hr
       JOIN erp_holistic_sub_parameters hsp ON hsp.id = hr.sub_parameter_id
       JOIN erp_holistic_parameters hp ON hp.id = hsp.parameter_id
       WHERE hr.student_enrollment_id = ? AND hr.month = ?
         AND hp.partner_id = ?
       ORDER BY hp.sort_order, hp.name, hsp.sort_order, hsp.name`,
      [studentId, startDate, ctx.partnerUserId]
    )

    // Group holistic by parameter
    const holisticMap = new Map<string, {
      parameter_name: string
      sub_parameters: { name: string; rating_value: number | null; rating_grade: string | null }[]
    }>()

    for (const row of holisticRows) {
      if (!holisticMap.has(row.parameter_name)) {
        holisticMap.set(row.parameter_name, {
          parameter_name: row.parameter_name,
          sub_parameters: [],
        })
      }
      holisticMap.get(row.parameter_name)!.sub_parameters.push({
        name: row.sub_parameter_name,
        rating_value: row.rating_value != null ? Number(row.rating_value) : null,
        rating_grade: row.rating_grade,
      })
    }

    const holistic = Array.from(holisticMap.values()).map((p) => {
      const rated = p.sub_parameters.filter((sp) => sp.rating_value != null)
      const average = rated.length > 0
        ? rated.reduce((sum, sp) => sum + sp.rating_value!, 0) / rated.length
        : null
      return { ...p, average }
    })

    return NextResponse.json({
      data: {
        student: {
          name: `${student.first_name} ${student.last_name}`,
          roll_number: student.roll_number,
          class_name: student.class_name,
          section_name: student.section_name,
        },
        month,
        attendance: {
          total_days: totalWorkingDays,
          present,
          absent,
          late,
          half_day: halfDay,
          percentage: Math.round(attendancePercentage * 100) / 100,
        },
        holistic,
      },
    })
  } catch (error) {
    console.error("Monthly report GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
