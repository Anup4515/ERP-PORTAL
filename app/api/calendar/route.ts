import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin", "teacher"])
    if (isAuthError(ctx)) return ctx

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("session_id")
    const month = searchParams.get("month") // YYYY-MM

    if (!sessionId || !month) {
      return NextResponse.json(
        { error: "session_id and month (YYYY-MM) are required" },
        { status: 400 }
      )
    }

    // Verify session belongs to this partner
    const sessCheck = await executeQuery<{ id: number }[]>(
      "SELECT id FROM erp_sessions WHERE id = ? AND partner_id = ?",
      [sessionId, ctx.partnerUserId]
    )
    if (sessCheck.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const [yr, mon] = month.split("-").map(Number)
    const lastDay = new Date(yr, mon, 0).getDate()
    const startDate = `${month}-01`
    const endDate = `${month}-${String(lastDay).padStart(2, "0")}`

    const days = await executeQuery(
      `SELECT id, date, day_of_week, is_holiday, is_working_saturday, holiday_reason
       FROM erp_calendar_days
       WHERE session_id = ? AND date BETWEEN ? AND ?
       ORDER BY date ASC`,
      [sessionId, startDate, endDate]
    )

    return NextResponse.json({ data: days })
  } catch (error) {
    console.error("Calendar GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
