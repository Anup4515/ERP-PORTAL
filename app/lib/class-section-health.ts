/**
 * Per-class-section health evaluator
 *
 * Reads a row from `vw_class_section_health` and produces a per-domain
 * status (class teacher / attendance / marks / timetable / holistic).
 * The page renders one badge per domain, each linking back to the page
 * where the gap can be fixed.
 */

export type DomainStatus = "ok" | "warning" | "critical" | "empty";

export interface DomainCell {
  status: DomainStatus;
  label: string;       // short, fits in a table cell
  detail?: string;     // tooltip / longer explanation
  actionHref?: string; // deep link to fix it
}

export interface ClassSectionHealthRow {
  class_section_id: number;
  partner_user_id: number;
  session_id: number;
  class_name: string;
  section_name: string;
  grade_level: number | null;
  stage: "foundational" | "preparatory" | "middle" | "secondary";
  class_teacher_id: number | null;
  class_teacher_name: string | null;
  active_students: number;

  last_attendance_date: Date | string | null;
  days_marked_last_7: number;

  exams_with_no_marks: number;
  exams_with_partial_marks: number;
  last_marks_at: Date | string | null;

  subject_count: number;
  subjects_without_teacher: number;

  timetable_slot_count: number;
  timetable_empty_slots: number;
  timetable_slots_without_teacher: number;

  last_holistic_month: Date | string | null;
  total_parameters: number;
  parameters_rated_this_month: number;
}

export interface ClassSectionHealth {
  classSectionId: number;
  className: string;
  sectionName: string;
  activeStudents: number;
  classTeacher: DomainCell;
  attendance: DomainCell;
  marks: DomainCell;
  timetable: DomainCell;
  holistic: DomainCell;
  /** Worst status across all domains — used for sorting/filtering rows. */
  overallStatus: DomainStatus;
}

const DAY_MS = 1000 * 60 * 60 * 24;
const STALE_ATTENDANCE_DAYS = 3;          // tighter than school-level
const STALE_MARKS_DAYS = 30;
const STALE_HOLISTIC_DAYS = 60;

function toDate(v: Date | string | null): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function daysSince(v: Date | string | null, now: number): number {
  const d = toDate(v);
  if (!d) return Infinity;
  return Math.floor((now - d.getTime()) / DAY_MS);
}

function pickWorst(cells: DomainCell[]): DomainStatus {
  const order: DomainStatus[] = ["empty", "ok", "warning", "critical"];
  return cells.reduce<DomainStatus>((worst, c) => {
    return order.indexOf(c.status) > order.indexOf(worst) ? c.status : worst;
  }, "ok");
}

export function evaluateClassSection(
  row: ClassSectionHealthRow
): ClassSectionHealth {
  const now = Date.now();
  const csId = row.class_section_id;

  // ─── Class teacher ────────────────────────────────────────────────
  const classTeacher: DomainCell = row.class_teacher_id
    ? {
        status: "ok",
        label: row.class_teacher_name?.trim() || "Assigned",
      }
    : {
        status: "critical",
        label: "Not assigned",
        detail: "This class has no class teacher.",
        actionHref: `/school-admin/classes`,
      };

  // ─── Attendance ───────────────────────────────────────────────────
  let attendance: DomainCell;
  if (row.active_students === 0) {
    attendance = { status: "empty", label: "No students" };
  } else if (!row.last_attendance_date) {
    attendance = {
      status: "critical",
      label: "Never marked",
      detail: "Attendance has never been recorded for this class.",
      actionHref: `/school-admin/attendance`,
    };
  } else {
    const days = daysSince(row.last_attendance_date, now);
    if (days <= 1) {
      attendance = {
        status: "ok",
        label: days === 0 ? "Marked today" : "Marked yesterday",
        detail: `${row.days_marked_last_7} of last 7 days marked`,
      };
    } else if (days <= STALE_ATTENDANCE_DAYS) {
      attendance = {
        status: "warning",
        label: `${days} days ago`,
        detail: `${row.days_marked_last_7} of last 7 days marked`,
        actionHref: `/school-admin/attendance`,
      };
    } else {
      attendance = {
        status: "critical",
        label: `${days} days ago`,
        detail: `Only ${row.days_marked_last_7} of last 7 days marked`,
        actionHref: `/school-admin/attendance`,
      };
    }
  }

  // ─── Marks ────────────────────────────────────────────────────────
  let marks: DomainCell;
  const noMarks = row.exams_with_no_marks;
  const partial = row.exams_with_partial_marks;
  if (noMarks === 0 && partial === 0) {
    if (!row.last_marks_at) {
      marks = { status: "empty", label: "No exams yet" };
    } else {
      marks = {
        status: "ok",
        label: "Up to date",
        detail: `Last entry ${daysSince(row.last_marks_at, now)} days ago`,
      };
    }
  } else if (noMarks > 0) {
    marks = {
      status: "critical",
      label: `${noMarks} exam${noMarks === 1 ? "" : "s"} pending`,
      detail:
        partial > 0
          ? `${partial} more partially entered`
          : "No marks entered for these exams",
      actionHref: `/school-admin/marks`,
    };
  } else {
    marks = {
      status: "warning",
      label: `${partial} exam${partial === 1 ? "" : "s"} partial`,
      detail: "Some subjects in these exams still need marks",
      actionHref: `/school-admin/marks`,
    };
  }

  // ─── Timetable ────────────────────────────────────────────────────
  let timetable: DomainCell;
  if (row.timetable_slot_count === 0) {
    timetable = {
      status: "critical",
      label: "Not set up",
      detail: "No timetable slots have been configured for this class",
      actionHref: `/school-admin/timetable`,
    };
  } else if (
    row.timetable_empty_slots > 0 ||
    row.timetable_slots_without_teacher > 0
  ) {
    const gaps =
      row.timetable_empty_slots + row.timetable_slots_without_teacher;
    timetable = {
      status: "warning",
      label: `${gaps} gap${gaps === 1 ? "" : "s"}`,
      detail: [
        row.timetable_empty_slots > 0
          ? `${row.timetable_empty_slots} period(s) without a subject`
          : null,
        row.timetable_slots_without_teacher > 0
          ? `${row.timetable_slots_without_teacher} period(s) without a teacher`
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
      actionHref: `/school-admin/timetable`,
    };
  } else {
    timetable = {
      status: "ok",
      label: `${row.timetable_slot_count} slots`,
    };
  }

  // ─── Holistic ─────────────────────────────────────────────────────
  // Show completeness as "X of Y parameters rated this month".
  // - class has 0 students                → empty ("No students")
  // - school has 0 parameters defined     → empty ("Not configured")
  // - 0 of Y this month, never rated      → warning ("Never rated")
  // - 0 of Y this month, last > 60 days   → critical
  // - 0 of Y this month, last ≤ 60 days   → warning ("N days ago")
  // - some but not all parameters         → warning ("X of Y parameters")
  // - all Y parameters rated              → ok
  let holistic: DomainCell;
  // Coerce defensively — older view versions don't return these columns.
  const total = Number(row.total_parameters ?? 0);
  const rated = Number(row.parameters_rated_this_month ?? 0);

  const stageSuffix = row.stage ? ` (${row.stage} stage)` : "";

  if (row.active_students === 0) {
    holistic = { status: "empty", label: "No students" };
  } else if (total === 0) {
    holistic = {
      status: "empty",
      label: "Not configured",
      detail: `No holistic parameters defined for this class's${stageSuffix} — set them up in settings`,
      actionHref: `/school-admin/holistic`,
    };
  } else if (rated === 0) {
    if (!row.last_holistic_month) {
      holistic = {
        status: "warning",
        label: `0 of ${total} parameters`,
        detail: `Never rated for this class${stageSuffix}`,
        actionHref: `/school-admin/holistic`,
      };
    } else {
      const days = daysSince(row.last_holistic_month, now);
      if (days <= STALE_HOLISTIC_DAYS) {
        holistic = {
          status: "warning",
          label: `0 of ${total} this month`,
          detail: `Last rated ${days} days ago${stageSuffix}`,
          actionHref: `/school-admin/holistic`,
        };
      } else {
        holistic = {
          status: "critical",
          label: `0 of ${total} this month`,
          detail: `Last rated ${days} days ago${stageSuffix}`,
          actionHref: `/school-admin/holistic`,
        };
      }
    }
  } else if (rated < total) {
    holistic = {
      status: "warning",
      label: `${rated} of ${total} parameters`,
      detail: `${total - rated} parameter${total - rated === 1 ? "" : "s"} not yet rated this month${stageSuffix}`,
      actionHref: `/school-admin/holistic`,
    };
  } else {
    holistic = {
      status: "ok",
      label: `All ${total} parameters`,
      detail: `Every${stageSuffix} parameter has at least one rating this month`,
    };
  }

  const overallStatus = pickWorst([
    classTeacher,
    attendance,
    marks,
    timetable,
    holistic,
  ]);

  return {
    classSectionId: csId,
    className: row.class_name,
    sectionName: row.section_name,
    activeStudents: row.active_students,
    classTeacher,
    attendance,
    marks,
    timetable,
    holistic,
    overallStatus,
  };
}
