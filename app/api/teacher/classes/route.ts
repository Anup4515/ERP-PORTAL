import { NextResponse } from "next/server"
import { getAuthContext, isAuthError, resolveSessionId, isSessionError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["teacher"])
    if (isAuthError(ctx)) return ctx

    const sess = await resolveSessionId(request, ctx.partnerUserId)
    if (isSessionError(sess)) return sess

    // Get class-sections where teacher is class_teacher or second_incharge
    const classes = await executeQuery(
      `SELECT ecs.id as class_section_id, c.name as class_name, s.name as section_name, c.grade_level,
              CASE
                WHEN ecs.class_teacher_id = ? THEN 'Class Teacher'
                WHEN ecs.second_incharge_id = ? THEN 'Second Incharge'
                ELSE 'Subject Teacher'
              END as role,
              (SELECT COUNT(*) FROM erp_student_enrollments se
               WHERE se.class_section_id = ecs.id AND se.status IN ('active', 'completed')) as student_count
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
      [ctx.userId, ctx.userId, sess.sessionId, ctx.userId, ctx.userId, ctx.userId]
    )

    return NextResponse.json({ data: classes })
  } catch (error) {
    console.error("Teacher classes GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
