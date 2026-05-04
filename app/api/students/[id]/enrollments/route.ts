import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const enrollments = await executeQuery(
      `SELECT e.*, c.name as class_name, sec.name as section_name, es.name as session_name
       FROM erp_student_enrollments e
       JOIN erp_class_sections ecs ON ecs.id = e.class_section_id
       JOIN erp_sessions es ON es.id = ecs.session_id
       JOIN classes c ON c.id = ecs.class_id
       JOIN sections sec ON sec.id = ecs.section_id
       WHERE e.student_id = ? AND e.partner_id = ?
       ORDER BY es.start_date DESC`,
      [id, ctx.partnerUserId]
    )

    return NextResponse.json({ data: enrollments })
  } catch (error) {
    console.error("Student enrollments GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params

    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const body = await request.json()
    const { class_section_id, roll_number, student_type } = body

    if (!class_section_id) {
      return NextResponse.json(
        { error: "class_section_id is required" },
        { status: 400 }
      )
    }

    // Verify class_section belongs to this partner
    const ownershipCheck = await executeQuery<{ id: number }[]>(
      `SELECT ecs.id FROM erp_class_sections ecs
       JOIN erp_sessions es ON es.id = ecs.session_id
       WHERE ecs.id = ? AND es.partner_id = ?`,
      [class_section_id, ctx.partnerUserId]
    )
    if (ownershipCheck.length === 0) {
      return NextResponse.json({ error: "Class section not found" }, { status: 404 })
    }

    // Verify student belongs to this partner
    const studentCheck = await executeQuery<{ id: number }[]>(
      `SELECT st.id FROM students st
       JOIN erp_student_enrollments e ON e.student_id = st.id
       WHERE st.id = ? AND e.partner_id = ? AND st.deleted_at IS NULL`,
      [studentId, ctx.partnerUserId]
    )
    if (studentCheck.length === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const result = await executeQuery<{ id: number }[]>(
      `INSERT INTO erp_student_enrollments (
        student_id, class_section_id, partner_id, roll_number, student_type, enrollment_date, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_DATE, 'active', NOW(), NOW())
      RETURNING id`,
      [studentId, class_section_id, ctx.partnerUserId, roll_number || null, student_type || "regular"]
    )

    return NextResponse.json(
      { data: { id: result[0].id }, message: "Enrollment created successfully" },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Student enrollment POST error:", error)
    if (error?.code === "23505") {
      return NextResponse.json(
        { error: "Student is already enrolled in this class section or roll number is taken" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
