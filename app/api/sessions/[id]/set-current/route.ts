import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { executeQuery } from "@/app/lib/db"

export async function POST(
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

    // Verify session belongs to this partner
    const sessionRows = await executeQuery<{ id: number }[]>(
      "SELECT id FROM erp_sessions WHERE id = ? AND partner_id = ?",
      [id, partnerUserId]
    )
    if (sessionRows.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Unset all other sessions for this partner
    await executeQuery(
      "UPDATE erp_sessions SET is_current = 0 WHERE partner_id = ?",
      [partnerUserId]
    )

    // Set this session as current
    await executeQuery(
      "UPDATE erp_sessions SET is_current = 1 WHERE id = ? AND partner_id = ?",
      [id, partnerUserId]
    )

    return NextResponse.json({ message: "Session set as current successfully" })
  } catch (error) {
    console.error("Set current session error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
