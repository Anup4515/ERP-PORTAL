"use client";

import React from "react";
import { Card, Badge } from "@/app/components/shared";

interface ExamSummary {
  exam_id: number;
  exam_name: string;
  subjects: {
    subject_name: string;
    max_marks: number;
    obtained_marks: number | null;
    is_absent: boolean;
    percentage: number | null;
    grade: string | null;
  }[];
  total_obtained: number;
  total_max: number;
  percentage: number;
  grade: string;
  rank: number | null;
}

interface HolisticTrend {
  parameter_name: string;
  months: { month: string; average: number | null }[];
}

export interface AnnualReportData {
  template_type?: "senior" | "junior";
  ready?: boolean;
  not_ready_reason?: string | null;
  student: {
    name: string;
    roll_number: number | null;
    class_name: string;
    section_name: string;
    grade_level?: number | null;
  };
  session: {
    name: string;
    start_date: string;
    end_date: string;
  };
  exams?: ExamSummary[];
  overall?: { percentage: number; grade: string } | null;
  attendance?: {
    total_days: number;
    present: number;
    absent: number;
    percentage: number;
  };
  holistic_trends?: HolisticTrend[];
  teacher_remarks?: string | null;
}

function gradeVariant(grade: string): "success" | "warning" | "danger" | "info" | "default" {
  const g = grade.toUpperCase();
  if (g === "A+" || g === "A" || g === "A1" || g === "A2") return "success";
  if (g === "B+" || g === "B" || g === "B1" || g === "B2") return "info";
  if (g === "C+" || g === "C" || g === "C1" || g === "C2") return "warning";
  return "danger";
}

function percentageColor(pct: number | null) {
  if (pct == null) return "text-gray-400";
  if (pct < 33) return "text-red-600";
  if (pct < 60) return "text-yellow-600";
  return "text-green-600";
}

export default function AnnualReportView({ data }: { data: AnnualReportData }) {
  const {
    template_type,
    ready,
    not_ready_reason,
    student,
    session,
    exams = [],
    overall = null,
    attendance,
    holistic_trends = [],
    teacher_remarks,
  } = data;
  const isJunior = template_type === "junior";
  const templateLabel = isJunior ? "Junior (Term-wise)" : "Senior (Final)";

  // ── Not-ready state ───────────────────────────────────────────────
  if (ready === false) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-primary-900">{student.name}</h2>
              <p className="text-sm text-gray-500">
                {student.class_name} - {student.section_name}
                {student.roll_number ? ` | Roll No: ${student.roll_number}` : ""}
              </p>
            </div>
            <div className="text-right text-xs text-gray-500">
              <div className="font-semibold text-gray-700">{session.name}</div>
              <div>{templateLabel} template</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 text-amber-700 mb-4">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Annual report not available yet
            </h3>
            <p className="text-sm text-gray-600 max-w-md">
              {not_ready_reason ||
                (isJunior
                  ? "Mid-Term and Final/Annual exams must be completed before the annual report can be generated."
                  : "The Final/Annual exam must be completed before the annual report can be generated.")}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Student + Session Info */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-primary-900">{student.name}</h2>
            <p className="text-sm text-gray-500">
              {student.class_name} - {student.section_name}
              {student.roll_number ? ` | Roll No: ${student.roll_number}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-primary-900">Session: {session.name}</p>
            <p className="text-xs text-gray-500">
              {new Date(session.start_date).toLocaleDateString("en-IN")} - {new Date(session.end_date).toLocaleDateString("en-IN")}
            </p>
          </div>
        </div>
      </Card>

      {/* Overall summary (term-wise junior OR final senior) */}
      {overall && (
        <Card>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">
                {isJunior ? "Overall (Mid-Term + Final/Annual Average)" : "Final/Annual Exam Result"}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {isJunior
                  ? "Plain average of Mid-Term and Final/Annual percentages"
                  : "Annual result based on the Final/Annual exam"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className={`text-2xl font-bold ${percentageColor(overall.percentage)}`}>
                  {overall.percentage.toFixed(2)}%
                </div>
                <div className="text-[10px] uppercase tracking-wider text-gray-400">Overall</div>
              </div>
              <Badge variant={gradeVariant(overall.grade)} size="md">{overall.grade}</Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Yearly Attendance */}
      {attendance && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Yearly Attendance</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-gray-50">
              <p className="text-2xl font-bold text-primary-900">{attendance.total_days}</p>
              <p className="text-xs text-gray-500 mt-1">Working Days</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-50">
              <p className="text-2xl font-bold text-green-600">{attendance.present}</p>
              <p className="text-xs text-gray-500 mt-1">Present</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-50">
              <p className="text-2xl font-bold text-red-600">{attendance.absent}</p>
              <p className="text-xs text-gray-500 mt-1">Absent</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-primary-50">
              <p className={`text-2xl font-bold ${percentageColor(attendance.percentage)}`}>
                {attendance.percentage.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Attendance %</p>
            </div>
          </div>
        </Card>
      )}

      {/* Individual Exam Cards */}
      {exams.map((exam) => (
        <Card key={exam.exam_id} padding="none">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">{exam.exam_name}</h3>
            <div className="flex items-center gap-3">
              {exam.rank != null && (
                <span className="text-xs font-bold text-primary-900 bg-primary-50 px-2.5 py-1 rounded-lg">
                  Rank: #{exam.rank}
                </span>
              )}
              <Badge variant={gradeVariant(exam.grade)} size="sm">{exam.grade}</Badge>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 border-b border-gray-200">Subject</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600 border-b border-gray-200">Marks</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600 border-b border-gray-200">%</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600 border-b border-gray-200">Grade</th>
                </tr>
              </thead>
              <tbody>
                {exam.subjects.map((sub, idx) => (
                  <tr key={sub.subject_name} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}>
                    <td className="px-3 py-2 font-medium text-gray-900 border-b border-gray-100">{sub.subject_name}</td>
                    <td className="px-3 py-2 text-center border-b border-gray-100">
                      {sub.is_absent ? (
                        <span className="text-red-500 font-medium">AB</span>
                      ) : sub.obtained_marks != null ? (
                        <span className="font-medium">{sub.obtained_marks}<span className="text-gray-400">/{sub.max_marks}</span></span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className={`px-3 py-2 text-center font-medium border-b border-gray-100 ${percentageColor(sub.percentage)}`}>
                      {sub.percentage != null ? `${sub.percentage.toFixed(0)}%` : "-"}
                    </td>
                    <td className="px-3 py-2 text-center border-b border-gray-100">
                      {sub.grade ? (
                        <Badge variant={gradeVariant(sub.grade)} size="sm">{sub.grade}</Badge>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-primary-50 font-semibold">
                  <td className="px-3 py-2.5 border-r border-gray-200">Total</td>
                  <td className="px-3 py-2.5 text-center">
                    {exam.total_obtained}<span className="text-gray-400">/{exam.total_max}</span>
                  </td>
                  <td className={`px-3 py-2.5 text-center ${percentageColor(exam.percentage)}`}>
                    {exam.percentage.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Badge variant={gradeVariant(exam.grade)} size="sm">{exam.grade}</Badge>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      ))}

      {/* Exam Comparison Summary (only if more than 1 exam) */}
      {exams.length > 1 && (
        <Card padding="none">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">Exam Comparison</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 border-b border-gray-200">Exam</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600 border-b border-gray-200">Marks</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600 border-b border-gray-200">%</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600 border-b border-gray-200">Grade</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600 border-b border-gray-200">Rank</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam, idx) => (
                  <tr key={exam.exam_id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}>
                    <td className="px-3 py-2.5 font-medium text-gray-900 border-b border-gray-100">{exam.exam_name}</td>
                    <td className="px-3 py-2.5 text-center border-b border-gray-100">
                      <span className="font-medium">{exam.total_obtained}<span className="text-gray-400">/{exam.total_max}</span></span>
                    </td>
                    <td className={`px-3 py-2.5 text-center font-semibold border-b border-gray-100 ${percentageColor(exam.percentage)}`}>
                      {exam.percentage.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5 text-center border-b border-gray-100">
                      <Badge variant={gradeVariant(exam.grade)} size="sm">{exam.grade}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-primary-900 border-b border-gray-100">
                      {exam.rank != null ? `#${exam.rank}` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Holistic Trends */}
      {holistic_trends.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Holistic Development Trends</h3>
          <div className="space-y-4">
            {holistic_trends.map((trend) => (
              <div key={trend.parameter_name}>
                <p className="text-xs font-medium text-gray-700 mb-2">{trend.parameter_name}</p>
                <div className="flex items-end gap-1 h-16">
                  {trend.months.map((m) => {
                    const height = m.average != null ? (m.average / 10) * 100 : 0;
                    const barColor = (m.average ?? 0) <= 3 ? "bg-red-400" : (m.average ?? 0) <= 6 ? "bg-yellow-400" : "bg-green-400";
                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full max-w-[32px] bg-gray-100 rounded-t relative" style={{ height: "48px" }}>
                          <div
                            className={`absolute bottom-0 w-full rounded-t ${barColor} transition-all duration-500`}
                            style={{ height: `${height}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-gray-400 truncate w-full text-center">
                          {new Date(m.month + "-01").toLocaleDateString("en-US", { month: "short" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Teacher Remarks */}
      {teacher_remarks && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Teacher Remarks</h3>
          <p className="text-sm text-gray-600 italic">&ldquo;{teacher_remarks}&rdquo;</p>
        </Card>
      )}
    </div>
  );
}
