
-- =============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================
-- 3.1  Rename `schools` → `partners` + add new columns
-- =============================================================

-- Drop existing FK
ALTER TABLE `schools` DROP FOREIGN KEY `schools_ibfk_1`;

-- Drop old index name
ALTER TABLE `schools` DROP INDEX `school_code`;

-- Rename the table
RENAME TABLE `schools` TO `partners`;

-- Rename columns: school_name → partner_name, school_code → partner_code
ALTER TABLE `partners`
  CHANGE COLUMN `school_name` `partner_name` VARCHAR(255) NOT NULL,
  CHANGE COLUMN `school_code` `partner_code` VARCHAR(50) DEFAULT NULL;

-- Add new columns for multi-institution support
ALTER TABLE `partners`
  ADD COLUMN `partner_type` ENUM('school','coaching','college','university','other') NOT NULL DEFAULT 'school' AFTER `user_id`,
  ADD COLUMN `registration_number` VARCHAR(100) DEFAULT NULL AFTER `pincode`,
  ADD COLUMN `affiliated_board` VARCHAR(255) DEFAULT NULL AFTER `registration_number`;

-- Recreate unique index + FK with new names
ALTER TABLE `partners`
  ADD UNIQUE KEY `partner_code_unique` (`partner_code`),
  ADD CONSTRAINT `fk_partners_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;


-- =============================================================
-- 3.2  Rename school_id → partner_id in `student_academic_sessions`
-- =============================================================
-- After Phase 1, only `fk_school_user` (ON DELETE SET NULL) remains;
-- `student_academic_sessions_ibfk_2` (conflicting CASCADE) was dropped.

ALTER TABLE `student_academic_sessions`
  DROP FOREIGN KEY `fk_school_user`;

ALTER TABLE `student_academic_sessions`
  DROP INDEX `fk_school_user`;

ALTER TABLE `student_academic_sessions`
  CHANGE COLUMN `school_id` `partner_id` BIGINT(20) UNSIGNED DEFAULT NULL;

ALTER TABLE `student_academic_sessions`
  ADD KEY `idx_sas_partner_id` (`partner_id`),
  ADD CONSTRAINT `fk_sas_partner` FOREIGN KEY (`partner_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;


-- =============================================================
-- 3.3  Rename school_id → partner_id in `teachers`
-- =============================================================
-- teachers.school_id currently FK → schools(id), which is now `partners`

ALTER TABLE `teachers`
  DROP FOREIGN KEY `teachers_ibfk_2`;

ALTER TABLE `teachers`
  DROP INDEX `school_id`;

ALTER TABLE `teachers`
  CHANGE COLUMN `school_id` `partner_id` BIGINT(20) UNSIGNED DEFAULT NULL;

ALTER TABLE `teachers`
  ADD KEY `idx_teachers_partner_id` (`partner_id`),
  ADD CONSTRAINT `fk_teachers_partner` FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`) ON DELETE SET NULL;


-- =============================================================
-- 3.4  Rename school_id → partner_id in `questionnaires`
-- =============================================================

ALTER TABLE `questionnaires`
  DROP FOREIGN KEY `questionnaires_school_id_foreign`;

ALTER TABLE `questionnaires`
  DROP INDEX `questionnaires_school_id_foreign`;

ALTER TABLE `questionnaires`
  CHANGE COLUMN `school_id` `partner_id` BIGINT(20) UNSIGNED DEFAULT NULL;

ALTER TABLE `questionnaires`
  ADD KEY `idx_questionnaires_partner_id` (`partner_id`),
  ADD CONSTRAINT `fk_questionnaires_partner` FOREIGN KEY (`partner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;


-- =============================================================
-- 3.5  Rename school_id → partner_id in `complaints`
--      (table was renamed from `complains` in Phase 2)
-- =============================================================

ALTER TABLE `complaints`
  DROP FOREIGN KEY `complains_school_id_foreign`;

ALTER TABLE `complaints`
  DROP INDEX `complains_school_id_foreign`;

ALTER TABLE `complaints`
  CHANGE COLUMN `school_id` `partner_id` BIGINT(20) UNSIGNED DEFAULT NULL;

ALTER TABLE `complaints`
  ADD KEY `idx_complaints_partner_id` (`partner_id`),
  ADD CONSTRAINT `fk_complaints_partner` FOREIGN KEY (`partner_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;


-- =============================================================
-- 3.6  Rename `school_teachers` → `partner_teachers`
--      + rename school_id → partner_id
--      (Phase 2 was not run; working with original table directly)
-- =============================================================

RENAME TABLE `school_teachers` TO `partner_teachers`;

ALTER TABLE `partner_teachers`
  CHANGE COLUMN `school_id` `partner_id` BIGINT(20) UNSIGNED NOT NULL;

ALTER TABLE `partner_teachers`
  ADD KEY `idx_pt_partner_id` (`partner_id`),
  ADD CONSTRAINT `fk_pt_partner` FOREIGN KEY (`partner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;


-- =============================================================
-- 3.7  Drop deprecated profile tables
--      Merge unique columns from teacher_details into teachers first
-- =============================================================

-- teacher_details has `number_of_hours` and `address` not present in teachers
ALTER TABLE `teachers`
  ADD COLUMN `number_of_hours` INT(11) DEFAULT NULL AFTER `experience`,
  ADD COLUMN `address` TEXT DEFAULT NULL AFTER `profile_image`;

-- Migrate data from teacher_details → teachers (by matching user_id)
UPDATE `teachers` t
  INNER JOIN `teacher_details` td ON t.user_id = td.user_id
SET
  t.number_of_hours = td.number_of_hours,
  t.address = td.address;

-- Now safe to drop all deprecated profile tables
DROP TABLE IF EXISTS `teacher_details`;
DROP TABLE IF EXISTS `teacher_profiles`;
DROP TABLE IF EXISTS `school_profiles`;
DROP TABLE IF EXISTS `consultant_profiles`;


-- =============================================================
-- 3.8  Scope `classes` to partner (multi-tenant isolation)
-- =============================================================

ALTER TABLE `classes`
  ADD COLUMN `partner_id` BIGINT(20) UNSIGNED DEFAULT NULL AFTER `id`,
  ADD COLUMN `grade_level` TINYINT UNSIGNED DEFAULT NULL COMMENT 'NEP stage mapping' AFTER `description`,
  ADD COLUMN `display_order` SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER `grade_level`;

ALTER TABLE `classes`
  ADD KEY `idx_classes_partner_id` (`partner_id`),
  ADD CONSTRAINT `fk_classes_partner` FOREIGN KEY (`partner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;


-- =============================================================
-- 3.9  Backfill classes.partner_id from student_academic_sessions
--      (best-effort: assign each class to the most common partner using it)
-- =============================================================

UPDATE `classes` c
  INNER JOIN (
    SELECT class_id, partner_id
    FROM `student_academic_sessions`
    WHERE partner_id IS NOT NULL
    GROUP BY class_id
    ORDER BY COUNT(*) DESC
  ) sas ON c.id = sas.class_id
SET c.partner_id = sas.partner_id
WHERE c.partner_id IS NULL;


SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================
-- Verification queries — run these after the migration
-- =============================================================

-- 1. Confirm `partners` table exists with new columns
DESCRIBE `partners`;

-- 2. Confirm partner_id columns exist in all 5 tables + classes
SELECT TABLE_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND COLUMN_NAME = 'partner_id';

-- 3. Confirm deprecated tables are gone
SHOW TABLES LIKE '%profile%';
SHOW TABLES LIKE 'teacher_details';

-- 4. Confirm FK constraints
SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND COLUMN_NAME = 'partner_id'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- 5. Check for orphan records
SELECT 'student_academic_sessions' AS tbl, COUNT(*) AS orphans
FROM student_academic_sessions sas
LEFT JOIN users u ON sas.partner_id = u.id
WHERE sas.partner_id IS NOT NULL AND u.id IS NULL;




SET FOREIGN_KEY_CHECKS = 0;
START TRANSACTION;

-- ============================================================================
-- 1. erp_sessions — Academic sessions (e.g., 2026-27)
-- ============================================================================

CREATE TABLE `erp_sessions` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `partner_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to users.id (partner account)',
  `name` varchar(50) NOT NULL COMMENT 'e.g., 2026-27',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `is_current` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_erp_sessions_partner_name` (`partner_id`, `name`),
  INDEX `idx_erp_sessions_partner` (`partner_id`),
  CONSTRAINT `fk_erp_sessions_partner`
    FOREIGN KEY (`partner_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. erp_class_sections — Central composite entity
-- ============================================================================
-- Ties a class + section to a session, with class teacher assignments.
-- This is the anchor for subjects, exams, calendar, and enrollments.
-- References existing classes and sections tables.
-- ============================================================================

CREATE TABLE `erp_class_sections` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `session_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to erp_sessions.id',
  `class_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to classes.id',
  `section_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to sections.id',
  `class_teacher_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'Primary class teacher',
  `second_incharge_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'Second in-charge',
  `max_students` int(11) NOT NULL DEFAULT 200,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_erp_class_sections` (`session_id`, `class_id`, `section_id`),
  INDEX `idx_erp_cs_class` (`class_id`),
  INDEX `idx_erp_cs_section` (`section_id`),
  INDEX `idx_erp_cs_teacher` (`class_teacher_id`),
  INDEX `idx_erp_cs_incharge` (`second_incharge_id`),
  CONSTRAINT `fk_erp_cs_session`
    FOREIGN KEY (`session_id`) REFERENCES `erp_sessions` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_cs_class`
    FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_cs_section`
    FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_cs_teacher`
    FOREIGN KEY (`class_teacher_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_cs_incharge`
    FOREIGN KEY (`second_incharge_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. erp_student_enrollments — Student ↔ class-section linkage
-- ============================================================================
-- Links a student to a class-section for a session with roll number,
-- student type, and enrollment status. References existing students table.
-- ============================================================================

CREATE TABLE `erp_student_enrollments` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to students.id',
  `class_section_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to erp_class_sections.id',
  `roll_number` int(11) DEFAULT NULL,
  `student_type` enum('promoted','new','regular','lateral_entry','transfer','repeater')
    NOT NULL DEFAULT 'regular',
  `enrollment_date` date DEFAULT NULL,
  `status` enum('active','transferred','withdrawn') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_erp_enrollment_student_section` (`student_id`, `class_section_id`),
  UNIQUE KEY `uq_erp_enrollment_section_roll` (`class_section_id`, `roll_number`),
  INDEX `idx_erp_enrollments_cs` (`class_section_id`),
  CONSTRAINT `fk_erp_enrollments_student`
    FOREIGN KEY (`student_id`) REFERENCES `students` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_enrollments_cs`
    FOREIGN KEY (`class_section_id`) REFERENCES `erp_class_sections` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. erp_subjects — Per class-section subjects
-- ============================================================================
-- Scoped to class_section so different sections of the same class can have
-- different teachers for the same subject.
-- ============================================================================

CREATE TABLE `erp_subjects` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `class_section_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to erp_class_sections.id',
  `name` varchar(100) NOT NULL,
  `code` varchar(20) DEFAULT NULL,
  `teacher_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to users.id (assigned teacher)',
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_erp_subjects_section_name` (`class_section_id`, `name`),
  INDEX `idx_erp_subjects_teacher` (`teacher_id`),
  CONSTRAINT `fk_erp_subjects_cs`
    FOREIGN KEY (`class_section_id`) REFERENCES `erp_class_sections` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_subjects_teacher`
    FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. erp_grading_schemes — Per partner, with type classification
-- ============================================================================

CREATE TABLE `erp_grading_schemes` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `partner_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to users.id (partner account)',
  `session_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'NULL = school-wide default',
  `name` varchar(100) NOT NULL,
  `type` enum('letter','gpa','percentage','cgpa') NOT NULL DEFAULT 'letter',
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_erp_grading_partner` (`partner_id`),
  INDEX `idx_erp_grading_session` (`session_id`),
  CONSTRAINT `fk_erp_grading_partner`
    FOREIGN KEY (`partner_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_grading_session`
    FOREIGN KEY (`session_id`) REFERENCES `erp_sessions` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. erp_grading_ranges — Grade definitions within a scheme
-- ============================================================================

CREATE TABLE `erp_grading_ranges` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `grading_scheme_id` bigint(20) UNSIGNED NOT NULL,
  `grade_label` varchar(10) NOT NULL COMMENT 'e.g., A+, A, B+',
  `min_percentage` decimal(5,2) NOT NULL,
  `max_percentage` decimal(5,2) NOT NULL,
  `gpa_value` decimal(4,2) DEFAULT NULL COMMENT 'GPA/CGPA equivalent',
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_erp_ranges_scheme` (`grading_scheme_id`),
  CONSTRAINT `fk_erp_ranges_scheme`
    FOREIGN KEY (`grading_scheme_id`) REFERENCES `erp_grading_schemes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 7. erp_configurations — Per partner, per session settings
-- ============================================================================

CREATE TABLE `erp_configurations` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `partner_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to users.id (partner account)',
  `session_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to erp_sessions.id',
  `grading_scheme_id` bigint(20) UNSIGNED DEFAULT NULL,
  `max_subjects` int(11) NOT NULL DEFAULT 15,
  `max_exams` int(11) NOT NULL DEFAULT 20,
  `max_parameters` int(11) NOT NULL DEFAULT 6,
  `attendance_method` enum('daily','period_wise') NOT NULL DEFAULT 'daily',
  `start_month` tinyint(2) UNSIGNED NOT NULL DEFAULT 3
    COMMENT 'Session start month (1=Jan, 3=Mar, 4=Apr)',
  `marks_threshold` decimal(5,2) DEFAULT NULL
    COMMENT 'Marks below this % are highlighted in reports (e.g., 33.00)',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_erp_config` (`partner_id`, `session_id`),
  INDEX `idx_erp_config_session` (`session_id`),
  INDEX `idx_erp_config_grading` (`grading_scheme_id`),
  CONSTRAINT `fk_erp_config_partner`
    FOREIGN KEY (`partner_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_config_session`
    FOREIGN KEY (`session_id`) REFERENCES `erp_sessions` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_config_grading`
    FOREIGN KEY (`grading_scheme_id`) REFERENCES `erp_grading_schemes` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 8. erp_calendar_days — Per class-section daily calendar
-- ============================================================================

CREATE TABLE `erp_calendar_days` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `class_section_id` bigint(20) UNSIGNED NOT NULL,
  `date` date NOT NULL,
  `day_of_week` varchar(10) DEFAULT NULL COMMENT 'Monday, Tuesday, etc.',
  `is_holiday` tinyint(1) NOT NULL DEFAULT 0,
  `is_working_saturday` tinyint(1) NOT NULL DEFAULT 0
    COMMENT '1 = this Saturday is a working day',
  `holiday_reason` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_erp_calendar` (`class_section_id`, `date`),
  INDEX `idx_erp_calendar_date` (`date`),
  CONSTRAINT `fk_erp_calendar_cs`
    FOREIGN KEY (`class_section_id`) REFERENCES `erp_class_sections` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 9. erp_attendance_records — Daily student attendance
-- ============================================================================

CREATE TABLE `erp_attendance_records` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_enrollment_id` bigint(20) UNSIGNED NOT NULL,
  `date` date NOT NULL,
  `status` enum('present','absent','late','half_day') NOT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  `marked_by` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to users.id',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_erp_attendance` (`student_enrollment_id`, `date`),
  INDEX `idx_erp_attendance_date` (`date`),
  INDEX `idx_erp_attendance_marked_by` (`marked_by`),
  CONSTRAINT `fk_erp_attendance_enrollment`
    FOREIGN KEY (`student_enrollment_id`) REFERENCES `erp_student_enrollments` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_attendance_marked_by`
    FOREIGN KEY (`marked_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 10. erp_exams — Exam definitions per class-section
-- ============================================================================

CREATE TABLE `erp_exams` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `class_section_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL COMMENT 'e.g., Unit Test 1, Mid-Term',
  `code` varchar(20) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('upcoming','in_progress','completed') NOT NULL DEFAULT 'upcoming',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_erp_exams_cs` (`class_section_id`),
  CONSTRAINT `fk_erp_exams_cs`
    FOREIGN KEY (`class_section_id`) REFERENCES `erp_class_sections` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 11. erp_exam_schedules — Per exam, per subject scheduling
-- ============================================================================

CREATE TABLE `erp_exam_schedules` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `exam_id` bigint(20) UNSIGNED NOT NULL,
  `subject_id` bigint(20) UNSIGNED NOT NULL,
  `exam_date` date DEFAULT NULL,
  `exam_time` time DEFAULT NULL,
  `duration_minutes` int(11) DEFAULT NULL,
  `maximum_marks` decimal(6,2) NOT NULL DEFAULT 100.00,
  `room_number` varchar(20) DEFAULT NULL,
  `comment_1` varchar(255) DEFAULT NULL,
  `comment_2` varchar(255) DEFAULT NULL,
  `comment_3` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_erp_exam_schedule` (`exam_id`, `subject_id`),
  INDEX `idx_erp_exam_sched_subject` (`subject_id`),
  CONSTRAINT `fk_erp_exam_sched_exam`
    FOREIGN KEY (`exam_id`) REFERENCES `erp_exams` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_exam_sched_subject`
    FOREIGN KEY (`subject_id`) REFERENCES `erp_subjects` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 12. erp_marks — Student exam marks per subject
-- ============================================================================

CREATE TABLE `erp_marks` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `exam_id` bigint(20) UNSIGNED NOT NULL,
  `subject_id` bigint(20) UNSIGNED NOT NULL,
  `student_enrollment_id` bigint(20) UNSIGNED NOT NULL,
  `maximum_marks` decimal(6,2) NOT NULL COMMENT 'Denormalized from erp_exam_schedules',
  `obtained_marks` decimal(6,2) DEFAULT NULL COMMENT 'NULL if absent',
  `is_absent` tinyint(1) NOT NULL DEFAULT 0,
  `percentage` decimal(5,2) DEFAULT NULL COMMENT 'Auto-computed by application',
  `grade` varchar(10) DEFAULT NULL COMMENT 'Auto-computed from grading scheme',
  `entered_by` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to users.id',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_erp_marks` (`exam_id`, `subject_id`, `student_enrollment_id`),
  INDEX `idx_erp_marks_subject` (`subject_id`),
  INDEX `idx_erp_marks_enrollment` (`student_enrollment_id`),
  INDEX `idx_erp_marks_entered_by` (`entered_by`),
  CONSTRAINT `fk_erp_marks_exam`
    FOREIGN KEY (`exam_id`) REFERENCES `erp_exams` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_marks_subject`
    FOREIGN KEY (`subject_id`) REFERENCES `erp_subjects` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_marks_enrollment`
    FOREIGN KEY (`student_enrollment_id`) REFERENCES `erp_student_enrollments` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_marks_entered_by`
    FOREIGN KEY (`entered_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 13. erp_holistic_parameters — Parameter categories per partner
-- ============================================================================

CREATE TABLE `erp_holistic_parameters` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `partner_id` bigint(20) UNSIGNED NOT NULL COMMENT 'FK to users.id (partner account)',
  `name` varchar(100) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_erp_params_partner` (`partner_id`),
  CONSTRAINT `fk_erp_params_partner`
    FOREIGN KEY (`partner_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 14. erp_holistic_sub_parameters
-- ============================================================================

CREATE TABLE `erp_holistic_sub_parameters` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `parameter_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_erp_sub_params` (`parameter_id`),
  CONSTRAINT `fk_erp_sub_params`
    FOREIGN KEY (`parameter_id`) REFERENCES `erp_holistic_parameters` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 15. erp_holistic_ratings — Monthly student ratings per sub-parameter
-- ============================================================================

CREATE TABLE `erp_holistic_ratings` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_enrollment_id` bigint(20) UNSIGNED NOT NULL,
  `sub_parameter_id` bigint(20) UNSIGNED NOT NULL,
  `month` date NOT NULL COMMENT 'First of month (e.g., 2026-03-01)',
  `rating_value` decimal(5,2) DEFAULT NULL,
  `max_rating` decimal(5,2) NOT NULL DEFAULT 10.00,
  `rating_grade` varchar(10) DEFAULT NULL,
  `comments` text DEFAULT NULL,
  `rated_by` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to users.id',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_erp_rating` (`student_enrollment_id`, `sub_parameter_id`, `month`),
  INDEX `idx_erp_ratings_sub_param` (`sub_parameter_id`),
  INDEX `idx_erp_ratings_month` (`student_enrollment_id`, `month`),
  INDEX `idx_erp_ratings_rated_by` (`rated_by`),
  CONSTRAINT `fk_erp_ratings_enrollment`
    FOREIGN KEY (`student_enrollment_id`) REFERENCES `erp_student_enrollments` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_ratings_sub_param`
    FOREIGN KEY (`sub_parameter_id`) REFERENCES `erp_holistic_sub_parameters` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_ratings_rated_by`
    FOREIGN KEY (`rated_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 16. erp_parameter_stage_mappings — NEP Pancha Kosha stage config
-- ============================================================================

CREATE TABLE `erp_parameter_stage_mappings` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `sub_parameter_id` bigint(20) UNSIGNED NOT NULL,
  `stage` enum('foundational','preparatory','middle','secondary') NOT NULL,
  `grade_range_start` int(11) DEFAULT NULL,
  `grade_range_end` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_erp_stage_map_sub_param` (`sub_parameter_id`),
  INDEX `idx_erp_stage_map_stage` (`stage`),
  CONSTRAINT `fk_erp_stage_map_sub_param`
    FOREIGN KEY (`sub_parameter_id`) REFERENCES `erp_holistic_sub_parameters` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 17. erp_reflection_prompts — Global NEP self-reflection prompts
-- ============================================================================

CREATE TABLE `erp_reflection_prompts` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `stage` enum('foundational','preparatory','middle','secondary') NOT NULL,
  `prompt_text` text NOT NULL,
  `response_format` varchar(50) DEFAULT NULL COMMENT 'text, drawing, emoji, audio, 1-5 stars',
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_erp_prompts_stage` (`stage`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 18. erp_student_reflections — Student responses to prompts
-- ============================================================================

CREATE TABLE `erp_student_reflections` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_enrollment_id` bigint(20) UNSIGNED NOT NULL,
  `reflection_prompt_id` bigint(20) UNSIGNED NOT NULL,
  `month` date NOT NULL COMMENT 'First of month for this reflection',
  `response_text` text DEFAULT NULL,
  `response_file_path` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_erp_reflections_enrollment` (`student_enrollment_id`),
  INDEX `idx_erp_reflections_prompt` (`reflection_prompt_id`),
  INDEX `idx_erp_reflections_month` (`student_enrollment_id`, `month`),
  CONSTRAINT `fk_erp_reflections_enrollment`
    FOREIGN KEY (`student_enrollment_id`) REFERENCES `erp_student_enrollments` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_reflections_prompt`
    FOREIGN KEY (`reflection_prompt_id`) REFERENCES `erp_reflection_prompts` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 19. erp_report_cards — Generated report card metadata
-- ============================================================================

CREATE TABLE `erp_report_cards` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_enrollment_id` bigint(20) UNSIGNED NOT NULL,
  `type` enum('monthly','exam','annual') NOT NULL,
  `reference_month` date DEFAULT NULL COMMENT 'For monthly reports',
  `exam_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'For exam reports',
  `attendance_percentage` decimal(5,2) DEFAULT NULL,
  `overall_percentage` decimal(5,2) DEFAULT NULL,
  `overall_grade` varchar(10) DEFAULT NULL,
  `rank_in_class` int(11) DEFAULT NULL,
  `teacher_remarks` text DEFAULT NULL,
  `pdf_url` text DEFAULT NULL COMMENT 'Generated PDF storage path',
  `generated_by` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'FK to users.id',
  `generated_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_erp_reports_enrollment` (`student_enrollment_id`),
  INDEX `idx_erp_reports_exam` (`exam_id`),
  INDEX `idx_erp_reports_generated_by` (`generated_by`),
  CONSTRAINT `fk_erp_reports_enrollment`
    FOREIGN KEY (`student_enrollment_id`) REFERENCES `erp_student_enrollments` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_reports_exam`
    FOREIGN KEY (`exam_id`) REFERENCES `erp_exams` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_reports_generated_by`
    FOREIGN KEY (`generated_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 20. erp_audit_logs — Comprehensive audit trail
-- ============================================================================

CREATE TABLE `erp_audit_logs` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `partner_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'School scope for filtering',
  `user_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'Who performed the action',
  `action` enum('created','updated','deleted','viewed','exported','imported') NOT NULL,
  `entity_type` varchar(100) NOT NULL COMMENT 'Table name (e.g., erp_marks)',
  `entity_id` bigint(20) UNSIGNED NOT NULL COMMENT 'PK of the affected record',
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_erp_audit_partner` (`partner_id`),
  INDEX `idx_erp_audit_user` (`user_id`),
  INDEX `idx_erp_audit_entity` (`entity_type`, `entity_id`),
  INDEX `idx_erp_audit_action` (`action`),
  INDEX `idx_erp_audit_created` (`created_at`),
  CONSTRAINT `fk_erp_audit_partner`
    FOREIGN KEY (`partner_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_audit_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;
SET FOREIGN_KEY_CHECKS = 1;