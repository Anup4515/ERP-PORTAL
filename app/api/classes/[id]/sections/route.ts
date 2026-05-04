import { NextResponse } from "next/server"
import { getAuthContext, isAuthError, resolveSessionId, isSessionError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

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
      [classId, ctx.partnerUserId]
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
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

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
      [classId, ctx.partnerUserId]
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
    const sectionResult = await executeQuery<{ id: number }[]>(
      `INSERT INTO sections (class_id, name, room_no, status, created_at, updated_at)
       VALUES (?, ?, ?, 'active', NOW(), NOW())
       RETURNING id`,
      [classId, name.trim(), room_no || null]
    )

    const sectionId = sectionResult[0].id

    // Link to current session via erp_class_sections
    const sess = await resolveSessionId(request, ctx.partnerUserId)
    if (isSessionError(sess)) return sess

    let classSectionId = null

    {
      const currentSessionId = sess.sessionId

      const linkResult = await executeQuery<{ id: number }[]>(
        `INSERT INTO erp_class_sections (session_id, class_id, section_id, created_at, updated_at)
         VALUES (?, ?, ?, NOW(), NOW())
         RETURNING id`,
        [currentSessionId, classId, sectionId]
      )

      classSectionId = linkResult[0].id
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
