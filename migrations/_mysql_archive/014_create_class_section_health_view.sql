-- ============================================================================
-- Migration: 014_create_class_section_health_view.sql
-- Description: Creates vw_class_section_health — per-class-section health
--              summary scoped to each partner's CURRENT session. Powers the
--              /school-admin/data-health page where the school admin sees
--              class-by-class which areas have gaps.
--
--              One row per class section in any partner's current session.
--
-- ─── Consolidates the original migrations 014–017: ─────────────────────────
--   014 (original): first cut of the view with 6 domains
--   015: timetable slots assigned to staff_id (e.g. coordinators) now count
--        as covered, not gaps
--   016: holistic switched from raw rating-row count to "X of N parameters"
--        completeness
--   017: holistic counts now scoped to the parameters defined for this
--        class's NEP stage (foundational / preparatory / middle / secondary),
--        derived from classes.grade_level
--
-- Stage mapping (matches gradeToStage in app/api/holistic/parameters/route.ts):
--   grade_level IS NULL or <= 2 → foundational
--   grade_level <= 5            → preparatory
--   grade_level <= 8            → middle
--   grade_level >= 9            → secondary
--
-- A timetable slot is considered covered if EITHER teacher_id OR staff_id
-- is set. Lunch/break slots are not inserted into erp_timetable_slots at
-- all (the API skips empty inserts), so they don't affect any count here.
-- ============================================================================

DROP VIEW IF EXISTS vw_class_section_health;

CREATE VIEW vw_class_section_health AS
SELECT
  ecs.id              AS class_section_id,
  es.partner_id       AS partner_user_id,    -- users.id of the partner
  ecs.session_id,
  c.name              AS class_name,
  s.name              AS section_name,
  c.grade_level       AS grade_level,
  CASE
    WHEN c.grade_level IS NULL OR c.grade_level <= 2 THEN 'foundational'
    WHEN c.grade_level <= 5 THEN 'preparatory'
    WHEN c.grade_level <= 8 THEN 'middle'
    ELSE 'secondary'
  END                 AS stage,

  ecs.class_teacher_id,
  u.name              AS class_teacher_name,

  (SELECT COUNT(*)
     FROM erp_student_enrollments se
    WHERE se.class_section_id = ecs.id
      AND se.status = 'active'
  ) AS active_students,

  -- ─── Attendance ─────────────────────────────────────────────────
  (SELECT MAX(ar.date)
     FROM erp_attendance_records ar
     JOIN erp_student_enrollments se ON se.id = ar.student_enrollment_id
    WHERE se.class_section_id = ecs.id
  ) AS last_attendance_date,

  (SELECT COUNT(DISTINCT ar.date)
     FROM erp_attendance_records ar
     JOIN erp_student_enrollments se ON se.id = ar.student_enrollment_id
    WHERE se.class_section_id = ecs.id
      AND ar.date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
  ) AS days_marked_last_7,

  -- ─── Marks ──────────────────────────────────────────────────────
  -- Exams that are completed/in-progress but have zero marks recorded.
  (SELECT COUNT(*)
     FROM erp_exams e
    WHERE e.class_section_id = ecs.id
      AND e.status IN ('completed', 'in_progress')
      AND NOT EXISTS (
        SELECT 1 FROM erp_marks m WHERE m.exam_id = e.id
      )
  ) AS exams_with_no_marks,

  -- Exams that have some marks but at least one scheduled subject is missing.
  (SELECT COUNT(DISTINCT e.id)
     FROM erp_exams e
     JOIN erp_exam_schedules sch ON sch.exam_id = e.id
    WHERE e.class_section_id = ecs.id
      AND e.status IN ('completed', 'in_progress')
      AND NOT EXISTS (
        SELECT 1 FROM erp_marks m
         WHERE m.exam_id = e.id AND m.subject_id = sch.subject_id
      )
      AND EXISTS (
        SELECT 1 FROM erp_marks m WHERE m.exam_id = e.id
      )
  ) AS exams_with_partial_marks,

  (SELECT MAX(m.created_at)
     FROM erp_marks m
     JOIN erp_student_enrollments se ON se.id = m.student_enrollment_id
    WHERE se.class_section_id = ecs.id
  ) AS last_marks_at,

  -- ─── Subjects (kept for future use; not rendered on the page) ──
  (SELECT COUNT(*) FROM erp_subjects WHERE class_section_id = ecs.id
  ) AS subject_count,

  (SELECT COUNT(*) FROM erp_subjects
    WHERE class_section_id = ecs.id AND teacher_id IS NULL
  ) AS subjects_without_teacher,

  -- ─── Timetable ──────────────────────────────────────────────────
  (SELECT COUNT(*) FROM erp_timetable_slots
    WHERE class_section_id = ecs.id
  ) AS timetable_slot_count,

  (SELECT COUNT(*) FROM erp_timetable_slots
    WHERE class_section_id = ecs.id
      AND subject_id IS NULL
      AND teacher_id IS NULL
      AND staff_id   IS NULL
  ) AS timetable_empty_slots,

  -- A subject is being taught but no one is assigned. staff_id (e.g. a
  -- coordinator supervising the period) counts as covered, not a gap.
  (SELECT COUNT(*) FROM erp_timetable_slots
    WHERE class_section_id = ecs.id
      AND subject_id IS NOT NULL
      AND teacher_id IS NULL
      AND staff_id   IS NULL
  ) AS timetable_slots_without_teacher,

  -- ─── Holistic (stage-scoped) ────────────────────────────────────
  (SELECT MAX(r.month)
     FROM erp_holistic_ratings r
     JOIN erp_student_enrollments se ON se.id = r.student_enrollment_id
    WHERE se.class_section_id = ecs.id
  ) AS last_holistic_month,

  -- Total holistic parameters defined for THIS CLASS'S STAGE only.
  (SELECT COUNT(*) FROM erp_holistic_parameters hp
    WHERE hp.partner_id = es.partner_id
      AND hp.stage = (CASE
        WHEN c.grade_level IS NULL OR c.grade_level <= 2 THEN 'foundational'
        WHEN c.grade_level <= 5 THEN 'preparatory'
        WHEN c.grade_level <= 8 THEN 'middle'
        ELSE 'secondary'
      END)
  ) AS total_parameters,

  -- Distinct parameters within this stage that have at least one rating
  -- this month for any student in this class section.
  (SELECT COUNT(DISTINCT sp.parameter_id)
     FROM erp_holistic_ratings r
     JOIN erp_holistic_sub_parameters sp ON sp.id = r.sub_parameter_id
     JOIN erp_holistic_parameters hp ON hp.id = sp.parameter_id
     JOIN erp_student_enrollments se ON se.id = r.student_enrollment_id
    WHERE se.class_section_id = ecs.id
      AND r.month = DATE_FORMAT(CURDATE(), '%Y-%m-01')
      AND hp.stage = (CASE
        WHEN c.grade_level IS NULL OR c.grade_level <= 2 THEN 'foundational'
        WHEN c.grade_level <= 5 THEN 'preparatory'
        WHEN c.grade_level <= 8 THEN 'middle'
        ELSE 'secondary'
      END)
  ) AS parameters_rated_this_month

FROM erp_class_sections ecs
JOIN erp_sessions es ON es.id = ecs.session_id
JOIN classes c ON c.id = ecs.class_id
JOIN sections s ON s.id = ecs.section_id
LEFT JOIN users u ON u.id = ecs.class_teacher_id
WHERE es.is_current = 1;

-- ============================================================================
-- Record this migration
-- ============================================================================
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('014', 'create_class_section_health_view', NOW())
ON DUPLICATE KEY UPDATE applied_at = NOW();
