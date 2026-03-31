import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { executeQuery } from "@/app/lib/db"

export async function GET(request: Request) {
  try {
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

    const { searchParams } = new URL(request.url)
    const classSectionId = searchParams.get("class_section_id")

    if (!classSectionId) {
      return NextResponse.json(
        { error: "class_section_id query parameter is required" },
        { status: 400 }
      )
    }

    // Verify class_section belongs to this partner
    const ownershipCheck = await executeQuery<{ id: number }[]>(
      `SELECT ecs.id FROM erp_class_sections ecs
       JOIN erp_sessions es ON es.id = ecs.session_id
       WHERE ecs.id = ? AND es.partner_id = ?`,
      [classSectionId, partnerUserId]
    )
    if (ownershipCheck.length === 0) {
      return NextResponse.json({ error: "Class section not found" }, { status: 404 })
    }

    const subjects = await executeQuery(
      `SELECT s.*, u.name as teacher_name
       FROM erp_subjects s
       LEFT JOIN users u ON u.id = s.teacher_id
       WHERE s.class_section_id = ?
       ORDER BY s.sort_order, s.name`,
      [classSectionId]
    )

    return NextResponse.json({ data: subjects })
  } catch (error) {
    console.error("Subjects GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
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

    const body = await request.json()
    const { class_section_id, name, code, teacher_id, sort_order } = body

    if (!class_section_id || !name) {
      return NextResponse.json(
        { error: "class_section_id and name are required" },
        { status: 400 }
      )
    }

    // Verify class_section belongs to this partner
    const ownershipCheck = await executeQuery<{ id: number }[]>(
      `SELECT ecs.id FROM erp_class_sections ecs
       JOIN erp_sessions es ON es.id = ecs.session_id
       WHERE ecs.id = ? AND es.partner_id = ?`,
      [class_section_id, partnerUserId]
    )
    if (ownershipCheck.length === 0) {
      return NextResponse.json({ error: "Class section not found" }, { status: 404 })
    }

    const result = await executeQuery<{ insertId: number }>(
      `INSERT INTO erp_subjects (class_section_id, name, code, teacher_id, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [class_section_id, name, code || null, teacher_id || null, sort_order ?? 0]
    )

    return NextResponse.json(
      { data: { id: (result as any).insertId }, message: "Subject created successfully" },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Subjects POST error:", error)
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "A subject with this name already exists in this class section" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
