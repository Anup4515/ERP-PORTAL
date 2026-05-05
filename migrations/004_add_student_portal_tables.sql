-- ============================================================================
-- Migration: 004_add_student_portal_tables.sql
-- Description: Adds tables that only the student-portal queries but that live
--              in the shared Postgres DB. The baseline (001) skipped these
--              because partners-portal doesn't read or write them — but the
--              two portals share one database, so they need to live here too.
--
--              Tables added:
--                • student_signup_otps   — 6-digit OTP store for student
--                                          signup + password-reset flows.
--                • student_health_records — BMI / height / weight history
--                                           (existed in legacy MySQL; ported).
--
--              Both tables follow the project conventions: BIGSERIAL ids,
--              TIMESTAMPTZ for created_at/updated_at, set_updated_at() trigger.
-- Created: 2026-05-04
-- ============================================================================

-- ─── student_signup_otps ───────────────────────────────────────────────────
-- Used by app/lib/otp.ts in student-portal. `purpose` is 'signup' | 'reset'.
-- Rows are kept after consumption (consumed_at is set, not deleted) so we
-- can audit / debug if needed; cleanup can be a periodic job later.
CREATE TABLE student_signup_otps (
  id           BIGSERIAL PRIMARY KEY,
  email        VARCHAR(255) NOT NULL,
  code_hash    VARCHAR(255) NOT NULL,
  purpose      VARCHAR(20)  NOT NULL,
  expires_at   TIMESTAMPTZ  NOT NULL,
  attempts     INTEGER      NOT NULL DEFAULT 0,
  verified_at  TIMESTAMPTZ,
  consumed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  DEFAULT NOW()
);
-- Lookup pattern: WHERE email = ? AND purpose = ? AND consumed_at IS NULL
-- (issueOtp delete + verifyOtp / consumeVerifiedOtp select).
CREATE INDEX idx_student_signup_otps_email_purpose
  ON student_signup_otps (email, purpose);
CREATE TRIGGER trg_student_signup_otps_updated_at BEFORE UPDATE ON student_signup_otps
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── student_health_records ───────────────────────────────────────────────
-- BMI history. Ported from legacy MySQL `student_health_records` (see
-- migrations/_mysql_archive/001_baseline_schema.sql). Inserted by
-- POST /api/student/bmi; listed by GET /api/student/bmi.
CREATE TABLE student_health_records (
  id           BIGSERIAL PRIMARY KEY,
  student_id   BIGINT REFERENCES students(id) ON DELETE CASCADE,
  height_cm    DECIMAL(5,2) NOT NULL,
  weight_kg    DECIMAL(5,2) NOT NULL,
  bmi          DECIMAL(5,2) NOT NULL,
  record_date  DATE NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_student_health_records_student_id
  ON student_health_records (student_id);
CREATE TRIGGER trg_student_health_records_updated_at BEFORE UPDATE ON student_health_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
