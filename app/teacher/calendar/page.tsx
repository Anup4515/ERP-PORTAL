"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, StatsCard } from "@/app/components/shared";
import { Button } from "@/app/components/shared";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

interface CalendarDay {
  id: number;
  date: string;
  day_of_week: string;
  is_holiday: number;
  holiday_reason: string | null;
}

interface SessionData {
  id: number;
  name: string;
  is_current: number;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export default function TeacherCalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);

  // Get current session
  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((json) => {
        const data: SessionData[] = json.data || [];
        const current = data.find((s) => s.is_current);
        if (current) setCurrentSessionId(current.id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  const fetchCalendar = useCallback(async () => {
    if (!currentSessionId) { setDays([]); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/calendar?session_id=${currentSessionId}&month=${monthStr}`
      );
      if (res.ok) {
        const json = await res.json();
        setDays(json.data || []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [currentSessionId, monthStr]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  const goMonth = (dir: -1 | 1) => {
    let m = month + dir, y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m); setYear(y);
  };

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayMap = new Map<number, CalendarDay>();
  days.forEach((d) => dayMap.set(new Date(d.date).getDate(), d));

  const hasData = days.length > 0;
  const holidayCount = days.filter((d) => d.is_holiday).length;
  const workingDays = days.filter((d) => !d.is_holiday).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary-900">School Calendar</h1>
      <p className="text-sm text-gray-500">Contact admin to modify holidays.</p>

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => goMonth(-1)}>
          <ChevronLeftIcon className="w-4 h-4" /> Prev
        </Button>
        <h2 className="text-lg font-semibold text-primary-900">
          {MONTHS[month]} {year}
        </h2>
        <Button variant="ghost" size="sm" onClick={() => goMonth(1)}>
          Next <ChevronRightIcon className="w-4 h-4" />
        </Button>
      </div>

      {loading ? (
        <div className="animate-pulse h-96 bg-gray-100 rounded-xl" />
      ) : (
        <Card padding="none">
          <div className="grid grid-cols-7">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="px-1 py-2 text-center text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50">
                {wd}
              </div>
            ))}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`e-${i}`} className="min-h-[44px] sm:min-h-[56px] lg:min-h-[64px] border-b border-r border-gray-100 bg-gray-50/50 p-1 sm:p-1.5 lg:p-2" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
              const dayData = dayMap.get(d);
              const isHoliday = dayData?.is_holiday === 1;
              const isSunday = new Date(year, month, d).getDay() === 0;
              return (
                <div key={d} className={`min-h-[44px] sm:min-h-[56px] lg:min-h-[64px] border-b border-r border-gray-100 p-1 sm:p-1.5 lg:p-2 ${
                  isHoliday ? "bg-red-50" : isSunday ? "bg-orange-50/60" : "bg-white"
                }`}>
                  <span className={`text-xs sm:text-sm font-medium ${
                    isHoliday ? "text-red-700" : isSunday ? "text-orange-600" : "text-gray-900"
                  }`}>{d}</span>
                  {dayData?.holiday_reason && (
                    <p className="text-[10px] leading-tight mt-0.5 text-red-500 hidden sm:block">{dayData.holiday_reason}</p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {!loading && !hasData && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
          No calendar data for {MONTHS[month]} {year}.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Total Days" value={hasData ? days.length : "-"} />
        <StatsCard title="Holidays" value={hasData ? holidayCount : "-"} />
        <StatsCard title="Working Days" value={hasData ? workingDays : "-"} />
      </div>
    </div>
  );
}
