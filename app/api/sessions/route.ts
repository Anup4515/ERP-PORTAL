import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery, executeTransaction } from "@/app/lib/db"

export async function GET() {
  try {
    // Both school_admin and teacher can read sessions
    const ctx = await getAuthContext(["school_admin", "teacher"])
    if (isAuthError(ctx)) return ctx

    const sessions = await executeQuery(
      `SELECT id, partner_id, name,
              to_char(start_date, 'YYYY-MM-DD') AS start_date,
              to_char(end_date, 'YYYY-MM-DD') AS end_date,
              is_current, created_at, updated_at
         FROM erp_sessions
        WHERE partner_id = ?
        ORDER BY start_date DESC`,
      [ctx.partnerUserId]
    )

    return NextResponse.json({ data: sessions })
  } catch (error) {
    console.error("Sessions GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

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

    // Raw creation is only allowed when this partner has zero sessions.
    // Subsequent sessions must be created via Session Transition so student
    // promotion, enrollment carry-over, and is_current flipping happen atomically.
    const existingRows = await executeQuery<{ cnt: number }[]>(
      "SELECT COUNT(*) as cnt FROM erp_sessions WHERE partner_id = ?",
      [ctx.partnerUserId]
    )
    const isFirstSession = (existingRows[0]?.cnt ?? 0) === 0
    if (!isFirstSession) {
      return NextResponse.json(
        {
          error:
            "A session already exists. Use Session Transition to start a new academic year.",
        },
        { status: 409 }
      )
    }

    // First session auto-activates (is_current = TRUE).
    const result = await executeQuery<{ id: number }[]>(
      `INSERT INTO erp_sessions (partner_id, name, start_date, end_date, is_current, created_at, updated_at)
       VALUES (?, ?, ?, ?, TRUE, NOW(), NOW())
       RETURNING id`,
      [ctx.partnerUserId, name, start_date, end_date]
    )

    const newSessionId = result[0].id

    // Auto-generate calendar for the new session (Sundays pre-marked as holidays)
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
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

    await executeTransaction(async (connection) => {
      const batchSize = 50
      for (let i = 0; i < days.length; i += batchSize) {
        const batch = days.slice(i, i + batchSize)
        const placeholders = batch.map(() => "(?, ?, ?, ?, ?, NOW(), NOW())").join(", ")
        const values = batch.flatMap((dd) => [
          newSessionId, dd.date, dd.day_of_week, dd.is_holiday, dd.holiday_reason,
        ])
        await connection.execute(
          `INSERT INTO erp_calendar_days (session_id, date, day_of_week, is_holiday, holiday_reason, created_at, updated_at)
           VALUES ${placeholders}`,
          values
        )
      }
    })

    return NextResponse.json(
      { data: { id: newSessionId }, message: "Session created and calendar generated successfully" },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Sessions POST error:", error)
    if (error?.code === "23505") {
      return NextResponse.json(
        { error: "A session with this name already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
