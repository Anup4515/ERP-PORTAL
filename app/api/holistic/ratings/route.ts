import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin", "teacher"])
    if (isAuthError(ctx)) return ctx

    const { searchParams } = new URL(request.url)
    const parameterId = searchParams.get("parameter_id")
    const classSectionId = searchParams.get("class_section_id")
    const month = searchParams.get("month")

    if (!parameterId || !classSectionId || !month) {
      return NextResponse.json(
        { error: "parameter_id, class_section_id, and month are required" },
        { status: 400 }
      )
    }

    // Verify the parameter belongs to this partner
    const paramCheck = await executeQuery<{ id: number }[]>(
      "SELECT id FROM erp_holistic_parameters WHERE id = ? AND partner_id = ?",
      [parameterId, ctx.partnerUserId]
    )
    if (paramCheck.length === 0) {
      return NextResponse.json({ error: "Parameter not found" }, { status: 404 })
    }

    // Verify class section belongs to this partner's current session
    const sessRows = await executeQuery<{ id: number }[]>(
      "SELECT id FROM erp_sessions WHERE partner_id = ? AND is_current = 1 LIMIT 1",
      [ctx.partnerUserId]
    )
    if (sessRows.length === 0) {
      return NextResponse.json({ data: { students: [], sub_parameters: [], ratings: {} } })
    }
    const currentSessionId = sessRows[0].id

    const csCheck = await executeQuery<{ id: number }[]>(
      "SELECT id FROM erp_class_sections WHERE id = ? AND session_id = ?",
      [classSectionId, currentSessionId]
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
        [classSectionId, currentSessionId, ctx.userId, ctx.userId, ctx.userId]
      )
      if (teacherCheck.length === 0) {
        return NextResponse.json({ error: "Not authorized for this class" }, { status: 403 })
      }
    }

    // Get students
    const students = await executeQuery(
      `SELECT se.id as enrollment_id, se.roll_number, s.first_name, s.last_name
       FROM erp_student_enrollments se
       JOIN students s ON s.id = se.student_id
       WHERE se.class_section_id = ? AND se.status = 'active'
       ORDER BY se.roll_number, s.first_name`,
      [classSectionId]
    )

    // Get sub-parameters
    const sub_parameters = await executeQuery(
      `SELECT id, name, sort_order
       FROM erp_holistic_sub_parameters
       WHERE parameter_id = ?
       ORDER BY sort_order, name`,
      [parameterId]
    )

    // Get ratings for this month
    const ratingRows = await executeQuery<{
      student_enrollment_id: number
      sub_parameter_id: number
      rating_value: number | null
      rating_grade: string | null
      comments: string | null
    }[]>(
      `SELECT hr.student_enrollment_id, hr.sub_parameter_id,
              hr.rating_value, hr.rating_grade, hr.comments
       FROM erp_holistic_ratings hr
       JOIN erp_student_enrollments se ON se.id = hr.student_enrollment_id
       JOIN erp_holistic_sub_parameters hsp ON hsp.id = hr.sub_parameter_id
       WHERE se.class_section_id = ? AND hsp.parameter_id = ? AND hr.month = ?`,
      [classSectionId, parameterId, month]
    )

    // Build ratings map keyed by "enrollment_id-sub_parameter_id"
    const ratings: Record<string, { rating_value: number | null; rating_grade: string | null; comments: string | null }> = {}
    for (const row of ratingRows) {
      const key = `${row.student_enrollment_id}-${row.sub_parameter_id}`
      ratings[key] = {
        rating_value: row.rating_value,
        rating_grade: row.rating_grade,
        comments: row.comments,
      }
    }

    return NextResponse.json({ data: { students, sub_parameters, ratings } })
  } catch (error) {
    console.error("Holistic ratings GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
