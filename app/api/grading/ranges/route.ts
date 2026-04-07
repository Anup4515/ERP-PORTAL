import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const scheme_id = request.nextUrl.searchParams.get("scheme_id")
    if (!scheme_id) {
      return NextResponse.json(
        { error: "scheme_id query parameter is required" },
        { status: 400 }
      )
    }

    // Verify the scheme belongs to this partner
    const schemeRows = await executeQuery<{ id: number }[]>(
      "SELECT id FROM erp_grading_schemes WHERE id = ? AND partner_id = ?",
      [scheme_id, ctx.partnerUserId]
    )
    if (schemeRows.length === 0) {
      return NextResponse.json({ error: "Grading scheme not found" }, { status: 404 })
    }

    const ranges = await executeQuery(
      "SELECT * FROM erp_grading_ranges WHERE grading_scheme_id = ? ORDER BY sort_order, min_percentage",
      [scheme_id]
    )

    return NextResponse.json({ data: ranges })
  } catch (error) {
    console.error("Grading ranges GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const body = await request.json()
    const { grading_scheme_id, grade_label, min_percentage, max_percentage, gpa_value, sort_order } = body

    if (!grading_scheme_id || !grade_label || min_percentage === undefined || max_percentage === undefined) {
      return NextResponse.json(
        { error: "grading_scheme_id, grade_label, min_percentage, and max_percentage are required" },
        { status: 400 }
      )
    }

    // Verify the scheme belongs to this partner
    const schemeRows = await executeQuery<{ id: number }[]>(
      "SELECT id FROM erp_grading_schemes WHERE id = ? AND partner_id = ?",
      [grading_scheme_id, ctx.partnerUserId]
    )
    if (schemeRows.length === 0) {
      return NextResponse.json({ error: "Grading scheme not found" }, { status: 404 })
    }

    const result = await executeQuery<{ insertId: number }>(
      `INSERT INTO erp_grading_ranges (grading_scheme_id, grade_label, min_percentage, max_percentage, gpa_value, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [grading_scheme_id, grade_label, min_percentage, max_percentage, gpa_value ?? null, sort_order ?? 0]
    )

    return NextResponse.json(
      { data: { id: (result as any).insertId }, message: "Grading range created successfully" },
      { status: 201 }
    )
  } catch (error) {
    console.error("Grading ranges POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
