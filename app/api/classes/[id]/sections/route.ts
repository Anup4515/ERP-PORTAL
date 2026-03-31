import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { executeQuery } from "@/app/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (session.user.role !== "school_admin") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    const school_id = session.user.school_id

    if (!school_id) {
      return NextResponse.json(
        { error: "No partner profile" },
        { status: 400 }
      )
    }

    const partnerRows = await executeQuery<{ user_id: number }[]>(
      "SELECT user_id FROM partners WHERE id = ?",
      [school_id]
    )

    if (partnerRows.length === 0) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      )
    }

    const partnerUserId = partnerRows[0].user_id
    const { id } = await params
    const classId = parseInt(id, 10)

    if (isNaN(classId)) {
      return NextResponse.json(
        { error: "Invalid class ID" },
        { status: 400 }
      )
    }

    // Verify the class belongs to this partner
    const classRows = await executeQuery<{ id: number }[]>(
      "SELECT id FROM classes WHERE id = ? AND partner_id = ?",
      [classId, partnerUserId]
    )

    if (classRows.length === 0) {
      return NextResponse.json(
        { error: "Class not found" },
        { status: 404 }
      )
    }

    const rows = await executeQuery<Record<string, unknown>[]>(
      "SELECT * FROM sections WHERE class_id = ? AND status = 'active'",
      [classId]
    )

    return NextResponse.json({ data: rows })
  } catch (error) {
    console.error("Get sections error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (session.user.role !== "school_admin") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    const school_id = session.user.school_id

    if (!school_id) {
      return NextResponse.json(
        { error: "No partner profile" },
        { status: 400 }
      )
    }

    const partnerRows = await executeQuery<{ user_id: number }[]>(
      "SELECT user_id FROM partners WHERE id = ?",
      [school_id]
    )

    if (partnerRows.length === 0) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      )
    }

    const partnerUserId = partnerRows[0].user_id
    const { id } = await params
    const classId = parseInt(id, 10)

    if (isNaN(classId)) {
      return NextResponse.json(
        { error: "Invalid class ID" },
        { status: 400 }
      )
    }

    // Verify the class belongs to this partner
    const classRows = await executeQuery<{ id: number }[]>(
      "SELECT id FROM classes WHERE id = ? AND partner_id = ?",
      [classId, partnerUserId]
    )

    if (classRows.length === 0) {
      return NextResponse.json(
        { error: "Class not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { name, room_no } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Section name is required" },
        { status: 400 }
      )
    }

    // Insert the section
    const sectionResult = await executeQuery<{ insertId: number }>(
      `INSERT INTO sections (class_id, name, room_no, status, created_at, updated_at)
       VALUES (?, ?, ?, 'active', NOW(), NOW())`,
      [classId, name.trim(), room_no || null]
    )

    const sectionId = sectionResult.insertId

    // Link to current session via erp_class_sections
    const sessionRows = await executeQuery<{ id: number }[]>(
      "SELECT id FROM erp_sessions WHERE partner_id = ? AND is_current = 1 LIMIT 1",
      [partnerUserId]
    )

    let classSectionId = null

    if (sessionRows.length > 0) {
      const currentSessionId = sessionRows[0].id

      const linkResult = await executeQuery<{ insertId: number }>(
        `INSERT INTO erp_class_sections (session_id, class_id, section_id, created_at, updated_at)
         VALUES (?, ?, ?, NOW(), NOW())`,
        [currentSessionId, classId, sectionId]
      )

      classSectionId = linkResult.insertId
    }

    return NextResponse.json(
      {
        data: {
          id: sectionId,
          class_id: classId,
          name: name.trim(),
          room_no: room_no || null,
          class_section_id: classSectionId,
        },
        message: "Section created successfully",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Create section error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
