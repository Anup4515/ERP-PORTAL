import { NextResponse } from "next/server"
import { getAuthContext, isAuthError, resolveSessionId, isSessionError, ensureCurrentSession } from "@/app/lib/auth-utils"
import { executeQuery, executeTransaction } from "@/app/lib/db"

export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin", "teacher"])
    if (isAuthError(ctx)) return ctx

    const { searchParams } = new URL(request.url)
    const sessionIdParam = searchParams.get("session_id")
    if (sessionIdParam) {
      const guard = await ensureCurrentSession(Number(sessionIdParam), ctx.partnerUserId)
      if (guard) return guard
    }

    const body = await request.json()
    const { parameter_id, class_section_id, month, ratings } = body

    if (!parameter_id || !class_section_id || !month || !Array.isArray(ratings) || ratings.length === 0) {
      return NextResponse.json(
        { error: "parameter_id, class_section_id, month, and ratings array are required" },
        { status: 400 }
      )
    }

    // Verify the parameter belongs to this partner
    const paramCheck = await executeQuery<{ id: number }[]>(
      "SELECT id FROM erp_holistic_parameters WHERE id = ? AND partner_id = ?",
      [parameter_id, ctx.partnerUserId]
    )
    if (paramCheck.length === 0) {
      return NextResponse.json({ error: "Parameter not found" }, { status: 404 })
    }

    // Verify class section belongs to this partner's resolved session
    const sess = await resolveSessionId(request, ctx.partnerUserId)
    if (isSessionError(sess)) return sess
    const currentSessionId = sess.sessionId

    const csCheck = await executeQuery<{ id: number }[]>(
      "SELECT id FROM erp_class_sections WHERE id = ? AND session_id = ?",
      [class_section_id, currentSessionId]
    )
    if (csCheck.length === 0) {
      return NextResponse.json({ error: "Class section not found" }, { status: 404 })
    }

    // For teacher role: verify teacher is assigned to the class
    if (ctx.role === "teacher") {
      const teacherCheck = await executeQuery<{ id: number }[]>(
        `SELECT ecs.id FROM erp_class_sections ecs
         WHERE ecs.id = ? AND ecs.session_id = ?
           AND (ecs.class_teacher_id = ? OR ecs.second_incharge_id = ?
                OR ecs.id IN (SELECT DISTINCT class_section_id FROM erp_subjects WHERE teacher_id = ?))`,
        [class_section_id, currentSessionId, ctx.userId, ctx.userId, ctx.userId]
      )
      if (teacherCheck.length === 0) {
        return NextResponse.json({ error: "Not authorized for this class" }, { status: 403 })
      }
    }

    const ratedBy = ctx.userId

    // Pre-compute rows
    const rows: (string | number | null)[][] = []
    for (const rating of ratings) {
      const { student_enrollment_id, sub_parameter_id, rating_value, comments } = rating
      if (!student_enrollment_id || !sub_parameter_id) continue
      rows.push([student_enrollment_id, sub_parameter_id, month, rating_value ?? null, comments || null, ratedBy])
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "No valid ratings to save" }, { status: 400 })
    }

    // Batch insert in chunks of 50
    const BATCH_SIZE = 50
    await executeTransaction(async (connection) => {
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE)
        const placeholders = batch.map(() => "(?, ?, ?, ?, NULL, ?, ?, NOW(), NOW())").join(", ")
        const flatParams = batch.flat()

        await connection.execute(
          `INSERT INTO erp_holistic_ratings
             (student_enrollment_id, sub_parameter_id, month, rating_value, rating_grade, comments, rated_by, created_at, updated_at)
           VALUES ${placeholders}
           ON DUPLICATE KEY UPDATE
             rating_value = VALUES(rating_value),
             comments = VALUES(comments),
             rated_by = VALUES(rated_by),
             updated_at = NOW()`,
          flatParams
        )
      }
    })

    return NextResponse.json({ message: "Ratings saved successfully" })
  } catch (error) {
    console.error("Holistic ratings bulk POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
