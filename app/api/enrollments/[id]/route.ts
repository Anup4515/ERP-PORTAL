import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    // Verify enrollment belongs to this partner
    const ownershipCheck = await executeQuery<{ id: number }[]>(
      `SELECT e.id FROM erp_student_enrollments e
       WHERE e.id = ? AND e.partner_id = ?`,
      [id, ctx.partnerUserId]
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
    if (error?.code === "23505") {
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

    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    // Verify enrollment belongs to this partner
    const ownershipCheck = await executeQuery<{ id: number }[]>(
      `SELECT e.id FROM erp_student_enrollments e
       WHERE e.id = ? AND e.partner_id = ?`,
      [id, ctx.partnerUserId]
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
