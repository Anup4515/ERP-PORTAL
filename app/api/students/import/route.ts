import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery, executeTransaction } from "@/app/lib/db"

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "")
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())
  const rows: string[][] = []

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = []
    let current = ""
    let inQuotes = false

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === "," && !inQuotes) {
        values.push(current.trim())
        current = ""
      } else {
        current += char
      }
    }
    values.push(current.trim())
    rows.push(values)
  }

  return { headers, rows }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "CSV file is required" }, { status: 400 })
    }

    const text = await file.text()
    const { headers, rows } = parseCSV(text)

    if (headers.length === 0 || rows.length === 0) {
      return NextResponse.json({ error: "CSV file is empty or invalid" }, { status: 400 })
    }

    const requiredColumns = ["first_name", "last_name", "email", "class_section_id"]
    const missingColumns = requiredColumns.filter((col) => !headers.includes(col))
    if (missingColumns.length > 0) {
      return NextResponse.json(
        { error: `Missing required columns: ${missingColumns.join(", ")}` },
        { status: 400 }
      )
    }

    const colIndex: Record<string, number> = {}
    headers.forEach((h, i) => { colIndex[h] = i })

    // Pre-validate class_section_ids belong to partner
    const classSectionIds = [...new Set(
      rows.map((row) => row[colIndex["class_section_id"]]).filter(Boolean)
    )]

    if (classSectionIds.length === 0) {
      return NextResponse.json({ error: "No valid class_section_id values found" }, { status: 400 })
    }

    const placeholders = classSectionIds.map(() => "?").join(",")
    const validSections = await executeQuery<{ id: number }[]>(
      `SELECT ecs.id FROM erp_class_sections ecs
       JOIN erp_sessions es ON es.id = ecs.session_id
       WHERE ecs.id IN (${placeholders}) AND es.partner_id = ?`,
      [...classSectionIds, ctx.partnerUserId]
    )
    const validSectionIds = new Set(validSections.map((s) => String(s.id)))

    const errors: { row: number; message: string }[] = []
    let imported = 0

    await executeTransaction(async (connection) => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowNum = i + 2 // 1-indexed, skip header

        const getValue = (col: string): string => {
          const idx = colIndex[col]
          return idx !== undefined && idx < row.length ? row[idx] : ""
        }

        const first_name = getValue("first_name")
        const last_name = getValue("last_name")
        const email = getValue("email")
        const class_section_id = getValue("class_section_id")

        if (!first_name) { errors.push({ row: rowNum, message: "first_name is required" }); continue }
        if (!last_name) { errors.push({ row: rowNum, message: "last_name is required" }); continue }
        if (!email) { errors.push({ row: rowNum, message: "email is required" }); continue }
        if (!class_section_id) { errors.push({ row: rowNum, message: "class_section_id is required" }); continue }
        if (!validSectionIds.has(class_section_id)) {
          errors.push({ row: rowNum, message: `Invalid class_section_id: ${class_section_id}` })
          continue
        }

        try {
          const [studentResult] = await connection.execute(
            `INSERT INTO students (
              created_by, first_name, last_name, email, gender, date_of_birth,
              phone, father_name, mother_name, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
            [
              ctx.userId || null,
              first_name,
              last_name,
              email,
              getValue("gender") || null,
              getValue("date_of_birth") || null,
              getValue("phone") || null,
              getValue("father_name") || null,
              getValue("mother_name") || null,
            ]
          )
          const studentId = (studentResult as any).insertId

          const rollNumber = getValue("roll_number")
          await connection.execute(
            `INSERT INTO erp_student_enrollments (
              student_id, class_section_id, partner_id, roll_number, student_type, enrollment_date, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 'regular', CURDATE(), 'active', NOW(), NOW())`,
            [studentId, class_section_id, ctx.partnerUserId, rollNumber || null]
          )

          imported++
        } catch (err: any) {
          if (err?.code === "ER_DUP_ENTRY") {
            errors.push({ row: rowNum, message: `Duplicate entry for email ${email} or roll number` })
          } else {
            errors.push({ row: rowNum, message: err?.message || "Unknown error" })
          }
        }
      }
    })

    return NextResponse.json({
      data: { imported, errors }
    })
  } catch (error) {
    console.error("Students import error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
