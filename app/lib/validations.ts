import { z } from "zod"
import { NextResponse } from "next/server"

// ─── Reusable atoms ────────────────────────────────────────────

const positiveInt = z.number().int().positive()
const optionalString = z.string().optional().nullable()
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")

// ─── Schemas ───────────────────────────────────────────────────

export const createStudentSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  class_section_id: z.coerce.number().int().positive("Class section is required"),
  middle_name: optionalString,
  gender: optionalString,
  date_of_birth: z.union([dateString, z.literal(""), z.null()]).optional(),
  phone: optionalString,
  alternate_phone: optionalString,
  address: optionalString,
  city: optionalString,
  state: optionalString,
  country: optionalString,
  postal_code: optionalString,
  father_name: optionalString,
  mother_name: optionalString,
  guardian_name: optionalString,
  guardian_phone: optionalString,
  guardian_email: optionalString,
  profile_image: optionalString,
  status: optionalString,
  height: optionalString,
  weight: optionalString,
  blood_group: optionalString,
  roll_number: z.union([z.coerce.number().int(), z.null()]).optional(),
  student_type: optionalString,
})

export const createTeacherSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone_number: optionalString,
  subject_specialization: optionalString,
  qualification: optionalString,
  date_of_joining: z.union([dateString, z.literal(""), z.null()]).optional(),
})

const attendanceRecord = z.object({
  enrollment_id: z.coerce.number().int().positive("Enrollment ID is required"),
  status: z.enum(["present", "absent", "late", "half_day"], {
    message: "Status must be present, absent, late, or half_day",
  }),
  remarks: optionalString,
})

export const bulkAttendanceSchema = z.object({
  class_section_id: z.coerce.number().int().positive("Class section ID is required"),
  date: dateString,
  records: z.array(attendanceRecord).min(1, "At least one record is required"),
})

const markEntry = z.object({
  enrollment_id: z.coerce.number().int().positive("Enrollment ID is required"),
  obtained_marks: z.union([z.coerce.number().min(0), z.null()]).optional(),
  is_absent: z.boolean().optional().default(false),
})

export const bulkMarksSchema = z.object({
  exam_id: z.coerce.number().int().positive("Exam ID is required"),
  subject_id: z.coerce.number().int().positive("Subject ID is required"),
  marks: z.array(markEntry).min(1, "At least one mark entry is required"),
})

// ─── Helper ────────────────────────────────────────────────────

type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse }

export function parseOrError<T>(schema: z.ZodSchema<T>, data: unknown): ParseResult<T> {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }

  const details = result.error.issues.map((i) => ({
    field: i.path.join("."),
    message: i.message,
  }))

  return {
    success: false,
    response: NextResponse.json(
      { error: "Validation failed", details },
      { status: 400 }
    ),
  }
}
