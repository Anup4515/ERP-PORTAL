import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    // Verify teacher belongs to this partner
    const teacherRows = await executeQuery<{ id: number }[]>(
      `SELECT t.id FROM teachers t
       JOIN users u ON u.id = t.user_id
       WHERE t.user_id = ? AND t.partner_id = ? AND u.role_id = 5`,
      [id, ctx.schoolId]
    )
    if (teacherRows.length === 0) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    const body = await request.json()
    const password = typeof body?.password === "string" ? body.password : ""

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    const hashed = bcrypt.hashSync(password, 10)
    await executeQuery(
      "UPDATE users SET password = ?, updated_at = NOW() WHERE id = ? AND role_id = 5",
      [hashed, id]
    )

    return NextResponse.json({ message: "Password reset successfully" })
  } catch (error) {
    console.error("Teacher password PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
