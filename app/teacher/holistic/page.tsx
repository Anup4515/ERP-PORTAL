"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, Button, Select, LoadingSkeleton, EmptyState } from "@/app/components/shared";
import { SparklesIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useViewingSession } from "@/app/components/providers/ViewingSessionProvider";

interface SubParameter { id: number; name: string }
interface Student { enrollment_id: number; first_name: string; last_name: string; roll_number: number | null }
interface RatingEntry { rating_value: number | null; comments: string | null }
interface Parameter { id: number; name: string; stage: string | null; sub_parameters: { id: number; name: string }[] }
interface TeacherClass { class_section_id: number; class_name: string; section_name: string; grade_level: number | null; role: string }

const STAGE_LABELS: Record<string, string> = {
  foundational: "Foundational",
  preparatory: "Preparatory",
  middle: "Middle",
  secondary: "Secondary",
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
  if (val <= 3) return "bg-red-50 border-red-200";
  if (val <= 6) return "bg-yellow-50 border-yellow-200";
  return "bg-green-50 border-green-200";
}

export default function TeacherHolisticPage() {
  const { viewingSession, isViewingPastSession, withSessionId } = useViewingSession();
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);

  const [classSectionId, setClassSectionId] = useState("");
  const [parameterId, setParameterId] = useState("");
  const [month, setMonth] = useState(formatMonth(new Date()));

  const [students, setStudents] = useState<Student[]>([]);
  const [subParams, setSubParams] = useState<SubParameter[]>([]);
  // Ratings state: keyed by "enrollmentId-subParamId"
  const [ratings, setRatings] = useState<Record<string, number | null>>({});
  // Comments state: keyed by enrollmentId
  const [comments, setComments] = useState<Record<string, string>>({});

  const [gridLoading, setGridLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const bannerTimer = useRef<NodeJS.Timeout | null>(null);

  const showBanner = (type: "success" | "error", message: string) => {
    setBanner({ type, message });
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 5000);
  };

  // Fetch parameters + classes
  useEffect(() => {
    Promise.all([
      fetch(withSessionId("/api/holistic/parameters")).then((r) => r.json()),
      fetch(withSessionId("/api/teacher/classes")).then((r) => r.json()),
    ])
      .then(([paramJson, classJson]) => {
        if (paramJson.data) setParameters(paramJson.data);
        if (classJson.data) setTeacherClasses(classJson.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [viewingSession?.id]);

  const csGradeMap: Record<string, number | null> = {};
  const classSectionOptions = (() => {
    const opts: { value: string; label: string }[] = [{ value: "", label: "Select Class & Section" }];
    teacherClasses.forEach((tc) => {
      const csId = String(tc.class_section_id);
      csGradeMap[csId] = tc.grade_level;
      opts.push({ value: csId, label: `${tc.class_name} - ${tc.section_name}` });
    });
    return opts;
  })();

  const selectedStage = classSectionId ? gradeToStage(csGradeMap[classSectionId]) : null;

  const parameterOptions = (() => {
    const opts: { value: string; label: string }[] = [{ value: "", label: classSectionId ? "Select Parameter" : "Select class first" }];
    parameters.forEach((p) => {
      if (p.sub_parameters.length === 0) return;
      if (selectedStage && p.stage && p.stage !== selectedStage) return;
      opts.push({ value: String(p.id), label: p.name });
    });
    return opts;
  })();

  // Fetch ratings
  const fetchRatings = useCallback(async () => {
    if (!classSectionId || !parameterId) {
      setStudents([]); setSubParams([]); setRatings({}); setComments({});
      return;
    }
    setGridLoading(true);
    setBanner(null);
    try {
      const res = await fetch(
        withSessionId(`/api/holistic/ratings?parameter_id=${parameterId}&class_section_id=${classSectionId}&month=${month}-01`)
      );
      if (!res.ok) {
        const json = await res.json();
        showBanner("error", json.error || "Failed to load ratings");
        setStudents([]); setSubParams([]);
        return;
      }
      const json = await res.json();
      if (json.data) {
        setStudents(json.data.students || []);
        setSubParams(json.data.sub_parameters || []);
        const r: Record<string, number | null> = {};
        const c: Record<string, string> = {};
        for (const [key, val] of Object.entries(json.data.ratings || {})) {
          const entry = val as RatingEntry;
          r[key] = entry.rating_value ?? null;
          // Extract comments — stored on first sub-param key per student
          const enrollId = key.split("-")[0];
          if (entry.comments && !c[enrollId]) c[enrollId] = entry.comments;
        }
        setRatings(r);
        setComments(c);
      }
    } catch {
      setStudents([]);
    } finally {
      setGridLoading(false);
    }
  }, [classSectionId, parameterId, month, viewingSession?.id]);

  useEffect(() => {
    if (classSectionId && parameterId) fetchRatings();
  }, [fetchRatings, classSectionId, parameterId]);

  const updateRating = (enrollmentId: number, subParamId: number, value: string) => {
    const key = `${enrollmentId}-${subParamId}`;
    const num = value === "" ? null : Math.min(10, Math.max(0, parseFloat(value)));
    setRatings((prev) => ({ ...prev, [key]: num }));
  };

  const updateComment = (enrollmentId: number, value: string) => {
    setComments((prev) => ({ ...prev, [String(enrollmentId)]: value }));
  };

  const handleSetDefault = () => {
    setRatings((prev) => {
      const next = { ...prev };
      for (const student of students) {
        for (const sp of subParams) {
          const key = `${student.enrollment_id}-${sp.id}`;
          if (next[key] == null) next[key] = 5;
        }
      }
      return next;
    });
  };

  const handleCopyPrev = async () => {
    const prevMonth = shiftMonth(month, -1);
    try {
      const res = await fetch(
        withSessionId(`/api/holistic/ratings?parameter_id=${parameterId}&class_section_id=${classSectionId}&month=${prevMonth}-01`)
      );
      const json = await res.json();
      if (json.data?.ratings) {
        const prev = json.data.ratings as Record<string, RatingEntry>;
        setRatings((curr) => {
          const next = { ...curr };
          for (const [key, val] of Object.entries(prev)) {
            if (next[key] == null) next[key] = val.rating_value ?? null;
          }
          return next;
        });
        showBanner("success", `Copied from ${displayMonth(prevMonth)}`);
      } else {
        showBanner("error", "No data for previous month");
      }
    } catch {
      showBanner("error", "Failed to fetch previous month");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setBanner(null);
    const payload: { student_enrollment_id: number; sub_parameter_id: number; rating_value: number | null; comments: string }[] = [];
    for (const student of students) {
      const comment = comments[String(student.enrollment_id)] || "";
      for (const sp of subParams) {
        const key = `${student.enrollment_id}-${sp.id}`;
        payload.push({
          student_enrollment_id: student.enrollment_id,
          sub_parameter_id: sp.id,
          rating_value: ratings[key] ?? null,
          comments: comment,
        });
      }
    }

    try {
      const res = await fetch(withSessionId("/api/holistic/ratings/bulk"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parameter_id: Number(parameterId),
          class_section_id: Number(classSectionId),
          month: `${month}-01`,
          ratings: payload,
        }),
      });
      if (res.ok) {
        showBanner("success", "Ratings saved successfully!");
      } else {
        const json = await res.json();
        showBanner("error", json.error || "Failed to save");
      }
    } catch {
      showBanner("error", "Failed to save ratings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">Holistic Development</h1>
          <p className="text-sm text-gray-500 mt-1">Rate students on holistic parameters monthly</p>
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
          <p className="text-sm text-gray-500 mt-1">Rate students on holistic parameters monthly</p>
        </div>
        <EmptyState
          icon={<SparklesIcon className="h-12 w-12" />}
          title="No Parameters Configured"
          description="Holistic parameters have not been set up yet. Please contact your school admin."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-primary-900">Holistic Development</h1>
        <p className="text-sm text-gray-500 mt-1">Rate students on holistic parameters monthly</p>
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
            disabled={!classSectionId}
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

      {/* Banner */}
      {banner && (
        <div className={`rounded-lg px-4 py-3 text-sm border ${
          banner.type === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
        }`}>
          {banner.message}
        </div>
      )}

      {/* Content */}
      {!classSectionId || !parameterId ? (
        <Card><p className="text-center text-gray-500 py-8 text-sm">Select your class, a parameter, and month to start rating.</p></Card>
      ) : gridLoading ? (
        <LoadingSkeleton lines={10} />
      ) : students.length === 0 ? (
        <Card><p className="text-center text-gray-500 py-8 text-sm">No students found for this class.</p></Card>
      ) : subParams.length === 0 ? (
        <Card><p className="text-center text-gray-500 py-8 text-sm">No sub-parameters for this parameter.</p></Card>
      ) : (
        <>
          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleSetDefault} disabled={isViewingPastSession}>Set Default (5)</Button>
            <Button variant="outline" size="sm" onClick={handleCopyPrev} disabled={isViewingPastSession}>Copy from Previous Month</Button>
            <Button variant="primary" size="sm" loading={saving} onClick={handleSave} disabled={isViewingPastSession}>Save Ratings</Button>
          </div>

          {/* Rating grid */}
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-primary-900 text-white">
                    <th className="sticky left-0 z-20 bg-primary-900 px-3 py-2.5 text-left font-semibold border-r border-primary-800 min-w-[50px]">Roll</th>
                    <th className="bg-primary-900 px-3 py-2.5 text-left font-semibold border-r border-primary-800 min-w-[140px]">Student</th>
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
                    <tr key={student.enrollment_id} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"} hover:bg-gray-50`}>
                      <td className="sticky left-0 z-10 px-3 py-2 font-medium text-gray-700 border-b border-r border-gray-100 bg-inherit text-center">
                        {student.roll_number ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-gray-900 border-b border-r border-gray-100 bg-inherit whitespace-nowrap">
                        {student.first_name} {student.last_name}
                      </td>
                      {subParams.map((sp) => {
                        const key = `${student.enrollment_id}-${sp.id}`;
                        const val = ratings[key];
                        return (
                          <td key={sp.id} className="px-1 py-1.5 text-center border-b border-r border-gray-100">
                            <input
                              type="number"
                              min={0}
                              max={10}
                              step={0.5}
                              value={val != null ? val : ""}
                              onChange={(e) => updateRating(student.enrollment_id, sp.id, e.target.value)}
                              className={`w-14 text-center text-sm px-1 py-1.5 border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 ${ratingBg(val)}`}
                            />
                          </td>
                        );
                      })}
                      <td className="px-1 py-1.5 border-b border-gray-100">
                        <input
                          type="text"
                          value={comments[String(student.enrollment_id)] ?? ""}
                          onChange={(e) => updateComment(student.enrollment_id, e.target.value)}
                          placeholder="Add comment..."
                          className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
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
