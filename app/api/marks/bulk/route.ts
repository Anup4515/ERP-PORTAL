import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery, executeTransaction } from "@/app/lib/db"
import { bulkMarksSchema, parseOrError } from "@/app/lib/validations"

export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin", "teacher"])
    if (isAuthError(ctx)) return ctx

    const body = await request.json()
    const parsed = parseOrError(bulkMarksSchema, body)
    if (!parsed.success) return parsed.response

    const { exam_id, subject_id, marks } = parsed.data

    // Verify exam
    const examRows = await executeQuery<{ class_section_id: number }[]>(
      `SELECT e.class_section_id FROM erp_exams e
       WHERE e.id = ? AND e.partner_id = ?`,
      [exam_id, ctx.partnerUserId]
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
       WHERE gs.partner_id = ? AND gs.is_default = TRUE
       ORDER BY gr.min_percentage DESC`,
      [ctx.partnerUserId]
    )

    function computeGrade(percentage: number): string | null {
      for (const range of gradingRanges) {
        if (percentage >= Number(range.min_percentage) && percentage <= Number(range.max_percentage)) {
          return range.grade_label
        }
      }
      return null
    }

    const enteredBy = ctx.userId

    // Pre-compute all values
    const rows: (string | number | null)[][] = []
    for (const m of marks) {
      const { enrollment_id, obtained_marks, is_absent } = m
      if (!enrollment_id) continue

      const absent = is_absent ? 1 : 0
      const obtained = absent ? null : Number(obtained_marks)
      const pct = (obtained !== null && maxMarks > 0) ? Math.round((obtained / maxMarks) * 100 * 100) / 100 : null
      const grade = pct !== null ? computeGrade(pct) : null

      rows.push([exam_id, subject_id, enrollment_id, maxMarks, obtained, absent, pct, grade, enteredBy])
    }

    if (rows.length === 0) {
      return NextResponse.json({ message: "No marks to save" })
    }

    // Batch insert in chunks of 50
    const BATCH_SIZE = 50
    await executeTransaction(async (connection) => {
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE)
        const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())").join(", ")
        const flatParams = batch.flat()

        await connection.execute(
          `INSERT INTO erp_marks (exam_id, subject_id, student_enrollment_id, maximum_marks,
           obtained_marks, is_absent, percentage, grade, entered_by, created_at, updated_at)
           VALUES ${placeholders}
           ON CONFLICT (exam_id, subject_id, student_enrollment_id) DO UPDATE SET
             obtained_marks = EXCLUDED.obtained_marks,
             is_absent      = EXCLUDED.is_absent,
             maximum_marks  = EXCLUDED.maximum_marks,
             percentage     = EXCLUDED.percentage,
             grade          = EXCLUDED.grade,
             entered_by     = EXCLUDED.entered_by,
             updated_at     = NOW()`,
          flatParams
        )
      }
    })

    return NextResponse.json({ message: "Marks saved successfully" })
  } catch (error) {
    console.error("Marks bulk POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
