"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/app/components/shared";
import { cn } from "@/app/lib/utils";
import {
  AcademicCapIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useViewingSession } from "@/app/components/providers/ViewingSessionProvider";

interface DayPoint {
  date: string;
  percentage: number | null;
  present: number;
  total: number;
}
interface ClassRow {
  class_section_id: number;
  class_name: string;
  section_name: string;
  average: number | null;
  series: DayPoint[];
}

// Tone bands per the new design:
//   Good    ≥ 85%  → green
//   Average 60–84% → amber
//   Low    < 60%   → red
function pillClasses(pct: number | null): string {
  if (pct === null) return "bg-gray-100 text-gray-400 border border-gray-200";
  if (pct >= 85) return "bg-green-500 text-white";
  if (pct >= 60) return "bg-amber-400 text-white";
  return "bg-red-500 text-white";
}
function avgTextClasses(pct: number | null): string {
  if (pct === null) return "text-gray-400";
  if (pct >= 85) return "text-green-700";
  if (pct >= 60) return "text-amber-700";
  return "text-red-700";
}

function shortWeekday(date: string): string {
  return new Date(date).toLocaleDateString("en-US", { weekday: "short" });
}

function fullDateLabel(date: string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
      <span className={cn("w-2.5 h-2.5 rounded-full", color)} />
      {label}
    </span>
  );
}

export default function ClassAttendanceMini() {
  const { viewingSession, withSessionId } = useViewingSession();
  const [rows, setRows] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(withSessionId("/api/teacher/classes/attendance-trend?days=7"));
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setRows(json.data ?? []);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [viewingSession?.id, withSessionId]);

  return (
    <Card>
      {/* Header: icon + title + legend */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-50 text-primary-600 shrink-0">
            <CalendarDaysIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-primary-900">
              My Classes — Attendance (7d)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Daily present % for classes you&apos;re in charge of
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <LegendDot color="bg-green-500" label="Good (≥ 85%)" />
          <LegendDot color="bg-amber-400" label="Average (60% - 84%)" />
          <LegendDot color="bg-red-500" label="Low (< 60%)" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
          <AcademicCapIcon className="w-12 h-12 mb-2 text-gray-300" />
          <p className="text-sm font-medium">No classes assigned</p>
          <p className="text-xs text-gray-300 mt-0.5">
            Nothing to chart yet
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Link
              key={r.class_section_id}
              href={`/teacher/attendance?class_section_id=${r.class_section_id}`}
              className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-xl px-3 py-3 border border-gray-100 hover:border-primary-200 hover:bg-primary-50/40 transition-colors"
            >
              {/* Left: icon + class label */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-50 text-primary-600 shrink-0">
                  <AcademicCapIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 uppercase tracking-wide truncate">
                    {r.class_name} - {r.section_name}
                  </p>
                  <p className={cn("text-xs font-semibold", avgTextClasses(r.average))}>
                    {r.average === null ? "No data" : `Avg ${r.average}%`}
                  </p>
                </div>
              </div>

              {/* Middle: 7-day pill grid */}
              <div className="grid grid-cols-7 gap-2 min-w-0">
                {r.series.map((d) => (
                  <div key={d.date} className="flex flex-col items-center gap-1 min-w-0">
                    <span className="text-[11px] font-medium text-gray-500">
                      {shortWeekday(d.date)}
                    </span>
                    <span
                      title={
                        d.percentage === null
                          ? `${fullDateLabel(d.date)} · Not marked`
                          : `${fullDateLabel(d.date)} · ${d.percentage}% · ${d.present}/${d.total}`
                      }
                      className={cn(
                        "w-full text-center text-sm font-bold rounded-lg px-1 py-1.5 tabular-nums",
                        pillClasses(d.percentage)
                      )}
                    >
                      {d.percentage === null ? "—" : `${d.percentage}%`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Right: chevron */}
              <ChevronRightIcon className="w-5 h-5 text-gray-300 group-hover:text-primary-500 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
