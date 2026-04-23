import { NextResponse } from "next/server";
import { executeQuery } from "@/app/lib/db";
import { getAuthContext, isAuthError, resolveSessionId, isSessionError } from "@/app/lib/auth-utils";

interface ClassBreakdownRow {
  class_section_id: number;
  class_id: number;
  class_name: string;
  section_name: string;
  grade_level: number | null;
  student_count: number;
  present_today: number;
  total_marked_today: number;
}

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin"]);
    if (isAuthError(ctx)) return ctx;

    const sess = await resolveSessionId(request, ctx.partnerUserId);
    if (isSessionError(sess)) return sess;

    if (sess.sessionId === null) {
      return NextResponse.json({ data: [] });
    }

    const rows = await executeQuery<ClassBreakdownRow[]>(
      `SELECT
         cs.id                                                  AS class_section_id,
         c.id                                                   AS class_id,
         c.name                                                 AS class_name,
         sec.name                                               AS section_name,
         c.grade_level                                          AS grade_level,
         COUNT(DISTINCT CASE WHEN se.status IN ('active','completed') THEN se.student_id END) AS student_count,
         COUNT(DISTINCT CASE WHEN ar.date = CURDATE() AND ar.status = 'present' THEN ar.id END) AS present_today,
         COUNT(DISTINCT CASE WHEN ar.date = CURDATE() THEN ar.id END)                           AS total_marked_today
       FROM erp_class_sections cs
       JOIN classes c   ON c.id   = cs.class_id
       JOIN sections sec ON sec.id = cs.section_id
       LEFT JOIN erp_student_enrollments se ON se.class_section_id = cs.id
       LEFT JOIN erp_attendance_records  ar ON ar.student_enrollment_id = se.id AND ar.date = CURDATE()
       WHERE cs.session_id = ?
       GROUP BY cs.id, c.id, c.name, sec.name, c.grade_level, c.display_order
       ORDER BY c.display_order ASC, c.grade_level ASC, c.name ASC, sec.name ASC`,
      [sess.sessionId]
    );

    const data = rows.map((r) => {
      const total = Number(r.total_marked_today) || 0;
      const present = Number(r.present_today) || 0;
      const percentage = total > 0 ? Math.round((present / total) * 100) : null;
      return {
        class_section_id: r.class_section_id,
        class_id: r.class_id,
        class_name: r.class_name,
        section_name: r.section_name,
        grade_level: r.grade_level,
        student_count: Number(r.student_count) || 0,
        present_today: present,
        total_marked_today: total,
        attendance_percentage: percentage,
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Class breakdown error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
