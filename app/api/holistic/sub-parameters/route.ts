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
    const parameterId = searchParams.get("parameter_id")

    if (!parameterId) {
      return NextResponse.json(
        { error: "parameter_id query parameter is required" },
        { status: 400 }
      )
    }

    // Verify the parameter belongs to this partner
    const paramRows = await executeQuery<{ id: number }[]>(
      "SELECT id FROM erp_holistic_parameters WHERE id = ? AND partner_id = ?",
      [Number(parameterId), partnerUserId]
    )
    if (paramRows.length === 0) {
      return NextResponse.json({ error: "Parameter not found" }, { status: 404 })
    }

    const subParameters = await executeQuery(
      "SELECT * FROM erp_holistic_sub_parameters WHERE parameter_id = ? ORDER BY sort_order, name",
      [Number(parameterId)]
    )

    return NextResponse.json({ data: subParameters })
  } catch (error) {
    console.error("Holistic sub-parameters GET error:", error)
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
    const { parameter_id, name, sort_order } = body

    if (!parameter_id || !name) {
      return NextResponse.json(
        { error: "parameter_id and name are required" },
        { status: 400 }
      )
    }

    // Verify the parameter belongs to this partner
    const paramRows = await executeQuery<{ id: number }[]>(
      "SELECT id FROM erp_holistic_parameters WHERE id = ? AND partner_id = ?",
      [parameter_id, partnerUserId]
    )
    if (paramRows.length === 0) {
      return NextResponse.json({ error: "Parameter not found" }, { status: 404 })
    }

    const result = await executeQuery<{ insertId: number }>(
      `INSERT INTO erp_holistic_sub_parameters (parameter_id, name, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())`,
      [parameter_id, name, sort_order ?? 0]
    )

    return NextResponse.json(
      { data: { id: (result as any).insertId }, message: "Sub-parameter created successfully" },
      { status: 201 }
    )
  } catch (error) {
    console.error("Holistic sub-parameters POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
