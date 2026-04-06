import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { executeQuery } from "@/app/lib/db"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const school_id = session.user.school_id
    const teacherUserId = session.user.user_id
    if (!school_id) return NextResponse.json({ error: "No partner profile" }, { status: 400 })

    const partnerRows = await executeQuery<{ user_id: number }[]>(
      "SELECT user_id FROM partners WHERE id = ?", [school_id]
    )
    if (partnerRows.length === 0) return NextResponse.json({ error: "Partner not found" }, { status: 404 })
    const partnerUserId = partnerRows[0].user_id

    // Get period config
    const config = await executeQuery(
      "SELECT * FROM erp_timetable_config WHERE partner_id = ? ORDER BY period_number",
      [partnerUserId]
    )

    // Get all slots for this teacher (teacher's weekly schedule)
    const slots = await executeQuery(
      `SELECT ts.day_of_week, ts.period_number, ts.room_number,
              sub.name as subject_name,
              c.name as class_name, sec.name as section_name
       FROM erp_timetable_slots ts
       JOIN erp_class_sections ecs ON ecs.id = ts.class_section_id
       JOIN erp_sessions es ON es.id = ecs.session_id
       JOIN classes c ON c.id = ecs.class_id
       JOIN sections sec ON sec.id = ecs.section_id
       LEFT JOIN erp_subjects sub ON sub.id = ts.subject_id
       WHERE ts.teacher_id = ? AND es.partner_id = ? AND es.is_current = 1
       ORDER BY FIELD(ts.day_of_week, 'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'), ts.period_number`,
      [teacherUserId, partnerUserId]
    )

    // Get assigned classes (as class teacher, second incharge, or subject teacher)
    const assignedClasses = await executeQuery(
      `SELECT DISTINCT ecs.id as class_section_id, c.name as class_name, sec.name as section_name
       FROM erp_class_sections ecs
       JOIN erp_sessions es ON es.id = ecs.session_id
       JOIN classes c ON c.id = ecs.class_id
       JOIN sections sec ON sec.id = ecs.section_id
       WHERE es.partner_id = ? AND es.is_current = 1
         AND (ecs.class_teacher_id = ? OR ecs.second_incharge_id = ?
              OR ecs.id IN (SELECT class_section_id FROM erp_subjects WHERE teacher_id = ?))
       ORDER BY c.name, sec.name`,
      [partnerUserId, teacherUserId, teacherUserId, teacherUserId]
    )

    // Get class_section_id from query params for class timetable view
    const url = new URL(request.url)
    const classSectionId = url.searchParams.get("class_section_id")

    let classSlots: any[] = []
    if (classSectionId) {
      // Verify teacher has access to this class
      const hasAccess = (assignedClasses as any[]).some(
        (c: any) => String(c.class_section_id) === classSectionId
      )
      if (hasAccess) {
        classSlots = await executeQuery(
          `SELECT ts.day_of_week, ts.period_number, ts.room_number,
                  sub.name as subject_name,
                  u.name as teacher_name
           FROM erp_timetable_slots ts
           LEFT JOIN erp_subjects sub ON sub.id = ts.subject_id
           LEFT JOIN teachers t ON t.id = ts.teacher_id
           LEFT JOIN users u ON u.id = t.user_id
           WHERE ts.class_section_id = ?
           ORDER BY FIELD(ts.day_of_week, 'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'), ts.period_number`,
          [classSectionId]
        ) as any[]
      }
    }

    return NextResponse.json({ data: { config, slots, assigned_classes: assignedClasses, class_slots: classSlots } })
  } catch (error) {
    console.error("Teacher timetable GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
