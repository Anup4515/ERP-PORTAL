import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

/**
 * GET /api/sessions/[id]/transition/preview
 *
 * Returns all data needed for the session transition wizard:
 * - Source session info
 * - Class sections with teacher assignments and student counts
 * - Subjects per class section with teacher assignments
 * - Promotion mapping (which class promotes to which)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sourceSessionId } = await params

    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    // Verify source session belongs to this partner
    const sessionRows = await executeQuery<{
      id: number
      name: string
      start_date: string
      end_date: string
      is_current: number
    }[]>(
      "SELECT id, name, start_date, end_date, is_current FROM erp_sessions WHERE id = ? AND partner_id = ?",
      [sourceSessionId, ctx.partnerUserId]
    )
    if (sessionRows.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }
    const sourceSession = sessionRows[0]

    // Get all class sections in this session with teacher info and student counts
    const classSections = await executeQuery<{
      class_section_id: number
      class_id: number
      class_name: string
      class_code: string | null
      grade_level: number | null
      display_order: number
      section_id: number
      section_name: string
      class_teacher_id: number | null
      class_teacher_name: string | null
      second_incharge_id: number | null
      second_incharge_name: string | null
      student_count: number
    }[]>(
      `SELECT
        ecs.id as class_section_id,
        c.id as class_id, c.name as class_name, c.code as class_code,
        c.grade_level, c.display_order,
        s.id as section_id, s.name as section_name,
        ecs.class_teacher_id,
        ct.name as class_teacher_name,
        ecs.second_incharge_id,
        si.name as second_incharge_name,
        (SELECT COUNT(*) FROM erp_student_enrollments se
         WHERE se.class_section_id = ecs.id AND se.status = 'active') as student_count
       FROM erp_class_sections ecs
       JOIN classes c ON c.id = ecs.class_id
       JOIN sections s ON s.id = ecs.section_id
       LEFT JOIN users ct ON ct.id = ecs.class_teacher_id
       LEFT JOIN users si ON si.id = ecs.second_incharge_id
       WHERE ecs.session_id = ?
       ORDER BY c.display_order, c.name, s.name`,
      [sourceSessionId]
    )

    // Get subjects per class section with teacher assignments
    const subjects = await executeQuery<{
      id: number
      class_section_id: number
      name: string
      code: string | null
      teacher_id: number | null
      teacher_name: string | null
      sort_order: number
    }[]>(
      `SELECT sub.id, sub.class_section_id, sub.name, sub.code,
              sub.teacher_id, u.name as teacher_name, sub.sort_order
       FROM erp_subjects sub
       JOIN erp_class_sections ecs ON ecs.id = sub.class_section_id
       LEFT JOIN users u ON u.id = sub.teacher_id
       WHERE ecs.session_id = ?
       ORDER BY sub.class_section_id, sub.sort_order, sub.name`,
      [sourceSessionId]
    )

    // Get students per class section for promotion step
    const students = await executeQuery<{
      enrollment_id: number
      student_id: number
      class_section_id: number
      first_name: string
      last_name: string
      roll_number: number | null
      student_type: string
    }[]>(
      `SELECT se.id as enrollment_id, se.student_id, se.class_section_id,
              st.first_name, st.last_name, se.roll_number, se.student_type
       FROM erp_student_enrollments se
       JOIN students st ON st.id = se.student_id
       JOIN erp_class_sections ecs ON ecs.id = se.class_section_id
       WHERE ecs.session_id = ? AND se.status = 'active' AND st.deleted_at IS NULL
       ORDER BY ecs.id, se.roll_number, st.first_name`,
      [sourceSessionId]
    )

    // Get all classes for this partner (for target class mapping in promotion)
    const allClasses = await executeQuery<{
      class_id: number
      class_name: string
      grade_level: number | null
      display_order: number
      section_id: number
      section_name: string
    }[]>(
      `SELECT c.id as class_id, c.name as class_name, c.grade_level, c.display_order,
              s.id as section_id, s.name as section_name
       FROM classes c
       JOIN sections s ON s.class_id = c.id
       WHERE c.partner_id = ? AND c.status = 'active' AND s.status = 'active'
       ORDER BY c.display_order, c.name, s.name`,
      [ctx.partnerUserId]
    )

    // Check if grading scheme exists for this session
    const gradingConfig = await executeQuery<{ grading_scheme_id: number | null }[]>(
      `SELECT grading_scheme_id FROM erp_configurations WHERE session_id = ? AND partner_id = ?`,
      [sourceSessionId, ctx.partnerUserId]
    )

    // Group subjects by class_section_id
    const subjectsByClassSection: Record<number, typeof subjects> = {}
    for (const sub of subjects) {
      if (!subjectsByClassSection[sub.class_section_id]) {
        subjectsByClassSection[sub.class_section_id] = []
      }
      subjectsByClassSection[sub.class_section_id].push(sub)
    }

    // Group students by class_section_id
    const studentsByClassSection: Record<number, typeof students> = {}
    for (const stu of students) {
      if (!studentsByClassSection[stu.class_section_id]) {
        studentsByClassSection[stu.class_section_id] = []
      }
      studentsByClassSection[stu.class_section_id].push(stu)
    }

    return NextResponse.json({
      data: {
        source_session: sourceSession,
        class_sections: classSections,
        subjects_by_class_section: subjectsByClassSection,
        students_by_class_section: studentsByClassSection,
        all_classes: allClasses,
        has_grading_scheme: gradingConfig.length > 0 && gradingConfig[0].grading_scheme_id != null,
        summary: {
          total_class_sections: classSections.length,
          total_students: students.length,
          total_subjects: subjects.length,
          total_teachers: new Set([
            ...classSections.filter(cs => cs.class_teacher_id).map(cs => cs.class_teacher_id),
            ...subjects.filter(s => s.teacher_id).map(s => s.teacher_id),
          ]).size,
        },
      },
    })
  } catch (error) {
    console.error("Transition preview error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
