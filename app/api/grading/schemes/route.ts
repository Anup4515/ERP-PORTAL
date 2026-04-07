import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

export async function GET() {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const schemes = await executeQuery(
      "SELECT * FROM erp_grading_schemes WHERE partner_id = ? ORDER BY is_default DESC, name",
      [ctx.partnerUserId]
    )

    return NextResponse.json({ data: schemes })
  } catch (error) {
    console.error("Grading schemes GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const body = await request.json()
    const { name, type, session_id, is_default } = body

    if (!name || !type) {
      return NextResponse.json(
        { error: "name and type are required" },
        { status: 400 }
      )
    }

    const validTypes = ["letter", "gpa", "percentage", "cgpa"]
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "type must be one of: letter, gpa, percentage, cgpa" },
        { status: 400 }
      )
    }

    // If setting as default, unset other defaults for this partner first
    if (is_default) {
      await executeQuery(
        "UPDATE erp_grading_schemes SET is_default = 0 WHERE partner_id = ?",
        [ctx.partnerUserId]
      )
    }

    const result = await executeQuery<{ insertId: number }>(
      `INSERT INTO erp_grading_schemes (partner_id, session_id, name, type, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [ctx.partnerUserId, session_id || null, name, type, is_default ? 1 : 0]
    )

    return NextResponse.json(
      { data: { id: (result as any).insertId }, message: "Grading scheme created successfully" },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Grading schemes POST error:", error)
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "A grading scheme with this name already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
