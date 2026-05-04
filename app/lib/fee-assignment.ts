import type { PgPoolConnection } from "@/app/lib/db"

// ─── Date helpers (string + integer arithmetic, no TZ shenanigans) ─────────

export interface MonthSlot {
  period: string  // "YYYY-MM"
  year: number
  month: number   // 1-indexed
}

export function parseMonth(input: string | null): { year: number; month: number } | null {
  if (!input) return null
  const m = input.match(/^(\d{4})-(\d{2})/)
  if (!m) return null
  return { year: Number(m[1]), month: Number(m[2]) }
}

/**
 * Enumerate every month from `startISO` to `endISO` (inclusive) as 1-indexed
 * (year, month) tuples plus a "YYYY-MM" period label. Returns [] cleanly when
 * start > end (e.g. enrollment after window close).
 */
export function enumerateMonths(startISO: string, endISO: string): MonthSlot[] {
  const s = parseMonth(startISO)
  const e = parseMonth(endISO)
  if (!s || !e) return []
  if (s.year > e.year || (s.year === e.year && s.month > e.month)) return []
  const out: MonthSlot[] = []
  let y = s.year
  let mo = s.month
  while (y < e.year || (y === e.year && mo <= e.month)) {
    out.push({
      period: `${y}-${String(mo).padStart(2, "0")}`,
      year: y,
      month: mo,
    })
    mo += 1
    if (mo > 12) {
      mo = 1
      y += 1
    }
  }
  return out
}

/**
 * Resolve due_date for a given month + day, clamping the day to the last day
 * of that month (so day=31 → Feb 28/29, Apr 30, …).
 */
export function dueDateFor(year: number, month: number, day: number): string {
  const lastDay = new Date(year, month, 0).getDate()
  const safeDay = Math.min(Math.max(1, day), lastDay)
  return `${year}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`
}

/**
 * Pick the later of two YYYY-MM-... date strings, returning a YYYY-MM-01
 * string. String comparison works for ISO dates so we don't need to parse.
 */
export function laterMonthStart(a: string, b: string): string {
  const aMonth = a.slice(0, 7)
  const bMonth = b.slice(0, 7)
  return (aMonth >= bMonth ? aMonth : bMonth) + "-01"
}

// ─── Slot expansion ─────────────────────────────────────────────────────────

export interface FeeStructureForAssign {
  id: number
  amount: string                    // mysql2 returns DECIMAL as string
  recurrence: "one_time" | "monthly"
  due_date: string | null
  start_month: string | null
  end_month: string | null
  due_day_of_month: number | null
}

export interface DueSlot {
  period: string
  due_date: string | null
}

/**
 * Build the (period, due_date) tuples a single enrollment should produce for
 * a given structure. Honours per-enrollment window clamping for monthly fees:
 * a student admitted in May won't be billed for Feb–Apr of a Feb-start tuition.
 *
 * Returns [] if:
 *   - the structure is monthly but missing required fields, OR
 *   - the enrollment_date is after the structure's end_month.
 */
export function slotsForEnrollment(
  structure: FeeStructureForAssign,
  enrollmentDate: string | null
): DueSlot[] {
  if (structure.recurrence === "one_time") {
    return [{ period: "", due_date: structure.due_date }]
  }

  if (!structure.start_month || !structure.end_month || !structure.due_day_of_month) {
    return []
  }

  // enrollment_date null (very old data) → fall back to structure.start_month
  // so the student gets the full window. Matches the assign route's policy.
  const startISO = enrollmentDate
    ? laterMonthStart(structure.start_month, enrollmentDate)
    : structure.start_month

  const months = enumerateMonths(startISO, structure.end_month)
  return months.map((m) => ({
    period: m.period,
    due_date: dueDateFor(m.year, m.month, structure.due_day_of_month as number),
  }))
}

// ─── Auto-assign on new enrollment ──────────────────────────────────────────

interface FeeStructureRow extends FeeStructureForAssign {
  class_section_id: number | null
}

interface EnrollmentRef {
  id: number                        // erp_student_enrollments.id
  class_section_id: number
  enrollment_date: string | null    // ISO YYYY-MM-DD
}

export interface AutoAssignResult {
  structuresMatched: number
  duesInserted: number
}

/**
 * For a freshly-created enrollment, find every fee structure in scope
 * (whole-session structures + structures pinned to this enrollment's
 * class_section) and INSERT IGNORE the appropriate dues. Idempotent — safe to
 * call again if rerun.
 *
 * Runs against an existing PgPoolConnection (from executeTransaction) so the
 * write is atomic with the enrollment insert that triggered it.
 */
export async function autoAssignDuesForNewEnrollment(
  connection: PgPoolConnection,
  partnerUserId: number,
  sessionId: number,
  enrollment: EnrollmentRef
): Promise<AutoAssignResult> {
  const [structureRows] = await connection.execute<FeeStructureRow[]>(
    `SELECT id, class_section_id, amount, recurrence,
            due_date, start_month, end_month, due_day_of_month
       FROM erp_fee_structures
      WHERE partner_id = ?
        AND session_id = ?
        AND (class_section_id IS NULL OR class_section_id = ?)`,
    [partnerUserId, sessionId, enrollment.class_section_id]
  )
  const structures = structureRows
  if (structures.length === 0) {
    return { structuresMatched: 0, duesInserted: 0 }
  }

  // Build the full INSERT VALUES list across all structures × slots.
  const placeholders: string[] = []
  const values: (number | string | null)[] = []

  for (const s of structures) {
    const slots = slotsForEnrollment(s, enrollment.enrollment_date)
    for (const slot of slots) {
      placeholders.push("(?, ?, ?, ?, ?, ?)")
      values.push(
        partnerUserId,
        s.id,
        slot.period,
        enrollment.id,
        s.amount,
        slot.due_date
      )
    }
  }

  if (placeholders.length === 0) {
    // Every matching structure was monthly with no remaining months for this
    // enrollment (joined after window close).
    return { structuresMatched: structures.length, duesInserted: 0 }
  }

  // Postgres equivalent of MySQL's INSERT IGNORE: ON CONFLICT … DO NOTHING.
  // Adding RETURNING id lets us count newly-inserted rows (skipped duplicates
  // are excluded), giving us the same semantic as mysql2's affectedRows.
  const [insertedRows] = await connection.execute<{ id: number }[]>(
    `INSERT INTO erp_fee_dues
       (partner_id, structure_id, period_label, student_enrollment_id, amount_due, due_date)
     VALUES ${placeholders.join(", ")}
     ON CONFLICT (structure_id, student_enrollment_id, period_label) DO NOTHING
     RETURNING id`,
    values
  )
  return {
    structuresMatched: structures.length,
    duesInserted: insertedRows.length,
  }
}
