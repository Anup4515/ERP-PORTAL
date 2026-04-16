import { NextResponse } from "next/server"
import { getAuthContext, isAuthError, resolveSessionId, isSessionError, ensureCurrentSession } from "@/app/lib/auth-utils"
import { executeQuery, executeTransaction } from "@/app/lib/db"

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin", "teacher"])
    if (isAuthError(ctx)) return ctx

    const sess = await resolveSessionId(request, ctx.partnerUserId)
    if (isSessionError(sess)) return sess

    const { searchParams } = new URL(request.url)
    const classSectionId = searchParams.get("class_section_id")

    let whereExtra = ""
    const params: any[] = [ctx.partnerUserId, sess.sessionId]

    if (classSectionId) {
      whereExtra = " AND e.class_section_id = ?"
      params.push(classSectionId)
    }

    // Auto-update statuses based on today's date before fetching
    await executeQuery(
      `UPDATE erp_exams e
       SET e.status = CASE
         WHEN e.end_date IS NOT NULL AND CURDATE() > e.end_date THEN 'completed'
         WHEN e.start_date IS NOT NULL AND CURDATE() >= e.start_date THEN 'in_progress'
         ELSE 'upcoming'
       END,
       e.updated_at = NOW()
       WHERE e.partner_id = ?
         AND e.status != CASE
           WHEN e.end_date IS NOT NULL AND CURDATE() > e.end_date THEN 'completed'
           WHEN e.start_date IS NOT NULL AND CURDATE() >= e.start_date THEN 'in_progress'
           ELSE 'upcoming'
         END`,
      [ctx.partnerUserId]
    )

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)))
    const offset = (page - 1) * limit

    const countResult = await executeQuery<{ total: number }[]>(
      `SELECT COUNT(*) as total
       FROM erp_exams e
       JOIN erp_class_sections ecs ON ecs.id = e.class_section_id
       JOIN erp_sessions es ON es.id = ecs.session_id
       WHERE e.partner_id = ? AND es.id = ?${whereExtra}`,
      params
    )
    const total = countResult[0].total

    const exams = await executeQuery(
      `SELECT e.*, c.name as class_name, sec.name as section_name
       FROM erp_exams e
       JOIN erp_class_sections ecs ON ecs.id = e.class_section_id
       JOIN erp_sessions es ON es.id = ecs.session_id
       JOIN classes c ON c.id = ecs.class_id
       JOIN sections sec ON sec.id = ecs.section_id
       WHERE e.partner_id = ? AND es.id = ?${whereExtra}
       ORDER BY e.start_date DESC, e.name
       LIMIT ${limit} OFFSET ${offset}`,
      params
    )

    return NextResponse.json({ data: { exams, total, page, limit } })
  } catch (error) {
    console.error("Exams GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const { searchParams } = new URL(request.url)
    const sessionIdParam = searchParams.get("session_id")
    if (sessionIdParam) {
      const guard = await ensureCurrentSession(Number(sessionIdParam), ctx.partnerUserId)
      if (guard) return guard
    }

    const body = await request.json()
    const { class_section_ids, name, code, start_date, end_date } = body

    if (!Array.isArray(class_section_ids) || class_section_ids.length === 0 || !name) {
      return NextResponse.json({ error: "class_section_ids array and name are required" }, { status: 400 })
    }

    // Verify all class-sections belong to this partner
    const placeholders = class_section_ids.map(() => "?").join(", ")
    const csCheck = await executeQuery<{ id: number }[]>(
      `SELECT ecs.id FROM erp_class_sections ecs
       JOIN erp_sessions es ON es.id = ecs.session_id
       WHERE ecs.id IN (${placeholders}) AND es.partner_id = ?`,
      [...class_section_ids, ctx.partnerUserId]
    )
    if (csCheck.length !== class_section_ids.length) {
      return NextResponse.json({ error: "One or more class sections not found" }, { status: 404 })
    }

    const createdIds: number[] = []

    await executeTransaction(async (connection) => {
      for (const csId of class_section_ids) {
        // Auto-compute status based on dates
        const today = new Date().toISOString().split("T")[0]
        let status = "upcoming"
        if (start_date && end_date) {
          if (today > end_date) status = "completed"
          else if (today >= start_date) status = "in_progress"
        } else if (start_date && today >= start_date) {
          status = "in_progress"
        }

        // Create exam
        const [result] = await connection.execute(
          `INSERT INTO erp_exams (class_section_id, partner_id, name, code, start_date, end_date, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [csId, ctx.partnerUserId, name, code || null, start_date || null, end_date || null, status]
        )
        const examId = (result as any).insertId
        createdIds.push(examId)

        // Auto-add all subjects of this class-section to the exam schedule
        const [subjects] = await connection.execute(
          "SELECT id FROM erp_subjects WHERE class_section_id = ? ORDER BY sort_order, name",
          [csId]
        )
        for (const sub of subjects as any[]) {
          await connection.execute(
            `INSERT INTO erp_exam_schedules (exam_id, subject_id, maximum_marks, created_at, updated_at)
             VALUES (?, ?, 100, NOW(), NOW())`,
            [examId, sub.id]
          )
        }
      }
    })

    return NextResponse.json(
      { data: { ids: createdIds }, message: `Exam created for ${createdIds.length} class-section(s) with all subjects` },
      { status: 201 }
    )
  } catch (error) {
    console.error("Exams POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
