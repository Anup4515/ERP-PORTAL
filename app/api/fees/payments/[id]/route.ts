import { NextResponse } from "next/server"
import {
  getAuthContext,
  isAuthError,
  ensureCurrentSession,
} from "@/app/lib/auth-utils"
import { executeQuery, executeTransaction } from "@/app/lib/db"

interface PaymentRow {
  id: number
  due_id: number
  session_id: number
}

async function loadPayment(id: string, partnerUserId: number): Promise<PaymentRow | null> {
  const rows = await executeQuery<PaymentRow[]>(
    `SELECT p.id, p.due_id, fs.session_id
       FROM erp_fee_payments p
       JOIN erp_fee_dues d         ON d.id  = p.due_id
       JOIN erp_fee_structures fs  ON fs.id = d.structure_id
      WHERE p.id = ? AND p.partner_id = ?`,
    [id, partnerUserId]
  )
  return rows[0] ?? null
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const payment = await loadPayment(id, ctx.partnerUserId)
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    const guard = await ensureCurrentSession(payment.session_id, ctx.partnerUserId)
    if (guard) return guard

    await executeTransaction(async (connection) => {
      await connection.execute("DELETE FROM erp_fee_payments WHERE id = ?", [id])

      // Recompute the parent due from the remaining payments. Same shape as
      // the recompute on insert (see /api/fees/payments POST).
      await connection.execute(
        `UPDATE erp_fee_dues d
            SET amount_paid = (
              SELECT COALESCE(SUM(p.amount), 0)
                FROM erp_fee_payments p
               WHERE p.due_id = d.id
            ),
            status = CASE
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
        [payment.due_id]
      )
    })

    return NextResponse.json({ message: "Payment deleted" })
  } catch (error) {
    console.error("Fee payment DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
