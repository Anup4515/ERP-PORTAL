"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/shared/Button";
import Input from "@/app/components/shared/Input";
import Card from "@/app/components/shared/Card";
import Badge from "@/app/components/shared/Badge";
import Select from "@/app/components/shared/Select";
import LoadingSkeleton from "@/app/components/shared/LoadingSkeleton";
import ConfirmDialog from "@/app/components/shared/ConfirmDialog";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  AcademicCapIcon,
  ArrowPathIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useViewingSession } from "@/app/components/providers/ViewingSessionProvider";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Session {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_current: number;
}

interface ClassSection {
  class_section_id: number;
  class_id: number;
  class_name: string;
  class_code: string | null;
  grade_level: number | null;
  display_order: number;
  section_id: number;
  section_name: string;
  class_teacher_id: number | null;
  class_teacher_name: string | null;
  second_incharge_id: number | null;
  second_incharge_name: string | null;
  student_count: number;
}

interface Student {
  enrollment_id: number;
  student_id: number;
  class_section_id: number;
  first_name: string;
  last_name: string;
  roll_number: number | null;
  student_type: string;
}

interface ClassOption {
  class_id: number;
  class_name: string;
  grade_level: number | null;
  display_order: number;
  section_id: number;
  section_name: string;
}

interface PreviewData {
  source_session: Session;
  class_sections: ClassSection[];
  subjects_by_class_section: Record<number, { id: number; name: string; teacher_name: string | null }[]>;
  students_by_class_section: Record<number, Student[]>;
  all_classes: ClassOption[];
  has_grading_scheme: boolean;
  summary: {
    total_class_sections: number;
    total_students: number;
    total_subjects: number;
    total_teachers: number;
  };
}

interface PromotionEntry {
  student_id: number;
  source_enrollment_id: number;
  source_class_section_id: number;
  target_class_section_id: number | null;
  action: "promoted" | "detained" | "graduated";
  roll_number: number | null;
}

// Per-class promotion config: which target class_section_id does this source promote to?
interface ClassPromotionConfig {
  source_class_section_id: number;
  default_target_class_section_id: string; // "graduated" or a class_section_id from all_classes
  student_actions: Record<number, "promoted" | "detained" | "graduated">;
}

const STEPS = [
  { key: "setup", label: "Setup" },
  { key: "review", label: "Review Structure" },
  { key: "promote", label: "Promote Students" },
  { key: "confirm", label: "Confirm" },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function SessionTransitionPage() {
  const router = useRouter();
  const { refreshSessions } = useViewingSession();

  // State
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sourceSessionId, setSourceSessionId] = useState<string>("");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultData, setResultData] = useState<any>(null);

  // Step 1: New session config
  const [targetName, setTargetName] = useState("");
  const [targetStartDate, setTargetStartDate] = useState("");
  const [targetEndDate, setTargetEndDate] = useState("");
  const [copySubjects, setCopySubjects] = useState(true);
  const [copyTeacherAssignments, setCopyTeacherAssignments] = useState(true);
  const [copyTimetable, setCopyTimetable] = useState(false);
  const [copyGradingScheme, setCopyGradingScheme] = useState(true);

  // Step 3: Promotion config per class section
  const [promotionConfigs, setPromotionConfigs] = useState<Record<number, ClassPromotionConfig>>({});

  // Active class in promotion step
  const [activePromotionClass, setActivePromotionClass] = useState(0);

  // ─── Fetch sessions ────────────────────────────────────────────────────────

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/sessions");
      const json = await res.json();
      const data: Session[] = json.data ?? [];
      setSessions(data);

      // Auto-select the current session
      const current = data.find((s) => s.is_current);
      if (current) {
        setSourceSessionId(String(current.id));
      }
    } catch {
      setError("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // ─── Fetch preview when source session changes ─────────────────────────────

  const fetchPreview = useCallback(async () => {
    if (!sourceSessionId) return;
    try {
      setPreviewLoading(true);
      setError(null);
      const res = await fetch(`/api/sessions/${sourceSessionId}/transition/preview`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to load preview");
        return;
      }
      const data: PreviewData = json.data;
      setPreview(data);

      // Auto-suggest target session name
      const src = data.source_session;
      if (src.name) {
        const match = src.name.match(/(\d{4})-(\d{2})/);
        if (match) {
          const startYear = parseInt(match[1]) + 1;
          const endYear = parseInt(match[2]) + 1;
          setTargetName(`${startYear}-${String(endYear).padStart(2, "0")}`);
          setTargetStartDate(`${startYear}-04-01`);
          setTargetEndDate(`${startYear + 1}-03-31`);
        }
      }

      // Initialize promotion configs
      const configs: Record<number, ClassPromotionConfig> = {};
      for (const cs of data.class_sections) {
        // Try to find the next class (grade_level + 1) with same section
        const nextClass = data.all_classes.find(
          (ac) =>
            ac.grade_level != null &&
            cs.grade_level != null &&
            ac.grade_level === cs.grade_level + 1 &&
            ac.section_name === cs.section_name
        );

        // Build default student actions (all promoted)
        const studentActions: Record<number, "promoted" | "detained" | "graduated"> = {};
        const students = data.students_by_class_section[cs.class_section_id] ?? [];
        for (const stu of students) {
          studentActions[stu.student_id] = nextClass ? "promoted" : "graduated";
        }

        configs[cs.class_section_id] = {
          source_class_section_id: cs.class_section_id,
          default_target_class_section_id: nextClass
            ? `${nextClass.class_id}-${nextClass.section_id}`
            : "graduated",
          student_actions: studentActions,
        };
      }
      setPromotionConfigs(configs);
    } catch {
      setError("Failed to load transition preview");
    } finally {
      setPreviewLoading(false);
    }
  }, [sourceSessionId]);

  useEffect(() => {
    if (sourceSessionId) fetchPreview();
  }, [sourceSessionId, fetchPreview]);

  // ─── Build target class options for a given source class ───────────────────

  const buildTargetOptions = useCallback(
    (sourceCs: ClassSection) => {
      if (!preview) return [];
      const options: { value: string; label: string }[] = [
        { value: "graduated", label: "Graduated (no new enrollment)" },
      ];
      // Group by class, then sections
      const classMap = new Map<number, ClassOption[]>();
      for (const ac of preview.all_classes) {
        if (!classMap.has(ac.class_id)) classMap.set(ac.class_id, []);
        classMap.get(ac.class_id)!.push(ac);
      }
      for (const [, sections] of classMap) {
        for (const sec of sections) {
          options.push({
            value: `${sec.class_id}-${sec.section_id}`,
            label: `${sec.class_name} - ${sec.section_name}`,
          });
        }
      }
      return options;
    },
    [preview]
  );

  // ─── Compute promotion summary ────────────────────────────────────────────

  const promotionSummary = useMemo(() => {
    let promoted = 0;
    let detained = 0;
    let graduated = 0;

    for (const config of Object.values(promotionConfigs)) {
      for (const action of Object.values(config.student_actions)) {
        if (action === "promoted") promoted++;
        else if (action === "detained") detained++;
        else if (action === "graduated") graduated++;
      }
    }

    return { promoted, detained, graduated, total: promoted + detained + graduated };
  }, [promotionConfigs]);

  // ─── Build final promotions array ─────────────────────────────────────────

  const buildPromotions = useCallback((): PromotionEntry[] => {
    if (!preview) return [];
    const entries: PromotionEntry[] = [];

    for (const cs of preview.class_sections) {
      const config = promotionConfigs[cs.class_section_id];
      if (!config) continue;

      const students = preview.students_by_class_section[cs.class_section_id] ?? [];
      for (const stu of students) {
        const action = config.student_actions[stu.student_id] ?? "promoted";
        let targetCsId: number | null = null;

        if (action === "promoted") {
          // Parse "classId-sectionId" from config
          const targetKey = config.default_target_class_section_id;
          if (targetKey !== "graduated") {
            const [classId, sectionId] = targetKey.split("-").map(Number);
            // Find the matching class_section in source (it will be recreated with same class_id + section_id)
            // We pass the source class_section_id that maps to the target class+section
            const matchingSource = preview.class_sections.find(
              (s) => s.class_id === classId && s.section_id === sectionId
            );
            targetCsId = matchingSource?.class_section_id ?? null;
          }
        }
        // For detained: target is same class_section (will be mapped by API)

        entries.push({
          student_id: stu.student_id,
          source_enrollment_id: stu.enrollment_id,
          source_class_section_id: cs.class_section_id,
          target_class_section_id: targetCsId,
          action,
          roll_number: action === "detained" ? stu.roll_number : null,
        });
      }
    }
    return entries;
  }, [preview, promotionConfigs]);

  // ─── Execute transition ───────────────────────────────────────────────────

  const executeTransition = async () => {
    if (!preview || !sourceSessionId) return;
    try {
      setExecuting(true);
      setError(null);

      const promotions = buildPromotions();

      const res = await fetch(`/api/sessions/${sourceSessionId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_session_name: targetName,
          target_session_start_date: targetStartDate,
          target_session_end_date: targetEndDate,
          copy_subjects: copySubjects,
          copy_teacher_assignments: copyTeacherAssignments,
          copy_timetable: copyTimetable,
          copy_grading_scheme: copyGradingScheme,
          promotions,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Transition failed");
        return;
      }

      setResultData(json.data);
      setStep(4); // success step
      // Sync the shared viewing-session state so the top-right switcher and
      // any other subscriber of ViewingSessionProvider reflects the flip.
      await refreshSessions();
    } catch {
      setError("Failed to execute transition");
    } finally {
      setExecuting(false);
    }
  };

  // ─── Navigation ───────────────────────────────────────────────────────────

  const canProceed = useMemo(() => {
    if (step === 0) {
      return sourceSessionId && targetName && targetStartDate && targetEndDate && preview;
    }
    if (step === 1) return preview && preview.class_sections.length > 0;
    if (step === 2) return promotionSummary.total > 0;
    if (step === 3) return true;
    return false;
  }, [step, sourceSessionId, targetName, targetStartDate, targetEndDate, preview, promotionSummary]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const updateStudentAction = (
    classSectionId: number,
    studentId: number,
    action: "promoted" | "detained" | "graduated"
  ) => {
    setPromotionConfigs((prev) => ({
      ...prev,
      [classSectionId]: {
        ...prev[classSectionId],
        student_actions: {
          ...prev[classSectionId].student_actions,
          [studentId]: action,
        },
      },
    }));
  };

  const setAllStudentsAction = (
    classSectionId: number,
    action: "promoted" | "detained" | "graduated"
  ) => {
    const students = preview?.students_by_class_section[classSectionId] ?? [];
    const newActions: Record<number, "promoted" | "detained" | "graduated"> = {};
    for (const stu of students) {
      newActions[stu.student_id] = action;
    }
    setPromotionConfigs((prev) => ({
      ...prev,
      [classSectionId]: {
        ...prev[classSectionId],
        student_actions: newActions,
      },
    }));
  };

  // ─── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-primary-900">Session Transition</h1>
        <Card><LoadingSkeleton lines={6} /></Card>
      </div>
    );
  }

  // ─── Success state ────────────────────────────────────────────────────────

  if (step === 4 && resultData) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-primary-900">Session Transition</h1>
        <Card>
          <div className="text-center py-8">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Transition Completed Successfully
            </h2>
            <p className="text-gray-500 mb-6">
              Session <strong>{targetName}</strong> is now active.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-xl mx-auto mb-8">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-primary-700">
                  {resultData.class_sections_created}
                </div>
                <div className="text-xs text-gray-500 mt-1">Class Sections</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-700">
                  {resultData.students_promoted}
                </div>
                <div className="text-xs text-gray-500 mt-1">Promoted</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-amber-700">
                  {resultData.students_detained}
                </div>
                <div className="text-xs text-gray-500 mt-1">Detained</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-700">
                  {resultData.students_graduated}
                </div>
                <div className="text-xs text-gray-500 mt-1">Graduated</div>
              </div>
            </div>
            <Button variant="primary" size="lg" onClick={() => router.push("/school-admin/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ─── Main Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/school-admin/settings")}>
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Settings
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-primary-900">Session Transition</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Transition to a new academic session with student promotions
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.key}>
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                i === step
                  ? "bg-primary-600 text-white"
                  : i < step
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              <span className="w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold border border-current">
                {i < step ? "✓" : i + 1}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 ${i < step ? "bg-green-300" : "bg-gray-200"}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800 flex items-center gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
            <XCircleIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ─── Step 0: Setup ──────────────────────────────────────────────── */}
      {step === 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Setup New Session</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Select
              label="Source Session (current)"
              id="source-session"
              value={sourceSessionId}
              onChange={(e) => setSourceSessionId(e.target.value)}
              options={[
                { value: "", label: "Select session..." },
                ...sessions.map((s) => ({
                  value: String(s.id),
                  label: `${s.name}${s.is_current ? " (Current)" : ""}`,
                })),
              ]}
            />
            <div />
            <Input
              label="New Session Name"
              id="target-name"
              placeholder="e.g. 2026-27"
              value={targetName}
              onChange={(e) => setTargetName(e.target.value)}
              required
            />
            <div />
            <Input
              label="Start Date"
              id="target-start"
              type="date"
              value={targetStartDate}
              onChange={(e) => setTargetStartDate(e.target.value)}
              required
            />
            <Input
              label="End Date"
              id="target-end"
              type="date"
              value={targetEndDate}
              onChange={(e) => setTargetEndDate(e.target.value)}
              required
            />
          </div>

          <h3 className="text-sm font-semibold text-gray-700 mb-3">Copy from current session</h3>
          <div className="space-y-2 mb-6">
            {[
              { label: "Class sections with teacher assignments", checked: copyTeacherAssignments, setter: setCopyTeacherAssignments },
              { label: "Subjects with teacher assignments", checked: copySubjects, setter: setCopySubjects },
              { label: "Timetable slots", checked: copyTimetable, setter: setCopyTimetable },
              { label: "Grading scheme", checked: copyGradingScheme, setter: setCopyGradingScheme, disabled: !preview?.has_grading_scheme },
            ].map((opt) => (
              <label key={opt.label} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={opt.checked}
                  onChange={(e) => opt.setter(e.target.checked)}
                  disabled={opt.disabled}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                />
                <span className={`text-sm ${opt.disabled ? "text-gray-400" : "text-gray-700"}`}>
                  {opt.label}
                  {opt.disabled && " (not configured)"}
                </span>
              </label>
            ))}
          </div>

          {previewLoading && <LoadingSkeleton lines={3} />}

          {preview && !previewLoading && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Source Session: {preview.source_session.name}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Class Sections:</span>{" "}
                  <strong>{preview.summary.total_class_sections}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Students:</span>{" "}
                  <strong>{preview.summary.total_students}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Subjects:</span>{" "}
                  <strong>{preview.summary.total_subjects}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Teachers:</span>{" "}
                  <strong>{preview.summary.total_teachers}</strong>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ─── Step 1: Review Structure ───────────────────────────────────── */}
      {step === 1 && preview && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Review Structure</h2>
          <p className="text-sm text-gray-500 mb-4">
            The following class sections and subjects will be created in <strong>{targetName}</strong>.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-2 pr-4 font-medium text-gray-500">Class</th>
                  <th className="pb-2 pr-4 font-medium text-gray-500">Section</th>
                  <th className="pb-2 pr-4 font-medium text-gray-500">Class Teacher</th>
                  <th className="pb-2 pr-4 font-medium text-gray-500">Students</th>
                  <th className="pb-2 font-medium text-gray-500">Subjects</th>
                </tr>
              </thead>
              <tbody>
                {preview.class_sections.map((cs) => {
                  const subjects = preview.subjects_by_class_section[cs.class_section_id] ?? [];
                  return (
                    <tr key={cs.class_section_id} className="border-b border-gray-100">
                      <td className="py-3 pr-4 font-medium text-gray-900">{cs.class_name}</td>
                      <td className="py-3 pr-4 text-gray-700">{cs.section_name}</td>
                      <td className="py-3 pr-4 text-gray-700">
                        {copyTeacherAssignments && cs.class_teacher_name
                          ? cs.class_teacher_name
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={cs.student_count > 0 ? "info" : "default"} size="sm">
                          {cs.student_count}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {copySubjects ? (
                          <Badge variant="success" size="sm">{subjects.length} subjects</Badge>
                        ) : (
                          <span className="text-gray-400">Not copied</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 mt-4 text-sm text-gray-600">
            Total: <strong>{preview.class_sections.length}</strong> class sections,{" "}
            <strong>{preview.summary.total_subjects}</strong> subjects,{" "}
            <strong>{preview.summary.total_students}</strong> students to promote
          </div>
        </Card>
      )}

      {/* ─── Step 2: Promote Students ───────────────────────────────────── */}
      {step === 2 && preview && (
        <div className="space-y-4">
          {/* Class selector tabs */}
          <Card padding="sm">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {preview.class_sections.map((cs, idx) => {
                const students = preview.students_by_class_section[cs.class_section_id] ?? [];
                const config = promotionConfigs[cs.class_section_id];
                const promotedCount = config
                  ? Object.values(config.student_actions).filter((a) => a === "promoted").length
                  : 0;
                const detainedCount = config
                  ? Object.values(config.student_actions).filter((a) => a === "detained").length
                  : 0;

                return (
                  <button
                    key={cs.class_section_id}
                    onClick={() => setActivePromotionClass(idx)}
                    className={`shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      idx === activePromotionClass
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {cs.class_name}-{cs.section_name}
                    <span className="ml-1.5 opacity-70">({students.length})</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Active class promotion */}
          {preview.class_sections[activePromotionClass] && (() => {
            const cs = preview.class_sections[activePromotionClass];
            const students = preview.students_by_class_section[cs.class_section_id] ?? [];
            const config = promotionConfigs[cs.class_section_id];
            if (!config) return null;

            const targetOptions = buildTargetOptions(cs);

            return (
              <Card>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {cs.class_name} - {cs.section_name}
                    </h3>
                    <p className="text-sm text-gray-500">{students.length} students</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Promote to:</span>
                    <Select
                      id={`target-${cs.class_section_id}`}
                      value={config.default_target_class_section_id}
                      onChange={(e) => {
                        const newTarget = e.target.value;
                        setPromotionConfigs((prev) => {
                          const updated = { ...prev[cs.class_section_id] };
                          updated.default_target_class_section_id = newTarget;
                          // Update all promoted students to match
                          const newActions = { ...updated.student_actions };
                          for (const stuId of Object.keys(newActions)) {
                            if (newActions[Number(stuId)] === "promoted" || newActions[Number(stuId)] === "graduated") {
                              newActions[Number(stuId)] = newTarget === "graduated" ? "graduated" : "promoted";
                            }
                          }
                          updated.student_actions = newActions;
                          return { ...prev, [cs.class_section_id]: updated };
                        });
                      }}
                      options={targetOptions}
                      className="w-56"
                    />
                  </div>
                </div>

                {/* Bulk actions */}
                <div className="flex gap-2 mb-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAllStudentsAction(
                      cs.class_section_id,
                      config.default_target_class_section_id === "graduated" ? "graduated" : "promoted"
                    )}
                  >
                    <AcademicCapIcon className="h-4 w-4" />
                    Promote All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAllStudentsAction(cs.class_section_id, "detained")}
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                    Detain All
                  </Button>
                </div>

                {/* Student list */}
                {students.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No students in this class section</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-left">
                          <th className="pb-2 pr-4 font-medium text-gray-500 w-12">Roll</th>
                          <th className="pb-2 pr-4 font-medium text-gray-500">Student Name</th>
                          <th className="pb-2 font-medium text-gray-500 w-40">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((stu) => {
                          const action = config.student_actions[stu.student_id] ?? "promoted";
                          return (
                            <tr key={stu.student_id} className="border-b border-gray-50">
                              <td className="py-2.5 pr-4 text-gray-500">{stu.roll_number ?? "—"}</td>
                              <td className="py-2.5 pr-4 font-medium text-gray-900">
                                {stu.first_name} {stu.last_name}
                              </td>
                              <td className="py-2.5">
                                <select
                                  value={action}
                                  onChange={(e) =>
                                    updateStudentAction(
                                      cs.class_section_id,
                                      stu.student_id,
                                      e.target.value as "promoted" | "detained" | "graduated"
                                    )
                                  }
                                  className={`text-sm rounded-lg border px-2 py-1 focus:outline-none focus:ring-1 ${
                                    action === "promoted"
                                      ? "border-green-300 bg-green-50 text-green-700 focus:ring-green-400"
                                      : action === "detained"
                                      ? "border-amber-300 bg-amber-50 text-amber-700 focus:ring-amber-400"
                                      : "border-blue-300 bg-blue-50 text-blue-700 focus:ring-blue-400"
                                  }`}
                                >
                                  <option value="promoted">Promoted</option>
                                  <option value="detained">Detained</option>
                                  <option value="graduated">Graduated</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Class summary */}
                <div className="flex gap-4 mt-4 pt-3 border-t border-gray-100 text-sm">
                  <span className="text-green-700">
                    {Object.values(config.student_actions).filter((a) => a === "promoted").length} promoted
                  </span>
                  <span className="text-amber-700">
                    {Object.values(config.student_actions).filter((a) => a === "detained").length} detained
                  </span>
                  <span className="text-blue-700">
                    {Object.values(config.student_actions).filter((a) => a === "graduated").length} graduated
                  </span>
                </div>
              </Card>
            );
          })()}

          {/* Overall summary */}
          <Card padding="sm">
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="font-medium text-gray-700">Total:</span>
              <span className="text-green-700 font-medium">{promotionSummary.promoted} promoted</span>
              <span className="text-amber-700 font-medium">{promotionSummary.detained} detained</span>
              <span className="text-blue-700 font-medium">{promotionSummary.graduated} graduated</span>
            </div>
          </Card>
        </div>
      )}

      {/* ─── Step 3: Confirm ────────────────────────────────────────────── */}
      {step === 3 && preview && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Confirm Transition</h2>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Session</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">From:</span> {preview.source_session.name}</div>
                <div><span className="text-gray-500">To:</span> {targetName}</div>
                <div><span className="text-gray-500">Start:</span> {targetStartDate}</div>
                <div><span className="text-gray-500">End:</span> {targetEndDate}</div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">What will be created</h3>
              <ul className="space-y-1.5 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  {preview.class_sections.length} class sections
                  {copyTeacherAssignments && " with teacher assignments"}
                </li>
                {copySubjects && (
                  <li className="flex items-center gap-2">
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    {preview.summary.total_subjects} subjects
                    {copyTeacherAssignments && " with teacher assignments"}
                  </li>
                )}
                {copyTimetable && (
                  <li className="flex items-center gap-2">
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    Timetable slots copied
                  </li>
                )}
                {copyGradingScheme && (
                  <li className="flex items-center gap-2">
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    Grading scheme copied
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  Calendar generated (Sundays as holidays)
                </li>
              </ul>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Student promotions</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-700">{promotionSummary.promoted}</div>
                  <div className="text-xs text-gray-500 mt-1">Promoted</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-amber-700">{promotionSummary.detained}</div>
                  <div className="text-xs text-gray-500 mt-1">Detained</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-700">{promotionSummary.graduated}</div>
                  <div className="text-xs text-gray-500 mt-1">Graduated</div>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">This action cannot be undone.</p>
                  <ul className="mt-1 list-disc list-inside text-amber-700">
                    <li>All current enrollments will be marked as &ldquo;completed&rdquo;</li>
                    <li>New enrollments will be created in {targetName}</li>
                    <li>{targetName} will become the active session</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ─── Footer navigation ──────────────────────────────────────────── */}
      {step < 4 && (
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="md"
            onClick={() => step > 0 ? setStep(step - 1) : router.push("/school-admin/settings")}
          >
            <ArrowLeftIcon className="h-4 w-4" />
            {step === 0 ? "Cancel" : "Back"}
          </Button>

          {step < 3 ? (
            <Button
              variant="primary"
              size="md"
              disabled={!canProceed}
              onClick={() => setStep(step + 1)}
            >
              Next
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              loading={executing}
              onClick={() => setConfirmOpen(true)}
            >
              Execute Transition
            </Button>
          )}
        </div>
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={executeTransition}
        title="Execute Session Transition"
        message={`This will transition from ${preview?.source_session.name ?? ""} to ${targetName}. ${promotionSummary.total} students will be processed. This action cannot be undone.`}
        confirmLabel="Execute Transition"
        variant="primary"
      />
    </div>
  );
}
