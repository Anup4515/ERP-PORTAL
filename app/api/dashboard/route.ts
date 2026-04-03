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

    const { role, school_id, user_id } = session.user

    if (!school_id) {
      return NextResponse.json(
        { error: "No partner profile associated" },
        { status: 400 }
      )
    }

    // Resolve the partner's user_id from partners.id (school_id)
    // erp_* tables use partner_id = users.id, but school_id = partners.id
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

    if (role === "school_admin") {
      const stats = await getSchoolAdminStats(partnerUserId)
      return NextResponse.json({ data: stats })
    }

    if (role === "teacher") {
      const stats = await getTeacherStats(partnerUserId, user_id)
      return NextResponse.json({ data: stats })
    }

    return NextResponse.json(
      { error: "Invalid role" },
      { status: 403 }
    )
  } catch (error) {
    console.error("Dashboard error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function getSchoolAdminStats(partnerUserId: number) {
  // Get current session
  const sessionRows = await executeQuery<{ id: number }[]>(
    "SELECT id FROM erp_sessions WHERE partner_id = ? AND is_current = 1 LIMIT 1",
    [partnerUserId]
  )

  const currentSessionId = sessionRows.length > 0 ? sessionRows[0].id : null

  // Total students (enrollments → class_sections → session for partner scoping)
  const studentRows = await executeQuery<{ count: number }[]>(
    `SELECT COUNT(DISTINCT se.student_id) as count
     FROM erp_student_enrollments se
     JOIN erp_class_sections cs ON se.class_section_id = cs.id
     WHERE cs.session_id = ?
       AND se.status = 'active'`,
    [currentSessionId]
  )
  const totalStudents = studentRows[0]?.count || 0

  // Total teachers (partner_teachers stores a JSON array of teacher user IDs)
  const teacherRows = await executeQuery<{ count: number }[]>(
    "SELECT COALESCE(JSON_LENGTH(teacher_ids), 0) as count FROM partner_teachers WHERE partner_id = ?",
    [partnerUserId]
  )
  const totalTeachers = teacherRows[0]?.count || 0

  // Today's attendance percentage
  // erp_attendance_records links via student_enrollment_id → erp_student_enrollments → erp_class_sections → session
  const attendanceRows = await executeQuery<{ total: number; present: number }[]>(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present
     FROM erp_attendance_records ar
     JOIN erp_student_enrollments se ON ar.student_enrollment_id = se.id
     JOIN erp_class_sections cs ON se.class_section_id = cs.id
     WHERE cs.session_id = ?
       AND ar.date = CURDATE()`,
    [currentSessionId]
  )
  const total = attendanceRows[0]?.total || 0
  const present = attendanceRows[0]?.present || 0
  const attendancePercentage = total > 0 ? Math.round((present / total) * 100) : 0

  // Upcoming exams (erp_exams links via class_section_id → erp_class_sections → session)
  const examRows = await executeQuery<Record<string, unknown>[]>(
    `SELECT e.id, e.name, e.start_date, e.end_date, e.status,
            c.name as class_name, sec.name as section_name
     FROM erp_exams e
     JOIN erp_class_sections cs ON e.class_section_id = cs.id
     JOIN classes c ON c.id = cs.class_id
     JOIN sections sec ON sec.id = cs.section_id
     WHERE cs.session_id = ?
       AND (e.status = 'upcoming' OR e.status = 'in_progress')
     ORDER BY e.start_date ASC
     LIMIT 5`,
    [currentSessionId]
  )

  return {
    totalStudents,
    totalTeachers,
    todayAttendance: attendancePercentage,
    upcomingExams: examRows.length,
    upcomingExamsList: examRows,
  }
}

async function getTeacherStats(partnerUserId: number, teacherUserId: number) {
  // Get current session
  const sessionRows = await executeQuery<{ id: number }[]>(
    "SELECT id FROM erp_sessions WHERE partner_id = ? AND is_current = 1 LIMIT 1",
    [partnerUserId]
  )

  const currentSessionId = sessionRows.length > 0 ? sessionRows[0].id : null

  // Assigned classes: class_teacher, second_incharge, or subject teacher
  const classRows = await executeQuery<{ count: number }[]>(
    `SELECT COUNT(DISTINCT ecs.id) as count
     FROM erp_class_sections ecs
     WHERE ecs.session_id = ?
       AND (
         ecs.class_teacher_id = ?
         OR ecs.second_incharge_id = ?
         OR ecs.id IN (SELECT DISTINCT class_section_id FROM erp_subjects WHERE teacher_id = ?)
       )`,
    [currentSessionId, teacherUserId, teacherUserId, teacherUserId]
  )
  const myClasses = classRows[0]?.count || 0

  // Students across assigned classes
  const studentRows = await executeQuery<{ count: number }[]>(
    `SELECT COUNT(DISTINCT se.student_id) as count
     FROM erp_student_enrollments se
     JOIN erp_class_sections ecs ON ecs.id = se.class_section_id
     WHERE ecs.session_id = ?
       AND se.status = 'active'
       AND (
         ecs.class_teacher_id = ?
         OR ecs.second_incharge_id = ?
         OR ecs.id IN (SELECT DISTINCT class_section_id FROM erp_subjects WHERE teacher_id = ?)
       )`,
    [currentSessionId, teacherUserId, teacherUserId, teacherUserId]
  )
  const myStudents = studentRows[0]?.count || 0

  return {
    myClasses,
    myStudents,
    pendingMarks: 0,
  }
}
