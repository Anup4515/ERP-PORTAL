import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { executeQuery } from "@/app/lib/db"

export async function GET(
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
      "SELECT user_id FROM partners WHERE id = ?",
      [school_id]
    )
    if (partnerRows.length === 0) return NextResponse.json({ error: "Partner not found" }, { status: 404 })
    const partnerUserId = partnerRows[0].user_id

    const enrollments = await executeQuery(
      `SELECT e.*, c.name as class_name, sec.name as section_name, es.name as session_name
       FROM erp_student_enrollments e
       JOIN erp_class_sections ecs ON ecs.id = e.class_section_id
       JOIN erp_sessions es ON es.id = ecs.session_id
       JOIN classes c ON c.id = ecs.class_id
       JOIN sections sec ON sec.id = ecs.section_id
       WHERE e.student_id = ? AND es.partner_id = ?
       ORDER BY es.start_date DESC`,
      [id, partnerUserId]
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

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "school_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const school_id = session.user.school_id
    if (!school_id) return NextResponse.json({ error: "No partner profile" }, { status: 400 })

    const partnerRows = await executeQuery<{ user_id: number }[]>(
      "SELECT user_id FROM partners WHERE id = ?",
      [school_id]
    )
    if (partnerRows.length === 0) return NextResponse.json({ error: "Partner not found" }, { status: 404 })
    const partnerUserId = partnerRows[0].user_id

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
      [class_section_id, partnerUserId]
    )
    if (ownershipCheck.length === 0) {
      return NextResponse.json({ error: "Class section not found" }, { status: 404 })
    }

    // Verify student belongs to this partner
    const studentCheck = await executeQuery<{ id: number }[]>(
      `SELECT st.id FROM students st
       JOIN erp_student_enrollments e ON e.student_id = st.id
       JOIN erp_class_sections ecs ON ecs.id = e.class_section_id
       JOIN erp_sessions es ON es.id = ecs.session_id
       WHERE st.id = ? AND es.partner_id = ? AND st.deleted_at IS NULL`,
      [studentId, partnerUserId]
    )
    if (studentCheck.length === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const result = await executeQuery<{ insertId: number }>(
      `INSERT INTO erp_student_enrollments (
        student_id, class_section_id, roll_number, student_type, enrollment_date, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, CURDATE(), 'active', NOW(), NOW())`,
      [studentId, class_section_id, roll_number || null, student_type || "regular"]
    )

    return NextResponse.json(
      { data: { id: (result as any).insertId }, message: "Enrollment created successfully" },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Student enrollment POST error:", error)
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "Student is already enrolled in this class section or roll number is taken" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
