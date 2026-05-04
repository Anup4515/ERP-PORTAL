import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

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
      [classSectionId, ctx.partnerUserId]
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
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const body = await request.json()
    const { class_section_id, class_section_ids, name, code, teacher_id, sort_order } = body

    // Support both single and multiple class_section_ids
    const csIds: number[] = class_section_ids
      ? (class_section_ids as number[])
      : class_section_id
      ? [Number(class_section_id)]
      : []

    if (csIds.length === 0 || !name) {
      return NextResponse.json(
        { error: "class_section_id (or class_section_ids) and name are required" },
        { status: 400 }
      )
    }

    // Verify all class_sections belong to this partner
    const placeholders = csIds.map(() => "?").join(",")
    const ownershipCheck = await executeQuery<{ id: number }[]>(
      `SELECT ecs.id FROM erp_class_sections ecs
       JOIN erp_sessions es ON es.id = ecs.session_id
       WHERE ecs.id IN (${placeholders}) AND es.partner_id = ?`,
      [...csIds, ctx.partnerUserId]
    )
    if (ownershipCheck.length !== csIds.length) {
      return NextResponse.json({ error: "One or more class sections not found" }, { status: 404 })
    }

    const insertedIds: number[] = []
    const skipped: number[] = []

    for (const csId of csIds) {
      try {
        const result = await executeQuery<{ id: number }[]>(
          `INSERT INTO erp_subjects (class_section_id, name, code, teacher_id, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, NOW(), NOW())
           RETURNING id`,
          [csId, name, code || null, teacher_id || null, sort_order ?? 0]
        )
        insertedIds.push(result[0].id)
      } catch (err: any) {
        if (err?.code === "23505") {
          skipped.push(csId)
        } else {
          throw err
        }
      }
    }

    const message = skipped.length > 0
      ? `Subject created in ${insertedIds.length} class section(s). Skipped ${skipped.length} (already exists).`
      : `Subject created in ${insertedIds.length} class section(s).`

    return NextResponse.json(
      { data: { ids: insertedIds, skipped }, message },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Subjects POST error:", error)
    if (error?.code === "23505") {
      return NextResponse.json(
        { error: "A subject with this name already exists in this class section" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
