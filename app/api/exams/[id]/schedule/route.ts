import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params
    const ctx = await getAuthContext(["school_admin", "teacher"])
    if (isAuthError(ctx)) return ctx

    // Verify exam belongs to partner
    const examCheck = await executeQuery<{ id: number }[]>(
      `SELECT e.id FROM erp_exams e
       JOIN erp_class_sections ecs ON ecs.id = e.class_section_id
       JOIN erp_sessions es ON es.id = ecs.session_id
       WHERE e.id = ? AND es.partner_id = ?`,
      [examId, ctx.partnerUserId]
    )
    if (examCheck.length === 0) return NextResponse.json({ error: "Exam not found" }, { status: 404 })

    const schedules = await executeQuery(
      `SELECT es.*, sub.name as subject_name, sub.code as subject_code
       FROM erp_exam_schedules es
       JOIN erp_subjects sub ON sub.id = es.subject_id
       WHERE es.exam_id = ?
       ORDER BY es.exam_date, es.exam_time`,
      [examId]
    )

    return NextResponse.json({ data: schedules })
  } catch (error) {
    console.error("Exam schedule GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    // Verify exam and get class_section_id + date range
    const examRows = await executeQuery<{ id: number; class_section_id: number; start_date: string | null; end_date: string | null }[]>(
      `SELECT e.id, e.class_section_id, e.start_date, e.end_date FROM erp_exams e
       JOIN erp_class_sections ecs ON ecs.id = e.class_section_id
       JOIN erp_sessions es ON es.id = ecs.session_id
       WHERE e.id = ? AND es.partner_id = ?`,
      [examId, ctx.partnerUserId]
    )
    if (examRows.length === 0) return NextResponse.json({ error: "Exam not found" }, { status: 404 })

    const body = await request.json()
    const { subject_id, exam_date, exam_time, duration_minutes, maximum_marks, room_number } = body

    if (!subject_id || !maximum_marks) {
      return NextResponse.json({ error: "subject_id and maximum_marks are required" }, { status: 400 })
    }

    // Validate exam_date falls within exam date range
    if (exam_date) {
      const examStart = examRows[0].start_date
      const examEnd = examRows[0].end_date
      if (examStart && new Date(exam_date) < new Date(examStart)) {
        return NextResponse.json(
          { error: `Subject exam date cannot be before exam start date (${new Date(examStart).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })})` },
          { status: 400 }
        )
      }
      if (examEnd && new Date(exam_date) > new Date(examEnd)) {
        return NextResponse.json(
          { error: `Subject exam date cannot be after exam end date (${new Date(examEnd).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })})` },
          { status: 400 }
        )
      }
    }

    // Verify subject belongs to the same class-section
    const subCheck = await executeQuery<{ id: number }[]>(
      "SELECT id FROM erp_subjects WHERE id = ? AND class_section_id = ?",
      [subject_id, examRows[0].class_section_id]
    )
    if (subCheck.length === 0) return NextResponse.json({ error: "Subject not found in this class" }, { status: 404 })

    const result = await executeQuery<{ insertId: number }>(
      `INSERT INTO erp_exam_schedules (exam_id, subject_id, exam_date, exam_time, duration_minutes, maximum_marks, room_number, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [examId, subject_id, exam_date || null, exam_time || null, duration_minutes || null, maximum_marks, room_number || null]
    )

    return NextResponse.json(
      { data: { id: (result as any).insertId }, message: "Schedule added" },
      { status: 201 }
    )
  } catch (error) {
    console.error("Exam schedule POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const { searchParams } = new URL(request.url)
    const scheduleId = searchParams.get("schedule_id")
    if (!scheduleId) return NextResponse.json({ error: "schedule_id is required" }, { status: 400 })

    // Verify ownership
    const check = await executeQuery<{ id: number }[]>(
      `SELECT es.id FROM erp_exam_schedules es
       JOIN erp_exams e ON e.id = es.exam_id
       JOIN erp_class_sections ecs ON ecs.id = e.class_section_id
       JOIN erp_sessions sess ON sess.id = ecs.session_id
       WHERE es.id = ? AND es.exam_id = ? AND sess.partner_id = ?`,
      [scheduleId, examId, ctx.partnerUserId]
    )
    if (check.length === 0) return NextResponse.json({ error: "Schedule not found" }, { status: 404 })

    await executeQuery("DELETE FROM erp_exam_schedules WHERE id = ?", [scheduleId])
    return NextResponse.json({ message: "Schedule deleted" })
  } catch (error) {
    console.error("Exam schedule DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
