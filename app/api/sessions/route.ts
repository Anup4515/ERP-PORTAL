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

    const sessions = await executeQuery(
      "SELECT * FROM erp_sessions WHERE partner_id = ? ORDER BY start_date DESC",
      [partnerUserId]
    )

    return NextResponse.json({ data: sessions })
  } catch (error) {
    console.error("Sessions GET error:", error)
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
    const { name, start_date, end_date } = body

    if (!name || !start_date || !end_date) {
      return NextResponse.json(
        { error: "name, start_date, and end_date are required" },
        { status: 400 }
      )
    }

    if (new Date(end_date) <= new Date(start_date)) {
      return NextResponse.json(
        { error: "end_date must be after start_date" },
        { status: 400 }
      )
    }

    const result = await executeQuery<{ insertId: number }>(
      `INSERT INTO erp_sessions (partner_id, name, start_date, end_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [partnerUserId, name, start_date, end_date]
    )

    return NextResponse.json(
      { data: { id: (result as any).insertId }, message: "Session created successfully" },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Sessions POST error:", error)
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "A session with this name already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
