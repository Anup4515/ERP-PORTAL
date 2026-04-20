# Partners Portal — Platform Overview

A brief, meeting-ready explanation of what the platform is and how it works
end-to-end.

---

## 1. What the platform is (30-second pitch)

**Partners Portal is a multi-tenant school-ERP SaaS.** Each school ("partner")
gets an isolated workspace where the school admin manages academics and
teachers run day-to-day operations. The whole system is organized around an
**academic session** — every piece of data (students, exams, attendance,
timetable) is scoped to a session so history stays intact year-over-year.

**Two portals in one app:**
- **School Admin portal** (`/school-admin/*`) — full administrative control.
- **Teacher portal** (`/teacher/*`) — focused on classes the teacher is
  assigned to.

**Tech stack:** Next.js 16 (App Router) · React 19 · TypeScript · NextAuth v5 ·
MySQL · Tailwind v4.

---

## 2. Users & Roles

| Role | role_id | Logs in via | What they do |
|---|---|---|---|
| School Admin | 4 | `/login` | Runs the school: sessions, students, teachers, exams, reports. |
| Teacher | 5 | `/login` | Marks attendance, enters marks, views timetable + assigned students. |

Both roles share the same login screen. The platform detects the role from
the database and routes them to the right portal automatically.

---

## 3. How authentication works

**Login flow:**
1. User enters email + password on `/login`.
2. NextAuth's Credentials provider looks up the user in the `users` table.
3. Password is verified with **bcrypt** (passwords are never stored in plain
   text).
4. On success, a **JWT is issued** and stored in an `httpOnly` secure cookie
   (`authjs.session-token`). Session lasts **24 hours**.
5. The JWT payload carries `user_id`, `role`, `school_id` — enough for the
   server to identify the user on every subsequent request without a DB hit.

**Security guards in place:**
- **Rate limit on login** — 5 attempts per IP per minute (`middleware.ts`).
  Blocks brute-force/credential-stuffing.
- **Password hashing** — bcrypt with salt (one-way, slow).
- **Role-based edge routing** — before a page even renders, middleware checks
  the cookie and redirects:
  - Not logged in → `/login`
  - School admin without a school profile yet → `/setup-partner`
  - Teacher trying to open admin pages → bounced to teacher dashboard
  - Admin trying to open teacher pages → bounced to admin dashboard
- **Parameterized SQL queries** — every query uses placeholders, so SQL
  injection isn't possible.
- **Partner-scoped data** — every database query is scoped to the logged-in
  user's school. No way to accidentally see another school's data.

---

## 4. First-time onboarding (new school admin)

```
Admin signs up   →   Logs in          →   No school profile yet?
                                              │
                                              ▼
                                      Redirected to /setup-partner
                                              │
                                      Fills school details:
                                       • School name
                                       • Contact person, email, phone
                                       • Address, city, state, pincode
                                       • Registration number, board
                                              │
                                              ▼
                                      Partner record created
                                              │
                                              ▼
                                      Lands on /school-admin/dashboard
```

After this one-time setup, the admin can create their first academic session
and start adding classes, teachers, and students.

---

## 5. Academic Sessions — the core concept

**This is the most important idea in the platform.** Everything is scoped
to a session: enrollments, exams, marks, attendance, timetable, calendar.

- A **session** = one academic year, e.g. "2026–27" with `start_date` and
  `end_date`.
- A school has **one current session** at any time (`is_current = 1`).
- When a session is created, a **calendar is auto-generated** for every day
  between start and end dates, with Sundays pre-marked as holidays.

Managed from **Settings → Sessions**:

### 5.1 The three states

| State | Meaning | Indicator in UI |
|---|---|---|
| **Inactive** | Created but not live. Writes don't flow here. Can be edited/deleted freely (if empty). | Grey "Inactive" badge. **Set Current** button visible. |
| **Current** | The live session. All new enrollments, attendance, marks, exams are recorded under it. Exactly one per school. | Green "Current" badge. **Set Current** button hidden. |
| **Past** | Was previously current, now superseded (typically via Session Transition). Still queryable but the UI treats writes as read-only. | Grey "Inactive" badge. Distinguished by dates (end_date < today). |

The schema doesn't have a dedicated "past" flag — "past" just means `is_current = 0` with historical data attached.

### 5.2 What each button does

Referring to the Settings → Sessions screen:

| Button | What happens on click |
|---|---|
| **Add Session** | Opens a form (name, start date, end date). On save: a row is inserted with `is_current = 0`, and a **calendar is auto-populated** for every date in the range — Sundays are pre-marked as holidays. Duplicate names are rejected (409). |
| **Session Transition** | Opens the year-end wizard. See §5.3 for the full 9-step flow. This is the "graduate the year" operation — it creates the *next* session and cascades changes for all students. |
| **Set Current** | Flips `is_current = 0` on every other session and `is_current = 1` on this one. Instantly changes what "the current session" means across the entire app — dashboards, enrollments, attendance all re-scope. |
| **Edit** | Rename or adjust start/end dates. Guarded: if the session already has recorded attendance or marks, dates can only be **widened** (earlier start or later end). Narrowing is blocked with a 409 so real data isn't orphaned outside the range. |
| **Delete** | Removes the session. Heavily guarded — blocked if *any* of these exist: attendance records, marks, student enrollments, or linked class-sections. In practice only freshly-created empty sessions can be deleted. |

### 5.3 What happens during "Session Transition"

This is the most complex operation in the platform. Runs entirely inside **one DB transaction** — either every step succeeds or nothing changes.

```
 Source (Current)               Target (next year)
 ───────────────────────────────────────────────────────────────
                                  ┌─────────────────────────┐
                                  │ 1. Create target session│  is_current=0
                                  │    (inactive initially) │
                                  └───────────┬─────────────┘
                                              │
 2. Clone every class-section ────────────────┤   carry class_teacher +
                                              │   second_incharge if selected
                                              │
 3. Clone subjects (optional) ────────────────┤   keep teacher_id if selected
                                              │
 4. Clone timetable slots (optional) ─────────┤
                                              │
 5. Clone grading-scheme config (optional) ───┤
                                              │
 6. Mark every active enrollment              │
    in source as status = 'completed'         │
                                              │
 7. Per student (wizard decides):             │
      • promoted  → new enrollment (type = 'promoted')
      • detained  → new enrollment, same class (type = 'repeater')
      • graduated → NO new enrollment (student done here)
                                              │
 8. Generate calendar for target session ─────┤   Sundays pre-marked
                                              │
 9. Flip is_current: source → 0, target → 1 ──┘
```

The **Preview** endpoint (`GET /api/sessions/[id]/transition/preview`) is called when the wizard opens — it returns every class-section, subject, teacher assignment and student list the admin needs to make decisions, plus all available target classes/sections for promotion mapping. No side effects on preview.

Return payload from the actual transition:
```json
{
  "target_session_id": 5,
  "class_sections_created": 12,
  "students_promoted": 287,
  "students_detained": 4,
  "students_graduated": 42,
  "enrollments_completed": 333
}
```

### 5.4 Viewing past sessions

After a transition, the previous session's data is preserved intact —
students, attendance, marks, exams are all still there, still queryable.
The **session switcher** (top-right of every page) lets admins and teachers
pick a session to view; on a non-current session the app shows a
**Read-Only banner** so nobody accidentally tries to edit history. Writes
to non-current sessions are also blocked server-side
(`ensureCurrentSession` guard).

### 5.5 Why this lifecycle matters

- **History is preserved.** A transcript for a student who joined in
  2024 can be regenerated years later because `erp_student_enrollments`
  rows are kept and marked `completed` — never deleted.
- **Current-year reporting stays clean.** The dashboard never accidentally
  mixes last year's attendance into this year's stats — every query scopes
  by `session_id`.
- **Repeaters are first-class.** A detained student gets a new enrollment
  with `student_type = 'repeater'`, so you can tell them apart from
  first-time students in the same class.
- **Graduated vs. transferred vs. deleted** are all distinguishable.
  Graduation leaves the `completed` enrollment and creates no new one;
  a transfer creates an enrollment in a new class; deletion soft-deletes
  the student. Three different states, three different trails.
- **Guardrails prevent corruption.** You can't narrow a session whose
  dates already bracket real attendance; you can't delete a session with
  recorded activity. The admin is protected from their own mistakes.

---

## 6. What the School Admin can do

The admin side-nav gives access to every management screen:

| Area | What's there | Key actions |
|---|---|---|
| **Dashboard** | High-level stats | Total students, teachers, classes, today's attendance %, upcoming exams |
| **Sessions** | Academic year management | Create session, set current, preview transition, view past |
| **Classes & Sections** | Class hierarchy | Create "Grade 10", add sections A/B/C, assign room numbers |
| **Subjects** | Per class-section | Create subjects, optionally assign a subject teacher |
| **Teachers** | Teacher management | Create teacher login, set specialization/qualification, reset password, delete |
| **Teacher Assignments** | Role mapping | Assign class teacher & second-incharge per class-section |
| **Students** | Student management | Add/edit/soft-delete students, bulk CSV import, Excel export, filter by class |
| **Student Enrollments** | Student ↔ class-section link | Transfer student to another class, activate/deactivate enrollment |
| **Staff** | Non-teaching staff | Librarians, admin staff, etc. — name, designation, department |
| **Calendar** | Working days | Mark holidays (custom dates), view auto-generated Sundays |
| **Timetable** | Weekly schedule | Configure periods per day, assign subjects & teachers to each slot |
| **Grading** | Evaluation system | Create grading scheme (percentage-based), set ranges (90–100 = A+, etc.) |
| **Holistic Evaluation** | Non-academic rating | Define parameters (e.g. "Physical Development") & sub-parameters ("Fine Motor Skills"), give monthly ratings |
| **Exams** | Exam lifecycle | Create exam, schedule per subject per class-section, mark complete |
| **Marks** | Score entry | Bulk entry per exam + subject, view stats, see class rank |
| **Attendance** | Daily attendance | Bulk mark (present/absent/late/half-day) per class per day |
| **Reports** | Printable reports | Per-student exam report, monthly attendance summary, annual performance; PDF & bulk PDF |
| **Settings** | School profile | Edit school info, contact, address, board affiliation |

---

## 7. What the Teacher can do

Teachers have a deliberately smaller surface. They only see and act on data
for **classes they are assigned to** (as class teacher, second-incharge, or
subject teacher).

| Area | What's there |
|---|---|
| **Dashboard** | Stats scoped to their classes — class count, student count |
| **My Classes** | List of class-sections they own, with their role (Class Teacher / Second Incharge / Subject Teacher) |
| **Students** | Read view of students in their classes |
| **Attendance** | Mark today's attendance for any class they own (bulk UI) |
| **Timetable** | Their personal weekly schedule |

**Teachers cannot:**
- Create or delete students, classes, teachers, subjects.
- See data for classes they're not assigned to.
- Access admin settings, grading schemes, exam scheduling.
- Edit data for a past session.

The server enforces these limits regardless of UI — APIs check role on every
request.

---

## 8. Data flow example: marking daily attendance

```
Teacher opens "Attendance" for Class 10-A
  → Frontend calls GET /api/teacher/attendance?class_section_id=…&month=…
      ↳ Backend checks: is this user a teacher?
      ↳ Is this class-section one they're assigned to?
      ↳ If yes, returns the month's existing attendance grid

Teacher marks present/absent/late for each student, clicks Save
  → Frontend calls POST /api/teacher/attendance/bulk
    with { class_section_id, date, records: [{ enrollment_id, status, remarks }] }
      ↳ Backend validates payload with Zod
      ↳ Checks the teacher owns this class-section
      ↳ Checks the date is in the current session (not historical)
      ↳ Checks the date isn't a holiday (from calendar)
      ↳ Upserts into erp_attendance_records
      ↳ Returns success count

Attendance now counts toward monthly summary, dashboard %, and reports.
```

Same pattern for marks, bulk student import, exam scheduling, etc. —
authenticate → authorize → validate → write → return.

---

## 9. Multi-tenant isolation (how we keep schools separate)

The platform is **one codebase serving many schools**. Isolation is enforced
at three layers:

1. **Session level** — every JWT carries the user's `school_id`; middleware
   rejects any user without one.
2. **Query level** — every SQL read has `WHERE partner_id = ?` or joins
   through `erp_sessions.partner_id = ?`. There is literally no query that
   reads data without a partner filter.
3. **Ownership checks** — writes re-verify the resource belongs to the caller
   before modifying (e.g. "is this class-section owned by your partner?").

Net effect: two schools sharing the same server **cannot see each other's
data** even if they know the IDs.

---

## 10. Reports & exports

- **Per-student exam report** — all subjects, obtained vs max, grade, class
  rank, overall percentage. Generated as PDF.
- **Monthly attendance report** — grid of working days × students with
  status marks.
- **Annual performance report** — aggregated across all exams in a session.
- **Bulk PDF** — one click to generate per-student PDFs for an entire class.
- **Excel student export** — filtered student list as `.xlsx`.

Reports are computed on-demand from live data (no staleness) but this is
also the area that will need background-job infrastructure as the platform
scales.

---

## 11. Quick demo script (what to click through in a meeting)

If you want to screen-share, this path shows off the full loop in ~4 minutes:

1. **Log in** as school admin (`lakshay@school.com`) — show the dashboard
   loads with live stats.
2. **Open the session switcher** (top-right) — explain: "Data is scoped to
   the current session. Past sessions are viewable read-only."
3. **Click "Classes"** — show the class list, open one class, show its
   sections + subjects + assigned teachers.
4. **Click "Students"** — show the table with filters, then click "Add
   Student" to show the validated form.
5. **Click "Attendance"** — show bulk marking UI, pick a date, mark a few
   students, save. Explain holidays are pre-blocked.
6. **Click "Exams" → pick one → "Enter Marks"** — show subject-wise entry.
7. **Click "Reports" → pick a student → "Generate PDF"** — download the PDF.
8. **Log out, log in as teacher** (`lakshay@gmail.com`) — show the smaller,
   scoped view. Same data, different lens.
9. **Open DevTools → Application → Cookies** (if technical audience) — show
   the `httpOnly` `authjs.session-token` to demonstrate that sessions are
   server-validated, not localStorage.

---

## 12. One-line takeaways to close the meeting with

- **"It's a multi-tenant school ERP — one platform, many isolated schools."**
- **"Every feature is built around an academic session, so history is
  preserved every year without overwriting."**
- **"Authentication is NextAuth + bcrypt + edge-level rate limiting; data
  isolation is enforced in every SQL query."**
- **"Admins manage the school; teachers manage their classes — the
  portal adapts to the role automatically."**
