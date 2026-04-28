/**
 * School health evaluator
 *
 * Reads a row from `vw_school_health` and turns it into a status
 * (healthy / stale / critical) plus a list of human-readable issues.
 *
 * Severity logic lives here (not in SQL) so thresholds are easy to tune
 * without a migration.
 */

export type SchoolHealthStatus = "healthy" | "stale" | "critical";
export type IssueSeverity = "warning" | "critical";

/**
 * One actionable problem with the school's data. The `actionHref` lets the
 * UI deep-link the user to the page where they can fix it.
 */
export interface HealthIssue {
  key: string;
  label: string;
  severity: IssueSeverity;
  actionHref?: string;
  actionLabel?: string;
}

/**
 * Shape of a row coming back from `SELECT * FROM vw_school_health`.
 * MySQL returns DATETIME columns as JS Date objects via mysql2.
 */
export interface SchoolHealthRow {
  partner_id: number;
  partner_user_id: number;
  school_name: string;
  last_attendance_at: Date | string | null;
  last_marks_at: Date | string | null;
  profile_score: number;
  current_session_count: number;
  classes_without_teacher: number;
  timetable_slot_count: number;
  last_holistic_at: Date | string | null;
}

export interface SchoolHealthSummary {
  partnerId: number;
  schoolName: string;
  status: SchoolHealthStatus;
  issues: HealthIssue[];
  signals: {
    lastAttendanceAt: string | null;
    lastMarksAt: string | null;
    lastHolisticAt: string | null;
    profileScore: number;
    currentSessionCount: number;
    classesWithoutTeacher: number;
    timetableSlotCount: number;
  };
}

const DAY_MS = 1000 * 60 * 60 * 24;

const STALE_ATTENDANCE_DAYS = 7;
const STALE_MARKS_DAYS = 30;
const STALE_HOLISTIC_DAYS = 90;
const PROFILE_FIELDS_REQUIRED = 4;

function toDate(value: Date | string | null): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function daysSince(value: Date | string | null, now: number): number {
  const d = toDate(value);
  if (!d) return Infinity;
  return Math.floor((now - d.getTime()) / DAY_MS);
}

export function evaluateHealth(row: SchoolHealthRow): SchoolHealthSummary {
  const issues: HealthIssue[] = [];
  const now = Date.now();

  if (row.current_session_count !== 1) {
    issues.push({
      key: "session",
      label:
        row.current_session_count === 0
          ? "No academic session is set as current"
          : "More than one session is marked current",
      severity: "critical",
      actionHref: "/school-admin/settings/sessions",
      actionLabel: "Open sessions",
    });
  }

  if (row.timetable_slot_count === 0) {
    issues.push({
      key: "timetable",
      label: "Timetable has not been published for the current session",
      severity: "critical",
      actionHref: "/school-admin/timetable",
      actionLabel: "Set up timetable",
    });
  }

  const attendanceDays = daysSince(row.last_attendance_at, now);
  if (attendanceDays > STALE_ATTENDANCE_DAYS) {
    issues.push({
      key: "attendance",
      label:
        attendanceDays === Infinity
          ? "No attendance has ever been recorded"
          : `Attendance was last marked ${attendanceDays} days ago`,
      severity: "warning",
      actionHref: "/school-admin/attendance",
      actionLabel: "Mark attendance",
    });
  }

  const marksDays = daysSince(row.last_marks_at, now);
  if (marksDays > STALE_MARKS_DAYS) {
    issues.push({
      key: "marks",
      label:
        marksDays === Infinity
          ? "No marks have been entered yet"
          : `Marks were last entered ${marksDays} days ago`,
      severity: "warning",
      actionHref: "/school-admin/marks",
      actionLabel: "Enter marks",
    });
  }

  if (row.profile_score < PROFILE_FIELDS_REQUIRED) {
    const missing = PROFILE_FIELDS_REQUIRED - row.profile_score;
    issues.push({
      key: "profile",
      label: `School profile is incomplete (${missing} of ${PROFILE_FIELDS_REQUIRED} fields missing)`,
      severity: "warning",
      actionHref: "/school-admin/settings",
      actionLabel: "Complete profile",
    });
  }

  if (row.classes_without_teacher > 0) {
    issues.push({
      key: "teachers",
      label: `${row.classes_without_teacher} ${
        row.classes_without_teacher === 1 ? "class is" : "classes are"
      } missing a class teacher`,
      severity: "warning",
      actionHref: "/school-admin/classes",
      actionLabel: "Assign teachers",
    });
  }

  const holisticDays = daysSince(row.last_holistic_at, now);
  if (holisticDays > STALE_HOLISTIC_DAYS) {
    issues.push({
      key: "holistic",
      label:
        holisticDays === Infinity
          ? "Holistic ratings have not been recorded yet"
          : `Holistic ratings haven't been updated in ${holisticDays} days`,
      severity: "warning",
      actionHref: "/school-admin/holistic",
      actionLabel: "Update ratings",
    });
  }

  const hasCritical = issues.some((i) => i.severity === "critical");
  const warnings = issues.filter((i) => i.severity === "warning").length;

  let status: SchoolHealthStatus;
  if (hasCritical || warnings >= 3) status = "critical";
  else if (warnings > 0) status = "stale";
  else status = "healthy";

  const lastAt = (v: Date | string | null) => {
    const d = toDate(v);
    return d ? d.toISOString() : null;
  };

  return {
    partnerId: row.partner_id,
    schoolName: row.school_name,
    status,
    issues,
    signals: {
      lastAttendanceAt: lastAt(row.last_attendance_at),
      lastMarksAt: lastAt(row.last_marks_at),
      lastHolisticAt: lastAt(row.last_holistic_at),
      profileScore: row.profile_score,
      currentSessionCount: row.current_session_count,
      classesWithoutTeacher: row.classes_without_teacher,
      timetableSlotCount: row.timetable_slot_count,
    },
  };
}
