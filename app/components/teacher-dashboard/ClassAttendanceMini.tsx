"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/app/components/shared";
import { cn } from "@/app/lib/utils";
import {
  AcademicCapIcon,
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

function tone(pct: number | null) {
  if (pct === null) return "bg-gray-200";
  if (pct >= 85) return "bg-green-500";
  if (pct >= 70) return "bg-amber-400";
  return "bg-red-500";
}
function textTone(pct: number | null) {
  if (pct === null) return "text-gray-400";
  if (pct >= 85) return "text-green-700";
  if (pct >= 70) return "text-amber-700";
  return "text-red-700";
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
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-primary-900">
            My Classes — Attendance (7d)
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Daily present % for classes you&apos;re in charge of
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <AcademicCapIcon className="w-10 h-10 mb-2 text-gray-300" />
          <p className="text-sm font-medium">No classes assigned</p>
          <p className="text-xs text-gray-300 mt-0.5">
            Nothing to chart yet
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Link
              key={r.class_section_id}
              href={`/teacher/attendance?class_section_id=${r.class_section_id}`}
              className="group flex items-center gap-3 rounded-lg px-3 py-2.5 border border-transparent hover:border-primary-100 hover:bg-primary-50/40 transition-colors"
            >
              {/* Label */}
              <div className="w-24 sm:w-28 shrink-0 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {r.class_name} · {r.section_name}
                </p>
                <p className={cn("text-xs font-medium", textTone(r.average))}>
                  {r.average === null ? "No data" : `Avg ${r.average}%`}
                </p>
              </div>

              {/* 7-day bars */}
              <div className="flex-1 flex items-end gap-1 h-9">
                {r.series.map((d) => {
                  const h = d.percentage === null ? 4 : Math.max(6, d.percentage);
                  const dateLabel = new Date(d.date).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    weekday: "short",
                  });
                  return (
                    <div
                      key={d.date}
                      title={
                        d.percentage === null
                          ? `${dateLabel} · Not marked`
                          : `${dateLabel} · ${d.percentage}% · ${d.present}/${d.total}`
                      }
                      className={cn("flex-1 rounded-t-sm transition-colors", tone(d.percentage))}
                      style={{ height: `${h}%` }}
                    />
                  );
                })}
              </div>

              <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-primary-500 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
