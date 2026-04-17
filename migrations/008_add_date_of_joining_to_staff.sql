-- ============================================================================
-- Migration: 008_add_date_of_joining_to_staff.sql
-- Description: Add date_of_joining column to partner_staff, matching the
--              field already available on partner_teachers.
-- Created: 2026-04-17
-- ============================================================================

ALTER TABLE partner_staff
  ADD COLUMN date_of_joining DATE DEFAULT NULL AFTER address;

INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('008', 'add_date_of_joining_to_staff', NOW())
ON DUPLICATE KEY UPDATE applied_at = NOW();
