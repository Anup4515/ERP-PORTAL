"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, Select, LoadingSkeleton, EmptyState } from "@/app/components/shared";
import { DocumentTextIcon, CalendarDaysIcon, ClockIcon, MapPinIcon } from "@heroicons/react/24/outline";

interface TeacherClass {
  class_section_id: number;
  class_name: string;
  section_name: string;
}

interface Exam {
  id: number;
  name: string;
  code: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  class_name: string;
  section_name: string;
}

interface Schedule {
  id: number;
  subject_name: string;
  subject_code: string | null;
  exam_date: string | null;
  exam_time: string | null;
  duration_minutes: number | null;
  maximum_marks: number;
  room_number: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  upcoming: { label: "Upcoming", bg: "bg-blue-50", text: "text-blue-700" },
  in_progress: { label: "In Progress", bg: "bg-yellow-50", text: "text-yellow-700" },
  completed: { label: "Completed", bg: "bg-green-50", text: "text-green-700" },
};

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export default function TeacherExamsPage() {
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [classSectionId, setClassSectionId] = useState("");
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [examsLoading, setExamsLoading] = useState(false);

  // Track which exam's schedule is expanded
  const [expandedExamId, setExpandedExamId] = useState<number | null>(null);
  const [schedules, setSchedules] = useState<Record<number, Schedule[]>>({});
  const [scheduleLoading, setScheduleLoading] = useState<number | null>(null);

  // Fetch teacher's classes
  useEffect(() => {
    fetch("/api/teacher/classes")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setClasses(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fetch exams when class changes
  const fetchExams = useCallback(async (csId: string) => {
    if (!csId) {
      setExams([]);
      return;
    }
    setExamsLoading(true);
    try {
      const res = await fetch(`/api/exams?class_section_id=${csId}&limit=100`);
      const json = await res.json();
      setExams(json.data?.exams || []);
    } catch {
      setExams([]);
    } finally {
      setExamsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams(classSectionId);
    setExpandedExamId(null);
  }, [classSectionId, fetchExams]);

  // Fetch schedule for an exam
  async function toggleSchedule(examId: number) {
    if (expandedExamId === examId) {
      setExpandedExamId(null);
      return;
    }

    setExpandedExamId(examId);

    if (schedules[examId]) return; // Already loaded

    setScheduleLoading(examId);
    try {
      const res = await fetch(`/api/exams/${examId}/schedule`);
      const json = await res.json();
      setSchedules((prev) => ({ ...prev, [examId]: json.data || [] }));
    } catch {
      setSchedules((prev) => ({ ...prev, [examId]: [] }));
    } finally {
      setScheduleLoading(null);
    }
  }

  const classSectionOptions = [
    { value: "", label: "Select Class & Section" },
    ...classes.map((c) => ({
      value: String(c.class_section_id),
      label: `${c.class_name} - ${c.section_name}`,
    })),
  ];

  // Group exams by status
  const upcomingExams = exams.filter((e) => e.status === "upcoming");
  const inProgressExams = exams.filter((e) => e.status === "in_progress");
  const completedExams = exams.filter((e) => e.status === "completed");

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">Exams</h1>
          <p className="text-sm text-gray-500 mt-1">View upcoming and past exams for your classes</p>
        </div>
        <LoadingSkeleton lines={6} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-primary-900">Exams</h1>
        <p className="text-sm text-gray-500 mt-1">View upcoming and past exams for your classes</p>
      </div>

      {/* Class filter */}
      <div className="w-full sm:w-64">
        <Select
          label="Class & Section"
          name="class_section"
          value={classSectionId}
          onChange={(e) => setClassSectionId(e.target.value)}
          options={classSectionOptions}
        />
      </div>

      {!classSectionId ? (
        <EmptyState
          icon={<DocumentTextIcon className="h-12 w-12" />}
          title="Select a class"
          description="Choose a class & section to view its exams and schedules."
        />
      ) : examsLoading ? (
        <LoadingSkeleton lines={8} />
      ) : exams.length === 0 ? (
        <EmptyState
          icon={<DocumentTextIcon className="h-12 w-12" />}
          title="No exams found"
          description="No exams have been created for this class yet."
        />
      ) : (
        <div className="space-y-6">
          {/* Upcoming & In Progress */}
          {[...inProgressExams, ...upcomingExams].length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Upcoming & In Progress
              </h2>
              <div className="space-y-3">
                {[...inProgressExams, ...upcomingExams].map((exam) => (
                  <ExamCard
                    key={exam.id}
                    exam={exam}
                    isExpanded={expandedExamId === exam.id}
                    onToggle={() => toggleSchedule(exam.id)}
                    schedule={schedules[exam.id]}
                    scheduleLoading={scheduleLoading === exam.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {completedExams.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Completed
              </h2>
              <div className="space-y-3">
                {completedExams.map((exam) => (
                  <ExamCard
                    key={exam.id}
                    exam={exam}
                    isExpanded={expandedExamId === exam.id}
                    onToggle={() => toggleSchedule(exam.id)}
                    schedule={schedules[exam.id]}
                    scheduleLoading={scheduleLoading === exam.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExamCard({
  exam,
  isExpanded,
  onToggle,
  schedule,
  scheduleLoading,
}: {
  exam: Exam;
  isExpanded: boolean;
  onToggle: () => void;
  schedule?: Schedule[];
  scheduleLoading: boolean;
}) {
  const status = STATUS_CONFIG[exam.status] || STATUS_CONFIG.upcoming;

  return (
    <Card padding="none">
      {/* Exam header - clickable */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${status.bg}`}>
            <DocumentTextIcon className={`w-5 h-5 ${status.text}`} />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-900">{exam.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {exam.start_date || exam.end_date
                ? `${formatDate(exam.start_date)} — ${formatDate(exam.end_date)}`
                : "Dates not set"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.bg} ${status.text}`}>
            {status.label}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded schedule */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-4 py-3">
          {scheduleLoading ? (
            <LoadingSkeleton lines={4} />
          ) : !schedule || schedule.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No subject schedule added yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 border-b border-gray-200">Subject</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-600 border-b border-gray-200">Date</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-600 border-b border-gray-200">Time</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-600 border-b border-gray-200">Duration</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-600 border-b border-gray-200">Max Marks</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-600 border-b border-gray-200">Room</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((s, idx) => {
                    const isPast = s.exam_date ? new Date(s.exam_date) < new Date(new Date().toDateString()) : false;
                    const isToday = s.exam_date ? new Date(s.exam_date).toDateString() === new Date().toDateString() : false;

                    return (
                      <tr
                        key={s.id}
                        className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"} ${isToday ? "ring-1 ring-inset ring-blue-200 bg-blue-50/30" : ""}`}
                      >
                        <td className="px-3 py-2.5 font-medium text-gray-900 border-b border-gray-100">
                          {s.subject_name}
                          {s.subject_code && <span className="text-gray-400 ml-1">({s.subject_code})</span>}
                          {isToday && <span className="ml-2 text-[10px] font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">TODAY</span>}
                        </td>
                        <td className={`px-3 py-2.5 text-center border-b border-gray-100 ${isPast ? "text-gray-400" : "font-medium text-gray-700"}`}>
                          <span className="inline-flex items-center gap-1">
                            <CalendarDaysIcon className="w-3.5 h-3.5" />
                            {formatDate(s.exam_date)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center border-b border-gray-100 text-gray-600">
                          {s.exam_time ? (
                            <span className="inline-flex items-center gap-1">
                              <ClockIcon className="w-3.5 h-3.5" />
                              {formatTime(s.exam_time)}
                            </span>
                          ) : "-"}
                        </td>
                        <td className="px-3 py-2.5 text-center border-b border-gray-100 text-gray-600">
                          {s.duration_minutes ? `${s.duration_minutes} min` : "-"}
                        </td>
                        <td className="px-3 py-2.5 text-center border-b border-gray-100 font-medium text-gray-700">
                          {s.maximum_marks}
                        </td>
                        <td className="px-3 py-2.5 text-center border-b border-gray-100 text-gray-600">
                          {s.room_number ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPinIcon className="w-3.5 h-3.5" />
                              {s.room_number}
                            </span>
                          ) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
