-- ============================================================================
-- Migration: 016_add_partner_tier.sql
-- Description: Step 1 of the three-business-model rollout (see
--              portal-architecture.md). Adds tier + default plan + contract
--              window to `partners` so the schema can distinguish:
--                - Model 1 free school (tier='free', no auto-subscription)
--                - Model 2 paid school (tier='paid', partner-funded subs)
--              Also adds `default_plan_id` and `contract_ends_at` so that the
--              partners-portal POST /api/students handler (Step 5) can write
--              partner-paid student_subscriptions rows with a sane plan and
--              expiry without forcing the school admin to specify both each
--              time.
-- Created: 2026-05-01
-- ============================================================================

ALTER TABLE partners
  ADD COLUMN tier ENUM('free','paid') NOT NULL DEFAULT 'free' AFTER partner_type,
  ADD COLUMN default_plan_id BIGINT UNSIGNED NULL AFTER tier,
  ADD COLUMN contract_ends_at DATE NULL AFTER default_plan_id,
  ADD CONSTRAINT fk_partners_default_plan
    FOREIGN KEY (default_plan_id) REFERENCES plans (id) ON DELETE SET NULL;

INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('016', 'add_partner_tier', NOW())
ON DUPLICATE KEY UPDATE applied_at = NOW();
