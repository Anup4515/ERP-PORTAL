import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { executeQuery } from "@/app/lib/db"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    // Verify calendar day belongs to this partner's session
    const dayRows = await executeQuery<{ id: number }[]>(
      `SELECT cd.id FROM erp_calendar_days cd
       JOIN erp_sessions es ON es.id = cd.session_id
       WHERE cd.id = ? AND es.partner_id = ?`,
      [id, partnerUserId]
    )
    if (dayRows.length === 0) {
      return NextResponse.json({ error: "Calendar day not found" }, { status: 404 })
    }

    const body = await request.json()
    const { is_holiday, holiday_reason } = body

    await executeQuery(
      `UPDATE erp_calendar_days
       SET is_holiday = ?, holiday_reason = ?, updated_at = NOW()
       WHERE id = ?`,
      [is_holiday ? 1 : 0, holiday_reason || null, Number(id)]
    )

    return NextResponse.json({ message: "Calendar day updated" })
  } catch (error) {
    console.error("Calendar day PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
