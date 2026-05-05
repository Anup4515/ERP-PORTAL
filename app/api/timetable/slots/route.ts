import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery, executeTransaction } from "@/app/lib/db"

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin", "teacher"])
    if (isAuthError(ctx)) return ctx

    const { searchParams } = new URL(request.url)
    const classSectionId = searchParams.get("class_section_id")

    if (!classSectionId) {
      return NextResponse.json({ error: "class_section_id is required" }, { status: 400 })
    }

    // Verify ownership
    const csCheck = await executeQuery<{ id: number }[]>(
      `SELECT ecs.id FROM erp_class_sections ecs
       JOIN erp_sessions es ON es.id = ecs.session_id
       WHERE ecs.id = ? AND es.partner_id = ?`,
      [classSectionId, ctx.partnerUserId]
    )
    if (csCheck.length === 0) return NextResponse.json({ error: "Class section not found" }, { status: 404 })

    const slots = await executeQuery(
      `SELECT ts.*, sub.name as subject_name,
              COALESCE(u.name, ps.name) as teacher_name
       FROM erp_timetable_slots ts
       LEFT JOIN erp_subjects sub ON sub.id = ts.subject_id
       LEFT JOIN users u ON u.id = ts.teacher_id
       LEFT JOIN partner_staff ps ON ps.id = ts.staff_id
       WHERE ts.class_section_id = ?
       ORDER BY ts.day_of_week ASC, ts.period_number ASC`,
      [classSectionId]
    )

    return NextResponse.json({ data: slots })
  } catch (error) {
    console.error("Timetable slots GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Bulk save slots for a class-section
export async function PUT(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const body = await request.json()
    const { class_section_id, slots } = body
    // slots: Array of { day_of_week, period_number, subject_id, teacher_id, room_number }

    if (!class_section_id || !Array.isArray(slots)) {
      return NextResponse.json({ error: "class_section_id and slots array are required" }, { status: 400 })
    }

    // Verify ownership
    const csCheck = await executeQuery<{ id: number }[]>(
      `SELECT ecs.id FROM erp_class_sections ecs
       JOIN erp_sessions es ON es.id = ecs.session_id
       WHERE ecs.id = ? AND es.partner_id = ?`,
      [class_section_id, ctx.partnerUserId]
    )
    if (csCheck.length === 0) return NextResponse.json({ error: "Class section not found" }, { status: 404 })

    // Check for teacher AND staff conflicts
    const conflicts: string[] = []
    for (const slot of slots) {
      if (!slot.day_of_week || !slot.period_number) continue
      if (!slot.teacher_id && !slot.staff_id) continue

      // Check teacher_id conflict
      if (slot.teacher_id) {
        const conflictRows = await executeQuery<{ id: number; class_section_id: number }[]>(
          `SELECT ts.id, ts.class_section_id FROM erp_timetable_slots ts
           WHERE ts.teacher_id = ? AND ts.day_of_week = ? AND ts.period_number = ?
             AND ts.class_section_id != ?`,
          [slot.teacher_id, slot.day_of_week, slot.period_number, class_section_id]
        )
        if (conflictRows.length > 0) {
          const csInfo = await executeQuery<{ class_name: string; section_name: string }[]>(
            `SELECT c.name as class_name, s.name as section_name
             FROM erp_class_sections ecs JOIN classes c ON c.id = ecs.class_id JOIN sections s ON s.id = ecs.section_id
             WHERE ecs.id = ?`, [conflictRows[0].class_section_id]
          )
          const teacherInfo = await executeQuery<{ name: string }[]>(
            "SELECT name FROM users WHERE id = ?", [slot.teacher_id]
          )
          const tName = teacherInfo.length > 0 ? teacherInfo[0].name : "Teacher"
          const cName = csInfo.length > 0 ? `${csInfo[0].class_name} - ${csInfo[0].section_name}` : "another class"
          conflicts.push(`${tName} is already assigned to ${cName} on ${slot.day_of_week} Period ${slot.period_number}`)
        }
      }

      // Check staff_id conflict
      if (slot.staff_id) {
        const conflictRows = await executeQuery<{ id: number; class_section_id: number }[]>(
          `SELECT ts.id, ts.class_section_id FROM erp_timetable_slots ts
           WHERE ts.staff_id = ? AND ts.day_of_week = ? AND ts.period_number = ?
             AND ts.class_section_id != ?`,
          [slot.staff_id, slot.day_of_week, slot.period_number, class_section_id]
        )
        if (conflictRows.length > 0) {
          const csInfo = await executeQuery<{ class_name: string; section_name: string }[]>(
            `SELECT c.name as class_name, s.name as section_name
             FROM erp_class_sections ecs JOIN classes c ON c.id = ecs.class_id JOIN sections s ON s.id = ecs.section_id
             WHERE ecs.id = ?`, [conflictRows[0].class_section_id]
          )
          const staffInfo = await executeQuery<{ name: string; designation: string }[]>(
            "SELECT name, designation FROM partner_staff WHERE id = ?", [slot.staff_id]
          )
          const sName = staffInfo.length > 0 ? `${staffInfo[0].name} (${staffInfo[0].designation})` : "Staff"
          const cName = csInfo.length > 0 ? `${csInfo[0].class_name} - ${csInfo[0].section_name}` : "another class"
          conflicts.push(`${sName} is already assigned to ${cName} on ${slot.day_of_week} Period ${slot.period_number}`)
        }
      }
    }

    if (conflicts.length > 0) {
      return NextResponse.json({ error: "Conflicts found", conflicts }, { status: 409 })
    }

    await executeTransaction(async (connection) => {
      // Delete existing slots for this class-section
      await connection.execute(
        "DELETE FROM erp_timetable_slots WHERE class_section_id = ?",
        [class_section_id]
      )

      // Insert new slots
      for (const slot of slots) {
        if (!slot.day_of_week || !slot.period_number) continue
        if (!slot.subject_id && !slot.teacher_id && !slot.staff_id) continue // skip empty slots

        await connection.execute(
          `INSERT INTO erp_timetable_slots (class_section_id, day_of_week, period_number, subject_id, teacher_id, staff_id, room_number, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [class_section_id, slot.day_of_week, slot.period_number, slot.subject_id || null, slot.teacher_id || null, slot.staff_id || null, slot.room_number || null]
        )
      }
    })

    return NextResponse.json({ message: "Timetable saved" })
  } catch (error) {
    console.error("Timetable slots PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
