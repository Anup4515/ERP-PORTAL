import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { canChatWith, getOrCreateThread } from "@/app/lib/chat"

export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin", "teacher"])
    if (isAuthError(ctx)) return ctx

    const body = await request.json().catch(() => null)
    const otherUserId = Number(body?.other_user_id)
    if (!otherUserId || !Number.isInteger(otherUserId) || otherUserId <= 0) {
      return NextResponse.json({ error: "other_user_id is required" }, { status: 400 })
    }

    const allowed = await canChatWith({
      partnerUserId: ctx.partnerUserId,
      schoolId: ctx.schoolId,
      selfUserId: ctx.userId,
      otherUserId,
    })
    if (!allowed) {
      return NextResponse.json({ error: "Not allowed to chat with this user" }, { status: 403 })
    }

    const threadId = await getOrCreateThread(ctx.partnerUserId, ctx.userId, otherUserId)
    return NextResponse.json({ data: { thread_id: threadId } }, { status: 201 })
  } catch (error) {
    console.error("Chat threads POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
