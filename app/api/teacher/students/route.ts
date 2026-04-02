import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { executeQuery, executeTransaction } from "@/app/lib/db"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const school_id = session.user.school_id
    const teacherUserId = session.user.user_id
    if (!school_id) return NextResponse.json({ error: "No partner profile" }, { status: 400 })

    const partnerRows = await executeQuery<{ user_id: number }[]>(
      "SELECT user_id FROM partners WHERE id = ?",
      [school_id]
    )
    if (partnerRows.length === 0) return NextResponse.json({ error: "Partner not found" }, { status: 404 })
    const partnerUserId = partnerRows[0].user_id

    const { searchParams } = new URL(request.url)
    const classSectionId = searchParams.get("class_section_id")

    if (!classSectionId) {
      return NextResponse.json({ error: "class_section_id is required" }, { status: 400 })
    }

    // Verify teacher is assigned to this class-section
    const sessRows = await executeQuery<{ id: number }[]>(
      "SELECT id FROM erp_sessions WHERE partner_id = ? AND is_current = 1 LIMIT 1",
      [partnerUserId]
    )
    if (sessRows.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const csCheck = await executeQuery<{ id: number }[]>(
      `SELECT ecs.id FROM erp_class_sections ecs
       WHERE ecs.id = ? AND ecs.session_id = ?
         AND (
           ecs.class_teacher_id = ?
           OR ecs.second_incharge_id = ?
           OR ecs.id IN (SELECT DISTINCT class_section_id FROM erp_subjects WHERE teacher_id = ?)
         )`,
      [classSectionId, sessRows[0].id, teacherUserId, teacherUserId, teacherUserId]
    )
    if (csCheck.length === 0) {
      return NextResponse.json({ error: "Not authorized for this class" }, { status: 403 })
    }

    const students = await executeQuery(
      `SELECT se.id as enrollment_id, se.student_id, se.roll_number,
              s.first_name, s.last_name, s.email, s.gender, s.phone
       FROM erp_student_enrollments se
       JOIN students s ON s.id = se.student_id
       WHERE se.class_section_id = ? AND se.status = 'active'
       ORDER BY se.roll_number, s.first_name`,
      [classSectionId]
    )

    return NextResponse.json({ data: students })
  } catch (error) {
    console.error("Teacher students GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const school_id = session.user.school_id
    const teacherUserId = session.user.user_id
    if (!school_id) return NextResponse.json({ error: "No partner profile" }, { status: 400 })

    const partnerRows = await executeQuery<{ user_id: number }[]>(
      "SELECT user_id FROM partners WHERE id = ?",
      [school_id]
    )
    if (partnerRows.length === 0) return NextResponse.json({ error: "Partner not found" }, { status: 404 })
    const partnerUserId = partnerRows[0].user_id

    const body = await request.json()
    const {
      first_name, last_name, email, class_section_id,
      middle_name, gender, date_of_birth, phone,
      father_name, mother_name, guardian_name, guardian_phone, guardian_email,
      roll_number,
    } = body

    if (!first_name || !last_name || !email || !class_section_id) {
      return NextResponse.json(
        { error: "first_name, last_name, email, and class_section_id are required" },
        { status: 400 }
      )
    }

    // Verify teacher is assigned to this class-section
    const sessRows = await executeQuery<{ id: number }[]>(
      "SELECT id FROM erp_sessions WHERE partner_id = ? AND is_current = 1 LIMIT 1",
      [partnerUserId]
    )
    if (sessRows.length === 0) {
      return NextResponse.json({ error: "No active session" }, { status: 400 })
    }

    const csCheck = await executeQuery<{ id: number }[]>(
      `SELECT ecs.id FROM erp_class_sections ecs
       WHERE ecs.id = ? AND ecs.session_id = ?
         AND (ecs.class_teacher_id = ? OR ecs.second_incharge_id = ?
              OR ecs.id IN (SELECT DISTINCT class_section_id FROM erp_subjects WHERE teacher_id = ?))`,
      [class_section_id, sessRows[0].id, teacherUserId, teacherUserId, teacherUserId]
    )
    if (csCheck.length === 0) {
      return NextResponse.json({ error: "Not authorized for this class" }, { status: 403 })
    }

    let studentId = 0

    await executeTransaction(async (connection) => {
      const [studentResult] = await connection.execute(
        `INSERT INTO students (
          created_by, first_name, last_name, middle_name, gender, date_of_birth,
          email, phone, father_name, mother_name, guardian_name, guardian_phone, guardian_email,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
        [
          teacherUserId, first_name, last_name, middle_name || null,
          gender || null, date_of_birth || null, email, phone || null,
          father_name || null, mother_name || null, guardian_name || null,
          guardian_phone || null, guardian_email || null,
        ]
      )
      studentId = (studentResult as any).insertId

      await connection.execute(
        `INSERT INTO erp_student_enrollments (
          student_id, class_section_id, roll_number, student_type, enrollment_date, status, created_at, updated_at
        ) VALUES (?, ?, ?, 'regular', CURDATE(), 'active', NOW(), NOW())`,
        [studentId, class_section_id, roll_number || null]
      )
    })

    return NextResponse.json(
      { data: { id: studentId }, message: "Student added successfully" },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Teacher student POST error:", error)
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "A student with this email or roll number already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
