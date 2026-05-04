import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"
import { createSupportQuerySchema, parseOrError } from "@/app/lib/validations"

interface SupportQueryRow {
  id: number
  category: "billing" | "technical" | "feature" | "general"
  subject: string
  message: string
  status: "open" | "in_progress" | "resolved"
  resolution_note: string | null
  ts_created: number
  ts_resolved: number | null
  resolver_name: string | null
}

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))

    const where: string[] = ["q.partner_id = ?"]
    const params: (string | number)[] = [ctx.partnerUserId]
    if (status && ["open", "in_progress", "resolved"].includes(status)) {
      where.push("q.status = ?")
      params.push(status)
    }

    // UNIX_TIMESTAMP(...) * 1000 dodges the same TIMESTAMP/timezone drift that
    // bit the recent-activity endpoint earlier — relative-time rendering on
    // the client is then trivially correct.
    const rows = await executeQuery<SupportQueryRow[]>(
      `SELECT
         q.id,
         q.category, q.subject, q.message, q.status, q.resolution_note,
         UNIX_TIMESTAMP(q.created_at)  * 1000 AS ts_created,
         UNIX_TIMESTAMP(q.resolved_at) * 1000 AS ts_resolved,
         u.name AS resolver_name
       FROM erp_support_queries q
       LEFT JOIN users u ON u.id = q.resolved_by_user_id
       WHERE ${where.join(" AND ")}
       ORDER BY q.created_at DESC
       LIMIT ${limit}`,
      params
    )

    return NextResponse.json({ data: rows })
  } catch (error) {
    console.error("Support GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const body = await request.json().catch(() => null)
    const parsed = parseOrError(createSupportQuerySchema, body)
    if (!parsed.success) return parsed.response
    const { category, subject, message } = parsed.data

    const result = await executeQuery<{ insertId: number }>(
      `INSERT INTO erp_support_queries
         (partner_id, submitted_by_user_id, category, subject, message)
       VALUES (?, ?, ?, ?, ?)`,
      [ctx.partnerUserId, ctx.userId, category, subject.trim(), message.trim()]
    )

    return NextResponse.json(
      {
        data: { id: (result as { insertId: number }).insertId },
        message: "Query submitted. Our team will get back to you.",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Support POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
