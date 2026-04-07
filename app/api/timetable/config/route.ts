import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery, executeTransaction } from "@/app/lib/db"

export async function GET() {
  try {
    const ctx = await getAuthContext(["school_admin", "teacher"])
    if (isAuthError(ctx)) return ctx

    const config = await executeQuery(
      "SELECT * FROM erp_timetable_config WHERE partner_id = ? ORDER BY period_number",
      [ctx.partnerUserId]
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
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

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
        [ctx.partnerUserId]
      )

      // Insert new
      for (const p of periods) {
        if (!p.period_number || !p.start_time || !p.end_time || !p.label) continue
        await connection.execute(
          `INSERT INTO erp_timetable_config (partner_id, period_number, start_time, end_time, slot_type, label, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [ctx.partnerUserId, p.period_number, p.start_time, p.end_time, p.slot_type || "class", p.label]
        )
      }
    })

    return NextResponse.json({ message: "Period structure saved" })
  } catch (error) {
    console.error("Timetable config PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
