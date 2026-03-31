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

  // Total students
  const studentRows = await executeQuery<{ count: number }[]>(
    `SELECT COUNT(DISTINCT se.student_id) as count
     FROM erp_student_enrollments se
     JOIN erp_class_sections cs ON se.class_section_id = cs.id
     WHERE cs.partner_id = ?
       AND se.session_id = ?
       AND se.status = 'active'`,
    [partnerUserId, currentSessionId]
  )
  const totalStudents = studentRows[0]?.count || 0

  // Total teachers
  const teacherRows = await executeQuery<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM partner_teachers WHERE partner_id = ? AND status = 'active'",
    [partnerUserId]
  )
  const totalTeachers = teacherRows[0]?.count || 0

  // Today's attendance percentage
  const attendanceRows = await executeQuery<{ total: number; present: number }[]>(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
     FROM erp_student_attendance
     WHERE partner_id = ?
       AND session_id = ?
       AND date = CURDATE()`,
    [partnerUserId, currentSessionId]
  )
  const total = attendanceRows[0]?.total || 0
  const present = attendanceRows[0]?.present || 0
  const attendancePercentage = total > 0 ? Math.round((present / total) * 100) : 0

  // Upcoming exams
  const examRows = await executeQuery<Record<string, unknown>[]>(
    `SELECT id, exam_name, start_date, end_date
     FROM erp_exams
     WHERE partner_id = ?
       AND session_id = ?
       AND start_date >= CURDATE()
     ORDER BY start_date ASC
     LIMIT 5`,
    [partnerUserId, currentSessionId]
  )

  return {
    totalStudents,
    totalTeachers,
    attendancePercentage,
    upcomingExams: examRows,
  }
}

async function getTeacherStats(partnerUserId: number, teacherUserId: number) {
  // Get current session
  const sessionRows = await executeQuery<{ id: number }[]>(
    "SELECT id FROM erp_sessions WHERE partner_id = ? AND is_current = 1 LIMIT 1",
    [partnerUserId]
  )

  const currentSessionId = sessionRows.length > 0 ? sessionRows[0].id : null

  // Assigned classes count
  const classRows = await executeQuery<{ count: number }[]>(
    `SELECT COUNT(DISTINCT class_section_id) as count
     FROM erp_subject_assignments
     WHERE partner_id = ?
       AND teacher_id = ?
       AND session_id = ?`,
    [partnerUserId, teacherUserId, currentSessionId]
  )
  const assignedClasses = classRows[0]?.count || 0

  // Students count across assigned classes
  const studentRows = await executeQuery<{ count: number }[]>(
    `SELECT COUNT(DISTINCT se.student_id) as count
     FROM erp_student_enrollments se
     WHERE se.session_id = ?
       AND se.status = 'active'
       AND se.class_section_id IN (
         SELECT DISTINCT class_section_id
         FROM erp_subject_assignments
         WHERE partner_id = ?
           AND teacher_id = ?
           AND session_id = ?
       )`,
    [currentSessionId, partnerUserId, teacherUserId, currentSessionId]
  )
  const totalStudents = studentRows[0]?.count || 0

  // Pending marks (exams where marks haven't been entered yet)
  const pendingRows = await executeQuery<{ count: number }[]>(
    `SELECT COUNT(*) as count
     FROM erp_exam_subjects es
     JOIN erp_exams e ON es.exam_id = e.id
     WHERE e.partner_id = ?
       AND e.session_id = ?
       AND es.subject_id IN (
         SELECT DISTINCT subject_id
         FROM erp_subject_assignments
         WHERE partner_id = ?
           AND teacher_id = ?
           AND session_id = ?
       )
       AND es.id NOT IN (
         SELECT DISTINCT exam_subject_id
         FROM erp_marks
         WHERE partner_id = ?
       )`,
    [
      partnerUserId,
      currentSessionId,
      partnerUserId,
      teacherUserId,
      currentSessionId,
      partnerUserId,
    ]
  )
  const pendingMarks = pendingRows[0]?.count || 0

  return {
    assignedClasses,
    totalStudents,
    pendingMarks,
  }
}
