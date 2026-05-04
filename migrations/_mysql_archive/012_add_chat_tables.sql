-- ============================================================================
-- Migration: 012_add_chat_tables.sql
-- Description: Direct messaging between school admin and teachers within a
--              single partner (school). One thread per user-pair; messages
--              are rows hanging off a thread.
--
--              partner_id mirrors the rest of erp_* tables: it stores the
--              school admin's users.id (= ctx.partnerUserId), not partners.id.
--
--              user_a_id / user_b_id are ordered (user_a_id < user_b_id) so a
--              single UNIQUE index guarantees one thread per pair.
-- Created: 2026-04-24
-- ============================================================================

CREATE TABLE erp_chat_threads (
  id bigint unsigned NOT NULL AUTO_INCREMENT,
  partner_id bigint unsigned NOT NULL,
  user_a_id bigint unsigned NOT NULL,
  user_b_id bigint unsigned NOT NULL,
  last_message_at timestamp NULL DEFAULT NULL,
  last_message_preview varchar(255) DEFAULT NULL,
  last_sender_id bigint unsigned DEFAULT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_partner_pair (partner_id, user_a_id, user_b_id),
  KEY idx_user_a (partner_id, user_a_id, last_message_at),
  KEY idx_user_b (partner_id, user_b_id, last_message_at),
  CONSTRAINT chk_chat_pair_ordered CHECK (user_a_id < user_b_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE erp_chat_messages (
  id bigint unsigned NOT NULL AUTO_INCREMENT,
  thread_id bigint unsigned NOT NULL,
  sender_id bigint unsigned NOT NULL,
  body text NOT NULL,
  read_at timestamp NULL DEFAULT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_thread_created (thread_id, id),
  KEY idx_sender (sender_id),
  CONSTRAINT fk_chat_messages_thread
    FOREIGN KEY (thread_id) REFERENCES erp_chat_threads (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('012', 'add_chat_tables', NOW())
ON DUPLICATE KEY UPDATE applied_at = NOW();
