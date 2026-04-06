-- ============================================================
-- SCHOOL ERP - SQL VIEWS & SELECT QUERIES
-- Based on actual database schema (dev_db)
-- Replace @school_id with actual partner ID
-- ============================================================


-- ========================================
-- DROP EXISTING VIEWS (if any)
-- ========================================
DROP VIEW IF EXISTS vw_school_teachers;
DROP VIEW IF EXISTS vw_school_students;
DROP VIEW IF EXISTS vw_class_sections;
DROP VIEW IF EXISTS vw_subjects;
DROP VIEW IF EXISTS vw_attendance;
DROP VIEW IF EXISTS vw_marks;
DROP VIEW IF EXISTS vw_exams;
DROP VIEW IF EXISTS vw_timetable;
DROP VIEW IF EXISTS vw_report_cards;
DROP VIEW IF EXISTS vw_school_overview;
DROP VIEW IF EXISTS vw_school_dashboard;


-- ========================================
-- CREATE VIEWS
-- ========================================


-- 1. SCHOOL TEACHERS VIEW
-- teachers table uses partner_id (not school_id)
CREATE OR REPLACE VIEW vw_school_teachers AS
SELECT
    t.id AS teacher_id,
    t.user_id,
    u.name AS teacher_name,
    u.email,
    u.phone_number,
    t.partner_id AS school_id,
    t.subject_specialization,
    t.qualification,
    t.experience,
    t.number_of_hours,
    t.teacher_type,
    t.is_freelancer,
    t.bio,
    t.profile_image,
    t.created_at
FROM teachers t
JOIN users u ON u.id = t.user_id;


-- 2. SCHOOL STUDENTS VIEW (with class, section & enrollment)
CREATE OR REPLACE VIEW vw_school_students AS
SELECT
    s.id AS student_id,
    s.first_name,
    s.last_name,
    s.middle_name,
    s.gender,
    s.date_of_birth,
    s.email,
    s.phone,
    s.father_name,
    s.mother_name,
    s.guardian_name,
    s.guardian_phone,
    s.status AS student_status,
    e.id AS enrollment_id,
    e.roll_number,
    e.student_type,
    e.enrollment_date,
    e.status AS enrollment_status,
    cs.id AS class_section_id,
    c.name AS class_name,
    sec.name AS section_name,
    ses.id AS session_id,
    ses.name AS session_name,
    ses.partner_id AS school_id,
    ses.is_current
FROM erp_student_enrollments e
JOIN students s ON s.id = e.student_id
JOIN erp_class_sections cs ON cs.id = e.class_section_id
JOIN erp_sessions ses ON ses.id = cs.session_id
JOIN classes c ON c.id = cs.class_id
JOIN sections sec ON sec.id = cs.section_id;


-- 3. CLASS SECTIONS VIEW (with class teacher info)
CREATE OR REPLACE VIEW vw_class_sections AS
SELECT
    cs.id AS class_section_id,
    c.id AS class_id,
    c.name AS class_name,
    c.code AS class_code,
    c.grade_level,
    sec.id AS section_id,
    sec.name AS section_name,
    sec.room_no,
    cs.max_students,
    cs.class_teacher_id,
    u1.name AS class_teacher_name,
    cs.second_incharge_id,
    u2.name AS second_incharge_name,
    ses.id AS session_id,
    ses.name AS session_name,
    ses.partner_id AS school_id,
    ses.is_current
FROM erp_class_sections cs
JOIN erp_sessions ses ON ses.id = cs.session_id
JOIN classes c ON c.id = cs.class_id
JOIN sections sec ON sec.id = cs.section_id
LEFT JOIN teachers t1 ON t1.id = cs.class_teacher_id
LEFT JOIN users u1 ON u1.id = t1.user_id
LEFT JOIN teachers t2 ON t2.id = cs.second_incharge_id
LEFT JOIN users u2 ON u2.id = t2.user_id;


-- 4. SUBJECTS VIEW (with teacher & class)
CREATE OR REPLACE VIEW vw_subjects AS
SELECT
    sub.id AS subject_id,
    sub.name AS subject_name,
    sub.code AS subject_code,
    sub.sort_order,
    sub.teacher_id,
    u.name AS teacher_name,
    cs.id AS class_section_id,
    c.name AS class_name,
    sec.name AS section_name,
    ses.partner_id AS school_id,
    ses.name AS session_name,
    ses.is_current
FROM erp_subjects sub
JOIN erp_class_sections cs ON cs.id = sub.class_section_id
JOIN erp_sessions ses ON ses.id = cs.session_id
JOIN classes c ON c.id = cs.class_id
JOIN sections sec ON sec.id = cs.section_id
LEFT JOIN teachers t ON t.id = sub.teacher_id
LEFT JOIN users u ON u.id = t.user_id;


-- 5. ATTENDANCE VIEW
CREATE OR REPLACE VIEW vw_attendance AS
SELECT
    ar.id AS attendance_id,
    ar.date,
    ar.status AS attendance_status,
    ar.remarks,
    ar.marked_by,
    s.id AS student_id,
    s.first_name,
    s.last_name,
    e.roll_number,
    cs.id AS class_section_id,
    c.name AS class_name,
    sec.name AS section_name,
    ses.partner_id AS school_id,
    ses.name AS session_name,
    ses.is_current
FROM erp_attendance_records ar
JOIN erp_student_enrollments e ON e.id = ar.student_enrollment_id
JOIN students s ON s.id = e.student_id
JOIN erp_class_sections cs ON cs.id = e.class_section_id
JOIN erp_sessions ses ON ses.id = cs.session_id
JOIN classes c ON c.id = cs.class_id
JOIN sections sec ON sec.id = cs.section_id;


-- 6. EXAMS VIEW
CREATE OR REPLACE VIEW vw_exams AS
SELECT
    ex.id AS exam_id,
    ex.name AS exam_name,
    ex.code AS exam_code,
    ex.start_date,
    ex.end_date,
    ex.status AS exam_status,
    cs.id AS class_section_id,
    c.name AS class_name,
    sec.name AS section_name,
    ses.partner_id AS school_id,
    ses.name AS session_name,
    ses.is_current
FROM erp_exams ex
JOIN erp_class_sections cs ON cs.id = ex.class_section_id
JOIN erp_sessions ses ON ses.id = cs.session_id
JOIN classes c ON c.id = cs.class_id
JOIN sections sec ON sec.id = cs.section_id;


-- 7. MARKS VIEW
CREATE OR REPLACE VIEW vw_marks AS
SELECT
    m.id AS mark_id,
    m.obtained_marks,
    m.maximum_marks,
    m.percentage,
    m.grade,
    m.is_absent,
    m.entered_by,
    s.id AS student_id,
    s.first_name,
    s.last_name,
    e.roll_number,
    ex.id AS exam_id,
    ex.name AS exam_name,
    ex.status AS exam_status,
    sub.id AS subject_id,
    sub.name AS subject_name,
    c.name AS class_name,
    sec.name AS section_name,
    ses.partner_id AS school_id,
    ses.name AS session_name,
    ses.is_current
FROM erp_marks m
JOIN erp_student_enrollments e ON e.id = m.student_enrollment_id
JOIN students s ON s.id = e.student_id
JOIN erp_exams ex ON ex.id = m.exam_id
JOIN erp_subjects sub ON sub.id = m.subject_id
JOIN erp_class_sections cs ON cs.id = e.class_section_id
JOIN erp_sessions ses ON ses.id = cs.session_id
JOIN classes c ON c.id = cs.class_id
JOIN sections sec ON sec.id = cs.section_id;


-- 8. TIMETABLE VIEW
CREATE OR REPLACE VIEW vw_timetable AS
SELECT
    ts.id AS slot_id,
    ts.day_of_week,
    ts.period_number,
    ts.room_number,
    tc.start_time,
    tc.end_time,
    tc.slot_type,
    tc.label AS period_label,
    sub.name AS subject_name,
    u.name AS teacher_name,
    ps.name AS staff_name,
    c.name AS class_name,
    sec.name AS section_name,
    ses.partner_id AS school_id,
    ses.is_current
FROM erp_timetable_slots ts
JOIN erp_class_sections cs ON cs.id = ts.class_section_id
JOIN erp_sessions ses ON ses.id = cs.session_id
JOIN classes c ON c.id = cs.class_id
JOIN sections sec ON sec.id = cs.section_id
LEFT JOIN erp_timetable_config tc ON tc.partner_id = ses.partner_id AND tc.period_number = ts.period_number
LEFT JOIN erp_subjects sub ON sub.id = ts.subject_id
LEFT JOIN teachers t ON t.id = ts.teacher_id
LEFT JOIN users u ON u.id = t.user_id
LEFT JOIN partner_staff ps ON ps.id = ts.staff_id;


-- 9. REPORT CARDS VIEW
CREATE OR REPLACE VIEW vw_report_cards AS
SELECT
    rc.id AS report_card_id,
    rc.type AS report_type,
    rc.reference_month,
    rc.attendance_percentage,
    rc.overall_percentage,
    rc.overall_grade,
    rc.rank_in_class,
    rc.teacher_remarks,
    rc.pdf_url,
    rc.generated_at,
    s.id AS student_id,
    s.first_name,
    s.last_name,
    e.roll_number,
    ex.name AS exam_name,
    c.name AS class_name,
    sec.name AS section_name,
    ses.partner_id AS school_id,
    ses.name AS session_name,
    ses.is_current
FROM erp_report_cards rc
JOIN erp_student_enrollments e ON e.id = rc.student_enrollment_id
JOIN students s ON s.id = e.student_id
JOIN erp_class_sections cs ON cs.id = e.class_section_id
JOIN erp_sessions ses ON ses.id = cs.session_id
JOIN classes c ON c.id = cs.class_id
JOIN sections sec ON sec.id = cs.section_id
LEFT JOIN erp_exams ex ON ex.id = rc.exam_id;


-- 10. SCHOOL OVERVIEW VIEW (summary counts per session)
CREATE OR REPLACE VIEW vw_school_overview AS
SELECT
    ses.partner_id AS school_id,
    p.partner_name,
    p.partner_type,
    ses.id AS session_id,
    ses.name AS session_name,
    ses.is_current,
    COUNT(DISTINCT cs.id) AS total_class_sections,
    COUNT(DISTINCT e.student_id) AS total_students,
    COUNT(DISTINCT sub.teacher_id) AS total_subject_teachers,
    COUNT(DISTINCT sub.id) AS total_subjects,
    COUNT(DISTINCT ex.id) AS total_exams
FROM erp_sessions ses
JOIN partners p ON p.id = ses.partner_id
LEFT JOIN erp_class_sections cs ON cs.session_id = ses.id
LEFT JOIN erp_student_enrollments e ON e.class_section_id = cs.id
LEFT JOIN erp_subjects sub ON sub.class_section_id = cs.id
LEFT JOIN erp_exams ex ON ex.class_section_id = cs.id
GROUP BY ses.partner_id, p.partner_name, p.partner_type, ses.id, ses.name, ses.is_current;


-- 11. SCHOOL DASHBOARD VIEW (single view - all key data for current session)
-- One row per student-subject combination, giving a complete picture of the school
CREATE OR REPLACE VIEW vw_school_dashboard AS
SELECT
    -- School details
    p.id AS school_id,
    p.partner_name AS school_name,
    p.partner_code AS school_code,
    p.partner_type,
    p.contact_person,
    p.contact_email,
    p.contact_phone,
    p.city,
    p.state,
    p.affiliated_board,

    -- Session details
    ses.id AS session_id,
    ses.name AS session_name,
    ses.start_date AS session_start,
    ses.end_date AS session_end,

    -- Class & Section
    cs.id AS class_section_id,
    c.id AS class_id,
    c.name AS class_name,
    c.grade_level,
    sec.id AS section_id,
    sec.name AS section_name,
    sec.room_no,
    cs.max_students,

    -- Class teacher
    cs.class_teacher_id,
    ct_user.name AS class_teacher_name,
    ct_user.email AS class_teacher_email,

    -- Student details
    s.id AS student_id,
    s.first_name AS student_first_name,
    s.last_name AS student_last_name,
    s.gender AS student_gender,
    s.date_of_birth AS student_dob,
    s.email AS student_email,
    s.phone AS student_phone,
    s.father_name,
    s.mother_name,
    e.roll_number,
    e.student_type,
    e.enrollment_date,
    e.status AS enrollment_status,

    -- Subject details
    sub.id AS subject_id,
    sub.name AS subject_name,
    sub.code AS subject_code,
    sub.teacher_id AS subject_teacher_id,
    st_user.name AS subject_teacher_name

FROM partners p
JOIN erp_sessions ses ON ses.partner_id = p.id AND ses.is_current = 1
JOIN erp_class_sections cs ON cs.session_id = ses.id
JOIN classes c ON c.id = cs.class_id
JOIN sections sec ON sec.id = cs.section_id
LEFT JOIN teachers ct ON ct.id = cs.class_teacher_id
LEFT JOIN users ct_user ON ct_user.id = ct.user_id
LEFT JOIN erp_student_enrollments e ON e.class_section_id = cs.id AND e.status = 'active'
LEFT JOIN students s ON s.id = e.student_id
LEFT JOIN erp_subjects sub ON sub.class_section_id = cs.id
LEFT JOIN teachers st ON st.id = sub.teacher_id
LEFT JOIN users st_user ON st_user.id = st.user_id;


-- ========================================
-- SELECT QUERIES (replace @school_id)
-- ========================================


-- Partner (School) Info
SELECT id, user_id, partner_type, partner_name, partner_code,
       contact_person, contact_email, contact_phone,
       city, state, registration_number, affiliated_board, website
FROM partners
WHERE id = @school_id;


-- All teachers for a school
SELECT * FROM vw_school_teachers WHERE school_id = @school_id;


-- Current session students for a school
SELECT * FROM vw_school_students
WHERE school_id = @school_id AND is_current = 1;


-- Class sections for current session
SELECT * FROM vw_class_sections
WHERE school_id = @school_id AND is_current = 1;


-- Subjects with assigned teachers
SELECT * FROM vw_subjects
WHERE school_id = @school_id AND is_current = 1;


-- Attendance for a specific date
SELECT * FROM vw_attendance
WHERE school_id = @school_id AND date = '2026-04-01';


-- All exams in current session
SELECT * FROM vw_exams
WHERE school_id = @school_id AND is_current = 1;


-- Marks for a specific exam
SELECT * FROM vw_marks
WHERE school_id = @school_id AND exam_name = 'Mid Term';


-- Timetable for current session
SELECT * FROM vw_timetable
WHERE school_id = @school_id AND is_current = 1
ORDER BY day_of_week, period_number;


-- Report cards
SELECT * FROM vw_report_cards
WHERE school_id = @school_id AND is_current = 1;


-- School overview summary
SELECT * FROM vw_school_overview
WHERE school_id = @school_id AND is_current = 1;


-- ERP Sessions for a school
SELECT id, name, start_date, end_date, is_current
FROM erp_sessions
WHERE partner_id = @school_id;


-- Partner staff list
SELECT id, name, designation, department, phone, email,
       qualification, experience, status
FROM partner_staff
WHERE partner_id = @school_id;


-- Grading scheme for a school
SELECT gs.id, gs.name, gs.type, gs.is_default,
       gr.grade_label, gr.min_percentage, gr.max_percentage, gr.gpa_value
FROM erp_grading_schemes gs
JOIN erp_grading_ranges gr ON gr.grading_scheme_id = gs.id
WHERE gs.partner_id = @school_id
ORDER BY gs.id, gr.sort_order;


-- Holistic parameters & sub-parameters for a school
SELECT hp.id AS parameter_id, hp.name AS parameter_name,
       hsp.id AS sub_parameter_id, hsp.name AS sub_parameter_name
FROM erp_holistic_parameters hp
LEFT JOIN erp_holistic_sub_parameters hsp ON hsp.parameter_id = hp.id
WHERE hp.partner_id = @school_id
ORDER BY hp.sort_order, hsp.sort_order;


-- Calendar days (holidays & working saturdays) for current session
SELECT cd.date, cd.day_of_week, cd.is_holiday, cd.is_working_saturday, cd.holiday_reason
FROM erp_calendar_days cd
JOIN erp_sessions ses ON ses.id = cd.session_id
WHERE ses.partner_id = @school_id AND ses.is_current = 1
ORDER BY cd.date;


-- ERP configuration for a school
SELECT ec.id, ec.config_key, ec.config_value, ec.description
FROM erp_configurations ec
WHERE ec.partner_id = @school_id;


-- Exam schedules with subject details
SELECT es.exam_date, es.exam_time, es.duration_minutes,
       es.maximum_marks, es.room_number,
       ex.name AS exam_name, sub.name AS subject_name,
       c.name AS class_name, sec.name AS section_name
FROM erp_exam_schedules es
JOIN erp_exams ex ON ex.id = es.exam_id
JOIN erp_subjects sub ON sub.id = es.subject_id
JOIN erp_class_sections cs ON cs.id = ex.class_section_id
JOIN erp_sessions ses ON ses.id = cs.session_id
JOIN classes c ON c.id = cs.class_id
JOIN sections sec ON sec.id = cs.section_id
WHERE ses.partner_id = @school_id AND ses.is_current = 1
ORDER BY es.exam_date, es.exam_time;


-- Full school dashboard (all data in one query)
SELECT * FROM vw_school_dashboard WHERE school_id = @school_id;


-- School dashboard - unique classes & sections
SELECT DISTINCT school_id, school_name, class_name, section_name,
       class_teacher_name, max_students
FROM vw_school_dashboard
WHERE school_id = @school_id;


-- School dashboard - unique students
SELECT DISTINCT school_id, school_name, student_id, student_first_name,
       student_last_name, roll_number, class_name, section_name,
       student_type, enrollment_status
FROM vw_school_dashboard
WHERE school_id = @school_id AND student_id IS NOT NULL
ORDER BY class_name, section_name, roll_number;


-- School dashboard - unique teachers (class teachers + subject teachers)
SELECT DISTINCT school_id, school_name, subject_teacher_id AS teacher_id,
       subject_teacher_name AS teacher_name, subject_name, class_name, section_name
FROM vw_school_dashboard
WHERE school_id = @school_id AND subject_teacher_id IS NOT NULL
ORDER BY subject_teacher_name;


-- Quick school counts
SELECT
    (SELECT COUNT(*) FROM teachers WHERE partner_id = @school_id) AS total_teachers,
    (SELECT COUNT(*) FROM partner_staff WHERE partner_id = @school_id) AS total_staff,
    (SELECT COUNT(DISTINCT e.student_id)
     FROM erp_student_enrollments e
     JOIN erp_class_sections cs ON cs.id = e.class_section_id
     JOIN erp_sessions ses ON ses.id = cs.session_id
     WHERE ses.partner_id = @school_id AND ses.is_current = 1
    ) AS total_students,
    (SELECT COUNT(*)
     FROM erp_class_sections cs
     JOIN erp_sessions ses ON ses.id = cs.session_id
     WHERE ses.partner_id = @school_id AND ses.is_current = 1
    ) AS total_class_sections,
    (SELECT COUNT(*) FROM erp_sessions WHERE partner_id = @school_id) AS total_sessions;
