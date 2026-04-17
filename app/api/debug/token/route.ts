import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"

export async function GET() {
  try {
    const session = await auth()
    return NextResponse.json({
      hasSession: !!session,
      user: session?.user
        ? {
            user_id: (session.user as any).user_id,
            school_id: (session.user as any).school_id,
            role: (session.user as any).role,
            name: session.user.name,
            email: session.user.email,
          }
        : null,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
