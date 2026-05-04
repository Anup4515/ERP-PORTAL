-- ============================================================================
-- Migration: 005_add_partner_id_to_exams_and_enrollments.sql
-- Description: Add denormalized partner_id column to erp_exams and
--              erp_student_enrollments to eliminate 2-3 JOINs on the most
--              frequently queried tables.
-- Created: 2026-04-14
-- ============================================================================


-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1: Add the column (nullable first, so existing rows don't break)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE erp_exams
  ADD COLUMN partner_id BIGINT UNSIGNED NULL AFTER class_section_id;

ALTER TABLE erp_student_enrollments
  ADD COLUMN partner_id BIGINT UNSIGNED NULL AFTER class_section_id;


-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 2: Backfill existing rows from the JOIN chain
--         erp_exams → erp_class_sections → erp_sessions.partner_id
--         erp_student_enrollments → erp_class_sections → erp_sessions.partner_id
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE erp_exams e
  JOIN erp_class_sections ecs ON ecs.id = e.class_section_id
  JOIN erp_sessions es ON es.id = ecs.session_id
SET e.partner_id = es.partner_id;

UPDATE erp_student_enrollments se
  JOIN erp_class_sections ecs ON ecs.id = se.class_section_id
  JOIN erp_sessions es ON es.id = ecs.session_id
SET se.partner_id = es.partner_id;


-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 3: Make the column NOT NULL now that all rows are backfilled
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE erp_exams
  MODIFY COLUMN partner_id BIGINT UNSIGNED NOT NULL;

ALTER TABLE erp_student_enrollments
  MODIFY COLUMN partner_id BIGINT UNSIGNED NOT NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 4: Add foreign keys and indexes
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE erp_exams
  ADD CONSTRAINT fk_erp_exams_partner FOREIGN KEY (partner_id) REFERENCES users(id),
  ADD INDEX idx_erp_exams_partner (partner_id);

ALTER TABLE erp_student_enrollments
  ADD CONSTRAINT fk_erp_enrollments_partner FOREIGN KEY (partner_id) REFERENCES users(id),
  ADD INDEX idx_erp_enrollments_partner (partner_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- Record this migration
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('005', 'add_partner_id_to_exams_and_enrollments', NOW())
ON DUPLICATE KEY UPDATE applied_at = NOW();
