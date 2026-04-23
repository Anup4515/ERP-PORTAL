"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/app/components/shared";
import {
  ClipboardDocumentCheckIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useViewingSession } from "@/app/components/providers/ViewingSessionProvider";

interface UnmarkedClass {
  class_section_id: number;
  class_name: string;
  section_name: string;
  student_count: number;
}
interface PendingMark {
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

export default function PendingTasksCard() {
  const { viewingSession, withSessionId } = useViewingSession();
  const [unmarked, setUnmarked] = useState<UnmarkedClass[]>([]);
  const [pendingMarks, setPendingMarks] = useState<PendingMark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(withSessionId("/api/teacher/pending"));
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setUnmarked(json.data?.unmarked_attendance ?? []);
        setPendingMarks(json.data?.pending_marks ?? []);
      } catch {
        if (!cancelled) {
          setUnmarked([]);
          setPendingMarks([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [viewingSession?.id, withSessionId]);

  const totalPending = unmarked.length + pendingMarks.length;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-primary-900">
            Pending Tasks
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Things waiting for your attention today
          </p>
        </div>
        {!loading && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 border border-primary-100">
            {totalPending} pending
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : totalPending === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
          <CheckCircleIcon className="w-12 h-12 mb-2 text-green-300" />
          <p className="text-sm font-medium text-gray-600">All caught up!</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Nothing pending right now.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Attendance unmarked */}
          {unmarked.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <ClipboardDocumentCheckIcon className="w-4 h-4" />
                Attendance not marked today ({unmarked.length})
              </h3>
              <div className="space-y-1.5">
                {unmarked.map((c) => (
                  <Link
                    key={c.class_section_id}
                    href={`/teacher/attendance?class_section_id=${c.class_section_id}`}
                    className="group flex items-center justify-between rounded-lg px-3 py-2.5 border border-amber-100 bg-amber-50/60 hover:bg-amber-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-amber-900">
                        {c.class_name} · {c.section_name}
                      </p>
                      <p className="text-xs text-amber-800/80">
                        {c.student_count} {c.student_count === 1 ? "student" : "students"} · tap to mark
                      </p>
                    </div>
                    <ChevronRightIcon className="w-4 h-4 text-amber-600 group-hover:text-amber-800" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Marks pending */}
          {pendingMarks.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <ChartBarIcon className="w-4 h-4" />
                Marks pending ({pendingMarks.length})
              </h3>
              <div className="space-y-1.5">
                {pendingMarks.map((p) => {
                  const pct =
                    p.student_count > 0
                      ? Math.round((p.marks_entered / p.student_count) * 100)
                      : 0;
                  return (
                    <Link
                      key={`${p.exam_id}-${p.subject_id}`}
                      href={`/teacher/marks?exam_id=${p.exam_id}&subject_id=${p.subject_id}&class_section_id=${p.class_section_id}`}
                      className="group flex items-center justify-between rounded-lg px-3 py-2.5 border border-orange-100 bg-orange-50/60 hover:bg-orange-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-orange-900 truncate">
                          {p.exam_name} · {p.subject_name}
                        </p>
                        <p className="text-xs text-orange-800/80">
                          {p.class_name} · {p.section_name} · {p.marks_entered}/{p.student_count} entered ({pct}%)
                        </p>
                      </div>
                      <ChevronRightIcon className="w-4 h-4 text-orange-600 group-hover:text-orange-800" />
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </Card>
  );
}
