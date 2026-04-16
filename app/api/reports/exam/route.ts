import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin", "teacher"])
    if (isAuthError(ctx)) return ctx

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("student_id") // enrollment_id
    const examId = searchParams.get("exam_id")

    if (!studentId || !examId) {
      return NextResponse.json(
        { error: "student_id and exam_id are required" },
        { status: 400 }
      )
    }

    // Verify enrollment belongs to partner & get student info
    const enrollRows = await executeQuery<{
      id: number
      class_section_id: number
      roll_number: number | null
      first_name: string
      last_name: string
      class_name: string
      section_name: string
    }[]>(
      `SELECT se.id, se.class_section_id, se.roll_number,
              s.first_name, s.last_name,
              c.name as class_name, sec.name as section_name
       FROM erp_student_enrollments se
       JOIN students s ON s.id = se.student_id
       JOIN erp_class_sections ecs ON ecs.id = se.class_section_id
       JOIN erp_sessions es ON es.id = ecs.session_id
       JOIN classes c ON c.id = ecs.class_id
       JOIN sections sec ON sec.id = ecs.section_id
       WHERE se.id = ? AND se.partner_id = ? AND s.deleted_at IS NULL AND se.status IN ('active', 'completed')`,
      [studentId, ctx.partnerUserId]
    )

    if (enrollRows.length === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const student = enrollRows[0]

    // Verify exam belongs to same class section
    const examRows = await executeQuery<{
      id: number
      name: string
      start_date: string
      end_date: string
    }[]>(
      `SELECT id, name, start_date, end_date FROM erp_exams
       WHERE id = ? AND class_section_id = ?`,
      [examId, student.class_section_id]
    )

    if (examRows.length === 0) {
      return NextResponse.json({ error: "Exam not found for this class" }, { status: 404 })
    }

    const exam = examRows[0]

    // Get subject-wise marks
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
              m.obtained_marks,
              m.is_absent,
              m.percentage,
              m.grade
       FROM erp_marks m
       JOIN erp_subjects sub ON sub.id = m.subject_id
       WHERE m.exam_id = ? AND m.student_enrollment_id = ?
       ORDER BY sub.sort_order, sub.name`,
      [examId, studentId]
    )

    // Compute totals
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

    const overallPercentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0

    // Get overall grade from grading scheme
    const gradeRows = await executeQuery<{ grade_label: string }[]>(
      `SELECT gr.grade_label
       FROM erp_grading_ranges gr
       JOIN erp_grading_schemes gs ON gs.id = gr.grading_scheme_id
       WHERE gs.partner_id = ? AND gs.is_default = 1
         AND ? BETWEEN gr.min_percentage AND gr.max_percentage
       ORDER BY gr.sort_order LIMIT 1`,
      [ctx.partnerUserId, overallPercentage]
    )
    const overallGrade = gradeRows.length > 0 ? gradeRows[0].grade_label : "-"

    // Compute rank — total marks of all students in this exam, rank by descending
    const rankRows = await executeQuery<{ enrollment_id: number; total: number }[]>(
      `SELECT m.student_enrollment_id as enrollment_id,
              SUM(CASE WHEN m.is_absent = 0 AND m.obtained_marks IS NOT NULL THEN m.obtained_marks ELSE 0 END) as total
       FROM erp_marks m
       JOIN erp_student_enrollments se ON se.id = m.student_enrollment_id
       JOIN students s2 ON s2.id = se.student_id
       WHERE m.exam_id = ? AND se.class_section_id = ? AND se.status IN ('active', 'completed') AND s2.deleted_at IS NULL
       GROUP BY m.student_enrollment_id
       ORDER BY total DESC`,
      [examId, student.class_section_id]
    )

    let rank: number | null = null
    for (let i = 0; i < rankRows.length; i++) {
      if (String(rankRows[i].enrollment_id) === String(studentId)) {
        rank = i + 1
        break
      }
    }

    return NextResponse.json({
      data: {
        student: {
          name: `${student.first_name} ${student.last_name}`,
          roll_number: student.roll_number,
          class_name: student.class_name,
          section_name: student.section_name,
        },
        exam: {
          name: exam.name,
          start_date: exam.start_date,
          end_date: exam.end_date,
        },
        subjects,
        total_obtained: totalObtained,
        total_max: totalMax,
        overall_percentage: Math.round(overallPercentage * 100) / 100,
        overall_grade: overallGrade,
        rank,
      },
    })
  } catch (error) {
    console.error("Exam report GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
