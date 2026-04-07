-- ============================================================================
-- Migration: 000_create_schema_migrations.sql
-- Description: Creates the schema_migrations table to track applied migrations
-- Generated: 2026-04-07
-- ============================================================================

CREATE TABLE IF NOT EXISTS `schema_migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `version` varchar(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  `applied_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_version` (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `schema_migrations` (`version`, `name`, `applied_at`)
VALUES ('000', 'create_schema_migrations', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = NOW();
