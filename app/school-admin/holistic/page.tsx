"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, Select, LoadingSkeleton, EmptyState } from "@/app/components/shared";
import { SparklesIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface SubParameter { id: number; name: string }
interface Student { enrollment_id: number; first_name: string; last_name: string; roll_number: number | null }
interface RatingEntry { rating_value: number | null; comments: string | null }
interface Parameter { id: number; name: string; stage: string | null; sub_parameters: { id: number; name: string }[] }
interface Section { id: number; name: string; class_section_id: number | null }
interface ClassData { id: number; name: string; grade_level: number | null; sections: Section[] }

const STAGE_LABELS: Record<string, string> = {
  foundational: "Foundational (Nursery - Class 2)",
  preparatory: "Preparatory (Class 3 - 5)",
  middle: "Middle (Class 6 - 8)",
  secondary: "Secondary (Class 9 - 12)",
};

function gradeToStage(gradeLevel: number | null): string {
  if (!gradeLevel || gradeLevel <= 2) return "foundational";
  if (gradeLevel <= 5) return "preparatory";
  if (gradeLevel <= 8) return "middle";
  return "secondary";
}

function formatMonth(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return formatMonth(d);
}
function displayMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
function ratingBg(val: number | null | undefined) {
  if (val == null) return "";
  if (val <= 3) return "bg-red-50 text-red-700";
  if (val <= 6) return "bg-yellow-50 text-yellow-700";
  return "bg-green-50 text-green-700";
}

export default function AdminHolisticPage() {
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);

  const [classSectionId, setClassSectionId] = useState("");
  const [parameterId, setParameterId] = useState("");
  const [month, setMonth] = useState(formatMonth(new Date()));

  const [students, setStudents] = useState<Student[]>([]);
  const [subParams, setSubParams] = useState<SubParameter[]>([]);
  const [ratings, setRatings] = useState<Record<string, RatingEntry>>({});
  const [gridLoading, setGridLoading] = useState(false);

  // Fetch parameters + classes on mount
  useEffect(() => {
    Promise.all([
      fetch("/api/holistic/parameters").then((r) => r.json()),
      fetch("/api/classes").then((r) => r.json()),
    ])
      .then(([paramJson, classJson]) => {
        if (paramJson.data) setParameters(paramJson.data);
        if (classJson.data) setClasses(classJson.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Build class-section options and a map from cs_id → grade_level
  const csGradeMap: Record<string, number | null> = {};
  const classSectionOptions = (() => {
    const opts: { value: string; label: string }[] = [{ value: "", label: "Select Class & Section" }];
    classes.forEach((cls) => {
      (cls.sections || []).forEach((sec) => {
        if (sec.class_section_id) {
          const csId = String(sec.class_section_id);
          csGradeMap[csId] = cls.grade_level;
          opts.push({ value: csId, label: `${cls.name} - ${sec.name}` });
        }
      });
    });
    return opts;
  })();

  // Determine selected class's stage
  const selectedStage = classSectionId ? gradeToStage(csGradeMap[classSectionId]) : null;

  // Filter parameters: show only those matching the selected class's stage (+ ungrouped)
  const parameterOptions = (() => {
    const opts: { value: string; label: string }[] = [{ value: "", label: "Select Parameter" }];
    parameters.forEach((p) => {
      if (p.sub_parameters.length === 0) return;
      // If a class is selected, only show params for that stage (or params without a stage)
      if (selectedStage && p.stage && p.stage !== selectedStage) return;
      opts.push({ value: String(p.id), label: p.name });
    });
    return opts;
  })();

  // Fetch rating grid
  const fetchRatings = useCallback(async () => {
    if (!classSectionId || !parameterId) {
      setStudents([]);
      setSubParams([]);
      setRatings({});
      return;
    }
    setGridLoading(true);
    try {
      const res = await fetch(
        `/api/holistic/ratings?parameter_id=${parameterId}&class_section_id=${classSectionId}&month=${month}-01`
      );
      const json = await res.json();
      if (json.data) {
        setStudents(json.data.students || []);
        setSubParams(json.data.sub_parameters || []);
        setRatings(json.data.ratings || {});
      }
    } catch {
      setStudents([]);
    } finally {
      setGridLoading(false);
    }
  }, [classSectionId, parameterId, month]);

  useEffect(() => {
    if (classSectionId && parameterId) fetchRatings();
  }, [fetchRatings, classSectionId, parameterId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">Holistic Development</h1>
          <p className="text-sm text-gray-500 mt-1">View student holistic ratings (read-only)</p>
        </div>
        <LoadingSkeleton lines={8} />
      </div>
    );
  }

  if (parameters.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">Holistic Development</h1>
          <p className="text-sm text-gray-500 mt-1">View student holistic ratings</p>
        </div>
        <EmptyState
          icon={<SparklesIcon className="h-12 w-12" />}
          title="No Parameters Configured"
          description="Go to Settings → Holistic to load default parameters or add them manually."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-primary-900">Holistic Development</h1>
        <p className="text-sm text-gray-500 mt-1">View student holistic ratings (read-only)</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 flex-wrap">
        <div className="w-full sm:w-56">
          <Select
            label="Class & Section"
            name="class_section"
            value={classSectionId}
            onChange={(e) => { setClassSectionId(e.target.value); setParameterId(""); }}
            options={classSectionOptions}
          />
        </div>
        <div className="w-full sm:w-56">
          <Select
            label="Parameter"
            name="parameter"
            value={parameterId}
            onChange={(e) => setParameterId(e.target.value)}
            options={parameterOptions}
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMonth((m) => shiftMonth(m, -1))} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-primary-900 min-w-[120px] text-center">
            {displayMonth(month)}
          </span>
          <button onClick={() => setMonth((m) => shiftMonth(m, 1))} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stage info */}
      {selectedStage && (
        <p className="text-xs text-gray-400">Class Stage: {STAGE_LABELS[selectedStage] || selectedStage} — showing matching parameters only</p>
      )}

      {/* Content */}
      {!classSectionId || !parameterId ? (
        <Card><p className="text-center text-gray-500 py-8 text-sm">Select a class, parameter, and month to view ratings.</p></Card>
      ) : gridLoading ? (
        <LoadingSkeleton lines={10} />
      ) : students.length === 0 ? (
        <Card><p className="text-center text-gray-500 py-8 text-sm">No students found for this class.</p></Card>
      ) : subParams.length === 0 ? (
        <Card><p className="text-center text-gray-500 py-8 text-sm">No sub-parameters for this parameter.</p></Card>
      ) : (
        <>
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-primary-900 text-white">
                    <th className="sticky left-0 z-20 bg-primary-900 px-3 py-2.5 text-left font-semibold border-r border-primary-800 min-w-[50px]">Roll</th>
                    <th className="sticky left-[50px] z-20 bg-primary-900 px-3 py-2.5 text-left font-semibold border-r border-primary-800 min-w-[140px]">Student</th>
                    {subParams.map((sp) => (
                      <th key={sp.id} className="px-2 py-2.5 text-center font-semibold border-r border-primary-800 min-w-[80px]">
                        <span className="text-[10px]">{sp.name}</span>
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-left font-semibold min-w-[140px]">Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, i) => (
                    <tr key={student.enrollment_id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      <td className="sticky left-0 z-10 px-3 py-2.5 font-medium text-gray-700 border-b border-r border-gray-100 bg-inherit text-center">
                        {student.roll_number ?? "-"}
                      </td>
                      <td className="sticky left-[50px] z-10 px-3 py-2.5 text-gray-900 border-b border-r border-gray-100 bg-inherit whitespace-nowrap">
                        {student.first_name} {student.last_name}
                      </td>
                      {subParams.map((sp) => {
                        const key = `${student.enrollment_id}-${sp.id}`;
                        const entry = ratings[key];
                        const val = entry?.rating_value;
                        return (
                          <td key={sp.id} className="px-2 py-2.5 text-center border-b border-r border-gray-100">
                            {val != null ? (
                              <span className={`inline-block w-10 text-center text-sm font-medium rounded px-1.5 py-0.5 ${ratingBg(val)}`}>
                                {val}
                              </span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2.5 border-b border-gray-100 text-gray-500 text-xs">
                        {ratings[`${student.enrollment_id}-${subParams[0]?.id}`]?.comments || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Legend */}
          <div className="flex items-center gap-4 text-[10px] text-gray-500">
            <span>Rating: 0-10</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-50 border border-red-200" /> 0-3</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-50 border border-yellow-200" /> 4-6</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-50 border border-green-200" /> 7-10</span>
          </div>
        </>
      )}
    </div>
  );
}
