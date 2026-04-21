import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { executeQuery } from "@/app/lib/db"
import { ResultSetHeader } from "mysql2/promise"

export async function POST(request: Request) {
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
        { error: "Only school admins can create partner profiles" },
        { status: 403 }
      )
    }

    // Check if partner already exists
    const existing = await executeQuery<{ id: number }[]>(
      "SELECT id FROM partners WHERE user_id = ?",
      [session.user.user_id]
    )

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Partner profile already exists" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      partner_name,
      partner_type = "school",
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
      logo,
    } = body

    if (!partner_name) {
      return NextResponse.json(
        { error: "Partner name is required" },
        { status: 400 }
      )
    }

    if (logo && typeof logo === "string" && !/^data:image\/(png|jpe?g|webp|svg\+xml);base64,/.test(logo)) {
      return NextResponse.json(
        { error: "Logo must be a PNG, JPEG, WEBP, or SVG image" },
        { status: 400 }
      )
    }

    // Generate partner_code: uppercase first 3 chars + random 4 digits
    const prefix = partner_name
      .replace(/[^a-zA-Z]/g, "")
      .substring(0, 3)
      .toUpperCase()
      .padEnd(3, "X")
    const suffix = Math.floor(1000 + Math.random() * 9000)
    const partner_code = `${prefix}${suffix}`

    const result = await executeQuery<ResultSetHeader>(
      `INSERT INTO partners (user_id, partner_type, partner_name, partner_code, contact_person, contact_email, contact_phone, address, city, state, pincode, registration_number, affiliated_board, website, logo, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        session.user.user_id,
        partner_type,
        partner_name,
        partner_code,
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
        logo || null,
      ]
    )

    return NextResponse.json({
      data: { id: result.insertId },
      message: "Partner created successfully",
    })
  } catch (error) {
    console.error("Partner setup error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
