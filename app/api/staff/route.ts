import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)))
    const offset = (page - 1) * limit

    let whereClause = "WHERE partner_id = ?"
    const queryParams: (string | number)[] = [ctx.partnerUserId]

    if (search) {
      whereClause += " AND (name LIKE ? OR designation LIKE ? OR department LIKE ?)"
      const pattern = `%${search}%`
      queryParams.push(pattern, pattern, pattern)
    }

    const countResult = await executeQuery<{ total: number }[]>(
      `SELECT COUNT(*) as total FROM partner_staff ${whereClause}`,
      queryParams
    )
    const total = countResult[0].total

    const staff = await executeQuery(
      `SELECT * FROM partner_staff ${whereClause} ORDER BY designation, name LIMIT ${limit} OFFSET ${offset}`,
      queryParams
    )

    return NextResponse.json({ data: { staff, total, page, limit } })
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
    const { name, designation, department, phone, email, qualification, experience, address, date_of_joining } = body

    if (!name || !designation) {
      return NextResponse.json({ error: "Name and designation are required" }, { status: 400 })
    }

    if (date_of_joining) {
      const doj = new Date(date_of_joining)
      if (isNaN(doj.getTime()) || doj > new Date()) {
        return NextResponse.json({ error: "Date of joining cannot be in the future" }, { status: 400 })
      }
    }

    const result = await executeQuery<{ insertId: number }>(
      `INSERT INTO partner_staff (partner_id, name, designation, department, phone, email, qualification, experience, address, date_of_joining)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ctx.partnerUserId, name, designation, department || null, phone || null, email || null, qualification || null, experience || null, address || null, date_of_joining || null]
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
