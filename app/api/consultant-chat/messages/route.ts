import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"
import path from "node:path"
import { mkdir, writeFile } from "node:fs/promises"
import crypto from "node:crypto"

interface MessageRow {
  id: number
  sender_id: number
  receiver_id: number
  title: string | null
  description: string | null
  path: string | null
  read_at: number | null
  created_at: number
}

const MAX_BODY_LEN = 4000
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_EXT = new Set([
  ".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".txt",
])

function safeExt(filename: string): string | null {
  const ext = path.extname(filename).toLowerCase()
  return ALLOWED_EXT.has(ext) ? ext : null
}

async function verifyConsultant(userId: number): Promise<boolean> {
  const rows = await executeQuery<{ id: number }[]>(
    "SELECT id FROM users WHERE id = ? AND role_id = 3 LIMIT 1",
    [userId]
  )
  return rows.length > 0
}

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["teacher"])
    if (isAuthError(ctx)) return ctx

    const { searchParams } = new URL(request.url)
    const consultantId = Number(searchParams.get("consultant_id") || 0)
    if (!Number.isInteger(consultantId) || consultantId <= 0) {
      return NextResponse.json({ error: "consultant_id is required" }, { status: 400 })
    }
    if (!(await verifyConsultant(consultantId))) {
      return NextResponse.json({ error: "Not a consultant" }, { status: 404 })
    }

    const afterId = parseInt(searchParams.get("after_id") || "0", 10) || 0
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "100", 10)))

    const extraWhere = afterId > 0 ? " AND c.id > ?" : ""
    const params: (number | string)[] = [ctx.userId, consultantId, consultantId, ctx.userId]
    if (afterId > 0) params.push(afterId)

    const messages = await executeQuery<MessageRow[]>(
      `SELECT c.id, c.sender_id, c.receiver_id, c.title, c.description, c.path,
              EXTRACT(EPOCH FROM c.read_at) AS read_at,
              EXTRACT(EPOCH FROM c.created_at) AS created_at
       FROM chats c
       WHERE ((c.sender_id = ? AND c.receiver_id = ?)
           OR (c.sender_id = ? AND c.receiver_id = ?))${extraWhere}
       ORDER BY c.id ASC
       LIMIT ${limit}`,
      params
    )

    // Mark inbound messages from this consultant as read.
    // to_timestamp(?) round-trips cleanly with UNIX_TIMESTAMP() regardless
    // of the server's session_time_zone (NOW() does not — it depends on it).
    const nowEpoch = Math.floor(Date.now() / 1000)
    await executeQuery(
      `UPDATE chats
         SET read_at = to_timestamp(?)
       WHERE sender_id = ? AND receiver_id = ? AND read_at IS NULL`,
      [nowEpoch, consultantId, ctx.userId]
    )

    const formatted = messages.map((m) => ({
      ...m,
      created_at: Number(m.created_at),
      read_at: m.read_at !== null ? Number(m.read_at) : null,
    }))

    return NextResponse.json({ data: { messages: formatted, consultant_id: consultantId } })
  } catch (error) {
    console.error("Consultant chat messages GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext(["teacher"])
    if (isAuthError(ctx)) return ctx

    const contentType = request.headers.get("content-type") || ""
    let consultantId = 0
    let title: string | null = null
    let body = ""
    let file: File | null = null

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData()
      consultantId = Number(form.get("consultant_id") || 0)
      title = (form.get("title") as string | null)?.trim() || null
      body = ((form.get("body") as string | null) || "").trim()
      const f = form.get("file")
      if (f && typeof f === "object" && "arrayBuffer" in f) file = f as File
    } else {
      const json = await request.json().catch(() => null)
      consultantId = Number(json?.consultant_id || 0)
      title = typeof json?.title === "string" ? json.title.trim() || null : null
      body = typeof json?.body === "string" ? json.body.trim() : ""
    }

    if (!Number.isInteger(consultantId) || consultantId <= 0) {
      return NextResponse.json({ error: "consultant_id is required" }, { status: 400 })
    }
    if (!(await verifyConsultant(consultantId))) {
      return NextResponse.json({ error: "Not a consultant" }, { status: 404 })
    }
    if (body.length === 0 && !file) {
      return NextResponse.json({ error: "Message body or file is required" }, { status: 400 })
    }
    if (body.length > MAX_BODY_LEN) {
      return NextResponse.json({ error: `Message too long (max ${MAX_BODY_LEN})` }, { status: 400 })
    }

    let storedRelPath: string | null = null
    if (file) {
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 })
      }
      const ext = safeExt(file.name || "")
      if (!ext) {
        return NextResponse.json({ error: "File type not allowed" }, { status: 400 })
      }

      // Save under public/uploads/chatFiles/<random>.<ext> so the same path
      // works for the legacy admin_panel view (asset('uploads/'.$d->path))
      // assuming a shared public/uploads directory in deployment.
      const uploadRoot =
        process.env.CHAT_UPLOAD_DIR || path.join(process.cwd(), "public", "uploads", "chatFiles")
      await mkdir(uploadRoot, { recursive: true })
      const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`
      const absPath = path.join(uploadRoot, filename)
      const buf = Buffer.from(await file.arrayBuffer())
      await writeFile(absPath, buf)
      storedRelPath = `chatFiles/${filename}`
    }

    // Use FROM_UNIXTIME() instead of NOW() so the stored value reflects the
    // actual UTC moment we computed in JS — independent of the MariaDB
    // session's time_zone setting.
    const sentEpoch = Math.floor(Date.now() / 1000)
    const insert = await executeQuery<{ id: number }[]>(
      `INSERT INTO chats (sender_id, receiver_id, title, description, path, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, to_timestamp(?), to_timestamp(?))
       RETURNING id`,
      [ctx.userId, consultantId, title, body || null, storedRelPath, sentEpoch, sentEpoch]
    )

    return NextResponse.json(
      {
        data: {
          id: insert[0].id,
          sender_id: ctx.userId,
          receiver_id: consultantId,
          title,
          description: body || null,
          path: storedRelPath,
          created_at: sentEpoch,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Consultant chat messages POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
