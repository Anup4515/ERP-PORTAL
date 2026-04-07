import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery, executeTransaction } from "@/app/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teacherUserId } = await params

    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    // Verify teacher belongs to this partner
    const teacherRows = await executeQuery<{ id: number }[]>(
      `SELECT t.id FROM teachers t
       JOIN users u ON u.id = t.user_id
       WHERE t.user_id = ? AND t.partner_id = ? AND u.role_id = 5`,
      [teacherUserId, ctx.schoolId]
    )
    if (teacherRows.length === 0) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    // Get class assignments (class teacher / second incharge)
    const classAssignments = await executeQuery(
      `SELECT ecs.id as class_section_id, c.name as class_name, s.name as section_name,
              CASE WHEN ecs.class_teacher_id = ? THEN 'class_teacher'
                   WHEN ecs.second_incharge_id = ? THEN 'second_incharge'
                   ELSE NULL END as role
       FROM erp_class_sections ecs
       JOIN erp_sessions es ON es.id = ecs.session_id
       JOIN classes c ON c.id = ecs.class_id
       JOIN sections s ON s.id = ecs.section_id
       WHERE es.partner_id = ? AND (ecs.class_teacher_id = ? OR ecs.second_incharge_id = ?)`,
      [teacherUserId, teacherUserId, ctx.partnerUserId, teacherUserId, teacherUserId]
    )

    // Get subject assignments
    const subjectAssignments = await executeQuery(
      `SELECT sub.id, sub.name as subject_name, sub.code, c.name as class_name, sec.name as section_name
       FROM erp_subjects sub
       JOIN erp_class_sections ecs ON ecs.id = sub.class_section_id
       JOIN erp_sessions es ON es.id = ecs.session_id
       JOIN classes c ON c.id = ecs.class_id
       JOIN sections sec ON sec.id = ecs.section_id
       WHERE sub.teacher_id = ? AND es.partner_id = ?`,
      [teacherUserId, ctx.partnerUserId]
    )

    return NextResponse.json({
      data: {
        class_assignments: classAssignments,
        subject_assignments: subjectAssignments,
      },
    })
  } catch (error) {
    console.error("Teacher assignments GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teacherUserId } = await params

    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    // Verify teacher belongs to this partner
    const teacherRows = await executeQuery<{ id: number }[]>(
      `SELECT t.id FROM teachers t
       JOIN users u ON u.id = t.user_id
       WHERE t.user_id = ? AND t.partner_id = ? AND u.role_id = 5`,
      [teacherUserId, ctx.schoolId]
    )
    if (teacherRows.length === 0) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    const body = await request.json()
    const { class_assignments, subject_assignments } = body

    await executeTransaction(async (connection) => {
      // Update class assignments
      if (Array.isArray(class_assignments)) {
        // First, clear existing class teacher / second incharge assignments for this teacher
        await connection.execute(
          `UPDATE erp_class_sections ecs
           JOIN erp_sessions es ON es.id = ecs.session_id
           SET ecs.class_teacher_id = NULL, ecs.updated_at = NOW()
           WHERE ecs.class_teacher_id = ? AND es.partner_id = ?`,
          [teacherUserId, ctx.partnerUserId]
        )
        await connection.execute(
          `UPDATE erp_class_sections ecs
           JOIN erp_sessions es ON es.id = ecs.session_id
           SET ecs.second_incharge_id = NULL, ecs.updated_at = NOW()
           WHERE ecs.second_incharge_id = ? AND es.partner_id = ?`,
          [teacherUserId, ctx.partnerUserId]
        )

        // Apply new class assignments
        for (const assignment of class_assignments) {
          const { class_section_id, role } = assignment
          if (!class_section_id || !role) continue

          // Verify class section belongs to this partner
          const [csRows] = await connection.execute(
            `SELECT ecs.id FROM erp_class_sections ecs
             JOIN erp_sessions es ON es.id = ecs.session_id
             WHERE ecs.id = ? AND es.partner_id = ?`,
            [class_section_id, ctx.partnerUserId]
          )
          if ((csRows as any[]).length === 0) continue

          if (role === "class_teacher") {
            // Check if another teacher is already assigned as class teacher
            const [existingRows] = await connection.execute(
              `SELECT ecs.class_teacher_id, u.name as teacher_name
               FROM erp_class_sections ecs
               LEFT JOIN users u ON u.id = ecs.class_teacher_id
               WHERE ecs.id = ? AND ecs.class_teacher_id IS NOT NULL AND ecs.class_teacher_id != ?`,
              [class_section_id, teacherUserId]
            )
            if ((existingRows as any[]).length > 0) {
              const existing = (existingRows as any[])[0]
              throw new Error(`CONFLICT:class_teacher:${existing.teacher_name || 'Another teacher'} is already the Class Teacher for this class-section.`)
            }
            await connection.execute(
              `UPDATE erp_class_sections SET class_teacher_id = ?, updated_at = NOW() WHERE id = ?`,
              [teacherUserId, class_section_id]
            )
          } else if (role === "second_incharge") {
            // Check if another teacher is already assigned as second incharge
            const [existingRows] = await connection.execute(
              `SELECT ecs.second_incharge_id, u.name as teacher_name
               FROM erp_class_sections ecs
               LEFT JOIN users u ON u.id = ecs.second_incharge_id
               WHERE ecs.id = ? AND ecs.second_incharge_id IS NOT NULL AND ecs.second_incharge_id != ?`,
              [class_section_id, teacherUserId]
            )
            if ((existingRows as any[]).length > 0) {
              const existing = (existingRows as any[])[0]
              throw new Error(`CONFLICT:second_incharge:${existing.teacher_name || 'Another teacher'} is already the Second Incharge for this class-section.`)
            }
            await connection.execute(
              `UPDATE erp_class_sections SET second_incharge_id = ?, updated_at = NOW() WHERE id = ?`,
              [teacherUserId, class_section_id]
            )
          }
        }
      }

      // Update subject assignments
      if (Array.isArray(subject_assignments)) {
        // Clear existing subject assignments for this teacher
        await connection.execute(
          `UPDATE erp_subjects sub
           JOIN erp_class_sections ecs ON ecs.id = sub.class_section_id
           JOIN erp_sessions es ON es.id = ecs.session_id
           SET sub.teacher_id = NULL, sub.updated_at = NOW()
           WHERE sub.teacher_id = ? AND es.partner_id = ?`,
          [teacherUserId, ctx.partnerUserId]
        )

        // Apply new subject assignments
        for (const subjectId of subject_assignments) {
          // Verify subject belongs to this partner
          const [subRows] = await connection.execute(
            `SELECT sub.id FROM erp_subjects sub
             JOIN erp_class_sections ecs ON ecs.id = sub.class_section_id
             JOIN erp_sessions es ON es.id = ecs.session_id
             WHERE sub.id = ? AND es.partner_id = ?`,
            [subjectId, ctx.partnerUserId]
          )
          if ((subRows as any[]).length === 0) continue

          await connection.execute(
            `UPDATE erp_subjects SET teacher_id = ?, updated_at = NOW() WHERE id = ?`,
            [teacherUserId, subjectId]
          )
        }
      }
    })

    return NextResponse.json({ message: "Assignments updated successfully" })
  } catch (error: any) {
    console.error("Teacher assignments PUT error:", error)
    if (error?.message?.startsWith("CONFLICT:")) {
      const message = error.message.split(":").slice(2).join(":")
      return NextResponse.json({ error: message }, { status: 409 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
