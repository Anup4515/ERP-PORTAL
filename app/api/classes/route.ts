import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { executeQuery } from "@/app/lib/db"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (session.user.role !== "school_admin") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    const school_id = session.user.school_id

    if (!school_id) {
      return NextResponse.json(
        { error: "No partner profile" },
        { status: 400 }
      )
    }

    const partnerRows = await executeQuery<{ user_id: number }[]>(
      "SELECT user_id FROM partners WHERE id = ?",
      [school_id]
    )

    if (partnerRows.length === 0) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      )
    }

    const partnerUserId = partnerRows[0].user_id

    const rows = await executeQuery<Record<string, unknown>[]>(
      `SELECT c.id, c.name, c.code, c.grade_level, c.display_order, c.status,
              s.id as section_id, s.name as section_name, s.room_no,
              ecs.id as class_section_id, ecs.class_teacher_id, ecs.max_students
       FROM classes c
       LEFT JOIN sections s ON s.class_id = c.id AND s.status = 'active'
       LEFT JOIN erp_class_sections ecs ON ecs.class_id = c.id AND ecs.section_id = s.id
         AND ecs.session_id = (SELECT id FROM erp_sessions WHERE partner_id = ? AND is_current = 1 LIMIT 1)
       WHERE c.partner_id = ? AND c.status = 'active'
       ORDER BY c.display_order, c.name, s.name`,
      [partnerUserId, partnerUserId]
    )

    // Group rows by class, nesting sections array under each class
    const classMap = new Map<number, Record<string, unknown>>()

    for (const row of rows) {
      const classId = row.id as number

      if (!classMap.has(classId)) {
        classMap.set(classId, {
          id: row.id,
          name: row.name,
          code: row.code,
          grade_level: row.grade_level,
          display_order: row.display_order,
          status: row.status,
          sections: [],
        })
      }

      if (row.section_id) {
        const cls = classMap.get(classId)!
        ;(cls.sections as Record<string, unknown>[]).push({
          id: row.section_id,
          name: row.section_name,
          room_no: row.room_no,
          class_section_id: row.class_section_id,
          class_teacher_id: row.class_teacher_id,
          max_students: row.max_students,
        })
      }
    }

    const data = Array.from(classMap.values())

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Get classes error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (session.user.role !== "school_admin") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    const school_id = session.user.school_id

    if (!school_id) {
      return NextResponse.json(
        { error: "No partner profile" },
        { status: 400 }
      )
    }

    const partnerRows = await executeQuery<{ user_id: number }[]>(
      "SELECT user_id FROM partners WHERE id = ?",
      [school_id]
    )

    if (partnerRows.length === 0) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      )
    }

    const partnerUserId = partnerRows[0].user_id

    const body = await request.json()
    const { name, code, grade_level, display_order, sections } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Class name is required" },
        { status: 400 }
      )
    }

    // Insert the class
    const classResult = await executeQuery<{ insertId: number }>(
      `INSERT INTO classes (partner_id, name, code, grade_level, display_order, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
      [
        partnerUserId,
        name.trim(),
        code || null,
        grade_level ?? null,
        display_order ?? 0,
      ]
    )

    const classId = classResult.insertId

    // If sections array is provided, create sections and link via erp_class_sections
    const createdSections: { id: number; name: string }[] = []

    if (Array.isArray(sections) && sections.length > 0) {
      // Get current session for linking
      const sessionRows = await executeQuery<{ id: number }[]>(
        "SELECT id FROM erp_sessions WHERE partner_id = ? AND is_current = 1 LIMIT 1",
        [partnerUserId]
      )

      const currentSessionId = sessionRows.length > 0 ? sessionRows[0].id : null

      for (const sectionName of sections) {
        if (typeof sectionName !== "string" || sectionName.trim().length === 0) {
          continue
        }

        const sectionResult = await executeQuery<{ insertId: number }>(
          `INSERT INTO sections (class_id, name, status, created_at, updated_at)
           VALUES (?, ?, 'active', NOW(), NOW())`,
          [classId, sectionName.trim()]
        )

        const sectionId = sectionResult.insertId
        createdSections.push({ id: sectionId, name: sectionName.trim() })

        // Link to current session if one exists
        if (currentSessionId) {
          await executeQuery(
            `INSERT INTO erp_class_sections (session_id, class_id, section_id, created_at, updated_at)
             VALUES (?, ?, ?, NOW(), NOW())`,
            [currentSessionId, classId, sectionId]
          )
        }
      }
    }

    return NextResponse.json(
      {
        data: {
          id: classId,
          name: name.trim(),
          code: code || null,
          grade_level: grade_level ?? null,
          display_order: display_order ?? 0,
          sections: createdSections,
        },
        message: "Class created successfully",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Create class error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
