"use client";

import React, { useEffect, useState } from "react";
import {
  AcademicCapIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { Card, StatsCard } from "@/app/components/shared";

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  todayAttendance: number;
  upcomingExams: number;
}

export default function SchoolAdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
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
          Welcome, Admin!
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
              title="Total Students"
              value={stats?.totalStudents ?? 0}
              icon={<AcademicCapIcon className="w-6 h-6" />}
              className="bg-primary-50/50"
            />
            <StatsCard
              title="Total Teachers"
              value={stats?.totalTeachers ?? 0}
              icon={<UserGroupIcon className="w-6 h-6" />}
              className="bg-accent-50/50"
            />
            <StatsCard
              title="Today's Attendance"
              value={
                stats?.todayAttendance != null
                  ? `${stats.todayAttendance}%`
                  : "0%"
              }
              icon={<ClipboardDocumentCheckIcon className="w-6 h-6" />}
              className="bg-green-50/50"
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

      {/* Bottom section: two cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Activity */}
        <Card>
          <h2 className="text-lg font-semibold text-primary-900 mb-4">
            Recent Activity
          </h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-full bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-3/4 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <svg
                className="w-12 h-12 mb-3 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm font-medium">No recent activity</p>
              <p className="text-xs text-gray-300 mt-1">
                Activity will appear here as your school uses the platform
              </p>
            </div>
          )}
        </Card>

        {/* Upcoming Exams */}
        <Card>
          <h2 className="text-lg font-semibold text-primary-900 mb-4">
            Upcoming Exams
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
              <svg
                className="w-12 h-12 mb-3 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              <p className="text-sm font-medium">No upcoming exams</p>
              <p className="text-xs text-gray-300 mt-1">
                Scheduled exams will appear here
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
