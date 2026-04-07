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

    const result = await executeQuery<{ affectedRows: number }>(
      `UPDATE erp_sessions SET name = ?, start_date = ?, end_date = ?, updated_at = NOW()
       WHERE id = ? AND partner_id = ?`,
      [name, start_date, end_date, id, ctx.partnerUserId]
    )

    if ((result as any).affectedRows === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Session updated successfully" })
  } catch (error: any) {
    console.error("Session PUT error:", error)
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "A session with this name already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
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

    // Check for linked class sections
    const linkedRows = await executeQuery<{ cnt: number }[]>(
      "SELECT COUNT(*) as cnt FROM erp_class_sections WHERE session_id = ?",
      [id]
    )
    if (linkedRows[0].cnt > 0) {
      return NextResponse.json(
        { error: "Cannot delete session with linked class sections" },
        { status: 409 }
      )
    }

    await executeQuery(
      "DELETE FROM erp_sessions WHERE id = ? AND partner_id = ?",
      [id, ctx.partnerUserId]
    )

    return NextResponse.json({ message: "Session deleted successfully" })
  } catch (error) {
    console.error("Session DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
