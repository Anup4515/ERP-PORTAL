import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { executeQuery } from "@/app/lib/db"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "school_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const school_id = session.user.school_id
    if (!school_id) return NextResponse.json({ error: "No partner profile" }, { status: 400 })

    const partnerRows = await executeQuery<{ user_id: number }[]>(
      "SELECT user_id FROM partners WHERE id = ?", [school_id]
    )
    if (partnerRows.length === 0) return NextResponse.json({ error: "Partner not found" }, { status: 404 })

    const staff = await executeQuery(
      "SELECT * FROM partner_staff WHERE partner_id = ? ORDER BY designation, name",
      [partnerRows[0].user_id]
    )

    return NextResponse.json({ data: staff })
  } catch (error) {
    console.error("Staff GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "school_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const school_id = session.user.school_id
    if (!school_id) return NextResponse.json({ error: "No partner profile" }, { status: 400 })

    const partnerRows = await executeQuery<{ user_id: number }[]>(
      "SELECT user_id FROM partners WHERE id = ?", [school_id]
    )
    if (partnerRows.length === 0) return NextResponse.json({ error: "Partner not found" }, { status: 404 })

    const body = await request.json()
    const { name, designation, department, phone, email, qualification, experience, address } = body

    if (!name || !designation) {
      return NextResponse.json({ error: "Name and designation are required" }, { status: 400 })
    }

    const result = await executeQuery<{ insertId: number }>(
      `INSERT INTO partner_staff (partner_id, name, designation, department, phone, email, qualification, experience, address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [partnerRows[0].user_id, name, designation, department || null, phone || null, email || null, qualification || null, experience || null, address || null]
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
