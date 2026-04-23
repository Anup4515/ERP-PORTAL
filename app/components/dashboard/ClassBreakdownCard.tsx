"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/app/components/shared";
import { cn } from "@/app/lib/utils";
import { ChevronRightIcon, AcademicCapIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { useViewingSession } from "@/app/components/providers/ViewingSessionProvider";

interface ClassRow {
  class_section_id: number;
  class_id: number;
  class_name: string;
  section_name: string;
  grade_level: number | null;
  student_count: number;
  present_today: number;
  total_marked_today: number;
  attendance_percentage: number | null;
}

function attendanceTone(pct: number | null) {
  if (pct === null) return { bar: "bg-gray-200", text: "text-gray-400", label: "Not marked" };
  if (pct >= 85) return { bar: "bg-green-500", text: "text-green-700", label: `${pct}%` };
  if (pct >= 70) return { bar: "bg-amber-400", text: "text-amber-700", label: `${pct}%` };
  return { bar: "bg-red-500", text: "text-red-700", label: `${pct}%` };
}

export default function ClassBreakdownCard() {
  const { viewingSession, withSessionId } = useViewingSession();
  const [rows, setRows] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(withSessionId("/api/dashboard/class-breakdown"));
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

  const totalStudents = rows.reduce((a, r) => a + r.student_count, 0);

  return (
    <Card>
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-primary-900">
            Class-wise Overview
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Student count and today&apos;s attendance per class
          </p>
        </div>
        {!loading && rows.length > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-medium border border-primary-100">
            <UserGroupIcon className="w-3.5 h-3.5" />
            {totalStudents.toLocaleString("en-IN")} total
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
          <AcademicCapIcon className="w-12 h-12 mb-3 text-gray-300" />
          <p className="text-sm font-medium">No class-sections yet</p>
          <p className="text-xs text-gray-300 mt-1">
            Create classes and sections in Settings to see them here
          </p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1 -mr-1">
          {rows.map((r) => {
            const tone = attendanceTone(r.attendance_percentage);
            const barWidth = r.attendance_percentage ?? 0;
            return (
              <Link
                key={r.class_section_id}
                href={`/school-admin/students?class_section_id=${r.class_section_id}`}
                className="group flex items-center gap-3 p-2.5 rounded-lg border border-transparent hover:border-primary-100 hover:bg-primary-50/40 transition-colors"
              >
                {/* Label */}
                <div className="min-w-0 w-28 sm:w-32 shrink-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {r.class_name} &middot; {r.section_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {r.student_count} {r.student_count === 1 ? "student" : "students"}
                  </p>
                </div>

                {/* Bar */}
                <div className="flex-1 min-w-0">
                  <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={cn("h-full transition-all", tone.bar)}
                      style={{ width: `${Math.max(barWidth, r.attendance_percentage === null ? 0 : 4)}%` }}
                    />
                  </div>
                </div>

                {/* Percentage */}
                <div className={cn("w-20 sm:w-24 shrink-0 text-right", tone.text)}>
                  <span className="text-sm font-semibold tabular-nums">{tone.label}</span>
                  {r.total_marked_today > 0 && (
                    <p className="text-[10px] text-gray-400 leading-tight">
                      {r.present_today}/{r.total_marked_today} present
                    </p>
                  )}
                </div>

                <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-primary-500 shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}
