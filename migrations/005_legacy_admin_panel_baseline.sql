-- ============================================================================
-- Migration: 005_legacy_admin_panel_baseline.sql
-- Description: Ports the legacy admin_panel / D2C (direct-to-consumer student)
--              tables from migrations/_mysql_archive/001_baseline_schema.sql
--              that were intentionally skipped in the current PG baseline
--              (which only covered tables partners-portal queries).
--
--              These tables back legacy student-portal pages: workshops,
--              doctor consultations, lab reports, diet plans, courses,
--              certificates, advice requests, performance metrics,
--              teacher feedback, exam report cards, etc.
--
--              Source: every CREATE TABLE in _mysql_archive/001 that is
--              NOT already in 001_baseline_schema.sql, EXCLUDING Laravel
--              infrastructure (failed_jobs, migrations, password_resets,
--              personal_access_tokens, sessions, permissions).
--
-- Conventions: BIGSERIAL ids, TIMESTAMPTZ created_at/updated_at, JSONB for
--              JSON columns, set_updated_at() trigger on every table with
--              an updated_at column, indexes recreated from MySQL KEYs.
-- Created: 2026-05-04
-- ============================================================================

-- (no new ENUM types — legacy enum columns are ported as VARCHAR + CHECK
--  since the values may evolve in this admin_panel/D2C surface area)

-- ============================================================================
-- Tables (in topological order: referenced before referencing)
-- ============================================================================

-- ─── addons ─────────────────────────────────────────────────────────────────
CREATE TABLE addons (
  id          BIGSERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  price       DECIMAL(10,2) NOT NULL,
  features    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_addons_updated_at BEFORE UPDATE ON addons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── advice_requests ───────────────────────────────────────────────────────
CREATE TABLE advice_requests (
  id              BIGSERIAL PRIMARY KEY,
  student_id      BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  consultant_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preferred_time  TIMESTAMPTZ,
  message         TEXT,
  feedback        TEXT,
  file_path       VARCHAR(255),
  status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_advice_requests_student_id    ON advice_requests (student_id);
CREATE INDEX idx_advice_requests_consultant_id ON advice_requests (consultant_id);
CREATE TRIGGER trg_advice_requests_updated_at BEFORE UPDATE ON advice_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── appointment_test_reminders ────────────────────────────────────────────
CREATE TABLE appointment_test_reminders (
  id                BIGSERIAL PRIMARY KEY,
  student_id        BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title             VARCHAR(255) NOT NULL,
  appointment_date  DATE NOT NULL,
  appointment_time  TIME NOT NULL,
  description       TEXT,
  status            VARCHAR(20) DEFAULT 'pending'
                      CHECK (status IN ('pending', 'completed', 'cancelled')),
  file_path         VARCHAR(255),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_appointment_test_reminders_student_id
  ON appointment_test_reminders (student_id);
CREATE TRIGGER trg_appointment_test_reminders_updated_at
  BEFORE UPDATE ON appointment_test_reminders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── assignments ───────────────────────────────────────────────────────────
CREATE TABLE assignments (
  id                  BIGSERIAL PRIMARY KEY,
  student_id          BIGINT NOT NULL,
  title               VARCHAR(255) NOT NULL,
  description         TEXT,
  assignment_link     VARCHAR(255),
  assignment_category VARCHAR(255),
  deadline            DATE,
  status              VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'deactive')),
  assignment_status   VARCHAR(20)
                        CHECK (assignment_status IS NULL
                               OR assignment_status IN ('pending', 'submitted', 'approved', 'rejected')),
  marks_obtained      VARCHAR(100),
  total_marks         VARCHAR(100),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  created_by          BIGINT REFERENCES users(id) ON DELETE SET NULL,
  quiz_for            VARCHAR(100) NOT NULL DEFAULT 'quiz',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_assignments_created_by ON assignments (created_by);
CREATE TRIGGER trg_assignments_updated_at BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── certificates ──────────────────────────────────────────────────────────
CREATE TABLE certificates (
  id                BIGSERIAL PRIMARY KEY,
  title             VARCHAR(255) NOT NULL,
  student_id        BIGINT NOT NULL,
  consultant_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  certificate_file  VARCHAR(255) NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_certificates_consultant_id ON certificates (consultant_id);
CREATE TRIGGER trg_certificates_updated_at BEFORE UPDATE ON certificates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── chat_files ────────────────────────────────────────────────────────────
CREATE TABLE chat_files (
  id          BIGSERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_chat_files_updated_at BEFORE UPDATE ON chat_files
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── class_bookings ────────────────────────────────────────────────────────
-- NOTE: legacy MySQL FK on teacher_id pointed to a `teacher_profiles` table
-- that doesn't exist in the current PG schema; the FK is dropped here and
-- teacher_id is kept as a plain BIGINT.
CREATE TABLE class_bookings (
  id          BIGSERIAL PRIMARY KEY,
  student_id  BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id  BIGINT NOT NULL,
  class_date  DATE NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_class_bookings_student_id ON class_bookings (student_id);
CREATE INDEX idx_class_bookings_teacher_id ON class_bookings (teacher_id);
CREATE TRIGGER trg_class_bookings_updated_at BEFORE UPDATE ON class_bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── complaints ────────────────────────────────────────────────────────────
CREATE TABLE complaints (
  id             BIGSERIAL PRIMARY KEY,
  teacher_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  partner_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  consultant_id  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  title          VARCHAR(255) NOT NULL,
  description    TEXT,
  file_path      VARCHAR(255),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_complaints_teacher_id    ON complaints (teacher_id);
CREATE INDEX idx_complaints_consultant_id ON complaints (consultant_id);
CREATE INDEX idx_complaints_partner_id    ON complaints (partner_id);
CREATE TRIGGER trg_complaints_updated_at BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── consultant_student ────────────────────────────────────────────────────
CREATE TABLE consultant_student (
  id              BIGSERIAL PRIMARY KEY,
  student_id      BIGINT NOT NULL,
  consultant_id   BIGINT NOT NULL,
  subscription_id BIGINT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_consultant_student_updated_at BEFORE UPDATE ON consultant_student
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── consultent_student_documents (legacy spelling preserved) ──────────────
CREATE TABLE consultent_student_documents (
  id                BIGSERIAL PRIMARY KEY,
  subscriptions_id  BIGINT NOT NULL,
  title             VARCHAR(255) NOT NULL,
  description       TEXT,
  documents         JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  is_published      BOOLEAN DEFAULT FALSE,
  consultant_id     BIGINT NOT NULL,
  student_id        BIGINT
);
CREATE TRIGGER trg_consultent_student_documents_updated_at
  BEFORE UPDATE ON consultent_student_documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── contact_messages ──────────────────────────────────────────────────────
CREATE TABLE contact_messages (
  id          BIGSERIAL PRIMARY KEY,
  full_name   VARCHAR(150) NOT NULL,
  email       VARCHAR(150) NOT NULL,
  phone       VARCHAR(50),
  user_type   VARCHAR(50) NOT NULL,
  subject     VARCHAR(255) NOT NULL,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── courses ───────────────────────────────────────────────────────────────
CREATE TABLE courses (
  id              BIGSERIAL PRIMARY KEY,
  title           VARCHAR(255) NOT NULL,
  slug            VARCHAR(255) NOT NULL UNIQUE,
  created_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
  class_id        BIGINT REFERENCES classes(id) ON DELETE SET NULL,
  description     TEXT,
  price           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  duration_hours  INTEGER,
  level           VARCHAR(255) NOT NULL DEFAULT 'beginner',
  image           VARCHAR(255),
  video_old       VARCHAR(255),
  videos          JSONB,
  documents       JSONB,
  is_published    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  type_of_course  VARCHAR(255)
);
CREATE INDEX idx_courses_class_id   ON courses (class_id);
CREATE INDEX idx_courses_created_by ON courses (created_by);
CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── course_feedback ───────────────────────────────────────────────────────
CREATE TABLE course_feedback (
  id          BIGSERIAL PRIMARY KEY,
  student_id  BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id   BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  rating      SMALLINT NOT NULL,
  feedback    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, course_id)
);
CREATE INDEX idx_course_feedback_course_id ON course_feedback (course_id);
CREATE TRIGGER trg_course_feedback_updated_at BEFORE UPDATE ON course_feedback
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── diet_plan ─────────────────────────────────────────────────────────────
CREATE TABLE diet_plan (
  id            BIGSERIAL PRIMARY KEY,
  student_id    BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  shared_by_id  BIGINT NOT NULL,
  title         VARCHAR(255) NOT NULL,
  share_date    DATE NOT NULL,
  file_path     VARCHAR(500),
  valid_upto    DATE NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  description   TEXT
);
CREATE INDEX idx_diet_plan_student_id ON diet_plan (student_id);
CREATE TRIGGER trg_diet_plan_updated_at BEFORE UPDATE ON diet_plan
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── doctor_consultations ──────────────────────────────────────────────────
CREATE TABLE doctor_consultations (
  id            BIGSERIAL PRIMARY KEY,
  student_id    BIGINT NOT NULL,
  patient_name  VARCHAR(255) NOT NULL,
  problem       TEXT NOT NULL,
  doctor_name   VARCHAR(255),
  scheduled_at  TIMESTAMPTZ NOT NULL,
  symptoms      TEXT,
  status        VARCHAR(20) DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  feedback      TEXT,
  file_path     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_doctor_consultations_updated_at BEFORE UPDATE ON doctor_consultations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── exam_report_cards ─────────────────────────────────────────────────────
CREATE TABLE exam_report_cards (
  id              BIGSERIAL PRIMARY KEY,
  student_id      BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_by      BIGINT NOT NULL,
  exam            VARCHAR(100),
  exam_date       DATE,
  subject         VARCHAR(100),
  marks_obtained  INTEGER,
  max_marks       INTEGER,
  grade           VARCHAR(10),
  file_path       VARCHAR(255),
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_exam_report_cards_student_id ON exam_report_cards (student_id);
CREATE TRIGGER trg_exam_report_cards_updated_at BEFORE UPDATE ON exam_report_cards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── features ──────────────────────────────────────────────────────────────
CREATE TABLE features (
  id           BIGSERIAL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  description  TEXT,
  status       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_features_updated_at BEFORE UPDATE ON features
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── lab_reports ───────────────────────────────────────────────────────────
CREATE TABLE lab_reports (
  id            BIGSERIAL PRIMARY KEY,
  student_id    BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  shared_by_id  BIGINT NOT NULL,
  title         VARCHAR(255) NOT NULL,
  share_date    DATE NOT NULL,
  file_path     VARCHAR(500) NOT NULL,
  valid_upto    DATE NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  description   TEXT
);
CREATE INDEX idx_lab_reports_student_id ON lab_reports (student_id);
CREATE TRIGGER trg_lab_reports_updated_at BEFORE UPDATE ON lab_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── live_classes ──────────────────────────────────────────────────────────
CREATE TABLE live_classes (
  id                BIGSERIAL PRIMARY KEY,
  course_id         BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  title             VARCHAR(255) NOT NULL,
  description       TEXT,
  host_name         VARCHAR(255),
  student_ids       JSONB,
  consultant_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_type        VARCHAR(20) DEFAULT 'live'
                      CHECK (class_type IN ('live', 'on-demand')),
  start_time        TIMESTAMPTZ,
  duration_minutes  INTEGER,
  join_link         VARCHAR(500),
  status            VARCHAR(20) DEFAULT 'awaited'
                      CHECK (status IN ('awaited', 'ongoing', 'completed')),
  recording_url     VARCHAR(255),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_live_classes_course_id     ON live_classes (course_id);
CREATE INDEX idx_live_classes_consultant_id ON live_classes (consultant_id);
CREATE TRIGGER trg_live_classes_updated_at BEFORE UPDATE ON live_classes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── parent_call_summaries ─────────────────────────────────────────────────
-- NOTE: legacy MySQL had no AUTO_INCREMENT on id and no PRIMARY KEY. Adding
-- BIGSERIAL PRIMARY KEY here to match Postgres conventions.
CREATE TABLE parent_call_summaries (
  id             BIGSERIAL PRIMARY KEY,
  student_id     BIGINT NOT NULL,
  consultant_id  BIGINT NOT NULL,
  summary        TEXT,
  attachments    JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_parent_call_summaries_updated_at
  BEFORE UPDATE ON parent_call_summaries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── questionnaires ────────────────────────────────────────────────────────
CREATE TABLE questionnaires (
  id                 BIGSERIAL PRIMARY KEY,
  teacher_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_id         BIGINT REFERENCES users(id) ON DELETE CASCADE,
  student_id         BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  consultant_id      BIGINT REFERENCES users(id) ON DELETE SET NULL,
  title              VARCHAR(255) NOT NULL,
  description        TEXT,
  file_path          VARCHAR(255),
  status             VARCHAR(20) NOT NULL DEFAULT 'pending_review'
                       CHECK (status IN ('pending_review', 'approved', 'rejected', 'published')),
  consultant_remark  TEXT,
  type               VARCHAR(255),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_questionnaires_teacher_id    ON questionnaires (teacher_id);
CREATE INDEX idx_questionnaires_student_id    ON questionnaires (student_id);
CREATE INDEX idx_questionnaires_consultant_id ON questionnaires (consultant_id);
CREATE INDEX idx_questionnaires_partner_id    ON questionnaires (partner_id);
CREATE TRIGGER trg_questionnaires_updated_at BEFORE UPDATE ON questionnaires
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── student_academic_sessions ─────────────────────────────────────────────
CREATE TABLE student_academic_sessions (
  id                BIGSERIAL PRIMARY KEY,
  student_id        BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  partner_id        BIGINT REFERENCES users(id) ON DELETE SET NULL,
  class_id          BIGINT REFERENCES classes(id) ON DELETE SET NULL,
  section_id        BIGINT REFERENCES sections(id) ON DELETE SET NULL,
  consultant_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  teacher_id        BIGINT REFERENCES users(id) ON DELETE SET NULL,
  session_year      VARCHAR(20) NOT NULL,
  admission_number  VARCHAR(255),
  admission_date    DATE,
  roll_number       VARCHAR(255),
  start_date        DATE,
  end_date          DATE,
  remarks           TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sas_student_id    ON student_academic_sessions (student_id);
CREATE INDEX idx_sas_class_id      ON student_academic_sessions (class_id);
CREATE INDEX idx_sas_teacher_id    ON student_academic_sessions (teacher_id);
CREATE INDEX idx_sas_consultant_id ON student_academic_sessions (consultant_id);
CREATE INDEX idx_sas_section_id    ON student_academic_sessions (section_id);
CREATE INDEX idx_sas_partner_id    ON student_academic_sessions (partner_id);
CREATE TRIGGER trg_student_academic_sessions_updated_at
  BEFORE UPDATE ON student_academic_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── student_addons ────────────────────────────────────────────────────────
CREATE TABLE student_addons (
  id             BIGSERIAL PRIMARY KEY,
  student_id     BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  addon_id       BIGINT NOT NULL REFERENCES addons(id) ON DELETE CASCADE,
  purchase_date  DATE NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_student_addons_student_id ON student_addons (student_id);
CREATE INDEX idx_student_addons_addon_id   ON student_addons (addon_id);
CREATE TRIGGER trg_student_addons_updated_at BEFORE UPDATE ON student_addons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── student_change_timing ─────────────────────────────────────────────────
-- NOTE: legacy MySQL had `course_id` FK pointing to `plans(id)` (not
-- courses(id)) — preserved verbatim, despite the column name.
CREATE TABLE student_change_timing (
  id                    BIGSERIAL PRIMARY KEY,
  student_id            BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  consultant_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_id            BIGINT REFERENCES users(id) ON DELETE CASCADE,
  course_id             BIGINT REFERENCES plans(id) ON DELETE CASCADE,
  live_class_id         BIGINT REFERENCES live_classes(id) ON DELETE SET NULL,
  student_request_time  TIME,
  scheduled_time        TIME,
  description           TEXT,
  comment               TEXT,
  status                VARCHAR(100),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sct_student_id    ON student_change_timing (student_id);
CREATE INDEX idx_sct_consultant_id ON student_change_timing (consultant_id);
CREATE INDEX idx_sct_teacher_id    ON student_change_timing (teacher_id);
CREATE INDEX idx_sct_course_id     ON student_change_timing (course_id);
CREATE INDEX idx_sct_live_class_id ON student_change_timing (live_class_id);
CREATE TRIGGER trg_student_change_timing_updated_at
  BEFORE UPDATE ON student_change_timing
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── student_courses ───────────────────────────────────────────────────────
CREATE TABLE student_courses (
  id          BIGSERIAL PRIMARY KEY,
  student_id  BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id   BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, course_id)
);
CREATE INDEX idx_student_courses_course_id ON student_courses (course_id);
CREATE TRIGGER trg_student_courses_updated_at BEFORE UPDATE ON student_courses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── student_data_performances ─────────────────────────────────────────────
-- Wide rating table — every score is a SMALLINT 0..N (originally tinyint).
CREATE TABLE student_data_performances (
  id                       BIGSERIAL PRIMARY KEY,
  student_id               BIGINT,
  questionnaires_id        BIGINT NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
  academic_performance     SMALLINT,
  competition              SMALLINT,
  consistency              SMALLINT,
  test_preparedness        SMALLINT,
  class_engagement         SMALLINT,
  subject_understanding    SMALLINT,
  homework                 SMALLINT,
  grasping_ability         SMALLINT,
  retention_power          SMALLINT,
  conceptual_clarity       SMALLINT,
  attention_span           SMALLINT,
  learning_speed           SMALLINT,
  peer_interaction         SMALLINT,
  discipline               SMALLINT,
  respect_for_authority    SMALLINT,
  motivation_level         SMALLINT,
  response_to_feedback     SMALLINT,
  stamina                  SMALLINT,
  participation_in_sports  SMALLINT,
  teamwork_in_games        SMALLINT,
  fitness_level            SMALLINT,
  interest_in_activities   SMALLINT,
  initiative_in_projects   SMALLINT,
  curiosity_level          SMALLINT,
  problem_solving          SMALLINT,
  extra_curricular         SMALLINT,
  idea_generation          SMALLINT,
  maths                    SMALLINT,
  science                  SMALLINT,
  english                  SMALLINT,
  social_studies           SMALLINT,
  computer_science         SMALLINT,
  suggestions              TEXT,
  attachment_path          VARCHAR(255),
  type                     VARCHAR(255),
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sdp_questionnaires_id ON student_data_performances (questionnaires_id);
CREATE TRIGGER trg_student_data_performances_updated_at
  BEFORE UPDATE ON student_data_performances
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── teacher_availabilities ────────────────────────────────────────────────
-- NOTE: legacy MySQL had no AUTO_INCREMENT and no PRIMARY KEY on id. Adding
-- BIGSERIAL PRIMARY KEY here to match Postgres conventions.
CREATE TABLE teacher_availabilities (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week  SMALLINT NOT NULL,
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_teacher_availabilities_user_id ON teacher_availabilities (user_id);
CREATE TRIGGER trg_teacher_availabilities_updated_at
  BEFORE UPDATE ON teacher_availabilities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── teacher_feedbacks ─────────────────────────────────────────────────────
CREATE TABLE teacher_feedbacks (
  id           BIGSERIAL PRIMARY KEY,
  subject      VARCHAR(255) NOT NULL,
  feedback     TEXT NOT NULL,
  attachments  VARCHAR(255),
  created_by   BIGINT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  student_id   BIGINT
);
CREATE INDEX idx_teacher_feedbacks_created_by ON teacher_feedbacks (created_by);
CREATE INDEX idx_teacher_feedbacks_student_id ON teacher_feedbacks (student_id);
CREATE TRIGGER trg_teacher_feedbacks_updated_at BEFORE UPDATE ON teacher_feedbacks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── workshop_webinar_calendar ─────────────────────────────────────────────
CREATE TABLE workshop_webinar_calendar (
  id           BIGSERIAL PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  student_id   BIGINT,
  start_date   DATE NOT NULL,
  join_link    VARCHAR(500),
  description  TEXT,
  created_by   BIGINT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_workshop_webinar_calendar_updated_at
  BEFORE UPDATE ON workshop_webinar_calendar
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
