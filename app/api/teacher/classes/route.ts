import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

export async function GET() {
  try {
    const ctx = await getAuthContext(["teacher"])
    if (isAuthError(ctx)) return ctx

    // Get current session
    const sessRows = await executeQuery<{ id: number }[]>(
      "SELECT id FROM erp_sessions WHERE partner_id = ? AND is_current = 1 LIMIT 1",
      [ctx.partnerUserId]
    )
    if (sessRows.length === 0) {
      return NextResponse.json({ data: [] })
    }
    const currentSessionId = sessRows[0].id

    // Get class-sections where teacher is class_teacher or second_incharge
    const classes = await executeQuery(
      `SELECT ecs.id as class_section_id, c.name as class_name, s.name as section_name, c.grade_level,
              CASE
                WHEN ecs.class_teacher_id = ? THEN 'Class Teacher'
                WHEN ecs.second_incharge_id = ? THEN 'Second Incharge'
                ELSE 'Subject Teacher'
              END as role,
              (SELECT COUNT(*) FROM erp_student_enrollments se
               WHERE se.class_section_id = ecs.id AND se.status = 'active') as student_count
       FROM erp_class_sections ecs
       JOIN classes c ON c.id = ecs.class_id
       JOIN sections s ON s.id = ecs.section_id
       WHERE ecs.session_id = ?
         AND (
           ecs.class_teacher_id = ?
           OR ecs.second_incharge_id = ?
           OR ecs.id IN (
             SELECT DISTINCT class_section_id FROM erp_subjects WHERE teacher_id = ?
           )
         )
       ORDER BY c.name, s.name`,
      [ctx.userId, ctx.userId, currentSessionId, ctx.userId, ctx.userId, ctx.userId]
    )

    return NextResponse.json({ data: classes })
  } catch (error) {
    console.error("Teacher classes GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
