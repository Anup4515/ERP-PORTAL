-- ============================================================================
-- Migration: 018_create_partner_assignments.sql
-- Description: Bridges the timeline gap between superadmin (in admin_panel)
--              creating a school user and the school later filling out the
--              partners-portal /setup-partner form. admin_panel writes one
--              row here per school user at user-creation time, capturing the
--              tier / plan / contract chosen by the superadmin.
--              partners-portal /api/partner/setup reads this row when the
--              school first creates their partner profile, copies the
--              values into the new partners row, and stamps applied_at.
--
--              After applied_at is set the row is historical; further tier
--              changes go directly to partners.tier through a different
--              admin UI (not yet built). This keeps the partners INSERT in
--              setup as an INSERT — not an UPSERT — and gives us an
--              auditable record of who assigned what tier when.
-- Created: 2026-05-01
-- ============================================================================

CREATE TABLE partner_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  tier ENUM('free','paid') NOT NULL DEFAULT 'free',
  default_plan_id BIGINT UNSIGNED NULL,
  contract_ends_at DATE NULL,
  created_by BIGINT UNSIGNED NULL,
  applied_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_partner_assignments_user (user_id),
  KEY idx_partner_assignments_applied (applied_at),
  CONSTRAINT fk_partner_assignments_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_partner_assignments_plan
    FOREIGN KEY (default_plan_id) REFERENCES plans (id) ON DELETE SET NULL,
  CONSTRAINT fk_partner_assignments_created_by
    FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('018', 'create_partner_assignments', NOW())
ON DUPLICATE KEY UPDATE applied_at = NOW();
