"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/app/components/shared";
import { cn } from "@/app/lib/utils";
import { useViewingSession } from "@/app/components/providers/ViewingSessionProvider";

interface TrendPoint {
  date: string;
  total: number;
  present: number;
  percentage: number;
}

const RANGES: { label: string; days: 7 | 14 | 30 }[] = [
  { label: "7D", days: 7 },
  { label: "14D", days: 14 },
  { label: "30D", days: 30 },
];

export default function AttendanceTrendChart() {
  const { viewingSession, withSessionId } = useViewingSession();
  const [days, setDays] = useState<7 | 14 | 30>(7);
  const [data, setData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(withSessionId(`/api/dashboard/attendance-trend?days=${days}`));
        const json = await res.json();
        if (!cancelled && json.data) setData(json.data);
      } catch {
        if (!cancelled) setData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [days, viewingSession?.id, withSessionId]);

  const totalPresent = data.reduce((a, d) => a + d.present, 0);
  const totalMarked = data.reduce((a, d) => a + d.total, 0);
  const average = totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;
  const best = data.reduce<TrendPoint | null>((a, d) => (d.total > 0 && (!a || d.percentage > a.percentage) ? d : a), null);

  return (
    <Card>
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-primary-900">
            Attendance Trend
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Daily present % across all sections
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setDays(r.days)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer",
                days === r.days
                  ? "bg-white text-primary-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <Stat label={`${days}-day average`} value={`${average}%`} tone="primary" />
        <Stat label="Total marked" value={totalMarked.toLocaleString("en-IN")} tone="gray" />
        <Stat
          label="Best day"
          value={
            best
              ? `${best.percentage}% (${new Date(best.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })})`
              : "—"
          }
          tone="green"
        />
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-44 flex items-end gap-1.5">
          {Array.from({ length: days }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-gray-100 rounded-t-md animate-pulse"
              style={{ height: `${30 + ((i * 37) % 60)}%` }}
            />
          ))}
        </div>
      ) : (
        <div className="h-44 flex items-end gap-1.5" role="img" aria-label="Daily attendance bar chart">
          {data.map((d) => {
            const hasData = d.total > 0;
            const heightPct = hasData ? Math.max(4, d.percentage) : 2;
            const dateLabel = new Date(d.date).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              weekday: "short",
            });
            return (
              <div
                key={d.date}
                className="group relative flex-1 flex flex-col items-center justify-end h-full"
              >
                <div
                  className={cn(
                    "w-full rounded-t-md transition-all duration-200",
                    hasData
                      ? "bg-gradient-to-t from-primary-500 to-primary-400 group-hover:from-primary-600 group-hover:to-primary-500"
                      : "bg-gray-100"
                  )}
                  style={{ height: `${heightPct}%` }}
                />
                {/* Tooltip */}
                <div className="pointer-events-none absolute bottom-full mb-2 px-2 py-1 rounded-md bg-gray-900 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                  <div className="font-semibold">{dateLabel}</div>
                  <div className="text-gray-300">
                    {hasData ? `${d.percentage}% · ${d.present}/${d.total}` : "Not marked"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Axis */}
      {!loading && data.length > 0 && (
        <div className="flex justify-between mt-2 text-[10px] text-gray-400">
          <span>
            {new Date(data[0].date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
          </span>
          <span>
            {new Date(data[data.length - 1].date).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
            })}
          </span>
        </div>
      )}
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "gray" | "green";
}) {
  const toneCls = {
    primary: "text-primary-700 bg-primary-50/60 border-primary-100",
    gray: "text-gray-700 bg-gray-50 border-gray-200",
    green: "text-green-700 bg-green-50 border-green-100",
  }[tone];
  return (
    <div className={cn("rounded-lg border px-3 py-2", toneCls)}>
      <div className="text-[11px] font-medium opacity-75 uppercase tracking-wider">{label}</div>
      <div className="text-sm font-bold mt-0.5">{value}</div>
    </div>
  );
}
