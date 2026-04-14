"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, Select, LoadingSkeleton } from "@/app/components/shared";

interface PeriodConfig {
  period_number: number;
  start_time: string;
  end_time: string;
  slot_type: string;
  label: string;
}

interface TeacherSlot {
  day_of_week: string;
  period_number: number;
  subject_name: string | null;
  class_name: string;
  section_name: string;
  room_number: string | null;
}

interface ClassSlot {
  day_of_week: string;
  period_number: number;
  subject_name: string | null;
  teacher_name: string | null;
  room_number: string | null;
}

interface AssignedClass {
  class_section_id: string;
  class_name: string;
  section_name: string;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SLOT_COLORS: Record<string, string> = {
  class: "bg-white",
  break: "bg-orange-50",
  lunch: "bg-yellow-50",
  assembly: "bg-blue-50",
};

type ViewMode = "my_schedule" | "class_timetable";

export default function TeacherTimetablePage() {
  const [config, setConfig] = useState<PeriodConfig[]>([]);
  const [slots, setSlots] = useState<TeacherSlot[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);
  const [classSlots, setClassSlots] = useState<ClassSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [classLoading, setClassLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("my_schedule");
  const [selectedClassId, setSelectedClassId] = useState("");

  // Initial fetch — teacher's own schedule + assigned classes
  useEffect(() => {
    fetch("/api/teacher/timetable")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setConfig(json.data.config || []);
          setSlots(json.data.slots || []);
          setAssignedClasses(json.data.assigned_classes || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fetch class timetable when a class is selected
  const fetchClassTimetable = useCallback(async (classSectionId: string) => {
    if (!classSectionId) {
      setClassSlots([]);
      return;
    }
    setClassLoading(true);
    try {
      const res = await fetch(`/api/teacher/timetable?class_section_id=${classSectionId}`);
      const json = await res.json();
      if (json.data) {
        setClassSlots(json.data.class_slots || []);
      }
    } catch {
      setClassSlots([]);
    } finally {
      setClassLoading(false);
    }
  }, []);

  const handleClassChange = (classSectionId: string) => {
    setSelectedClassId(classSectionId);
    fetchClassTimetable(classSectionId);
  };

  // Slot lookups
  const mySlotMap = new Map<string, TeacherSlot>();
  for (const s of slots) {
    mySlotMap.set(`${s.day_of_week}-${s.period_number}`, s);
  }

  const classSlotMap = new Map<string, ClassSlot>();
  for (const s of classSlots) {
    classSlotMap.set(`${s.day_of_week}-${s.period_number}`, s);
  }

  const selectedClass = assignedClasses.find((c) => c.class_section_id === selectedClassId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary-900">Timetable</h1>
        <p className="text-sm text-gray-500 mt-1">View your weekly schedule or class timetables.</p>
      </div>

      {loading ? (
        <LoadingSkeleton lines={10} />
      ) : config.length === 0 ? (
        <Card>
          <p className="text-center text-gray-500 py-8">No timetable configured yet. Contact your admin.</p>
        </Card>
      ) : (
        <>
          {/* View Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit">
              <button
                onClick={() => setViewMode("my_schedule")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === "my_schedule"
                    ? "bg-primary-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                My Schedule
              </button>
              <button
                onClick={() => setViewMode("class_timetable")}
                className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200 ${
                  viewMode === "class_timetable"
                    ? "bg-primary-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Class Timetable
              </button>
            </div>

            {viewMode === "class_timetable" && (
              <div className="w-full sm:w-64">
                <Select
                  name="class_select"
                  value={selectedClassId}
                  onChange={(e) => handleClassChange(e.target.value)}
                  options={[
                    { value: "", label: "Select a class" },
                    ...assignedClasses.map((c) => ({
                      value: c.class_section_id,
                      label: `${c.class_name} - ${c.section_name}`,
                    })),
                  ]}
                />
              </div>
            )}
          </div>

          {/* My Schedule View */}
          {viewMode === "my_schedule" && (
            <Card padding="none">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-primary-900 text-white">
                      <th className="sticky left-0 z-20 bg-primary-900 px-3 py-2.5 text-left font-semibold border-r border-primary-800 min-w-[100px]">Period</th>
                      <th className="bg-primary-900 px-2 py-2.5 text-center font-semibold border-r border-primary-800 min-w-[60px]">Time</th>
                      {DAYS.map((d) => (
                        <th key={d} className="px-2 py-2.5 text-center font-semibold border-r border-primary-800 min-w-[130px]">{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {config.map((period) => {
                      const isClass = period.slot_type === "class";
                      const bgColor = SLOT_COLORS[period.slot_type] || "bg-white";

                      return (
                        <tr key={period.period_number} className={bgColor}>
                          <td className={`sticky left-0 z-10 px-3 py-2.5 font-medium border-b border-r border-gray-200 ${bgColor} ${!isClass ? "text-gray-500 italic" : "text-gray-900"}`}>
                            {period.label}
                          </td>
                          <td className={`px-2 py-2.5 text-center text-gray-500 border-b border-r border-gray-200 ${bgColor}`}>
                            <div className="text-[10px] leading-tight">
                              {period.start_time?.slice(0, 5)}<br />{period.end_time?.slice(0, 5)}
                            </div>
                          </td>
                          {DAYS.map((day) => {
                            if (!isClass) {
                              return (
                                <td key={day} className="px-2 py-2.5 text-center text-gray-400 italic border-b border-r border-gray-100">
                                  {period.label}
                                </td>
                              );
                            }

                            const slot = mySlotMap.get(`${day}-${period.period_number}`);

                            return (
                              <td key={day} className="px-2 py-2 border-b border-r border-gray-100">
                                {slot ? (
                                  <div className="text-center">
                                    <p className="font-semibold text-primary-900 text-[11px]">
                                      {slot.subject_name || "—"}
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">
                                      {slot.class_name} - {slot.section_name}
                                    </p>
                                    {slot.room_number && (
                                      <p className="text-[9px] text-gray-400">Room: {slot.room_number}</p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-center text-gray-300 text-[10px]">—</div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Class Timetable View */}
          {viewMode === "class_timetable" && (
            <>
              {!selectedClassId ? (
                <Card>
                  <p className="text-center text-gray-500 py-8">
                    {assignedClasses.length === 0
                      ? "You have no assigned classes."
                      : "Select a class to view its timetable."}
                  </p>
                </Card>
              ) : classLoading ? (
                <LoadingSkeleton lines={8} />
              ) : (
                <Card padding="none">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-primary-900">
                      {selectedClass?.class_name} - {selectedClass?.section_name} Timetable
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-primary-900 text-white">
                          <th className="sticky left-0 z-20 bg-primary-900 px-3 py-2.5 text-left font-semibold border-r border-primary-800 min-w-[100px]">Period</th>
                          <th className="bg-primary-900 px-2 py-2.5 text-center font-semibold border-r border-primary-800 min-w-[60px]">Time</th>
                          {DAYS.map((d) => (
                            <th key={d} className="px-2 py-2.5 text-center font-semibold border-r border-primary-800 min-w-[130px]">{d}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {config.map((period) => {
                          const isClass = period.slot_type === "class";
                          const bgColor = SLOT_COLORS[period.slot_type] || "bg-white";

                          return (
                            <tr key={period.period_number} className={bgColor}>
                              <td className={`sticky left-0 z-10 px-3 py-2.5 font-medium border-b border-r border-gray-200 ${bgColor} ${!isClass ? "text-gray-500 italic" : "text-gray-900"}`}>
                                {period.label}
                              </td>
                              <td className={`px-2 py-2.5 text-center text-gray-500 border-b border-r border-gray-200 ${bgColor}`}>
                                <div className="text-[10px] leading-tight">
                                  {period.start_time?.slice(0, 5)}<br />{period.end_time?.slice(0, 5)}
                                </div>
                              </td>
                              {DAYS.map((day) => {
                                if (!isClass) {
                                  return (
                                    <td key={day} className="px-2 py-2.5 text-center text-gray-400 italic border-b border-r border-gray-100">
                                      {period.label}
                                    </td>
                                  );
                                }

                                const slot = classSlotMap.get(`${day}-${period.period_number}`);

                                return (
                                  <td key={day} className="px-2 py-2 border-b border-r border-gray-100">
                                    {slot ? (
                                      <div className="text-center">
                                        <p className="font-semibold text-primary-900 text-[11px]">
                                          {slot.subject_name || "—"}
                                        </p>
                                        <p className="text-[10px] text-gray-500 mt-0.5">
                                          {slot.teacher_name || "No teacher"}
                                        </p>
                                        {slot.room_number && (
                                          <p className="text-[9px] text-gray-400">Room: {slot.room_number}</p>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-center text-gray-300 text-[10px]">—</div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
