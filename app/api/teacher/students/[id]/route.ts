import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

// Helper: verify teacher is assigned to the class this student is enrolled in
async function verifyTeacherAccessToStudent(
  studentId: number,
  teacherUserId: number,
  partnerUserId: number
): Promise<boolean> {
  const rows = await executeQuery<{ id: number }[]>(
    `SELECT se.id FROM erp_student_enrollments se
     JOIN erp_class_sections ecs ON ecs.id = se.class_section_id
     JOIN erp_sessions es ON es.id = ecs.session_id
     WHERE se.student_id = ? AND se.status = 'active' AND es.partner_id = ?
       AND es.is_current = 1
       AND (
         ecs.class_teacher_id = ?
         OR ecs.second_incharge_id = ?
         OR ecs.id IN (SELECT DISTINCT class_section_id FROM erp_subjects WHERE teacher_id = ?)
       )
     LIMIT 1`,
    [studentId, partnerUserId, teacherUserId, teacherUserId, teacherUserId]
  )
  return rows.length > 0
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ctx = await getAuthContext(["teacher"])
    if (isAuthError(ctx)) return ctx

    const hasAccess = await verifyTeacherAccessToStudent(Number(id), ctx.userId, ctx.partnerUserId)
    if (!hasAccess) return NextResponse.json({ error: "Not authorized" }, { status: 403 })

    const rows = await executeQuery(
      `SELECT id, first_name, last_name, middle_name, gender, date_of_birth,
              email, phone, alternate_phone, address, city, state, postal_code,
              father_name, mother_name, guardian_name, guardian_phone, guardian_email
       FROM students WHERE id = ?`,
      [id]
    )

    if ((rows as any[]).length === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    return NextResponse.json({ data: (rows as any[])[0] })
  } catch (error) {
    console.error("Teacher student GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ctx = await getAuthContext(["teacher"])
    if (isAuthError(ctx)) return ctx

    const hasAccess = await verifyTeacherAccessToStudent(Number(id), ctx.userId, ctx.partnerUserId)
    if (!hasAccess) return NextResponse.json({ error: "Not authorized" }, { status: 403 })

    const body = await request.json()
    const allowed = [
      "first_name", "last_name", "middle_name", "gender", "date_of_birth",
      "phone", "alternate_phone", "address", "city", "state", "postal_code",
      "father_name", "mother_name", "guardian_name", "guardian_phone", "guardian_email",
    ]

    const updates: string[] = []
    const values: (string | null)[] = []

    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates.push(`${key} = ?`)
        values.push(body[key] || null)
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    updates.push("updated_at = NOW()")
    values.push(id)

    await executeQuery(
      `UPDATE students SET ${updates.join(", ")} WHERE id = ?`,
      values
    )

    return NextResponse.json({ message: "Student updated successfully" })
  } catch (error) {
    console.error("Teacher student PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
