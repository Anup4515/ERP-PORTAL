-- ============================================================================
-- Migration: 003_seed_roles_and_admin.sql
-- Description: Seed essential roles and a default school admin user
-- Created: 2026-04-08
-- ============================================================================

-- ─── Roles (required for auth to work) ──────────────────────────────────
INSERT IGNORE INTO roles (id, name, slug, created_at, updated_at) VALUES
  (1, 'Super Admin',        'super-admin',        NOW(), NOW()),
  (2, 'Admin',              'admin',               NOW(), NOW()),
  (3, 'Consultant',         'consultant',          NOW(), NOW()),
  (4, 'School',             'school',              NOW(), NOW()),
  (5, 'School Teacher',     'school-teacher',      NOW(), NOW()),
  (6, 'Individual Teacher', 'individual-teacher',  NOW(), NOW());

-- ─── Default school admin user ──────────────────────────────────────────
-- Email:    admin@school.com
-- Password: password123 (bcrypt hash with 10 salt rounds)
INSERT IGNORE INTO users (id, name, email, password, role_id, created_at, updated_at)
VALUES (
  1,
  'School Admin',
  'admin@school.com',
  '$2b$10$z22TYidJbbfnKTsv/CVvzONoWYhVNoy7XbPi7Nk1fMTNgH4ITqjWS',
  4,
  NOW(),
  NOW()
);

-- ============================================================================
-- Record this migration
-- ============================================================================
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('003', 'seed_roles_and_admin', NOW())
ON DUPLICATE KEY UPDATE applied_at = NOW();
