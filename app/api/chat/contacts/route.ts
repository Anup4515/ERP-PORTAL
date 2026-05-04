import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

interface ContactRow {
  user_id: number
  name: string
  email: string
  role: "school_admin" | "teacher"
  thread_id: number | null
  last_message_at: string | null
  last_message_preview: string | null
  last_sender_id: number | null
  unread_count: number
}

export async function GET() {
  try {
    const ctx = await getAuthContext(["school_admin", "teacher"])
    if (isAuthError(ctx)) return ctx

    // Collect candidate user ids in this school.
    //   - the school admin (= ctx.partnerUserId)
    //   - every teacher belonging to this partner (teachers.partner_id = ctx.schoolId)
    const teacherRows = await executeQuery<{ user_id: number; name: string; email: string }[]>(
      `SELECT t.user_id, u.name, u.email
       FROM teachers t
       JOIN users u ON u.id = t.user_id
       WHERE t.partner_id = ?`,
      [ctx.schoolId]
    )

    const adminRows = await executeQuery<{ user_id: number; name: string; email: string }[]>(
      `SELECT id AS user_id, name, email FROM users WHERE id = ? LIMIT 1`,
      [ctx.partnerUserId]
    )

    const candidates: { user_id: number; name: string; email: string; role: "school_admin" | "teacher" }[] = []
    for (const a of adminRows) candidates.push({ ...a, role: "school_admin" })
    for (const t of teacherRows) candidates.push({ ...t, role: "teacher" })

    // Exclude self.
    const others = candidates.filter((c) => c.user_id !== ctx.userId)
    if (others.length === 0) {
      return NextResponse.json({ data: [] as ContactRow[] })
    }

    // Join thread + unread counts in one query per contact.
    // Pair ordering: (LEAST, GREATEST) of (self, other).
    const placeholders = others.map(() => "?").join(",")
    const threads = await executeQuery<{
      id: number
      user_a_id: number
      user_b_id: number
      last_message_at: string | null
      last_message_preview: string | null
      last_sender_id: number | null
      unread_count: number
    }[]>(
      `SELECT t.id, t.user_a_id, t.user_b_id,
              to_char(t.last_message_at AT TIME ZONE 'UTC',
                      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS last_message_at,
              t.last_message_preview, t.last_sender_id,
              (SELECT COUNT(*) FROM erp_chat_messages m
                WHERE m.thread_id = t.id
                  AND m.sender_id <> ?
                  AND m.read_at IS NULL) AS unread_count
       FROM erp_chat_threads t
       WHERE t.partner_id = ?
         AND (
           (t.user_a_id = ? AND t.user_b_id IN (${placeholders})) OR
           (t.user_b_id = ? AND t.user_a_id IN (${placeholders}))
         )`,
      [
        ctx.userId,
        ctx.partnerUserId,
        ctx.userId,
        ...others.map((o) => o.user_id),
        ctx.userId,
        ...others.map((o) => o.user_id),
      ]
    )

    const threadByOther = new Map<number, (typeof threads)[number]>()
    for (const t of threads) {
      const otherId = t.user_a_id === ctx.userId ? t.user_b_id : t.user_a_id
      threadByOther.set(otherId, t)
    }

    const data: ContactRow[] = others.map((c) => {
      const t = threadByOther.get(c.user_id)
      return {
        user_id: c.user_id,
        name: c.name,
        email: c.email,
        role: c.role,
        thread_id: t?.id ?? null,
        last_message_at: t?.last_message_at ?? null,
        last_message_preview: t?.last_message_preview ?? null,
        last_sender_id: t?.last_sender_id ?? null,
        unread_count: Number(t?.unread_count ?? 0),
      }
    })

    // Sort: threads with recent activity first, then alphabetical.
    data.sort((a, b) => {
      const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
      const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
      if (ta !== tb) return tb - ta
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Chat contacts GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
