import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { executeQuery } from "@/app/lib/db"

interface BrandingRow {
  partner_name: string
  logo: string | null
}

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const school_id = session.user.school_id

    if (!school_id) {
      return NextResponse.json({ data: null })
    }

    const rows = await executeQuery<(BrandingRow & Record<string, unknown>)[]>(
      "SELECT partner_name, logo FROM partners WHERE id = ? LIMIT 1",
      [school_id]
    )

    if (rows.length === 0) {
      return NextResponse.json({ data: null })
    }

    return NextResponse.json({
      data: {
        partner_name: rows[0].partner_name,
        logo: rows[0].logo,
      },
    })
  } catch (error) {
    console.error("Get partner branding error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
