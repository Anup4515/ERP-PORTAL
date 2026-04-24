import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

async function verifyThreadAccess(
  threadId: number,
  partnerUserId: number,
  selfUserId: number
): Promise<{ id: number; user_a_id: number; user_b_id: number } | null> {
  const rows = await executeQuery<{ id: number; user_a_id: number; user_b_id: number }[]>(
    `SELECT id, user_a_id, user_b_id
     FROM erp_chat_threads
     WHERE id = ? AND partner_id = ?
       AND (user_a_id = ? OR user_b_id = ?)
     LIMIT 1`,
    [threadId, partnerUserId, selfUserId, selfUserId]
  )
  return rows[0] ?? null
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext(["school_admin", "teacher"])
    if (isAuthError(ctx)) return ctx

    const { id } = await params
    const threadId = Number(id)
    if (!Number.isInteger(threadId) || threadId <= 0) {
      return NextResponse.json({ error: "Invalid thread id" }, { status: 400 })
    }

    const thread = await verifyThreadAccess(threadId, ctx.partnerUserId, ctx.userId)
    if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "100", 10)))
    const afterId = parseInt(searchParams.get("after_id") || "0", 10) || 0

    const extraWhere = afterId > 0 ? " AND id > ?" : ""
    const values: (number | string)[] = [threadId]
    if (afterId > 0) values.push(afterId)

    const messages = await executeQuery<{
      id: number
      thread_id: number
      sender_id: number
      body: string
      read_at: string | null
      created_at: string
    }[]>(
      `SELECT id, thread_id, sender_id, body, read_at,
              DATE_FORMAT(CONVERT_TZ(created_at, @@session.time_zone, '+00:00'),
                          '%Y-%m-%dT%H:%i:%s.000Z') AS created_at
       FROM erp_chat_messages
       WHERE thread_id = ?${extraWhere}
       ORDER BY id ASC
       LIMIT ${limit}`,
      values
    )

    // Mark inbound messages as read.
    await executeQuery(
      `UPDATE erp_chat_messages
       SET read_at = NOW()
       WHERE thread_id = ? AND sender_id <> ? AND read_at IS NULL`,
      [threadId, ctx.userId]
    )

    return NextResponse.json({ data: { messages, thread_id: threadId } })
  } catch (error) {
    console.error("Chat messages GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext(["school_admin", "teacher"])
    if (isAuthError(ctx)) return ctx

    const { id } = await params
    const threadId = Number(id)
    if (!Number.isInteger(threadId) || threadId <= 0) {
      return NextResponse.json({ error: "Invalid thread id" }, { status: 400 })
    }

    const thread = await verifyThreadAccess(threadId, ctx.partnerUserId, ctx.userId)
    if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 })

    const body = await request.json().catch(() => null)
    const messageBody = typeof body?.body === "string" ? body.body.trim() : ""
    if (messageBody.length === 0) {
      return NextResponse.json({ error: "Message body is required" }, { status: 400 })
    }
    if (messageBody.length > 4000) {
      return NextResponse.json({ error: "Message is too long (max 4000 chars)" }, { status: 400 })
    }

    const insertResult = await executeQuery<{ insertId: number }>(
      `INSERT INTO erp_chat_messages (thread_id, sender_id, body, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())`,
      [threadId, ctx.userId, messageBody]
    )

    // Update thread summary for contact-list ordering / previews.
    const preview = messageBody.slice(0, 255)
    await executeQuery(
      `UPDATE erp_chat_threads
         SET last_message_at = NOW(),
             last_message_preview = ?,
             last_sender_id = ?,
             updated_at = NOW()
       WHERE id = ?`,
      [preview, ctx.userId, threadId]
    )

    return NextResponse.json(
      {
        data: {
          id: insertResult.insertId,
          thread_id: threadId,
          sender_id: ctx.userId,
          body: messageBody,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Chat messages POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
