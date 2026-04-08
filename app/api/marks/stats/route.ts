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

    // Verify
    const examCheck = await executeQuery<{ id: number }[]>(
      `SELECT e.id FROM erp_exams e
       JOIN erp_class_sections ecs ON ecs.id = e.class_section_id
       JOIN erp_sessions es ON es.id = ecs.session_id
       WHERE e.id = ? AND es.partner_id = ?`,
      [examId, ctx.partnerUserId]
    )
    if (examCheck.length === 0) return NextResponse.json({ error: "Exam not found" }, { status: 404 })

    // Per-subject stats
    const subjectStats = await executeQuery(
      `SELECT m.subject_id, sub.name as subject_name,
              COUNT(*) as total_students,
              SUM(CASE WHEN m.is_absent = 0 THEN 1 ELSE 0 END) as appeared,
              ROUND(AVG(CASE WHEN m.is_absent = 0 THEN m.percentage END), 2) as avg_percentage,
              MAX(CASE WHEN m.is_absent = 0 THEN m.obtained_marks END) as highest,
              MIN(CASE WHEN m.is_absent = 0 THEN m.obtained_marks END) as lowest
       FROM erp_marks m
       JOIN erp_subjects sub ON sub.id = m.subject_id
       WHERE m.exam_id = ?
       GROUP BY m.subject_id, sub.name
       ORDER BY sub.sort_order, sub.name`,
      [examId]
    )

    // Overall student-wise total (sum of all subjects)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)))
    const offset = (page - 1) * limit

    const rankingCount = await executeQuery<{ total: number }[]>(
      `SELECT COUNT(DISTINCT m.student_enrollment_id) as total
       FROM erp_marks m WHERE m.exam_id = ?`,
      [examId]
    )
    const total = rankingCount[0].total

    const studentTotals = await executeQuery(
      `SELECT m.student_enrollment_id, se.roll_number, s.first_name, s.last_name,
              SUM(CASE WHEN m.is_absent = 0 THEN m.obtained_marks ELSE 0 END) as total_obtained,
              SUM(m.maximum_marks) as total_maximum,
              ROUND(SUM(CASE WHEN m.is_absent = 0 THEN m.obtained_marks ELSE 0 END) / SUM(m.maximum_marks) * 100, 2) as overall_percentage
       FROM erp_marks m
       JOIN erp_student_enrollments se ON se.id = m.student_enrollment_id
       JOIN students s ON s.id = se.student_id
       WHERE m.exam_id = ?
       GROUP BY m.student_enrollment_id, se.roll_number, s.first_name, s.last_name
       ORDER BY overall_percentage DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [examId]
    )

    return NextResponse.json({
      data: {
        subject_stats: subjectStats,
        student_rankings: { rankings: studentTotals, total, page, limit },
      },
    })
  } catch (error) {
    console.error("Marks stats GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
