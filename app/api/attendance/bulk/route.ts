import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery, executeTransaction } from "@/app/lib/db"
import { bulkAttendanceSchema, parseOrError } from "@/app/lib/validations"

export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin", "teacher"])
    if (isAuthError(ctx)) return ctx

    const body = await request.json()
    const parsed = parseOrError(bulkAttendanceSchema, body)
    if (!parsed.success) return parsed.response

    const { class_section_id, date, records } = parsed.data

    // Verify ownership
    const csCheck = await executeQuery<{ id: number }[]>(
      `SELECT ecs.id FROM erp_class_sections ecs
       JOIN erp_sessions es ON es.id = ecs.session_id
       WHERE ecs.id = ? AND es.partner_id = ?`,
      [class_section_id, ctx.partnerUserId]
    )
    if (csCheck.length === 0) {
      return NextResponse.json({ error: "Class section not found" }, { status: 404 })
    }

    // Check if date is a holiday
    const holidayCheck = await executeQuery<{ is_holiday: number }[]>(
      `SELECT cd.is_holiday FROM erp_calendar_days cd
       JOIN erp_class_sections ecs ON ecs.session_id = cd.session_id
       WHERE ecs.id = ? AND cd.date = ?`,
      [class_section_id, date]
    )
    if (holidayCheck.length > 0 && holidayCheck[0].is_holiday === 1) {
      return NextResponse.json({ error: "Cannot mark attendance on a holiday" }, { status: 400 })
    }

    const markedBy = ctx.userId

    // Pre-compute rows
    const rows: (string | number | null)[][] = []
    for (const record of records) {
      const { enrollment_id, status, remarks } = record
      if (!enrollment_id || !status) continue
      rows.push([enrollment_id, date, status, remarks || null, markedBy])
    }

    if (rows.length === 0) {
      return NextResponse.json({ message: "No records to save" })
    }

    // Batch insert in chunks of 50
    const BATCH_SIZE = 50
    await executeTransaction(async (connection) => {
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE)
        const placeholders = batch.map(() => "(?, ?, ?, ?, ?, NOW(), NOW())").join(", ")
        const flatParams = batch.flat()

        await connection.execute(
          `INSERT INTO erp_attendance_records (student_enrollment_id, date, status, remarks, marked_by, created_at, updated_at)
           VALUES ${placeholders}
           ON DUPLICATE KEY UPDATE
             status = VALUES(status),
             remarks = VALUES(remarks),
             marked_by = VALUES(marked_by),
             updated_at = NOW()`,
          flatParams
        )
      }
    })

    return NextResponse.json({ message: "Attendance saved successfully" })
  } catch (error) {
    console.error("Attendance bulk POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
