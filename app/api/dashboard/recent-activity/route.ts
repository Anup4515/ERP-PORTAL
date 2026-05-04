import { NextResponse } from "next/server"
import {
  getAuthContext,
  isAuthError,
  resolveSessionId,
  isSessionError,
} from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

// Each event is normalised into this shape so the UI can render a uniform
// list. New event types just need to be added to the union and pushed onto
// the events array below.
type ActivityType =
  | "student_added"
  | "payment_received"
  | "fee_structure_created"
  | "exam_created"
  | "teacher_added"

interface ActivityItem {
  type: ActivityType
  title: string
  subtitle: string | null
  // Unix epoch milliseconds. Passed through as a number to dodge the
  // TIMESTAMP / mysql2 / Node-TZ ambiguity that returning a Date would
  // introduce — UNIX_TIMESTAMP() in MySQL returns the absolute instant in
  // seconds-since-epoch regardless of session timezone.
  timestamp: number
  href?: string
}

const PER_TYPE_LIMIT = 8       // sample size per event source
const TOTAL_LIMIT = 12         // final list shown to the user

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const sess = await resolveSessionId(request, ctx.partnerUserId)
    if (isSessionError(sess)) return sess

    if (sess.sessionId === null) {
      return NextResponse.json({ data: [] })
    }
    const sessionId = sess.sessionId

    const [students, payments, structures, exams, teachers] = await Promise.all([
      // Students added — session-scoped via enrollment
      executeQuery<{
        id: number
        first_name: string
        last_name: string
        class_name: string
        section_name: string
        ts: string | number
      }[]>(
        `SELECT s.id, s.first_name, s.last_name,
                c.name AS class_name, sec.name AS section_name,
                UNIX_TIMESTAMP(s.created_at) * 1000 AS ts
           FROM students s
           JOIN erp_student_enrollments se ON se.student_id = s.id
           JOIN erp_class_sections ecs    ON ecs.id        = se.class_section_id
           JOIN classes  c   ON c.id   = ecs.class_id
           JOIN sections sec ON sec.id = ecs.section_id
          WHERE se.partner_id = ?
            AND ecs.session_id = ?
            AND s.deleted_at IS NULL
          ORDER BY s.created_at DESC
          LIMIT ${PER_TYPE_LIMIT}`,
        [ctx.partnerUserId, sessionId]
      ),

      // Fee payments — session-scoped via fs.session_id
      executeQuery<{
        id: number
        amount: string
        first_name: string
        last_name: string
        fee_name: string
        ts: string | number
      }[]>(
        `SELECT p.id, p.amount,
                stu.first_name, stu.last_name,
                fs.name AS fee_name,
                UNIX_TIMESTAMP(p.created_at) * 1000 AS ts
           FROM erp_fee_payments p
           JOIN erp_fee_dues d              ON d.id   = p.due_id
           JOIN erp_fee_structures fs       ON fs.id  = d.structure_id
           JOIN erp_student_enrollments se  ON se.id  = d.student_enrollment_id
           JOIN students stu                ON stu.id = se.student_id
          WHERE p.partner_id = ?
            AND fs.session_id = ?
          ORDER BY p.created_at DESC
          LIMIT ${PER_TYPE_LIMIT}`,
        [ctx.partnerUserId, sessionId]
      ),

      // Fee structures created
      executeQuery<{
        id: number
        name: string
        fee_type: string
        amount: string
        recurrence: "one_time" | "monthly"
        ts: string | number
      }[]>(
        `SELECT id, name, fee_type, amount, recurrence,
                UNIX_TIMESTAMP(created_at) * 1000 AS ts
           FROM erp_fee_structures
          WHERE partner_id = ? AND session_id = ?
          ORDER BY created_at DESC
          LIMIT ${PER_TYPE_LIMIT}`,
        [ctx.partnerUserId, sessionId]
      ),

      // Exams created
      executeQuery<{
        id: number
        name: string
        class_name: string
        section_name: string
        ts: string | number
      }[]>(
        `SELECT e.id, e.name,
                c.name AS class_name, sec.name AS section_name,
                UNIX_TIMESTAMP(e.created_at) * 1000 AS ts
           FROM erp_exams e
           JOIN erp_class_sections ecs ON ecs.id = e.class_section_id
           JOIN classes  c   ON c.id   = ecs.class_id
           JOIN sections sec ON sec.id = ecs.section_id
          WHERE e.partner_id = ?
            AND ecs.session_id = ?
          ORDER BY e.created_at DESC
          LIMIT ${PER_TYPE_LIMIT}`,
        [ctx.partnerUserId, sessionId]
      ),

      // Teachers added — partner-scoped (no session FK on teachers)
      executeQuery<{
        id: number
        name: string
        ts: string | number
      }[]>(
        `SELECT t.id, u.name,
                UNIX_TIMESTAMP(t.created_at) * 1000 AS ts
           FROM teachers t
           JOIN users u ON u.id = t.user_id
          WHERE t.partner_id = ?
          ORDER BY t.created_at DESC
          LIMIT ${PER_TYPE_LIMIT}`,
        [ctx.schoolId]
      ),
    ])

    const events: ActivityItem[] = []

    for (const s of students) {
      events.push({
        type: "student_added",
        title: `${s.first_name} ${s.last_name} joined`,
        subtitle: `${s.class_name} · ${s.section_name}`,
        timestamp: Number(s.ts),
        href: "/school-admin/students",
      })
    }

    for (const p of payments) {
      const amt = Number(p.amount)
      const formattedAmt = `₹${amt.toLocaleString("en-IN", {
        maximumFractionDigits: 0,
      })}`
      events.push({
        type: "payment_received",
        title: `${formattedAmt} from ${p.first_name} ${p.last_name}`,
        subtitle: p.fee_name,
        timestamp: Number(p.ts),
        href: "/school-admin/fees",
      })
    }

    for (const f of structures) {
      const amt = Number(f.amount)
      const formattedAmt = `₹${amt.toLocaleString("en-IN", {
        maximumFractionDigits: 0,
      })}`
      const cadence = f.recurrence === "monthly" ? "/mo" : ""
      events.push({
        type: "fee_structure_created",
        title: `Fee structure created: ${f.name}`,
        subtitle: `${formattedAmt}${cadence} · ${f.fee_type}`,
        timestamp: Number(f.ts),
        href: "/school-admin/fees",
      })
    }

    for (const e of exams) {
      events.push({
        type: "exam_created",
        title: `Exam created: ${e.name}`,
        subtitle: `${e.class_name} · ${e.section_name}`,
        timestamp: Number(e.ts),
        href: "/school-admin/exams",
      })
    }

    for (const t of teachers) {
      events.push({
        type: "teacher_added",
        title: `${t.name} added as teacher`,
        subtitle: null,
        timestamp: Number(t.ts),
        href: "/school-admin/teachers",
      })
    }

    events.sort((a, b) => b.timestamp - a.timestamp)
    return NextResponse.json({ data: events.slice(0, TOTAL_LIMIT) })
  } catch (error) {
    console.error("Recent activity error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
