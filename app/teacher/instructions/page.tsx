"use client";

import { Card } from "@/app/components/shared";
import {
  AcademicCapIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  RectangleGroupIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

interface StepProps {
  number: number;
  title: string;
  icon: React.ReactNode;
  description: string;
  items: string[];
}

function Step({ number, title, icon, description, items }: StepProps) {
  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold text-sm shrink-0">
          {number}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-primary-600">{icon}</span>
            <h3 className="text-base font-semibold text-primary-900">{title}</h3>
          </div>
          <p className="text-sm text-gray-600 mb-3">{description}</p>
          <ul className="space-y-1.5">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-primary-500 mt-0.5">&#10003;</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

export default function TeacherInstructionsPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-primary-900">
          Teacher Guide
        </h1>
        <p className="text-gray-500 mt-1 text-base">
          Quick guide to help you manage your classes, attendance, and marks.
        </p>
      </div>

      {/* Quick Overview */}
      <Card className="bg-primary-50/30 border-primary-100">
        <h2 className="text-base font-semibold text-primary-900 mb-2">
          Welcome to WiserWits Teacher Portal
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          As a teacher, you can view your assigned classes, manage student
          information, mark daily attendance, view the school calendar, and
          enter exam marks. Your access is limited to the classes and subjects
          assigned to you by the school admin.
        </p>
      </Card>

      {/* Steps */}
      <div className="space-y-4">
        <Step
          number={1}
          title="View Your Classes"
          icon={<RectangleGroupIcon className="w-5 h-5" />}
          description="Go to My Classes from the sidebar to see all classes assigned to you."
          items={[
            "You will see cards for each class you are assigned to — as Class Teacher, Second Incharge, or Subject Teacher",
            "Each card shows the class name, section, your role, and student count",
            "Click 'View Students' to see the student list for that class",
            "Click 'Attendance' to go directly to attendance marking for that class",
          ]}
        />

        <Step
          number={2}
          title="Manage Students"
          icon={<AcademicCapIcon className="w-5 h-5" />}
          description="Go to Students from the sidebar to view and manage students in your classes."
          items={[
            "Select a class from the dropdown to see the student list",
            "Click the edit icon on any student to update their personal details, address, and parent/guardian information",
            "Click 'Add Student' to enroll a new student directly into your class",
            "You can only view and edit students in classes assigned to you",
          ]}
        />

        <Step
          number={3}
          title="Mark Attendance"
          icon={<ClipboardDocumentCheckIcon className="w-5 h-5" />}
          description="Go to Attendance from the sidebar to mark daily attendance for your classes."
          items={[
            "Select your class, month, and year to see the attendance grid",
            "Click on any cell to cycle through: P (Present) → A (Absent) → L (Late) → clear",
            "Use the checkbox at the top of each day column to mark all students as Present at once",
            "Holidays are shown as 'H' and cannot be edited — these are set by the admin in the calendar",
            "Future dates are disabled and shown as '-'",
            "Today's column is highlighted in yellow for easy identification",
            "Click 'Save All Attendance' at the bottom to save your changes",
            "P and A totals are shown at the end of each student row",
          ]}
        />

        <Step
          number={4}
          title="View Calendar"
          icon={<CalendarDaysIcon className="w-5 h-5" />}
          description="Go to Calendar from the sidebar to see the school's academic calendar."
          items={[
            "The calendar shows the current session's working days and holidays",
            "Sundays are highlighted in orange, holidays in red with the reason (e.g. 'Diwali', 'Summer Vacation')",
            "Navigate between months using the Prev/Next buttons",
            "Total Days, Holidays, and Working Days are shown at the bottom",
            "Contact your admin if you need to request a holiday change",
          ]}
        />

        <Step
          number={5}
          title="Enter Marks"
          icon={<ChartBarIcon className="w-5 h-5" />}
          description="Go to Marks from the sidebar to enter exam marks for your students."
          items={[
            "You will see a list of completed exams for your assigned classes",
            "Click 'Add Marks' on any exam to open the marks entry grid",
            "The grid shows all subjects as columns — each with Marks, Ab/NA, and % sub-columns",
            "Max marks for each subject are shown in the header row",
            "Enter marks in the input field for each student and subject",
            "Check the Ab/NA checkbox if a student was absent for that subject",
            "Percentage is auto-calculated as you type",
            "Percentages below 33% are highlighted in red (fail)",
            "Click 'Save All Marks' to save marks for all subjects at once",
          ]}
        />

        <Step
          number={6}
          title="View Timetable"
          icon={<ClockIcon className="w-5 h-5" />}
          description="Go to Timetable from the sidebar to view your weekly schedule and class timetables."
          items={[
            "My Schedule tab shows your personal weekly timetable — all your assigned periods across classes",
            "Each slot shows the subject, class-section, and room number",
            "Class Timetable tab lets you select any of your assigned classes to see its full weekly timetable",
            "The class view shows all subjects with their assigned teachers for each period",
            "Breaks, lunch, and assembly periods are shown in different colors",
          ]}
        />

        <Step
          number={7}
          title="Holistic Development Ratings"
          icon={<SparklesIcon className="w-5 h-5" />}
          description="Go to Holistic from the sidebar to rate students on holistic development parameters."
          items={[
            "Select your class from the dropdown — only your assigned classes appear",
            "Select a parameter (e.g. Physical Activity, Academic Performance) — parameters are filtered based on the class stage",
            "Use the month navigator to select the rating month",
            "Enter ratings (0-10) for each student across all sub-parameters — inputs are color-coded (red 0-3, yellow 4-6, green 7-10)",
            "Add optional comments per student in the Comments column",
            "Use 'Set Default (5)' to fill all empty cells with a default rating of 5",
            "Use 'Copy from Previous Month' to pre-fill from last month's ratings",
            "Click 'Save Ratings' to save all entries — you can edit and save again anytime",
          ]}
        />
      </div>

      {/* Tips */}
      <Card className="bg-yellow-50/50 border-yellow-200">
        <h2 className="text-base font-semibold text-yellow-900 mb-2">
          Tips
        </h2>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2 text-sm text-yellow-800">
            <span className="mt-0.5">&#9670;</span>
            Mark attendance daily — you can only mark attendance for today and past dates, not future dates
          </li>
          <li className="flex items-start gap-2 text-sm text-yellow-800">
            <span className="mt-0.5">&#9670;</span>
            Save frequently — unsaved changes will be lost if you navigate away
          </li>
          <li className="flex items-start gap-2 text-sm text-yellow-800">
            <span className="mt-0.5">&#9670;</span>
            You can only enter marks for completed exams — exams are marked as completed by the admin
          </li>
          <li className="flex items-start gap-2 text-sm text-yellow-800">
            <span className="mt-0.5">&#9670;</span>
            If you don&apos;t see a class or exam, contact your admin to check your assignments
          </li>
          <li className="flex items-start gap-2 text-sm text-yellow-800">
            <span className="mt-0.5">&#9670;</span>
            Grades are auto-assigned based on the grading scheme set by the admin
          </li>
          <li className="flex items-start gap-2 text-sm text-yellow-800">
            <span className="mt-0.5">&#9670;</span>
            Rate holistic parameters monthly — this data feeds into student report cards
          </li>
          <li className="flex items-start gap-2 text-sm text-yellow-800">
            <span className="mt-0.5">&#9670;</span>
            If holistic parameters are empty, ask your admin to load defaults in Settings → Holistic
          </li>
        </ul>
      </Card>
    </div>
  );
}
