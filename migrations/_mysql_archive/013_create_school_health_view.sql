-- ============================================================================
-- Migration: 013_create_school_health_view.sql
-- Description: Creates vw_school_health, a per-partner summary of how
--              actively the school is using the portal. Powers the
--              self-service health widget on the school admin dashboard
--              and (later) the consultant's school overview.
--
-- Note on keys:
--   - p.id          → partners.id           (the school's own PK; "schoolId" in code)
--   - p.user_id     → users.id              (used as partner_id throughout
--                                            ERP tables; "partnerUserId" in code)
-- Created: 2026-04-28
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
      AND is_current = 1
  ) AS current_session_count,

  -- Class sections in the current session that are missing a class teacher
  (SELECT COUNT(*)
     FROM erp_class_sections ecs
     JOIN erp_sessions es ON es.id = ecs.session_id
    WHERE es.partner_id = p.user_id
      AND es.is_current = 1
      AND ecs.class_teacher_id IS NULL
  ) AS classes_without_teacher,

  -- Total timetable slots in the current session (0 = timetable not published)
  (SELECT COUNT(*)
     FROM erp_timetable_slots ts
     JOIN erp_class_sections ecs ON ecs.id = ts.class_section_id
     JOIN erp_sessions es ON es.id = ecs.session_id
    WHERE es.partner_id = p.user_id
      AND es.is_current = 1
  ) AS timetable_slot_count,

  -- Last holistic rating entered for any student of this partner
  (SELECT MAX(r.created_at)
     FROM erp_holistic_ratings r
     JOIN erp_student_enrollments se ON se.id = r.student_enrollment_id
    WHERE se.partner_id = p.user_id
  ) AS last_holistic_at

FROM partners p;

-- ============================================================================
-- Record this migration
-- ============================================================================
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('013', 'create_school_health_view', NOW())
ON DUPLICATE KEY UPDATE applied_at = NOW();
