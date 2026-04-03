import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
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
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "school_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const school_id = session.user.school_id
    if (!school_id) return NextResponse.json({ error: "No partner profile" }, { status: 400 })

    const partnerRows = await executeQuery<{ user_id: number }[]>(
      "SELECT user_id FROM partners WHERE id = ?", [school_id]
    )
    if (partnerRows.length === 0) return NextResponse.json({ error: "Partner not found" }, { status: 404 })

    if (!(await verifyStaffOwnership(id, partnerRows[0].user_id))) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 })
    }

    const body = await request.json()
    const allowed = ["name", "designation", "department", "phone", "email", "qualification", "experience", "address", "status"]
    const updates: string[] = []
    const values: any[] = []

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
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "school_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const school_id = session.user.school_id
    if (!school_id) return NextResponse.json({ error: "No partner profile" }, { status: 400 })

    const partnerRows = await executeQuery<{ user_id: number }[]>(
      "SELECT user_id FROM partners WHERE id = ?", [school_id]
    )
    if (partnerRows.length === 0) return NextResponse.json({ error: "Partner not found" }, { status: 404 })

    if (!(await verifyStaffOwnership(id, partnerRows[0].user_id))) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 })
    }

    await executeQuery("DELETE FROM partner_staff WHERE id = ?", [id])
    return NextResponse.json({ message: "Staff removed" })
  } catch (error) {
    console.error("Staff DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
