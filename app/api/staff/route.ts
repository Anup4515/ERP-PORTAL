import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

export async function GET() {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const staff = await executeQuery(
      "SELECT * FROM partner_staff WHERE partner_id = ? ORDER BY designation, name",
      [ctx.partnerUserId]
    )

    return NextResponse.json({ data: staff })
  } catch (error) {
    console.error("Staff GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const body = await request.json()
    const { name, designation, department, phone, email, qualification, experience, address } = body

    if (!name || !designation) {
      return NextResponse.json({ error: "Name and designation are required" }, { status: 400 })
    }

    const result = await executeQuery<{ insertId: number }>(
      `INSERT INTO partner_staff (partner_id, name, designation, department, phone, email, qualification, experience, address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ctx.partnerUserId, name, designation, department || null, phone || null, email || null, qualification || null, experience || null, address || null]
    )

    return NextResponse.json(
      { data: { id: (result as any).insertId }, message: "Staff added successfully" },
      { status: 201 }
    )
  } catch (error) {
    console.error("Staff POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
