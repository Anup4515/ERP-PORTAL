import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery, executeTransaction } from "@/app/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const teachers = await executeQuery(
      `SELECT u.id as user_id, u.name, u.email, u.phone_number,
              t.id as teacher_id, t.subject_specialization, t.qualification, t.experience,
              t.teacher_type, t.bio, t.address, t.profile_image, t.number_of_hours, t.date_of_joining
       FROM users u
       JOIN teachers t ON t.user_id = u.id
       WHERE u.id = ? AND t.partner_id = ? AND u.role_id = 5`,
      [id, ctx.schoolId]
    )

    if ((teachers as any[]).length === 0) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    return NextResponse.json({ data: (teachers as any[])[0] })
  } catch (error) {
    console.error("Teacher GET error:", error)
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

    // Verify teacher belongs to this partner
    const teacherRows = await executeQuery<{ id: number }[]>(
      `SELECT t.id FROM teachers t
       JOIN users u ON u.id = t.user_id
       WHERE t.user_id = ? AND t.partner_id = ? AND u.role_id = 5`,
      [id, ctx.schoolId]
    )
    if (teacherRows.length === 0) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    const body = await request.json()
    const { name, phone_number, subject_specialization, qualification, date_of_joining, bio, address } = body

    await executeTransaction(async (connection) => {
      // Update users table
      if (name !== undefined || phone_number !== undefined) {
        const userFields: string[] = []
        const userValues: (string | number | null)[] = []

        if (name !== undefined) {
          userFields.push("name = ?")
          userValues.push(name)
        }
        if (phone_number !== undefined) {
          userFields.push("phone_number = ?")
          userValues.push(phone_number)
        }

        userFields.push("updated_at = NOW()")
        userValues.push(id as any)

        await connection.execute(
          `UPDATE users SET ${userFields.join(", ")} WHERE id = ?`,
          userValues
        )
      }

      // Update teachers table
      const teacherFields: string[] = []
      const teacherValues: (string | number | null)[] = []

      if (subject_specialization !== undefined) {
        teacherFields.push("subject_specialization = ?")
        teacherValues.push(subject_specialization)
      }
      if (qualification !== undefined) {
        teacherFields.push("qualification = ?")
        teacherValues.push(qualification)
      }
      if (date_of_joining !== undefined) {
        teacherFields.push("date_of_joining = ?")
        teacherValues.push(date_of_joining || null)
        // Auto-calculate experience from date_of_joining
        if (date_of_joining) {
          const joiningDate = new Date(date_of_joining)
          const now = new Date()
          const exp = Math.max(0, Math.floor((now.getTime() - joiningDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)))
          teacherFields.push("experience = ?")
          teacherValues.push(exp)
        } else {
          teacherFields.push("experience = ?")
          teacherValues.push(null)
        }
      }
      if (bio !== undefined) {
        teacherFields.push("bio = ?")
        teacherValues.push(bio)
      }
      if (address !== undefined) {
        teacherFields.push("address = ?")
        teacherValues.push(address)
      }

      if (teacherFields.length > 0) {
        teacherFields.push("updated_at = NOW()")
        teacherValues.push(id as any, ctx.schoolId as any)

        await connection.execute(
          `UPDATE teachers SET ${teacherFields.join(", ")} WHERE user_id = ? AND partner_id = ?`,
          teacherValues
        )
      }
    })

    return NextResponse.json({ message: "Teacher updated successfully" })
  } catch (error) {
    console.error("Teacher PUT error:", error)
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

    // Verify teacher belongs to this partner
    const teacherRows = await executeQuery<{ id: number }[]>(
      `SELECT t.id FROM teachers t
       JOIN users u ON u.id = t.user_id
       WHERE t.user_id = ? AND t.partner_id = ? AND u.role_id = 5`,
      [id, ctx.schoolId]
    )
    if (teacherRows.length === 0) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    await executeTransaction(async (connection) => {
      // 1. Remove teacher from partner_teachers JSON array
      const [ptRows] = await connection.execute(
        `SELECT id, teacher_ids FROM partner_teachers WHERE partner_id = ?`,
        [ctx.partnerUserId]
      )
      if ((ptRows as any[]).length > 0) {
        // PG: rebuild the jsonb array dropping any element equal to the
        // teacher's user_id. jsonb_array_elements + jsonb_agg is the canonical
        // pattern; COALESCE protects against an empty result becoming NULL.
        await connection.execute(
          `UPDATE partner_teachers
           SET teacher_ids = COALESCE((
             SELECT jsonb_agg(elem)
               FROM jsonb_array_elements(teacher_ids) elem
              WHERE elem <> ?::jsonb
           ), '[]'::jsonb), updated_at = NOW()
           WHERE partner_id = ?`,
          [JSON.stringify(Number(id)), ctx.partnerUserId]
        )
      }

      // 2. Unassign from class sections (class_teacher / second_incharge)
      await connection.execute(
        `UPDATE erp_class_sections SET class_teacher_id = NULL, updated_at = NOW()
         WHERE class_teacher_id = ?`,
        [id]
      )
      await connection.execute(
        `UPDATE erp_class_sections SET second_incharge_id = NULL, updated_at = NOW()
         WHERE second_incharge_id = ?`,
        [id]
      )

      // 3. Unassign from subjects
      await connection.execute(
        `UPDATE erp_subjects SET teacher_id = NULL, updated_at = NOW()
         WHERE teacher_id = ?`,
        [id]
      )

      // 4. Delete teacher record
      await connection.execute(
        `DELETE FROM teachers WHERE user_id = ? AND partner_id = ?`,
        [id, ctx.schoolId]
      )

      // 5. Delete user record
      await connection.execute(
        `DELETE FROM users WHERE id = ? AND role_id = 5`,
        [id]
      )
    })

    return NextResponse.json({ message: "Teacher deleted successfully" })
  } catch (error) {
    console.error("Teacher DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
