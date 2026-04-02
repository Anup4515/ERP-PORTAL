"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Select, Card } from "@/app/components/shared";

interface AssignedClass {
  class_section_id: number;
  class_name: string;
  section_name: string;
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

type Status = "present" | "absent" | "late";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_CYCLE: (Status | null)[] = ["present", "absent", "late", null];

export default function TeacherAttendancePage() {
  const searchParams = useSearchParams();
  const preselected = searchParams.get("class_section_id") || "";
  const now = new Date();

  const [classes, setClasses] = useState<AssignedClass[]>([]);
  const [selectedCs, setSelectedCs] = useState(preselected);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [classesLoading, setClassesLoading] = useState(true);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [holidays, setHolidays] = useState<HolidayRecord[]>([]);
  const [totalDays, setTotalDays] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Local edits: Map of "enrollmentId-day" -> status
  const [grid, setGrid] = useState<Map<string, Status>>(new Map());
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  // Fetch assigned classes
  useEffect(() => {
    fetch("/api/teacher/classes")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setClasses(json.data);
          if (!preselected && json.data.length > 0) {
            setSelectedCs(String(json.data[0].class_section_id));
          }
        }
      })
      .catch(() => {})
      .finally(() => setClassesLoading(false));
  }, [preselected]);

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  // Fetch attendance data
  const fetchData = useCallback(async () => {
    if (!selectedCs) { setStudents([]); return; }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(
        `/api/teacher/attendance?class_section_id=${selectedCs}&month=${monthStr}`
      );
      if (res.ok) {
        const json = await res.json();
        const d = json.data;
        setStudents(d.students || []);
        setHolidays(d.holidays || []);
        setTotalDays(d.total_days || 0);

        // Build grid from existing records
        const m = new Map<string, Status>();
        for (const r of (d.records || []) as AttendanceRecord[]) {
          const day = new Date(r.date).getDate();
          m.set(`${r.student_enrollment_id}-${day}`, r.status as Status);
        }
        setGrid(m);
        setDirty(new Set());
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [selectedCs, monthStr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const holidayDates = new Set(holidays.map((h) => new Date(h.date).getDate()));
  const daysInMonth = totalDays || new Date(year, month, 0).getDate();

  // Click cell to cycle status
  const handleCellClick = (enrollmentId: number, day: number) => {
    if (holidayDates.has(day)) return;
    // Don't allow editing future dates
    const cellDate = new Date(year, month - 1, day);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (cellDate > today) return;

    const key = `${enrollmentId}-${day}`;
    const current = grid.get(key) || null;
    const currentIdx = STATUS_CYCLE.indexOf(current);
    const next = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];

    setGrid((prev) => {
      const m = new Map(prev);
      if (next) { m.set(key, next); } else { m.delete(key); }
      return m;
    });
    setDirty((prev) => new Set(prev).add(key));
  };

  // Mark all for a day
  const handleMarkAllDay = (day: number, status: Status) => {
    if (holidayDates.has(day)) return;
    const cellDate = new Date(year, month - 1, day);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (cellDate > today) return;

    setGrid((prev) => {
      const m = new Map(prev);
      for (const s of students) {
        const key = `${s.enrollment_id}-${day}`;
        m.set(key, status);
        setDirty((d) => new Set(d).add(key));
      }
      return m;
    });
  };

  // Save
  const handleSave = async () => {
    if (!selectedCs || dirty.size === 0) return;
    setSaving(true);
    setMessage("");
    try {
      // Convert dirty entries to records
      const records: { enrollment_id: number; date: string; status: string }[] = [];
      for (const key of dirty) {
        const [eidStr, dayStr] = key.split("-");
        const status = grid.get(key);
        if (!status) continue;
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(Number(dayStr)).padStart(2, "0")}`;
        records.push({ enrollment_id: Number(eidStr), date: dateStr, status });
      }

      if (records.length === 0) {
        setMessage("No changes to save.");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/teacher/attendance/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_section_id: Number(selectedCs), records }),
      });

      if (res.ok) {
        setMessage("Attendance saved successfully!");
        setDirty(new Set());
        await fetchData();
      } else {
        const json = await res.json();
        setMessage(json.error || "Failed to save.");
      }
    } catch {
      setMessage("Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  };

  const getStatusCell = (status: Status | undefined, isHoliday: boolean, isFuture: boolean, isDirty: boolean) => {
    if (isHoliday) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded text-[11px] font-semibold bg-gray-200 text-gray-500">
          H
        </span>
      );
    }
    if (isFuture) {
      return <span className="text-gray-400 text-xs font-medium">-</span>;
    }
    const ring = isDirty ? " ring-2 ring-offset-1 ring-yellow-400" : "";
    if (!status) {
      return <span className="text-gray-400 text-xs font-medium">-</span>;
    }
    switch (status) {
      case "present":
        return <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-[11px] font-semibold bg-green-500 text-white${ring}`}>P</span>;
      case "absent":
        return <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-[11px] font-semibold bg-red-500 text-white${ring}`}>A</span>;
      case "late":
        return <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-[11px] font-semibold bg-yellow-500 text-white${ring}`}>L</span>;
      default:
        return <span className="text-gray-400 text-xs font-medium">-</span>;
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <h1 className="text-2xl font-bold text-primary-900">Attendance</h1>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Select
          label="Class - Section"
          value={selectedCs}
          onChange={(e) => setSelectedCs(e.target.value)}
          options={[
            { value: "", label: classesLoading ? "Loading..." : "Select class" },
            ...classes.map((c) => ({
              value: String(c.class_section_id),
              label: `${c.class_name} - ${c.section_name}`,
            })),
          ]}
        />
        <Select
          label="Month"
          value={String(month)}
          onChange={(e) => setMonth(Number(e.target.value))}
          options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
        />
        <Select
          label="Year"
          value={String(year)}
          onChange={(e) => setYear(Number(e.target.value))}
          options={[year - 1, year, year + 1].map((y) => ({ value: String(y), label: String(y) }))}
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="animate-pulse h-72 bg-gray-100 rounded-xl" />
      ) : selectedCs && students.length > 0 ? (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="sticky left-0 z-20 bg-gray-50 px-3 py-2.5 text-left text-xs font-semibold text-gray-600 border-b border-r border-gray-200 min-w-[50px]">
                    Roll
                  </th>
                  <th className="sticky left-[50px] z-20 bg-gray-50 px-3 py-2.5 text-left text-xs font-semibold text-gray-600 border-b border-r border-gray-200 min-w-[130px]">
                    Name
                  </th>
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const dayNum = i + 1;
                    const isH = holidayDates.has(dayNum);
                    const cellDate = new Date(year, month - 1, dayNum);
                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const isFuture = cellDate > today;
                    const isToday = cellDate.getTime() === today.getTime();

                    // Check if all students are marked present for this day
                    const allPresent = !isH && !isFuture && students.length > 0 &&
                      students.every((s) => grid.get(`${s.enrollment_id}-${dayNum}`) === "present");

                    return (
                      <th key={dayNum} className={`px-0.5 py-1.5 text-center border-b border-gray-200 min-w-[34px] ${isH ? "text-gray-400 bg-gray-100" : isToday ? "bg-yellow-50 text-primary-900" : "text-gray-700"}`}>
                        <div className={`text-xs ${isToday ? "font-bold" : ""}`}>{dayNum}</div>
                        {isH ? (
                          <div className="text-[9px] text-gray-400 font-normal">H</div>
                        ) : isFuture ? (
                          <div className="mt-0.5 text-gray-400 text-[10px] font-medium">-</div>
                        ) : (
                          <div className="flex justify-center mt-0.5">
                            <button
                              onClick={() => handleMarkAllDay(dayNum, "present")}
                              className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${
                                allPresent
                                  ? "bg-green-500 border-green-500"
                                  : "border-gray-300 bg-white hover:border-green-400 hover:bg-green-50"
                              }`}
                              title="Mark all present"
                            >
                              {allPresent && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          </div>
                        )}
                      </th>
                    );
                  })}
                  <th className="px-2 py-2.5 text-center text-xs font-semibold text-green-700 border-b border-l border-gray-200 bg-green-50 min-w-[36px]">P</th>
                  <th className="px-2 py-2.5 text-center text-xs font-semibold text-red-700 border-b border-gray-200 bg-red-50 min-w-[36px]">A</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, idx) => {
                  let pCount = 0, aCount = 0;
                  for (let d = 1; d <= daysInMonth; d++) {
                    const st = grid.get(`${s.enrollment_id}-${d}`);
                    if (st === "present" || st === "late") pCount++;
                    if (st === "absent") aCount++;
                  }

                  return (
                    <tr key={s.enrollment_id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}>
                      <td className="sticky left-0 z-10 bg-inherit px-3 py-2 text-gray-500 font-medium border-b border-r border-gray-100 text-xs">
                        {s.roll_number || "-"}
                      </td>
                      <td className="sticky left-[50px] z-10 bg-inherit px-3 py-2 text-gray-900 font-medium border-b border-r border-gray-100 text-xs whitespace-nowrap">
                        {s.first_name} {s.last_name}
                      </td>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const dayNum = i + 1;
                        const isH = holidayDates.has(dayNum);
                        const cellDate = new Date(year, month - 1, dayNum);
                        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        const isFuture = cellDate > today;
                        const isToday = cellDate.getTime() === today.getTime();
                        const key = `${s.enrollment_id}-${dayNum}`;
                        const status = grid.get(key);
                        const isDirtyCell = dirty.has(key);

                        return (
                          <td
                            key={dayNum}
                            onClick={() => handleCellClick(s.enrollment_id, dayNum)}
                            className={`px-0.5 py-1.5 text-center border-b border-gray-100 ${
                              isH ? "bg-gray-50"
                                : isFuture ? "bg-gray-50/30"
                                : isToday ? "bg-yellow-50/50 cursor-pointer hover:bg-yellow-100/50"
                                : "cursor-pointer hover:bg-blue-50"
                            }`}
                          >
                            {getStatusCell(status, isH, isFuture, isDirtyCell)}
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 text-center font-bold text-green-600 border-b border-l border-gray-100 bg-green-50/50 text-xs">{pCount}</td>
                      <td className="px-2 py-2 text-center font-bold text-red-600 border-b border-gray-100 bg-red-50/50 text-xs">{aCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-5 px-4 py-3 border-t border-gray-200 text-xs text-gray-600">
            <span className="flex items-center gap-1.5"><span className="inline-block w-5 h-5 rounded bg-green-500" /> Present (P)</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-5 h-5 rounded bg-red-500" /> Absent (A)</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-5 h-5 rounded bg-yellow-500" /> Late (L)</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-5 h-5 rounded bg-gray-200" /> Holiday</span>
            <span className="text-gray-400 italic">Click cell to cycle: P → A → L → clear</span>
          </div>
        </Card>
      ) : selectedCs ? (
        <Card><p className="text-center text-gray-500 py-8">No students found.</p></Card>
      ) : null}

      {message && (
        <p className={`text-sm font-medium ${message.includes("success") ? "text-green-600" : "text-red-600"}`}>
          {message}
        </p>
      )}

      {/* Sticky Save */}
      {students.length > 0 && dirty.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50">
          <div className="max-w-4xl mx-auto">
            <Button variant="primary" className="w-full" onClick={handleSave} loading={saving}>
              Save All Attendance
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
