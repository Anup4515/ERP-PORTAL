-- ============================================================================
-- Migration: 010_add_exam_type.sql
-- Description: Classify exams into semantic buckets so the annual report card
--              can pick the right exams per template:
--                - senior classes (grade ≥ 9) → 'final_annual'
--                - junior classes (grade 1–8) → 'mid_term' + 'final_annual'
-- Created: 2026-04-24
-- ============================================================================

ALTER TABLE erp_exams
  ADD COLUMN exam_type ENUM('other','unit_test','mid_term','final_annual')
    NOT NULL DEFAULT 'other' AFTER code;

CREATE INDEX idx_erp_exams_type ON erp_exams (class_section_id, exam_type, status);

INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('010', 'add_exam_type', NOW())
ON DUPLICATE KEY UPDATE applied_at = NOW();
