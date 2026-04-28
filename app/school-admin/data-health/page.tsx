"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  MinusCircleIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { Card } from "@/app/components/shared";
import { cn } from "@/app/lib/utils";
import type {
  ClassSectionHealth,
  DomainCell,
  DomainStatus,
} from "@/app/lib/class-section-health";

type Filter = "all" | "needs_attention" | "ok";

interface ApiResponse {
  data: ClassSectionHealth[];
}

const STATUS_STYLES: Record<
  DomainStatus,
  { dot: string; text: string; bg: string }
> = {
  ok:       { dot: "bg-green-500",  text: "text-green-700",  bg: "bg-green-50" },
  warning:  { dot: "bg-amber-500",  text: "text-amber-700",  bg: "bg-amber-50" },
  critical: { dot: "bg-red-500",    text: "text-red-700",    bg: "bg-red-50" },
  empty:    { dot: "bg-gray-300",   text: "text-gray-500",   bg: "bg-gray-50" },
};

const STATUS_ICON: Record<DomainStatus, React.ComponentType<{ className?: string }>> = {
  ok: CheckCircleIcon,
  warning: ExclamationTriangleIcon,
  critical: ExclamationCircleIcon,
  empty: MinusCircleIcon,
};

export default function DataHealthPage() {
  const [rows, setRows] = useState<ClassSectionHealth[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/partner/health/classes");
        if (!res.ok) {
          if (!cancelled) setError("Could not load class data");
          return;
        }
        const json: ApiResponse = await res.json();
        if (!cancelled) setRows(json.data);
      } catch {
        if (!cancelled) setError("Could not load class data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    if (!rows) return { total: 0, ok: 0, warning: 0, critical: 0 };
    return rows.reduce(
      (acc, r) => {
        acc.total += 1;
        if (r.overallStatus === "ok") acc.ok += 1;
        else if (r.overallStatus === "warning") acc.warning += 1;
        else if (r.overallStatus === "critical") acc.critical += 1;
        return acc;
      },
      { total: 0, ok: 0, warning: 0, critical: 0 }
    );
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (!rows) return [];
    if (filter === "needs_attention") {
      return rows.filter(
        (r) => r.overallStatus === "warning" || r.overallStatus === "critical"
      );
    }
    if (filter === "ok") {
      return rows.filter((r) => r.overallStatus === "ok");
    }
    return rows;
  }, [rows, filter]);

  return (
    <div className="space-y-6">
      <div className="pb-2">
        <h1 className="text-3xl sm:text-4xl font-bold text-primary-900 tracking-tight">
          Data Health
        </h1>
        <p className="text-gray-500 mt-1 text-base">
          See class-by-class which areas need attention.
        </p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <SummaryTile label="Total classes" value={summary.total} tone="neutral" />
        <SummaryTile label="On track" value={summary.ok} tone="ok" />
        <SummaryTile label="Needs attention" value={summary.warning} tone="warning" />
        <SummaryTile label="Critical gaps" value={summary.critical} tone="critical" />
      </div>

      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          All ({summary.total})
        </FilterChip>
        <FilterChip
          active={filter === "needs_attention"}
          onClick={() => setFilter("needs_attention")}
        >
          Needs attention ({summary.warning + summary.critical})
        </FilterChip>
        <FilterChip active={filter === "ok"} onClick={() => setFilter("ok")}>
          On track ({summary.ok})
        </FilterChip>
      </div>

      {/* Table */}
      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <SkeletonTable />
        ) : error ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            {error}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-gray-700">
              {filter === "all"
                ? "No classes set up yet"
                : "No classes match this filter"}
            </p>
            {filter === "all" && (
              <Link
                href="/school-admin/classes"
                className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-primary-700 hover:text-primary-800"
              >
                Set up your first class
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            )}
          </div>
        ) : (
          <HealthTable rows={filteredRows} />
        )}
      </Card>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "ok" | "warning" | "critical";
}) {
  const styles = {
    neutral: "bg-white text-primary-900 border-gray-100",
    ok: "bg-green-50 text-green-800 border-green-100",
    warning: "bg-amber-50 text-amber-800 border-amber-100",
    critical: "bg-red-50 text-red-800 border-red-100",
  } as const;
  return (
    <div className={cn("rounded-xl border px-4 py-3", styles[tone])}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-2xl font-bold mt-0.5">{value}</p>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer",
        active
          ? "bg-primary-600 text-white border-primary-600"
          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
      )}
    >
      {children}
    </button>
  );
}

function HealthTable({ rows }: { rows: ClassSectionHealth[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
            <th className="px-4 py-3 min-w-[130px]">Class</th>
            <th className="px-4 py-3">Class Teacher</th>
            <th className="px-4 py-3">Attendance</th>
            <th className="px-4 py-3">Marks</th>
            <th className="px-4 py-3">Timetable</th>
            <th className="px-4 py-3">Holistic</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.classSectionId} className="hover:bg-gray-50">
              <td className="px-4 py-3 align-top min-w-[130px]">
                <div className="font-semibold text-primary-900 whitespace-nowrap">
                  {r.className} – {r.sectionName}
                </div>
                <div className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">
                  {r.activeStudents}{" "}
                  {r.activeStudents === 1 ? "student" : "students"}
                </div>
              </td>
              <td className="px-4 py-3 align-top">
                <CellBadge cell={r.classTeacher} />
              </td>
              <td className="px-4 py-3 align-top">
                <CellBadge cell={r.attendance} />
              </td>
              <td className="px-4 py-3 align-top">
                <CellBadge cell={r.marks} />
              </td>
              <td className="px-4 py-3 align-top">
                <CellBadge cell={r.timetable} />
              </td>
              <td className="px-4 py-3 align-top">
                <CellBadge cell={r.holistic} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CellBadge({ cell }: { cell: DomainCell }) {
  const styles = STATUS_STYLES[cell.status];
  const Icon = STATUS_ICON[cell.status];
  return (
    <div
      className={cn(
        "inline-flex items-start gap-1.5 px-2 py-1 rounded-md max-w-full",
        styles.bg,
        styles.text
      )}
    >
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-xs font-semibold truncate">{cell.label}</p>
        {cell.detail && (
          <p className="text-[10px] opacity-80 mt-0.5">{cell.detail}</p>
        )}
      </div>
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="px-6 py-6">
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="grid grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((__, j) => (
              <div
                key={j}
                className="h-10 bg-gray-100 rounded-md animate-pulse"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
