-- ============================================================================
-- Migration: 021_create_support_queries.sql
-- Description: One-way support / query channel between school_admins and the
--              superadmin team (admin_panel codebase). A school_admin posts a
--              question; a superadmin reads it and writes back a single
--              resolution_note. No threading / replies in v1 — extend later
--              with a separate erp_support_query_messages table if needed.
--
--              partner_id references users(id) per the erp_* convention
--              (matches erp_sessions, erp_exams, erp_student_enrollments).
-- Created: 2026-05-04
-- ============================================================================

CREATE TABLE erp_support_queries (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  partner_id           BIGINT UNSIGNED NOT NULL,                       -- users.id (the partner account)
  submitted_by_user_id BIGINT UNSIGNED NOT NULL,                       -- users.id (school_admin who posted it)
  category             ENUM('billing','technical','feature','general') NOT NULL DEFAULT 'general',
  subject              VARCHAR(200) NOT NULL,
  message              TEXT NOT NULL,
  status               ENUM('open','in_progress','resolved') NOT NULL DEFAULT 'open',
  resolution_note      TEXT NULL,
  resolved_at          TIMESTAMP NULL,
  resolved_by_user_id  BIGINT UNSIGNED NULL,                           -- users.id (superadmin)
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- Partner's own "my queries" view: filter by status, order by recency.
  KEY idx_esq_partner_status (partner_id, status, created_at),
  -- Superadmin's queue view: all open queries across partners.
  KEY idx_esq_status_created (status, created_at),
  CONSTRAINT fk_esq_partner  FOREIGN KEY (partner_id)           REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_esq_user     FOREIGN KEY (submitted_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_esq_resolver FOREIGN KEY (resolved_by_user_id)  REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─── Record this migration ──────────────────────────────────────────────────
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('021', 'create_support_queries', NOW())
ON DUPLICATE KEY UPDATE applied_at = NOW();
