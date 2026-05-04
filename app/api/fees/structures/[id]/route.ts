import { NextResponse } from "next/server"
import {
  getAuthContext,
  isAuthError,
  ensureCurrentSession,
} from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"
import { updateFeeStructureSchema, parseOrError } from "@/app/lib/validations"

interface StructureRow {
  id: number
  session_id: number
  partner_id: number
}

function toFirstOfMonth(input: string | null | undefined): string | null {
  if (!input) return null
  const m = input.match(/^(\d{4})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}-01` : null
}

async function loadStructure(id: string, partnerUserId: number): Promise<StructureRow | null> {
  const rows = await executeQuery<StructureRow[]>(
    "SELECT id, session_id, partner_id FROM erp_fee_structures WHERE id = ? AND partner_id = ?",
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

    const structure = await loadStructure(id, ctx.partnerUserId)
    if (!structure) {
      return NextResponse.json({ error: "Fee structure not found" }, { status: 404 })
    }

    const guard = await ensureCurrentSession(structure.session_id, ctx.partnerUserId)
    if (guard) return guard

    const body = await request.json().catch(() => null)
    const parsed = parseOrError(updateFeeStructureSchema, body)
    if (!parsed.success) return parsed.response
    const data = parsed.data as Record<string, unknown>

    const updates: string[] = []
    const values: (string | number | null)[] = []

    const setColumn = (col: string, val: string | number | null) => {
      updates.push(`${col} = ?`)
      values.push(val)
    }

    if (data.class_section_id !== undefined) {
      setColumn("class_section_id", data.class_section_id as number | null)
    }
    if (data.name !== undefined) {
      setColumn("name", String(data.name))
    }
    if (data.fee_type !== undefined) {
      setColumn("fee_type", String(data.fee_type))
    }
    if (data.amount !== undefined) {
      setColumn("amount", Number(data.amount))
    }

    // Recurrence-coupled fields are written together so the row stays
    // internally consistent (one-time rows have monthly fields cleared, and
    // vice versa).
    if (data.recurrence !== undefined) {
      const recurrence = String(data.recurrence)
      setColumn("recurrence", recurrence)
      if (recurrence === "monthly") {
        setColumn("due_date", null)
        setColumn("start_month", toFirstOfMonth(data.start_month as string | undefined))
        setColumn("end_month", toFirstOfMonth(data.end_month as string | undefined))
        setColumn(
          "due_day_of_month",
          data.due_day_of_month != null ? Number(data.due_day_of_month) : null
        )
      } else {
        setColumn("due_date", (data.due_date as string) || null)
        setColumn("start_month", null)
        setColumn("end_month", null)
        setColumn("due_day_of_month", null)
      }
    } else {
      // No recurrence change — allow individual field edits.
      if (data.due_date !== undefined) {
        setColumn("due_date", (data.due_date as string) || null)
      }
      if (data.start_month !== undefined) {
        setColumn("start_month", toFirstOfMonth(data.start_month as string | undefined))
      }
      if (data.end_month !== undefined) {
        setColumn("end_month", toFirstOfMonth(data.end_month as string | undefined))
      }
      if (data.due_day_of_month !== undefined) {
        setColumn(
          "due_day_of_month",
          data.due_day_of_month != null ? Number(data.due_day_of_month) : null
        )
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    values.push(Number(id))
    await executeQuery(
      `UPDATE erp_fee_structures SET ${updates.join(", ")} WHERE id = ?`,
      values
    )

    return NextResponse.json({ message: "Fee structure updated" })
  } catch (error) {
    console.error("Fee structure PUT error:", error)
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

    const structure = await loadStructure(id, ctx.partnerUserId)
    if (!structure) {
      return NextResponse.json({ error: "Fee structure not found" }, { status: 404 })
    }

    const guard = await ensureCurrentSession(structure.session_id, ctx.partnerUserId)
    if (guard) return guard

    // Cascade deletes on erp_fee_dues and erp_fee_payments are configured
    // at the schema level (ON DELETE CASCADE), so a single DELETE wipes
    // any assignments + collected payments. This mirrors the destructive
    // intent: "remove this fee, and everything that came from it".
    await executeQuery("DELETE FROM erp_fee_structures WHERE id = ?", [id])

    return NextResponse.json({ message: "Fee structure deleted" })
  } catch (error) {
    console.error("Fee structure DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
