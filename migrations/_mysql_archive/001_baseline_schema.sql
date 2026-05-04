-- ============================================================================
-- Migration: 001_baseline_schema.sql
-- Description: Baseline schema for WiserWits Partners Portal (dev_db)
-- Generated: 2026-04-07
-- Database: MySQL 8.0+ (InnoDB)
--
-- This migration captures the FULL current state of the database.
-- It includes:
--   - 72 base tables (core ERP + legacy platform tables)
--   - 11 database views (vw_*)
--   - All indexes, foreign keys, and constraints
--
-- Tables are organized into:
--   [CORE]     roles, users, partners, teachers, students
--   [ERP]      erp_sessions, erp_class_sections, erp_subjects, erp_exams,
--              erp_marks, erp_attendance_records, erp_holistic_*, erp_timetable_*,
--              erp_grading_*, erp_calendar_days, erp_configurations, erp_report_cards,
--              erp_audit_logs
--   [LEGACY]   courses, plans, addons, chats, assignments, live_classes,
--              student_subscriptions, questionnaires, etc.
--   [VIEWS]    vw_attendance, vw_class_sections, vw_exams, vw_marks,
--              vw_report_cards, vw_school_dashboard, vw_school_overview,
--              vw_school_students, vw_school_teachers, vw_subjects, vw_timetable
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `addons` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `addons_chk_1` CHECK (json_valid(`features`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `advice_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `consultant_id` bigint unsigned NOT NULL,
  `preferred_time` datetime DEFAULT NULL,
  `message` text COLLATE utf8mb4_general_ci,
  `feedback` text COLLATE utf8mb4_general_ci,
  `file_path` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_advice_students` (`student_id`),
  KEY `fk_advice_consultant` (`consultant_id`),
  CONSTRAINT `fk_advice_consultant` FOREIGN KEY (`consultant_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_advice_students` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `appointment_test_reminders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `appointment_date` date NOT NULL,
  `appointment_time` time NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `status` enum('pending','completed','cancelled') COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `file_path` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_reminder_student` (`student_id`),
  CONSTRAINT `fk_reminder_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assignments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `assignment_link` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assignment_category` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deadline` date DEFAULT NULL,
  `status` enum('active','deactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `assignment_status` enum('pending','submitted','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `marks_obtained` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_marks` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `quiz_for` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'quiz',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_assignments_created_by` (`created_by`),
  CONSTRAINT `fk_assignments_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `certificates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `student_id` bigint unsigned NOT NULL,
  `consultant_id` bigint unsigned DEFAULT NULL,
  `certificate_file` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `certificates_consultant_id_foreign` (`consultant_id`),
  CONSTRAINT `certificates_consultant_id_foreign` FOREIGN KEY (`consultant_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_files` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chats` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sender_id` bigint unsigned NOT NULL,
  `receiver_id` bigint unsigned NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `chats_receiver_id_foreign` (`receiver_id`),
  KEY `chats_sender_id_receiver_id_index` (`sender_id`,`receiver_id`),
  CONSTRAINT `chats_receiver_id_foreign` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chats_sender_id_foreign` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `class_bookings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `teacher_id` bigint unsigned NOT NULL,
  `class_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `status` enum('pending','confirmed','cancelled','completed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `class_bookings_student_id_foreign` (`student_id`),
  KEY `class_bookings_teacher_id_foreign` (`teacher_id`),
  CONSTRAINT `class_bookings_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `class_bookings_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `teacher_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `classes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `partner_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `grade_level` tinyint unsigned DEFAULT NULL COMMENT 'NEP stage mapping',
  `display_order` smallint unsigned NOT NULL DEFAULT '0',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `classes_code_unique` (`code`),
  KEY `idx_classes_partner_id` (`partner_id`),
  CONSTRAINT `fk_classes_partner` FOREIGN KEY (`partner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `complaints` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `teacher_id` bigint unsigned DEFAULT NULL,
  `partner_id` bigint unsigned DEFAULT NULL,
  `consultant_id` bigint unsigned DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `complains_teacher_id_foreign` (`teacher_id`),
  KEY `complains_consultant_id_foreign` (`consultant_id`),
  KEY `idx_complaints_partner_id` (`partner_id`),
  CONSTRAINT `complains_consultant_id_foreign` FOREIGN KEY (`consultant_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `complains_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_complaints_partner` FOREIGN KEY (`partner_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `consultant_student` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `consultant_id` bigint unsigned NOT NULL,
  `subscription_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `consultent_student_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `subscriptions_id` bigint unsigned NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `documents` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `is_published` tinyint(1) DEFAULT '0',
  `consultant_id` bigint unsigned NOT NULL,
  `student_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `consultent_student_documents_chk_1` CHECK (json_valid(`documents`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contact_messages` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `full_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `course_feedback` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `course_id` bigint unsigned NOT NULL,
  `rating` tinyint NOT NULL,
  `feedback` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `course_feedback_student_course_unique` (`student_id`,`course_id`),
  KEY `course_feedback_course_id_foreign` (`course_id`),
  CONSTRAINT `course_feedback_course_id_foreign` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `course_feedback_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `courses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `class_id` bigint unsigned DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `duration_hours` int unsigned DEFAULT NULL,
  `level` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'beginner',
  `image` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `video_old` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `videos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `documents` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `is_published` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `type_of_course` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `courses_slug_unique` (`slug`),
  KEY `courses_class_id_foreign` (`class_id`),
  KEY `courses_created_by_foreign` (`created_by`),
  CONSTRAINT `courses_class_id_foreign` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `courses_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `courses_chk_1` CHECK (json_valid(`videos`)),
  CONSTRAINT `courses_chk_2` CHECK (json_valid(`documents`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `default_holistic_templates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `stage` enum('foundational','preparatory','middle','secondary') NOT NULL,
  `parameter_name` varchar(100) NOT NULL,
  `parameter_sort_order` int NOT NULL DEFAULT '0',
  `sub_parameter_name` varchar(100) NOT NULL,
  `sub_parameter_sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_template_stage` (`stage`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `diet_plan` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `shared_by_id` bigint unsigned NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `share_date` date NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `valid_upto` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `description` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`),
  KEY `idx_diet_plan_student_id` (`student_id`),
  CONSTRAINT `fk_diet_plan_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doctor_consultations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `patient_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `problem` text COLLATE utf8mb4_general_ci NOT NULL,
  `doctor_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `scheduled_at` datetime NOT NULL,
  `symptoms` text COLLATE utf8mb4_general_ci,
  `status` enum('scheduled','completed','cancelled') COLLATE utf8mb4_general_ci DEFAULT 'scheduled',
  `feedback` text COLLATE utf8mb4_general_ci,
  `file_path` text COLLATE utf8mb4_general_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `erp_attendance_records` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_enrollment_id` bigint unsigned NOT NULL,
  `date` date NOT NULL,
  `status` enum('present','absent','late','half_day') COLLATE utf8mb4_unicode_ci NOT NULL,
  `remarks` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `marked_by` bigint unsigned DEFAULT NULL COMMENT 'FK to users.id',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_erp_attendance` (`student_enrollment_id`,`date`),
  KEY `idx_erp_attendance_date` (`date`),
  KEY `idx_erp_attendance_marked_by` (`marked_by`),
  CONSTRAINT `fk_erp_attendance_enrollment` FOREIGN KEY (`student_enrollment_id`) REFERENCES `erp_student_enrollments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_attendance_marked_by` FOREIGN KEY (`marked_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `erp_audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `partner_id` bigint unsigned DEFAULT NULL COMMENT 'School scope for filtering',
  `user_id` bigint unsigned DEFAULT NULL COMMENT 'Who performed the action',
  `action` enum('created','updated','deleted','viewed','exported','imported') COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Table name (e.g., erp_marks)',
  `entity_id` bigint unsigned NOT NULL COMMENT 'PK of the affected record',
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_erp_audit_partner` (`partner_id`),
  KEY `idx_erp_audit_user` (`user_id`),
  KEY `idx_erp_audit_entity` (`entity_type`,`entity_id`),
  KEY `idx_erp_audit_action` (`action`),
  KEY `idx_erp_audit_created` (`created_at`),
  CONSTRAINT `fk_erp_audit_partner` FOREIGN KEY (`partner_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `erp_calendar_days` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `session_id` bigint unsigned NOT NULL,
  `date` date NOT NULL,
  `day_of_week` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Monday, Tuesday, etc.',
  `is_holiday` tinyint(1) NOT NULL DEFAULT '0',
  `is_working_saturday` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 = this Saturday is a working day',
  `holiday_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_session_date` (`session_id`,`date`),
  KEY `idx_cd_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `erp_class_sections` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `session_id` bigint unsigned NOT NULL COMMENT 'FK to erp_sessions.id',
  `class_id` bigint unsigned NOT NULL COMMENT 'FK to classes.id',
  `section_id` bigint unsigned NOT NULL COMMENT 'FK to sections.id',
  `class_teacher_id` bigint unsigned DEFAULT NULL COMMENT 'Primary class teacher',
  `second_incharge_id` bigint unsigned DEFAULT NULL COMMENT 'Second in-charge',
  `max_students` int NOT NULL DEFAULT '200',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_erp_class_sections` (`session_id`,`class_id`,`section_id`),
  KEY `idx_erp_cs_class` (`class_id`),
  KEY `idx_erp_cs_section` (`section_id`),
  KEY `idx_erp_cs_teacher` (`class_teacher_id`),
  KEY `idx_erp_cs_incharge` (`second_incharge_id`),
  CONSTRAINT `fk_erp_cs_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_cs_incharge` FOREIGN KEY (`second_incharge_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_cs_section` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_cs_session` FOREIGN KEY (`session_id`) REFERENCES `erp_sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_cs_teacher` FOREIGN KEY (`class_teacher_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `erp_configurations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `partner_id` bigint unsigned NOT NULL COMMENT 'FK to users.id (partner account)',
  `session_id` bigint unsigned NOT NULL COMMENT 'FK to erp_sessions.id',
  `grading_scheme_id` bigint unsigned DEFAULT NULL,
  `max_subjects` int NOT NULL DEFAULT '15',
  `max_exams` int NOT NULL DEFAULT '20',
  `max_parameters` int NOT NULL DEFAULT '6',
  `attendance_method` enum('daily','period_wise') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'daily',
  `start_month` tinyint unsigned NOT NULL DEFAULT '3' COMMENT 'Session start month (1=Jan, 3=Mar, 4=Apr)',
  `marks_threshold` decimal(5,2) DEFAULT NULL COMMENT 'Marks below this % are highlighted in reports (e.g., 33.00)',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_erp_config` (`partner_id`,`session_id`),
  KEY `idx_erp_config_session` (`session_id`),
  KEY `idx_erp_config_grading` (`grading_scheme_id`),
  CONSTRAINT `fk_erp_config_grading` FOREIGN KEY (`grading_scheme_id`) REFERENCES `erp_grading_schemes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_config_partner` FOREIGN KEY (`partner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_config_session` FOREIGN KEY (`session_id`) REFERENCES `erp_sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `erp_exam_schedules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `exam_id` bigint unsigned NOT NULL,
  `subject_id` bigint unsigned NOT NULL,
  `exam_date` date DEFAULT NULL,
  `exam_time` time DEFAULT NULL,
  `duration_minutes` int DEFAULT NULL,
  `maximum_marks` decimal(6,2) NOT NULL DEFAULT '100.00',
  `room_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comment_1` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comment_2` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comment_3` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_erp_exam_schedule` (`exam_id`,`subject_id`),
  KEY `idx_erp_exam_sched_subject` (`subject_id`),
  CONSTRAINT `fk_erp_exam_sched_exam` FOREIGN KEY (`exam_id`) REFERENCES `erp_exams` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_exam_sched_subject` FOREIGN KEY (`subject_id`) REFERENCES `erp_subjects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `erp_exams` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `class_section_id` bigint unsigned NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'e.g., Unit Test 1, Mid-Term',
  `code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('upcoming','in_progress','completed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'upcoming',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_erp_exams_cs` (`class_section_id`),
  CONSTRAINT `fk_erp_exams_cs` FOREIGN KEY (`class_section_id`) REFERENCES `erp_class_sections` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `erp_grading_ranges` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `grading_scheme_id` bigint unsigned NOT NULL,
  `grade_label` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'e.g., A+, A, B+',
  `min_percentage` decimal(5,2) NOT NULL,
  `max_percentage` decimal(5,2) NOT NULL,
  `gpa_value` decimal(4,2) DEFAULT NULL COMMENT 'GPA/CGPA equivalent',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_erp_ranges_scheme` (`grading_scheme_id`),
  CONSTRAINT `fk_erp_ranges_scheme` FOREIGN KEY (`grading_scheme_id`) REFERENCES `erp_grading_schemes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `erp_grading_schemes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `partner_id` bigint unsigned NOT NULL COMMENT 'FK to users.id (partner account)',
  `session_id` bigint unsigned DEFAULT NULL COMMENT 'NULL = school-wide default',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('letter','gpa','percentage','cgpa') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'letter',
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_erp_grading_partner` (`partner_id`),
  KEY `idx_erp_grading_session` (`session_id`),
  CONSTRAINT `fk_erp_grading_partner` FOREIGN KEY (`partner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_grading_session` FOREIGN KEY (`session_id`) REFERENCES `erp_sessions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `erp_holistic_parameters` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `partner_id` bigint unsigned NOT NULL COMMENT 'FK to users.id (partner account)',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stage` enum('foundational','preparatory','middle','secondary') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_erp_params_partner` (`partner_id`),
  CONSTRAINT `fk_erp_params_partner` FOREIGN KEY (`partner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `erp_holistic_ratings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_enrollment_id` bigint unsigned NOT NULL,
  `sub_parameter_id` bigint unsigned NOT NULL,
  `month` date NOT NULL COMMENT 'First of month (e.g., 2026-03-01)',
  `rating_value` decimal(5,2) DEFAULT NULL,
  `max_rating` decimal(5,2) NOT NULL DEFAULT '10.00',
  `rating_grade` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comments` text COLLATE utf8mb4_unicode_ci,
  `rated_by` bigint unsigned DEFAULT NULL COMMENT 'FK to users.id',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_erp_rating` (`student_enrollment_id`,`sub_parameter_id`,`month`),
  KEY `idx_erp_ratings_sub_param` (`sub_parameter_id`),
  KEY `idx_erp_ratings_month` (`student_enrollment_id`,`month`),
  KEY `idx_erp_ratings_rated_by` (`rated_by`),
  CONSTRAINT `fk_erp_ratings_enrollment` FOREIGN KEY (`student_enrollment_id`) REFERENCES `erp_student_enrollments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_ratings_rated_by` FOREIGN KEY (`rated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_ratings_sub_param` FOREIGN KEY (`sub_parameter_id`) REFERENCES `erp_holistic_sub_parameters` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `erp_holistic_sub_parameters` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parameter_id` bigint unsigned NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_erp_sub_params` (`parameter_id`),
  CONSTRAINT `fk_erp_sub_params` FOREIGN KEY (`parameter_id`) REFERENCES `erp_holistic_parameters` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `erp_marks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `exam_id` bigint unsigned NOT NULL,
  `subject_id` bigint unsigned NOT NULL,
  `student_enrollment_id` bigint unsigned NOT NULL,
  `maximum_marks` decimal(6,2) NOT NULL COMMENT 'Denormalized from erp_exam_schedules',
  `obtained_marks` decimal(6,2) DEFAULT NULL COMMENT 'NULL if absent',
  `is_absent` tinyint(1) NOT NULL DEFAULT '0',
  `percentage` decimal(5,2) DEFAULT NULL COMMENT 'Auto-computed by application',
  `grade` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Auto-computed from grading scheme',
  `entered_by` bigint unsigned DEFAULT NULL COMMENT 'FK to users.id',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_erp_marks` (`exam_id`,`subject_id`,`student_enrollment_id`),
  KEY `idx_erp_marks_subject` (`subject_id`),
  KEY `idx_erp_marks_enrollment` (`student_enrollment_id`),
  KEY `idx_erp_marks_entered_by` (`entered_by`),
  CONSTRAINT `fk_erp_marks_enrollment` FOREIGN KEY (`student_enrollment_id`) REFERENCES `erp_student_enrollments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_marks_entered_by` FOREIGN KEY (`entered_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_marks_exam` FOREIGN KEY (`exam_id`) REFERENCES `erp_exams` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_marks_subject` FOREIGN KEY (`subject_id`) REFERENCES `erp_subjects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `erp_parameter_stage_mappings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sub_parameter_id` bigint unsigned NOT NULL,
  `stage` enum('foundational','preparatory','middle','secondary') COLLATE utf8mb4_unicode_ci NOT NULL,
  `grade_range_start` int DEFAULT NULL,
  `grade_range_end` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_erp_stage_map_sub_param` (`sub_parameter_id`),
  KEY `idx_erp_stage_map_stage` (`stage`),
  CONSTRAINT `fk_erp_stage_map_sub_param` FOREIGN KEY (`sub_parameter_id`) REFERENCES `erp_holistic_sub_parameters` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `erp_reflection_prompts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `stage` enum('foundational','preparatory','middle','secondary') COLLATE utf8mb4_unicode_ci NOT NULL,
  `prompt_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `response_format` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'text, drawing, emoji, audio, 1-5 stars',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_erp_prompts_stage` (`stage`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `erp_report_cards` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_enrollment_id` bigint unsigned NOT NULL,
  `type` enum('monthly','exam','annual') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_month` date DEFAULT NULL COMMENT 'For monthly reports',
  `exam_id` bigint unsigned DEFAULT NULL COMMENT 'For exam reports',
  `attendance_percentage` decimal(5,2) DEFAULT NULL,
  `overall_percentage` decimal(5,2) DEFAULT NULL,
  `overall_grade` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rank_in_class` int DEFAULT NULL,
  `teacher_remarks` text COLLATE utf8mb4_unicode_ci,
  `pdf_url` text COLLATE utf8mb4_unicode_ci COMMENT 'Generated PDF storage path',
  `generated_by` bigint unsigned DEFAULT NULL COMMENT 'FK to users.id',
  `generated_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_erp_reports_enrollment` (`student_enrollment_id`),
  KEY `idx_erp_reports_exam` (`exam_id`),
  KEY `idx_erp_reports_generated_by` (`generated_by`),
  CONSTRAINT `fk_erp_reports_enrollment` FOREIGN KEY (`student_enrollment_id`) REFERENCES `erp_student_enrollments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_reports_exam` FOREIGN KEY (`exam_id`) REFERENCES `erp_exams` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_reports_generated_by` FOREIGN KEY (`generated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `erp_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `partner_id` bigint unsigned NOT NULL COMMENT 'FK to users.id (partner account)',
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'e.g., 2026-27',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `is_current` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_erp_sessions_partner_name` (`partner_id`,`name`),
  KEY `idx_erp_sessions_partner` (`partner_id`),
  CONSTRAINT `fk_erp_sessions_partner` FOREIGN KEY (`partner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `erp_student_enrollments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL COMMENT 'FK to students.id',
  `class_section_id` bigint unsigned NOT NULL COMMENT 'FK to erp_class_sections.id',
  `roll_number` int DEFAULT NULL,
  `student_type` enum('promoted','new','regular','lateral_entry','transfer','repeater') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'regular',
  `enrollment_date` date DEFAULT NULL,
  `status` enum('active','transferred','withdrawn') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_erp_enrollment_student_section` (`student_id`,`class_section_id`),
  UNIQUE KEY `uq_erp_enrollment_section_roll` (`class_section_id`,`roll_number`),
  KEY `idx_erp_enrollments_cs` (`class_section_id`),
  CONSTRAINT `fk_erp_enrollments_cs` FOREIGN KEY (`class_section_id`) REFERENCES `erp_class_sections` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_enrollments_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `erp_student_reflections` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_enrollment_id` bigint unsigned NOT NULL,
  `reflection_prompt_id` bigint unsigned NOT NULL,
  `month` date NOT NULL COMMENT 'First of month for this reflection',
  `response_text` text COLLATE utf8mb4_unicode_ci,
  `response_file_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_erp_reflections_enrollment` (`student_enrollment_id`),
  KEY `idx_erp_reflections_prompt` (`reflection_prompt_id`),
  KEY `idx_erp_reflections_month` (`student_enrollment_id`,`month`),
  CONSTRAINT `fk_erp_reflections_enrollment` FOREIGN KEY (`student_enrollment_id`) REFERENCES `erp_student_enrollments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_reflections_prompt` FOREIGN KEY (`reflection_prompt_id`) REFERENCES `erp_reflection_prompts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `erp_subjects` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `class_section_id` bigint unsigned NOT NULL COMMENT 'FK to erp_class_sections.id',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `teacher_id` bigint unsigned DEFAULT NULL COMMENT 'FK to users.id (assigned teacher)',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_erp_subjects_section_name` (`class_section_id`,`name`),
  KEY `idx_erp_subjects_teacher` (`teacher_id`),
  CONSTRAINT `fk_erp_subjects_cs` FOREIGN KEY (`class_section_id`) REFERENCES `erp_class_sections` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_erp_subjects_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `erp_timetable_config` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `partner_id` bigint unsigned NOT NULL,
  `period_number` int NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `slot_type` enum('class','break','lunch','assembly') NOT NULL DEFAULT 'class',
  `label` varchar(50) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_partner_period` (`partner_id`,`period_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `erp_timetable_slots` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `class_section_id` bigint unsigned NOT NULL,
  `day_of_week` enum('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') NOT NULL,
  `period_number` int NOT NULL,
  `subject_id` bigint unsigned DEFAULT NULL,
  `teacher_id` bigint unsigned DEFAULT NULL,
  `staff_id` bigint unsigned DEFAULT NULL,
  `room_number` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cs_day_period` (`class_section_id`,`day_of_week`,`period_number`),
  KEY `idx_teacher_day_period` (`teacher_id`,`day_of_week`,`period_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exam_report_cards` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `created_by` bigint unsigned NOT NULL,
  `exam` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `exam_date` date DEFAULT NULL,
  `subject` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `marks_obtained` int DEFAULT NULL,
  `max_marks` int DEFAULT NULL,
  `grade` varchar(10) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_exam_report_cards_student` (`student_id`),
  CONSTRAINT `fk_exam_report_cards_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `features` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lab_reports` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `shared_by_id` bigint unsigned NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `share_date` date NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_general_ci NOT NULL,
  `valid_upto` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `description` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`),
  KEY `idx_lab_reports_student_id` (`student_id`),
  CONSTRAINT `fk_lab_reports_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `live_classes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `course_id` bigint unsigned DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `host_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `student_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `consultant_id` bigint unsigned NOT NULL,
  `class_type` enum('live','on-demand') COLLATE utf8mb4_unicode_ci DEFAULT 'live',
  `start_time` datetime DEFAULT NULL,
  `duration_minutes` int DEFAULT NULL,
  `join_link` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('awaited','ongoing','completed') COLLATE utf8mb4_unicode_ci DEFAULT 'awaited',
  `recording_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_live_classes_course` (`course_id`),
  KEY `fk_live_classes_consultant` (`consultant_id`),
  CONSTRAINT `fk_live_classes_consultant` FOREIGN KEY (`consultant_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_live_classes_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `live_classes_chk_1` CHECK (json_valid(`student_ids`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parent_call_summaries` (
  `id` bigint unsigned NOT NULL,
  `student_id` bigint unsigned NOT NULL,
  `consultant_id` bigint unsigned NOT NULL,
  `summary` text COLLATE utf8mb4_unicode_ci,
  `attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  CONSTRAINT `parent_call_summaries_chk_1` CHECK (json_valid(`attachments`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `partner_staff` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `partner_id` bigint unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `designation` varchar(100) NOT NULL,
  `department` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `qualification` varchar(255) DEFAULT NULL,
  `experience` int DEFAULT NULL,
  `address` text,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ps_partner` (`partner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `partner_teachers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `partner_id` bigint unsigned NOT NULL,
  `teacher_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pt_partner_id` (`partner_id`),
  CONSTRAINT `fk_pt_partner` FOREIGN KEY (`partner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `partner_teachers_chk_1` CHECK (json_valid(`teacher_ids`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `partners` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `partner_type` enum('school','coaching','college','university','other') NOT NULL DEFAULT 'school',
  `partner_name` varchar(255) NOT NULL,
  `partner_code` varchar(50) DEFAULT NULL,
  `contact_person` varchar(255) DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `address` text,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `pincode` varchar(20) DEFAULT NULL,
  `registration_number` varchar(100) DEFAULT NULL,
  `affiliated_board` varchar(255) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `additional_info` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `partner_code_unique` (`partner_code`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `fk_partners_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `partners_chk_1` CHECK (json_valid(`additional_info`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','completed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `password_reset_requests_student_id_foreign` (`student_id`),
  CONSTRAINT `password_reset_requests_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_resets` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  KEY `password_resets_email_index` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `role_id` bigint unsigned DEFAULT NULL,
  `can_view` tinyint(1) NOT NULL DEFAULT '0',
  `can_edit` tinyint(1) NOT NULL DEFAULT '0',
  `can_delete` tinyint(1) NOT NULL DEFAULT '0',
  `can_show` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `permissions_user_id_foreign` (`user_id`),
  KEY `permissions_role_id_foreign` (`role_id`),
  CONSTRAINT `permissions_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `permissions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text COLLATE utf8mb4_unicode_ci,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plans` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `course_id` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `duration_days` int NOT NULL,
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `plans_chk_1` CHECK (json_valid(`course_id`)),
  CONSTRAINT `plans_chk_2` CHECK (json_valid(`features`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `questionnaires` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `teacher_id` bigint unsigned NOT NULL,
  `partner_id` bigint unsigned DEFAULT NULL,
  `student_id` bigint unsigned NOT NULL,
  `consultant_id` bigint unsigned DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending_review','approved','rejected','published') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending_review',
  `consultant_remark` text COLLATE utf8mb4_unicode_ci,
  `type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `questionnaires_teacher_id_foreign` (`teacher_id`),
  KEY `questionnaires_student_id_foreign` (`student_id`),
  KEY `questionnaires_consultant_id_foreign` (`consultant_id`),
  KEY `idx_questionnaires_partner_id` (`partner_id`),
  CONSTRAINT `fk_questionnaires_partner` FOREIGN KEY (`partner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `questionnaires_consultant_id_foreign` FOREIGN KEY (`consultant_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `questionnaires_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `questionnaires_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_name_unique` (`name`),
  UNIQUE KEY `roles_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sections` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `class_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `room_no` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sections_class_id_foreign` (`class_id`),
  CONSTRAINT `sections_class_id_foreign` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_academic_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `partner_id` bigint unsigned DEFAULT NULL,
  `class_id` bigint unsigned DEFAULT NULL,
  `section_id` bigint unsigned DEFAULT NULL,
  `consultant_id` bigint unsigned DEFAULT NULL,
  `teacher_id` bigint unsigned DEFAULT NULL,
  `session_year` varchar(20) NOT NULL,
  `admission_number` varchar(255) DEFAULT NULL,
  `admission_date` date DEFAULT NULL,
  `roll_number` varchar(255) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `remarks` text,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  KEY `class_id` (`class_id`),
  KEY `teacher_id` (`teacher_id`),
  KEY `consultant_id` (`consultant_id`),
  KEY `student_academic_sessions_section_id_foreign` (`section_id`),
  KEY `fk_school_user` (`partner_id`),
  KEY `idx_sas_partner_id` (`partner_id`),
  CONSTRAINT `fk_sas_partner` FOREIGN KEY (`partner_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `student_academic_sessions_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `student_academic_sessions_ibfk_2` FOREIGN KEY (`partner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `student_academic_sessions_ibfk_3` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `student_academic_sessions_ibfk_4` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `student_academic_sessions_ibfk_5` FOREIGN KEY (`consultant_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `student_academic_sessions_section_id_foreign` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_addons` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `addon_id` bigint unsigned NOT NULL,
  `purchase_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `student_addons_student_id_foreign` (`student_id`),
  KEY `student_addons_addon_id_foreign` (`addon_id`),
  CONSTRAINT `student_addons_addon_id_foreign` FOREIGN KEY (`addon_id`) REFERENCES `addons` (`id`) ON DELETE CASCADE,
  CONSTRAINT `student_addons_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_change_timing` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `consultant_id` bigint unsigned NOT NULL,
  `teacher_id` bigint unsigned DEFAULT NULL,
  `course_id` bigint unsigned DEFAULT NULL,
  `live_class_id` bigint unsigned DEFAULT NULL,
  `student_request_time` time DEFAULT NULL,
  `scheduled_time` time DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `comment` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `student_change_timing_student_id_foreign` (`student_id`),
  KEY `student_change_timing_consultant_id_foreign` (`consultant_id`),
  KEY `student_change_timing_teacher_id_foreign` (`teacher_id`),
  KEY `student_change_timing_course_id_foreign` (`course_id`),
  KEY `student_change_timing_live_class_id_foreign` (`live_class_id`),
  CONSTRAINT `student_change_timing_consultant_id_foreign` FOREIGN KEY (`consultant_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `student_change_timing_course_id_foreign` FOREIGN KEY (`course_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `student_change_timing_live_class_id_foreign` FOREIGN KEY (`live_class_id`) REFERENCES `live_classes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `student_change_timing_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `student_change_timing_teacher_id_foreign` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_courses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `course_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_course_unique` (`student_id`,`course_id`),
  KEY `fk_student_courses_course` (`course_id`),
  CONSTRAINT `fk_student_courses_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_student_courses_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_data_performances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint DEFAULT NULL,
  `questionnaires_id` bigint unsigned NOT NULL,
  `academic_performance` tinyint DEFAULT NULL,
  `competition` tinyint DEFAULT NULL,
  `consistency` tinyint DEFAULT NULL,
  `test_preparedness` tinyint DEFAULT NULL,
  `class_engagement` tinyint DEFAULT NULL,
  `subject_understanding` tinyint DEFAULT NULL,
  `homework` tinyint DEFAULT NULL,
  `grasping_ability` tinyint DEFAULT NULL,
  `retention_power` tinyint DEFAULT NULL,
  `conceptual_clarity` tinyint DEFAULT NULL,
  `attention_span` tinyint DEFAULT NULL,
  `learning_speed` tinyint DEFAULT NULL,
  `peer_interaction` tinyint DEFAULT NULL,
  `discipline` tinyint DEFAULT NULL,
  `respect_for_authority` tinyint DEFAULT NULL,
  `motivation_level` tinyint DEFAULT NULL,
  `response_to_feedback` tinyint DEFAULT NULL,
  `stamina` tinyint DEFAULT NULL,
  `participation_in_sports` tinyint DEFAULT NULL,
  `teamwork_in_games` tinyint DEFAULT NULL,
  `fitness_level` tinyint DEFAULT NULL,
  `interest_in_activities` tinyint DEFAULT NULL,
  `initiative_in_projects` tinyint DEFAULT NULL,
  `curiosity_level` tinyint DEFAULT NULL,
  `problem_solving` tinyint DEFAULT NULL,
  `extra_curricular` tinyint DEFAULT NULL,
  `idea_generation` tinyint DEFAULT NULL,
  `maths` tinyint DEFAULT NULL,
  `science` tinyint DEFAULT NULL,
  `english` tinyint DEFAULT NULL,
  `social_studies` tinyint DEFAULT NULL,
  `computer_science` tinyint DEFAULT NULL,
  `suggestions` text COLLATE utf8mb4_unicode_ci,
  `attachment_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `student_data_performances_questionnaires_id_foreign` (`questionnaires_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_health_records` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned DEFAULT NULL,
  `height_cm` decimal(5,2) NOT NULL,
  `weight_kg` decimal(5,2) NOT NULL,
  `bmi` decimal(5,2) NOT NULL,
  `record_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `student_health_records_student_id_foreign` (`student_id`),
  CONSTRAINT `student_health_records_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_subscriptions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `plan_id` bigint unsigned NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `consultant_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `student_subscriptions_student_id_foreign` (`student_id`),
  KEY `student_subscriptions_plan_id_foreign` (`plan_id`),
  CONSTRAINT `student_subscriptions_plan_id_foreign` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `student_subscriptions_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `students` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `created_by` bigint unsigned DEFAULT NULL,
  `consultant_id` bigint unsigned DEFAULT NULL,
  `first_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `middle_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gender` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `alternate_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postal_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `father_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mother_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `guardian_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `guardian_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `guardian_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `profile_image` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive','graduated','suspended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `height` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `weight` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `blood_group` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `students_email_unique` (`email`),
  KEY `students_created_by_foreign` (`created_by`),
  KEY `students_consultant_id_foreign` (`consultant_id`),
  CONSTRAINT `students_consultant_id_foreign` FOREIGN KEY (`consultant_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `students_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teacher_availabilities` (
  `id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `day_of_week` tinyint unsigned NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  KEY `teacher_availability_user_id_foreign` (`user_id`),
  CONSTRAINT `teacher_availability_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teacher_feedbacks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `subject` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `feedback` text COLLATE utf8mb4_general_ci NOT NULL,
  `attachments` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `student_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_teacher_feedbacks_created_by` (`created_by`),
  KEY `fk_teacher_feedbacks_student_id` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teachers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `partner_id` bigint unsigned DEFAULT NULL,
  `teacher_type` enum('school','freelancer') DEFAULT 'school',
  `is_freelancer` tinyint(1) DEFAULT '0',
  `subject_specialization` varchar(50) DEFAULT NULL,
  `qualification` varchar(255) DEFAULT NULL,
  `experience` int DEFAULT NULL,
  `number_of_hours` int DEFAULT NULL,
  `bio` text,
  `profile_image` varchar(255) DEFAULT NULL,
  `address` text,
  `date_of_joining` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_teachers_partner_id` (`partner_id`),
  CONSTRAINT `fk_teachers_partner` FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`) ON DELETE SET NULL,
  CONSTRAINT `teachers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `two_factor_secret` text COLLATE utf8mb4_unicode_ci,
  `two_factor_recovery_codes` text COLLATE utf8mb4_unicode_ci,
  `two_factor_confirmed_at` timestamp NULL DEFAULT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `current_team_id` bigint unsigned DEFAULT NULL,
  `profile_photo_path` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `phone_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role_id` bigint unsigned DEFAULT NULL,
  `consultant_id` bigint unsigned DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_role_id_foreign` (`role_id`),
  KEY `users_consultant_id_foreign` (`consultant_id`),
  CONSTRAINT `users_consultant_id_foreign` FOREIGN KEY (`consultant_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `users_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_attendance` AS SELECT 
 1 AS `attendance_id`,
 1 AS `date`,
 1 AS `attendance_status`,
 1 AS `remarks`,
 1 AS `marked_by`,
 1 AS `student_id`,
 1 AS `first_name`,
 1 AS `last_name`,
 1 AS `roll_number`,
 1 AS `class_section_id`,
 1 AS `class_name`,
 1 AS `section_name`,
 1 AS `school_id`,
 1 AS `session_name`,
 1 AS `is_current`*/;
SET character_set_client = @saved_cs_client;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_class_sections` AS SELECT 
 1 AS `class_section_id`,
 1 AS `class_id`,
 1 AS `class_name`,
 1 AS `class_code`,
 1 AS `grade_level`,
 1 AS `section_id`,
 1 AS `section_name`,
 1 AS `room_no`,
 1 AS `max_students`,
 1 AS `class_teacher_id`,
 1 AS `class_teacher_name`,
 1 AS `second_incharge_id`,
 1 AS `second_incharge_name`,
 1 AS `session_id`,
 1 AS `session_name`,
 1 AS `school_id`,
 1 AS `is_current`*/;
SET character_set_client = @saved_cs_client;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_exams` AS SELECT 
 1 AS `exam_id`,
 1 AS `exam_name`,
 1 AS `exam_code`,
 1 AS `start_date`,
 1 AS `end_date`,
 1 AS `exam_status`,
 1 AS `class_section_id`,
 1 AS `class_name`,
 1 AS `section_name`,
 1 AS `school_id`,
 1 AS `session_name`,
 1 AS `is_current`*/;
SET character_set_client = @saved_cs_client;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_marks` AS SELECT 
 1 AS `mark_id`,
 1 AS `obtained_marks`,
 1 AS `maximum_marks`,
 1 AS `percentage`,
 1 AS `grade`,
 1 AS `is_absent`,
 1 AS `entered_by`,
 1 AS `student_id`,
 1 AS `first_name`,
 1 AS `last_name`,
 1 AS `roll_number`,
 1 AS `exam_id`,
 1 AS `exam_name`,
 1 AS `exam_status`,
 1 AS `subject_id`,
 1 AS `subject_name`,
 1 AS `class_name`,
 1 AS `section_name`,
 1 AS `school_id`,
 1 AS `session_name`,
 1 AS `is_current`*/;
SET character_set_client = @saved_cs_client;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_report_cards` AS SELECT 
 1 AS `report_card_id`,
 1 AS `report_type`,
 1 AS `reference_month`,
 1 AS `attendance_percentage`,
 1 AS `overall_percentage`,
 1 AS `overall_grade`,
 1 AS `rank_in_class`,
 1 AS `teacher_remarks`,
 1 AS `pdf_url`,
 1 AS `generated_at`,
 1 AS `student_id`,
 1 AS `first_name`,
 1 AS `last_name`,
 1 AS `roll_number`,
 1 AS `exam_name`,
 1 AS `class_name`,
 1 AS `section_name`,
 1 AS `school_id`,
 1 AS `session_name`,
 1 AS `is_current`*/;
SET character_set_client = @saved_cs_client;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_school_dashboard` AS SELECT 
 1 AS `school_id`,
 1 AS `school_name`,
 1 AS `school_code`,
 1 AS `partner_type`,
 1 AS `contact_person`,
 1 AS `contact_email`,
 1 AS `contact_phone`,
 1 AS `city`,
 1 AS `state`,
 1 AS `affiliated_board`,
 1 AS `session_id`,
 1 AS `session_name`,
 1 AS `session_start`,
 1 AS `session_end`,
 1 AS `class_section_id`,
 1 AS `class_id`,
 1 AS `class_name`,
 1 AS `grade_level`,
 1 AS `section_id`,
 1 AS `section_name`,
 1 AS `room_no`,
 1 AS `max_students`,
 1 AS `class_teacher_id`,
 1 AS `class_teacher_name`,
 1 AS `class_teacher_email`,
 1 AS `student_id`,
 1 AS `student_first_name`,
 1 AS `student_last_name`,
 1 AS `student_gender`,
 1 AS `student_dob`,
 1 AS `student_email`,
 1 AS `student_phone`,
 1 AS `father_name`,
 1 AS `mother_name`,
 1 AS `roll_number`,
 1 AS `student_type`,
 1 AS `enrollment_date`,
 1 AS `enrollment_status`,
 1 AS `subject_id`,
 1 AS `subject_name`,
 1 AS `subject_code`,
 1 AS `subject_teacher_id`,
 1 AS `subject_teacher_name`*/;
SET character_set_client = @saved_cs_client;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_school_overview` AS SELECT 
 1 AS `school_id`,
 1 AS `partner_name`,
 1 AS `partner_type`,
 1 AS `session_id`,
 1 AS `session_name`,
 1 AS `is_current`,
 1 AS `total_class_sections`,
 1 AS `total_students`,
 1 AS `total_subject_teachers`,
 1 AS `total_subjects`,
 1 AS `total_exams`*/;
SET character_set_client = @saved_cs_client;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_school_students` AS SELECT 
 1 AS `student_id`,
 1 AS `first_name`,
 1 AS `last_name`,
 1 AS `middle_name`,
 1 AS `gender`,
 1 AS `date_of_birth`,
 1 AS `email`,
 1 AS `phone`,
 1 AS `father_name`,
 1 AS `mother_name`,
 1 AS `guardian_name`,
 1 AS `guardian_phone`,
 1 AS `student_status`,
 1 AS `enrollment_id`,
 1 AS `roll_number`,
 1 AS `student_type`,
 1 AS `enrollment_date`,
 1 AS `enrollment_status`,
 1 AS `class_section_id`,
 1 AS `class_name`,
 1 AS `section_name`,
 1 AS `session_id`,
 1 AS `session_name`,
 1 AS `school_id`,
 1 AS `is_current`*/;
SET character_set_client = @saved_cs_client;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_school_teachers` AS SELECT 
 1 AS `teacher_id`,
 1 AS `user_id`,
 1 AS `teacher_name`,
 1 AS `email`,
 1 AS `phone_number`,
 1 AS `school_id`,
 1 AS `subject_specialization`,
 1 AS `qualification`,
 1 AS `experience`,
 1 AS `number_of_hours`,
 1 AS `teacher_type`,
 1 AS `is_freelancer`,
 1 AS `bio`,
 1 AS `profile_image`,
 1 AS `created_at`*/;
SET character_set_client = @saved_cs_client;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_subjects` AS SELECT 
 1 AS `subject_id`,
 1 AS `subject_name`,
 1 AS `subject_code`,
 1 AS `sort_order`,
 1 AS `teacher_id`,
 1 AS `teacher_name`,
 1 AS `class_section_id`,
 1 AS `class_name`,
 1 AS `section_name`,
 1 AS `school_id`,
 1 AS `session_name`,
 1 AS `is_current`*/;
SET character_set_client = @saved_cs_client;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_timetable` AS SELECT 
 1 AS `slot_id`,
 1 AS `day_of_week`,
 1 AS `period_number`,
 1 AS `room_number`,
 1 AS `start_time`,
 1 AS `end_time`,
 1 AS `slot_type`,
 1 AS `period_label`,
 1 AS `subject_name`,
 1 AS `teacher_name`,
 1 AS `staff_name`,
 1 AS `class_name`,
 1 AS `section_name`,
 1 AS `school_id`,
 1 AS `is_current`*/;
SET character_set_client = @saved_cs_client;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workshop_webinar_calendar` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `student_id` bigint unsigned DEFAULT NULL,
  `start_date` date NOT NULL,
  `join_link` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50001 DROP VIEW IF EXISTS `vw_attendance`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_attendance` AS select `ar`.`id` AS `attendance_id`,`ar`.`date` AS `date`,`ar`.`status` AS `attendance_status`,`ar`.`remarks` AS `remarks`,`ar`.`marked_by` AS `marked_by`,`s`.`id` AS `student_id`,`s`.`first_name` AS `first_name`,`s`.`last_name` AS `last_name`,`e`.`roll_number` AS `roll_number`,`cs`.`id` AS `class_section_id`,`c`.`name` AS `class_name`,`sec`.`name` AS `section_name`,`ses`.`partner_id` AS `school_id`,`ses`.`name` AS `session_name`,`ses`.`is_current` AS `is_current` from ((((((`erp_attendance_records` `ar` join `erp_student_enrollments` `e` on((`e`.`id` = `ar`.`student_enrollment_id`))) join `students` `s` on((`s`.`id` = `e`.`student_id`))) join `erp_class_sections` `cs` on((`cs`.`id` = `e`.`class_section_id`))) join `erp_sessions` `ses` on((`ses`.`id` = `cs`.`session_id`))) join `classes` `c` on((`c`.`id` = `cs`.`class_id`))) join `sections` `sec` on((`sec`.`id` = `cs`.`section_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `vw_class_sections`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_class_sections` AS select `cs`.`id` AS `class_section_id`,`c`.`id` AS `class_id`,`c`.`name` AS `class_name`,`c`.`code` AS `class_code`,`c`.`grade_level` AS `grade_level`,`sec`.`id` AS `section_id`,`sec`.`name` AS `section_name`,`sec`.`room_no` AS `room_no`,`cs`.`max_students` AS `max_students`,`cs`.`class_teacher_id` AS `class_teacher_id`,`u1`.`name` AS `class_teacher_name`,`cs`.`second_incharge_id` AS `second_incharge_id`,`u2`.`name` AS `second_incharge_name`,`ses`.`id` AS `session_id`,`ses`.`name` AS `session_name`,`ses`.`partner_id` AS `school_id`,`ses`.`is_current` AS `is_current` from (((((((`erp_class_sections` `cs` join `erp_sessions` `ses` on((`ses`.`id` = `cs`.`session_id`))) join `classes` `c` on((`c`.`id` = `cs`.`class_id`))) join `sections` `sec` on((`sec`.`id` = `cs`.`section_id`))) left join `teachers` `t1` on((`t1`.`id` = `cs`.`class_teacher_id`))) left join `users` `u1` on((`u1`.`id` = `t1`.`user_id`))) left join `teachers` `t2` on((`t2`.`id` = `cs`.`second_incharge_id`))) left join `users` `u2` on((`u2`.`id` = `t2`.`user_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `vw_exams`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_exams` AS select `ex`.`id` AS `exam_id`,`ex`.`name` AS `exam_name`,`ex`.`code` AS `exam_code`,`ex`.`start_date` AS `start_date`,`ex`.`end_date` AS `end_date`,`ex`.`status` AS `exam_status`,`cs`.`id` AS `class_section_id`,`c`.`name` AS `class_name`,`sec`.`name` AS `section_name`,`ses`.`partner_id` AS `school_id`,`ses`.`name` AS `session_name`,`ses`.`is_current` AS `is_current` from ((((`erp_exams` `ex` join `erp_class_sections` `cs` on((`cs`.`id` = `ex`.`class_section_id`))) join `erp_sessions` `ses` on((`ses`.`id` = `cs`.`session_id`))) join `classes` `c` on((`c`.`id` = `cs`.`class_id`))) join `sections` `sec` on((`sec`.`id` = `cs`.`section_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `vw_marks`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_marks` AS select `m`.`id` AS `mark_id`,`m`.`obtained_marks` AS `obtained_marks`,`m`.`maximum_marks` AS `maximum_marks`,`m`.`percentage` AS `percentage`,`m`.`grade` AS `grade`,`m`.`is_absent` AS `is_absent`,`m`.`entered_by` AS `entered_by`,`s`.`id` AS `student_id`,`s`.`first_name` AS `first_name`,`s`.`last_name` AS `last_name`,`e`.`roll_number` AS `roll_number`,`ex`.`id` AS `exam_id`,`ex`.`name` AS `exam_name`,`ex`.`status` AS `exam_status`,`sub`.`id` AS `subject_id`,`sub`.`name` AS `subject_name`,`c`.`name` AS `class_name`,`sec`.`name` AS `section_name`,`ses`.`partner_id` AS `school_id`,`ses`.`name` AS `session_name`,`ses`.`is_current` AS `is_current` from ((((((((`erp_marks` `m` join `erp_student_enrollments` `e` on((`e`.`id` = `m`.`student_enrollment_id`))) join `students` `s` on((`s`.`id` = `e`.`student_id`))) join `erp_exams` `ex` on((`ex`.`id` = `m`.`exam_id`))) join `erp_subjects` `sub` on((`sub`.`id` = `m`.`subject_id`))) join `erp_class_sections` `cs` on((`cs`.`id` = `e`.`class_section_id`))) join `erp_sessions` `ses` on((`ses`.`id` = `cs`.`session_id`))) join `classes` `c` on((`c`.`id` = `cs`.`class_id`))) join `sections` `sec` on((`sec`.`id` = `cs`.`section_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `vw_report_cards`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_report_cards` AS select `rc`.`id` AS `report_card_id`,`rc`.`type` AS `report_type`,`rc`.`reference_month` AS `reference_month`,`rc`.`attendance_percentage` AS `attendance_percentage`,`rc`.`overall_percentage` AS `overall_percentage`,`rc`.`overall_grade` AS `overall_grade`,`rc`.`rank_in_class` AS `rank_in_class`,`rc`.`teacher_remarks` AS `teacher_remarks`,`rc`.`pdf_url` AS `pdf_url`,`rc`.`generated_at` AS `generated_at`,`s`.`id` AS `student_id`,`s`.`first_name` AS `first_name`,`s`.`last_name` AS `last_name`,`e`.`roll_number` AS `roll_number`,`ex`.`name` AS `exam_name`,`c`.`name` AS `class_name`,`sec`.`name` AS `section_name`,`ses`.`partner_id` AS `school_id`,`ses`.`name` AS `session_name`,`ses`.`is_current` AS `is_current` from (((((((`erp_report_cards` `rc` join `erp_student_enrollments` `e` on((`e`.`id` = `rc`.`student_enrollment_id`))) join `students` `s` on((`s`.`id` = `e`.`student_id`))) join `erp_class_sections` `cs` on((`cs`.`id` = `e`.`class_section_id`))) join `erp_sessions` `ses` on((`ses`.`id` = `cs`.`session_id`))) join `classes` `c` on((`c`.`id` = `cs`.`class_id`))) join `sections` `sec` on((`sec`.`id` = `cs`.`section_id`))) left join `erp_exams` `ex` on((`ex`.`id` = `rc`.`exam_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `vw_school_dashboard`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_school_dashboard` AS select `p`.`id` AS `school_id`,`p`.`partner_name` AS `school_name`,`p`.`partner_code` AS `school_code`,`p`.`partner_type` AS `partner_type`,`p`.`contact_person` AS `contact_person`,`p`.`contact_email` AS `contact_email`,`p`.`contact_phone` AS `contact_phone`,`p`.`city` AS `city`,`p`.`state` AS `state`,`p`.`affiliated_board` AS `affiliated_board`,`ses`.`id` AS `session_id`,`ses`.`name` AS `session_name`,`ses`.`start_date` AS `session_start`,`ses`.`end_date` AS `session_end`,`cs`.`id` AS `class_section_id`,`c`.`id` AS `class_id`,`c`.`name` AS `class_name`,`c`.`grade_level` AS `grade_level`,`sec`.`id` AS `section_id`,`sec`.`name` AS `section_name`,`sec`.`room_no` AS `room_no`,`cs`.`max_students` AS `max_students`,`cs`.`class_teacher_id` AS `class_teacher_id`,`ct_user`.`name` AS `class_teacher_name`,`ct_user`.`email` AS `class_teacher_email`,`s`.`id` AS `student_id`,`s`.`first_name` AS `student_first_name`,`s`.`last_name` AS `student_last_name`,`s`.`gender` AS `student_gender`,`s`.`date_of_birth` AS `student_dob`,`s`.`email` AS `student_email`,`s`.`phone` AS `student_phone`,`s`.`father_name` AS `father_name`,`s`.`mother_name` AS `mother_name`,`e`.`roll_number` AS `roll_number`,`e`.`student_type` AS `student_type`,`e`.`enrollment_date` AS `enrollment_date`,`e`.`status` AS `enrollment_status`,`sub`.`id` AS `subject_id`,`sub`.`name` AS `subject_name`,`sub`.`code` AS `subject_code`,`sub`.`teacher_id` AS `subject_teacher_id`,`st_user`.`name` AS `subject_teacher_name` from (((((((((((`partners` `p` join `erp_sessions` `ses` on(((`ses`.`partner_id` = `p`.`id`) and (`ses`.`is_current` = 1)))) join `erp_class_sections` `cs` on((`cs`.`session_id` = `ses`.`id`))) join `classes` `c` on((`c`.`id` = `cs`.`class_id`))) join `sections` `sec` on((`sec`.`id` = `cs`.`section_id`))) left join `teachers` `ct` on((`ct`.`id` = `cs`.`class_teacher_id`))) left join `users` `ct_user` on((`ct_user`.`id` = `ct`.`user_id`))) left join `erp_student_enrollments` `e` on(((`e`.`class_section_id` = `cs`.`id`) and (`e`.`status` = 'active')))) left join `students` `s` on((`s`.`id` = `e`.`student_id`))) left join `erp_subjects` `sub` on((`sub`.`class_section_id` = `cs`.`id`))) left join `teachers` `st` on((`st`.`id` = `sub`.`teacher_id`))) left join `users` `st_user` on((`st_user`.`id` = `st`.`user_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `vw_school_overview`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_school_overview` AS select `ses`.`partner_id` AS `school_id`,`p`.`partner_name` AS `partner_name`,`p`.`partner_type` AS `partner_type`,`ses`.`id` AS `session_id`,`ses`.`name` AS `session_name`,`ses`.`is_current` AS `is_current`,count(distinct `cs`.`id`) AS `total_class_sections`,count(distinct `e`.`student_id`) AS `total_students`,count(distinct `sub`.`teacher_id`) AS `total_subject_teachers`,count(distinct `sub`.`id`) AS `total_subjects`,count(distinct `ex`.`id`) AS `total_exams` from (((((`erp_sessions` `ses` join `partners` `p` on((`p`.`id` = `ses`.`partner_id`))) left join `erp_class_sections` `cs` on((`cs`.`session_id` = `ses`.`id`))) left join `erp_student_enrollments` `e` on((`e`.`class_section_id` = `cs`.`id`))) left join `erp_subjects` `sub` on((`sub`.`class_section_id` = `cs`.`id`))) left join `erp_exams` `ex` on((`ex`.`class_section_id` = `cs`.`id`))) group by `ses`.`partner_id`,`p`.`partner_name`,`p`.`partner_type`,`ses`.`id`,`ses`.`name`,`ses`.`is_current` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `vw_school_students`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_school_students` AS select `s`.`id` AS `student_id`,`s`.`first_name` AS `first_name`,`s`.`last_name` AS `last_name`,`s`.`middle_name` AS `middle_name`,`s`.`gender` AS `gender`,`s`.`date_of_birth` AS `date_of_birth`,`s`.`email` AS `email`,`s`.`phone` AS `phone`,`s`.`father_name` AS `father_name`,`s`.`mother_name` AS `mother_name`,`s`.`guardian_name` AS `guardian_name`,`s`.`guardian_phone` AS `guardian_phone`,`s`.`status` AS `student_status`,`e`.`id` AS `enrollment_id`,`e`.`roll_number` AS `roll_number`,`e`.`student_type` AS `student_type`,`e`.`enrollment_date` AS `enrollment_date`,`e`.`status` AS `enrollment_status`,`cs`.`id` AS `class_section_id`,`c`.`name` AS `class_name`,`sec`.`name` AS `section_name`,`ses`.`id` AS `session_id`,`ses`.`name` AS `session_name`,`ses`.`partner_id` AS `school_id`,`ses`.`is_current` AS `is_current` from (((((`erp_student_enrollments` `e` join `students` `s` on((`s`.`id` = `e`.`student_id`))) join `erp_class_sections` `cs` on((`cs`.`id` = `e`.`class_section_id`))) join `erp_sessions` `ses` on((`ses`.`id` = `cs`.`session_id`))) join `classes` `c` on((`c`.`id` = `cs`.`class_id`))) join `sections` `sec` on((`sec`.`id` = `cs`.`section_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `vw_school_teachers`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_school_teachers` AS select `t`.`id` AS `teacher_id`,`t`.`user_id` AS `user_id`,`u`.`name` AS `teacher_name`,`u`.`email` AS `email`,`u`.`phone_number` AS `phone_number`,`t`.`partner_id` AS `school_id`,`t`.`subject_specialization` AS `subject_specialization`,`t`.`qualification` AS `qualification`,`t`.`experience` AS `experience`,`t`.`number_of_hours` AS `number_of_hours`,`t`.`teacher_type` AS `teacher_type`,`t`.`is_freelancer` AS `is_freelancer`,`t`.`bio` AS `bio`,`t`.`profile_image` AS `profile_image`,`t`.`created_at` AS `created_at` from (`teachers` `t` join `users` `u` on((`u`.`id` = `t`.`user_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `vw_subjects`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_subjects` AS select `sub`.`id` AS `subject_id`,`sub`.`name` AS `subject_name`,`sub`.`code` AS `subject_code`,`sub`.`sort_order` AS `sort_order`,`sub`.`teacher_id` AS `teacher_id`,`u`.`name` AS `teacher_name`,`cs`.`id` AS `class_section_id`,`c`.`name` AS `class_name`,`sec`.`name` AS `section_name`,`ses`.`partner_id` AS `school_id`,`ses`.`name` AS `session_name`,`ses`.`is_current` AS `is_current` from ((((((`erp_subjects` `sub` join `erp_class_sections` `cs` on((`cs`.`id` = `sub`.`class_section_id`))) join `erp_sessions` `ses` on((`ses`.`id` = `cs`.`session_id`))) join `classes` `c` on((`c`.`id` = `cs`.`class_id`))) join `sections` `sec` on((`sec`.`id` = `cs`.`section_id`))) left join `teachers` `t` on((`t`.`id` = `sub`.`teacher_id`))) left join `users` `u` on((`u`.`id` = `t`.`user_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `vw_timetable`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_timetable` AS select `ts`.`id` AS `slot_id`,`ts`.`day_of_week` AS `day_of_week`,`ts`.`period_number` AS `period_number`,`ts`.`room_number` AS `room_number`,`tc`.`start_time` AS `start_time`,`tc`.`end_time` AS `end_time`,`tc`.`slot_type` AS `slot_type`,`tc`.`label` AS `period_label`,`sub`.`name` AS `subject_name`,`u`.`name` AS `teacher_name`,`ps`.`name` AS `staff_name`,`c`.`name` AS `class_name`,`sec`.`name` AS `section_name`,`ses`.`partner_id` AS `school_id`,`ses`.`is_current` AS `is_current` from (((((((((`erp_timetable_slots` `ts` join `erp_class_sections` `cs` on((`cs`.`id` = `ts`.`class_section_id`))) join `erp_sessions` `ses` on((`ses`.`id` = `cs`.`session_id`))) join `classes` `c` on((`c`.`id` = `cs`.`class_id`))) join `sections` `sec` on((`sec`.`id` = `cs`.`section_id`))) left join `erp_timetable_config` `tc` on(((`tc`.`partner_id` = `ses`.`partner_id`) and (`tc`.`period_number` = `ts`.`period_number`)))) left join `erp_subjects` `sub` on((`sub`.`id` = `ts`.`subject_id`))) left join `teachers` `t` on((`t`.`id` = `ts`.`teacher_id`))) left join `users` `u` on((`u`.`id` = `t`.`user_id`))) left join `partner_staff` `ps` on((`ps`.`id` = `ts`.`staff_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

-- ============================================================================
-- RE-ENABLE FOREIGN KEY CHECKS
-- ============================================================================
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- Record this migration
-- ============================================================================
INSERT INTO `schema_migrations` (`version`, `name`, `applied_at`)
VALUES ('001', 'baseline_schema', NOW())
ON DUPLICATE KEY UPDATE `applied_at` = NOW();
