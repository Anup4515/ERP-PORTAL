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

    // Verify subject belongs to this partner
    const ownershipCheck = await executeQuery<{ id: number }[]>(
      `SELECT s.id FROM erp_subjects s
       JOIN erp_class_sections ecs ON ecs.id = s.class_section_id
       JOIN erp_sessions es ON es.id = ecs.session_id
       WHERE s.id = ? AND es.partner_id = ?`,
      [id, partnerUserId]
    )
    if (ownershipCheck.length === 0) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 })
    }

    const body = await request.json()
    const { name, code, teacher_id, sort_order } = body

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 })
    }

    await executeQuery(
      `UPDATE erp_subjects
       SET name = ?, code = ?, teacher_id = ?, sort_order = ?, updated_at = NOW()
       WHERE id = ?`,
      [name, code || null, teacher_id || null, sort_order ?? 0, id]
    )

    return NextResponse.json({ message: "Subject updated successfully" })
  } catch (error: any) {
    console.error("Subjects PUT error:", error)
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "A subject with this name already exists in this class section" },
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

    // Verify subject belongs to this partner
    const ownershipCheck = await executeQuery<{ id: number }[]>(
      `SELECT s.id FROM erp_subjects s
       JOIN erp_class_sections ecs ON ecs.id = s.class_section_id
       JOIN erp_sessions es ON es.id = ecs.session_id
       WHERE s.id = ? AND es.partner_id = ?`,
      [id, partnerUserId]
    )
    if (ownershipCheck.length === 0) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 })
    }

    await executeQuery("DELETE FROM erp_subjects WHERE id = ?", [id])

    return NextResponse.json({ message: "Subject deleted successfully" })
  } catch (error) {
    console.error("Subjects DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
