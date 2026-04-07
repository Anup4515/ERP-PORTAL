import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery, executeTransaction } from "@/app/lib/db"
import bcrypt from "bcryptjs"

export async function GET() {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const teachers = await executeQuery(
      `SELECT u.id as user_id, u.name, u.email, u.phone_number,
              t.id as teacher_id, t.subject_specialization, t.qualification, t.experience, t.teacher_type, t.date_of_joining
       FROM users u
       JOIN teachers t ON t.user_id = u.id
       WHERE t.partner_id = ? AND u.role_id = 5
       ORDER BY u.name`,
      [ctx.schoolId]
    )

    return NextResponse.json({ data: teachers })
  } catch (error) {
    console.error("Teachers GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const body = await request.json()
    const { name, email, password, phone_number, subject_specialization, qualification, date_of_joining } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "name, email, and password are required" },
        { status: 400 }
      )
    }

    // Auto-calculate experience from date_of_joining
    let experience: number | null = null
    if (date_of_joining) {
      const joiningDate = new Date(date_of_joining)
      const now = new Date()
      experience = Math.max(0, Math.floor((now.getTime() - joiningDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)))
    }

    const hashedPassword = bcrypt.hashSync(password, 10)

    const result = await executeTransaction(async (connection) => {
      // 1. Insert into users
      const [userResult] = await connection.execute(
        `INSERT INTO users (name, email, password, phone_number, role_id, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, 5, ?, NOW(), NOW())`,
        [name, email, hashedPassword, phone_number || null, ctx.userId]
      )
      const newUserId = (userResult as any).insertId

      // 2. Insert into teachers
      const [teacherResult] = await connection.execute(
        `INSERT INTO teachers (user_id, partner_id, subject_specialization, qualification, experience, date_of_joining, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [newUserId, ctx.schoolId, subject_specialization || null, qualification || null, experience, date_of_joining || null]
      )
      const newTeacherId = (teacherResult as any).insertId

      // 3. Update partner_teachers
      const [existingRows] = await connection.execute(
        "SELECT id FROM partner_teachers WHERE partner_id = ?",
        [ctx.partnerUserId]
      )

      if ((existingRows as any[]).length > 0) {
        await connection.execute(
          `UPDATE partner_teachers SET teacher_ids = JSON_ARRAY_APPEND(COALESCE(teacher_ids, JSON_ARRAY()), '$', ?), updated_at = NOW()
           WHERE partner_id = ?`,
          [newUserId, ctx.partnerUserId]
        )
      } else {
        await connection.execute(
          `INSERT INTO partner_teachers (partner_id, teacher_ids, created_at, updated_at)
           VALUES (?, JSON_ARRAY(?), NOW(), NOW())`,
          [ctx.partnerUserId, newUserId]
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
