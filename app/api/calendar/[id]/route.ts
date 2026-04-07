import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    // Verify calendar day belongs to this partner's session
    const dayRows = await executeQuery<{ id: number }[]>(
      `SELECT cd.id FROM erp_calendar_days cd
       JOIN erp_sessions es ON es.id = cd.session_id
       WHERE cd.id = ? AND es.partner_id = ?`,
      [id, ctx.partnerUserId]
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
