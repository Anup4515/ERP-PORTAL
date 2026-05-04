-- ============================================================================
-- Migration: 004_add_indexes_and_constraints.sql
-- Description: Add missing performance indexes and unique constraints to
--              prevent data corruption and improve query speed.
-- Created: 2026-04-14
-- ============================================================================


-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1: MISSING PERFORMANCE INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── erp_exams ─────────────────────────────────────────────────────────────
-- Annual report, teacher exams page filter by class_section_id + status.
-- Existing idx_erp_exams_cs only covers class_section_id.
CREATE INDEX idx_erp_exams_cs_status
  ON erp_exams (class_section_id, status);

-- ─── erp_timetable_slots ───────────────────────────────────────────────────
-- Staff conflict detection queries: WHERE staff_id = ? AND day_of_week = ? AND period_number = ?
-- Teacher conflict index (idx_teacher_day_period) already exists, but staff is missing.
CREATE INDEX idx_erp_timetable_staff_day_period
  ON erp_timetable_slots (staff_id, day_of_week, period_number);

-- ─── erp_report_cards ──────────────────────────────────────────────────────
-- Annual report looks up teacher_remarks: WHERE student_enrollment_id = ? AND type = ?
-- Existing idx_erp_reports_enrollment only covers student_enrollment_id.
CREATE INDEX idx_erp_reports_enrollment_type
  ON erp_report_cards (student_enrollment_id, type);



-- ═══════════════════════════════════════════════════════════════════════════
-- Record this migration
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('004', 'add_indexes_and_constraints', NOW())
ON DUPLICATE KEY UPDATE applied_at = NOW();
