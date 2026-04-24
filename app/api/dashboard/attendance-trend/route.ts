import { NextResponse } from "next/server";
import { executeQuery } from "@/app/lib/db";
import { getAuthContext, isAuthError, resolveSessionId, isSessionError } from "@/app/lib/auth-utils";

interface TrendRow {
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
    const ctx = await getAuthContext(["school_admin", "teacher"]);
    if (isAuthError(ctx)) return ctx;

    const sess = await resolveSessionId(request, ctx.partnerUserId);
    if (isSessionError(sess)) return sess;

    const { searchParams } = new URL(request.url);
    const daysParam = parseInt(searchParams.get("days") || "7", 10);
    const days = [7, 14, 30].includes(daysParam) ? daysParam : 7;

    if (sess.sessionId === null) {
      return NextResponse.json({ data: emptySeries(days) });
    }

    // Aggregate present/total per day across the session for the last `days` days.
    const rows = await executeQuery<TrendRow[]>(
      `SELECT
         DATE_FORMAT(ar.date, '%Y-%m-%d') AS date,
         COUNT(*) AS total,
         SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) AS present
       FROM erp_attendance_records ar
       JOIN erp_student_enrollments se ON ar.student_enrollment_id = se.id
       JOIN erp_class_sections cs ON se.class_section_id = cs.id
       WHERE cs.session_id = ?
         AND ar.date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         AND ar.date <= CURDATE()
       GROUP BY ar.date
       ORDER BY ar.date ASC`,
      [sess.sessionId, days - 1]
    );

    // Holiday lookup for the same window so the UI can show "Holiday · <reason>"
    // instead of a blank day.
    const holidayRows = await executeQuery<HolidayRow[]>(
      `SELECT DATE_FORMAT(date, '%Y-%m-%d') AS date, is_holiday, holiday_reason
         FROM erp_calendar_days
        WHERE session_id = ?
          AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
          AND date <= CURDATE()`,
      [sess.sessionId, days - 1]
    );

    // Build a complete series so the chart always has `days` points even on
    // dates where no one marked attendance.
    const byDate = new Map<string, TrendRow>();
    for (const r of rows) byDate.set(r.date, r);
    const holidayByDate = new Map<string, HolidayRow>();
    for (const h of holidayRows) holidayByDate.set(h.date, h);

    const series = emptySeries(days).map((d) => {
      const hit = byDate.get(d.date);
      const hol = holidayByDate.get(d.date);
      const is_holiday = hol?.is_holiday === 1;
      const holiday_reason = is_holiday ? hol?.holiday_reason ?? "Holiday" : null;
      if (!hit) {
        return {
          ...d,
          is_holiday,
          holiday_reason,
        };
      }
      const total = Number(hit.total) || 0;
      const present = Number(hit.present) || 0;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      return {
        date: d.date,
        total,
        present,
        percentage,
        is_holiday,
        holiday_reason,
      };
    });

    return NextResponse.json({ data: series });
  } catch (error) {
    console.error("Attendance trend error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function emptySeries(days: number) {
  const out: {
    date: string;
    total: number;
    present: number;
    percentage: number;
    is_holiday: boolean;
    holiday_reason: string | null;
  }[] = [];
  const today = new Date();
  // Normalise to local YYYY-MM-DD so the last item is today.
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    out.push({
      date: `${yyyy}-${mm}-${dd}`,
      total: 0,
      present: 0,
      percentage: 0,
      is_holiday: false,
      holiday_reason: null,
    });
  }
  return out;
}
