import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery } from "@/app/lib/db"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const body = await request.json()
    const { name, start_date, end_date } = body

    if (!name || !start_date || !end_date) {
      return NextResponse.json(
        { error: "name, start_date, and end_date are required" },
        { status: 400 }
      )
    }

    if (new Date(end_date) <= new Date(start_date)) {
      return NextResponse.json(
        { error: "end_date must be after start_date" },
        { status: 400 }
      )
    }

    // Load current session for this partner
    const currentRows = await executeQuery<
      { start_date: string | Date; end_date: string | Date }[]
    >(
      "SELECT start_date, end_date FROM erp_sessions WHERE id = ? AND partner_id = ?",
      [id, ctx.partnerUserId]
    )
    if (currentRows.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const toISO = (d: string | Date) =>
      typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10)
    const oldStart = toISO(currentRows[0].start_date)
    const oldEnd = toISO(currentRows[0].end_date)
    const newStart = String(start_date).slice(0, 10)
    const newEnd = String(end_date).slice(0, 10)
    const datesChanged = newStart !== oldStart || newEnd !== oldEnd

    if (datesChanged) {
      // Rule: dates can only shrink (or stay the same). Widening is blocked —
      // the business intent is that a session's span is fixed at creation;
      // corrections can only tighten it.
      if (newStart < oldStart || newEnd > oldEnd) {
        return NextResponse.json(
          {
            error:
              "Session dates can only be shrunk (or left unchanged), not widened.",
          },
          { status: 409 }
        )
      }

      // Safety: a shrink that would orphan recorded attendance or marks is
      // refused. If any activity falls outside the new range, the admin must
      // either widen their new range or delete the activity first.
      const boundsRows = await executeQuery<
        { earliest_activity: string | null; latest_activity: string | null }[]
      >(
        `SELECT
           MIN(activity_date) AS earliest_activity,
           MAX(activity_date) AS latest_activity
         FROM (
           SELECT ea.date AS activity_date
             FROM erp_attendance_records ea
             JOIN erp_student_enrollments ese ON ese.id = ea.student_enrollment_id
             JOIN erp_class_sections ecs ON ecs.id = ese.class_section_id
            WHERE ecs.session_id = ?
           UNION ALL
           SELECT ex.start_date AS activity_date
             FROM erp_marks em
             JOIN erp_exams ex ON ex.id = em.exam_id
             JOIN erp_class_sections ecs ON ecs.id = ex.class_section_id
            WHERE ecs.session_id = ?
         ) act`,
        [id, id]
      )
      const earliest = boundsRows[0]?.earliest_activity
        ? toISO(boundsRows[0].earliest_activity)
        : null
      const latest = boundsRows[0]?.latest_activity
        ? toISO(boundsRows[0].latest_activity)
        : null

      if (earliest && newStart > earliest) {
        return NextResponse.json(
          {
            error: `Cannot shrink start date past recorded activity (earliest activity on ${earliest}).`,
          },
          { status: 409 }
        )
      }
      if (latest && newEnd < latest) {
        return NextResponse.json(
          {
            error: `Cannot shrink end date before recorded activity (latest activity on ${latest}).`,
          },
          { status: 409 }
        )
      }
    }

    const result = await executeQuery<{ affectedRows: number }>(
      `UPDATE erp_sessions SET name = ?, start_date = ?, end_date = ?, updated_at = NOW()
       WHERE id = ? AND partner_id = ?`,
      [name, start_date, end_date, id, ctx.partnerUserId]
    )

    if ((result as any).affectedRows === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Session updated successfully" })
  } catch (error: any) {
    console.error("Session PUT error:", error)
    if (error?.code === "23505") {
      return NextResponse.json(
        { error: "A session with this name already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    // Verify session belongs to this partner
    const sessionRows = await executeQuery<{ id: number }[]>(
      "SELECT id FROM erp_sessions WHERE id = ? AND partner_id = ?",
      [id, ctx.partnerUserId]
    )
    if (sessionRows.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Check for recorded activity (attendance or marks) — never deletable
    const activityRows = await executeQuery<{ cnt: number }[]>(
      `SELECT (
         (SELECT COUNT(*) FROM erp_attendance_records ea
            JOIN erp_student_enrollments ese ON ese.id = ea.student_enrollment_id
            JOIN erp_class_sections ecs ON ecs.id = ese.class_section_id
           WHERE ecs.session_id = ?)
         +
         (SELECT COUNT(*) FROM erp_marks em
            JOIN erp_exams ex ON ex.id = em.exam_id
            JOIN erp_class_sections ecs ON ecs.id = ex.class_section_id
           WHERE ecs.session_id = ?)
       ) AS cnt`,
      [id, id]
    )
    if ((activityRows[0]?.cnt ?? 0) > 0) {
      return NextResponse.json(
        { error: "Cannot delete session: attendance or marks have been recorded." },
        { status: 409 }
      )
    }

    // Check for enrolled students — block if any exist
    const enrollmentRows = await executeQuery<{ cnt: number }[]>(
      `SELECT COUNT(*) AS cnt
         FROM erp_student_enrollments ese
         JOIN erp_class_sections ecs ON ecs.id = ese.class_section_id
        WHERE ecs.session_id = ?`,
      [id]
    )
    if ((enrollmentRows[0]?.cnt ?? 0) > 0) {
      return NextResponse.json(
        { error: "Cannot delete session: students are enrolled in its class sections." },
        { status: 409 }
      )
    }

    // Check for linked class sections (setup-only, no students yet)
    const linkedRows = await executeQuery<{ cnt: number }[]>(
      "SELECT COUNT(*) as cnt FROM erp_class_sections WHERE session_id = ?",
      [id]
    )
    if (linkedRows[0].cnt > 0) {
      return NextResponse.json(
        { error: "Cannot delete session: classes are linked to it. Remove them first." },
        { status: 409 }
      )
    }

    await executeQuery(
      "DELETE FROM erp_sessions WHERE id = ? AND partner_id = ?",
      [id, ctx.partnerUserId]
    )

    return NextResponse.json({ message: "Session deleted successfully" })
  } catch (error) {
    console.error("Session DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
