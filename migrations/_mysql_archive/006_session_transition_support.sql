-- Migration 006: Session Transition Support
-- Adds 'completed' enrollment status and previous_enrollment_id for enrollment continuity tracking

-- 1. Extend enrollment status enum to include 'completed'
ALTER TABLE erp_student_enrollments
  MODIFY COLUMN status ENUM('active', 'transferred', 'withdrawn', 'completed')
  DEFAULT 'active';

-- 2. Add previous_enrollment_id for enrollment continuity (linked list across sessions)
ALTER TABLE erp_student_enrollments
  ADD COLUMN previous_enrollment_id BIGINT UNSIGNED NULL AFTER partner_id;

ALTER TABLE erp_student_enrollments
  ADD CONSTRAINT fk_enrollment_previous
    FOREIGN KEY (previous_enrollment_id) REFERENCES erp_student_enrollments(id)
    ON DELETE SET NULL;

-- 3. Add index for efficient history lookups
CREATE INDEX idx_enrollment_previous ON erp_student_enrollments(previous_enrollment_id);
CREATE INDEX idx_enrollment_student_status ON erp_student_enrollments(student_id, status);
