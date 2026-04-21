"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, LoadingSkeleton } from "@/app/components/shared";
import {
  AcademicCapIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useViewingSession } from "@/app/components/providers/ViewingSessionProvider";
import { usePartnerBranding } from "@/app/components/providers/PartnerBrandingProvider";

interface AssignedClass {
  class_section_id: number;
  class_name: string;
  section_name: string;
  role: string;
  student_count: number;
}

export default function TeacherClassesPage() {
  const { viewingSession, isViewingPastSession, withSessionId } = useViewingSession();
  const { label } = usePartnerBranding();
  const [classes, setClasses] = useState<AssignedClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(withSessionId("/api/teacher/classes"))
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setClasses(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [viewingSession?.id]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary-900">My Classes</h1>

      {loading ? (
        <LoadingSkeleton lines={6} />
      ) : classes.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <AcademicCapIcon className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm font-medium">No classes assigned</p>
            <p className="text-xs text-gray-300 mt-1">
              Contact your {label} admin to assign classes to you.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <Card key={cls.class_section_id} className="hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-primary-900">
                    {cls.class_name} - {cls.section_name}
                  </h3>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary-50 text-primary-700">
                    {cls.role}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <UserGroupIcon className="w-4 h-4" />
                  <span>{cls.student_count} students</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <Link
                    href={`/teacher/students?class_section_id=${cls.class_section_id}`}
                    className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                  >
                    View Students
                  </Link>
                  <span className="text-gray-300">|</span>
                  <Link
                    href={`/teacher/attendance?class_section_id=${cls.class_section_id}`}
                    className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                  >
                    Attendance
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
