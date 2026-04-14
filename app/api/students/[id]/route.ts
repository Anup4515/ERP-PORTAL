import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const students = await executeQuery(
      `SELECT st.*, e.id as enrollment_id, e.class_section_id, e.roll_number, e.student_type, e.status as enrollment_status,
              c.name as class_name, sec.name as section_name, es.name as session_name
       FROM students st
       LEFT JOIN erp_student_enrollments e ON e.student_id = st.id
         AND e.class_section_id IN (
           SELECT ecs2.id FROM erp_class_sections ecs2
           JOIN erp_sessions es2 ON es2.id = ecs2.session_id
           WHERE es2.partner_id = ? AND es2.is_current = 1
         )
       LEFT JOIN erp_class_sections ecs ON ecs.id = e.class_section_id
       LEFT JOIN erp_sessions es ON es.id = ecs.session_id
       LEFT JOIN classes c ON c.id = ecs.class_id
       LEFT JOIN sections sec ON sec.id = ecs.section_id
       WHERE st.id = ? AND st.deleted_at IS NULL
         AND EXISTS (
           SELECT 1 FROM erp_student_enrollments e2
           JOIN erp_class_sections ecs3 ON ecs3.id = e2.class_section_id
           JOIN erp_sessions es3 ON es3.id = ecs3.session_id
           WHERE e2.student_id = st.id AND es3.partner_id = ?
         )`,
      [ctx.partnerUserId, id, ctx.partnerUserId]
    )

    if (students.length === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    return NextResponse.json({ data: students[0] })
  } catch (error) {
    console.error("Student GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    // Verify student belongs to partner
    const ownershipCheck = await executeQuery<{ id: number }[]>(
      `SELECT st.id FROM students st
       JOIN erp_student_enrollments e ON e.student_id = st.id
       WHERE st.id = ? AND e.partner_id = ? AND st.deleted_at IS NULL`,
      [id, ctx.partnerUserId]
    )
    if (ownershipCheck.length === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const body = await request.json()
    const {
      first_name, last_name, middle_name, gender, date_of_birth,
      email, phone, alternate_phone, address, city, state, country, postal_code,
      father_name, mother_name, guardian_name, guardian_phone, guardian_email,
      profile_image, status, height, weight, blood_group
    } = body

    const fields: string[] = []
    const values: any[] = []

    if (first_name !== undefined) { fields.push("first_name = ?"); values.push(first_name) }
    if (last_name !== undefined) { fields.push("last_name = ?"); values.push(last_name) }
    if (middle_name !== undefined) { fields.push("middle_name = ?"); values.push(middle_name || null) }
    if (gender !== undefined) { fields.push("gender = ?"); values.push(gender || null) }
    if (date_of_birth !== undefined) { fields.push("date_of_birth = ?"); values.push(date_of_birth ? date_of_birth.substring(0, 10) : null) }
    if (email !== undefined) { fields.push("email = ?"); values.push(email) }
    if (phone !== undefined) { fields.push("phone = ?"); values.push(phone || null) }
    if (alternate_phone !== undefined) { fields.push("alternate_phone = ?"); values.push(alternate_phone || null) }
    if (address !== undefined) { fields.push("address = ?"); values.push(address || null) }
    if (city !== undefined) { fields.push("city = ?"); values.push(city || null) }
    if (state !== undefined) { fields.push("state = ?"); values.push(state || null) }
    if (country !== undefined) { fields.push("country = ?"); values.push(country || null) }
    if (postal_code !== undefined) { fields.push("postal_code = ?"); values.push(postal_code || null) }
    if (father_name !== undefined) { fields.push("father_name = ?"); values.push(father_name || null) }
    if (mother_name !== undefined) { fields.push("mother_name = ?"); values.push(mother_name || null) }
    if (guardian_name !== undefined) { fields.push("guardian_name = ?"); values.push(guardian_name || null) }
    if (guardian_phone !== undefined) { fields.push("guardian_phone = ?"); values.push(guardian_phone || null) }
    if (guardian_email !== undefined) { fields.push("guardian_email = ?"); values.push(guardian_email || null) }
    if (profile_image !== undefined) { fields.push("profile_image = ?"); values.push(profile_image || null) }
    if (status !== undefined) { fields.push("status = ?"); values.push(status) }
    if (height !== undefined) { fields.push("height = ?"); values.push(height || null) }
    if (weight !== undefined) { fields.push("weight = ?"); values.push(weight || null) }
    if (blood_group !== undefined) { fields.push("blood_group = ?"); values.push(blood_group || null) }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    fields.push("updated_at = NOW()")
    values.push(id)

    await executeQuery(
      `UPDATE students SET ${fields.join(", ")} WHERE id = ?`,
      values
    )

    return NextResponse.json({ message: "Student updated successfully" })
  } catch (error: any) {
    console.error("Student PUT error:", error)
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "A student with this email already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    // Verify student belongs to partner
    const ownershipCheck = await executeQuery<{ id: number }[]>(
      `SELECT st.id FROM students st
       JOIN erp_student_enrollments e ON e.student_id = st.id
       WHERE st.id = ? AND e.partner_id = ? AND st.deleted_at IS NULL`,
      [id, ctx.partnerUserId]
    )
    if (ownershipCheck.length === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    await executeQuery(
      "UPDATE students SET status = 'inactive', deleted_at = NOW() WHERE id = ?",
      [id]
    )

    // Also deactivate all enrollments so the student won't appear in attendance, marks, etc.
    await executeQuery(
      "UPDATE erp_student_enrollments SET status = 'withdrawn', updated_at = NOW() WHERE student_id = ?",
      [id]
    )

    return NextResponse.json({ message: "Student deleted successfully" })
  } catch (error) {
    console.error("Student DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
