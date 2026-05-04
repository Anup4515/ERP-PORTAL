import { NextResponse } from "next/server"
import {
  getAuthContext,
  isAuthError,
  ensureCurrentSession,
} from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"
import { updateFeeDueSchema, parseOrError } from "@/app/lib/validations"

interface DueRow {
  id: number
  amount_paid: string
  session_id: number
}

async function loadDue(id: string, partnerUserId: number): Promise<DueRow | null> {
  const rows = await executeQuery<DueRow[]>(
    `SELECT d.id, d.amount_paid, fs.session_id
       FROM erp_fee_dues d
       JOIN erp_fee_structures fs ON fs.id = d.structure_id
      WHERE d.id = ? AND d.partner_id = ?`,
    [id, partnerUserId]
  )
  return rows[0] ?? null
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const due = await loadDue(id, ctx.partnerUserId)
    if (!due) {
      return NextResponse.json({ error: "Fee due not found" }, { status: 404 })
    }

    const guard = await ensureCurrentSession(due.session_id, ctx.partnerUserId)
    if (guard) return guard

    const body = await request.json().catch(() => null)
    const parsed = parseOrError(updateFeeDueSchema, body)
    if (!parsed.success) return parsed.response

    const allowed = ["amount_due", "status", "due_date", "remarks"] as const
    const updates: string[] = []
    const values: (string | number | null)[] = []
    for (const key of allowed) {
      const val = (parsed.data as Record<string, unknown>)[key]
      if (val !== undefined) {
        updates.push(`${key} = ?`)
        values.push(val === "" ? null : (val as string | number | null))
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    values.push(Number(id))
    await executeQuery(
      `UPDATE erp_fee_dues SET ${updates.join(", ")} WHERE id = ?`,
      values
    )

    // If amount_due changed, the cached status may now be inconsistent with
    // the existing payments. Recompute it. Waived stays waived.
    await executeQuery(
      `UPDATE erp_fee_dues
          SET status = CASE
            WHEN status = 'waived' THEN 'waived'
            WHEN amount_paid <= 0 THEN 'pending'
            WHEN amount_paid >= amount_due THEN 'paid'
            ELSE 'partial'
          END
        WHERE id = ?`,
      [Number(id)]
    )

    return NextResponse.json({ message: "Fee due updated" })
  } catch (error) {
    console.error("Fee due PUT error:", error)
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

    const due = await loadDue(id, ctx.partnerUserId)
    if (!due) {
      return NextResponse.json({ error: "Fee due not found" }, { status: 404 })
    }

    const guard = await ensureCurrentSession(due.session_id, ctx.partnerUserId)
    if (guard) return guard

    if (Number(due.amount_paid) > 0) {
      return NextResponse.json(
        { error: "Cannot delete a due that has payments. Delete the payments first or waive the due." },
        { status: 409 }
      )
    }

    await executeQuery("DELETE FROM erp_fee_dues WHERE id = ?", [id])
    return NextResponse.json({ message: "Fee due removed" })
  } catch (error) {
    console.error("Fee due DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
