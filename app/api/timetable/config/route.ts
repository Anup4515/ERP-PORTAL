import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { executeQuery, executeTransaction } from "@/app/lib/db"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const school_id = session.user.school_id
    if (!school_id) return NextResponse.json({ error: "No partner profile" }, { status: 400 })

    const partnerRows = await executeQuery<{ user_id: number }[]>(
      "SELECT user_id FROM partners WHERE id = ?", [school_id]
    )
    if (partnerRows.length === 0) return NextResponse.json({ error: "Partner not found" }, { status: 404 })

    const config = await executeQuery(
      "SELECT * FROM erp_timetable_config WHERE partner_id = ? ORDER BY period_number",
      [partnerRows[0].user_id]
    )

    return NextResponse.json({ data: config })
  } catch (error) {
    console.error("Timetable config GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Bulk save — replaces all periods
export async function PUT(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "school_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const school_id = session.user.school_id
    if (!school_id) return NextResponse.json({ error: "No partner profile" }, { status: 400 })

    const partnerRows = await executeQuery<{ user_id: number }[]>(
      "SELECT user_id FROM partners WHERE id = ?", [school_id]
    )
    if (partnerRows.length === 0) return NextResponse.json({ error: "Partner not found" }, { status: 404 })
    const partnerUserId = partnerRows[0].user_id

    const body = await request.json()
    const { periods } = body
    // periods: Array of { period_number, start_time, end_time, slot_type, label }

    if (!Array.isArray(periods) || periods.length === 0) {
      return NextResponse.json({ error: "periods array is required" }, { status: 400 })
    }

    await executeTransaction(async (connection) => {
      // Delete existing config
      await connection.execute(
        "DELETE FROM erp_timetable_config WHERE partner_id = ?",
        [partnerUserId]
      )

      // Insert new
      for (const p of periods) {
        if (!p.period_number || !p.start_time || !p.end_time || !p.label) continue
        await connection.execute(
          `INSERT INTO erp_timetable_config (partner_id, period_number, start_time, end_time, slot_type, label, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [partnerUserId, p.period_number, p.start_time, p.end_time, p.slot_type || "class", p.label]
        )
      }
    })

    return NextResponse.json({ message: "Period structure saved" })
  } catch (error) {
    console.error("Timetable config PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
