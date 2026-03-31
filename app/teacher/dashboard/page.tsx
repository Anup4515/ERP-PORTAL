"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RectangleGroupIcon,
  AcademicCapIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/outline";
import { Card, StatsCard, Button } from "@/app/components/shared";

interface TeacherStats {
  myClasses: number;
  myStudents: number;
  pendingMarks: number;
  upcomingExams: number;
}

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/dashboard");
        const json = await res.json();
        if (json.data) {
          setStats(json.data);
        }
      } catch {
        // silently fail, show zeros
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="pb-2">
        <h1 className="text-3xl sm:text-4xl font-bold text-primary-900 tracking-tight">
          Welcome, Teacher!
        </h1>
        <p className="text-gray-500 mt-1 text-base">
          Maintain your portal operations effortlessly
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {loading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-200 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-7 w-16 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatsCard
              title="My Classes"
              value={stats?.myClasses ?? 0}
              icon={<RectangleGroupIcon className="w-6 h-6" />}
              className="bg-primary-50/50"
            />
            <StatsCard
              title="My Students"
              value={stats?.myStudents ?? 0}
              icon={<AcademicCapIcon className="w-6 h-6" />}
              className="bg-accent-50/50"
            />
            <StatsCard
              title="Pending Marks"
              value={stats?.pendingMarks ?? 0}
              icon={<ChartBarIcon className="w-6 h-6" />}
              className="bg-orange-50/50"
            />
            <StatsCard
              title="Upcoming Exams"
              value={stats?.upcomingExams ?? 0}
              icon={<DocumentTextIcon className="w-6 h-6" />}
              className="bg-blue-50/50"
            />
          </>
        )}
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Quick Actions */}
        <Card>
          <h2 className="text-lg font-semibold text-primary-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={() => router.push("/teacher/students")}
              className="flex-col h-auto py-4 gap-2"
            >
              <AcademicCapIcon className="w-6 h-6" />
              <span className="text-xs">Students</span>
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => router.push("/teacher/attendance")}
              className="flex-col h-auto py-4 gap-2"
            >
              <ClipboardDocumentCheckIcon className="w-6 h-6" />
              <span className="text-xs">Attendance</span>
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => router.push("/teacher/marks")}
              className="flex-col h-auto py-4 gap-2"
            >
              <ChartBarIcon className="w-6 h-6" />
              <span className="text-xs">Marks</span>
            </Button>
          </div>
        </Card>

        {/* My Classes */}
        <Card>
          <h2 className="text-lg font-semibold text-primary-900 mb-4">
            My Classes
          </h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-32 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <RectangleGroupIcon className="w-12 h-12 mb-3 text-gray-300" />
              <p className="text-sm font-medium">No classes assigned yet</p>
              <p className="text-xs text-gray-300 mt-1">
                Your classes will appear here once assigned by the admin
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
