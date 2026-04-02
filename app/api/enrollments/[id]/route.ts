import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { executeQuery } from "@/app/lib/db"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "school_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const school_id = session.user.school_id
    if (!school_id) return NextResponse.json({ error: "No partner profile" }, { status: 400 })

    const partnerRows = await executeQuery<{ user_id: number }[]>(
      "SELECT user_id FROM partners WHERE id = ?",
      [school_id]
    )
    if (partnerRows.length === 0) return NextResponse.json({ error: "Partner not found" }, { status: 404 })
    const partnerUserId = partnerRows[0].user_id

    // Verify enrollment belongs to this partner
    const ownershipCheck = await executeQuery<{ id: number }[]>(
      `SELECT e.id FROM erp_student_enrollments e
       JOIN erp_class_sections ecs ON ecs.id = e.class_section_id
       JOIN erp_sessions es ON es.id = ecs.session_id
       WHERE e.id = ? AND es.partner_id = ?`,
      [id, partnerUserId]
    )
    if (ownershipCheck.length === 0) {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 })
    }

    const body = await request.json()
    const { roll_number, status, student_type } = body

    const fields: string[] = []
    const values: any[] = []

    if (roll_number !== undefined) { fields.push("roll_number = ?"); values.push(roll_number || null) }
    if (status !== undefined) { fields.push("status = ?"); values.push(status) }
    if (student_type !== undefined) { fields.push("student_type = ?"); values.push(student_type) }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    fields.push("updated_at = NOW()")
    values.push(id)

    await executeQuery(
      `UPDATE erp_student_enrollments SET ${fields.join(", ")} WHERE id = ?`,
      values
    )

    return NextResponse.json({ message: "Enrollment updated successfully" })
  } catch (error: any) {
    console.error("Enrollment PUT error:", error)
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "Roll number is already taken in this class section" },
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

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "school_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const school_id = session.user.school_id
    if (!school_id) return NextResponse.json({ error: "No partner profile" }, { status: 400 })

    const partnerRows = await executeQuery<{ user_id: number }[]>(
      "SELECT user_id FROM partners WHERE id = ?",
      [school_id]
    )
    if (partnerRows.length === 0) return NextResponse.json({ error: "Partner not found" }, { status: 404 })
    const partnerUserId = partnerRows[0].user_id

    // Verify enrollment belongs to this partner
    const ownershipCheck = await executeQuery<{ id: number }[]>(
      `SELECT e.id FROM erp_student_enrollments e
       JOIN erp_class_sections ecs ON ecs.id = e.class_section_id
       JOIN erp_sessions es ON es.id = ecs.session_id
       WHERE e.id = ? AND es.partner_id = ?`,
      [id, partnerUserId]
    )
    if (ownershipCheck.length === 0) {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 })
    }

    await executeQuery(
      "DELETE FROM erp_student_enrollments WHERE id = ?",
      [id]
    )

    return NextResponse.json({ message: "Enrollment deleted successfully" })
  } catch (error) {
    console.error("Enrollment DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
