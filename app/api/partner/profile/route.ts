import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { executeQuery } from "@/app/lib/db"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const school_id = session.user.school_id

    if (!school_id) {
      return NextResponse.json({ data: null })
    }

    const rows = await executeQuery<Record<string, unknown>[]>(
      "SELECT * FROM partners WHERE id = ?",
      [school_id]
    )

    if (rows.length === 0) {
      return NextResponse.json({ data: null })
    }

    return NextResponse.json({ data: rows[0] })
  } catch (error) {
    console.error("Get partner profile error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (session.user.role !== "school_admin") {
      return NextResponse.json(
        { error: "Only school admins can update partner profiles" },
        { status: 403 }
      )
    }

    const school_id = session.user.school_id

    if (!school_id) {
      return NextResponse.json(
        { error: "No partner profile found" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      partner_name,
      contact_person,
      contact_email,
      contact_phone,
      address,
      city,
      state,
      pincode,
      registration_number,
      affiliated_board,
      website,
    } = body

    await executeQuery(
      `UPDATE partners SET
        partner_name = COALESCE(?, partner_name),
        contact_person = COALESCE(?, contact_person),
        contact_email = COALESCE(?, contact_email),
        contact_phone = COALESCE(?, contact_phone),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        pincode = COALESCE(?, pincode),
        registration_number = COALESCE(?, registration_number),
        affiliated_board = COALESCE(?, affiliated_board),
        website = COALESCE(?, website),
        updated_at = NOW()
      WHERE id = ?`,
      [
        partner_name || null,
        contact_person || null,
        contact_email || null,
        contact_phone || null,
        address || null,
        city || null,
        state || null,
        pincode || null,
        registration_number || null,
        affiliated_board || null,
        website || null,
        school_id,
      ]
    )

    return NextResponse.json({
      data: null,
      message: "Updated",
    })
  } catch (error) {
    console.error("Update partner profile error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
