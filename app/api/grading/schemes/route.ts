import { NextResponse } from "next/server"
import { getAuthContext, isAuthError, resolveSessionId, isSessionError, ensureCurrentSession } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const sess = await resolveSessionId(request, ctx.partnerUserId)
    if (isSessionError(sess)) return sess

    const sessionId = sess.sessionId

    // Get scheme for the resolved session
    const schemes = await executeQuery<Record<string, unknown>[]>(
      "SELECT * FROM erp_grading_schemes WHERE partner_id = ? AND session_id = ? LIMIT 1",
      [ctx.partnerUserId, sessionId]
    )

    return NextResponse.json({ data: schemes.length > 0 ? schemes[0] : null, session_id: sessionId })
  } catch (error) {
    console.error("Grading schemes GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const { searchParams } = new URL(request.url)
    const sessionIdParam = searchParams.get("session_id")
    if (sessionIdParam) {
      const guard = await ensureCurrentSession(Number(sessionIdParam), ctx.partnerUserId)
      if (guard) return guard
    }

    const body = await request.json()
    const { name, type } = body

    if (!name || !type) {
      return NextResponse.json(
        { error: "name and type are required" },
        { status: 400 }
      )
    }

    const validTypes = ["percentage", "cgpa"]
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "type must be one of: percentage, cgpa" },
        { status: 400 }
      )
    }

    // Get the current session
    const sessions = await executeQuery<{ id: number }[]>(
      "SELECT id FROM erp_sessions WHERE partner_id = ? AND is_current = 1 LIMIT 1",
      [ctx.partnerUserId]
    )

    if (sessions.length === 0) {
      return NextResponse.json(
        { error: "No active session found. Please create and set a current session first." },
        { status: 400 }
      )
    }

    const sessionId = sessions[0].id

    // Check if a scheme already exists for this session
    const existing = await executeQuery<{ id: number }[]>(
      "SELECT id FROM erp_grading_schemes WHERE partner_id = ? AND session_id = ?",
      [ctx.partnerUserId, sessionId]
    )

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "A grading scheme already exists for the current session. You cannot change it mid-session." },
        { status: 409 }
      )
    }

    // Unset any previous default and set this as default
    await executeQuery(
      "UPDATE erp_grading_schemes SET is_default = 0 WHERE partner_id = ?",
      [ctx.partnerUserId]
    )

    const result = await executeQuery<{ insertId: number }>(
      `INSERT INTO erp_grading_schemes (partner_id, session_id, name, type, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
      [ctx.partnerUserId, sessionId, name, type]
    )

    return NextResponse.json(
      { data: { id: (result as any).insertId }, message: "Grading scheme created successfully" },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Grading schemes POST error:", error)
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "A grading scheme with this name already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
