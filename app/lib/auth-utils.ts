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
