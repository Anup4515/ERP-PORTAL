import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { executeQuery } from "@/app/lib/db"

export async function GET() {
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

    const schemes = await executeQuery(
      "SELECT * FROM erp_grading_schemes WHERE partner_id = ? ORDER BY is_default DESC, name",
      [partnerUserId]
    )

    return NextResponse.json({ data: schemes })
  } catch (error) {
    console.error("Grading schemes GET error:", error)
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
        [partnerUserId]
      )
    }

    const result = await executeQuery<{ insertId: number }>(
      `INSERT INTO erp_grading_schemes (partner_id, session_id, name, type, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [partnerUserId, session_id || null, name, type, is_default ? 1 : 0]
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
