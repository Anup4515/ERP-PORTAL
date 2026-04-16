"use client";

import { useState, useEffect, useCallback } from "react";
import { Select, Card, Tabs, LoadingSkeleton, EmptyState, Button } from "@/app/components/shared";
import { DocumentChartBarIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { useViewingSession } from "@/app/components/providers/ViewingSessionProvider";
import MonthlyReportView, { type MonthlyReportData } from "@/app/components/reports/MonthlyReportView";
import ExamReportView, { type ExamReportData } from "@/app/components/reports/ExamReportView";
import AnnualReportView, { type AnnualReportData } from "@/app/components/reports/AnnualReportView";

interface Section { id: number; name: string; class_section_id: number | null }
interface ClassData { id: number; name: string; sections: Section[] }
interface StudentOption { enrollment_id: number; first_name: string; last_name: string; roll_number: number | null }
interface ExamOption { id: number; name: string; status: string }
interface SessionOption { id: number; name: string; is_current: boolean }

const REPORT_TABS = [
  { key: "monthly", label: "Monthly Report" },
  { key: "exam", label: "Exam Report" },
  { key: "annual", label: "Annual Report" },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function AdminReportsPage() {
  const { viewingSession, isViewingPastSession, withSessionId } = useViewingSession();
  const now = new Date();

  // Tab state
  const [activeTab, setActiveTab] = useState("monthly");

  // Shared filter state
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [classSectionId, setClassSectionId] = useState("");
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentId, setStudentId] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Monthly-specific
  const [monthValue, setMonthValue] = useState(now.getMonth() + 1);
  const [yearValue, setYearValue] = useState(now.getFullYear());

  // Exam-specific
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [examId, setExamId] = useState("");

  // Annual-specific
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [sessionId, setSessionId] = useState("");

  // Report data
  const [monthlyData, setMonthlyData] = useState<MonthlyReportData | null>(null);
  const [examData, setExamData] = useState<ExamReportData | null>(null);
  const [annualData, setAnnualData] = useState<AnnualReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  // Class-section options
  const classSectionOptions: { value: string; label: string }[] = [];
  for (const cls of classes) {
    for (const sec of cls.sections) {
      if (sec.class_section_id) {
        classSectionOptions.push({ value: String(sec.class_section_id), label: `${cls.name} - ${sec.name}` });
      }
    }
  }

  // Fetch classes + sessions on mount
  useEffect(() => {
    Promise.all([
      fetch(withSessionId("/api/classes")).then((r) => r.json()),
      fetch(withSessionId("/api/sessions")).then((r) => r.json()),
    ])
      .then(([classJson, sessionJson]) => {
        if (classJson.data) setClasses(classJson.data);
        if (sessionJson.data) {
          const sessionList: SessionOption[] = sessionJson.data;
          setSessions(sessionList);
          // Sync with global viewing session, fallback to current
          if (viewingSession) {
            setSessionId(String(viewingSession.id));
          } else {
            const current = sessionList.find((s) => s.is_current);
            if (current) setSessionId(String(current.id));
          }
        }
      })
      .catch(() => {});
  }, [viewingSession?.id, withSessionId]);

  // Fetch students when class section changes
  useEffect(() => {
    if (!classSectionId) {
      setStudents([]);
      setStudentId("");
      return;
    }
    setLoadingStudents(true);
    setStudentId("");
    fetch(withSessionId(`/api/students?class_section_id=${classSectionId}&limit=100`))
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.students) setStudents(json.data.students);
      })
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false));
  }, [classSectionId, viewingSession?.id, withSessionId]);

  // Fetch exams when class section changes (for exam tab)
  useEffect(() => {
    if (!classSectionId) { setExams([]); setExamId(""); return; }
    fetch(withSessionId(`/api/exams?class_section_id=${classSectionId}&limit=100`))
      .then((r) => r.json())
      .then((json) => {
        const completed = (json.data?.exams || []).filter((e: ExamOption) => e.status === "completed");
        setExams(completed);
        setExamId("");
      })
      .catch(() => setExams([]));
  }, [classSectionId, viewingSession?.id, withSessionId]);

  // Clear report data on tab/filter change
  useEffect(() => {
    setMonthlyData(null);
    setExamData(null);
    setAnnualData(null);
    setError("");
  }, [activeTab, classSectionId, studentId]);

  // Fetch report
  const fetchReport = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError("");
    setMonthlyData(null);
    setExamData(null);
    setAnnualData(null);

    try {
      let url = "";
      if (activeTab === "monthly") {
        const monthStr = `${yearValue}-${String(monthValue).padStart(2, "0")}`;
        url = `/api/reports/monthly?student_id=${studentId}&month=${monthStr}`;
      } else if (activeTab === "exam") {
        if (!examId) { setError("Please select an exam."); setLoading(false); return; }
        url = `/api/reports/exam?student_id=${studentId}&exam_id=${examId}`;
      } else {
        if (!sessionId) { setError("Please select a session."); setLoading(false); return; }
        url = `/api/reports/annual?student_id=${studentId}&session_id=${sessionId}`;
      }

      const res = await fetch(withSessionId(url));
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to fetch report");
      }
      const json = await res.json();

      if (activeTab === "monthly") setMonthlyData(json.data);
      else if (activeTab === "exam") setExamData(json.data);
      else setAnnualData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [activeTab, studentId, monthValue, yearValue, examId, sessionId, viewingSession?.id, withSessionId]);

  // Download PDF
  const downloadPdf = async () => {
    if (!studentId) return;
    setPdfLoading(true);
    try {
      const body: Record<string, string | number> = { student_id: Number(studentId), type: activeTab };
      if (activeTab === "monthly") {
        body.reference_month = `${yearValue}-${String(monthValue).padStart(2, "0")}`;
      } else if (activeTab === "exam") {
        body.exam_id = Number(examId);
      } else {
        body.session_id = Number(sessionId);
      }

      const res = await fetch(withSessionId("/api/reports/pdf"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("PDF generation failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${activeTab}-${studentId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  // Bulk download
  const downloadBulkPdf = async () => {
    if (!classSectionId) return;
    setPdfLoading(true);
    try {
      const body: Record<string, string | number> = { class_section_id: Number(classSectionId), type: activeTab };
      if (activeTab === "monthly") {
        body.reference_month = `${yearValue}-${String(monthValue).padStart(2, "0")}`;
      } else if (activeTab === "exam") {
        body.exam_id = Number(examId);
      } else {
        body.session_id = Number(sessionId);
      }

      const res = await fetch(withSessionId("/api/reports/pdf/bulk"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Bulk PDF generation failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reports-${activeTab}-class.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to generate bulk PDFs. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  const hasReportData = monthlyData || examData || annualData;
  const canGenerate =
    studentId &&
    (activeTab === "monthly" || (activeTab === "exam" && examId) || (activeTab === "annual" && sessionId));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">Report Cards</h1>
          <p className="text-sm text-gray-500 mt-1">Generate and view student report cards</p>
        </div>
        {classSectionId && hasReportData && (
          <Button
            variant="outline"
            size="sm"
            onClick={downloadBulkPdf}
            loading={pdfLoading}
            disabled={activeTab === "exam" && !examId}
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Bulk Download (Class)
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs tabs={REPORT_TABS} activeTab={activeTab} onChange={setActiveTab} />

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Class-Section (always shown) */}
          <Select
            label="Class - Section"
            value={classSectionId}
            onChange={(e) => setClassSectionId(e.target.value)}
            options={[{ value: "", label: "Select class" }, ...classSectionOptions]}
          />

          {/* Student */}
          <Select
            label="Student"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            disabled={!classSectionId || loadingStudents}
            options={[
              { value: "", label: loadingStudents ? "Loading..." : !classSectionId ? "Select class first" : students.length === 0 ? "No students" : "Select student" },
              ...students.map((s) => ({
                value: String(s.enrollment_id),
                label: `${s.roll_number ? `${s.roll_number}. ` : ""}${s.first_name} ${s.last_name}`,
              })),
            ]}
          />

          {/* Tab-specific filter */}
          {activeTab === "monthly" && (
            <>
              <Select
                label="Month"
                value={String(monthValue)}
                onChange={(e) => setMonthValue(Number(e.target.value))}
                options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
              />
              <Select
                label="Year"
                value={String(yearValue)}
                onChange={(e) => setYearValue(Number(e.target.value))}
                options={[yearValue - 1, yearValue, yearValue + 1].map((y) => ({ value: String(y), label: String(y) }))}
              />
            </>
          )}

          {activeTab === "exam" && (
            <Select
              label="Exam"
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              disabled={!classSectionId}
              options={[
                { value: "", label: !classSectionId ? "Select class first" : exams.length === 0 ? "No completed exams" : "Select exam" },
                ...exams.map((e) => ({ value: String(e.id), label: e.name })),
              ]}
            />
          )}

          {activeTab === "annual" && (
            <Select
              label="Session"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              options={[
                { value: "", label: "Select session" },
                ...sessions.map((s) => ({ value: String(s.id), label: `${s.name}${s.is_current ? " (Current)" : ""}` })),
              ]}
            />
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100">
          <Button
            variant="primary"
            size="md"
            onClick={fetchReport}
            loading={loading}
            disabled={!canGenerate}
          >
            View Report
          </Button>
          {hasReportData && (
            <Button
              variant="secondary"
              size="md"
              onClick={downloadPdf}
              loading={pdfLoading}
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Download PDF
            </Button>
          )}
        </div>
      </Card>

      {/* Error */}
      {error && (
        <Card>
          <p className="text-sm text-red-600 text-center py-4">{error}</p>
        </Card>
      )}

      {/* Loading */}
      {loading && <LoadingSkeleton lines={10} />}

      {/* Report views */}
      {!loading && monthlyData && activeTab === "monthly" && (
        <MonthlyReportView data={monthlyData} />
      )}
      {!loading && examData && activeTab === "exam" && (
        <ExamReportView data={examData} />
      )}
      {!loading && annualData && activeTab === "annual" && (
        <AnnualReportView data={annualData} />
      )}

      {/* Empty state */}
      {!loading && !hasReportData && !error && (
        <EmptyState
          icon={<DocumentChartBarIcon className="h-12 w-12" />}
          title="No Report Generated"
          description="Select a class, student, and relevant filters above, then click 'View Report' to generate a report card."
        />
      )}
    </div>
  );
}
