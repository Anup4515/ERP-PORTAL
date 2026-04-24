/**
 * GET /api/teacher/classes/attendance-trend?days=7
 *
 * Per-class daily attendance % for classes this teacher is in charge of
 * (class_teacher / second_incharge). Returns a padded series of N days so
 * the chart always has the same number of bars even on days with no data.
 */

import { NextResponse } from "next/server";
import { executeQuery } from "@/app/lib/db";
import { getAuthContext, isAuthError, resolveSessionId, isSessionError } from "@/app/lib/auth-utils";

interface ClassRow {
  class_section_id: number;
  class_name: string;
  section_name: string;
}

interface DailyRow {
  class_section_id: number;
  date: string;
  total: number;
  present: number;
}

interface HolidayRow {
  date: string;
  is_holiday: number;
  holiday_reason: string | null;
}

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["teacher"]);
    if (isAuthError(ctx)) return ctx;

    const sess = await resolveSessionId(request, ctx.partnerUserId);
    if (isSessionError(sess)) return sess;

    const { searchParams } = new URL(request.url);
    const daysParam = parseInt(searchParams.get("days") || "7", 10);
    const days = [7, 14, 30].includes(daysParam) ? daysParam : 7;

    if (sess.sessionId === null) {
      return NextResponse.json({ data: [] });
    }

    const teacherId = ctx.userId;

    // 1) Resolve the teacher's classes (class_teacher / second_incharge only).
    const classes = await executeQuery<ClassRow[]>(
      `SELECT cs.id AS class_section_id,
              c.name  AS class_name,
              sec.name AS section_name
         FROM erp_class_sections cs
         JOIN classes c   ON c.id = cs.class_id
         JOIN sections sec ON sec.id = cs.section_id
        WHERE cs.session_id = ?
          AND (cs.class_teacher_id = ? OR cs.second_incharge_id = ?)
        ORDER BY c.grade_level ASC, sec.name ASC`,
      [sess.sessionId, teacherId, teacherId]
    );

    if (classes.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const csIds = classes.map((c) => c.class_section_id);
    const placeholders = csIds.map(() => "?").join(",");

    // 2) Daily aggregation for those classes over the window.
    const rows = await executeQuery<DailyRow[]>(
      `SELECT se.class_section_id,
              DATE_FORMAT(ar.date, '%Y-%m-%d') AS date,
              COUNT(*) AS total,
              SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) AS present
         FROM erp_attendance_records ar
         JOIN erp_student_enrollments se ON se.id = ar.student_enrollment_id
        WHERE se.class_section_id IN (${placeholders})
          AND ar.date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
          AND ar.date <= CURDATE()
        GROUP BY se.class_section_id, ar.date
        ORDER BY ar.date ASC`,
      [...csIds, days - 1]
    );

    const dates = emptyDateList(days);

    // Holiday lookup (session-scoped) so each per-class row can show
    // "Holiday · <reason>" instead of a blank dash.
    const holidayRows = await executeQuery<HolidayRow[]>(
      `SELECT DATE_FORMAT(date, '%Y-%m-%d') AS date, is_holiday, holiday_reason
         FROM erp_calendar_days
        WHERE session_id = ?
          AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
          AND date <= CURDATE()`,
      [sess.sessionId, days - 1]
    );
    const holidayByDate = new Map<string, HolidayRow>();
    for (const h of holidayRows) holidayByDate.set(h.date, h);

    // Bucket: class_section_id -> date -> { present, total }
    const byCs: Map<number, Map<string, { present: number; total: number }>> = new Map();
    for (const r of rows) {
      if (!byCs.has(r.class_section_id)) byCs.set(r.class_section_id, new Map());
      byCs.get(r.class_section_id)!.set(r.date, {
        present: Number(r.present) || 0,
        total: Number(r.total) || 0,
      });
    }

    const data = classes.map((c) => {
      const series = dates.map((d) => {
        const hol = holidayByDate.get(d);
        const is_holiday = hol?.is_holiday === 1;
        const holiday_reason = is_holiday ? hol?.holiday_reason ?? "Holiday" : null;
        const hit = byCs.get(c.class_section_id)?.get(d);
        if (!hit || hit.total === 0) {
          return { date: d, percentage: null, present: 0, total: 0, is_holiday, holiday_reason };
        }
        return {
          date: d,
          percentage: Math.round((hit.present / hit.total) * 100),
          present: hit.present,
          total: hit.total,
          is_holiday,
          holiday_reason,
        };
      });
      const sumTotal = series.reduce((a, s) => a + s.total, 0);
      const sumPresent = series.reduce((a, s) => a + s.present, 0);
      const average = sumTotal > 0 ? Math.round((sumPresent / sumTotal) * 100) : null;
      return {
        class_section_id: c.class_section_id,
        class_name: c.class_name,
        section_name: c.section_name,
        average,
        series,
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("/api/teacher/classes/attendance-trend error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function emptyDateList(days: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${da}`);
  }
  return out;
}
