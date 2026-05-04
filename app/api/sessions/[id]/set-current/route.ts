import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    // Verify session belongs to this partner
    const sessionRows = await executeQuery<{ id: number }[]>(
      "SELECT id FROM erp_sessions WHERE id = ? AND partner_id = ?",
      [id, ctx.partnerUserId]
    )
    if (sessionRows.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Unset all other sessions for this partner
    await executeQuery(
      "UPDATE erp_sessions SET is_current = FALSE WHERE partner_id = ?",
      [ctx.partnerUserId]
    )

    // Set this session as current
    await executeQuery(
      "UPDATE erp_sessions SET is_current = TRUE WHERE id = ? AND partner_id = ?",
      [id, ctx.partnerUserId]
    )

    return NextResponse.json({ message: "Session set as current successfully" })
  } catch (error) {
    console.error("Set current session error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
