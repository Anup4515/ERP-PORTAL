-- ============================================================================
-- Migration: 001_baseline_schema.sql  (Postgres edition)
-- Description: Baseline schema for the WiserWits Partners Portal, ported from
--              the MySQL `dev_db` baseline. Scope: every table the
--              partners-portal app actually queries (~36 tables). Legacy
--              admin_panel-only tables (assignments, courses, plans-extras,
--              consultant_*, etc.) are NOT recreated here — they live in the
--              admin_panel codebase's own port.
--
--              Conventions used throughout:
--                • partner_id columns reference users(id), per the erp_*
--                  convention. Two outliers — teachers.partner_id and
--                  student_subscriptions.payer_partner_id — reference
--                  partners(id). See SUPPORT_QUERIES_CONTRACT.md / earlier
--                  audit for the rationale.
--                • Every table with `updated_at` gets the shared
--                  set_updated_at() trigger, replacing MySQL's inline
--                  ON UPDATE CURRENT_TIMESTAMP semantics.
--                • ENUM types are real Postgres ENUMs created at the top so
--                  ALTER TYPE … ADD VALUE works for future extensions.
--                • JSON columns are JSONB (validates inline, indexable via GIN).
--                • TIMESTAMPTZ for created_at/updated_at, DATE for calendar
--                  dates — same shape as MySQL's behaviour after the
--                  recent-activity TZ fixes.
--
--              Backed-up MySQL versions live in migrations/_mysql_archive/.
-- Created: 2026-05-04
-- ============================================================================

-- ─── Shared updated_at trigger function ────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── ENUM types ────────────────────────────────────────────────────────────
-- Names mirror the column names where the enum is unique to one column,
-- otherwise carry a more general name. Adding values later: ALTER TYPE.
CREATE TYPE active_status               AS ENUM ('active', 'inactive');
CREATE TYPE partner_type                AS ENUM ('school', 'coaching', 'college', 'university', 'other');
CREATE TYPE partner_tier                AS ENUM ('free', 'paid');
CREATE TYPE attendance_status           AS ENUM ('present', 'absent', 'late', 'half_day');
CREATE TYPE attendance_method           AS ENUM ('daily', 'period_wise');
CREATE TYPE student_status              AS ENUM ('active', 'inactive', 'graduated', 'suspended');
CREATE TYPE enrollment_status           AS ENUM ('active', 'transferred', 'withdrawn', 'completed');
CREATE TYPE student_type                AS ENUM ('promoted', 'new', 'regular', 'lateral_entry', 'transfer', 'repeater');
CREATE TYPE exam_status                 AS ENUM ('upcoming', 'in_progress', 'completed');
CREATE TYPE exam_type                   AS ENUM ('other', 'unit_test', 'mid_term', 'final_annual');
CREATE TYPE grading_scheme_type         AS ENUM ('letter', 'gpa', 'percentage', 'cgpa');
CREATE TYPE holistic_stage              AS ENUM ('foundational', 'preparatory', 'middle', 'secondary');
CREATE TYPE timetable_slot_type         AS ENUM ('class', 'break', 'lunch', 'assembly');
CREATE TYPE timetable_day_of_week       AS ENUM ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday');
CREATE TYPE report_card_type            AS ENUM ('monthly', 'exam', 'annual');
CREATE TYPE audit_action                AS ENUM ('created', 'updated', 'deleted', 'viewed', 'exported', 'imported');
CREATE TYPE teacher_kind                AS ENUM ('school', 'freelancer');

-- ============================================================================
-- Tables (in topological order: referenced before referencing)
-- ============================================================================

-- ─── roles ──────────────────────────────────────────────────────────────────
CREATE TABLE roles (
  id          BIGSERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL UNIQUE,
  slug        VARCHAR(255) NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── users ──────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id                          BIGSERIAL PRIMARY KEY,
  name                        VARCHAR(255) NOT NULL,
  email                       VARCHAR(255) NOT NULL UNIQUE,
  email_verified_at           TIMESTAMPTZ,
  password                    VARCHAR(255) NOT NULL,
  two_factor_secret           TEXT,
  two_factor_recovery_codes   TEXT,
  two_factor_confirmed_at     TIMESTAMPTZ,
  remember_token              VARCHAR(100),
  current_team_id             BIGINT,
  profile_photo_path          VARCHAR(2048),
  phone_number                VARCHAR(100),
  role_id                     BIGINT REFERENCES roles(id) ON DELETE SET NULL,
  consultant_id               BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_by                  BIGINT,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_role_id        ON users (role_id);
CREATE INDEX idx_users_consultant_id  ON users (consultant_id);
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── partners ───────────────────────────────────────────────────────────────
CREATE TABLE partners (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  partner_type        partner_type NOT NULL DEFAULT 'school',
  partner_name        VARCHAR(255) NOT NULL,
  partner_code        VARCHAR(50) UNIQUE,
  contact_person      VARCHAR(255),
  contact_email       VARCHAR(255),
  contact_phone       VARCHAR(20),
  address             TEXT,
  city                VARCHAR(100),
  state               VARCHAR(100),
  country             VARCHAR(100),
  pincode             VARCHAR(20),
  registration_number VARCHAR(100),
  affiliated_board    VARCHAR(255),
  website             VARCHAR(255),
  logo                TEXT,                          -- legacy was VARCHAR(255); migration 009 widened it
  additional_info     JSONB,
  tier                partner_tier NOT NULL DEFAULT 'free',  -- migration 016
  default_plan_id     BIGINT,                        -- migration 016 / 017
  contract_ends_at    DATE,                          -- migration 016
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_partners_updated_at BEFORE UPDATE ON partners
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── teachers ───────────────────────────────────────────────────────────────
-- partner_id → partners(id) (legacy convention; one of the two outliers)
CREATE TABLE teachers (
  id                     BIGSERIAL PRIMARY KEY,
  user_id                BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_id             BIGINT REFERENCES partners(id) ON DELETE SET NULL,
  teacher_type           teacher_kind DEFAULT 'school',
  is_freelancer          BOOLEAN DEFAULT FALSE,
  subject_specialization VARCHAR(50),
  qualification          VARCHAR(255),
  experience             INTEGER,
  number_of_hours        INTEGER,
  bio                    TEXT,
  profile_image          VARCHAR(255),
  address                TEXT,
  date_of_joining        DATE,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_teachers_user_id    ON teachers (user_id);
CREATE INDEX idx_teachers_partner_id ON teachers (partner_id);
CREATE TRIGGER trg_teachers_updated_at BEFORE UPDATE ON teachers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── partner_staff ──────────────────────────────────────────────────────────
CREATE TABLE partner_staff (
  id              BIGSERIAL PRIMARY KEY,
  partner_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  designation     VARCHAR(100) NOT NULL,
  department      VARCHAR(100),
  phone           VARCHAR(20),
  email           VARCHAR(255),
  qualification   VARCHAR(255),
  experience      INTEGER,
  address         TEXT,
  status          active_status DEFAULT 'active',
  date_of_joining DATE,                              -- migration 008
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ps_partner ON partner_staff (partner_id);
CREATE TRIGGER trg_partner_staff_updated_at BEFORE UPDATE ON partner_staff
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── partner_teachers (legacy JSON-array bridge) ───────────────────────────
CREATE TABLE partner_teachers (
  id          SERIAL PRIMARY KEY,
  partner_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_ids JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_pt_partner_id ON partner_teachers (partner_id);
CREATE TRIGGER trg_partner_teachers_updated_at BEFORE UPDATE ON partner_teachers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── classes ────────────────────────────────────────────────────────────────
CREATE TABLE classes (
  id            BIGSERIAL PRIMARY KEY,
  partner_id    BIGINT REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  code          VARCHAR(255) UNIQUE,
  description   TEXT,
  grade_level   SMALLINT,
  display_order SMALLINT NOT NULL DEFAULT 0,
  status        active_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_classes_partner_id ON classes (partner_id);
CREATE TRIGGER trg_classes_updated_at BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── sections ───────────────────────────────────────────────────────────────
CREATE TABLE sections (
  id         BIGSERIAL PRIMARY KEY,
  class_id   BIGINT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name       VARCHAR(255) NOT NULL,
  room_no    VARCHAR(255),
  status     active_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sections_class_id ON sections (class_id);
CREATE TRIGGER trg_sections_updated_at BEFORE UPDATE ON sections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── students ───────────────────────────────────────────────────────────────
CREATE TABLE students (
  id              BIGSERIAL PRIMARY KEY,
  created_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
  consultant_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  first_name      VARCHAR(255) NOT NULL,
  last_name       VARCHAR(255) NOT NULL,
  middle_name     VARCHAR(255),
  gender          VARCHAR(10),
  date_of_birth   DATE,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password        VARCHAR(255),
  phone           VARCHAR(20),
  alternate_phone VARCHAR(20),
  address         VARCHAR(255),
  city            VARCHAR(255),
  state           VARCHAR(255),
  country         VARCHAR(255),
  postal_code     VARCHAR(20),
  father_name     VARCHAR(255),
  mother_name     VARCHAR(255),
  guardian_name   VARCHAR(255),
  guardian_phone  VARCHAR(20),
  guardian_email  VARCHAR(255),
  profile_image   VARCHAR(255),
  status          student_status NOT NULL DEFAULT 'active',
  height          VARCHAR(100),
  weight          VARCHAR(100),
  blood_group     VARCHAR(100),
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_students_created_by    ON students (created_by);
CREATE INDEX idx_students_consultant_id ON students (consultant_id);
CREATE TRIGGER trg_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── plans (student-subscription model) ────────────────────────────────────
CREATE TABLE plans (
  id             BIGSERIAL PRIMARY KEY,
  course_id      JSONB,
  name           VARCHAR(255) NOT NULL,
  price          DECIMAL(10,2) NOT NULL,
  duration_days  INTEGER NOT NULL,
  features       JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_plans_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- partners.default_plan_id can now be FK'd (deferred above to avoid cycle)
ALTER TABLE partners
  ADD CONSTRAINT fk_partners_default_plan
    FOREIGN KEY (default_plan_id) REFERENCES plans(id) ON DELETE SET NULL;

-- ─── student_subscriptions ─────────────────────────────────────────────────
-- payer_partner_id → partners(id) (the second legacy outlier)
CREATE TABLE student_subscriptions (
  id                BIGSERIAL PRIMARY KEY,
  student_id        BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  plan_id           BIGINT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  consultant_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  -- migration 017 added these
  status            VARCHAR(20) NOT NULL DEFAULT 'active',
  starts_at         TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  payer_type        VARCHAR(20) NOT NULL DEFAULT 'student',
  payer_partner_id  BIGINT REFERENCES partners(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_subs_student_id      ON student_subscriptions (student_id);
CREATE INDEX idx_subs_plan_id         ON student_subscriptions (plan_id);
CREATE INDEX idx_subs_payer_partner   ON student_subscriptions (payer_partner_id);
CREATE TRIGGER trg_subs_updated_at BEFORE UPDATE ON student_subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── erp_sessions ──────────────────────────────────────────────────────────
CREATE TABLE erp_sessions (
  id          BIGSERIAL PRIMARY KEY,
  partner_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(50) NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  is_current  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_erp_sessions_partner_name UNIQUE (partner_id, name)
);
CREATE INDEX idx_erp_sessions_partner ON erp_sessions (partner_id);
CREATE TRIGGER trg_erp_sessions_updated_at BEFORE UPDATE ON erp_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── erp_class_sections ────────────────────────────────────────────────────
CREATE TABLE erp_class_sections (
  id                 BIGSERIAL PRIMARY KEY,
  session_id         BIGINT NOT NULL REFERENCES erp_sessions(id) ON DELETE CASCADE,
  class_id           BIGINT NOT NULL REFERENCES classes(id)      ON DELETE CASCADE,
  section_id         BIGINT NOT NULL REFERENCES sections(id)     ON DELETE CASCADE,
  class_teacher_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  second_incharge_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  max_students       INTEGER NOT NULL DEFAULT 200,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_erp_class_sections UNIQUE (session_id, class_id, section_id)
);
CREATE INDEX idx_erp_cs_class    ON erp_class_sections (class_id);
CREATE INDEX idx_erp_cs_section  ON erp_class_sections (section_id);
CREATE INDEX idx_erp_cs_teacher  ON erp_class_sections (class_teacher_id);
CREATE INDEX idx_erp_cs_incharge ON erp_class_sections (second_incharge_id);
CREATE TRIGGER trg_erp_cs_updated_at BEFORE UPDATE ON erp_class_sections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── erp_subjects ──────────────────────────────────────────────────────────
CREATE TABLE erp_subjects (
  id               BIGSERIAL PRIMARY KEY,
  class_section_id BIGINT NOT NULL REFERENCES erp_class_sections(id) ON DELETE CASCADE,
  name             VARCHAR(100) NOT NULL,
  code             VARCHAR(20),
  teacher_id       BIGINT REFERENCES users(id) ON DELETE SET NULL,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_erp_subjects_section_name UNIQUE (class_section_id, name)
);
CREATE INDEX idx_erp_subjects_teacher ON erp_subjects (teacher_id);
CREATE TRIGGER trg_erp_subjects_updated_at BEFORE UPDATE ON erp_subjects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── erp_student_enrollments ───────────────────────────────────────────────
-- migration 005 + 006 baked in: partner_id (denormalised to users(id)) and
-- previous_enrollment_id (linked-list across sessions).
CREATE TABLE erp_student_enrollments (
  id                     BIGSERIAL PRIMARY KEY,
  student_id             BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_section_id       BIGINT NOT NULL REFERENCES erp_class_sections(id) ON DELETE CASCADE,
  partner_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  previous_enrollment_id BIGINT REFERENCES erp_student_enrollments(id) ON DELETE SET NULL,
  roll_number            INTEGER,
  student_type           student_type NOT NULL DEFAULT 'regular',
  enrollment_date        DATE,
  status                 enrollment_status NOT NULL DEFAULT 'active',
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_erp_enrollment_student_section UNIQUE (student_id, class_section_id),
  CONSTRAINT uq_erp_enrollment_section_roll    UNIQUE (class_section_id, roll_number)
);
CREATE INDEX idx_erp_enrollments_cs            ON erp_student_enrollments (class_section_id);
CREATE INDEX idx_erp_enrollments_partner       ON erp_student_enrollments (partner_id);
CREATE INDEX idx_enrollment_previous           ON erp_student_enrollments (previous_enrollment_id);
CREATE INDEX idx_enrollment_student_status     ON erp_student_enrollments (student_id, status);
CREATE TRIGGER trg_erp_enrollments_updated_at BEFORE UPDATE ON erp_student_enrollments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── erp_exams ─────────────────────────────────────────────────────────────
-- migration 005 added partner_id, 010+011 added/renamed exam_type
CREATE TABLE erp_exams (
  id               BIGSERIAL PRIMARY KEY,
  class_section_id BIGINT NOT NULL REFERENCES erp_class_sections(id) ON DELETE CASCADE,
  partner_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             VARCHAR(100) NOT NULL,
  code             VARCHAR(20),
  exam_type        exam_type NOT NULL DEFAULT 'other',
  start_date       DATE,
  end_date         DATE,
  status           exam_status NOT NULL DEFAULT 'upcoming',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_erp_exams_cs      ON erp_exams (class_section_id);
CREATE INDEX idx_erp_exams_partner ON erp_exams (partner_id);
CREATE TRIGGER trg_erp_exams_updated_at BEFORE UPDATE ON erp_exams
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── erp_exam_schedules ────────────────────────────────────────────────────
CREATE TABLE erp_exam_schedules (
  id               BIGSERIAL PRIMARY KEY,
  exam_id          BIGINT NOT NULL REFERENCES erp_exams(id)    ON DELETE CASCADE,
  subject_id       BIGINT NOT NULL REFERENCES erp_subjects(id) ON DELETE CASCADE,
  exam_date        DATE,
  exam_time        TIME,
  duration_minutes INTEGER,
  maximum_marks    DECIMAL(6,2) NOT NULL DEFAULT 100.00,
  room_number      VARCHAR(20),
  comment_1        VARCHAR(255),
  comment_2        VARCHAR(255),
  comment_3        VARCHAR(255),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_erp_exam_schedule UNIQUE (exam_id, subject_id)
);
CREATE INDEX idx_erp_exam_sched_subject ON erp_exam_schedules (subject_id);
CREATE TRIGGER trg_erp_exam_schedules_updated_at BEFORE UPDATE ON erp_exam_schedules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── erp_marks ─────────────────────────────────────────────────────────────
CREATE TABLE erp_marks (
  id                    BIGSERIAL PRIMARY KEY,
  exam_id               BIGINT NOT NULL REFERENCES erp_exams(id)               ON DELETE CASCADE,
  subject_id            BIGINT NOT NULL REFERENCES erp_subjects(id)            ON DELETE CASCADE,
  student_enrollment_id BIGINT NOT NULL REFERENCES erp_student_enrollments(id) ON DELETE CASCADE,
  maximum_marks         DECIMAL(6,2) NOT NULL,
  obtained_marks        DECIMAL(6,2),
  is_absent             BOOLEAN NOT NULL DEFAULT FALSE,
  percentage            DECIMAL(5,2),
  grade                 VARCHAR(10),
  entered_by            BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_erp_marks UNIQUE (exam_id, subject_id, student_enrollment_id)
);
CREATE INDEX idx_erp_marks_subject    ON erp_marks (subject_id);
CREATE INDEX idx_erp_marks_enrollment ON erp_marks (student_enrollment_id);
CREATE INDEX idx_erp_marks_entered_by ON erp_marks (entered_by);
CREATE TRIGGER trg_erp_marks_updated_at BEFORE UPDATE ON erp_marks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── erp_attendance_records ────────────────────────────────────────────────
CREATE TABLE erp_attendance_records (
  id                    BIGSERIAL PRIMARY KEY,
  student_enrollment_id BIGINT NOT NULL REFERENCES erp_student_enrollments(id) ON DELETE CASCADE,
  date                  DATE NOT NULL,
  status                attendance_status NOT NULL,
  remarks               VARCHAR(255),
  marked_by             BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_erp_attendance UNIQUE (student_enrollment_id, date)
);
CREATE INDEX idx_erp_attendance_date      ON erp_attendance_records (date);
CREATE INDEX idx_erp_attendance_marked_by ON erp_attendance_records (marked_by);
CREATE TRIGGER trg_erp_attendance_updated_at BEFORE UPDATE ON erp_attendance_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── erp_calendar_days ─────────────────────────────────────────────────────
CREATE TABLE erp_calendar_days (
  id                  BIGSERIAL PRIMARY KEY,
  session_id          BIGINT NOT NULL REFERENCES erp_sessions(id) ON DELETE CASCADE,
  date                DATE NOT NULL,
  day_of_week         VARCHAR(10),
  is_holiday          BOOLEAN NOT NULL DEFAULT FALSE,
  is_working_saturday BOOLEAN NOT NULL DEFAULT FALSE,
  holiday_reason      VARCHAR(255),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_session_date UNIQUE (session_id, date)
);
CREATE INDEX idx_cd_date ON erp_calendar_days (date);
CREATE TRIGGER trg_erp_calendar_days_updated_at BEFORE UPDATE ON erp_calendar_days
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── erp_grading_schemes / ranges ──────────────────────────────────────────
CREATE TABLE erp_grading_schemes (
  id          BIGSERIAL PRIMARY KEY,
  partner_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id  BIGINT REFERENCES erp_sessions(id) ON DELETE SET NULL,
  name        VARCHAR(100) NOT NULL,
  type        grading_scheme_type NOT NULL DEFAULT 'letter',
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_erp_grading_partner ON erp_grading_schemes (partner_id);
CREATE INDEX idx_erp_grading_session ON erp_grading_schemes (session_id);
CREATE TRIGGER trg_erp_grading_schemes_updated_at BEFORE UPDATE ON erp_grading_schemes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE erp_grading_ranges (
  id                BIGSERIAL PRIMARY KEY,
  grading_scheme_id BIGINT NOT NULL REFERENCES erp_grading_schemes(id) ON DELETE CASCADE,
  grade_label       VARCHAR(10) NOT NULL,
  min_percentage    DECIMAL(5,2) NOT NULL,
  max_percentage    DECIMAL(5,2) NOT NULL,
  gpa_value         DECIMAL(4,2),
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_erp_ranges_scheme ON erp_grading_ranges (grading_scheme_id);
CREATE TRIGGER trg_erp_grading_ranges_updated_at BEFORE UPDATE ON erp_grading_ranges
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── erp_configurations ────────────────────────────────────────────────────
CREATE TABLE erp_configurations (
  id                BIGSERIAL PRIMARY KEY,
  partner_id        BIGINT NOT NULL REFERENCES users(id)        ON DELETE CASCADE,
  session_id        BIGINT NOT NULL REFERENCES erp_sessions(id) ON DELETE CASCADE,
  grading_scheme_id BIGINT REFERENCES erp_grading_schemes(id)   ON DELETE SET NULL,
  max_subjects      INTEGER NOT NULL DEFAULT 15,
  max_exams         INTEGER NOT NULL DEFAULT 20,
  max_parameters    INTEGER NOT NULL DEFAULT 6,
  attendance_method attendance_method NOT NULL DEFAULT 'daily',
  start_month       SMALLINT NOT NULL DEFAULT 3,
  marks_threshold   DECIMAL(5,2),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_erp_config UNIQUE (partner_id, session_id)
);
CREATE INDEX idx_erp_config_session ON erp_configurations (session_id);
CREATE INDEX idx_erp_config_grading ON erp_configurations (grading_scheme_id);
CREATE TRIGGER trg_erp_configurations_updated_at BEFORE UPDATE ON erp_configurations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── erp_holistic_parameters / sub-parameters / mappings / ratings ────────
CREATE TABLE erp_holistic_parameters (
  id          BIGSERIAL PRIMARY KEY,
  partner_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  stage       holistic_stage,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_erp_params_partner ON erp_holistic_parameters (partner_id);
CREATE TRIGGER trg_erp_holistic_params_updated_at BEFORE UPDATE ON erp_holistic_parameters
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE erp_holistic_sub_parameters (
  id           BIGSERIAL PRIMARY KEY,
  parameter_id BIGINT NOT NULL REFERENCES erp_holistic_parameters(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_erp_sub_params ON erp_holistic_sub_parameters (parameter_id);
CREATE TRIGGER trg_erp_holistic_subs_updated_at BEFORE UPDATE ON erp_holistic_sub_parameters
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE erp_parameter_stage_mappings (
  id                BIGSERIAL PRIMARY KEY,
  sub_parameter_id  BIGINT NOT NULL REFERENCES erp_holistic_sub_parameters(id) ON DELETE CASCADE,
  stage             holistic_stage NOT NULL,
  grade_range_start INTEGER,
  grade_range_end   INTEGER,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_erp_stage_map_sub_param ON erp_parameter_stage_mappings (sub_parameter_id);
CREATE INDEX idx_erp_stage_map_stage     ON erp_parameter_stage_mappings (stage);
CREATE TRIGGER trg_erp_stage_mappings_updated_at BEFORE UPDATE ON erp_parameter_stage_mappings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE erp_holistic_ratings (
  id                    BIGSERIAL PRIMARY KEY,
  student_enrollment_id BIGINT NOT NULL REFERENCES erp_student_enrollments(id) ON DELETE CASCADE,
  sub_parameter_id      BIGINT NOT NULL REFERENCES erp_holistic_sub_parameters(id) ON DELETE CASCADE,
  month                 DATE NOT NULL,
  rating_value          DECIMAL(5,2),
  max_rating            DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  rating_grade          VARCHAR(10),
  comments              TEXT,
  rated_by              BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_erp_rating UNIQUE (student_enrollment_id, sub_parameter_id, month)
);
CREATE INDEX idx_erp_ratings_sub_param ON erp_holistic_ratings (sub_parameter_id);
CREATE INDEX idx_erp_ratings_month     ON erp_holistic_ratings (student_enrollment_id, month);
CREATE INDEX idx_erp_ratings_rated_by  ON erp_holistic_ratings (rated_by);
CREATE TRIGGER trg_erp_holistic_ratings_updated_at BEFORE UPDATE ON erp_holistic_ratings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── erp_reflection_prompts / student reflections ─────────────────────────
CREATE TABLE erp_reflection_prompts (
  id              BIGSERIAL PRIMARY KEY,
  stage           holistic_stage NOT NULL,
  prompt_text     TEXT NOT NULL,
  response_format VARCHAR(50),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_erp_prompts_stage ON erp_reflection_prompts (stage);
CREATE TRIGGER trg_erp_reflection_prompts_updated_at BEFORE UPDATE ON erp_reflection_prompts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE erp_student_reflections (
  id                    BIGSERIAL PRIMARY KEY,
  student_enrollment_id BIGINT NOT NULL REFERENCES erp_student_enrollments(id) ON DELETE CASCADE,
  reflection_prompt_id  BIGINT NOT NULL REFERENCES erp_reflection_prompts(id)  ON DELETE CASCADE,
  month                 DATE NOT NULL,
  response_text         TEXT,
  response_file_path    VARCHAR(500),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_erp_reflections_enrollment ON erp_student_reflections (student_enrollment_id);
CREATE INDEX idx_erp_reflections_prompt     ON erp_student_reflections (reflection_prompt_id);
CREATE INDEX idx_erp_reflections_month      ON erp_student_reflections (student_enrollment_id, month);
CREATE TRIGGER trg_erp_student_reflections_updated_at BEFORE UPDATE ON erp_student_reflections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── erp_timetable ─────────────────────────────────────────────────────────
CREATE TABLE erp_timetable_config (
  id            BIGSERIAL PRIMARY KEY,
  partner_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_number INTEGER NOT NULL,
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  slot_type     timetable_slot_type NOT NULL DEFAULT 'class',
  label         VARCHAR(50) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_partner_period UNIQUE (partner_id, period_number)
);
CREATE TRIGGER trg_erp_timetable_config_updated_at BEFORE UPDATE ON erp_timetable_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE erp_timetable_slots (
  id               BIGSERIAL PRIMARY KEY,
  class_section_id BIGINT NOT NULL REFERENCES erp_class_sections(id) ON DELETE CASCADE,
  day_of_week      timetable_day_of_week NOT NULL,
  period_number    INTEGER NOT NULL,
  subject_id       BIGINT REFERENCES erp_subjects(id) ON DELETE SET NULL,
  teacher_id       BIGINT REFERENCES users(id)        ON DELETE SET NULL,
  staff_id         BIGINT REFERENCES partner_staff(id) ON DELETE SET NULL,
  room_number      VARCHAR(20),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_cs_day_period UNIQUE (class_section_id, day_of_week, period_number)
);
CREATE INDEX idx_teacher_day_period ON erp_timetable_slots (teacher_id, day_of_week, period_number);
CREATE TRIGGER trg_erp_timetable_slots_updated_at BEFORE UPDATE ON erp_timetable_slots
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── erp_audit_logs ────────────────────────────────────────────────────────
CREATE TABLE erp_audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  partner_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action      audit_action NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id   BIGINT NOT NULL,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  VARCHAR(45),
  user_agent  VARCHAR(500),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_erp_audit_partner ON erp_audit_logs (partner_id);
CREATE INDEX idx_erp_audit_user    ON erp_audit_logs (user_id);
CREATE INDEX idx_erp_audit_entity  ON erp_audit_logs (entity_type, entity_id);
CREATE INDEX idx_erp_audit_action  ON erp_audit_logs (action);
CREATE INDEX idx_erp_audit_created ON erp_audit_logs (created_at);

-- ─── erp_report_cards ──────────────────────────────────────────────────────
CREATE TABLE erp_report_cards (
  id                    BIGSERIAL PRIMARY KEY,
  student_enrollment_id BIGINT NOT NULL REFERENCES erp_student_enrollments(id) ON DELETE CASCADE,
  type                  report_card_type NOT NULL,
  reference_month       DATE,
  exam_id               BIGINT REFERENCES erp_exams(id) ON DELETE SET NULL,
  attendance_percentage DECIMAL(5,2),
  overall_percentage    DECIMAL(5,2),
  overall_grade         VARCHAR(10),
  rank_in_class         INTEGER,
  teacher_remarks       TEXT,
  pdf_url               TEXT,
  generated_by          BIGINT REFERENCES users(id) ON DELETE SET NULL,
  generated_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_erp_reports_enrollment   ON erp_report_cards (student_enrollment_id);
CREATE INDEX idx_erp_reports_exam         ON erp_report_cards (exam_id);
CREATE INDEX idx_erp_reports_generated_by ON erp_report_cards (generated_by);
CREATE TRIGGER trg_erp_report_cards_updated_at BEFORE UPDATE ON erp_report_cards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── erp_chat_threads / erp_chat_messages (migration 012) ─────────────────
CREATE TABLE erp_chat_threads (
  id                   BIGSERIAL PRIMARY KEY,
  partner_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_a_id            BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id            BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_at      TIMESTAMPTZ,
  last_message_preview VARCHAR(255),
  last_sender_id       BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uniq_partner_pair UNIQUE (partner_id, user_a_id, user_b_id),
  CONSTRAINT chk_chat_pair_ordered CHECK (user_a_id < user_b_id)
);
CREATE INDEX idx_user_a ON erp_chat_threads (partner_id, user_a_id, last_message_at);
CREATE INDEX idx_user_b ON erp_chat_threads (partner_id, user_b_id, last_message_at);
CREATE TRIGGER trg_erp_chat_threads_updated_at BEFORE UPDATE ON erp_chat_threads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE erp_chat_messages (
  id          BIGSERIAL PRIMARY KEY,
  thread_id   BIGINT NOT NULL REFERENCES erp_chat_threads(id) ON DELETE CASCADE,
  sender_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_thread_created ON erp_chat_messages (thread_id, id);
CREATE INDEX idx_sender         ON erp_chat_messages (sender_id);
CREATE TRIGGER trg_erp_chat_messages_updated_at BEFORE UPDATE ON erp_chat_messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── chats (legacy admin_panel messaging — kept for compatibility) ────────
-- migration 015 added read_at.
CREATE TABLE chats (
  id          BIGSERIAL PRIMARY KEY,
  sender_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(255),
  description TEXT,
  path        VARCHAR(255),
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_chats_receiver_id        ON chats (receiver_id);
CREATE INDEX idx_chats_sender_receiver    ON chats (sender_id, receiver_id);
CREATE TRIGGER trg_chats_updated_at BEFORE UPDATE ON chats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── default_holistic_templates (seed source) ──────────────────────────────
CREATE TABLE default_holistic_templates (
  id                       BIGSERIAL PRIMARY KEY,
  stage                    holistic_stage NOT NULL,
  parameter_name           VARCHAR(100) NOT NULL,
  parameter_sort_order     INTEGER NOT NULL DEFAULT 0,
  sub_parameter_name       VARCHAR(100) NOT NULL,
  sub_parameter_sort_order INTEGER NOT NULL DEFAULT 0,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_template_stage ON default_holistic_templates (stage);
CREATE TRIGGER trg_default_holistic_templates_updated_at BEFORE UPDATE ON default_holistic_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── partner_assignments (admin_panel handshake; migration 018) ────────────
CREATE TABLE partner_assignments (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  tier              partner_tier NOT NULL DEFAULT 'free',
  default_plan_id   BIGINT REFERENCES plans(id) ON DELETE SET NULL,
  contract_ends_at  DATE,
  created_by        BIGINT REFERENCES users(id) ON DELETE SET NULL,
  applied_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_partner_assignments_applied ON partner_assignments (applied_at);
CREATE TRIGGER trg_partner_assignments_updated_at BEFORE UPDATE ON partner_assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── erp_fee_structures / dues / payments (migration 019, 020 combined) ───
-- recurrence + monthly window fields baked into the baseline.
CREATE TABLE erp_fee_structures (
  id                BIGSERIAL PRIMARY KEY,
  partner_id        BIGINT NOT NULL REFERENCES users(id)        ON DELETE CASCADE,
  session_id        BIGINT NOT NULL REFERENCES erp_sessions(id) ON DELETE CASCADE,
  class_section_id  BIGINT REFERENCES erp_class_sections(id)    ON DELETE CASCADE,
  name              VARCHAR(128) NOT NULL,
  fee_type          VARCHAR(64)  NOT NULL DEFAULT 'other',
  amount            DECIMAL(10,2) NOT NULL,
  recurrence        VARCHAR(16) NOT NULL DEFAULT 'one_time',  -- 'one_time' | 'monthly'
  due_date          DATE,
  start_month       DATE,
  end_month         DATE,
  due_day_of_month  SMALLINT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_fs_partner_session ON erp_fee_structures (partner_id, session_id);
CREATE INDEX idx_fs_class_section   ON erp_fee_structures (class_section_id);
CREATE TRIGGER trg_erp_fee_structures_updated_at BEFORE UPDATE ON erp_fee_structures
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE erp_fee_dues (
  id                    BIGSERIAL PRIMARY KEY,
  partner_id            BIGINT NOT NULL REFERENCES users(id)              ON DELETE CASCADE,
  structure_id          BIGINT NOT NULL REFERENCES erp_fee_structures(id) ON DELETE CASCADE,
  period_label          VARCHAR(16) NOT NULL DEFAULT '',
  student_enrollment_id BIGINT NOT NULL REFERENCES erp_student_enrollments(id) ON DELETE CASCADE,
  amount_due            DECIMAL(10,2) NOT NULL,
  amount_paid           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status                VARCHAR(16) NOT NULL DEFAULT 'pending',  -- pending|partial|paid|waived
  due_date              DATE,
  remarks               TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uk_due_per_enrollment_period UNIQUE (structure_id, student_enrollment_id, period_label)
);
CREATE INDEX idx_due_partner    ON erp_fee_dues (partner_id);
CREATE INDEX idx_due_enrollment ON erp_fee_dues (student_enrollment_id);
CREATE INDEX idx_due_status     ON erp_fee_dues (status);
CREATE TRIGGER trg_erp_fee_dues_updated_at BEFORE UPDATE ON erp_fee_dues
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE erp_fee_payments (
  id            BIGSERIAL PRIMARY KEY,
  partner_id    BIGINT NOT NULL REFERENCES users(id)        ON DELETE CASCADE,
  due_id        BIGINT NOT NULL REFERENCES erp_fee_dues(id) ON DELETE CASCADE,
  amount        DECIMAL(10,2) NOT NULL,
  paid_date     DATE NOT NULL,
  payment_mode  VARCHAR(32),
  reference_no  VARCHAR(64),
  remarks       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_pay_partner ON erp_fee_payments (partner_id);
CREATE INDEX idx_pay_due     ON erp_fee_payments (due_id);
CREATE INDEX idx_pay_date    ON erp_fee_payments (paid_date);

-- ─── erp_support_queries (migration 021) ───────────────────────────────────
CREATE TABLE erp_support_queries (
  id                   BIGSERIAL PRIMARY KEY,
  partner_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submitted_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category             VARCHAR(20) NOT NULL DEFAULT 'general',
  subject              VARCHAR(200) NOT NULL,
  message              TEXT NOT NULL,
  status               VARCHAR(20) NOT NULL DEFAULT 'open',
  resolution_note      TEXT,
  resolved_at          TIMESTAMPTZ,
  resolved_by_user_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_esq_partner_status ON erp_support_queries (partner_id, status, created_at);
CREATE INDEX idx_esq_status_created ON erp_support_queries (status, created_at);
CREATE TRIGGER trg_erp_support_queries_updated_at BEFORE UPDATE ON erp_support_queries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- Record this migration
-- ============================================================================
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('001', 'baseline_schema', NOW())
ON CONFLICT (version) DO UPDATE SET applied_at = NOW();
