-- ============================================================================
-- Migration: 015_add_chat_read_at.sql
-- Description: Adds a read_at column to the legacy `chats` table so the
--              consultant-chat surface in partners-portal can track unread
--              messages and render an unread badge per consultant. Backwards
--              compatible: admin_panel never reads/writes this column.
-- Created: 2026-04-30
-- ============================================================================

ALTER TABLE chats
  ADD COLUMN read_at TIMESTAMP NULL DEFAULT NULL AFTER path,
  ADD INDEX idx_chats_receiver_unread (receiver_id, read_at),
  ADD INDEX idx_chats_sender_receiver_created (sender_id, receiver_id, created_at);

INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('015', 'add_chat_read_at', NOW())
ON DUPLICATE KEY UPDATE applied_at = NOW();
