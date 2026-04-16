import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin", "teacher"])
    if (isAuthError(ctx)) return ctx

    const { searchParams } = new URL(request.url)
    const examId = searchParams.get("exam_id")

    if (!examId) return NextResponse.json({ error: "exam_id is required" }, { status: 400 })

    // Verify exam
    const examRows = await executeQuery<{ class_section_id: number }[]>(
      `SELECT e.class_section_id FROM erp_exams e
       WHERE e.id = ? AND e.partner_id = ?`,
      [examId, ctx.partnerUserId]
    )
    if (examRows.length === 0) return NextResponse.json({ error: "Exam not found" }, { status: 404 })
    const classSectionId = examRows[0].class_section_id

    // Get subjects for this exam (from schedule)
    const subjects = await executeQuery(
      `SELECT es.subject_id, sub.name as subject_name, es.maximum_marks
       FROM erp_exam_schedules es
       JOIN erp_subjects sub ON sub.id = es.subject_id
       WHERE es.exam_id = ?
       ORDER BY sub.sort_order, sub.name`,
      [examId]
    )

    // Get all enrolled students
    const students = await executeQuery(
      `SELECT se.id as enrollment_id, se.roll_number, s.first_name, s.last_name
       FROM erp_student_enrollments se
       JOIN students s ON s.id = se.student_id
       WHERE se.class_section_id = ? AND se.status IN ('active', 'completed') AND s.deleted_at IS NULL
       ORDER BY se.roll_number, s.first_name`,
      [classSectionId]
    )

    // Get all marks for this exam
    const marks = await executeQuery(
      `SELECT student_enrollment_id, subject_id, obtained_marks, is_absent, percentage, grade
       FROM erp_marks WHERE exam_id = ?`,
      [examId]
    )

    return NextResponse.json({ data: { subjects, students, marks } })
  } catch (error) {
    console.error("Marks overview GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
