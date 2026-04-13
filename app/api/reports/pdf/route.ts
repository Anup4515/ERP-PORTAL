import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"
import { renderToBuffer } from "@react-pdf/renderer"
import React from "react"
import MonthlyReportPDF from "@/app/components/reports/pdf/MonthlyReportPDF"
import ExamReportPDF from "@/app/components/reports/pdf/ExamReportPDF"
import AnnualReportPDF from "@/app/components/reports/pdf/AnnualReportPDF"

async function fetchReportData(type: string, params: Record<string, string>, baseUrl: string, cookie: string) {
  const query = new URLSearchParams(params).toString()
  const res = await fetch(`${baseUrl}/api/reports/${type}?${query}`, {
    headers: { cookie },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to fetch report data" }))
    throw new Error(err.error || "Failed to fetch report data")
  }
  const json = await res.json()
  return json.data
}

async function getPartnerInfo(partnerUserId: number) {
  const rows = await executeQuery<Record<string, unknown>[]>(
    `SELECT partner_name, address, city, state, logo, affiliated_board
     FROM partners WHERE user_id = ?`,
    [partnerUserId]
  )
  if (rows.length === 0) return { partner_name: "School" }
  return rows[0] as {
    partner_name: string
    address?: string | null
    city?: string | null
    state?: string | null
    logo?: string | null
    affiliated_board?: string | null
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin", "teacher"])
    if (isAuthError(ctx)) return ctx

    const body = await request.json()
    const { student_id, type, reference_month, exam_id, session_id } = body

    if (!student_id || !type) {
      return NextResponse.json({ error: "student_id and type are required" }, { status: 400 })
    }

    if (!["monthly", "exam", "annual"].includes(type)) {
      return NextResponse.json({ error: "type must be monthly, exam, or annual" }, { status: 400 })
    }

    // Build params for internal API call
    const params: Record<string, string> = { student_id: String(student_id) }
    if (type === "monthly") {
      if (!reference_month) return NextResponse.json({ error: "reference_month is required for monthly reports" }, { status: 400 })
      params.month = reference_month
    } else if (type === "exam") {
      if (!exam_id) return NextResponse.json({ error: "exam_id is required for exam reports" }, { status: 400 })
      params.exam_id = String(exam_id)
    } else {
      if (!session_id) return NextResponse.json({ error: "session_id is required for annual reports" }, { status: 400 })
      params.session_id = String(session_id)
    }

    // Fetch report data via internal API
    const cookie = request.headers.get("cookie") || ""
    const baseUrl = new URL(request.url).origin
    const data = await fetchReportData(type, params, baseUrl, cookie)

    // Get partner info for header
    const partner = await getPartnerInfo(ctx.partnerUserId)

    // Render PDF
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pdfElement: any
    if (type === "monthly") {
      pdfElement = React.createElement(MonthlyReportPDF, { data, partner })
    } else if (type === "exam") {
      pdfElement = React.createElement(ExamReportPDF, { data, partner })
    } else {
      pdfElement = React.createElement(AnnualReportPDF, { data, partner })
    }
    const buffer = await renderToBuffer(pdfElement)

    // Store record in erp_report_cards
    const enrollmentId = Number(student_id)
    await executeQuery(
      `INSERT INTO erp_report_cards
        (student_enrollment_id, type, reference_month, exam_id,
         attendance_percentage, overall_percentage, overall_grade, rank_in_class,
         generated_by, generated_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         attendance_percentage = VALUES(attendance_percentage),
         overall_percentage = VALUES(overall_percentage),
         overall_grade = VALUES(overall_grade),
         rank_in_class = VALUES(rank_in_class),
         generated_by = VALUES(generated_by),
         generated_at = NOW(),
         updated_at = NOW()`,
      [
        enrollmentId,
        type,
        type === "monthly" ? `${reference_month}-01` : null,
        type === "exam" ? Number(exam_id) : null,
        data.attendance?.percentage ?? null,
        type === "exam" ? data.overall_percentage : null,
        type === "exam" ? data.overall_grade : null,
        type === "exam" ? data.rank : null,
        ctx.userId,
      ]
    )

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report-${type}-${student_id}.pdf"`,
      },
    })
  } catch (error) {
    console.error("PDF generation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PDF generation failed" },
      { status: 500 }
    )
  }
}
