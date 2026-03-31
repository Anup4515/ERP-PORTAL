# Admin Panel Database → School Portal — Reuse & Migration Plan

> **Database:** `dev_db` (MariaDB 11.8)
> **Approach:** Reuse existing tables + create new tables (prefixed `erp_`) in the same database
> **Migration applied:** `phase3_partner_renaming.sql` — renamed `schools` → `partners`, `school_id` → `partner_id`, dropped deprecated profile tables

---

## Existing Tables in Admin Panel (after Phase 3 migration)

| # | Table | Purpose |
|---|-------|---------|
| 1 | `users` | All user accounts (super admin, admin, consultant, school, school teacher, individual teacher) |
| 2 | `roles` | Role definitions (Super Admin, Admin, Consultant, School, School Teacher, Individual Teacher) |
| 3 | `permissions` | RBAC permissions per user/role |
| 4 | `partners` | Partner/school details (name, code, type, contact, address, logo) — **renamed from `schools`** |
| 5 | `partner_teachers` | Maps partners → teacher IDs (JSON array) — **renamed from `school_teachers`** |
| 6 | `teachers` | Teacher extended info (user_id, partner_id, specialization, qualification, experience, number_of_hours, address) |
| 7 | `teacher_availabilities` | Teacher schedule (day_of_week, start_time, end_time) |
| 8 | `teacher_feedbacks` | Teacher feedback on students |
| 9 | `classes` | Class master (name, code, partner_id, grade_level, display_order, status) — **added partner_id** |
| 10 | `sections` | Sections under classes (class_id, name, room_no) |
| 11 | `students` | Student master (name, gender, DOB, email, password, phone, parents, address, health) |
| 12 | `student_academic_sessions` | Student enrollment (student → partner, class, section, session_year, roll_number) — **school_id → partner_id** |
| 13 | `student_data_performances` | Holistic performance data (all parameters as flat columns) |
| 14 | `student_health_records` | Student health (height, weight, BMI) |
| 15 | `exam_report_cards` | Simple exam report (student, exam, subject, marks, grade) |
| 16 | `questionnaires` | Teacher questionnaires about students — **school_id → partner_id** |
| 17 | `complaints` | Complaints (teacher/school/consultant) — **renamed from `complains`, school_id → partner_id** |
| 18 | `sessions` | Laravel HTTP sessions (NOT academic sessions) |
| 19 | `password_resets` | Password reset tokens |
| 20 | `password_reset_requests` | Student password reset requests |
| 21 | `personal_access_tokens` | Laravel Sanctum API tokens |
| 22 | `migrations` | Laravel migration tracking |
| 23 | `failed_jobs` | Laravel queue failed jobs |
| 24 | `addons` | Subscription add-ons |
| 25 | `student_addons` | Student add-on purchases |
| 26 | `plans` | Subscription plans |
| 27 | `student_subscriptions` | Student subscriptions |
| 28 | `courses` | Course content |
| 29 | `course_feedback` | Student feedback on courses |
| 30 | `student_courses` | Student-course enrollment |
| 31 | `live_classes` | Live class sessions |
| 32 | `class_bookings` | Class booking (student-teacher) |
| 33 | `student_change_timing` | Schedule change requests |
| 34 | `consultant_student` | Consultant-student mapping |
| 35 | `consultent_student_documents` | Consultant shared documents |
| 36 | `advice_requests` | Student advice requests |
| 37 | `appointment_test_reminders` | Medical appointment reminders |
| 38 | `assignments` | Student assignments/quizzes |
| 39 | `certificates` | Student certificates |
| 40 | `chats` | Chat messages |
| 41 | `chat_files` | Chat file attachments |
| 42 | `contact_messages` | Public contact form messages |
| 43 | `diet_plan` | Student diet plans |
| 44 | `doctor_consultations` | Medical consultations |
| 45 | `lab_reports` | Student lab reports |
| 46 | `parent_call_summaries` | Parent call summaries |
| 47 | `features` | Feature flags |
| 48 | `workshop_webinar_calendar` | Workshop/webinar events |

**Dropped in Phase 3:** `school_profiles`, `teacher_profiles`, `teacher_details`, `consultant_profiles` (data merged into `teachers` and `partners`)

---

## Tables to REUSE (read from Admin Panel DB)

These tables already exist and contain authoritative data. The School Portal will **read from these tables** for authentication and school context.

### 1. `users` — Authentication & Login

**Reuse for:** Verifying school email/password at login.

```sql
CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,           -- login email
  `password` varchar(255) NOT NULL,        -- bcrypt hash for verification
  `phone_number` varchar(100) DEFAULT NULL,
  `role_id` bigint(20) UNSIGNED DEFAULT NULL, -- FK → roles
  `profile_photo_path` varchar(2048) DEFAULT NULL,
  `created_by` bigint(20) DEFAULT NULL,    -- who created this user
  `created_at` timestamp, `updated_at` timestamp
);
```

**Relevant role_ids for School Portal:**
- `4` = School (school_admin login)
- `5` = School Teacher (teacher login)

**How to use:** At login, query `users` where `email` matches and `role_id` IN (4, 5). Verify password with bcrypt. The `id` becomes the authenticated user.

---

### 2. `roles` — Role Definitions

**Reuse for:** Determining user role after authentication.

```sql
-- Existing roles:
-- 1 = Super Admin (ignore in school portal)
-- 2 = Admin (ignore)
-- 3 = Consultant (ignore)
-- 4 = School (→ maps to school_admin in our portal)
-- 5 = School Teacher (→ maps to teacher in our portal)
-- 6 = Individual Teacher (ignore)
```

**How to use:** After login, check `users.role_id`:
- `role_id = 4` → school_admin role in portal
- `role_id = 5` → teacher role in portal

---

### 3. `partners` — Partner/School Master Data (formerly `schools`)

**Reuse for:** Getting school/partner info for the logged-in school admin.

```sql
CREATE TABLE `partners` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,  -- FK → users (the partner's user account)
  `partner_type` enum('school','coaching','college','university','other') NOT NULL DEFAULT 'school',
  `partner_name` varchar(255) NOT NULL,    -- renamed from school_name
  `partner_code` varchar(50) DEFAULT NULL, -- renamed from school_code
  `contact_person` varchar(255) DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100), `state` varchar(100),
  `country` varchar(100), `pincode` varchar(20),
  `registration_number` varchar(100) DEFAULT NULL,  -- new in Phase 3
  `affiliated_board` varchar(255) DEFAULT NULL,      -- new in Phase 3
  `website` varchar(255) DEFAULT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `additional_info` JSON DEFAULT NULL,
  `created_at` timestamp, `updated_at` timestamp
);
```

**How to use:**
- For school_admin: `partners.user_id = users.id` → get partner id (used as school_id in session)
- For teacher: `partner_teachers.partner_id` or `teachers.partner_id` → get partner id

---

### 4. `partner_teachers` — Partner ↔ Teacher Mapping (formerly `school_teachers`)

**Reuse for:** Determining which teachers belong to which partner/school.

```sql
CREATE TABLE `partner_teachers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `partner_id` bigint(20) UNSIGNED NOT NULL,  -- FK → users (partner's user account)
  `teacher_ids` JSON DEFAULT NULL,            -- JSON array of user IDs e.g. [65, 73, 74]
  `created_at` timestamp, `updated_at` timestamp
);
```

**How to use:** When a teacher (role_id=5) logs in, look up which partner they belong to via this table (their user.id appears in `teacher_ids` JSON array). This gives us the `partner_id` to scope all portal data.

---

### 5. `teachers` — Teacher Extended Info

**Reuse for:** Teacher profile data.

```sql
CREATE TABLE `teachers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,       -- FK → users
  `partner_id` bigint(20) UNSIGNED DEFAULT NULL, -- FK → partners (renamed from school_id)
  `teacher_type` enum('school','freelancer') DEFAULT 'school',
  `subject_specialization` varchar(50) DEFAULT NULL,
  `qualification` varchar(255) DEFAULT NULL,
  `experience` int(11) DEFAULT NULL,
  `number_of_hours` int(11) DEFAULT NULL,        -- new: merged from teacher_details
  `bio` text DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,                   -- new: merged from teacher_details
  `created_at` timestamp, `updated_at` timestamp
);
```

---

### 6. `classes` — Class Master

**Reuse for:** Class list (12th, 11th, etc.).

```sql
CREATE TABLE `classes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `partner_id` bigint(20) UNSIGNED DEFAULT NULL, -- new: FK → users (partner scope)
  `name` varchar(255) NOT NULL,                  -- e.g., "12th", "11th"
  `code` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `grade_level` tinyint UNSIGNED DEFAULT NULL,   -- new: NEP stage mapping
  `display_order` smallint UNSIGNED NOT NULL DEFAULT 0, -- new
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp, `updated_at` timestamp
);
```

**Note:** Classes are now partner-scoped via `partner_id`. Filter by `partner_id` to get a school's classes.

---

### 7. `sections` — Section Master

**Reuse for:** Sections under classes.

```sql
CREATE TABLE `sections` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `class_id` bigint(20) UNSIGNED NOT NULL,  -- FK → classes
  `name` varchar(255) NOT NULL,             -- e.g., "12th A", "11 a"
  `room_no` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp, `updated_at` timestamp
);
```

---

### 8. `students` — Student Master

**Reuse for:** Core student data.

```sql
CREATE TABLE `students` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `middle_name` varchar(255) DEFAULT NULL,
  `gender` varchar(10) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `alternate_phone` varchar(20) DEFAULT NULL,
  `address` varchar(255), `city` varchar(255),
  `state` varchar(255), `country` varchar(255), `postal_code` varchar(20),
  `father_name` varchar(255) DEFAULT NULL,
  `mother_name` varchar(255) DEFAULT NULL,
  `guardian_name` varchar(255) DEFAULT NULL,
  `guardian_phone` varchar(20) DEFAULT NULL,
  `guardian_email` varchar(255) DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive','graduated','suspended'),
  `height` varchar(100), `weight` varchar(100), `blood_group` varchar(100),
  `created_at` timestamp, `updated_at` timestamp, `deleted_at` timestamp
);
```

---

### 9. `student_academic_sessions` — Student Enrollment (legacy)

**Reuse for:** Legacy student enrollment data. New enrollments use `erp_student_enrollments`.

```sql
CREATE TABLE `student_academic_sessions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,      -- FK → students
  `partner_id` bigint(20) UNSIGNED DEFAULT NULL,   -- FK → users (renamed from school_id)
  `class_id` bigint(20) UNSIGNED DEFAULT NULL,     -- FK → classes
  `section_id` bigint(20) UNSIGNED DEFAULT NULL,   -- FK → sections
  `teacher_id` bigint(20) UNSIGNED DEFAULT NULL,
  `session_year` varchar(20) NOT NULL,             -- e.g., "2025-2026"
  `admission_number` varchar(255) DEFAULT NULL,
  `admission_date` date DEFAULT NULL,
  `roll_number` varchar(255) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` timestamp, `updated_at` timestamp
);
```

---

### 10. `student_data_performances` — Holistic Ratings (partial reuse)

**Reuse for:** Reading existing holistic performance data entered via admin panel.

```sql
CREATE TABLE `student_data_performances` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) DEFAULT NULL,
  `questionnaires_id` bigint(20) UNSIGNED NOT NULL,
  -- Academic Performance
  `academic_performance` tinyint, `competition` tinyint, `consistency` tinyint,
  `test_preparedness` tinyint, `class_engagement` tinyint,
  `subject_understanding` tinyint, `homework` tinyint,
  -- Mental Parameters
  `grasping_ability` tinyint, `retention_power` tinyint,
  `conceptual_clarity` tinyint, `attention_span` tinyint, `learning_speed` tinyint,
  -- Behavioural Parameters
  `peer_interaction` tinyint, `discipline` tinyint,
  `respect_for_authority` tinyint, `motivation_level` tinyint,
  `response_to_feedback` tinyint,
  -- Physical Activity
  `stamina` tinyint, `participation_in_sports` tinyint,
  `teamwork_in_games` tinyint, `fitness_level` tinyint,
  `interest_in_activities` tinyint,
  -- Creativity & Innovation
  `initiative_in_projects` tinyint, `curiosity_level` tinyint,
  `problem_solving` tinyint, `extra_curricular` tinyint, `idea_generation` tinyint,
  -- Subject-Wise Rating
  `maths` tinyint, `science` tinyint, `english` tinyint,
  `social_studies` tinyint, `computer_science` tinyint,
  `suggestions` text, `attachment_path` varchar(255),
  `type` varchar(255),  -- 'academic_performance', 'mental_parameters', etc.
  `created_at` timestamp, `updated_at` timestamp
);
```

**Limitation:** Flat table with hardcoded columns. The portal uses normalized `erp_holistic_*` tables instead.

---

### 11. `exam_report_cards` — Exam Reports (partial reuse)

**Reuse for:** Reading existing exam/marks data.

```sql
CREATE TABLE `exam_report_cards` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `student_id` bigint(20) UNSIGNED NOT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `exam` varchar(100),
  `exam_date` date,
  `subject` varchar(100),
  `marks_obtained` int(11),
  `max_marks` int(11),
  `grade` varchar(10),
  `file_path` varchar(255),
  `description` text,
  `created_at` timestamp, `updated_at` timestamp
);
```

**Limitation:** Simple flat structure — no exam entity, no class-section scoping. The portal uses `erp_exams` / `erp_marks` instead.

---

## Tables CREATED for School Portal (prefixed `erp_`)

These tables were created in `phase3_partner_renaming.sql` for the school portal's ERP features. They use `partner_id` (FK → `users.id`) for multi-tenant scoping and `erp_class_sections` as the central anchor.

### Core Architecture

`erp_sessions` → `erp_class_sections` → `erp_student_enrollments`
- Sessions define academic years per partner
- Class-sections tie a class + section to a session with teacher assignments
- Student enrollments link students to class-sections

### 1. `erp_sessions` — Academic Sessions

```sql
CREATE TABLE `erp_sessions` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `partner_id` bigint(20) UNSIGNED NOT NULL,  -- FK → users.id
  `name` varchar(50) NOT NULL,                -- e.g., "2026-27"
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `is_current` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp, `updated_at` timestamp,
  PRIMARY KEY (`id`),
  UNIQUE KEY (`partner_id`, `name`)
);
```

### 2. `erp_class_sections` — Central Class-Section Entity

```sql
CREATE TABLE `erp_class_sections` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `session_id` bigint(20) UNSIGNED NOT NULL,        -- FK → erp_sessions.id
  `class_id` bigint(20) UNSIGNED NOT NULL,           -- FK → classes.id
  `section_id` bigint(20) UNSIGNED NOT NULL,         -- FK → sections.id
  `class_teacher_id` bigint(20) UNSIGNED DEFAULT NULL,  -- FK → users.id
  `second_incharge_id` bigint(20) UNSIGNED DEFAULT NULL, -- FK → users.id
  `max_students` int(11) NOT NULL DEFAULT 200,
  `created_at` timestamp, `updated_at` timestamp,
  PRIMARY KEY (`id`),
  UNIQUE KEY (`session_id`, `class_id`, `section_id`)
);
```

### 3. `erp_student_enrollments` — Student ↔ Class-Section Linkage

```sql
CREATE TABLE `erp_student_enrollments` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id` bigint(20) UNSIGNED NOT NULL,         -- FK → students.id
  `class_section_id` bigint(20) UNSIGNED NOT NULL,   -- FK → erp_class_sections.id
  `roll_number` int(11) DEFAULT NULL,
  `student_type` enum('promoted','new','regular','lateral_entry','transfer','repeater') NOT NULL DEFAULT 'regular',
  `enrollment_date` date DEFAULT NULL,
  `status` enum('active','transferred','withdrawn') NOT NULL DEFAULT 'active',
  `created_at` timestamp, `updated_at` timestamp,
  PRIMARY KEY (`id`),
  UNIQUE KEY (`student_id`, `class_section_id`),
  UNIQUE KEY (`class_section_id`, `roll_number`)
);
```

### 4. `erp_subjects` — Per Class-Section Subjects

```sql
CREATE TABLE `erp_subjects` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `class_section_id` bigint(20) UNSIGNED NOT NULL,   -- FK → erp_class_sections.id
  `name` varchar(100) NOT NULL,
  `code` varchar(20) DEFAULT NULL,
  `teacher_id` bigint(20) UNSIGNED DEFAULT NULL,     -- FK → users.id
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp, `updated_at` timestamp,
  PRIMARY KEY (`id`),
  UNIQUE KEY (`class_section_id`, `name`)
);
```

### 5. `erp_grading_schemes` — Grading Configuration

```sql
CREATE TABLE `erp_grading_schemes` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `partner_id` bigint(20) UNSIGNED NOT NULL,         -- FK → users.id
  `session_id` bigint(20) UNSIGNED DEFAULT NULL,     -- NULL = school-wide default
  `name` varchar(100) NOT NULL,
  `type` enum('letter','gpa','percentage','cgpa') NOT NULL DEFAULT 'letter',
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp, `updated_at` timestamp,
  PRIMARY KEY (`id`)
);
```

### 6. `erp_grading_ranges` — Grade Definitions

```sql
CREATE TABLE `erp_grading_ranges` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `grading_scheme_id` bigint(20) UNSIGNED NOT NULL,  -- FK → erp_grading_schemes.id
  `grade_label` varchar(10) NOT NULL,
  `min_percentage` decimal(5,2) NOT NULL,
  `max_percentage` decimal(5,2) NOT NULL,
  `gpa_value` decimal(4,2) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp, `updated_at` timestamp,
  PRIMARY KEY (`id`)
);
```

### 7. `erp_configurations` — Per Partner Per Session Settings

```sql
CREATE TABLE `erp_configurations` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `partner_id` bigint(20) UNSIGNED NOT NULL,         -- FK → users.id
  `session_id` bigint(20) UNSIGNED NOT NULL,         -- FK → erp_sessions.id
  `grading_scheme_id` bigint(20) UNSIGNED DEFAULT NULL,
  `max_subjects` int(11) NOT NULL DEFAULT 15,
  `max_exams` int(11) NOT NULL DEFAULT 20,
  `max_parameters` int(11) NOT NULL DEFAULT 6,
  `attendance_method` enum('daily','period_wise') NOT NULL DEFAULT 'daily',
  `start_month` tinyint(2) UNSIGNED NOT NULL DEFAULT 3,
  `marks_threshold` decimal(5,2) DEFAULT NULL,
  `created_at` timestamp, `updated_at` timestamp,
  PRIMARY KEY (`id`),
  UNIQUE KEY (`partner_id`, `session_id`)
);
```

### 8. `erp_calendar_days` — Per Class-Section Daily Calendar

```sql
CREATE TABLE `erp_calendar_days` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `class_section_id` bigint(20) UNSIGNED NOT NULL,   -- FK → erp_class_sections.id
  `date` date NOT NULL,
  `day_of_week` varchar(10) DEFAULT NULL,
  `is_holiday` tinyint(1) NOT NULL DEFAULT 0,
  `is_working_saturday` tinyint(1) NOT NULL DEFAULT 0,
  `holiday_reason` varchar(255) DEFAULT NULL,
  `created_at` timestamp, `updated_at` timestamp,
  PRIMARY KEY (`id`),
  UNIQUE KEY (`class_section_id`, `date`)
);
```

### 9. `erp_attendance_records` — Daily Student Attendance

```sql
CREATE TABLE `erp_attendance_records` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_enrollment_id` bigint(20) UNSIGNED NOT NULL, -- FK → erp_student_enrollments.id
  `date` date NOT NULL,
  `status` enum('present','absent','late','half_day') NOT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  `marked_by` bigint(20) UNSIGNED DEFAULT NULL,      -- FK → users.id
  `created_at` timestamp, `updated_at` timestamp,
  PRIMARY KEY (`id`),
  UNIQUE KEY (`student_enrollment_id`, `date`)
);
```

### 10. `erp_exams` — Exam Definitions

```sql
CREATE TABLE `erp_exams` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `class_section_id` bigint(20) UNSIGNED NOT NULL,   -- FK → erp_class_sections.id
  `name` varchar(100) NOT NULL,
  `code` varchar(20) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('upcoming','in_progress','completed') NOT NULL DEFAULT 'upcoming',
  `created_at` timestamp, `updated_at` timestamp,
  PRIMARY KEY (`id`)
);
```

### 11. `erp_exam_schedules` — Per Exam Per Subject Scheduling

```sql
CREATE TABLE `erp_exam_schedules` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `exam_id` bigint(20) UNSIGNED NOT NULL,            -- FK → erp_exams.id
  `subject_id` bigint(20) UNSIGNED NOT NULL,         -- FK → erp_subjects.id
  `exam_date` date DEFAULT NULL,
  `exam_time` time DEFAULT NULL,
  `duration_minutes` int(11) DEFAULT NULL,
  `maximum_marks` decimal(6,2) NOT NULL DEFAULT 100.00,
  `room_number` varchar(20) DEFAULT NULL,
  `comment_1` varchar(255) DEFAULT NULL,
  `comment_2` varchar(255) DEFAULT NULL,
  `comment_3` varchar(255) DEFAULT NULL,
  `created_at` timestamp, `updated_at` timestamp,
  PRIMARY KEY (`id`),
  UNIQUE KEY (`exam_id`, `subject_id`)
);
```

### 12. `erp_marks` — Student Exam Marks

```sql
CREATE TABLE `erp_marks` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `exam_id` bigint(20) UNSIGNED NOT NULL,            -- FK → erp_exams.id
  `subject_id` bigint(20) UNSIGNED NOT NULL,         -- FK → erp_subjects.id
  `student_enrollment_id` bigint(20) UNSIGNED NOT NULL, -- FK → erp_student_enrollments.id
  `maximum_marks` decimal(6,2) NOT NULL,
  `obtained_marks` decimal(6,2) DEFAULT NULL,
  `is_absent` tinyint(1) NOT NULL DEFAULT 0,
  `percentage` decimal(5,2) DEFAULT NULL,
  `grade` varchar(10) DEFAULT NULL,
  `entered_by` bigint(20) UNSIGNED DEFAULT NULL,     -- FK → users.id
  `created_at` timestamp, `updated_at` timestamp,
  PRIMARY KEY (`id`),
  UNIQUE KEY (`exam_id`, `subject_id`, `student_enrollment_id`)
);
```

### 13. `erp_holistic_parameters` — Parameter Categories

```sql
CREATE TABLE `erp_holistic_parameters` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `partner_id` bigint(20) UNSIGNED NOT NULL,         -- FK → users.id
  `name` varchar(100) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp, `updated_at` timestamp,
  PRIMARY KEY (`id`)
);
```

### 14. `erp_holistic_sub_parameters`

```sql
CREATE TABLE `erp_holistic_sub_parameters` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `parameter_id` bigint(20) UNSIGNED NOT NULL,       -- FK → erp_holistic_parameters.id
  `name` varchar(100) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp, `updated_at` timestamp,
  PRIMARY KEY (`id`)
);
```

### 15. `erp_holistic_ratings` — Monthly Student Ratings

```sql
CREATE TABLE `erp_holistic_ratings` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_enrollment_id` bigint(20) UNSIGNED NOT NULL, -- FK → erp_student_enrollments.id
  `sub_parameter_id` bigint(20) UNSIGNED NOT NULL,   -- FK → erp_holistic_sub_parameters.id
  `month` date NOT NULL,                             -- first of month (e.g., 2026-03-01)
  `rating_value` decimal(5,2) DEFAULT NULL,
  `max_rating` decimal(5,2) NOT NULL DEFAULT 10.00,
  `rating_grade` varchar(10) DEFAULT NULL,
  `comments` text DEFAULT NULL,
  `rated_by` bigint(20) UNSIGNED DEFAULT NULL,       -- FK → users.id
  `created_at` timestamp, `updated_at` timestamp,
  PRIMARY KEY (`id`),
  UNIQUE KEY (`student_enrollment_id`, `sub_parameter_id`, `month`)
);
```

### 16. `erp_parameter_stage_mappings` — NEP Pancha Kosha Stage Config

```sql
CREATE TABLE `erp_parameter_stage_mappings` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `sub_parameter_id` bigint(20) UNSIGNED NOT NULL,   -- FK → erp_holistic_sub_parameters.id
  `stage` enum('foundational','preparatory','middle','secondary') NOT NULL,
  `grade_range_start` int(11) DEFAULT NULL,
  `grade_range_end` int(11) DEFAULT NULL,
  `created_at` timestamp, `updated_at` timestamp,
  PRIMARY KEY (`id`)
);
```

### 17. `erp_reflection_prompts` — Global NEP Self-Reflection Prompts

```sql
CREATE TABLE `erp_reflection_prompts` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `stage` enum('foundational','preparatory','middle','secondary') NOT NULL,
  `prompt_text` text NOT NULL,
  `response_format` varchar(50) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp, `updated_at` timestamp,
  PRIMARY KEY (`id`)
);
```

### 18. `erp_student_reflections` — Student Responses to Prompts

```sql
CREATE TABLE `erp_student_reflections` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_enrollment_id` bigint(20) UNSIGNED NOT NULL, -- FK → erp_student_enrollments.id
  `reflection_prompt_id` bigint(20) UNSIGNED NOT NULL,  -- FK → erp_reflection_prompts.id
  `month` date NOT NULL,
  `response_text` text DEFAULT NULL,
  `response_file_path` varchar(500) DEFAULT NULL,
  `created_at` timestamp, `updated_at` timestamp,
  PRIMARY KEY (`id`)
);
```

### 19. `erp_report_cards` — Generated Report Card Metadata

```sql
CREATE TABLE `erp_report_cards` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_enrollment_id` bigint(20) UNSIGNED NOT NULL, -- FK → erp_student_enrollments.id
  `type` enum('monthly','exam','annual') NOT NULL,
  `reference_month` date DEFAULT NULL,
  `exam_id` bigint(20) UNSIGNED DEFAULT NULL,        -- FK → erp_exams.id
  `attendance_percentage` decimal(5,2) DEFAULT NULL,
  `overall_percentage` decimal(5,2) DEFAULT NULL,
  `overall_grade` varchar(10) DEFAULT NULL,
  `rank_in_class` int(11) DEFAULT NULL,
  `teacher_remarks` text DEFAULT NULL,
  `pdf_url` text DEFAULT NULL,
  `generated_by` bigint(20) UNSIGNED DEFAULT NULL,   -- FK → users.id
  `generated_at` timestamp DEFAULT NULL,
  `created_at` timestamp, `updated_at` timestamp,
  PRIMARY KEY (`id`)
);
```

### 20. `erp_audit_logs` — Audit Trail

```sql
CREATE TABLE `erp_audit_logs` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `partner_id` bigint(20) UNSIGNED DEFAULT NULL,     -- FK → users.id
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,        -- FK → users.id
  `action` enum('created','updated','deleted','viewed','exported','imported') NOT NULL,
  `entity_type` varchar(100) NOT NULL,
  `entity_id` bigint(20) UNSIGNED NOT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `created_at` timestamp DEFAULT NULL,
  PRIMARY KEY (`id`)
);
```

---

## Authentication Flow

```
Login Request (email + password)
        │
        ▼
Query `users` table
  WHERE email = ? AND role_id IN (4, 5)
        │
        ▼
Verify bcrypt password hash
        │
        ▼
Determine role:
  role_id = 4 → school_admin
  role_id = 5 → teacher
        │
        ▼
Resolve partner_id (used as school_id in session):
  If school_admin → SELECT id FROM partners WHERE user_id = users.id
    (if no partner exists → redirect to /setup-school to create profile)
  If teacher → SELECT partner_id FROM teachers WHERE user_id = users.id
              OR SELECT partner_id FROM partner_teachers WHERE JSON_CONTAINS(teacher_ids, users.id)
        │
        ▼
Create session with { user_id, school_id (= partner.id), role }
        │
        ▼
All subsequent queries scoped to partner_id
```

---

## Database Architecture

The School Portal uses the **same database** (`dev_db`, MariaDB). New tables are created alongside existing ones with `erp_` prefix.

- **Existing tables** — reused as-is (read + write where needed), with Phase 3 renames applied
- **New tables** — created with `erp_` prefix, using `erp_class_sections` as central anchor entity

> **Key architectural change:** The `erp_` tables use `erp_class_sections` (session + class + section) as the central entity. Student enrollments, subjects, exams, calendar, and attendance all link through `erp_class_sections` rather than using flat `school_id + session_year` columns.

---

## Summary

All in the same database (`dev_db`). New tables prefixed with `erp_` to avoid conflicts.

| Category | Reuse (existing tables) | Create New (`erp_` prefixed) |
|----------|:---------------------:|:----------:|
| Auth & Users | `users`, `roles` | — |
| Partner/School Info | `partners`, `partner_teachers`, `teachers` | `erp_configurations` |
| Classes & Sections | `classes`, `sections` | `erp_class_sections` |
| Students & Enrollment | `students`, `student_academic_sessions` (legacy) | `erp_student_enrollments` |
| Academic Sessions | — | `erp_sessions` |
| Subjects | — | `erp_subjects` |
| Grading | — | `erp_grading_schemes`, `erp_grading_ranges` |
| Calendar | — | `erp_calendar_days` |
| Attendance | — | `erp_attendance_records` |
| Exams | — | `erp_exams`, `erp_exam_schedules` |
| Marks | — | `erp_marks` |
| Holistic Tracking | `student_data_performances` (read-only legacy) | `erp_holistic_parameters`, `erp_holistic_sub_parameters`, `erp_holistic_ratings` |
| NEP Features | — | `erp_parameter_stage_mappings`, `erp_reflection_prompts`, `erp_student_reflections` |
| Reports | `exam_report_cards` (read-only legacy) | `erp_report_cards` |
| Audit | — | `erp_audit_logs` |
| **Total** | **10 tables reused** | **20 new tables (`erp_`)** |
