"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/app/components/shared";
import { cn } from "@/app/lib/utils";
import {
  CalendarDaysIcon,
  DocumentTextIcon,
  SunIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { useViewingSession } from "@/app/components/providers/ViewingSessionProvider";

interface TimetableSlot {
  period_number: number;
  start_time: string | null;
  end_time: string | null;
  subject_name: string | null;
  class_section_id: number;
  class_name: string;
  section_name: string;
  room_number: string | null;
}
interface ExamToday {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
  class_section_id: number;
  class_name: string;
  section_name: string;
}
interface TodayPayload {
  date: string | null;
  day_of_week: string | null;
  holiday: { reason: string } | null;
  timetable: TimetableSlot[];
  exams_today: ExamToday[];
}

function formatTime(t: string | null): string {
  if (!t) return "";
  // t is "HH:MM:SS". Trim to HH:MM and convert to 12-hour with am/pm.
  const [h, m] = t.split(":").map(Number);
  const hr12 = ((h + 11) % 12) + 1;
  const ap = h < 12 ? "am" : "pm";
  return `${hr12}:${String(m).padStart(2, "0")}${ap}`;
}

function minutesSinceMidnight(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export default function TodayAtAGlance() {
  const { viewingSession, withSessionId } = useViewingSession();
  const [payload, setPayload] = useState<TodayPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(withSessionId("/api/teacher/today"));
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setPayload(json.data ?? null);
      } catch {
        if (!cancelled) setPayload(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [viewingSession?.id, withSessionId]);

  const nowMinutes = useMemo(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }, []);

  const slots = payload?.timetable ?? [];
  const holiday = payload?.holiday;
  const exams = payload?.exams_today ?? [];

  // Determine current / next slot based on the current time.
  const annotatedSlots = slots.map((s) => {
    const start = minutesSinceMidnight(s.start_time);
    const end = minutesSinceMidnight(s.end_time);
    let state: "past" | "current" | "upcoming" = "upcoming";
    if (start != null && end != null) {
      if (nowMinutes >= end) state = "past";
      else if (nowMinutes >= start) state = "current";
    }
    return { ...s, state };
  });
  // First upcoming = "next". Mark the first slot whose state is upcoming (and no current exists).
  const hasCurrent = annotatedSlots.some((s) => s.state === "current");
  let nextMarked = false;
  const displaySlots = annotatedSlots.map((s) => {
    if (!hasCurrent && s.state === "upcoming" && !nextMarked) {
      nextMarked = true;
      return { ...s, state: "next" as const };
    }
    return s;
  });

  return (
    <div className="space-y-4">
      {/* Holiday banner */}
      {holiday && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-amber-100 text-amber-700 shrink-0">
            <SunIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900">
              Today is a holiday · {holiday.reason}
            </p>
            <p className="text-xs text-amber-800/80 mt-0.5">
              No regular classes scheduled. Any exams or special activities are shown below.
            </p>
          </div>
        </div>
      )}

      {/* Exams-today banner */}
      {exams.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-100 text-blue-700 shrink-0">
            <DocumentTextIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-900">
              {exams.length === 1
                ? "1 exam is scheduled today"
                : `${exams.length} exams are scheduled today`}
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              {exams.slice(0, 4).map((e) => (
                <span
                  key={e.id}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-white text-blue-800 border border-blue-200"
                >
                  {e.name} · {e.class_name} {e.section_name}
                </span>
              ))}
              {exams.length > 4 && (
                <span className="text-xs text-blue-800/80 self-center">
                  +{exams.length - 4} more
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Today's timetable strip */}
      <Card>
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-primary-900">
              Today&apos;s Schedule
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {payload?.day_of_week ?? ""} · {slots.length} {slots.length === 1 ? "period" : "periods"}
            </p>
          </div>
          <Link
            href="/teacher/timetable"
            className="text-xs font-medium text-primary-600 hover:text-primary-800"
          >
            Full timetable →
          </Link>
        </div>

        {loading ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="min-w-[180px] h-20 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : displaySlots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <ClockIcon className="w-10 h-10 mb-2 text-gray-300" />
            <p className="text-sm font-medium">
              {holiday ? "No classes on a holiday" : "No classes scheduled today"}
            </p>
            <p className="text-xs text-gray-300 mt-0.5">
              {payload?.day_of_week ?? ""} is free — enjoy the break.
            </p>
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {displaySlots.map((s, i) => {
              const isCurrent = s.state === "current";
              const isNext = s.state === "next";
              const isPast = s.state === "past";
              return (
                <Link
                  key={`${s.period_number}-${i}`}
                  href="/teacher/timetable"
                  title={`Open full timetable · ${s.class_name} ${s.section_name}`}
                  className={cn(
                    "min-w-[180px] shrink-0 rounded-lg px-3 py-2.5 border transition-all",
                    isCurrent &&
                      "border-primary-400 bg-primary-50 shadow-sm ring-2 ring-primary-200",
                    isNext &&
                      "border-accent-400 bg-accent-50",
                    isPast &&
                      "border-gray-100 bg-gray-50/70 opacity-70 hover:opacity-100",
                    !isCurrent && !isNext && !isPast &&
                      "border-gray-200 bg-white hover:border-primary-300"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold tracking-wider uppercase text-gray-400">
                      P{s.period_number}
                      {s.start_time && ` · ${formatTime(s.start_time)}`}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-primary-700 bg-primary-100 px-1.5 py-0.5 rounded">
                        NOW
                      </span>
                    )}
                    {isNext && (
                      <span className="text-[10px] font-bold text-accent-800 bg-accent-100 px-1.5 py-0.5 rounded">
                        NEXT
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {s.subject_name || "Free"}
                  </div>
                  <div className="text-xs text-gray-500 truncate mt-0.5">
                    {s.class_name} · {s.section_name}
                    {s.room_number ? ` · Rm ${s.room_number}` : ""}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
