import { NextResponse } from "next/server"
import {
  getAuthContext,
  isAuthError,
  resolveSessionId,
  isSessionError,
} from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const sess = await resolveSessionId(request, ctx.partnerUserId)
    if (isSessionError(sess)) return sess
    if (sess.sessionId === null) {
      return NextResponse.json({ data: { dues: [], total: 0, page: 1, limit: 50 } })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")              // pending|partial|paid|waived
    const classSectionId = searchParams.get("class_section_id")
    const studentId = searchParams.get("student_id")
    const structureId = searchParams.get("structure_id")
    const period = searchParams.get("period")              // YYYY-MM (or '' for one-time only)
    const feeType = searchParams.get("fee_type")           // tuition|admission|transport|exam|other
    const search = (searchParams.get("search") || "").trim()
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)))
    const offset = (page - 1) * limit

    const where: string[] = ["d.partner_id = ?", "ecs.session_id = ?"]
    const params: (string | number)[] = [ctx.partnerUserId, sess.sessionId]

    if (status && ["pending", "partial", "paid", "waived"].includes(status)) {
      where.push("d.status = ?")
      params.push(status)
    }
    if (classSectionId) {
      where.push("ecs.id = ?")
      params.push(classSectionId)
    }
    if (studentId) {
      where.push("s.id = ?")
      params.push(studentId)
    }
    if (structureId) {
      where.push("d.structure_id = ?")
      params.push(structureId)
    }
    if (period !== null && /^(\d{4}-\d{2})?$/.test(period)) {
      // Empty string filters to one-time dues; "YYYY-MM" filters to that month.
      where.push("d.period_label = ?")
      params.push(period)
    }
    // Allowed fee_types are the same set the structure form persists; we
    // accept the value as-is (no enum check) since it's only used in WHERE
    // and an unknown value will simply match nothing.
    if (feeType) {
      where.push("fs.fee_type = ?")
      params.push(feeType)
    }
    if (search) {
      where.push("(s.first_name LIKE ? OR s.last_name LIKE ? OR fs.name LIKE ?)")
      const pattern = `%${search}%`
      params.push(pattern, pattern, pattern)
    }

    const whereSql = `WHERE ${where.join(" AND ")}`

    const baseFrom = `
      FROM erp_fee_dues d
      JOIN erp_fee_structures fs       ON fs.id  = d.structure_id
      JOIN erp_student_enrollments se  ON se.id  = d.student_enrollment_id
      JOIN students s                  ON s.id   = se.student_id
      JOIN erp_class_sections ecs      ON ecs.id = se.class_section_id
      JOIN classes c                   ON c.id   = ecs.class_id
      JOIN sections sec                ON sec.id = ecs.section_id
    `

    const countResult = await executeQuery<{ total: number }[]>(
      `SELECT COUNT(*) AS total ${baseFrom} ${whereSql}`,
      params
    )
    const total = countResult[0]?.total ?? 0

    const dues = await executeQuery(
      `SELECT
         d.id, d.structure_id, d.student_enrollment_id,
         d.amount_due, d.amount_paid, d.status, d.due_date, d.remarks,
         d.period_label,
         (d.amount_due - d.amount_paid) AS outstanding,
         fs.name        AS fee_name,
         fs.fee_type    AS fee_type,
         fs.recurrence  AS recurrence,
         s.id         AS student_id,
         s.first_name AS student_first_name,
         s.last_name  AS student_last_name,
         c.name       AS class_name,
         sec.name     AS section_name,
         ecs.id       AS class_section_id
       ${baseFrom}
       ${whereSql}
       ORDER BY (d.status = 'paid'), d.due_date IS NULL, d.due_date ASC, s.first_name ASC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    )

    return NextResponse.json({ data: { dues, total, page, limit } })
  } catch (error) {
    console.error("Fee dues GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
