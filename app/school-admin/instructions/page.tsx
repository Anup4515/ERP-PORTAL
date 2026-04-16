"use client";

import { Card } from "@/app/components/shared";
import {
  AcademicCapIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  EyeIcon,
  SparklesIcon,
  UserGroupIcon,
  UsersIcon,
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

export default function InstructionsPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-primary-900">
          Getting Started Guide
        </h1>
        <p className="text-gray-500 mt-1 text-base">
          Follow these steps to set up and manage your school portal.
        </p>
      </div>

      {/* Quick Overview */}
      <Card className="bg-primary-50/30 border-primary-100">
        <h2 className="text-base font-semibold text-primary-900 mb-2">
          Welcome to WiserWits School ERP
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          This portal helps you manage your school&apos;s day-to-day operations
          digitally — from student records and teacher assignments to attendance
          tracking, exams, and marks. Follow the steps below in order to get
          your school fully set up.
        </p>
      </Card>

      {/* Steps */}
      <div className="space-y-4">
        <Step
          number={1}
          title="Configure School Settings"
          icon={<Cog6ToothIcon className="w-5 h-5" />}
          description="Go to Settings from the sidebar. This is where you set up the foundation of your school."
          items={[
            "School Profile — Update your school name, contact details, address, and logo",
            "Academic Sessions — Create your academic year (e.g. 2026-2027) with start and end dates. The calendar is auto-generated when you create a session",
            "Classes & Sections — Add your classes (e.g. Class 10) and sections (e.g. A, B) under each class",
            "Subjects — Select a class-section and add subjects (e.g. Maths, Science, English). You can assign teachers to subjects later",
            "Grading — Set up your grading scheme (e.g. A+ = 90-100%, A = 80-89%). This is used for auto-grading marks",
          ]}
        />

        <Step
          number={2}
          title="Add Teachers"
          icon={<UserGroupIcon className="w-5 h-5" />}
          description="Go to Teachers from the sidebar. Teachers get their own login to mark attendance and enter marks."
          items={[
            "Click 'Add Teacher' and fill in their name, email, password, phone, qualification, and specialization",
            "The teacher can now log in using the email and password you set",
            "Click the eye icon on a teacher to view their profile and assign them to classes",
            "Use 'Add Assignment' to make them a Class Teacher or Second Incharge of a class-section",
          ]}
        />

        <Step
          number={3}
          title="Add Students"
          icon={<AcademicCapIcon className="w-5 h-5" />}
          description="Go to Students from the sidebar. Add students individually or in bulk."
          items={[
            "Click 'Add Student' — fill personal details, parent/guardian info, and select the class-section to enroll them in",
            "Each student gets a roll number and is enrolled in the selected class for the current session",
            "Use 'Export Excel' to download the full student list as a spreadsheet",
            "Click on a student name to view/edit their profile, enrollment history, and family details",
          ]}
        />

        <Step
          number={4}
          title="Set Up Calendar & Holidays"
          icon={<CalendarDaysIcon className="w-5 h-5" />}
          description="Go to Calendar from the sidebar. Your calendar was auto-generated with Sundays as holidays."
          items={[
            "Select the session to view the calendar. Navigate months using Prev/Next",
            "Click any day to toggle it between Holiday and Working Day — add a reason (e.g. 'Diwali', 'Republic Day')",
            "Use 'Mark Holiday Range' to mark extended holidays like summer vacation (e.g. June 1-30)",
            "Use 'Mark All Saturdays' to quickly mark all Saturdays in the month as holidays",
            "The bottom shows Total Days, Holidays, and Working Days for each month",
          ]}
        />

        <Step
          number={5}
          title="Track Attendance"
          icon={<ClipboardDocumentCheckIcon className="w-5 h-5" />}
          description="Go to Attendance from the sidebar. Admins can view attendance; teachers mark it from their dashboard."
          items={[
            "Select a Class-Section, Month, and Year to view the attendance grid",
            "The grid shows each student as a row and each day as a column — P (Present), A (Absent), L (Late), H (Holiday)",
            "P and A totals are shown at the end of each row",
            "Holidays are automatically grayed out based on your calendar",
            "Teachers mark attendance from their own dashboard — they can click cells to cycle through P, A, L statuses",
          ]}
        />

        <Step
          number={6}
          title="Create Exams"
          icon={<DocumentTextIcon className="w-5 h-5" />}
          description="Go to Exams from the sidebar. Create exams for one or all classes at once."
          items={[
            "Click 'Create Exam' — select classes (or 'All Classes'), enter exam name, code, and date range",
            "All subjects of the selected classes are automatically added to the exam schedule",
            "Click the edit icon on an exam to set date, time, duration, max marks, and room for each subject",
            "Exam status auto-updates: Upcoming → In Progress → Completed based on dates",
          ]}
        />

        <Step
          number={7}
          title="Enter Marks"
          icon={<ChartBarIcon className="w-5 h-5" />}
          description="Go to Marks from the sidebar. Enter marks per subject for each exam."
          items={[
            "Select Class → Exam → Subject to load the marks grid",
            "Enter marks for each student — percentage and grade are auto-calculated using your grading scheme",
            "Check the 'Absent' box for students who didn't appear for the exam",
            "Click 'Save Marks' at the bottom to save all entries at once",
            "Teachers can also enter marks from their dashboard for their assigned classes",
          ]}
        />

        <Step
          number={8}
          title="Manage Timetable"
          icon={<ClockIcon className="w-5 h-5" />}
          description="Go to Timetable from the sidebar. Set up period timings and assign subjects to slots."
          items={[
            "First configure period timings in Settings — define period numbers, start/end times, and slot types (class, break, lunch, assembly)",
            "Go to Timetable page and select a class-section to view/edit its weekly timetable",
            "Assign subjects and teachers to each period slot for each day of the week",
            "Break, lunch, and assembly slots are automatically shown and cannot have subject assignments",
            "Teachers can view their own weekly schedule and class timetables from their dashboard",
          ]}
        />

        <Step
          number={9}
          title="Manage Staff"
          icon={<UsersIcon className="w-5 h-5" />}
          description="Go to Staff from the sidebar. Add non-teaching staff members."
          items={[
            "Click 'Add Staff' to add non-teaching staff — fill in name, designation, department, phone, email, and qualification",
            "Staff members are separate from teachers — they don't get login access",
            "Use this for office staff, lab assistants, librarians, peons, etc.",
            "Edit or remove staff members using the action buttons in the list",
          ]}
        />

        <Step
          number={10}
          title="Holistic Development"
          icon={<SparklesIcon className="w-5 h-5" />}
          description="Go to Holistic from the sidebar. View monthly holistic ratings given by teachers."
          items={[
            "First set up holistic parameters in Settings → Holistic tab — click 'Load Defaults' to create stage-wise parameters (Foundational, Preparatory, Middle, Secondary)",
            "Each stage has 5 parameters with 5 sub-parameters each, tailored for that age group",
            "You can add custom parameters and sub-parameters for any stage",
            "On the Holistic page, select a class and parameter to view ratings (read-only for admin)",
            "Parameters are automatically filtered based on the selected class grade level/stage",
            "Teachers rate students from their dashboard — the ratings feed into report cards",
          ]}
        />
        <Step
          number={11}
          title="Session Transition"
          icon={<ArrowPathIcon className="w-5 h-5" />}
          description="At the end of an academic year, transition to the new session from Settings → Sessions → Session Transition."
          items={[
            "The wizard copies your class structure, subjects, teacher assignments, and grading scheme to the new session",
            "Promote students class-by-class — select Promoted, Detained, or Graduated per student",
            "Detained students are re-enrolled in the same class as repeaters",
            "Old enrollments are marked as completed and linked to new ones for history tracking",
            "The new session becomes active and a calendar is auto-generated",
          ]}
        />

        <Step
          number={12}
          title="View Past Session Data"
          icon={<EyeIcon className="w-5 h-5" />}
          description="Use the session switcher in the top-right corner to view data from previous academic years."
          items={[
            "Select any past session from the dropdown — all pages will show that session's data",
            "A yellow banner confirms you are in read-only mode",
            "All add, edit, and delete actions are disabled for past sessions",
            "Click 'Switch to current' on the banner to return to the active session",
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
            Always create the Academic Session first — classes, calendar, and exams depend on it
          </li>
          <li className="flex items-start gap-2 text-sm text-yellow-800">
            <span className="mt-0.5">&#9670;</span>
            Set one session as &quot;Current&quot; — all data entry happens under the current session
          </li>
          <li className="flex items-start gap-2 text-sm text-yellow-800">
            <span className="mt-0.5">&#9670;</span>
            Add subjects to classes before creating exams — exams auto-include all subjects
          </li>
          <li className="flex items-start gap-2 text-sm text-yellow-800">
            <span className="mt-0.5">&#9670;</span>
            Set up the grading scheme before entering marks — grades are auto-assigned based on percentage
          </li>
          <li className="flex items-start gap-2 text-sm text-yellow-800">
            <span className="mt-0.5">&#9670;</span>
            Teachers can only see classes assigned to them — assign teachers via the teacher detail page
          </li>
          <li className="flex items-start gap-2 text-sm text-yellow-800">
            <span className="mt-0.5">&#9670;</span>
            Set up timetable period config before assigning slots — go to Settings first
          </li>
          <li className="flex items-start gap-2 text-sm text-yellow-800">
            <span className="mt-0.5">&#9670;</span>
            Load holistic defaults before teachers can start rating — go to Settings → Holistic → Load Defaults
          </li>
          <li className="flex items-start gap-2 text-sm text-yellow-800">
            <span className="mt-0.5">&#9670;</span>
            Set grade_level on classes (in Settings → Classes) so holistic parameters are correctly filtered by stage
          </li>
          <li className="flex items-start gap-2 text-sm text-yellow-800">
            <span className="mt-0.5">&#9670;</span>
            Use Session Transition at year-end instead of manually recreating classes and re-enrolling students
          </li>
          <li className="flex items-start gap-2 text-sm text-yellow-800">
            <span className="mt-0.5">&#9670;</span>
            Past session data is always accessible via the session switcher — nothing is deleted
          </li>
        </ul>
      </Card>
    </div>
  );
}
