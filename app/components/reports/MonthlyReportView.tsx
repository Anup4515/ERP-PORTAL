"use client";

import { Card } from "@/app/components/shared";

interface AttendanceSummary {
  total_days: number;
  present: number;
  absent: number;
  late: number;
  half_day: number;
  percentage: number;
}

interface HolisticRating {
  parameter_name: string;
  sub_parameters: {
    name: string;
    rating_value: number | null;
    rating_grade: string | null;
  }[];
  average: number | null;
}

export interface MonthlyReportData {
  student: {
    name: string;
    roll_number: number | null;
    class_name: string;
    section_name: string;
  };
  month: string;
  attendance: AttendanceSummary;
  holistic: HolisticRating[];
}

function ratingColor(val: number | null) {
  if (val == null) return "text-gray-400";
  if (val <= 3) return "text-red-600";
  if (val <= 6) return "text-yellow-600";
  return "text-green-600";
}

function percentageColor(pct: number) {
  if (pct < 50) return "text-red-600";
  if (pct < 75) return "text-yellow-600";
  return "text-green-600";
}

export default function MonthlyReportView({ data }: { data: MonthlyReportData }) {
  const { student, month, attendance, holistic } = data;

  return (
    <div className="space-y-6">
      {/* Student Info Header */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-primary-900">{student.name}</h2>
            <p className="text-sm text-gray-500">
              {student.class_name} - {student.section_name}
              {student.roll_number ? ` | Roll No: ${student.roll_number}` : ""}
            </p>
          </div>
          <div className="text-sm font-medium text-primary-600 bg-primary-50 px-3 py-1.5 rounded-lg">
            {new Date(month + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </div>
        </div>
      </Card>

      {/* Attendance Summary */}
      <Card>
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Attendance Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          <div className="text-center p-3 rounded-lg bg-gray-50">
            <p className="text-2xl font-bold text-primary-900">{attendance.total_days}</p>
            <p className="text-xs text-gray-500 mt-1">Total Days</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-green-50">
            <p className="text-2xl font-bold text-green-600">{attendance.present}</p>
            <p className="text-xs text-gray-500 mt-1">Present</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-50">
            <p className="text-2xl font-bold text-red-600">{attendance.absent}</p>
            <p className="text-xs text-gray-500 mt-1">Absent</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-yellow-50">
            <p className="text-2xl font-bold text-yellow-600">{attendance.late}</p>
            <p className="text-xs text-gray-500 mt-1">Late</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-blue-50">
            <p className="text-2xl font-bold text-blue-600">{attendance.half_day}</p>
            <p className="text-xs text-gray-500 mt-1">Half Day</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-primary-50">
            <p className={`text-2xl font-bold ${percentageColor(attendance.percentage)}`}>
              {attendance.percentage.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Attendance %</p>
          </div>
        </div>
      </Card>

      {/* Holistic Ratings */}
      {holistic.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Holistic Development</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {holistic.map((param) => (
              <div key={param.parameter_name} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-28 truncate shrink-0" title={param.parameter_name}>
                  {param.parameter_name}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      (param.average ?? 0) <= 3 ? "bg-red-400" : (param.average ?? 0) <= 6 ? "bg-yellow-400" : "bg-green-400"
                    }`}
                    style={{ width: `${((param.average ?? 0) / 10) * 100}%` }}
                  />
                </div>
                <span className={`text-xs font-semibold w-8 text-right ${ratingColor(param.average)}`}>
                  {param.average != null ? param.average.toFixed(1) : "-"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
