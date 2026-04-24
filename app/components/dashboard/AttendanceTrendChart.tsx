"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/app/components/shared";
import { cn } from "@/app/lib/utils";
import {
  ChartBarIcon,
  PresentationChartLineIcon,
  CalendarDaysIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";
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

const Y_TICKS = [100, 75, 50, 25, 0];

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

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
  const best = data.reduce<TrendPoint | null>(
    (a, d) => (d.total > 0 && (!a || d.percentage > a.percentage) ? d : a),
    null
  );

  return (
    <Card>
      {/* Header: icon + title + range toggle */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-50 text-primary-600 shrink-0">
            <ChartBarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-primary-900">
              Attendance Trend
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Daily present % across all sections
            </p>
          </div>
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setDays(r.days)}
              className={cn(
                "px-4 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer",
                days === r.days
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary strip: 3 highlight cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <HighlightCard
          tone="primary"
          icon={<PresentationChartLineIcon className="w-5 h-5" />}
          label={`${days}-DAY AVERAGE`}
          value={`${average}%`}
        />
        <HighlightCard
          tone="neutral"
          icon={<CalendarDaysIcon className="w-5 h-5" />}
          label="TOTAL MARKED"
          value={totalMarked.toLocaleString("en-IN")}
          rightDecoration={<DotsPattern />}
        />
        <HighlightCard
          tone="success"
          icon={<TrophyIcon className="w-5 h-5" />}
          label="BEST DAY"
          value={
            best
              ? `${best.percentage}% (${formatShortDate(best.date)})`
              : "—"
          }
          rightDecoration={
            best ? <ArrowTrendingUpIcon className="w-12 h-12 text-green-300/70" /> : null
          }
        />
      </div>

      {/* Chart */}
      <div className="relative rounded-xl border border-gray-100 p-4 pt-6 bg-white">
        {loading ? (
          <div className="h-64 flex items-end gap-2 pl-10">
            {Array.from({ length: days }).map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-gray-100 rounded-t-md animate-pulse"
                style={{ height: `${30 + ((i * 37) % 60)}%` }}
              />
            ))}
          </div>
        ) : (
          <div className="relative h-64">
            {/* Y-axis ticks + gridlines */}
            <div className="absolute inset-0">
              {Y_TICKS.map((t) => (
                <div
                  key={t}
                  className="absolute left-0 right-0 flex items-center"
                  style={{ top: `${100 - t}%`, transform: "translateY(-50%)" }}
                >
                  <span className="w-10 pr-2 text-right text-[10px] text-gray-400 tabular-nums">
                    {t}%
                  </span>
                  <div
                    className={cn(
                      "flex-1 border-t",
                      t === 0 ? "border-gray-200" : "border-dashed border-gray-100"
                    )}
                  />
                </div>
              ))}
            </div>

            {/* Bars, offset to clear y-axis labels */}
            <div className="absolute left-10 right-0 top-0 bottom-0 flex items-end gap-2"
                 role="img"
                 aria-label="Daily attendance bar chart">
              {data.map((d) => {
                const hasData = d.total > 0;
                const heightPct = hasData ? Math.max(2, d.percentage) : 0;
                const dateLabel = formatShortDate(d.date);
                return (
                  <div
                    key={d.date}
                    className="group relative flex-1 flex flex-col items-center justify-end h-full min-w-0"
                  >
                    {/* Percentage label above bar */}
                    {hasData && (
                      <span
                        className="absolute text-xs font-bold text-primary-700 tabular-nums pointer-events-none"
                        style={{ bottom: `${heightPct}%`, marginBottom: "4px" }}
                      >
                        {d.percentage}%
                      </span>
                    )}
                    {/* Bar */}
                    <div
                      className={cn(
                        "w-full max-w-[56px] rounded-t-md transition-all duration-200 shadow-sm",
                        hasData
                          ? "bg-gradient-to-t from-primary-700 to-primary-500 group-hover:from-primary-800 group-hover:to-primary-600"
                          : ""
                      )}
                      style={{ height: `${heightPct}%` }}
                    />
                    {/* Full tooltip on hover */}
                    <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full px-2 py-1 rounded-md bg-gray-900 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-lg">
                      <div className="font-semibold">{dateLabel}</div>
                      <div className="text-gray-300">
                        {hasData ? `${d.percentage}% · ${d.present}/${d.total}` : "Not marked"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* X-axis labels */}
        {!loading && data.length > 0 && (
          <div className="mt-2 flex gap-2 pl-10">
            {data.map((d) => (
              <span
                key={d.date}
                className="flex-1 text-center text-[11px] font-medium text-gray-500 min-w-0 truncate"
              >
                {formatShortDate(d.date)}
              </span>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function HighlightCard({
  tone,
  icon,
  label,
  value,
  rightDecoration,
}: {
  tone: "primary" | "neutral" | "success";
  icon: React.ReactNode;
  label: string;
  value: string;
  rightDecoration?: React.ReactNode;
}) {
  const toneConfig = {
    primary: {
      card: "bg-gradient-to-br from-primary-50 to-indigo-50 border-primary-100",
      iconWrap: "bg-white text-primary-600 border border-primary-100",
      label: "text-primary-700/80",
      value: "text-primary-700",
    },
    neutral: {
      card: "bg-gray-50 border-gray-200",
      iconWrap: "bg-white text-gray-600 border border-gray-200",
      label: "text-gray-500",
      value: "text-gray-900",
    },
    success: {
      card: "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200",
      iconWrap: "bg-white text-green-600 border border-green-200",
      label: "text-green-700/80",
      value: "text-green-700",
    },
  }[tone];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border px-4 py-3 flex items-center gap-3",
        toneConfig.card
      )}
    >
      <div className={cn("flex items-center justify-center w-11 h-11 rounded-lg shrink-0", toneConfig.iconWrap)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn("text-[10px] font-bold uppercase tracking-wider", toneConfig.label)}>
          {label}
        </div>
        <div className={cn("text-xl font-bold mt-0.5 truncate", toneConfig.value)}>
          {value}
        </div>
      </div>
      {rightDecoration && (
        <div className="shrink-0 opacity-80 pointer-events-none">{rightDecoration}</div>
      )}
    </div>
  );
}

function DotsPattern() {
  // Decorative 4×5 dot grid in gray — purely visual, matches the mock.
  return (
    <div className="grid grid-cols-5 gap-1">
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="w-1 h-1 rounded-full bg-gray-300" />
      ))}
    </div>
  );
}
