import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin", "teacher"])
    if (isAuthError(ctx)) return ctx

    const { searchParams } = new URL(request.url)
    const examId = searchParams.get("exam_id")
    const subjectId = searchParams.get("subject_id")

    if (!examId || !subjectId) {
      return NextResponse.json({ error: "exam_id and subject_id are required" }, { status: 400 })
    }

    // Verify exam belongs to partner and get class_section_id + max marks
    const examRows = await executeQuery<{ class_section_id: number }[]>(
      `SELECT e.class_section_id FROM erp_exams e
       WHERE e.id = ? AND e.partner_id = ?`,
      [examId, ctx.partnerUserId]
    )
    if (examRows.length === 0) return NextResponse.json({ error: "Exam not found" }, { status: 404 })
    const classSectionId = examRows[0].class_section_id

    // Get max marks from schedule
    const schedRows = await executeQuery<{ maximum_marks: number }[]>(
      "SELECT maximum_marks FROM erp_exam_schedules WHERE exam_id = ? AND subject_id = ?",
      [examId, subjectId]
    )
    const maxMarks = schedRows.length > 0 ? schedRows[0].maximum_marks : 100

    // Get all enrolled students with their marks
    const students = await executeQuery(
      `SELECT se.id as enrollment_id, se.roll_number, s.first_name, s.last_name,
              m.id as mark_id, m.obtained_marks, m.is_absent, m.percentage, m.grade
       FROM erp_student_enrollments se
       JOIN students s ON s.id = se.student_id
       LEFT JOIN erp_marks m ON m.student_enrollment_id = se.id AND m.exam_id = ? AND m.subject_id = ?
       WHERE se.class_section_id = ? AND se.status IN ('active', 'completed') AND s.deleted_at IS NULL
       ORDER BY se.roll_number, s.first_name`,
      [examId, subjectId, classSectionId]
    )

    return NextResponse.json({ data: { students, maximum_marks: maxMarks } })
  } catch (error) {
    console.error("Marks GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
