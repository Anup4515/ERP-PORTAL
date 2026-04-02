import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { executeQuery, executeTransaction } from "@/app/lib/db"
import bcrypt from "bcryptjs"

export async function GET() {
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

    const teachers = await executeQuery(
      `SELECT u.id as user_id, u.name, u.email, u.phone_number,
              t.id as teacher_id, t.subject_specialization, t.qualification, t.experience, t.teacher_type
       FROM users u
       JOIN teachers t ON t.user_id = u.id
       WHERE t.partner_id = ? AND u.role_id = 5
       ORDER BY u.name`,
      [school_id]
    )

    return NextResponse.json({ data: teachers })
  } catch (error) {
    console.error("Teachers GET error:", error)
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
    const { name, email, password, phone_number, subject_specialization, qualification, experience } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "name, email, and password are required" },
        { status: 400 }
      )
    }

    const hashedPassword = bcrypt.hashSync(password, 10)

    const result = await executeTransaction(async (connection) => {
      // 1. Insert into users
      const [userResult] = await connection.execute(
        `INSERT INTO users (name, email, password, phone_number, role_id, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, 5, ?, NOW(), NOW())`,
        [name, email, hashedPassword, phone_number || null, session.user.user_id]
      )
      const newUserId = (userResult as any).insertId

      // 2. Insert into teachers
      const [teacherResult] = await connection.execute(
        `INSERT INTO teachers (user_id, partner_id, subject_specialization, qualification, experience, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [newUserId, school_id, subject_specialization || null, qualification || null, experience || null]
      )
      const newTeacherId = (teacherResult as any).insertId

      // 3. Update partner_teachers
      const [existingRows] = await connection.execute(
        "SELECT id FROM partner_teachers WHERE partner_id = ?",
        [partnerUserId]
      )

      if ((existingRows as any[]).length > 0) {
        await connection.execute(
          `UPDATE partner_teachers SET teacher_ids = JSON_ARRAY_APPEND(COALESCE(teacher_ids, JSON_ARRAY()), '$', ?), updated_at = NOW()
           WHERE partner_id = ?`,
          [newUserId, partnerUserId]
        )
      } else {
        await connection.execute(
          `INSERT INTO partner_teachers (partner_id, teacher_ids, created_at, updated_at)
           VALUES (?, JSON_ARRAY(?), NOW(), NOW())`,
          [partnerUserId, newUserId]
        )
      }

      return {
        user_id: newUserId,
        teacher_id: newTeacherId,
        name,
        email,
        phone_number: phone_number || null,
        subject_specialization: subject_specialization || null,
        qualification: qualification || null,
        experience: experience || null,
      }
    })

    return NextResponse.json(
      { data: result, message: "Teacher created successfully" },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Teachers POST error:", error)
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
