"use client";

import { useState, useEffect, useCallback } from "react";
import { Select, Card } from "@/app/components/shared";
import { useViewingSession } from "@/app/components/providers/ViewingSessionProvider";

interface Section {
  id: number;
  name: string;
  class_section_id: number | null;
}

interface ClassData {
  id: number;
  name: string;
  sections: Section[];
}

interface StudentRow {
  enrollment_id: number;
  roll_number: number | null;
  first_name: string;
  last_name: string;
}

interface AttendanceRecord {
  student_enrollment_id: number;
  date: string;
  status: string;
}

interface HolidayRecord {
  date: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function AttendancePage() {
  const { viewingSession, withSessionId } = useViewingSession();
  const now = new Date();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [classSectionValue, setClassSectionValue] = useState("");

  // Session boundaries — the period selector only shows in-session months.
  const parseSessionDate = (raw: string | null | undefined): Date | null => {
    if (!raw) return null;
    const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  };
  const sessionStart = parseSessionDate(viewingSession?.start_date);
  const sessionEnd = parseSessionDate(viewingSession?.end_date);

  const periodOptions: { value: string; label: string }[] = (() => {
    if (!sessionStart || !sessionEnd) {
      return [
        {
          value: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
          label: `${MONTHS[now.getMonth()]} ${now.getFullYear()}`,
        },
      ];
    }
    // Upper bound: the current month, but capped at the session end.
    // Future in-session months aren't attended yet, so hide them.
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const effectiveEnd =
      currentMonthStart < sessionEnd ? currentMonthStart : sessionEnd;
    const out: { value: string; label: string }[] = [];
    let y = sessionStart.getFullYear();
    let m = sessionStart.getMonth();
    const endY = effectiveEnd.getFullYear();
    const endM = effectiveEnd.getMonth();
    while (y < endY || (y === endY && m <= endM)) {
      out.push({
        value: `${y}-${String(m + 1).padStart(2, "0")}`,
        label: `${MONTHS[m]} ${y}`,
      });
      m++;
      if (m > 11) {
        m = 0;
        y++;
      }
    }
    return out;
  })();

  const initialRef = (() => {
    if (sessionStart && now < sessionStart) return sessionStart;
    if (sessionEnd && now > sessionEnd) return sessionEnd;
    return now;
  })();
  const [month, setMonth] = useState(initialRef.getMonth() + 1);
  const [year, setYear] = useState(initialRef.getFullYear());

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [holidays, setHolidays] = useState<HolidayRecord[]>([]);
  const [totalDays, setTotalDays] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch classes
  useEffect(() => {
    fetch(withSessionId("/api/classes"))
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setClasses(json.data);
      })
      .catch(() => {});
  }, [viewingSession?.id]);

  // Build combined class-section options
  const classSectionOptions: { value: string; label: string }[] = [];
  for (const cls of classes) {
    for (const sec of cls.sections) {
      if (sec.class_section_id) {
        classSectionOptions.push({
          value: String(sec.class_section_id),
          label: `${cls.name} - ${sec.name}`,
        });
      }
    }
  }

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!classSectionValue) {
      setStudents([]);
      setRecords([]);
      setHolidays([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        withSessionId(`/api/attendance/monthly?class_section_id=${classSectionValue}&month=${monthStr}`)
      );
      if (res.ok) {
        const json = await res.json();
        const d = json.data;
        setStudents(d.students || []);
        setRecords(d.records || []);
        setHolidays(d.holidays || []);
        setTotalDays(d.total_days || 0);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [classSectionValue, monthStr, viewingSession?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build lookups
  const holidayDates = new Set(
    holidays.map((h) => new Date(h.date).getDate())
  );
  const recordMap = new Map<string, string>();
  for (const r of records) {
    const day = new Date(r.date).getDate();
    recordMap.set(`${r.student_enrollment_id}-${day}`, r.status);
  }

  const daysInMonth = totalDays || new Date(year, month, 0).getDate();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Get status display
  const getStatusCell = (status: string | undefined, isHoliday: boolean, isFuture: boolean) => {
    if (isFuture) {
      return <span className="text-gray-400 text-xs font-medium">-</span>;
    }
    if (isHoliday) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded text-[11px] font-semibold bg-gray-200 text-gray-500">
          H
        </span>
      );
    }
    if (!status) {
      return (
        <span className="text-gray-400 text-xs font-medium">-</span>
      );
    }
    switch (status) {
      case "present":
        return (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded text-[11px] font-semibold bg-green-500 text-white">
            P
          </span>
        );
      case "absent":
        return (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded text-[11px] font-semibold bg-red-500 text-white">
            A
          </span>
        );
      case "late":
        return (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded text-[11px] font-semibold bg-yellow-500 text-white">
            L
          </span>
        );
      case "half_day":
        return (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded text-[11px] font-semibold bg-blue-500 text-white">
            HD
          </span>
        );
      default:
        return <span className="text-gray-400 text-xs font-medium">-</span>;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary-900">Attendance</h1>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Class - Section"
          value={classSectionValue}
          onChange={(e) => setClassSectionValue(e.target.value)}
          options={[
            { value: "", label: "Select class" },
            ...classSectionOptions,
          ]}
        />
        <Select
          label="Period"
          value={`${year}-${String(month).padStart(2, "0")}`}
          onChange={(e) => {
            const [y, m] = e.target.value.split("-").map(Number);
            setYear(y);
            setMonth(m);
          }}
          options={periodOptions}
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="animate-pulse h-72 bg-gray-100 rounded-xl" />
      ) : classSectionValue && students.length > 0 ? (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="sticky left-0 z-20 bg-gray-50 px-3 py-2.5 text-left text-xs font-semibold text-gray-600 border-b border-r border-gray-200 min-w-[40px] sm:min-w-[50px]">
                    Roll
                  </th>
                  <th className="bg-gray-50 px-3 py-2.5 text-left text-xs font-semibold text-gray-600 border-b border-r border-gray-200 min-w-[100px] sm:min-w-[130px]">
                    Name
                  </th>
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const dayNum = i + 1;
                    const isH = holidayDates.has(dayNum);
                    const cellDate = new Date(year, month - 1, dayNum);
                    const isFuture = cellDate > today;
                    const isToday = cellDate.getTime() === today.getTime();
                    return (
                      <th
                        key={dayNum}
                        className={`px-0.5 py-2.5 text-center text-xs font-medium border-b border-gray-200 min-w-[34px] ${
                          isH ? "text-gray-400 bg-gray-100" : isToday ? "bg-yellow-50 font-bold text-primary-900" : "text-gray-700"
                        }`}
                      >
                        <div>{dayNum}</div>
                        {isH ? (
                          <div className="text-[9px] text-gray-400 font-normal">H</div>
                        ) : isFuture ? (
                          <div className="text-gray-400 text-[10px] font-medium">-</div>
                        ) : null}
                      </th>
                    );
                  })}
                  <th className="px-2 py-2.5 text-center text-xs font-semibold text-green-700 border-b border-l border-gray-200 bg-green-50 min-w-[36px]">
                    P
                  </th>
                  <th className="px-2 py-2.5 text-center text-xs font-semibold text-red-700 border-b border-gray-200 bg-red-50 min-w-[36px]">
                    A
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, idx) => {
                  let presentCount = 0;
                  let absentCount = 0;

                  // Count totals
                  for (let d = 1; d <= daysInMonth; d++) {
                    const status = recordMap.get(`${s.enrollment_id}-${d}`);
                    if (status === "present" || status === "late") presentCount++;
                    if (status === "absent") absentCount++;
                  }

                  return (
                    <tr
                      key={s.enrollment_id}
                      className={`${
                        idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                      } hover:bg-blue-50/30 transition-colors`}
                    >
                      <td className="sticky left-0 z-10 bg-inherit px-3 py-2 text-gray-500 font-medium border-b border-r border-gray-100 text-xs">
                        {s.roll_number || "-"}
                      </td>
                      <td className="bg-inherit px-3 py-2 text-gray-900 font-medium border-b border-r border-gray-100 text-xs whitespace-nowrap">
                        {s.first_name} {s.last_name}
                      </td>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const dayNum = i + 1;
                        const isH = holidayDates.has(dayNum);
                        const cellDate = new Date(year, month - 1, dayNum);
                        const isFuture = cellDate > today;
                        const isToday = cellDate.getTime() === today.getTime();
                        const status = recordMap.get(
                          `${s.enrollment_id}-${dayNum}`
                        );

                        return (
                          <td
                            key={dayNum}
                            className={`px-0.5 py-1.5 text-center border-b border-gray-100 ${
                              isH ? "bg-gray-50" : isToday ? "bg-yellow-50/50" : isFuture ? "bg-gray-50/30" : ""
                            }`}
                          >
                            {getStatusCell(status, isH, isFuture)}
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 text-center font-bold text-green-600 border-b border-l border-gray-100 bg-green-50/50 text-xs">
                        {presentCount}
                      </td>
                      <td className="px-2 py-2 text-center font-bold text-red-600 border-b border-gray-100 bg-red-50/50 text-xs">
                        {absentCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-5 px-4 py-3 border-t border-gray-200 text-xs text-gray-600">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-5 h-5 rounded bg-green-500" />
              Present (P)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-5 h-5 rounded bg-red-500" />
              Absent (A)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-5 h-5 rounded bg-yellow-500" />
              Late (L)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-5 h-5 rounded bg-gray-200" />
              Holiday
            </span>
          </div>
        </Card>
      ) : classSectionValue ? (
        <Card>
          <p className="text-center text-gray-500 py-8">
            No students found for this class-section.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
