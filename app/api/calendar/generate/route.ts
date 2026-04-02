import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { executeQuery, executeTransaction } from "@/app/lib/db"

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
    const { session_id } = body

    if (!session_id) {
      return NextResponse.json({ error: "session_id is required" }, { status: 400 })
    }

    // Get session date range
    const sessRows = await executeQuery<{ id: number; start_date: string; end_date: string }[]>(
      "SELECT id, start_date, end_date FROM erp_sessions WHERE id = ? AND partner_id = ?",
      [session_id, partnerUserId]
    )
    if (sessRows.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const { start_date, end_date } = sessRows[0]

    // Check if calendar already exists for this session
    const existing = await executeQuery<{ count: number }[]>(
      "SELECT COUNT(*) as count FROM erp_calendar_days WHERE session_id = ?",
      [session_id]
    )
    if (existing[0].count > 0) {
      return NextResponse.json(
        { error: "Calendar already generated for this session." },
        { status: 409 }
      )
    }

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

    // Generate days
    const startDt = new Date(start_date)
    const endDt = new Date(end_date)
    const days: { date: string; day_of_week: string; is_holiday: number; holiday_reason: string | null }[] = []

    for (let d = new Date(startDt); d <= endDt; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = dayNames[d.getDay()]
      const isSunday = d.getDay() === 0

      const yr = d.getFullYear()
      const mo = String(d.getMonth() + 1).padStart(2, "0")
      const da = String(d.getDate()).padStart(2, "0")

      days.push({
        date: `${yr}-${mo}-${da}`,
        day_of_week: dayOfWeek,
        is_holiday: isSunday ? 1 : 0,
        holiday_reason: isSunday ? "Sunday" : null,
      })
    }

    // Bulk insert
    await executeTransaction(async (connection) => {
      const batchSize = 50
      for (let i = 0; i < days.length; i += batchSize) {
        const batch = days.slice(i, i + batchSize)
        const placeholders = batch.map(() => "(?, ?, ?, ?, ?, NOW(), NOW())").join(", ")
        const values = batch.flatMap((d) => [
          session_id,
          d.date,
          d.day_of_week,
          d.is_holiday,
          d.holiday_reason,
        ])

        await connection.execute(
          `INSERT INTO erp_calendar_days (session_id, date, day_of_week, is_holiday, holiday_reason, created_at, updated_at)
           VALUES ${placeholders}`,
          values
        )
      }
    })

    return NextResponse.json({
      message: `Calendar generated: ${days.length} days created`,
      data: { total_days: days.length, holidays: days.filter((d) => d.is_holiday).length },
    }, { status: 201 })
  } catch (error) {
    console.error("Calendar generate error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
