import { NextResponse } from "next/server"
import {
  getAuthContext,
  isAuthError,
  resolveSessionId,
  isSessionError,
} from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

interface AggRow {
  total_billed: string | null
  total_collected: string | null
  pending_count: number
  partial_count: number
  paid_count: number
  waived_count: number
  total_dues: number
}

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const sess = await resolveSessionId(request, ctx.partnerUserId)
    if (isSessionError(sess)) return sess

    const empty = {
      total_billed: 0,
      total_collected: 0,
      total_outstanding: 0,
      collection_rate: 0,
      pending_count: 0,
      partial_count: 0,
      paid_count: 0,
      waived_count: 0,
      total_dues: 0,
    }

    if (sess.sessionId === null) {
      return NextResponse.json({ data: empty })
    }

    const rows = await executeQuery<AggRow[]>(
      `SELECT
         COALESCE(SUM(CASE WHEN d.status = 'waived' THEN 0 ELSE d.amount_due  END), 0) AS total_billed,
         COALESCE(SUM(d.amount_paid), 0)                                               AS total_collected,
         SUM(CASE WHEN d.status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
         SUM(CASE WHEN d.status = 'partial' THEN 1 ELSE 0 END) AS partial_count,
         SUM(CASE WHEN d.status = 'paid'    THEN 1 ELSE 0 END) AS paid_count,
         SUM(CASE WHEN d.status = 'waived'  THEN 1 ELSE 0 END) AS waived_count,
         COUNT(*)                                              AS total_dues
       FROM erp_fee_dues d
       JOIN erp_fee_structures fs ON fs.id = d.structure_id
       WHERE d.partner_id = ? AND fs.session_id = ?`,
      [ctx.partnerUserId, sess.sessionId]
    )

    const r = rows[0]
    const totalBilled    = Number(r?.total_billed    ?? 0)
    const totalCollected = Number(r?.total_collected ?? 0)
    const outstanding    = Math.max(0, totalBilled - totalCollected)
    const collectionRate = totalBilled > 0
      ? Math.round((totalCollected / totalBilled) * 100)
      : 0

    return NextResponse.json({
      data: {
        total_billed: totalBilled,
        total_collected: totalCollected,
        total_outstanding: outstanding,
        collection_rate: collectionRate,
        pending_count: Number(r?.pending_count ?? 0),
        partial_count: Number(r?.partial_count ?? 0),
        paid_count:    Number(r?.paid_count    ?? 0),
        waived_count:  Number(r?.waived_count  ?? 0),
        total_dues:    Number(r?.total_dues    ?? 0),
      },
    })
  } catch (error) {
    console.error("Fee summary GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
