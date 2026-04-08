"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button, Select, Card, LoadingSkeleton } from "@/app/components/shared";
import { ArrowLeftIcon, PencilSquareIcon } from "@heroicons/react/24/outline";

interface AssignedClass { class_section_id: number; class_name: string; section_name: string }
interface Exam { id: number; name: string; status: string; class_section_id: number; class_name: string; section_name: string }
interface Subject { subject_id: number; subject_name: string; maximum_marks: number }
interface StudentRow { enrollment_id: number; roll_number: number | null; first_name: string; last_name: string }
interface MarkRecord { student_enrollment_id: number; subject_id: number; obtained_marks: number | null; is_absent: number; percentage: number | null }

const STATUS_COLORS: Record<string, string> = {
  upcoming: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
};

type ViewMode = "list" | "grid";

export default function TeacherMarksPage() {
  const [classes, setClasses] = useState<AssignedClass[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [examsLoading, setExamsLoading] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [marks, setMarks] = useState<MarkRecord[]>([]);
  const [gridLoading, setGridLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Editable marks: "enrollmentId-subjectId" -> { obtained, absent }
  const [editMap, setEditMap] = useState<Map<string, { obtained: string; absent: boolean }>>(new Map());

  // Fetch classes and exams
  useEffect(() => {
    async function load() {
      try {
        const classesRes = await fetch("/api/teacher/classes");
        const cj = await classesRes.json();
        const assignedClasses = cj.data || [];
        setClasses(assignedClasses);

        // Fetch exams for all assigned classes
        const allExams: Exam[] = [];
        for (const cls of assignedClasses) {
          const res = await fetch(`/api/exams?class_section_id=${cls.class_section_id}&limit=100`);
          if (res.ok) {
            const ej = await res.json();
            for (const exam of ej.data?.exams || []) {
              if (exam.status === "completed") {
                allExams.push({ ...exam, class_name: cls.class_name, section_name: cls.section_name });
              }
            }
          }
        }
        setExams(allExams);
      } catch { /* ignore */ }
      finally { setExamsLoading(false); }
    }
    load();
  }, []);

  // Open grid for an exam
  const openGrid = useCallback(async (exam: Exam) => {
    setSelectedExam(exam);
    setViewMode("grid");
    setGridLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/marks/overview?exam_id=${exam.id}`);
      if (res.ok) {
        const json = await res.json();
        setSubjects(json.data.subjects || []);
        setStudents(json.data.students || []);
        setMarks(json.data.marks || []);

        // Populate edit map
        const m = new Map<string, { obtained: string; absent: boolean }>();
        for (const mk of json.data.marks || []) {
          m.set(`${mk.student_enrollment_id}-${mk.subject_id}`, {
            obtained: mk.obtained_marks != null ? String(mk.obtained_marks) : "",
            absent: mk.is_absent === 1,
          });
        }
        setEditMap(m);
      }
    } catch { /* ignore */ }
    finally { setGridLoading(false); }
  }, []);

  const updateCell = (enrollmentId: number, subjectId: number, field: "obtained" | "absent", value: string | boolean) => {
    const key = `${enrollmentId}-${subjectId}`;
    setEditMap((prev) => {
      const m = new Map(prev);
      const cur = m.get(key) || { obtained: "", absent: false };
      if (field === "absent") m.set(key, { ...cur, absent: value as boolean, obtained: value ? "" : cur.obtained });
      else m.set(key, { ...cur, obtained: value as string });
      return m;
    });
  };

  const handleSave = async () => {
    if (!selectedExam) return;
    setSaving(true);
    setMessage("");

    // Group marks by subject for bulk save
    const marksBySubject = new Map<number, { enrollment_id: number; obtained_marks: number | null; is_absent: boolean }[]>();
    for (const sub of subjects) {
      const subMarks: { enrollment_id: number; obtained_marks: number | null; is_absent: boolean }[] = [];
      for (const s of students) {
        const key = `${s.enrollment_id}-${sub.subject_id}`;
        const entry = editMap.get(key);
        subMarks.push({
          enrollment_id: s.enrollment_id,
          obtained_marks: entry?.absent ? null : (entry?.obtained ? Number(entry.obtained) : null),
          is_absent: entry?.absent || false,
        });
      }
      marksBySubject.set(sub.subject_id, subMarks);
    }

    try {
      // Save for each subject
      for (const [subjectId, subMarks] of marksBySubject) {
        const res = await fetch("/api/marks/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exam_id: selectedExam.id, subject_id: subjectId, marks: subMarks }),
        });
        if (!res.ok) {
          const j = await res.json();
          setMessage(j.error || "Failed to save marks.");
          setSaving(false);
          return;
        }
      }
      setMessage("All marks saved successfully!");
      // Refresh
      await openGrid(selectedExam);
    } catch {
      setMessage("Failed to save marks.");
    } finally {
      setSaving(false);
    }
  };

  const computePct = (obtained: string, maxMarks: number) => {
    const val = Number(obtained);
    if (isNaN(val) || !obtained) return null;
    return Math.round((val / maxMarks) * 100 * 100) / 100;
  };

  // LIST VIEW
  if (viewMode === "list") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-primary-900">Marks</h1>

        {examsLoading ? <LoadingSkeleton lines={6} /> : exams.length === 0 ? (
          <Card><p className="text-center text-gray-500 py-8">No completed exams found for your classes.</p></Card>
        ) : (
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Exam Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Class</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {exams.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-900">{e.name}</td>
                      <td className="px-4 py-3 text-gray-600">{e.class_name} - {e.section_name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[e.status] || ""}`}>
                          {e.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="primary" size="sm" onClick={() => openGrid(e)}>
                          <PencilSquareIcon className="h-4 w-4" /> Add Marks
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    );
  }

  // GRID VIEW
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => setViewMode("list")} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors">
          <ArrowLeftIcon className="h-4 w-4" /> Back to Exams
        </button>
        {selectedExam && (
          <>
            <h2 className="text-lg font-semibold text-primary-900">{selectedExam.name}</h2>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[selectedExam.status] || ""}`}>
              {selectedExam.status.replace("_", " ")}
            </span>
          </>
        )}
      </div>

      {gridLoading ? <LoadingSkeleton lines={8} /> : subjects.length > 0 && students.length > 0 ? (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                {/* Subject name row */}
                <tr className="bg-primary-900 text-white">
                  <th className="sticky left-0 z-20 bg-primary-900 px-2 py-2 text-left font-semibold border-r border-primary-800 min-w-[40px]">S.No.</th>
                  <th className="sticky left-[40px] z-20 bg-primary-900 px-2 py-2 text-left font-semibold border-r border-primary-800 min-w-[100px]">Name</th>
                  <th className="sticky left-[140px] z-20 bg-primary-900 px-2 py-2 text-left font-semibold border-r border-primary-800 min-w-[50px]">Roll No.</th>
                  {subjects.map((sub) => (
                    <th key={sub.subject_id} colSpan={3} className="px-1 py-2 text-center font-semibold border-r border-primary-800">
                      {sub.subject_name}
                    </th>
                  ))}
                </tr>
                {/* Sub-headers */}
                <tr className="bg-primary-900 text-white">
                  <th className="sticky left-0 z-20 bg-primary-900 border-r border-primary-800" />
                  <th className="sticky left-[40px] z-20 bg-primary-900 border-r border-primary-800" />
                  <th className="sticky left-[140px] z-20 bg-primary-900 border-r border-primary-800" />
                  {subjects.map((sub) => (
                    <React.Fragment key={`sub-${sub.subject_id}`}>
                      <th className="px-1 py-1.5 text-center font-medium border-r border-primary-800 min-w-[55px]">Marks</th>
                      <th className="px-1 py-1.5 text-center font-medium border-r border-primary-800 min-w-[45px]">Ab/NA</th>
                      <th className="px-1 py-1.5 text-center font-medium border-r border-primary-800 min-w-[45px]">%</th>
                    </React.Fragment>
                  ))}
                </tr>
                {/* Max marks row */}
                <tr className="bg-primary-800 text-white">
                  <th className="sticky left-0 z-20 bg-primary-800 border-r border-primary-700" />
                  <th className="sticky left-[40px] z-20 bg-primary-800 border-r border-primary-700" />
                  <th className="sticky left-[140px] z-20 bg-primary-800 border-r border-primary-700" />
                  {subjects.map((sub) => (
                    <React.Fragment key={`max-${sub.subject_id}`}>
                      <th className="px-1 py-1.5 text-center font-bold text-green-300 border-r border-primary-700">{sub.maximum_marks}</th>
                      <th className="px-1 py-1.5 text-center text-gray-400 border-r border-primary-700">-</th>
                      <th className="px-1 py-1.5 text-center text-gray-400 border-r border-primary-700">-</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((s, idx) => (
                  <tr key={s.enrollment_id} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                    <td className="sticky left-0 z-10 bg-inherit px-2 py-1.5 text-gray-500 font-medium border-b border-r border-gray-100">{idx + 1}</td>
                    <td className="sticky left-[40px] z-10 bg-inherit px-2 py-1.5 text-gray-900 font-medium border-b border-r border-gray-100 whitespace-nowrap">{s.first_name} {s.last_name}</td>
                    <td className="sticky left-[140px] z-10 bg-inherit px-2 py-1.5 text-gray-500 border-b border-r border-gray-100">{s.roll_number || "-"}</td>
                    {subjects.map((sub) => {
                      const key = `${s.enrollment_id}-${sub.subject_id}`;
                      const entry = editMap.get(key) || { obtained: "", absent: false };
                      const pct = entry.absent ? null : computePct(entry.obtained, sub.maximum_marks);
                      const pctColor = pct === null ? "text-gray-400" : pct < 33 ? "text-red-600 font-semibold" : "text-gray-700";

                      return (
                        <React.Fragment key={key}>
                          <td className="px-0.5 py-1 text-center border-b border-r border-gray-100">
                            <input
                              type="number" min="0" max={sub.maximum_marks} step="0.5"
                              value={entry.obtained} disabled={entry.absent}
                              onChange={(e) => updateCell(s.enrollment_id, sub.subject_id, "obtained", e.target.value)}
                              className={`w-14 text-center px-1 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 ${
                                entry.absent ? "bg-gray-100 border-gray-200" : "border-gray-300"
                              }`}
                            />
                          </td>
                          <td className="px-0.5 py-1 text-center border-b border-r border-gray-100">
                            <input type="checkbox" checked={entry.absent}
                              onChange={(e) => updateCell(s.enrollment_id, sub.subject_id, "absent", e.target.checked)}
                              className="h-3.5 w-3.5 rounded border-gray-300 text-red-600 focus:ring-red-500" />
                          </td>
                          <td className={`px-0.5 py-1 text-center border-b border-r border-gray-100 ${pctColor}`}>
                            {entry.absent ? "-" : pct !== null ? `${pct}%` : "-"}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-t border-gray-200 text-xs text-gray-500">
            <span>AB = Absent</span>
            <span>NA = Not Appeared</span>
            <span className="text-red-500">Red % = Below 33% (fail)</span>
          </div>
        </Card>
      ) : (
        <Card><p className="text-center text-gray-500 py-8">No data found.</p></Card>
      )}

      {message && <p className={`text-sm font-medium ${message.includes("success") ? "text-green-600" : "text-red-600"}`}>{message}</p>}

      {/* Sticky Save */}
      {students.length > 0 && subjects.length > 0 && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg z-40 -mx-4 sm:-mx-6">
          <Button variant="primary" className="w-full bg-yellow-500 hover:bg-yellow-600" onClick={handleSave} loading={saving}>
            Save All Marks
          </Button>
        </div>
      )}
    </div>
  );
}
