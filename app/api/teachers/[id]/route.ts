import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { executeQuery, executeTransaction } from "@/app/lib/db"

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

    const teachers = await executeQuery(
      `SELECT u.id as user_id, u.name, u.email, u.phone_number,
              t.id as teacher_id, t.subject_specialization, t.qualification, t.experience,
              t.teacher_type, t.bio, t.address, t.profile_image, t.number_of_hours
       FROM users u
       JOIN teachers t ON t.user_id = u.id
       WHERE u.id = ? AND t.partner_id = ? AND u.role_id = 5`,
      [id, school_id]
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

    // Verify teacher belongs to this partner
    const teacherRows = await executeQuery<{ id: number }[]>(
      `SELECT t.id FROM teachers t
       JOIN users u ON u.id = t.user_id
       WHERE t.user_id = ? AND t.partner_id = ? AND u.role_id = 5`,
      [id, school_id]
    )
    if (teacherRows.length === 0) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    const body = await request.json()
    const { name, phone_number, subject_specialization, qualification, experience, bio, address } = body

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
      if (experience !== undefined) {
        teacherFields.push("experience = ?")
        teacherValues.push(experience)
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
        teacherValues.push(id as any, school_id as any)

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

    // Verify teacher belongs to this partner
    const teacherRows = await executeQuery<{ id: number }[]>(
      `SELECT t.id FROM teachers t
       JOIN users u ON u.id = t.user_id
       WHERE t.user_id = ? AND t.partner_id = ? AND u.role_id = 5`,
      [id, school_id]
    )
    if (teacherRows.length === 0) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    // Remove teacher from partner_teachers JSON array
    await executeQuery(
      `UPDATE partner_teachers
       SET teacher_ids = JSON_REMOVE(teacher_ids, JSON_UNQUOTE(JSON_SEARCH(teacher_ids, 'one', ?))),
           updated_at = NOW()
       WHERE partner_id = ?`,
      [id, partnerUserId]
    )

    return NextResponse.json({ message: "Teacher removed successfully" })
  } catch (error) {
    console.error("Teacher DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
