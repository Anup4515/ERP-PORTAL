-- ============================================================================
-- Migration: 020_add_recurring_fees.sql
-- Description: Extend fee tables to support recurring (monthly) fees.
--
--              erp_fee_structures gains:
--                recurrence       — 'one_time' (existing behaviour, keeps due_date)
--                                   'monthly'  (uses start_month/end_month/day_of_month)
--                start_month      — first month in the window (1st of month)
--                end_month        — last month in the window
--                due_day_of_month — e.g. 5 → "due on 5th of each month"
--                                   (clamped to last day of months that are shorter)
--
--              erp_fee_dues gains:
--                period_label     — '' for one-time, 'YYYY-MM' for monthly
--                                   uniquely identifies the month a due belongs to
--                                   so re-running Assign is idempotent.
--
--              The old unique key (structure_id, student_enrollment_id) is
--              replaced by (structure_id, student_enrollment_id, period_label)
--              so a single recurring structure can produce multiple dues
--              per student (one per month) without colliding.
-- Created: 2026-05-04
-- ============================================================================

ALTER TABLE erp_fee_structures
  ADD COLUMN recurrence       ENUM('one_time','monthly') NOT NULL DEFAULT 'one_time' AFTER amount,
  ADD COLUMN start_month      DATE     NULL AFTER recurrence,
  ADD COLUMN end_month        DATE     NULL AFTER start_month,
  ADD COLUMN due_day_of_month TINYINT  UNSIGNED NULL AFTER end_month;

ALTER TABLE erp_fee_dues
  ADD COLUMN period_label VARCHAR(16) NOT NULL DEFAULT '' AFTER structure_id;

-- Replace the old (structure, enrollment) unique key with one that includes
-- period_label, so monthly fees can produce one row per month per student.
-- Existing one-time dues all have period_label = '' (the column default), so
-- they remain unique under the new constraint.
ALTER TABLE erp_fee_dues
  DROP INDEX uk_due_per_enrollment,
  ADD UNIQUE KEY uk_due_per_enrollment_period (structure_id, student_enrollment_id, period_label);


-- ─── Record this migration ──────────────────────────────────────────────────
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('020', 'add_recurring_fees', NOW())
ON DUPLICATE KEY UPDATE applied_at = NOW();
