-- ============================================================================
-- Migration: 002_add_performance_indexes.sql
-- Description: Add indexes for frequent query patterns to improve performance
-- Created: 2026-04-08
-- ============================================================================

-- NOTE: idx_erp_sessions_partner_current already applied from previous attempt

-- ─── erp_student_enrollments ────────────────────────────────────────────
-- Student lists, attendance, marks filter by class_section_id + status
-- (table has `status` enum, NOT `is_current`)
CREATE INDEX idx_erp_enrollments_cs_status
  ON erp_student_enrollments (class_section_id, status);

-- Student-lookup queries filter by student_id + status
CREATE INDEX idx_erp_enrollments_student_status
  ON erp_student_enrollments (student_id, status);

-- ─── erp_attendance_records ─────────────────────────────────────────────
-- Monthly summaries scan by enrollment + date range + status
-- (existing uq_erp_attendance covers enrollment+date but not status)
CREATE INDEX idx_erp_attendance_enrollment_date_status
  ON erp_attendance_records (student_enrollment_id, date, status);

-- ─── erp_marks ──────────────────────────────────────────────────────────
-- Already has uq_erp_marks (exam_id, subject_id, student_enrollment_id)
-- which covers the main query pattern — no additional index needed

-- ─── erp_class_sections ─────────────────────────────────────────────────
-- Queries that filter only by session_id (existing unique key includes
-- class_id + section_id which MySQL can still use, but a dedicated
-- single-column index is more efficient for session-only lookups)
CREATE INDEX idx_erp_cs_session
  ON erp_class_sections (session_id);

-- ─── students ───────────────────────────────────────────────────────────
-- Student search: WHERE first_name LIKE ? OR last_name LIKE ?
CREATE INDEX idx_students_first_name ON students (first_name);
CREATE INDEX idx_students_last_name  ON students (last_name);

-- Soft delete filter used on every student query
CREATE INDEX idx_students_deleted_at ON students (deleted_at);

-- ─── erp_calendar_days ──────────────────────────────────────────────────
-- Calendar queries by session + date range + holiday flag
-- (existing uq_session_date covers session+date but not is_holiday)
CREATE INDEX idx_erp_calendar_session_date_holiday
  ON erp_calendar_days (session_id, date, is_holiday);

-- ─── erp_exams ──────────────────────────────────────────────────────────
-- Exam listing sorted by creation date within a class section
CREATE INDEX idx_erp_exams_cs_created
  ON erp_exams (class_section_id, created_at DESC);

-- ============================================================================
-- Record this migration
-- ============================================================================
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('002', 'add_performance_indexes', NOW())
ON DUPLICATE KEY UPDATE applied_at = NOW();
