/**
 * GET /api/teacher/today
 *
 * Today-at-a-glance payload for the teacher dashboard:
 *  - today's timetable slots for this teacher (period, time, subject, class-section, room)
 *  - any exams scheduled today in the teacher's class-sections
 *  - holiday info if today is marked as a holiday in the session calendar
 */

import { NextResponse } from "next/server";
import { executeQuery } from "@/app/lib/db";
import { getAuthContext, isAuthError, resolveSessionId, isSessionError } from "@/app/lib/auth-utils";

interface SlotRow {
  period_number: number;
  start_time: string | null;
  end_time: string | null;
  subject_name: string | null;
  class_section_id: number;
  class_name: string;
  section_name: string;
  room_number: string | null;
}

interface ExamRow {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
  class_section_id: number;
  class_name: string;
  section_name: string;
}

interface HolidayRow {
  is_holiday: number;
  holiday_reason: string | null;
}

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["teacher"]);
    if (isAuthError(ctx)) return ctx;

    const sess = await resolveSessionId(request, ctx.partnerUserId);
    if (isSessionError(sess)) return sess;

    const teacherId = ctx.userId;

    if (sess.sessionId === null) {
      return NextResponse.json({
        data: {
          date: null,
          day_of_week: null,
          holiday: null,
          timetable: [],
          exams_today: [],
        },
      });
    }

    // Today's timetable for this teacher, joined with period-config times.
    const slotRows = await executeQuery<SlotRow[]>(
      `SELECT ts.period_number,
              pc.start_time,
              pc.end_time,
              s.name AS subject_name,
              ts.class_section_id,
              c.name AS class_name,
              sec.name AS section_name,
              ts.room_number
         FROM erp_timetable_slots ts
         JOIN erp_class_sections cs ON cs.id = ts.class_section_id
         JOIN classes c  ON c.id = cs.class_id
         JOIN sections sec ON sec.id = cs.section_id
         LEFT JOIN erp_subjects s ON s.id = ts.subject_id
         LEFT JOIN erp_timetable_config pc
              ON pc.partner_id = ?
             AND pc.period_number = ts.period_number
        WHERE ts.teacher_id = ?
          AND ts.day_of_week = to_char(CURRENT_DATE, 'FMDay')
          AND cs.session_id = ?
        ORDER BY ts.period_number ASC`,
      [ctx.partnerUserId, teacherId, sess.sessionId]
    );

    // Exams happening today in any of the teacher's class-sections
    // (as class_teacher, second_incharge, or subject teacher).
    const examRows = await executeQuery<ExamRow[]>(
      `SELECT e.id, e.name, e.start_date, e.end_date,
              e.class_section_id,
              c.name  AS class_name,
              sec.name AS section_name
         FROM erp_exams e
         JOIN erp_class_sections cs ON cs.id = e.class_section_id
         JOIN classes c   ON c.id = cs.class_id
         JOIN sections sec ON sec.id = cs.section_id
        WHERE cs.session_id = ?
          AND CURRENT_DATE BETWEEN COALESCE(e.start_date, CURRENT_DATE)
                            AND COALESCE(e.end_date,   CURRENT_DATE)
          AND (
            cs.class_teacher_id = ? OR
            cs.second_incharge_id = ? OR
            cs.id IN (SELECT DISTINCT class_section_id FROM erp_subjects WHERE teacher_id = ?)
          )
        ORDER BY e.start_date ASC`,
      [sess.sessionId, teacherId, teacherId, teacherId]
    );

    // Holiday today?
    const holidayRows = await executeQuery<HolidayRow[]>(
      `SELECT is_holiday, holiday_reason
         FROM erp_calendar_days
        WHERE session_id = ? AND date = CURRENT_DATE
        LIMIT 1`,
      [sess.sessionId]
    );
    const holiday = holidayRows[0]?.is_holiday
      ? { reason: holidayRows[0].holiday_reason || "Holiday" }
      : null;

    const todayIso = new Date().toISOString().slice(0, 10);
    const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });

    return NextResponse.json({
      data: {
        date: todayIso,
        day_of_week: dayOfWeek,
        holiday,
        timetable: slotRows,
        exams_today: examRows,
      },
    });
  } catch (error) {
    console.error("/api/teacher/today error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
