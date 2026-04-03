"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Button,
  Card,
  Modal,
  Input,
  Select,
  StatsCard,
} from "@/app/components/shared";
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

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const [days, setDays] = useState<CalendarDay[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // Single day modal
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [markAsHoliday, setMarkAsHoliday] = useState(true);
  const [holidayReason, setHolidayReason] = useState("");
  const [savingDay, setSavingDay] = useState(false);

  // Date range holiday modal
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [rangeStartDate, setRangeStartDate] = useState("");
  const [rangeEndDate, setRangeEndDate] = useState("");
  const [rangeReason, setRangeReason] = useState("");
  const [savingRange, setSavingRange] = useState(false);

  const [banner, setBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Load sessions
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/sessions");
        if (res.ok) {
          const json = await res.json();
          const data: SessionData[] = json.data || [];
          setSessions(data);
          const current = data.find((s) => s.is_current) || data[0];
          if (current) setSelectedSessionId(String(current.id));
        }
      } catch {
        /* ignore */
      } finally {
        setSessionsLoading(false);
      }
    }
    load();
  }, []);

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  // Fetch calendar
  const fetchCalendar = useCallback(async () => {
    if (!selectedSessionId) {
      setDays([]);
      return;
    }
    setCalendarLoading(true);
    try {
      const res = await fetch(
        `/api/calendar?session_id=${selectedSessionId}&month=${monthStr}`
      );
      if (res.ok) {
        const json = await res.json();
        setDays(json.data || []);
      }
    } catch {
      /* ignore */
    } finally {
      setCalendarLoading(false);
    }
  }, [selectedSessionId, monthStr]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  // Month navigation
  const goMonth = (dir: -1 | 1) => {
    let m = month + dir,
      y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m);
    setYear(y);
  };

  // --- Single day click ---
  const handleDayClick = (dayData: CalendarDay | undefined) => {
    if (!dayData) return;
    setSelectedDay(dayData);
    setMarkAsHoliday(!dayData.is_holiday);
    setHolidayReason(dayData.holiday_reason || "");
    setShowDayModal(true);
  };

  const handleSaveDay = async () => {
    if (!selectedDay) return;
    setSavingDay(true);
    try {
      const res = await fetch(`/api/calendar/${selectedDay.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_holiday: markAsHoliday,
          holiday_reason: markAsHoliday ? holidayReason || null : null,
        }),
      });
      if (res.ok) {
        setShowDayModal(false);
        await fetchCalendar();
      }
    } catch {
      /* ignore */
    } finally {
      setSavingDay(false);
    }
  };

  // --- Date range holiday ---
  const openRangeModal = () => {
    setRangeStartDate("");
    setRangeEndDate("");
    setRangeReason("");
    setBanner(null);
    setShowRangeModal(true);
  };

  const handleSaveRange = async () => {
    if (!selectedSessionId || !rangeStartDate || !rangeEndDate) return;
    if (new Date(rangeEndDate) < new Date(rangeStartDate)) {
      setBanner({ type: "error", message: "End date must be after start date." });
      return;
    }

    setSavingRange(true);
    setBanner(null);
    try {
      // Build array of dates in range
      const dates: { date: string; is_holiday: boolean; holiday_reason: string | null }[] = [];
      const start = new Date(rangeStartDate);
      const end = new Date(rangeEndDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const yr = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, "0");
        const da = String(d.getDate()).padStart(2, "0");
        dates.push({
          date: `${yr}-${mo}-${da}`,
          is_holiday: true,
          holiday_reason: rangeReason || null,
        });
      }

      const res = await fetch("/api/calendar/holidays", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: Number(selectedSessionId),
          dates,
        }),
      });

      if (res.ok) {
        setShowRangeModal(false);
        setBanner({
          type: "success",
          message: `${dates.length} days marked as holiday${rangeReason ? ` (${rangeReason})` : ""}.`,
        });
        await fetchCalendar();
      } else {
        const json = await res.json();
        setBanner({ type: "error", message: json.error || "Failed to update." });
      }
    } catch {
      setBanner({ type: "error", message: "Failed to update holidays." });
    } finally {
      setSavingRange(false);
    }
  };

  // --- Mark all Saturdays ---
  const handleMarkSaturdays = async () => {
    if (!selectedSessionId) return;
    setBanner(null);
    const satDays = days.filter(
      (d) => d.day_of_week === "Saturday" && !d.is_holiday
    );
    if (!satDays.length) {
      setBanner({ type: "success", message: "All Saturdays are already holidays this month." });
      return;
    }
    try {
      const res = await fetch("/api/calendar/holidays", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: Number(selectedSessionId),
          dates: satDays.map((d) => ({
            date: d.date,
            is_holiday: true,
            holiday_reason: "Saturday",
          })),
        }),
      });
      if (res.ok) {
        setBanner({ type: "success", message: `${satDays.length} Saturdays marked as holidays.` });
        await fetchCalendar();
      }
    } catch {
      setBanner({ type: "error", message: "Failed to update Saturdays." });
    }
  };

  // Build grid
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayMap = new Map<number, CalendarDay>();
  days.forEach((d) => {
    const dayNum = new Date(d.date).getDate();
    dayMap.set(dayNum, d);
  });

  const hasCalendarData = days.length > 0;
  const holidayCount = days.filter((d) => d.is_holiday).length;
  const workingDays = days.filter((d) => !d.is_holiday).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary-900">School Calendar</h1>

      {/* Session selector */}
      <div className="max-w-xs">
        <Select
          label="Session"
          value={selectedSessionId}
          onChange={(e) => setSelectedSessionId(e.target.value)}
          options={[
            { value: "", label: sessionsLoading ? "Loading..." : "Select session" },
            ...sessions.map((s) => ({ value: String(s.id), label: s.name })),
          ]}
        />
      </div>

      {selectedSessionId && (
        <>
          {/* Month nav */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => goMonth(-1)}>
              <ChevronLeftIcon className="w-4 h-4" />
              Prev
            </Button>
            <h2 className="text-lg font-semibold text-primary-900">
              {MONTHS[month]} {year}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => goMonth(1)}>
              Next
              <ChevronRightIcon className="w-4 h-4" />
            </Button>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={openRangeModal}>
              Mark Holiday Range
            </Button>
            <Button variant="outline" size="sm" onClick={handleMarkSaturdays}>
              Mark All Saturdays
            </Button>
          </div>

          {banner && (
            <div
              className={`rounded-lg px-4 py-3 text-sm border ${
                banner.type === "success"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              {banner.message}
            </div>
          )}

          {/* Calendar grid */}
          {calendarLoading ? (
            <div className="animate-pulse h-96 bg-gray-100 rounded-xl" />
          ) : (
            <Card padding="none">
              <div className="grid grid-cols-7">
                {/* Weekday headers */}
                {WEEKDAYS.map((wd) => (
                  <div
                    key={wd}
                    className="px-1 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50"
                  >
                    {wd}
                  </div>
                ))}
                {/* Empty cells before 1st */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="min-h-[50px] sm:min-h-[80px] md:min-h-[100px] border-b border-r border-gray-100 bg-gray-50/50"
                  />
                ))}
                {/* Day cells */}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                  (d) => {
                    const dayData = dayMap.get(d);
                    const isHoliday = dayData?.is_holiday === 1;
                    const isSunday = new Date(year, month, d).getDay() === 0;

                    return (
                      <div
                        key={d}
                        onClick={() => dayData && handleDayClick(dayData)}
                        className={`min-h-[50px] sm:min-h-[80px] md:min-h-[100px] border-b border-r border-gray-100 p-2 transition-colors ${
                          dayData ? "cursor-pointer" : "cursor-default"
                        } ${
                          isHoliday
                            ? "bg-red-50 hover:bg-red-100"
                            : isSunday
                            ? "bg-orange-50/60 hover:bg-orange-100/60"
                            : "bg-white hover:bg-gray-50"
                        }`}
                      >
                        <span
                          className={`text-sm font-medium ${
                            isHoliday
                              ? "text-red-700"
                              : isSunday
                              ? "text-orange-600"
                              : "text-gray-900"
                          }`}
                        >
                          {d}
                        </span>
                        {dayData?.holiday_reason && (
                          <p className="text-[10px] leading-tight mt-0.5 text-red-500 hidden sm:block">
                            {dayData.holiday_reason}
                          </p>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </Card>
          )}

          {/* No data warning */}
          {!calendarLoading && !hasCalendarData && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
              No calendar data for {MONTHS[month]} {year}. This month may not be
              within the session date range.
            </div>
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatsCard
              title="Total Days"
              value={hasCalendarData ? days.length : "-"}
            />
            <StatsCard
              title="Holidays"
              value={hasCalendarData ? holidayCount : "-"}
            />
            <StatsCard
              title="Working Days"
              value={hasCalendarData ? workingDays : "-"}
            />
          </div>
        </>
      )}

      {/* Edit single day modal */}
      <Modal
        isOpen={showDayModal}
        onClose={() => setShowDayModal(false)}
        size="sm"
        title={
          selectedDay
            ? `${new Date(selectedDay.date + "T00:00:00").getDate()} ${MONTHS[month]} ${year}`
            : ""
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Currently:{" "}
            <strong>
              {selectedDay?.is_holiday ? "Holiday" : "Working Day"}
            </strong>
            {selectedDay?.holiday_reason &&
              ` (${selectedDay.holiday_reason})`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setMarkAsHoliday(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                markAsHoliday
                  ? "bg-red-100 border-red-300 text-red-800"
                  : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Holiday
            </button>
            <button
              onClick={() => setMarkAsHoliday(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                !markAsHoliday
                  ? "bg-green-100 border-green-300 text-green-800"
                  : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Working Day
            </button>
          </div>
          {markAsHoliday && (
            <Input
              label="Reason"
              value={holidayReason}
              onChange={(e) => setHolidayReason(e.target.value)}
              placeholder="e.g. National Holiday, Festival"
            />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowDayModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={savingDay}
              onClick={handleSaveDay}
            >
              {markAsHoliday ? "Mark as Holiday" : "Mark as Working Day"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Date range holiday modal */}
      <Modal
        isOpen={showRangeModal}
        onClose={() => setShowRangeModal(false)}
        size="md"
        title="Mark Holiday Range"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select a date range to mark multiple days as holidays at once (e.g.
            summer vacation, winter break).
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={rangeStartDate}
                onChange={(e) => setRangeStartDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={rangeEndDate}
                onChange={(e) => setRangeEndDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            </div>
          </div>
          <Input
            label="Reason"
            value={rangeReason}
            onChange={(e) => setRangeReason(e.target.value)}
            placeholder="e.g. Summer Vacation, Winter Break, Diwali Break"
          />
          {rangeStartDate && rangeEndDate && new Date(rangeEndDate) >= new Date(rangeStartDate) && (
            <p className="text-xs text-gray-500">
              {Math.ceil(
                (new Date(rangeEndDate).getTime() - new Date(rangeStartDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              ) + 1}{" "}
              days will be marked as holidays.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowRangeModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={savingRange}
              onClick={handleSaveRange}
              disabled={!rangeStartDate || !rangeEndDate}
            >
              Mark as Holiday
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
