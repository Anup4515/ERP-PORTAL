import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

async function verifyExamOwnership(examId: string, partnerUserId: number) {
  const rows = await executeQuery<{ id: number }[]>(
    `SELECT id FROM erp_exams WHERE id = ? AND partner_id = ?`,
    [examId, partnerUserId]
  )
  return rows.length > 0
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ctx = await getAuthContext(["school_admin", "teacher"])
    if (isAuthError(ctx)) return ctx

    const exams = await executeQuery(
      `SELECT e.*, c.name as class_name, sec.name as section_name
       FROM erp_exams e
       JOIN erp_class_sections ecs ON ecs.id = e.class_section_id
       JOIN erp_sessions es ON es.id = ecs.session_id
       JOIN classes c ON c.id = ecs.class_id
       JOIN sections sec ON sec.id = ecs.section_id
       WHERE e.id = ? AND es.partner_id = ?`,
      [id, ctx.partnerUserId]
    )
    if ((exams as any[]).length === 0) return NextResponse.json({ error: "Exam not found" }, { status: 404 })

    return NextResponse.json({ data: (exams as any[])[0] })
  } catch (error) {
    console.error("Exam GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    if (!(await verifyExamOwnership(id, ctx.partnerUserId))) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 })
    }

    const body = await request.json()
    const allowed = ["name", "code", "exam_type", "start_date", "end_date", "status"]
    const ALLOWED_EXAM_TYPES = ["other", "unit_test", "mid_term", "final_annual"]
    const updates: string[] = []
    const values: any[] = []

    for (const key of allowed) {
      if (body[key] !== undefined) {
        let value = body[key] || null
        // Guardrail: silently drop invalid exam_type values so the enum stays clean.
        if (key === "exam_type" && value !== null && !ALLOWED_EXAM_TYPES.includes(value)) {
          continue
        }
        updates.push(`${key} = ?`)
        values.push(value)
      }
    }
    if (updates.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 })

    updates.push("updated_at = NOW()")
    values.push(Number(id))

    await executeQuery(`UPDATE erp_exams SET ${updates.join(", ")} WHERE id = ?`, values)
    return NextResponse.json({ message: "Exam updated" })
  } catch (error) {
    console.error("Exam PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    if (!(await verifyExamOwnership(id, ctx.partnerUserId))) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 })
    }

    // Delete related data first
    await executeQuery("DELETE FROM erp_marks WHERE exam_id = ?", [id])
    await executeQuery("DELETE FROM erp_exam_schedules WHERE exam_id = ?", [id])
    await executeQuery("DELETE FROM erp_exams WHERE id = ?", [id])

    return NextResponse.json({ message: "Exam deleted" })
  } catch (error) {
    console.error("Exam DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
