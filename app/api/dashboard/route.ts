import { NextResponse } from "next/server"
import { executeQuery } from "@/app/lib/db"
import { getAuthContext, isAuthError, resolveSessionId, isSessionError } from "@/app/lib/auth-utils"

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin", "teacher"])
    if (isAuthError(ctx)) return ctx

    const sess = await resolveSessionId(request, ctx.partnerUserId)
    if (isSessionError(sess)) return sess

    // No session yet — return empty stats
    if (sess.sessionId === null) {
      return NextResponse.json({
        data: {
          total_students: 0, total_teachers: 0, total_classes: 0,
          attendance_percentage: 0, upcoming_exams: [], recent_exams: [],
        },
      })
    }

    if (ctx.role === "school_admin") {
      const stats = await getSchoolAdminStats(ctx.partnerUserId, sess.sessionId)
      return NextResponse.json({ data: stats })
    }

    if (ctx.role === "teacher") {
      const stats = await getTeacherStats(ctx.partnerUserId, ctx.userId, sess.sessionId)
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

async function getSchoolAdminStats(partnerUserId: number, sessionId: number) {
  const currentSessionId = sessionId

  // Total students (enrollments → class_sections → session for partner scoping)
  const studentRows = await executeQuery<{ count: number }[]>(
    `SELECT COUNT(DISTINCT se.student_id) as count
     FROM erp_student_enrollments se
     JOIN erp_class_sections cs ON se.class_section_id = cs.id
     WHERE cs.session_id = ?
       AND se.status IN ('active', 'completed')`,
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

async function getTeacherStats(partnerUserId: number, teacherUserId: number, sessionId: number) {
  const currentSessionId = sessionId

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
       AND se.status IN ('active', 'completed')
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
