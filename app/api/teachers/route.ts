import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery, executeTransaction } from "@/app/lib/db"
import bcrypt from "bcryptjs"
import { createTeacherSchema, parseOrError } from "@/app/lib/validations"

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)))
    const offset = (page - 1) * limit

    let whereClause = "WHERE t.partner_id = ? AND u.role_id = 5"
    const queryParams: (string | number)[] = [ctx.schoolId]

    if (search) {
      whereClause += " AND (u.name LIKE ? OR u.email LIKE ? OR t.subject_specialization LIKE ?)"
      const pattern = `%${search}%`
      queryParams.push(pattern, pattern, pattern)
    }

    const countResult = await executeQuery<{ total: number }[]>(
      `SELECT COUNT(*) as total FROM users u JOIN teachers t ON t.user_id = u.id ${whereClause}`,
      queryParams
    )
    const total = countResult[0].total

    const teachers = await executeQuery(
      `SELECT u.id as user_id, u.name, u.email, u.phone_number,
              t.id as teacher_id, t.subject_specialization, t.qualification, t.experience, t.teacher_type, t.date_of_joining
       FROM users u
       JOIN teachers t ON t.user_id = u.id
       ${whereClause}
       ORDER BY u.name
       LIMIT ${limit} OFFSET ${offset}`,
      queryParams
    )

    return NextResponse.json({ data: { teachers, total, page, limit } })
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
    const parsed = parseOrError(createTeacherSchema, body)
    if (!parsed.success) return parsed.response

    const { name, email, password, phone_number, subject_specialization, qualification, date_of_joining } = parsed.data

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
      const [userRows] = await connection.execute<{ id: number }[]>(
        `INSERT INTO users (name, email, password, phone_number, role_id, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, 5, ?, NOW(), NOW())
         RETURNING id`,
        [name, email, hashedPassword, phone_number || null, ctx.userId]
      )
      const newUserId = userRows[0].id

      // 2. Insert into teachers
      const [teacherRows] = await connection.execute<{ id: number }[]>(
        `INSERT INTO teachers (user_id, partner_id, subject_specialization, qualification, experience, date_of_joining, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
         RETURNING id`,
        [newUserId, ctx.schoolId, subject_specialization || null, qualification || null, experience, date_of_joining || null]
      )
      const newTeacherId = teacherRows[0].id

      // 3. Update partner_teachers (legacy JSON-array bridge).
      // PG: append to a jsonb array via teacher_ids || to_jsonb(?::int).
      const [existingRows] = await connection.execute<{ id: number }[]>(
        "SELECT id FROM partner_teachers WHERE partner_id = ?",
        [ctx.partnerUserId]
      )

      if (existingRows.length > 0) {
        await connection.execute(
          `UPDATE partner_teachers
              SET teacher_ids = COALESCE(teacher_ids, '[]'::jsonb) || to_jsonb(?::bigint),
                  updated_at = NOW()
            WHERE partner_id = ?`,
          [newUserId, ctx.partnerUserId]
        )
      } else {
        await connection.execute(
          `INSERT INTO partner_teachers (partner_id, teacher_ids, created_at, updated_at)
           VALUES (?, jsonb_build_array(?::bigint), NOW(), NOW())`,
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
    if (error?.code === "23505") {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
