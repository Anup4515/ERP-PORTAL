import { NextResponse } from "next/server"
import {
  getAuthContext,
  isAuthError,
  resolveSessionId,
  isSessionError,
  ensureCurrentSession,
} from "@/app/lib/auth-utils"
import { executeQuery, executeTransaction } from "@/app/lib/db"
import { recordFeePaymentSchema, parseOrError } from "@/app/lib/validations"

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const sess = await resolveSessionId(request, ctx.partnerUserId)
    if (isSessionError(sess)) return sess
    if (sess.sessionId === null) {
      return NextResponse.json({ data: { payments: [], total: 0, page: 1, limit: 50 } })
    }

    const { searchParams } = new URL(request.url)
    const dueId = searchParams.get("due_id")
    const studentId = searchParams.get("student_id")
    const fromDate = searchParams.get("from_date")
    const toDate = searchParams.get("to_date")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)))
    const offset = (page - 1) * limit

    const where: string[] = ["p.partner_id = ?", "fs.session_id = ?"]
    const params: (string | number)[] = [ctx.partnerUserId, sess.sessionId]

    if (dueId) {
      where.push("p.due_id = ?")
      params.push(dueId)
    }
    if (studentId) {
      where.push("s.id = ?")
      params.push(studentId)
    }
    if (fromDate) {
      where.push("p.paid_date >= ?")
      params.push(fromDate)
    }
    if (toDate) {
      where.push("p.paid_date <= ?")
      params.push(toDate)
    }

    const whereSql = `WHERE ${where.join(" AND ")}`

    const baseFrom = `
      FROM erp_fee_payments p
      JOIN erp_fee_dues d              ON d.id   = p.due_id
      JOIN erp_fee_structures fs       ON fs.id  = d.structure_id
      JOIN erp_student_enrollments se  ON se.id  = d.student_enrollment_id
      JOIN students s                  ON s.id   = se.student_id
      JOIN erp_class_sections ecs      ON ecs.id = se.class_section_id
      JOIN classes c                   ON c.id   = ecs.class_id
      JOIN sections sec                ON sec.id = ecs.section_id
    `

    const countResult = await executeQuery<{ total: number }[]>(
      `SELECT COUNT(*) AS total ${baseFrom} ${whereSql}`,
      params
    )
    const total = countResult[0]?.total ?? 0

    const payments = await executeQuery(
      `SELECT
         p.id, p.due_id, p.amount, p.paid_date, p.payment_mode,
         p.reference_no, p.remarks, p.created_at,
         fs.name      AS fee_name,
         s.first_name AS student_first_name,
         s.last_name  AS student_last_name,
         c.name       AS class_name,
         sec.name     AS section_name
       ${baseFrom}
       ${whereSql}
       ORDER BY p.paid_date DESC, p.id DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    )

    return NextResponse.json({ data: { payments, total, page, limit } })
  } catch (error) {
    console.error("Fee payments GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const body = await request.json().catch(() => null)
    const parsed = parseOrError(recordFeePaymentSchema, body)
    if (!parsed.success) return parsed.response
    const { due_id, amount, paid_date, payment_mode, reference_no, remarks } = parsed.data

    // Ownership check + grab the parent's session for the write-guard.
    const dueRows = await executeQuery<{
      id: number
      session_id: number
      amount_due: string
      amount_paid: string
      status: string
    }[]>(
      `SELECT d.id, fs.session_id, d.amount_due, d.amount_paid, d.status
         FROM erp_fee_dues d
         JOIN erp_fee_structures fs ON fs.id = d.structure_id
        WHERE d.id = ? AND d.partner_id = ?`,
      [due_id, ctx.partnerUserId]
    )
    const due = dueRows[0]
    if (!due) {
      return NextResponse.json({ error: "Fee due not found" }, { status: 404 })
    }

    const guard = await ensureCurrentSession(due.session_id, ctx.partnerUserId)
    if (guard) return guard

    if (due.status === "waived") {
      return NextResponse.json(
        { error: "Cannot record a payment against a waived due" },
        { status: 409 }
      )
    }

    let paymentId = 0
    await executeTransaction(async (connection) => {
      const [insertResult] = await connection.execute(
        `INSERT INTO erp_fee_payments
           (partner_id, due_id, amount, paid_date, payment_mode, reference_no, remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          ctx.partnerUserId,
          due_id,
          amount,
          paid_date,
          payment_mode || null,
          reference_no || null,
          remarks || null,
        ]
      )
      paymentId = (insertResult as { insertId: number }).insertId

      // Recompute amount_paid + status from the source of truth (the
      // payments table) rather than incrementing the cached column. This
      // keeps the cache correct even after partial-payment corrections.
      await connection.execute(
        `UPDATE erp_fee_dues d
            SET d.amount_paid = (
              SELECT COALESCE(SUM(p.amount), 0)
                FROM erp_fee_payments p
               WHERE p.due_id = d.id
            ),
            d.status = CASE
              WHEN d.status = 'waived' THEN 'waived'
              WHEN (
                SELECT COALESCE(SUM(p.amount), 0)
                  FROM erp_fee_payments p
                 WHERE p.due_id = d.id
              ) <= 0 THEN 'pending'
              WHEN (
                SELECT COALESCE(SUM(p.amount), 0)
                  FROM erp_fee_payments p
                 WHERE p.due_id = d.id
              ) >= d.amount_due THEN 'paid'
              ELSE 'partial'
            END
          WHERE d.id = ?`,
        [due_id]
      )
    })

    return NextResponse.json(
      { data: { id: paymentId }, message: "Payment recorded" },
      { status: 201 }
    )
  } catch (error) {
    console.error("Fee payments POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
