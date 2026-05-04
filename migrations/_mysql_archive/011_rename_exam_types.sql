-- ============================================================================
-- Migration: 011_rename_exam_types.sql
-- Description: Rename exam_type enum from
--                ('unit_test','first_term','second_term','final','other')
--              to
--                ('other','unit_test','mid_term','final_annual')
--              mapping:
--                first_term  -> mid_term
--                second_term -> final_annual
--                final       -> final_annual
-- Run this only on environments where migration 010 has already been applied
-- with the old enum. Fresh environments should just apply the updated 010.
-- Created: 2026-04-24
-- ============================================================================

-- 1. Expand the enum to a superset of old + new values so the UPDATEs below
--    don't fail on rows still holding the old values.
ALTER TABLE erp_exams
  MODIFY COLUMN exam_type
    ENUM('other','unit_test','mid_term','final_annual',
         'first_term','second_term','final')
    NOT NULL DEFAULT 'other';

-- 2. Remap the old values to the new ones.
UPDATE erp_exams SET exam_type = 'mid_term'     WHERE exam_type = 'first_term';
UPDATE erp_exams SET exam_type = 'final_annual' WHERE exam_type = 'second_term';
UPDATE erp_exams SET exam_type = 'final_annual' WHERE exam_type = 'final';

-- 3. Collapse the enum to its final shape.
ALTER TABLE erp_exams
  MODIFY COLUMN exam_type
    ENUM('other','unit_test','mid_term','final_annual')
    NOT NULL DEFAULT 'other';

INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('011', 'rename_exam_types', NOW())
ON DUPLICATE KEY UPDATE applied_at = NOW();
