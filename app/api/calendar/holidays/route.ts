import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery, executeTransaction } from "@/app/lib/db"

export async function PUT(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

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
      [session_id, ctx.partnerUserId]
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
