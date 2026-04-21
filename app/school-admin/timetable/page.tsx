"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Button,
  Select,
  Card,
  Modal,
  Input,
  LoadingSkeleton,
} from "@/app/components/shared";
import {
  PlusIcon,
  TrashIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { useViewingSession } from "@/app/components/providers/ViewingSessionProvider";
import { usePartnerBranding } from "@/app/components/providers/PartnerBrandingProvider";

interface Section { id: number; name: string; class_section_id: number | null }
interface ClassData { id: number; name: string; sections: Section[] }
interface PeriodConfig { id: number; period_number: number; start_time: string; end_time: string; slot_type: string; label: string }
interface Subject { id: number; name: string }
interface Teacher { id: string; name: string } // id = "t:userId" or "s:staffId"
interface Slot { day_of_week: string; period_number: number; subject_id: number | null; teacher_id: number | null; staff_id: number | null; subject_name: string | null; teacher_name: string | null; room_number: string | null }

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SLOT_COLORS: Record<string, string> = {
  class: "bg-white",
  break: "bg-orange-50",
  lunch: "bg-yellow-50",
  assembly: "bg-blue-50",
};

export default function TimetablePage() {
  const { viewingSession, isViewingPastSession, withSessionId } = useViewingSession();
  const { label } = usePartnerBranding();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [csValue, setCsValue] = useState("");
  const [config, setConfig] = useState<PeriodConfig[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const messageTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const showMessage = (msg: string, duration = 5000) => {
    setMessage(msg);
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    messageTimerRef.current = setTimeout(() => setMessage(""), duration);
  };

  // Config modal
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState<{ period_number: number; start_time: string; end_time: string; slot_type: string; label: string }[]>([]);
  const [configSaving, setConfigSaving] = useState(false);

  // Editable grid: "day-period" -> { subject_id, teacher_id }
  const [grid, setGrid] = useState<Map<string, { subject_id: string; teacher_id: string }>>(new Map());

  // Class-section options
  const csOptions: { value: string; label: string }[] = [];
  for (const cls of classes) {
    for (const sec of cls.sections) {
      if (sec.class_section_id) csOptions.push({ value: String(sec.class_section_id), label: `${cls.name} - ${sec.name}` });
    }
  }

  // Fetch classes + config
  useEffect(() => {
    Promise.all([
      fetch(withSessionId("/api/classes")).then((r) => r.json()),
      fetch(withSessionId("/api/timetable/config")).then((r) => r.json()),
      fetch(withSessionId("/api/teachers?limit=100")).then((r) => r.json()),
      fetch(withSessionId("/api/staff?limit=100")).then((r) => r.json()),
    ]).then(([cj, tj, teachJ, staffJ]) => {
      if (cj.data) setClasses(cj.data);
      if (tj.data) setConfig(tj.data);
      // Merge login-teachers + staff into one list with prefixed IDs
      const allTeachers: Teacher[] = [];
      const teachersList = teachJ.data?.teachers || teachJ.data || [];
      for (const t of teachersList) {
        allTeachers.push({ id: `t:${t.user_id}`, name: t.name });
      }
      const staffList = staffJ.data?.staff || staffJ.data || [];
      for (const s of staffList) {
        if (s.status === "active") {
          allTeachers.push({ id: `s:${s.id}`, name: `${s.name} (${s.designation})` });
        }
      }
      setTeachers(allTeachers);
    }).catch(() => {});
  }, [viewingSession?.id, withSessionId]);

  // Fetch subjects + slots when class changes
  const fetchSlots = useCallback(async () => {
    if (!csValue) { setSlots([]); setSubjects([]); return; }
    setLoading(true);
    try {
      const [slotsRes, subsRes] = await Promise.all([
        fetch(withSessionId(`/api/timetable/slots?class_section_id=${csValue}`)),
        fetch(withSessionId(`/api/subjects?class_section_id=${csValue}`)),
      ]);
      const slotsJson = await slotsRes.json();
      const subsJson = await subsRes.json();
      setSlots(slotsJson.data || []);
      setSubjects(subsJson.data || []);

      // Populate grid with composite teacher IDs
      const m = new Map<string, { subject_id: string; teacher_id: string }>();
      for (const s of slotsJson.data || []) {
        let teacherComposite = "";
        if (s.teacher_id) teacherComposite = `t:${s.teacher_id}`;
        else if (s.staff_id) teacherComposite = `s:${s.staff_id}`;

        m.set(`${s.day_of_week}-${s.period_number}`, {
          subject_id: s.subject_id ? String(s.subject_id) : "",
          teacher_id: teacherComposite,
        });
      }
      setGrid(m);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [csValue, viewingSession?.id, withSessionId]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  const updateGrid = (day: string, period: number, field: "subject_id" | "teacher_id", value: string) => {
    const key = `${day}-${period}`;
    setGrid((prev) => {
      const m = new Map(prev);
      const cur = m.get(key) || { subject_id: "", teacher_id: "" };
      m.set(key, { ...cur, [field]: value });
      return m;
    });
  };

  // Save timetable
  const handleSave = async () => {
    if (!csValue) return;
    setSaving(true);
    setMessage("");

    const slotsToSave: { day_of_week: string; period_number: number; subject_id: number | null; teacher_id: number | null; staff_id: number | null }[] = [];
    for (const [key, val] of grid) {
      const [day, periodStr] = key.split("-");
      const period = Number(periodStr);
      if (val.subject_id || val.teacher_id) {
        let teacher_id: number | null = null;
        let staff_id: number | null = null;
        if (val.teacher_id.startsWith("t:")) teacher_id = Number(val.teacher_id.slice(2));
        else if (val.teacher_id.startsWith("s:")) staff_id = Number(val.teacher_id.slice(2));

        slotsToSave.push({
          day_of_week: day,
          period_number: period,
          subject_id: val.subject_id ? Number(val.subject_id) : null,
          teacher_id,
          staff_id,
        });
      }
    }

    try {
      const res = await fetch(withSessionId("/api/timetable/slots"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_section_id: Number(csValue), slots: slotsToSave }),
      });
      const json = await res.json();
      if (res.ok) {
        showMessage("Timetable saved successfully!");
        await fetchSlots();
      } else if (res.status === 409 && json.conflicts) {
        showMessage("Conflicts: " + json.conflicts.join(" | "), 8000);
      } else {
        showMessage(json.error || "Failed to save.");
      }
    } catch { showMessage("Failed to save timetable."); }
    finally { setSaving(false); }
  };

  // Config management
  const openConfigModal = () => {
    if (config.length > 0) {
      setConfigForm(config.map((c) => ({
        period_number: c.period_number,
        start_time: c.start_time,
        end_time: c.end_time,
        slot_type: c.slot_type,
        label: c.label,
      })));
    } else {
      // Default 8 periods + 1 break + 1 lunch
      setConfigForm([
          { period_number: 1, start_time: "08:30", end_time: "09:10", slot_type: "class", label: "Period 1" },
  { period_number: 2, start_time: "09:10", end_time: "09:50", slot_type: "class", label: "Period 2" },
  { period_number: 3, start_time: "09:50", end_time: "10:30", slot_type: "class", label: "Period 3" },
  { period_number: 4, start_time: "10:30", end_time: "11:10", slot_type: "class", label: "Period 4" },

  { period_number: 5, start_time: "11:10", end_time: "11:30", slot_type: "lunch", label: "Lunch" },

  { period_number: 6, start_time: "11:30", end_time: "12:10", slot_type: "class", label: "Period 5" },
  { period_number: 7, start_time: "12:10", end_time: "12:50", slot_type: "class", label: "Period 6" },
  { period_number: 8, start_time: "12:50", end_time: "13:30", slot_type: "class", label: "Period 7" },
  { period_number: 9, start_time: "13:30", end_time: "14:10", slot_type: "class", label: "Period 8" },
      ]);
    }
    setShowConfigModal(true);
  };

  const addConfigRow = () => {
    const next = configForm.length > 0 ? Math.max(...configForm.map((c) => c.period_number)) + 1 : 1;
    setConfigForm((prev) => [...prev, { period_number: next, start_time: "", end_time: "", slot_type: "class", label: `Period ${next}` }]);
  };

  const removeConfigRow = (idx: number) => {
    setConfigForm((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveConfig = async () => {
    setConfigSaving(true);
    // Renumber
    const periods = configForm.map((c, i) => ({ ...c, period_number: i + 1 }));
    try {
      const res = await fetch(withSessionId("/api/timetable/config"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periods }),
      });
      if (res.ok) {
        setShowConfigModal(false);
        // Refresh config
        const cRes = await fetch(withSessionId("/api/timetable/config"));
        const cj = await cRes.json();
        if (cj.data) setConfig(cj.data);
      }
    } catch { /* ignore */ }
    finally { setConfigSaving(false); }
  };

  const classPeriods = config.filter((c) => c.slot_type === "class");
  const allPeriods = config;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-primary-900">Timetable</h1>
        <Button variant="outline" size="sm" onClick={openConfigModal} disabled={isViewingPastSession}>
          <Cog6ToothIcon className="h-4 w-4" /> Period Structure
        </Button>
      </div>

      {/* Class selector */}
      <div className="max-w-xs">
        <Select label="Class - Section" value={csValue} onChange={(e) => setCsValue(e.target.value)}
          options={[{ value: "", label: "Select class" }, ...csOptions]} />
      </div>

      {message && (
        <div className={`rounded-lg px-4 py-3 text-sm border ${message.includes("success") ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {message}
        </div>
      )}

      {/* Timetable grid */}
      {config.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No period structure configured.</p>
            <p className="text-gray-400 text-xs mt-1">Click &quot;Period Structure&quot; to set up periods, breaks, and lunch times.</p>
          </div>
        </Card>
      ) : !csValue ? (
        <Card><p className="text-center text-gray-500 py-8">Select a class to view/edit timetable.</p></Card>
      ) : loading ? (
        <LoadingSkeleton lines={10} />
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-primary-900 text-white">
                  <th className="sticky left-0 z-20 bg-primary-900 px-3 py-2.5 text-left font-semibold border-r border-primary-800 min-w-[100px]">Period</th>
                  <th className="bg-primary-900 px-2 py-2.5 text-center font-semibold border-r border-primary-800 min-w-[60px]">Time</th>
                  {DAYS.map((d) => (
                    <th key={d} className="px-2 py-2.5 text-center font-semibold border-r border-primary-800 min-w-[140px]">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allPeriods.map((period) => {
                  const isClass = period.slot_type === "class";
                  const bgColor = SLOT_COLORS[period.slot_type] || "bg-white";

                  return (
                    <tr key={period.period_number} className={bgColor}>
                      <td className={`sticky left-0 z-10 px-3 py-2 font-medium border-b border-r border-gray-200 ${bgColor} ${!isClass ? "text-gray-500 italic" : "text-gray-900"}`}>
                        {period.label}
                      </td>
                      <td className={`px-2 py-2 text-center text-gray-500 border-b border-r border-gray-200 ${bgColor}`}>
                        <div className="text-[10px] leading-tight">
                          {period.start_time?.slice(0, 5)}<br />{period.end_time?.slice(0, 5)}
                        </div>
                      </td>
                      {DAYS.map((day) => {
                        if (!isClass) {
                          return (
                            <td key={day} className="px-2 py-2 text-center text-gray-400 italic border-b border-r border-gray-100">
                              {period.label}
                            </td>
                          );
                        }

                        const key = `${day}-${period.period_number}`;
                        const cell = grid.get(key) || { subject_id: "", teacher_id: "" };

                        return (
                          <td key={day} className="px-1 py-1.5 border-b border-r border-gray-100">
                            <div className="space-y-1">
                              <select
                                value={cell.subject_id}
                                onChange={(e) => updateGrid(day, period.period_number, "subject_id", e.target.value)}
                                disabled={isViewingPastSession}
                                className="w-full text-[11px] px-1.5 py-1 border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="">Subject</option>
                                {subjects.map((s) => (
                                  <option key={s.id} value={String(s.id)}>{s.name}</option>
                                ))}
                              </select>
                              <select
                                value={cell.teacher_id}
                                onChange={(e) => updateGrid(day, period.period_number, "teacher_id", e.target.value)}
                                disabled={isViewingPastSession}
                                className="w-full text-[11px] px-1.5 py-1 border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="">Teacher</option>
                                {teachers.map((t) => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                            </div>
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

      {/* Save Button */}
      {csValue && config.length > 0 && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg z-40 -mx-4 sm:-mx-6">
          <Button variant="primary" className="w-full" onClick={handleSave} loading={saving} disabled={isViewingPastSession}>
            Save Timetable
          </Button>
        </div>
      )}

      {/* Period Config Modal */}
      <Modal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} title="Period Structure" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Define the period structure for your {label}. This applies to all classes.</p>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {configForm.map((p, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-3">
                  <input value={p.label} onChange={(e) => setConfigForm((prev) => prev.map((c, i) => i === idx ? { ...c, label: e.target.value } : c))}
                    disabled={isViewingPastSession}
                    className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Label" />
                </div>
                <div className="col-span-2">
                  <input type="time" value={p.start_time} onChange={(e) => setConfigForm((prev) => prev.map((c, i) => i === idx ? { ...c, start_time: e.target.value } : c))}
                    disabled={isViewingPastSession}
                    className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                </div>
                <div className="col-span-2">
                  <input type="time" value={p.end_time} onChange={(e) => setConfigForm((prev) => prev.map((c, i) => i === idx ? { ...c, end_time: e.target.value } : c))}
                    disabled={isViewingPastSession}
                    className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                </div>
                <div className="col-span-3">
                  <select value={p.slot_type} onChange={(e) => setConfigForm((prev) => prev.map((c, i) => i === idx ? { ...c, slot_type: e.target.value } : c))}
                    disabled={isViewingPastSession}
                    className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed">
                    <option value="class">Class</option>
                    <option value="break">Break</option>
                    <option value="lunch">Lunch</option>
                    <option value="assembly">Assembly</option>
                  </select>
                </div>
                <div className="col-span-2 text-right">
                  <button onClick={() => removeConfigRow(idx)} disabled={isViewingPastSession} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={addConfigRow} disabled={isViewingPastSession}>
            <PlusIcon className="h-4 w-4" /> Add Period
          </Button>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowConfigModal(false)}>Cancel</Button>
            <Button variant="primary" loading={configSaving} onClick={saveConfig} disabled={isViewingPastSession}>Save Structure</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
