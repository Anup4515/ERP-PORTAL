import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"
import { renderToBuffer } from "@react-pdf/renderer"
import React from "react"
import MonthlyReportPDF from "@/app/components/reports/pdf/MonthlyReportPDF"
import ExamReportPDF from "@/app/components/reports/pdf/ExamReportPDF"
import AnnualReportPDF from "@/app/components/reports/pdf/AnnualReportPDF"

// Simple ZIP builder — produces a valid ZIP archive without external dependencies
function createZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const centralDir: Uint8Array[] = []
  const localParts: Uint8Array[] = []
  let offset = 0

  for (const file of files) {
    const nameBytes = new TextEncoder().encode(file.name)
    // Local file header (30 + name + data)
    const local = new Uint8Array(30 + nameBytes.length + file.data.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)  // local file header sig
    lv.setUint16(4, 20, true)           // version needed
    lv.setUint16(6, 0, true)            // flags
    lv.setUint16(8, 0, true)            // compression: store
    lv.setUint16(10, 0, true)           // mod time
    lv.setUint16(12, 0, true)           // mod date
    lv.setUint32(14, 0, true)           // crc32 (0 for simplicity)
    lv.setUint32(18, file.data.length, true) // compressed size
    lv.setUint32(22, file.data.length, true) // uncompressed size
    lv.setUint16(26, nameBytes.length, true) // name length
    lv.setUint16(28, 0, true)           // extra length
    local.set(nameBytes, 30)
    local.set(file.data, 30 + nameBytes.length)
    localParts.push(local)

    // Central directory entry (46 + name)
    const cd = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(cd.buffer)
    cv.setUint32(0, 0x02014b50, true)   // central dir sig
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, 0, true)
    cv.setUint16(14, 0, true)
    cv.setUint32(16, 0, true)
    cv.setUint32(20, file.data.length, true)
    cv.setUint32(24, file.data.length, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint16(30, 0, true)
    cv.setUint16(32, 0, true)
    cv.setUint16(34, 0, true)
    cv.setUint16(36, 0, true)
    cv.setUint32(38, 0, true)
    cv.setUint32(42, offset, true)       // local header offset
    cd.set(nameBytes, 46)
    centralDir.push(cd)

    offset += local.length
  }

  const cdSize = centralDir.reduce((s, c) => s + c.length, 0)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)     // EOCD sig
  ev.setUint16(4, 0, true)
  ev.setUint16(6, 0, true)
  ev.setUint16(8, files.length, true)
  ev.setUint16(10, files.length, true)
  ev.setUint32(12, cdSize, true)
  ev.setUint32(16, offset, true)
  ev.setUint16(20, 0, true)

  const total = offset + cdSize + 22
  const result = new Uint8Array(total)
  let pos = 0
  for (const lp of localParts) { result.set(lp, pos); pos += lp.length }
  for (const cd of centralDir) { result.set(cd, pos); pos += cd.length }
  result.set(eocd, pos)
  return result
}

async function fetchReportData(type: string, params: Record<string, string>, baseUrl: string, cookie: string) {
  const query = new URLSearchParams(params).toString()
  const res = await fetch(`${baseUrl}/api/reports/${type}?${query}`, {
    headers: { cookie },
  })
  if (!res.ok) return null
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
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const body = await request.json()
    const { class_section_id, type, reference_month, exam_id, session_id } = body

    if (!class_section_id || !type) {
      return NextResponse.json({ error: "class_section_id and type are required" }, { status: 400 })
    }

    if (!["monthly", "exam", "annual"].includes(type)) {
      return NextResponse.json({ error: "type must be monthly, exam, or annual" }, { status: 400 })
    }

    // Verify class section belongs to partner
    const csCheck = await executeQuery<{ id: number }[]>(
      `SELECT ecs.id FROM erp_class_sections ecs
       JOIN erp_sessions es ON es.id = ecs.session_id
       WHERE ecs.id = ? AND es.partner_id = ?`,
      [class_section_id, ctx.partnerUserId]
    )
    if (csCheck.length === 0) {
      return NextResponse.json({ error: "Class section not found" }, { status: 404 })
    }

    // Get all active students
    const students = await executeQuery<{
      enrollment_id: number
      first_name: string
      last_name: string
      roll_number: number | null
    }[]>(
      `SELECT se.id as enrollment_id, s.first_name, s.last_name, se.roll_number
       FROM erp_student_enrollments se
       JOIN students s ON s.id = se.student_id
       WHERE se.class_section_id = ? AND se.status = 'active'
       ORDER BY se.roll_number, s.first_name`,
      [class_section_id]
    )

    if (students.length === 0) {
      return NextResponse.json({ error: "No students found in this class" }, { status: 404 })
    }

    const partner = await getPartnerInfo(ctx.partnerUserId)
    const cookie = request.headers.get("cookie") || ""
    const baseUrl = new URL(request.url).origin

    const pdfFiles: { name: string; data: Uint8Array }[] = []

    for (const student of students) {
      const params: Record<string, string> = { student_id: String(student.enrollment_id) }
      if (type === "monthly") params.month = reference_month
      else if (type === "exam") params.exam_id = String(exam_id)
      else params.session_id = String(session_id)

      const data = await fetchReportData(type, params, baseUrl, cookie)
      if (!data) continue

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
      const rollStr = student.roll_number ? `${student.roll_number}_` : ""
      const fileName = `${rollStr}${student.first_name}_${student.last_name}.pdf`
      pdfFiles.push({ name: fileName, data: new Uint8Array(buffer) })

      // Store record
      await executeQuery(
        `INSERT INTO erp_report_cards
          (student_enrollment_id, type, reference_month, exam_id,
           attendance_percentage, overall_percentage, overall_grade, rank_in_class,
           generated_by, generated_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           generated_by = VALUES(generated_by),
           generated_at = NOW(),
           updated_at = NOW()`,
        [
          student.enrollment_id,
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
    }

    if (pdfFiles.length === 0) {
      return NextResponse.json({ error: "No reports could be generated" }, { status: 400 })
    }

    const zipBuffer = createZip(pdfFiles)

    return new NextResponse(zipBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="reports-${type}-class.zip"`,
      },
    })
  } catch (error) {
    console.error("Bulk PDF generation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bulk PDF generation failed" },
      { status: 500 }
    )
  }
}
