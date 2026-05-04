-- ============================================================================
-- Migration: 009_alter_partner_logo_column.sql
-- Description: Enlarge partners.logo from varchar(255) to LONGTEXT so we can
--              store base64 data URIs for institution branding.
-- Created: 2026-04-21
-- ============================================================================

ALTER TABLE partners
  MODIFY COLUMN logo LONGTEXT DEFAULT NULL;

INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('009', 'alter_partner_logo_column', NOW())
ON DUPLICATE KEY UPDATE applied_at = NOW();
