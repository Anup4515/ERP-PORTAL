"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Select, Card, LoadingSkeleton } from "@/app/components/shared";

interface Section { id: number; name: string; class_section_id: number | null }
interface ClassData { id: number; name: string; sections: Section[] }
interface Exam { id: number; name: string; status: string; class_section_id: number }
interface Subject { subject_id: number; subject_name: string; maximum_marks: number }
interface StudentRow { enrollment_id: number; roll_number: number | null; first_name: string; last_name: string }
interface MarkRecord { student_enrollment_id: number; subject_id: number; obtained_marks: number | null; is_absent: number; percentage: number | null }

const STATUS_COLORS: Record<string, string> = {
  upcoming: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
};

export default function AdminMarksPage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [csValue, setCsValue] = useState("");
  const [exams, setExams] = useState<Exam[]>([]);
  const [examId, setExamId] = useState("");
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [marks, setMarks] = useState<MarkRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const csOptions: { value: string; label: string }[] = [];
  for (const cls of classes) {
    for (const sec of cls.sections) {
      if (sec.class_section_id) csOptions.push({ value: String(sec.class_section_id), label: `${cls.name} - ${sec.name}` });
    }
  }

  useEffect(() => {
    fetch("/api/classes").then((r) => r.json()).then((j) => { if (j.data) setClasses(j.data); }).catch(() => {});
  }, []);

  // Fetch exams (only completed) when class changes
  useEffect(() => {
    if (!csValue) { setExams([]); setExamId(""); return; }
    fetch(`/api/exams?class_section_id=${csValue}&limit=100`).then((r) => r.json()).then((j) => {
      const completed = (j.data?.exams || []).filter((e: Exam) => e.status === "completed");
      setExams(completed);
      setExamId("");
    }).catch(() => {});
  }, [csValue]);

  // Fetch overview when exam selected
  const fetchOverview = useCallback(async () => {
    if (!examId) { setSubjects([]); setStudents([]); setMarks([]); return; }
    setLoading(true);
    setSelectedExam(exams.find((e) => String(e.id) === examId) || null);
    try {
      const res = await fetch(`/api/marks/overview?exam_id=${examId}`);
      if (res.ok) {
        const json = await res.json();
        setSubjects(json.data.subjects || []);
        setStudents(json.data.students || []);
        setMarks(json.data.marks || []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [examId, exams]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  // Build marks lookup: "enrollmentId-subjectId" -> record
  const marksMap = new Map<string, MarkRecord>();
  for (const m of marks) {
    marksMap.set(`${m.student_enrollment_id}-${m.subject_id}`, m);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary-900">Marks</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        <Select label="Class - Section" value={csValue} onChange={(e) => setCsValue(e.target.value)}
          options={[{ value: "", label: "Select class" }, ...csOptions]} />
        <Select label="Exam (Completed)" value={examId} onChange={(e) => setExamId(e.target.value)}
          options={[{ value: "", label: csValue ? (exams.length === 0 ? "No completed exams" : "Select exam") : "Select class first" }, ...exams.map((e) => ({ value: String(e.id), label: e.name }))]}
          disabled={!csValue} />
      </div>

      {loading ? <LoadingSkeleton lines={8} /> : subjects.length > 0 && students.length > 0 ? (
        <>
          {selectedExam && (
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-primary-900">{selectedExam.name}</h2>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[selectedExam.status] || ""}`}>
                {selectedExam.status.replace("_", " ")}
              </span>
            </div>
          )}

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
                  {/* Sub-headers row */}
                  <tr className="bg-primary-900 text-white">
                    <th className="sticky left-0 z-20 bg-primary-900 border-r border-primary-800" />
                    <th className="sticky left-[40px] z-20 bg-primary-900 border-r border-primary-800" />
                    <th className="sticky left-[140px] z-20 bg-primary-900 border-r border-primary-800" />
                    {subjects.map((sub) => (
                      <React.Fragment key={`sub-${sub.subject_id}`}>
                        <th className="px-1 py-1.5 text-center font-medium border-r border-primary-800 min-w-[50px]">Marks</th>
                        <th className="px-1 py-1.5 text-center font-medium border-r border-primary-800 min-w-[40px]">Ab/NA</th>
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
                    <tr key={s.enrollment_id} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"} hover:bg-blue-50/20`}>
                      <td className="sticky left-0 z-10 bg-inherit px-2 py-2 text-gray-500 font-medium border-b border-r border-gray-100">{idx + 1}</td>
                      <td className="sticky left-[40px] z-10 bg-inherit px-2 py-2 text-gray-900 font-medium border-b border-r border-gray-100 whitespace-nowrap">{s.first_name} {s.last_name}</td>
                      <td className="sticky left-[140px] z-10 bg-inherit px-2 py-2 text-gray-500 border-b border-r border-gray-100">{s.roll_number || "-"}</td>
                      {subjects.map((sub) => {
                        const m = marksMap.get(`${s.enrollment_id}-${sub.subject_id}`);
                        const pct = m?.percentage != null ? Number(m.percentage) : null;
                        const pctColor = pct === null ? "text-gray-400" : pct < 33 ? "text-red-600 font-semibold" : "text-gray-700";
                        return (
                          <React.Fragment key={`${s.enrollment_id}-${sub.subject_id}`}>
                            <td className="px-1 py-2 text-center border-b border-r border-gray-100">
                              {m?.is_absent ? "-" : m?.obtained_marks != null ? <span className="font-medium">{m.obtained_marks}</span> : <span className="text-gray-300">-</span>}
                            </td>
                            <td className="px-1 py-2 text-center border-b border-r border-gray-100">
                              {m?.is_absent ? <span className="text-red-500 font-medium">AB</span> : <span className="text-gray-300">-</span>}
                            </td>
                            <td className={`px-1 py-2 text-center border-b border-r border-gray-100 ${pctColor}`}>
                              {m?.is_absent ? "-" : pct !== null ? `${pct}%` : "-"}
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
        </>
      ) : examId && !loading ? (
        <Card><p className="text-center text-gray-500 py-8">No data found for this exam.</p></Card>
      ) : null}
    </div>
  );
}
