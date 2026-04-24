import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin", "teacher"])
    if (isAuthError(ctx)) return ctx

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("student_id") // enrollment_id
    const sessionId = searchParams.get("session_id")

    if (!studentId || !sessionId) {
      return NextResponse.json(
        { error: "student_id and session_id are required" },
        { status: 400 }
      )
    }

    // Verify enrollment & session belong to partner
    const enrollRows = await executeQuery<{
      id: number
      class_section_id: number
      roll_number: number | null
      first_name: string
      last_name: string
      class_name: string
      section_name: string
      grade_level: number | null
      session_name: string
      session_start: string
      session_end: string
      session_id: number
    }[]>(
      `SELECT se.id, se.class_section_id, se.roll_number,
              s.first_name, s.last_name,
              c.name as class_name, sec.name as section_name, c.grade_level,
              es.name as session_name, es.start_date as session_start,
              es.end_date as session_end, es.id as session_id
       FROM erp_student_enrollments se
       JOIN students s ON s.id = se.student_id
       JOIN erp_class_sections ecs ON ecs.id = se.class_section_id
       JOIN erp_sessions es ON es.id = ecs.session_id
       JOIN classes c ON c.id = ecs.class_id
       JOIN sections sec ON sec.id = ecs.section_id
       WHERE se.id = ? AND es.id = ? AND se.partner_id = ? AND s.deleted_at IS NULL AND se.status IN ('active', 'completed')`,
      [studentId, sessionId, ctx.partnerUserId]
    )

    if (enrollRows.length === 0) {
      return NextResponse.json({ error: "Student not found in this session" }, { status: 404 })
    }

    const student = enrollRows[0]

    // Senior = grade 9+ (final/annual only); Junior = grade 1-8 (mid-term + final/annual, averaged).
    const gradeLevel = Number(student.grade_level) || 0
    const templateType: "senior" | "junior" = gradeLevel >= 9 ? "senior" : "junior"
    const requiredTypes =
      templateType === "senior" ? ["final_annual"] : ["mid_term", "final_annual"]

    // ── Pull exams needed by this template (must exist AND be completed) ──
    const typePlaceholders = requiredTypes.map(() => "?").join(",")
    const exams = await executeQuery<{
      id: number
      name: string
      exam_type: string
      status: string
      start_date: string
      end_date: string
    }[]>(
      `SELECT id, name, exam_type, status, start_date, end_date FROM erp_exams
       WHERE class_section_id = ? AND exam_type IN (${typePlaceholders})
       ORDER BY FIELD(exam_type, ${typePlaceholders}), start_date, id`,
      [student.class_section_id, ...requiredTypes, ...requiredTypes]
    )

    // Gate: every required type must be present AND status='completed'.
    const presentTypes = new Set(exams.map((e) => e.exam_type))
    const missingTypes = requiredTypes.filter((t) => !presentTypes.has(t))
    const incompleteTypes = exams
      .filter((e) => e.status !== "completed")
      .map((e) => e.exam_type)

    if (missingTypes.length > 0 || incompleteTypes.length > 0) {
      const readableType = (t: string) =>
        t === "final_annual" ? "Final/Annual" : t === "mid_term" ? "Mid-Term" : t === "unit_test" ? "Unit Test" : t
      const missingLabels = missingTypes.map(readableType)
      const incompleteLabels = incompleteTypes.map(readableType)
      const parts: string[] = []
      if (missingLabels.length) {
        parts.push(
          `${missingLabels.join(" and ")} exam${missingLabels.length > 1 ? "s have" : " has"} not been created yet`
        )
      }
      if (incompleteLabels.length) {
        parts.push(
          `${incompleteLabels.join(" and ")} exam${incompleteLabels.length > 1 ? "s are" : " is"} not completed yet`
        )
      }
      return NextResponse.json({
        data: {
          template_type: templateType,
          ready: false,
          not_ready_reason:
            parts.join(" · ").charAt(0).toUpperCase() + parts.join(" · ").slice(1) + ".",
          student: {
            name: `${student.first_name} ${student.last_name}`,
            roll_number: student.roll_number,
            class_name: student.class_name,
            section_name: student.section_name,
            grade_level: gradeLevel,
          },
          session: {
            name: student.session_name,
            start_date: student.session_start,
            end_date: student.session_end,
          },
        },
      })
    }

    // Get grading ranges for grade computation
    const gradingRanges = await executeQuery<{
      grade_label: string
      min_percentage: number
      max_percentage: number
    }[]>(
      `SELECT gr.grade_label, gr.min_percentage, gr.max_percentage
       FROM erp_grading_ranges gr
       JOIN erp_grading_schemes gs ON gs.id = gr.grading_scheme_id
       WHERE gs.partner_id = ? AND gs.is_default = 1
       ORDER BY gr.sort_order`,
      [ctx.partnerUserId]
    )

    function getGrade(pct: number): string {
      for (const r of gradingRanges) {
        if (pct >= Number(r.min_percentage) && pct <= Number(r.max_percentage)) {
          return r.grade_label
        }
      }
      return "-"
    }

    // Build exam results
    const examResults = []
    for (const exam of exams) {
      // Marks for this student in this exam
      const marks = await executeQuery<{
        subject_name: string
        max_marks: number
        obtained_marks: number | null
        is_absent: number
        percentage: number | null
        grade: string | null
      }[]>(
        `SELECT sub.name as subject_name,
                m.maximum_marks as max_marks,
                m.obtained_marks, m.is_absent, m.percentage, m.grade
         FROM erp_marks m
         JOIN erp_subjects sub ON sub.id = m.subject_id
         WHERE m.exam_id = ? AND m.student_enrollment_id = ?
         ORDER BY sub.sort_order, sub.name`,
        [exam.id, studentId]
      )

      let totalObtained = 0
      let totalMax = 0
      const subjects = marks.map((m) => {
        const maxM = Number(m.max_marks)
        const obtM = m.obtained_marks != null ? Number(m.obtained_marks) : null
        totalMax += maxM
        if (!m.is_absent && obtM != null) totalObtained += obtM
        return {
          subject_name: m.subject_name,
          max_marks: maxM,
          obtained_marks: obtM,
          is_absent: !!m.is_absent,
          percentage: m.percentage != null ? Number(m.percentage) : null,
          grade: m.grade,
        }
      })

      const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0
      const grade = getGrade(percentage)

      // Rank
      const rankRows = await executeQuery<{ enrollment_id: number; total: number }[]>(
        `SELECT m.student_enrollment_id as enrollment_id,
                SUM(CASE WHEN m.is_absent = 0 AND m.obtained_marks IS NOT NULL THEN m.obtained_marks ELSE 0 END) as total
         FROM erp_marks m
         JOIN erp_student_enrollments se ON se.id = m.student_enrollment_id
         JOIN students s2 ON s2.id = se.student_id
         WHERE m.exam_id = ? AND se.class_section_id = ? AND se.status IN ('active', 'completed') AND s2.deleted_at IS NULL
         GROUP BY m.student_enrollment_id
         ORDER BY total DESC`,
        [exam.id, student.class_section_id]
      )

      let rank: number | null = null
      for (let i = 0; i < rankRows.length; i++) {
        if (String(rankRows[i].enrollment_id) === String(studentId)) {
          rank = i + 1
          break
        }
      }

      examResults.push({
        exam_id: exam.id,
        exam_name: exam.name,
        subjects,
        total_obtained: totalObtained,
        total_max: totalMax,
        percentage: Math.round(percentage * 100) / 100,
        grade,
        rank,
      })
    }

    // ── Yearly Attendance ──
    const attendanceRows = await executeQuery<{ status: string }[]>(
      `SELECT ar.status FROM erp_attendance_records ar
       WHERE ar.student_enrollment_id = ?
         AND ar.date BETWEEN ? AND ?`,
      [studentId, student.session_start, student.session_end]
    )

    const holidayRows = await executeQuery<{ cnt: number }[]>(
      `SELECT COUNT(*) as cnt FROM erp_calendar_days
       WHERE session_id = ? AND is_holiday = 1`,
      [student.session_id]
    )
    const holidayCount = holidayRows[0]?.cnt || 0

    // Count Sundays in session range
    const sStart = new Date(student.session_start)
    const sEnd = new Date(student.session_end)
    let sundayCount = 0
    const cursor = new Date(sStart)
    while (cursor <= sEnd) {
      if (cursor.getDay() === 0) sundayCount++
      cursor.setDate(cursor.getDate() + 1)
    }

    // Total days in session minus Sundays & holidays
    const totalSessionDays = Math.floor((sEnd.getTime() - sStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const totalWorkingDays = totalSessionDays - sundayCount - holidayCount

    let present = 0, absent = 0
    for (const r of attendanceRows) {
      if (r.status === "present" || r.status === "late") present++
      else if (r.status === "absent") absent++
    }
    const attPercentage = totalWorkingDays > 0 ? (present / totalWorkingDays) * 100 : 0

    // ── Holistic Trends (monthly averages per parameter) ──
    const holisticRows = await executeQuery<{
      parameter_name: string
      month: string
      avg_rating: number | null
    }[]>(
      `SELECT hp.name as parameter_name,
              hr.month,
              AVG(hr.rating_value) as avg_rating
       FROM erp_holistic_ratings hr
       JOIN erp_holistic_sub_parameters hsp ON hsp.id = hr.sub_parameter_id
       JOIN erp_holistic_parameters hp ON hp.id = hsp.parameter_id
       WHERE hr.student_enrollment_id = ?
         AND hp.partner_id = ?
         AND hr.month BETWEEN DATE_FORMAT(?, '%Y-%m-01') AND DATE_FORMAT(?, '%Y-%m-01')
       GROUP BY hp.name, hp.sort_order, hr.month
       ORDER BY hp.sort_order, hp.name, hr.month`,
      [studentId, ctx.partnerUserId, student.session_start, student.session_end]
    )

    const trendMap = new Map<string, { parameter_name: string; months: { month: string; average: number | null }[] }>()
    for (const row of holisticRows) {
      if (!trendMap.has(row.parameter_name)) {
        trendMap.set(row.parameter_name, { parameter_name: row.parameter_name, months: [] })
      }
      const monthStr = typeof row.month === "string"
        ? row.month.substring(0, 7)
        : new Date(row.month).toISOString().substring(0, 7)
      trendMap.get(row.parameter_name)!.months.push({
        month: monthStr,
        average: row.avg_rating != null ? Math.round(Number(row.avg_rating) * 10) / 10 : null,
      })
    }

    // ── Teacher Remarks (from existing report card if any) ──
    const remarkRows = await executeQuery<{ teacher_remarks: string | null }[]>(
      `SELECT teacher_remarks FROM erp_report_cards
       WHERE student_enrollment_id = ? AND type = 'annual'
       ORDER BY created_at DESC LIMIT 1`,
      [studentId]
    )

    // Overall aggregate: plain average of term percentages for juniors, single
    // exam for seniors.
    const overall =
      examResults.length > 0
        ? {
            percentage:
              Math.round(
                (examResults.reduce((a, e) => a + e.percentage, 0) / examResults.length) * 100
              ) / 100,
            grade: getGrade(
              examResults.reduce((a, e) => a + e.percentage, 0) / examResults.length
            ),
          }
        : null

    return NextResponse.json({
      data: {
        template_type: templateType,
        ready: true,
        student: {
          name: `${student.first_name} ${student.last_name}`,
          roll_number: student.roll_number,
          class_name: student.class_name,
          section_name: student.section_name,
          grade_level: gradeLevel,
        },
        session: {
          name: student.session_name,
          start_date: student.session_start,
          end_date: student.session_end,
        },
        exams: examResults,
        overall,
        attendance: {
          total_days: totalWorkingDays,
          present,
          absent,
          percentage: Math.round(attPercentage * 100) / 100,
        },
        holistic_trends: Array.from(trendMap.values()),
        teacher_remarks: remarkRows.length > 0 ? remarkRows[0].teacher_remarks : null,
      },
    })
  } catch (error) {
    console.error("Annual report GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
