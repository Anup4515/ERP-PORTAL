import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { executeQuery, executeTransaction } from "@/app/lib/db"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const school_id = session.user.school_id
    if (!school_id) return NextResponse.json({ error: "No partner profile" }, { status: 400 })

    const partnerRows = await executeQuery<{ user_id: number }[]>(
      "SELECT user_id FROM partners WHERE id = ?", [school_id]
    )
    if (partnerRows.length === 0) return NextResponse.json({ error: "Partner not found" }, { status: 404 })
    const partnerUserId = partnerRows[0].user_id

    const body = await request.json()
    const { exam_id, subject_id, marks } = body
    // marks: Array of { enrollment_id, obtained_marks, is_absent }

    if (!exam_id || !subject_id || !Array.isArray(marks)) {
      return NextResponse.json({ error: "exam_id, subject_id, and marks array are required" }, { status: 400 })
    }

    // Verify exam
    const examRows = await executeQuery<{ class_section_id: number }[]>(
      `SELECT e.class_section_id FROM erp_exams e
       JOIN erp_class_sections ecs ON ecs.id = e.class_section_id
       JOIN erp_sessions es ON es.id = ecs.session_id
       WHERE e.id = ? AND es.partner_id = ?`,
      [exam_id, partnerUserId]
    )
    if (examRows.length === 0) return NextResponse.json({ error: "Exam not found" }, { status: 404 })

    // Get max marks from schedule
    const schedRows = await executeQuery<{ maximum_marks: number }[]>(
      "SELECT maximum_marks FROM erp_exam_schedules WHERE exam_id = ? AND subject_id = ?",
      [exam_id, subject_id]
    )
    const maxMarks = schedRows.length > 0 ? Number(schedRows[0].maximum_marks) : 100

    // Get grading ranges for auto-grading
    const gradingRanges = await executeQuery<{
      grade_label: string
      min_percentage: number
      max_percentage: number
    }[]>(
      `SELECT gr.grade_label, gr.min_percentage, gr.max_percentage
       FROM erp_grading_ranges gr
       JOIN erp_grading_schemes gs ON gs.id = gr.grading_scheme_id
       WHERE gs.partner_id = ? AND gs.is_default = 1
       ORDER BY gr.min_percentage DESC`,
      [partnerUserId]
    )

    function computeGrade(percentage: number): string | null {
      for (const range of gradingRanges) {
        if (percentage >= Number(range.min_percentage) && percentage <= Number(range.max_percentage)) {
          return range.grade_label
        }
      }
      return null
    }

    const enteredBy = session.user.user_id

    await executeTransaction(async (connection) => {
      for (const m of marks) {
        const { enrollment_id, obtained_marks, is_absent } = m
        if (!enrollment_id) continue

        const absent = is_absent ? 1 : 0
        const obtained = absent ? null : Number(obtained_marks)
        const pct = (obtained !== null && maxMarks > 0) ? Math.round((obtained / maxMarks) * 100 * 100) / 100 : null
        const grade = pct !== null ? computeGrade(pct) : null

        // Upsert
        const [existing] = await connection.execute(
          "SELECT id FROM erp_marks WHERE exam_id = ? AND subject_id = ? AND student_enrollment_id = ?",
          [exam_id, subject_id, enrollment_id]
        )

        if ((existing as any[]).length > 0) {
          await connection.execute(
            `UPDATE erp_marks SET obtained_marks = ?, is_absent = ?, maximum_marks = ?,
             percentage = ?, grade = ?, entered_by = ?, updated_at = NOW()
             WHERE exam_id = ? AND subject_id = ? AND student_enrollment_id = ?`,
            [obtained, absent, maxMarks, pct, grade, enteredBy, exam_id, subject_id, enrollment_id]
          )
        } else {
          await connection.execute(
            `INSERT INTO erp_marks (exam_id, subject_id, student_enrollment_id, maximum_marks,
             obtained_marks, is_absent, percentage, grade, entered_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [exam_id, subject_id, enrollment_id, maxMarks, obtained, absent, pct, grade, enteredBy]
          )
        }
      }
    })

    return NextResponse.json({ message: "Marks saved successfully" })
  } catch (error) {
    console.error("Marks bulk POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
