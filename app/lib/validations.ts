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

// ─── Fees ──────────────────────────────────────────────────────

// Keep this in sync with the FEE_TYPES select options in
// app/school-admin/fees/page.tsx — the form sends a value the backend must accept.
const FEE_TYPES = ["tuition", "admission", "transport", "exam", "other"] as const

// "YYYY-MM" or "YYYY-MM-DD" — accepted from <input type="month"> (returns YYYY-MM)
// and from regular date inputs. Both get normalised to first-of-month before
// storage so DB columns stay DATE.
const monthString = z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, "Must be YYYY-MM format")

const MAX_RECURRING_MONTHS = 36

const feeStructureBase = z.object({
  class_section_id: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
  name: z.string().min(1, "Name is required").max(128),
  fee_type: z.enum(FEE_TYPES).default("other"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  recurrence: z.enum(["one_time", "monthly"]).default("one_time"),
  due_date: z.union([dateString, z.literal(""), z.null()]).optional(),
  start_month: z.union([monthString, z.literal(""), z.null()]).optional(),
  end_month: z.union([monthString, z.literal(""), z.null()]).optional(),
  due_day_of_month: z
    .union([z.coerce.number().int().min(1).max(31), z.null()])
    .optional(),
})

// Cross-field rules applied as a refine step so the same shape works for both
// create (everything required) and update (every field optional). The check
// only runs when recurrence is present in the payload — i.e. always for create,
// only when explicitly changed for partial updates.
const refineRecurrence = (raw: unknown, ctx: z.RefinementCtx) => {
  const data = raw as Record<string, unknown>
  const r = data.recurrence
  if (r === "monthly") {
    if (!data.start_month) {
      ctx.addIssue({
        code: "custom",
        path: ["start_month"],
        message: "Start month is required for monthly fees",
      })
    }
    if (!data.end_month) {
      ctx.addIssue({
        code: "custom",
        path: ["end_month"],
        message: "End month is required for monthly fees",
      })
    }
    if (!data.due_day_of_month) {
      ctx.addIssue({
        code: "custom",
        path: ["due_day_of_month"],
        message: "Due day is required for monthly fees",
      })
    }
    if (data.start_month && data.end_month) {
      const s = String(data.start_month).slice(0, 7)
      const e = String(data.end_month).slice(0, 7)
      if (e < s) {
        ctx.addIssue({
          code: "custom",
          path: ["end_month"],
          message: "End month must be on or after start month",
        })
      } else {
        // Cap to avoid fat-finger blow-ups (e.g. 2020 → 2030 = 132 months).
        const [sy, sm] = s.split("-").map(Number)
        const [ey, em] = e.split("-").map(Number)
        const months = (ey - sy) * 12 + (em - sm) + 1
        if (months > MAX_RECURRING_MONTHS) {
          ctx.addIssue({
            code: "custom",
            path: ["end_month"],
            message: `Window cannot exceed ${MAX_RECURRING_MONTHS} months (got ${months})`,
          })
        }
      }
    }
  } else if (r === "one_time") {
    for (const k of ["start_month", "end_month", "due_day_of_month"] as const) {
      if (data[k]) {
        ctx.addIssue({
          code: "custom",
          path: [k],
          message: "Not allowed for one-time fees",
        })
      }
    }
  }
}

export const createFeeStructureSchema = feeStructureBase.superRefine(refineRecurrence)
export const updateFeeStructureSchema = feeStructureBase.partial().superRefine(refineRecurrence)

// Both fields optional. The route falls back, in order:
//   enrollment_ids → class_section_id → structure.class_section_id → whole session.
// So an empty body is valid: "assign to everyone in scope by default".
export const assignFeeStructureSchema = z.object({
  enrollment_ids: z.array(z.coerce.number().int().positive()).optional(),
  class_section_id: z.coerce.number().int().positive().optional(),
})

export const updateFeeDueSchema = z.object({
  amount_due: z.coerce.number().positive().optional(),
  status: z.enum(["pending", "partial", "paid", "waived"]).optional(),
  due_date: z.union([dateString, z.literal(""), z.null()]).optional(),
  remarks: optionalString,
})

export const recordFeePaymentSchema = z.object({
  due_id: z.coerce.number().int().positive("Due ID is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  paid_date: dateString,
  payment_mode: optionalString,
  reference_no: optionalString,
  remarks: optionalString,
})

// ─── Support queries ──────────────────────────────────────────

export const createSupportQuerySchema = z.object({
  category: z.enum(["technical", "feature", "general"]).default("general"),
  subject: z.string().min(3, "Subject must be at least 3 characters").max(200),
  message: z.string().min(10, "Please describe your query in at least 10 characters").max(5000),
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
