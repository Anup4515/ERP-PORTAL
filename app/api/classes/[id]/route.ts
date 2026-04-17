import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

async function verifyClassOwnership(classId: number, partnerUserId: number) {
  const rows = await executeQuery<{ id: number }[]>(
    "SELECT id FROM classes WHERE id = ? AND partner_id = ?",
    [classId, partnerUserId]
  )
  return rows.length > 0
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const { id } = await params
    const classId = parseInt(id, 10)
    if (isNaN(classId)) {
      return NextResponse.json({ error: "Invalid class ID" }, { status: 400 })
    }

    if (!(await verifyClassOwnership(classId, ctx.partnerUserId))) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 })
    }

    const body = await request.json()
    const { name, code, grade_level } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Class name is required" },
        { status: 400 }
      )
    }

    await executeQuery(
      `UPDATE classes
         SET name = ?, code = ?, grade_level = ?, updated_at = NOW()
       WHERE id = ?`,
      [name.trim(), code || null, grade_level ?? null, classId]
    )

    return NextResponse.json({ message: "Class updated successfully" })
  } catch (error) {
    console.error("Update class error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

