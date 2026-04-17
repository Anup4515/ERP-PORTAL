import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

async function verifyStaffOwnership(staffId: string, partnerUserId: number) {
  const rows = await executeQuery<{ id: number }[]>(
    "SELECT id FROM partner_staff WHERE id = ? AND partner_id = ?",
    [staffId, partnerUserId]
  )
  return rows.length > 0
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    if (!(await verifyStaffOwnership(id, ctx.partnerUserId))) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 })
    }

    const body = await request.json()
    const allowed = ["name", "designation", "department", "phone", "email", "qualification", "experience", "address", "status", "date_of_joining"]
    const updates: string[] = []
    const values: any[] = []

    if (body.date_of_joining) {
      const doj = new Date(body.date_of_joining)
      if (isNaN(doj.getTime()) || doj > new Date()) {
        return NextResponse.json({ error: "Date of joining cannot be in the future" }, { status: 400 })
      }
    }

    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates.push(`${key} = ?`)
        values.push(body[key] || null)
      }
    }
    if (updates.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 })

    values.push(Number(id))
    await executeQuery(`UPDATE partner_staff SET ${updates.join(", ")}, updated_at = NOW() WHERE id = ?`, values)

    return NextResponse.json({ message: "Staff updated" })
  } catch (error) {
    console.error("Staff PUT error:", error)
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

    if (!(await verifyStaffOwnership(id, ctx.partnerUserId))) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 })
    }

    await executeQuery("DELETE FROM partner_staff WHERE id = ?", [id])
    return NextResponse.json({ message: "Staff removed" })
  } catch (error) {
    console.error("Staff DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
