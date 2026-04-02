"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  RectangleGroupIcon,
  AcademicCapIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { Card, StatsCard, Button } from "@/app/components/shared";

interface TeacherStats {
  myClasses: number;
  myStudents: number;
  pendingMarks: number;
}

interface AssignedClass {
  class_section_id: number;
  class_name: string;
  section_name: string;
  role: string;
  student_count: number;
}

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [classes, setClasses] = useState<AssignedClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, classesRes] = await Promise.all([
          fetch("/api/dashboard"),
          fetch("/api/teacher/classes"),
        ]);
        const statsJson = await statsRes.json();
        const classesJson = await classesRes.json();
        if (statsJson.data) setStats(statsJson.data);
        if (classesJson.data) setClasses(classesJson.data);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="pb-2">
        <h1 className="text-3xl sm:text-4xl font-bold text-primary-900 tracking-tight">
          Welcome, Teacher!
        </h1>
        <p className="text-gray-500 mt-1 text-base">
          Manage your classes and track student progress
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-gray-200 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  <div className="h-7 w-16 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </Card>
          ))
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
          </>
        )}
      </div>

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
              onClick={() => router.push("/teacher/calendar")}
              className="flex-col h-auto py-4 gap-2"
            >
              <ChartBarIcon className="w-6 h-6" />
              <span className="text-xs">Calendar</span>
            </Button>
          </div>
        </Card>

        {/* My Classes */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-primary-900">
              My Classes
            </h2>
            {classes.length > 0 && (
              <Link
                href="/teacher/classes"
                className="text-xs text-primary-600 hover:text-primary-800 font-medium"
              >
                View All
              </Link>
            )}
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : classes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <RectangleGroupIcon className="w-12 h-12 mb-3 text-gray-300" />
              <p className="text-sm font-medium">No classes assigned yet</p>
              <p className="text-xs text-gray-300 mt-1">
                Your classes will appear here once assigned by the admin
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {classes.slice(0, 5).map((cls) => (
                <div
                  key={cls.class_section_id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {cls.class_name} - {cls.section_name}
                    </p>
                    <p className="text-xs text-gray-500">{cls.role}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <UserGroupIcon className="w-3.5 h-3.5" />
                    {cls.student_count}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
