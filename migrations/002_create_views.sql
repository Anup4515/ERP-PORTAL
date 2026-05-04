-- ============================================================================
-- Migration: 002_create_views.sql  (Postgres edition)
-- Description: Recreates the two views the partners-portal app actually uses:
--                vw_school_health         — partner-level dashboard summary
--                vw_class_section_health  — per-class-section drilldown for
--                                           /school-admin/data-health
--              These were originally migrations 013 and 014 against MySQL.
--              Translation notes:
--                • is_current = 1                    → is_current = TRUE
--                • DATE_SUB(CURDATE(), INTERVAL 7 D) → CURRENT_DATE - INTERVAL '7 days'
--                • DATE_FORMAT(CURDATE(), '%Y-%m-01')→ date_trunc('month', CURRENT_DATE)::date
--                • hp.stage = (CASE … END)           — explicit cast to
--                                                      holistic_stage so the
--                                                      enum compares cleanly
-- Created: 2026-05-04
-- ============================================================================

DROP VIEW IF EXISTS vw_school_health;

CREATE VIEW vw_school_health AS
SELECT
  p.id           AS partner_id,        -- partners.id   (matches session.user.school_id)
  p.user_id      AS partner_user_id,   -- users.id      (matches ERP partner_id columns)
  p.partner_name AS school_name,

  -- Last attendance entry for any student of this partner
  (SELECT MAX(ar.created_at)
     FROM erp_attendance_records ar
     JOIN erp_student_enrollments se ON se.id = ar.student_enrollment_id
    WHERE se.partner_id = p.user_id
  ) AS last_attendance_at,

  -- Last marks entry for any student of this partner
  (SELECT MAX(m.created_at)
     FROM erp_marks m
     JOIN erp_student_enrollments se ON se.id = m.student_enrollment_id
    WHERE se.partner_id = p.user_id
  ) AS last_marks_at,

  -- Profile completeness, scored 0-4 across logo, address, board, registration
  (
    (CASE WHEN p.logo                IS NULL OR p.logo                = '' THEN 0 ELSE 1 END) +
    (CASE WHEN p.address             IS NULL OR p.address             = '' THEN 0 ELSE 1 END) +
    (CASE WHEN p.affiliated_board    IS NULL OR p.affiliated_board    = '' THEN 0 ELSE 1 END) +
    (CASE WHEN p.registration_number IS NULL OR p.registration_number = '' THEN 0 ELSE 1 END)
  ) AS profile_score,

  -- Number of sessions flagged is_current (should be exactly 1)
  (SELECT COUNT(*)
     FROM erp_sessions
    WHERE partner_id = p.user_id
      AND is_current = TRUE
  ) AS current_session_count,

  -- Class sections in the current session that are missing a class teacher
  (SELECT COUNT(*)
     FROM erp_class_sections ecs
     JOIN erp_sessions es ON es.id = ecs.session_id
    WHERE es.partner_id = p.user_id
      AND es.is_current = TRUE
      AND ecs.class_teacher_id IS NULL
  ) AS classes_without_teacher,

  -- Total timetable slots in the current session (0 = timetable not published)
  (SELECT COUNT(*)
     FROM erp_timetable_slots ts
     JOIN erp_class_sections ecs ON ecs.id = ts.class_section_id
     JOIN erp_sessions es ON es.id = ecs.session_id
    WHERE es.partner_id = p.user_id
      AND es.is_current = TRUE
  ) AS timetable_slot_count,

  -- Last holistic rating entered for any student of this partner
  (SELECT MAX(r.created_at)
     FROM erp_holistic_ratings r
     JOIN erp_student_enrollments se ON se.id = r.student_enrollment_id
    WHERE se.partner_id = p.user_id
  ) AS last_holistic_at

FROM partners p;


DROP VIEW IF EXISTS vw_class_section_health;

CREATE VIEW vw_class_section_health AS
SELECT
  ecs.id              AS class_section_id,
  es.partner_id       AS partner_user_id,
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
      AND ar.date >= CURRENT_DATE - INTERVAL '7 days'
  ) AS days_marked_last_7,

  -- ─── Marks ──────────────────────────────────────────────────────
  (SELECT COUNT(*)
     FROM erp_exams e
    WHERE e.class_section_id = ecs.id
      AND e.status IN ('completed', 'in_progress')
      AND NOT EXISTS (
        SELECT 1 FROM erp_marks m WHERE m.exam_id = e.id
      )
  ) AS exams_with_no_marks,

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

  -- ─── Subjects ──────────────────────────────────────────────────
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

  (SELECT COUNT(*) FROM erp_holistic_parameters hp
    WHERE hp.partner_id = es.partner_id
      AND hp.stage = (CASE
        WHEN c.grade_level IS NULL OR c.grade_level <= 2 THEN 'foundational'
        WHEN c.grade_level <= 5 THEN 'preparatory'
        WHEN c.grade_level <= 8 THEN 'middle'
        ELSE 'secondary'
      END)::holistic_stage
  ) AS total_parameters,

  (SELECT COUNT(DISTINCT sp.parameter_id)
     FROM erp_holistic_ratings r
     JOIN erp_holistic_sub_parameters sp ON sp.id = r.sub_parameter_id
     JOIN erp_holistic_parameters hp ON hp.id = sp.parameter_id
     JOIN erp_student_enrollments se ON se.id = r.student_enrollment_id
    WHERE se.class_section_id = ecs.id
      AND r.month = date_trunc('month', CURRENT_DATE)::date
      AND hp.stage = (CASE
        WHEN c.grade_level IS NULL OR c.grade_level <= 2 THEN 'foundational'
        WHEN c.grade_level <= 5 THEN 'preparatory'
        WHEN c.grade_level <= 8 THEN 'middle'
        ELSE 'secondary'
      END)::holistic_stage
  ) AS parameters_rated_this_month

FROM erp_class_sections ecs
JOIN erp_sessions es ON es.id = ecs.session_id
JOIN classes c ON c.id = ecs.class_id
JOIN sections s ON s.id = ecs.section_id
LEFT JOIN users u ON u.id = ecs.class_teacher_id
WHERE es.is_current = TRUE;


-- ============================================================================
-- Record this migration
-- ============================================================================
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('002', 'create_views', NOW())
ON CONFLICT (version) DO UPDATE SET applied_at = NOW();
