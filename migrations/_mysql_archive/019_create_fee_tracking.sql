-- ============================================================================
-- Migration: 019_create_fee_tracking.sql
-- Description: Fee tracking — three tables that work together:
--                1. erp_fee_structures — fee templates per session
--                                       (e.g. "Tuition Q1 2026, ₹15000")
--                2. erp_fee_dues       — per-enrollment expected dues
--                                       (one row per student per structure)
--                3. erp_fee_payments   — collection log against a due
--                                       (supports partial payments)
--
--              partner_id columns reference users(id) (= partnerUserId in
--              auth-utils), matching the convention used by erp_exams,
--              erp_student_enrollments, erp_sessions.
-- Created: 2026-05-03
-- ============================================================================

-- ─── 1. erp_fee_structures ──────────────────────────────────────────────────
CREATE TABLE erp_fee_structures (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  partner_id        BIGINT UNSIGNED NOT NULL,
  session_id        BIGINT UNSIGNED NOT NULL,
  class_section_id  BIGINT UNSIGNED NULL,                           -- NULL → applies to all sections in the session
  name              VARCHAR(128) NOT NULL,                          -- "Tuition Q1 2026"
  fee_type          VARCHAR(64)  NOT NULL DEFAULT 'other',          -- 'tuition','transport','exam','other'
  amount            DECIMAL(10,2) NOT NULL,
  due_date          DATE NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_fs_partner_session (partner_id, session_id),
  KEY idx_fs_class_section   (class_section_id),
  CONSTRAINT fk_fs_partner FOREIGN KEY (partner_id)       REFERENCES users(id)              ON DELETE CASCADE,
  CONSTRAINT fk_fs_session FOREIGN KEY (session_id)       REFERENCES erp_sessions(id)       ON DELETE CASCADE,
  CONSTRAINT fk_fs_cs      FOREIGN KEY (class_section_id) REFERENCES erp_class_sections(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─── 2. erp_fee_dues ────────────────────────────────────────────────────────
CREATE TABLE erp_fee_dues (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  partner_id            BIGINT UNSIGNED NOT NULL,
  structure_id          BIGINT UNSIGNED NOT NULL,
  student_enrollment_id BIGINT UNSIGNED NOT NULL,
  amount_due            DECIMAL(10,2) NOT NULL,                                     -- copied from structure on assign; overridable
  amount_paid           DECIMAL(10,2) NOT NULL DEFAULT 0.00,                        -- recomputed from payments
  status                ENUM('pending','partial','paid','waived') NOT NULL DEFAULT 'pending',
  due_date              DATE NULL,
  remarks               TEXT NULL,
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_due_per_enrollment (structure_id, student_enrollment_id),           -- a student gets one due per structure
  KEY idx_due_partner    (partner_id),
  KEY idx_due_enrollment (student_enrollment_id),
  KEY idx_due_status     (status),
  CONSTRAINT fk_due_partner    FOREIGN KEY (partner_id)            REFERENCES users(id)                   ON DELETE CASCADE,
  CONSTRAINT fk_due_structure  FOREIGN KEY (structure_id)          REFERENCES erp_fee_structures(id)      ON DELETE CASCADE,
  CONSTRAINT fk_due_enrollment FOREIGN KEY (student_enrollment_id) REFERENCES erp_student_enrollments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─── 3. erp_fee_payments ────────────────────────────────────────────────────
CREATE TABLE erp_fee_payments (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  partner_id    BIGINT UNSIGNED NOT NULL,
  due_id        BIGINT UNSIGNED NOT NULL,
  amount        DECIMAL(10,2) NOT NULL,
  paid_date     DATE NOT NULL,
  payment_mode  VARCHAR(32) NULL,        -- cash, upi, bank, cheque, card
  reference_no  VARCHAR(64) NULL,
  remarks       TEXT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pay_partner (partner_id),
  KEY idx_pay_due     (due_id),
  KEY idx_pay_date    (paid_date),
  CONSTRAINT fk_pay_partner FOREIGN KEY (partner_id) REFERENCES users(id)         ON DELETE CASCADE,
  CONSTRAINT fk_pay_due     FOREIGN KEY (due_id)     REFERENCES erp_fee_dues(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─── Record this migration ──────────────────────────────────────────────────
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('019', 'create_fee_tracking', NOW())
ON DUPLICATE KEY UPDATE applied_at = NOW();
