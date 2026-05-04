-- ============================================================================
-- Migration: 017_extend_student_subscriptions.sql
-- Description: Step 2 of the three-business-model rollout. The legacy
--              `student_subscriptions` shape (start_date/end_date/is_active)
--              cannot represent who paid (student vs partner vs platform) or
--              carry a payment reference. This migration extends the table
--              additively — legacy columns are kept so admin_panel and any
--              existing rows keep working — and backfills the new columns
--              from the legacy ones so the access predicate
--              `WHERE status='active' AND expires_at > NOW()` works on day one.
--
--              New code (student-portal premium gate, partners-portal POST
--              /api/students auto-write) targets the new columns exclusively.
--              A future migration can drop start_date/end_date/is_active once
--              admin_panel is retired.
-- Created: 2026-05-01
-- ============================================================================

ALTER TABLE student_subscriptions
  ADD COLUMN status ENUM('active','expired','cancelled','pending') NOT NULL DEFAULT 'active' AFTER end_date,
  ADD COLUMN starts_at DATETIME NULL AFTER status,
  ADD COLUMN expires_at DATETIME NULL AFTER starts_at,
  ADD COLUMN payer_type ENUM('student','partner','platform') NOT NULL DEFAULT 'student' AFTER expires_at,
  ADD COLUMN payer_partner_id BIGINT UNSIGNED NULL AFTER payer_type,
  ADD COLUMN payment_ref VARCHAR(255) NULL AFTER payer_partner_id,
  ADD CONSTRAINT fk_student_subs_payer_partner
    FOREIGN KEY (payer_partner_id) REFERENCES partners (id) ON DELETE SET NULL,
  ADD INDEX idx_student_subs_active (student_id, status, expires_at),
  ADD INDEX idx_student_subs_payer_partner (payer_partner_id);

-- Backfill new columns from legacy ones so existing rows are queryable
-- under the new access predicate immediately.
UPDATE student_subscriptions
SET starts_at = CAST(start_date AS DATETIME),
    expires_at = CAST(end_date AS DATETIME),
    status = CASE WHEN is_active = 1 AND end_date >= CURDATE() THEN 'active' ELSE 'expired' END
WHERE starts_at IS NULL;

INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('017', 'extend_student_subscriptions', NOW())
ON DUPLICATE KEY UPDATE applied_at = NOW();
