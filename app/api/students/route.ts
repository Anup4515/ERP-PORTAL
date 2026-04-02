import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { executeQuery, executeTransaction } from "@/app/lib/db"

export async function GET(request: Request) {
  try {
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

    const { searchParams } = new URL(request.url)
    const classSectionId = searchParams.get("class_section_id")
    const search = searchParams.get("search")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)))
    const offset = (page - 1) * limit

    let whereClause = "WHERE es.partner_id = ? AND es.is_current = 1 AND st.deleted_at IS NULL"
    const queryParams: (string | number)[] = [partnerUserId]

    if (classSectionId) {
      whereClause += " AND e.class_section_id = ?"
      queryParams.push(Number(classSectionId))
    }

    if (search) {
      whereClause += " AND (st.first_name LIKE ? OR st.last_name LIKE ?)"
      const searchPattern = `%${search}%`
      queryParams.push(searchPattern, searchPattern)
    }

    const countResult = await executeQuery<{ total: number }[]>(
      `SELECT COUNT(*) as total
       FROM students st
       JOIN erp_student_enrollments e ON e.student_id = st.id
       JOIN erp_class_sections ecs ON ecs.id = e.class_section_id
       JOIN erp_sessions es ON es.id = ecs.session_id
       ${whereClause}`,
      queryParams
    )
    const total = countResult[0].total

    const students = await executeQuery(
      `SELECT st.*, e.id as enrollment_id, e.class_section_id, e.roll_number, e.student_type, e.status as enrollment_status,
              c.name as class_name, sec.name as section_name
       FROM students st
       JOIN erp_student_enrollments e ON e.student_id = st.id
       JOIN erp_class_sections ecs ON ecs.id = e.class_section_id
       JOIN erp_sessions es ON es.id = ecs.session_id
       JOIN classes c ON c.id = ecs.class_id
       JOIN sections sec ON sec.id = ecs.section_id
       ${whereClause}
       ORDER BY st.first_name, st.last_name
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      queryParams
    )

    return NextResponse.json({ data: { students, total, page, limit } })
  } catch (error) {
    console.error("Students GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
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
    const {
      first_name, last_name, email, class_section_id,
      middle_name, gender, date_of_birth, phone, alternate_phone,
      address, city, state, country, postal_code,
      father_name, mother_name, guardian_name, guardian_phone, guardian_email,
      profile_image, status, height, weight, blood_group,
      roll_number, student_type
    } = body

    if (!first_name || !last_name || !email || !class_section_id) {
      return NextResponse.json(
        { error: "first_name, last_name, email, and class_section_id are required" },
        { status: 400 }
      )
    }

    // Verify class_section_id belongs to this partner
    const ownershipCheck = await executeQuery<{ id: number }[]>(
      `SELECT ecs.id FROM erp_class_sections ecs
       JOIN erp_sessions es ON es.id = ecs.session_id
       WHERE ecs.id = ? AND es.partner_id = ?`,
      [class_section_id, partnerUserId]
    )
    if (ownershipCheck.length === 0) {
      return NextResponse.json({ error: "Class section not found" }, { status: 404 })
    }

    let studentId: number = 0

    await executeTransaction(async (connection) => {
      const [studentResult] = await connection.execute(
        `INSERT INTO students (
          created_by, first_name, last_name, middle_name, gender, date_of_birth,
          email, phone, alternate_phone, address, city, state, country, postal_code,
          father_name, mother_name, guardian_name, guardian_phone, guardian_email,
          profile_image, status, height, weight, blood_group, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          session.user.user_id || null, first_name, last_name, middle_name || null,
          gender || null, date_of_birth || null, email, phone || null, alternate_phone || null,
          address || null, city || null, state || null, country || null, postal_code || null,
          father_name || null, mother_name || null, guardian_name || null,
          guardian_phone || null, guardian_email || null, profile_image || null,
          status || "active", height || null, weight || null, blood_group || null
        ]
      )
      studentId = (studentResult as any).insertId

      await connection.execute(
        `INSERT INTO erp_student_enrollments (
          student_id, class_section_id, roll_number, student_type, enrollment_date, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, CURDATE(), 'active', NOW(), NOW())`,
        [studentId, class_section_id, roll_number || null, student_type || "regular"]
      )
    })

    return NextResponse.json(
      { data: { id: studentId }, message: "Student created successfully" },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Students POST error:", error)
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "A student with this email or roll number already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
