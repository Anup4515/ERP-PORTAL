import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { executeQuery } from "@/app/lib/db"

export interface AuthContext {
  userId: number
  schoolId: number
  partnerUserId: number
  role: string
}

/**
 * Authenticate the request and resolve the partner's user_id.
 * Returns AuthContext on success, or a NextResponse error to return immediately.
 *
 * @param allowedRoles - Roles allowed to access this route. Defaults to ["school_admin"].
 */
export async function getAuthContext(
  allowedRoles: string[] = ["school_admin"]
): Promise<AuthContext | NextResponse> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const schoolId = session.user.school_id
  if (!schoolId) {
    return NextResponse.json({ error: "No partner profile" }, { status: 400 })
  }

  const partnerRows = await executeQuery<{ user_id: number }[]>(
    "SELECT user_id FROM partners WHERE id = ?",
    [schoolId]
  )
  if (partnerRows.length === 0) {
    return NextResponse.json({ error: "Partner not found" }, { status: 404 })
  }

  return {
    userId: session.user.user_id,
    schoolId,
    partnerUserId: partnerRows[0].user_id,
    role: session.user.role,
  }
}

/** Type guard: checks if getAuthContext returned an error response */
export function isAuthError(result: AuthContext | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}

// ─── Session resolution helpers ──────────────────────────────────────────────

export interface ResolvedSession {
  sessionId: number | null
  isCurrent: boolean
}

/**
 * Resolve which session to query data for.
 *
 * - If `?session_id=X` is in the URL, verifies it belongs to the partner and returns it.
 * - If absent, defaults to the partner's current session (`is_current = 1`).
 *
 * Returns a ResolvedSession on success, or a NextResponse error.
 */
export async function resolveSessionId(
  request: Request,
  partnerUserId: number
): Promise<ResolvedSession | NextResponse> {
  const { searchParams } = new URL(request.url)
  const sessionIdParam = searchParams.get("session_id")

  if (sessionIdParam) {
    const rows = await executeQuery<{ id: number; is_current: number }[]>(
      "SELECT id, is_current FROM erp_sessions WHERE id = ? AND partner_id = ?",
      [sessionIdParam, partnerUserId]
    )
    if (rows.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }
    return { sessionId: rows[0].id, isCurrent: rows[0].is_current === 1 }
  }

  // Default: current session
  const rows = await executeQuery<{ id: number }[]>(
    "SELECT id FROM erp_sessions WHERE partner_id = ? AND is_current = 1 LIMIT 1",
    [partnerUserId]
  )
  if (rows.length === 0) {
    // No session exists yet (new school) — return null so routes can handle gracefully
    return { sessionId: null, isCurrent: false }
  }
  return { sessionId: rows[0].id, isCurrent: true }
}

/** Type guard for resolveSessionId */
export function isSessionError(result: ResolvedSession | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}

/**
 * Guard for write operations: rejects modifications to non-current sessions.
 * Returns a 403 NextResponse if the session is not current, or null if OK to proceed.
 */
export async function ensureCurrentSession(
  sessionId: number,
  partnerUserId: number
): Promise<NextResponse | null> {
  const rows = await executeQuery<{ is_current: number }[]>(
    "SELECT is_current FROM erp_sessions WHERE id = ? AND partner_id = ?",
    [sessionId, partnerUserId]
  )
  if (rows.length === 0) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }
  if (rows[0].is_current !== 1) {
    return NextResponse.json(
      { error: "Cannot modify data for a past session" },
      { status: 403 }
    )
  }
  return null
}
