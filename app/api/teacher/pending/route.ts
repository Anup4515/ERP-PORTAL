/**
 * GET /api/teacher/pending
 *
 * Two action lists for today:
 *  - Class-sections where the teacher is in charge but attendance isn't marked yet today.
 *  - Exams whose end_date has passed for class-sections this teacher owns or teaches a
 *    subject in, where marks entry is incomplete (< student_count marks rows).
 */

import { NextResponse } from "next/server";
import { executeQuery } from "@/app/lib/db";
import { getAuthContext, isAuthError, resolveSessionId, isSessionError } from "@/app/lib/auth-utils";

interface UnmarkedRow {
  class_section_id: number;
  class_name: string;
  section_name: string;
  student_count: number;
}

interface PendingMarksRow {
  exam_id: number;
  exam_name: string;
  class_section_id: number;
  class_name: string;
  section_name: string;
  subject_id: number;
  subject_name: string;
  student_count: number;
  marks_entered: number;
  end_date: string | null;
}

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["teacher"]);
    if (isAuthError(ctx)) return ctx;

    const sess = await resolveSessionId(request, ctx.partnerUserId);
    if (isSessionError(sess)) return sess;

    if (sess.sessionId === null) {
      return NextResponse.json({
        data: { unmarked_attendance: [], pending_marks: [] },
      });
    }

    const teacherId = ctx.userId;

    // 1) Attendance unmarked today — only class_teacher or second_incharge classes
    //    (subject teachers aren't responsible for attendance).
    const unmarked = await executeQuery<UnmarkedRow[]>(
      `SELECT cs.id  AS class_section_id,
              c.name AS class_name,
              sec.name AS section_name,
              COUNT(DISTINCT CASE WHEN se.status IN ('active','completed') THEN se.student_id END) AS student_count
         FROM erp_class_sections cs
         JOIN classes c   ON c.id = cs.class_id
         JOIN sections sec ON sec.id = cs.section_id
         LEFT JOIN erp_student_enrollments se ON se.class_section_id = cs.id
         LEFT JOIN erp_attendance_records ar
              ON ar.student_enrollment_id = se.id AND ar.date = CURDATE()
        WHERE cs.session_id = ?
          AND (cs.class_teacher_id = ? OR cs.second_incharge_id = ?)
        GROUP BY cs.id, c.name, sec.name
        HAVING student_count > 0
           AND SUM(CASE WHEN ar.id IS NOT NULL THEN 1 ELSE 0 END) = 0
        ORDER BY c.grade_level ASC, sec.name ASC`,
      [sess.sessionId, teacherId, teacherId]
    );

    // 2) Pending marks — exams whose end_date has passed within the last 60 days,
    //    for subjects this teacher teaches, with incomplete marks entry.
    const pendingMarks = await executeQuery<PendingMarksRow[]>(
      `SELECT e.id   AS exam_id,
              e.name AS exam_name,
              cs.id  AS class_section_id,
              c.name AS class_name,
              sec.name AS section_name,
              s.id  AS subject_id,
              s.name AS subject_name,
              e.end_date,
              (SELECT COUNT(DISTINCT se.student_id)
                 FROM erp_student_enrollments se
                WHERE se.class_section_id = cs.id
                  AND se.status IN ('active','completed')) AS student_count,
              (SELECT COUNT(*)
                 FROM erp_marks m
                 JOIN erp_student_enrollments se2 ON se2.id = m.student_enrollment_id
                WHERE m.exam_id = e.id
                  AND m.subject_id = s.id
                  AND se2.class_section_id = cs.id) AS marks_entered
         FROM erp_exams e
         JOIN erp_class_sections cs ON cs.id = e.class_section_id
         JOIN classes  c   ON c.id = cs.class_id
         JOIN sections sec ON sec.id = cs.section_id
         JOIN erp_subjects s ON s.class_section_id = cs.id AND s.teacher_id = ?
        WHERE cs.session_id = ?
          AND e.end_date IS NOT NULL
          AND e.end_date < CURDATE()
          AND e.end_date >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)
          AND e.status IN ('completed', 'in_progress')
        ORDER BY e.end_date DESC
        LIMIT 10`,
      [teacherId, sess.sessionId]
    );

    // Filter out exams where marks are fully entered.
    const pending = pendingMarks.filter(
      (r) => Number(r.student_count) > 0 && Number(r.marks_entered) < Number(r.student_count)
    );

    return NextResponse.json({
      data: {
        unmarked_attendance: unmarked.map((r) => ({
          class_section_id: r.class_section_id,
          class_name: r.class_name,
          section_name: r.section_name,
          student_count: Number(r.student_count) || 0,
        })),
        pending_marks: pending.map((r) => ({
          exam_id: r.exam_id,
          exam_name: r.exam_name,
          class_section_id: r.class_section_id,
          class_name: r.class_name,
          section_name: r.section_name,
          subject_id: r.subject_id,
          subject_name: r.subject_name,
          student_count: Number(r.student_count) || 0,
          marks_entered: Number(r.marks_entered) || 0,
          end_date: r.end_date,
        })),
      },
    });
  } catch (error) {
    console.error("/api/teacher/pending error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
