import { NextResponse } from "next/server"
import {
  getAuthContext,
  isAuthError,
  resolveSessionId,
  isSessionError,
  ensureCurrentSession,
} from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"
import { createFeeStructureSchema, parseOrError } from "@/app/lib/validations"

// "YYYY-MM" or "YYYY-MM-DD" → "YYYY-MM-01" (DB column is DATE).
function toFirstOfMonth(input: string | null | undefined): string | null {
  if (!input) return null
  const m = input.match(/^(\d{4})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}-01` : null
}

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const sess = await resolveSessionId(request, ctx.partnerUserId)
    if (isSessionError(sess)) return sess

    if (sess.sessionId === null) {
      return NextResponse.json({ data: [] })
    }

    const rows = await executeQuery(
      `SELECT fs.id, fs.name, fs.fee_type, fs.amount, fs.due_date,
              fs.recurrence, fs.start_month, fs.end_month, fs.due_day_of_month,
              fs.class_section_id, fs.created_at, fs.updated_at,
              c.name  AS class_name,
              sec.name AS section_name,
              (SELECT COUNT(*) FROM erp_fee_dues d WHERE d.structure_id = fs.id) AS assigned_count
         FROM erp_fee_structures fs
         LEFT JOIN erp_class_sections ecs ON ecs.id  = fs.class_section_id
         LEFT JOIN classes  c   ON c.id   = ecs.class_id
         LEFT JOIN sections sec ON sec.id = ecs.section_id
        WHERE fs.partner_id = ? AND fs.session_id = ?
        ORDER BY fs.due_date IS NULL, fs.due_date ASC, fs.created_at DESC`,
      [ctx.partnerUserId, sess.sessionId]
    )

    return NextResponse.json({ data: rows })
  } catch (error) {
    console.error("Fee structures GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const sess = await resolveSessionId(request, ctx.partnerUserId)
    if (isSessionError(sess)) return sess
    if (sess.sessionId === null) {
      return NextResponse.json({ error: "No active session" }, { status: 400 })
    }

    const guard = await ensureCurrentSession(sess.sessionId, ctx.partnerUserId)
    if (guard) return guard

    const body = await request.json().catch(() => null)
    const parsed = parseOrError(createFeeStructureSchema, body)
    if (!parsed.success) return parsed.response
    const {
      class_section_id,
      name,
      fee_type,
      amount,
      recurrence,
      due_date,
      start_month,
      end_month,
      due_day_of_month,
    } = parsed.data

    if (class_section_id) {
      const csCheck = await executeQuery<{ id: number }[]>(
        `SELECT ecs.id FROM erp_class_sections ecs
          JOIN erp_sessions es ON es.id = ecs.session_id
          WHERE ecs.id = ? AND es.id = ? AND es.partner_id = ?`,
        [class_section_id, sess.sessionId, ctx.partnerUserId]
      )
      if (csCheck.length === 0) {
        return NextResponse.json({ error: "Class section not found in session" }, { status: 404 })
      }
    }

    // For one-time fees: keep existing due_date column.
    // For monthly fees: clear due_date; the per-month due dates are computed
    // at assign time from start_month + due_day_of_month.
    const persistDueDate = recurrence === "monthly" ? null : (due_date || null)
    const persistStartMonth = recurrence === "monthly" ? toFirstOfMonth(start_month as string) : null
    const persistEndMonth = recurrence === "monthly" ? toFirstOfMonth(end_month as string) : null
    const persistDay = recurrence === "monthly" ? (due_day_of_month ?? null) : null

    const result = await executeQuery<{ insertId: number }>(
      `INSERT INTO erp_fee_structures
         (partner_id, session_id, class_section_id, name, fee_type, amount,
          recurrence, due_date, start_month, end_month, due_day_of_month)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ctx.partnerUserId,
        sess.sessionId,
        class_section_id ?? null,
        name,
        fee_type,
        amount,
        recurrence,
        persistDueDate,
        persistStartMonth,
        persistEndMonth,
        persistDay,
      ]
    )

    return NextResponse.json(
      { data: { id: (result as { insertId: number }).insertId }, message: "Fee structure created" },
      { status: 201 }
    )
  } catch (error) {
    console.error("Fee structures POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
