"use client";

import { Card, Badge } from "@/app/components/shared";

interface SubjectMark {
  subject_name: string;
  max_marks: number;
  obtained_marks: number | null;
  is_absent: boolean;
  percentage: number | null;
  grade: string | null;
}

export interface ExamReportData {
  student: {
    name: string;
    roll_number: number | null;
    class_name: string;
    section_name: string;
  };
  exam: {
    name: string;
    start_date: string;
    end_date: string;
  };
  subjects: SubjectMark[];
  total_obtained: number;
  total_max: number;
  overall_percentage: number;
  overall_grade: string;
  rank: number | null;
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

export default function ExamReportView({ data }: { data: ExamReportData }) {
  const { student, exam, subjects, total_obtained, total_max, overall_percentage, overall_grade, rank } = data;

  return (
    <div className="space-y-6">
      {/* Student + Exam Info */}
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
            <p className="text-sm font-semibold text-primary-900">{exam.name}</p>
            <p className="text-xs text-gray-500">
              {new Date(exam.start_date).toLocaleDateString("en-IN")} - {new Date(exam.end_date).toLocaleDateString("en-IN")}
            </p>
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="text-center">
          <p className="text-xs text-gray-500 mb-1">Total Marks</p>
          <p className="text-2xl font-bold text-primary-900">
            {total_obtained}<span className="text-sm text-gray-400">/{total_max}</span>
          </p>
        </Card>
        <Card className="text-center">
          <p className="text-xs text-gray-500 mb-1">Percentage</p>
          <p className={`text-2xl font-bold ${percentageColor(overall_percentage)}`}>
            {overall_percentage.toFixed(1)}%
          </p>
        </Card>
        <Card className="text-center">
          <p className="text-xs text-gray-500 mb-1">Grade</p>
          <div className="flex justify-center mt-1">
            <Badge variant={gradeVariant(overall_grade)} size="md">{overall_grade}</Badge>
          </div>
        </Card>
        <Card className="text-center">
          <p className="text-xs text-gray-500 mb-1">Class Rank</p>
          <p className="text-2xl font-bold text-primary-900">
            {rank != null ? `#${rank}` : "-"}
          </p>
        </Card>
      </div>

      {/* Subject-wise Marks Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-primary-900 text-white">
                <th className="px-4 py-3 text-left font-semibold text-xs">S.No.</th>
                <th className="px-4 py-3 text-left font-semibold text-xs">Subject</th>
                <th className="px-4 py-3 text-center font-semibold text-xs">Max Marks</th>
                <th className="px-4 py-3 text-center font-semibold text-xs">Obtained</th>
                <th className="px-4 py-3 text-center font-semibold text-xs">Percentage</th>
                <th className="px-4 py-3 text-center font-semibold text-xs">Grade</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((sub, idx) => (
                <tr key={sub.subject_name} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"} hover:bg-blue-50/20`}>
                  <td className="px-4 py-2.5 text-gray-500 text-xs border-b border-gray-100">{idx + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900 text-xs border-b border-gray-100">{sub.subject_name}</td>
                  <td className="px-4 py-2.5 text-center text-gray-600 text-xs border-b border-gray-100">{sub.max_marks}</td>
                  <td className="px-4 py-2.5 text-center font-semibold text-xs border-b border-gray-100">
                    {sub.is_absent ? (
                      <span className="text-red-500">AB</span>
                    ) : sub.obtained_marks != null ? (
                      sub.obtained_marks
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className={`px-4 py-2.5 text-center text-xs font-semibold border-b border-gray-100 ${percentageColor(sub.percentage)}`}>
                    {sub.is_absent ? "-" : sub.percentage != null ? `${sub.percentage.toFixed(1)}%` : "-"}
                  </td>
                  <td className="px-4 py-2.5 text-center border-b border-gray-100">
                    {sub.grade ? (
                      <Badge variant={gradeVariant(sub.grade)} size="sm">{sub.grade}</Badge>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-primary-50 font-semibold">
                <td className="px-4 py-2.5 text-xs" colSpan={2}>Total</td>
                <td className="px-4 py-2.5 text-center text-xs">{total_max}</td>
                <td className="px-4 py-2.5 text-center text-xs">{total_obtained}</td>
                <td className={`px-4 py-2.5 text-center text-xs ${percentageColor(overall_percentage)}`}>
                  {overall_percentage.toFixed(1)}%
                </td>
                <td className="px-4 py-2.5 text-center">
                  <Badge variant={gradeVariant(overall_grade)} size="sm">{overall_grade}</Badge>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
