import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

interface ContactRow {
  user_id: number
  name: string
  email: string
  last_message_id: number | null
  last_message_epoch: number | null
  unread_count: number
}

interface MessageRow {
  id: number
  sender_id: number
  receiver_id: number
  description: string | null
  title: string | null
}

export async function GET() {
  try {
    const ctx = await getAuthContext(["teacher"])
    if (isAuthError(ctx)) return ctx

    // role_id 3 = consultant. For each consultant, find the latest chat row
    // and count unread inbound messages (correlated subqueries — MariaDB
    // doesn't support LATERAL joins).
    //
    // UNIX_TIMESTAMP() always returns epoch seconds in UTC regardless of
    // @@session.time_zone, sidestepping the CONVERT_TZ tz-tables dependency.
    const rows = await executeQuery<ContactRow[]>(
      `SELECT u.id AS user_id, u.name, u.email,
              (SELECT c.id FROM chats c
                WHERE (c.sender_id = ? AND c.receiver_id = u.id)
                   OR (c.sender_id = u.id AND c.receiver_id = ?)
                ORDER BY c.created_at DESC, c.id DESC LIMIT 1) AS last_message_id,
              (SELECT EXTRACT(EPOCH FROM c.created_at) FROM chats c
                WHERE (c.sender_id = ? AND c.receiver_id = u.id)
                   OR (c.sender_id = u.id AND c.receiver_id = ?)
                ORDER BY c.created_at DESC, c.id DESC LIMIT 1) AS last_message_epoch,
              (SELECT COUNT(*) FROM chats c
                WHERE c.sender_id = u.id AND c.receiver_id = ?
                  AND c.read_at IS NULL) AS unread_count
       FROM users u
       WHERE u.role_id = 3
       ORDER BY (last_message_epoch IS NULL), last_message_epoch DESC, u.name ASC`,
      [ctx.userId, ctx.userId, ctx.userId, ctx.userId, ctx.userId]
    )

    // Batch-fetch the latest message bodies for previews.
    const lastIds = rows
      .map((r) => r.last_message_id)
      .filter((v): v is number => v !== null && v !== undefined)

    const previewById = new Map<number, MessageRow>()
    if (lastIds.length > 0) {
      const placeholders = lastIds.map(() => "?").join(",")
      const previewRows = await executeQuery<MessageRow[]>(
        `SELECT id, sender_id, receiver_id, description, title
         FROM chats WHERE id IN (${placeholders})`,
        lastIds
      )
      for (const p of previewRows) previewById.set(p.id, p)
    }

    const data = rows.map((r) => {
      const p = r.last_message_id !== null ? previewById.get(r.last_message_id) : null
      const previewText =
        (p?.description && p.description.length > 0 ? p.description : p?.title) ?? null
      return {
        user_id: r.user_id,
        name: r.name,
        email: r.email,
        last_message_at: r.last_message_epoch !== null ? Number(r.last_message_epoch) : null,
        last_message_preview: previewText ? previewText.slice(0, 120) : null,
        last_sender_id: p ? p.sender_id : null,
        unread_count: Number(r.unread_count ?? 0),
      }
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Consultant chat contacts GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
