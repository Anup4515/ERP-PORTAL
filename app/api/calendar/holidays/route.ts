import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { executeQuery, executeTransaction } from "@/app/lib/db"

export async function PUT(request: Request) {
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
    const { session_id, dates } = body

    if (!session_id || !Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json(
        { error: "session_id and dates array are required" },
        { status: 400 }
      )
    }

    // Verify session
    const sessCheck = await executeQuery<{ id: number }[]>(
      "SELECT id FROM erp_sessions WHERE id = ? AND partner_id = ?",
      [session_id, partnerUserId]
    )
    if (sessCheck.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    await executeTransaction(async (connection) => {
      for (const d of dates) {
        const { date, is_holiday, holiday_reason } = d
        if (!date) continue

        await connection.execute(
          `UPDATE erp_calendar_days
           SET is_holiday = ?, holiday_reason = ?, updated_at = NOW()
           WHERE session_id = ? AND date = ?`,
          [is_holiday ? 1 : 0, holiday_reason || null, session_id, date]
        )
      }
    })

    return NextResponse.json({ message: "Holidays updated successfully" })
  } catch (error) {
    console.error("Calendar holidays PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
