import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { executeQuery } from "@/app/lib/db"

async function verifyExamOwnership(examId: string, partnerUserId: number) {
  const rows = await executeQuery<{ id: number }[]>(
    `SELECT e.id FROM erp_exams e
     JOIN erp_class_sections ecs ON ecs.id = e.class_section_id
     JOIN erp_sessions es ON es.id = ecs.session_id
     WHERE e.id = ? AND es.partner_id = ?`,
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
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const school_id = session.user.school_id
    if (!school_id) return NextResponse.json({ error: "No partner profile" }, { status: 400 })

    const partnerRows = await executeQuery<{ user_id: number }[]>(
      "SELECT user_id FROM partners WHERE id = ?", [school_id]
    )
    if (partnerRows.length === 0) return NextResponse.json({ error: "Partner not found" }, { status: 404 })

    const exams = await executeQuery(
      `SELECT e.*, c.name as class_name, sec.name as section_name
       FROM erp_exams e
       JOIN erp_class_sections ecs ON ecs.id = e.class_section_id
       JOIN erp_sessions es ON es.id = ecs.session_id
       JOIN classes c ON c.id = ecs.class_id
       JOIN sections sec ON sec.id = ecs.section_id
       WHERE e.id = ? AND es.partner_id = ?`,
      [id, partnerRows[0].user_id]
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
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "school_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const school_id = session.user.school_id
    if (!school_id) return NextResponse.json({ error: "No partner profile" }, { status: 400 })

    const partnerRows = await executeQuery<{ user_id: number }[]>(
      "SELECT user_id FROM partners WHERE id = ?", [school_id]
    )
    if (partnerRows.length === 0) return NextResponse.json({ error: "Partner not found" }, { status: 404 })

    if (!(await verifyExamOwnership(id, partnerRows[0].user_id))) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 })
    }

    const body = await request.json()
    const allowed = ["name", "code", "start_date", "end_date", "status"]
    const updates: string[] = []
    const values: any[] = []

    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates.push(`${key} = ?`)
        values.push(body[key] || null)
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
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "school_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const school_id = session.user.school_id
    if (!school_id) return NextResponse.json({ error: "No partner profile" }, { status: 400 })

    const partnerRows = await executeQuery<{ user_id: number }[]>(
      "SELECT user_id FROM partners WHERE id = ?", [school_id]
    )
    if (partnerRows.length === 0) return NextResponse.json({ error: "Partner not found" }, { status: 404 })

    if (!(await verifyExamOwnership(id, partnerRows[0].user_id))) {
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
