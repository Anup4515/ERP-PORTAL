# ERP Portal — Implementation Plan

> **Context:** Partners (schools, coaching centers, colleges, universities) are created by a separate Admin Portal (already in production). This portal is exclusively for partner staff — `school_admin` (principal/office) and `teacher`.
>
> **Database:** `dev_db` (MariaDB 11.8) — shared with Admin Portal. ERP-specific tables use `erp_` prefix. See `old_database.md` for full schema reference.
>
> **Key entities:** `users` (auth), `partners` (formerly `schools`), `partner_teachers` (formerly `school_teachers`), `teachers`, `classes`, `sections`, `students` — all reused from Admin Portal. New `erp_*` tables handle sessions, enrollments, subjects, exams, marks, attendance, holistic development, and reports.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript 5 |
| **Database** | MariaDB 11.8 via `mysql2/promise` (raw SQL, no ORM) |
| **Auth** | NextAuth.js (Credentials provider) + JWT session |
| **UI** | Tailwind CSS + Heroicons |
| **PDF Generation** | @react-pdf/renderer |

---

## Core Lib Modules

```
app/lib/
├── db.ts            # MySQL connection pool (mysql2/promise)
│                    #   - getDbPool() — cached on globalThis for HMR persistence
│                    #   - executeQuery<T>(sql, params) — parameterized queries
│                    #   - executeTransaction(callback) — ACID transactions with rollback
│                    #   - Connection limit: 10, charset: utf8mb4, timezone: UTC
│
├── auth.ts          # NextAuth.js configuration
│                    #   - Credentials provider (email + password)
│                    #   - JWT session strategy (24h expiry)
│                    #   - JWT payload: { user_id, school_id (= partner.id), role, name, email }
│                    #   - authorize(): query users table, verify bcrypt, resolve partner_id
│                    #   - school_id can be null for new school_admin (no partner profile yet)
│
├── session.ts       # Session helpers
│                    #   - getSession() — server-side via getServerSession
│                    #   - getSchoolId(session) — extract school_id (partner.id)
│                    #   - getRole(session) — extract role
│                    #   - requireAuth() — throw 401 if no session
│                    #   - requireRole('school_admin') — throw 403 if wrong role
│
├── api-client.ts    # Frontend fetch wrapper
│                    #   - get, post, put, del methods
│                    #   - Consistent JSON response: { data, error, message }
│
└── utils.ts         # General utilities
```

---

## API Architecture

All APIs live under `app/api/`. Every API route:
- Verifies session via `requireAuth()` (reject 401 if no session)
- Extracts `school_id` (= `partner.id`) from session JWT
- Checks role (`school_admin` vs `teacher`) for write operations
- Returns consistent JSON: `{ data, error, message }`
- Uses parameterized queries (`?` placeholders) to prevent SQL injection

**Key DB relationships for queries:**
- Partner scoping: `erp_sessions.partner_id = session.user.school_id`
- Class-section: `erp_class_sections` joins `erp_sessions` + `classes` + `sections`
- Student roster: `erp_student_enrollments` joins `students` + `erp_class_sections`
- Teacher scoping: `erp_class_sections.class_teacher_id` or `erp_subjects.teacher_id`

**API pattern example:**
```typescript
// app/api/students/route.ts
import { executeQuery } from '@/app/lib/db'
import { requireAuth, getSchoolId } from '@/app/lib/session'

export async function GET(request: Request) {
  const session = await requireAuth()
  const partnerId = getSchoolId(session) // partner.id

  const students = await executeQuery(
    `SELECT s.*, e.roll_number, c.name as class_name, sec.name as section_name
     FROM students s
     JOIN erp_student_enrollments e ON s.id = e.student_id
     JOIN erp_class_sections cs ON e.class_section_id = cs.id
     JOIN erp_sessions sess ON cs.session_id = sess.id
     JOIN classes c ON cs.class_id = c.id
     JOIN sections sec ON cs.section_id = sec.id
     WHERE sess.partner_id = ? AND sess.is_current = 1`,
    [partnerId]
  )
  return Response.json({ data: students })
}
```

---

## Folder Structure

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── forgot-password/page.tsx
│
├── setup-partner/                    # New partner profile creation (first-time login)
│   ├── layout.tsx                    # Guards: requires school_admin + no partner profile
│   └── page.tsx                      # Partner setup form
│
├── school-admin/                     # Partner admin pages
│   ├── layout.tsx                    # DashboardLayout with admin sidebar
│   ├── dashboard/page.tsx
│   ├── settings/[tab]/page.tsx       # Dynamic: school-profile, sessions, classes, subjects, grading, holistic-params
│   ├── teachers/page.tsx
│   ├── teachers/[id]/page.tsx
│   ├── students/page.tsx
│   ├── students/[id]/page.tsx
│   ├── attendance/page.tsx
│   ├── attendance/[view]/page.tsx    # Dynamic: monthly, summary
│   ├── calendar/page.tsx
│   ├── exams/page.tsx
│   ├── exams/[id]/page.tsx
│   ├── marks/page.tsx
│   ├── marks/[view]/page.tsx         # Dynamic: overview, stats
│   ├── holistic/page.tsx
│   ├── holistic/[paramId]/page.tsx
│   └── reports/[type]/page.tsx       # Dynamic: monthly, exam, annual
│
├── teacher/                          # Teacher pages (same structure, scoped to assigned classes)
│   ├── layout.tsx
│   ├── dashboard/page.tsx
│   ├── students/page.tsx
│   ├── students/[id]/page.tsx
│   ├── attendance/page.tsx
│   ├── attendance/[view]/page.tsx
│   ├── marks/page.tsx
│   ├── marks/[view]/page.tsx
│   ├── holistic/page.tsx
│   ├── holistic/[paramId]/page.tsx
│   └── reports/[type]/page.tsx
│
├── api/                              # All API route handlers
│   ├── auth/
│   │   ├── [...nextauth]/route.ts
│   │   ├── profile/route.ts
│   │   └── forgot-password/route.ts
│   ├── partner/
│   │   ├── profile/route.ts          # GET, PUT partner info
│   │   └── setup/route.ts            # POST create new partner profile
│   ├── sessions/
│   │   ├── route.ts                  # GET list, POST create → erp_sessions
│   │   ├── [id]/route.ts             # GET, PUT, DELETE
│   │   └── [id]/set-current/route.ts # POST set as active session
│   ├── classes/
│   │   ├── route.ts                  # GET list, POST create → classes + erp_class_sections
│   │   ├── [id]/route.ts
│   │   └── [id]/sections/route.ts    # GET sections, POST add section → sections + erp_class_sections
│   ├── sections/
│   │   └── [id]/route.ts
│   ├── teachers/
│   │   ├── route.ts                  # GET list, POST create → users + partner_teachers + teachers
│   │   ├── [id]/route.ts
│   │   └── [id]/assignments/route.ts # GET, PUT class/subject assignments
│   ├── subjects/
│   │   ├── route.ts                  # GET list, POST create → erp_subjects
│   │   └── [id]/route.ts
│   ├── grading/
│   │   ├── schemes/
│   │   │   ├── route.ts              # → erp_grading_schemes
│   │   │   └── [id]/route.ts
│   │   └── ranges/
│   │       ├── route.ts              # → erp_grading_ranges
│   │       └── [id]/route.ts
│   ├── students/
│   │   ├── route.ts                  # → students + erp_student_enrollments
│   │   ├── [id]/route.ts
│   │   ├── [id]/enrollments/route.ts # → erp_student_enrollments
│   │   ├── import/route.ts
│   │   └── export/route.ts
│   ├── enrollments/
│   │   └── [id]/route.ts             # PUT update, DELETE → erp_student_enrollments
│   ├── calendar/
│   │   ├── route.ts                  # → erp_calendar_days (via erp_class_sections)
│   │   ├── generate/route.ts         # POST auto-generate
│   │   ├── holidays/route.ts         # PUT bulk toggle
│   │   └── [id]/route.ts
│   ├── attendance/
│   │   ├── route.ts                  # → erp_attendance_records (via erp_student_enrollments)
│   │   ├── bulk/route.ts
│   │   ├── monthly/route.ts
│   │   └── summary/route.ts
│   ├── exams/
│   │   ├── route.ts                  # → erp_exams (via erp_class_sections)
│   │   ├── [id]/route.ts
│   │   └── [id]/schedule/
│   │       ├── route.ts              # → erp_exam_schedules
│   │       └── [subjectId]/route.ts
│   ├── marks/
│   │   ├── route.ts                  # → erp_marks (via erp_student_enrollments)
│   │   ├── bulk/route.ts
│   │   ├── overview/route.ts
│   │   ├── student/[id]/route.ts
│   │   └── stats/route.ts
│   ├── holistic/
│   │   ├── parameters/
│   │   │   ├── route.ts              # → erp_holistic_parameters
│   │   │   └── [id]/route.ts
│   │   ├── sub-parameters/
│   │   │   ├── route.ts              # → erp_holistic_sub_parameters
│   │   │   └── [id]/route.ts
│   │   └── ratings/
│   │       ├── route.ts              # → erp_holistic_ratings (via erp_student_enrollments)
│   │       ├── bulk/route.ts
│   │       └── student/[id]/route.ts
│   ├── reports/
│   │   ├── [type]/route.ts           # → erp_report_cards + aggregated data
│   │   └── pdf/
│   │       ├── route.ts
│   │       └── bulk/route.ts
│   ├── dashboard/
│   │   └── [role]/route.ts
│   └── export/
│       └── [type]/route.ts
│
├── components/
│   ├── layouts/
│   │   └── DashboardLayout.tsx       # Shared sidebar layout (role-aware)
│   ├── providers/
│   │   └── SessionProvider.tsx       # NextAuth SessionProvider wrapper
│   └── shared/                       # Reusable UI components
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── ConfirmDialog.tsx
│       ├── DataTable.tsx
│       ├── EmptyState.tsx
│       ├── Input.tsx
│       ├── LoadingSkeleton.tsx
│       ├── Modal.tsx
│       ├── Select.tsx
│       ├── StatsCard.tsx
│       ├── Tabs.tsx
│       └── index.ts
│
├── lib/                              # Core utilities (described above)
├── types/index.ts                    # All TypeScript interfaces + NextAuth module augmentation
└── validations/index.ts              # Zod schemas for form/API validation
```

**Dynamic params usage:**

| Pattern | Example URLs | `params` resolves to |
|---------|-------------|---------------------|
| `settings/[tab]` | `/settings/school-profile`, `/settings/sessions`, `/settings/classes` | `{ tab: 'sessions' }` |
| `teachers/[id]` | `/teachers/86` | `{ id: '86' }` |
| `students/[id]` | `/students/42` | `{ id: '42' }` |
| `exams/[id]` | `/exams/3` | `{ id: '3' }` |
| `attendance/[view]` | `/attendance/monthly`, `/attendance/summary` | `{ view: 'monthly' }` |
| `marks/[view]` | `/marks/overview`, `/marks/stats` | `{ view: 'overview' }` |
| `holistic/[paramId]` | `/holistic/1` (Physical), `/holistic/2` (Academic) | `{ paramId: '1' }` |
| `reports/[type]` | `/reports/monthly`, `/reports/exam`, `/reports/annual` | `{ type: 'exam' }` |

**Sidebar items:**
```typescript
const ADMIN_SIDEBAR = [
  { label: 'Dashboard',  href: '/school-admin/dashboard',  icon: HomeIcon },
  { label: 'Teachers',   href: '/school-admin/teachers',   icon: UserGroupIcon },
  { label: 'Students',   href: '/school-admin/students',   icon: AcademicCapIcon },
  { label: 'Attendance', href: '/school-admin/attendance',  icon: ClipboardDocumentCheckIcon },
  { label: 'Calendar',   href: '/school-admin/calendar',   icon: CalendarDaysIcon },
  { label: 'Exams',      href: '/school-admin/exams',      icon: DocumentTextIcon },
  { label: 'Marks',      href: '/school-admin/marks',      icon: ChartBarIcon },
  { label: 'Holistic',   href: '/school-admin/holistic',   icon: SparklesIcon },
  { label: 'Reports',    href: '/school-admin/reports',    icon: DocumentChartBarIcon },
  { label: 'Settings',   href: '/school-admin/settings',   icon: Cog6ToothIcon },
]

const TEACHER_SIDEBAR = [
  { label: 'Dashboard',  href: '/teacher/dashboard',       icon: HomeIcon },
  { label: 'Students',   href: '/teacher/students',        icon: AcademicCapIcon },
  { label: 'Attendance', href: '/teacher/attendance',       icon: ClipboardDocumentCheckIcon },
  { label: 'Marks',      href: '/teacher/marks',           icon: ChartBarIcon },
  { label: 'Holistic',   href: '/teacher/holistic',        icon: SparklesIcon },
  { label: 'Reports',    href: '/teacher/reports',         icon: DocumentChartBarIcon },
]
```

---

## Phase 1: Authentication & Login

> Goal: Users can log in, new partners can create their profile, and the dashboard shell is ready.

### 1.1 Project Setup
- [x] Initialize Next.js 15 project with TypeScript
- [x] Install dependencies: `mysql2`, `next-auth`, `bcryptjs`, `tailwindcss`, `@heroicons/react`
- [x] Configure Tailwind theme (primary: `#1A2658` dark blue, accent: `#F0C227` yellow)
- [x] Set up folder structure (as above)
- [x] Create shared UI components (Button, Card, Input, Select, Modal, DataTable, etc.)

### 1.2 Database Connection
- [x] Create `app/lib/db.ts` — MySQL pool with `mysql2/promise`
- [x] Env vars: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- [ ] Verify all reused tables accessible: `users`, `partners`, `partner_teachers`, `teachers`, `classes`, `sections`, `students`
- [ ] Verify all `erp_*` tables exist (run migration if needed)

### 1.3 Authentication System

**How login works:**
1. User submits email + password on `/login`
2. `authorize()` in `auth.ts` queries: `SELECT id, name, email, password, role_id FROM users WHERE email = ? AND role_id IN (4, 5)`
3. Verify password with `bcrypt.compare()`
4. Resolve partner association:
   - **role_id = 4 (school_admin):** `SELECT id FROM partners WHERE user_id = ?` — if no partner exists, `school_id` is null (new partner, will be redirected to setup)
   - **role_id = 5 (teacher):** `SELECT partner_id FROM teachers WHERE user_id = ?` — fallback to `SELECT partner_id FROM partner_teachers WHERE JSON_CONTAINS(teacher_ids, CAST(? AS JSON))` — teachers MUST have a partner association
5. Create JWT with `{ user_id, school_id (= partner.id or null), role, name, email }`
6. Redirect based on role and partner status

**Files to create/edit:**
- [x] `app/lib/auth.ts` — NextAuth config with Credentials provider + JWT strategy
- [x] `app/api/auth/[...nextauth]/route.ts` — NextAuth route handler
- [x] `app/lib/session.ts` — `getSession()`, `getSchoolId()`, `requireAuth()`, `requireRole()`
- [x] `app/(auth)/login/page.tsx` — Login form with email/password
- [x] `app/(auth)/forgot-password/page.tsx` — OTP-based password reset
- [x] `middleware.ts` — Route protection using NextAuth `getToken()`

**Middleware rules:**
```
/login, /forgot-password     → Public (redirect to dashboard if already logged in)
/setup-partner               → Requires school_admin + no partner profile (school_id is null)
/school-admin/*              → Requires session + role = school_admin + school_id exists
/teacher/*                   → Requires session + role = teacher
/api/auth/*                  → Pass through (NextAuth handles)
/api/*                       → Pass through (APIs verify via requireAuth())
```

### 1.4 Partner Setup (First-Time Login)

**Flow:** Admin Portal creates a user (role_id=4) → only `users` row exists → user logs into this portal → `school_id` is null in JWT → middleware redirects to `/setup-partner` → user fills partner profile form → `POST /api/partner/setup` creates `partners` row → user signs out and re-logs in → JWT now has `school_id` → lands on dashboard.

**Files:**
- [x] `app/setup-partner/layout.tsx` — Guards: school_admin only, redirect to dashboard if partner exists
- [x] `app/setup-partner/page.tsx` — Partner profile form (name, type, contact, address)
- [x] `app/api/partner/setup/route.ts` — `POST`: validate, insert into `partners`, return new partner ID

**Partner setup form fields** (from `partners` table):
- Partner Name* (partner_name)
- Partner Type (partner_type: school/coaching/college/university/other)
- Contact Person, Contact Email, Contact Phone
- Address, City, State, Pincode
- Registration Number, Affiliated Board, Website

### 1.5 Dashboard Shell
- [x] `app/components/layouts/DashboardLayout.tsx` — Role-based sidebar, top bar with partner name + session selector + user menu
- [x] `app/school-admin/layout.tsx` — Wraps DashboardLayout for admin (redirects to setup if no partner)
- [x] `app/teacher/layout.tsx` — Wraps DashboardLayout for teacher
- [x] `app/components/providers/SessionProvider.tsx` — NextAuth client-side session provider

### Phase 1 Deliverable
> Working login, first-time partner setup, dashboard shell with role-based sidebar. Users can log in and see the empty dashboard.

---

## Phase 2: Partner Configuration

> Goal: Partner admin can configure sessions, classes, subjects, grading, and holistic parameters.

### 2.1 Partner Profile
- [ ] `GET /api/partner/profile` — `SELECT * FROM partners WHERE id = ?` (school_id from session)
- [ ] `PUT /api/partner/profile` — `UPDATE partners SET partner_name=?, ... WHERE id = ?`
- [ ] Settings page tab: `school-profile` — View/edit partner info

### 2.2 Academic Sessions
- [ ] `GET /api/sessions` — `SELECT * FROM erp_sessions WHERE partner_id = ? ORDER BY start_date DESC`
- [ ] `POST /api/sessions` — Insert into `erp_sessions`
- [ ] `PUT /api/sessions/:id` — Update session
- [ ] `DELETE /api/sessions/:id` — Delete (only if no linked data)
- [ ] `POST /api/sessions/:id/set-current` — Set `is_current = 1`, unset others
- [ ] Settings page tab: `sessions`
- [ ] **"Copy from Previous Session"** — copies classes, sections, subjects, grading, holistic params

### 2.3 Classes & Sections
- [ ] `GET /api/classes` — `SELECT c.*, cs.id as class_section_id, s.name as section_name FROM classes c JOIN erp_class_sections cs ... WHERE sess.partner_id = ?`
- [ ] `POST /api/classes` — Insert into `classes` (with `partner_id`) + `erp_class_sections`
- [ ] `GET /api/classes/:id/sections` — Sections for a class
- [ ] `POST /api/classes/:id/sections` — Add section → `sections` + `erp_class_sections`
- [ ] Settings page tab: `classes`

### 2.4 Subjects
- [ ] `GET /api/subjects` — `SELECT * FROM erp_subjects WHERE class_section_id = ?`
- [ ] `POST /api/subjects` — Insert into `erp_subjects` (linked to `erp_class_sections`)
- [ ] `PUT /api/subjects/:id`, `DELETE /api/subjects/:id`
- [ ] Settings page tab: `subjects` — Per class-section subject list with teacher assignment

### 2.5 Grading
- [ ] `GET /api/grading/schemes` — `SELECT * FROM erp_grading_schemes WHERE partner_id = ?`
- [ ] `POST /api/grading/schemes` — Insert into `erp_grading_schemes`
- [ ] `GET /api/grading/ranges?scheme_id=` — Ranges for a scheme
- [ ] `POST /api/grading/ranges` — Insert into `erp_grading_ranges`
- [ ] Settings page tab: `grading`

### 2.6 Holistic Parameters
- [ ] `GET /api/holistic/parameters` — `SELECT * FROM erp_holistic_parameters WHERE partner_id = ?`
- [ ] `POST /api/holistic/parameters` — Create parameter
- [ ] `GET /api/holistic/sub-parameters?parameter_id=` — Sub-parameters
- [ ] `POST /api/holistic/sub-parameters` — Create sub-parameter
- [ ] Settings page tab: `holistic-params`
- [ ] **"Load Defaults"** — Pre-fills 6 parameters with default sub-parameters:

| # | Parameter | Default Sub-parameters |
|:-:|-----------|----------------------|
| 1 | Physical Activity | Stamina, Participation in Sports, Teamwork in Games, Fitness Level, Interest in Activities |
| 2 | Academic Performance | Competition, Consistency, Test Preparedness, Class Engagement, Subject Understanding, Homework |
| 3 | Mental Parameters | Grasping Ability, Retention Power, Conceptual Clarity, Attention Span, Learning Speed |
| 4 | Behavioural Parameters | Peer Interaction, Discipline, Respect for Authority, Motivation Level, Response to Feedback |
| 5 | Creativity & Innovation | Initiative in Projects, Curiosity Level, Problem Solving, Extra Curricular, Idea Generation |
| 6 | Subject-Wise Rating | Auto-generated from subjects (Maths, Science, English, etc.) |

### Phase 2 Deliverable
> Partner admin can fully configure their institution: sessions, classes with sections, subjects per class-section, grading scheme, and holistic parameters.

---

## Phase 3: Teacher & Student Management

> Goal: Manage teachers and students with enrollments.

### 3.1 Teacher Management (school_admin only)

**APIs:**
- [x] `GET /api/teachers` — List teachers: join `users` + `teachers` + `partner_teachers` where `partner_id = ?`
- [x] `POST /api/teachers` — Create teacher: insert into `users` (role_id=5) + update `partner_teachers` JSON + insert `teachers`
- [x] `GET /api/teachers/:id` — Teacher profile + class/subject assignments from `erp_class_sections` + `erp_subjects`
- [x] `PUT /api/teachers/:id` — Update teacher info
- [x] `DELETE /api/teachers/:id` — Deactivate
- [x] `GET /api/teachers/:id/assignments` — Assignments via `erp_class_sections` (class_teacher_id, second_incharge_id) + `erp_subjects` (teacher_id)
- [x] `PUT /api/teachers/:id/assignments` — Update assignments

**Pages:**
- [x] Teacher List (`/school-admin/teachers`) — DataTable with name, search, add/edit/delete modals
- [x] Teacher Detail (`/school-admin/teachers/[id]`) — Profile view/edit, class assignments table, subject assignments table
- [x] **Add Assignment UI** — Teacher detail page has "Add Assignment" button/modal to assign teacher to a class-section (class_teacher / second_incharge role) and "Assign Subject" modal to assign subjects. Includes remove buttons on both tables.

### 3.2 Student Management

**APIs:**
- [x] `GET /api/students` — List: join `students` + `erp_student_enrollments` + `erp_class_sections` + `erp_sessions` where `partner_id = ?`, filter by class/section
- [x] `POST /api/students` — Create student + enrollment: insert into `students` + `erp_student_enrollments`
- [x] `GET /api/students/:id` — Profile + enrollment history
- [x] `PUT /api/students/:id` — Update student info
- [x] `DELETE /api/students/:id` — Soft delete (set status = inactive)
- [x] `GET /api/students/:id/enrollments` — Enrollment history across sessions
- [x] `POST /api/students/:id/enrollments` — Enroll in class-section (via `erp_student_enrollments`)
- [x] `PUT /api/enrollments/:id` — Update roll number, status
- [x] `DELETE /api/enrollments/:id` — Remove enrollment
- [x] `POST /api/students/import` — Bulk CSV/Excel import
- [x] `GET /api/students/export` — CSV export

**Pages:**
- [x] Student List (`/school-admin/students`) — DataTable with search, filter by class-section, pagination, add student modal, delete
- [x] Student Detail (`/school-admin/students/[id]`) — Profile (view/edit), Enrollments tab with add enrollment modal
- [x] Bulk Import — CSV upload with preview and validation
- [x] Export CSV — Download student list as CSV

### Phase 3 Deliverable
> Admin can manage teachers with class/subject assignments. Students can be added, enrolled in class-sections, and bulk imported.
>
> **Complete.** All Phase 3 features implemented.

---

## Phase 4: Calendar & Attendance

> Goal: Daily attendance system with calendar-aware holiday handling.

### 4.1 Class Calendar

**APIs:**
- [x] `GET /api/calendar` — `SELECT * FROM erp_calendar_days WHERE class_section_id = ? AND date BETWEEN ? AND ?`
- [x] `POST /api/calendar/generate` — Auto-generate days for a session+class-section (Sundays = holidays, optional Saturdays)
- [x] `PUT /api/calendar/holidays` — Bulk toggle holidays (array of `{ date, is_holiday, holiday_reason }`)
- [x] `PUT /api/calendar/:id` — Update single day

**Pages:**
- [x] Calendar View (`/school-admin/calendar`) — Month grid showing working/holiday days per class-section
- [x] Auto-generate with optional "mark Saturdays as holiday" checkbox
- [x] Click any day to toggle holiday/working with reason
- [x] "Mark All Saturdays as Holiday" button
- [x] Monthly summary: total days, holidays, working days

### 4.2 Attendance System

**APIs:**
- [x] `GET /api/attendance?class_section_id=&date=` — Daily attendance: join `erp_attendance_records` + `erp_student_enrollments`
- [x] `POST /api/attendance/bulk` — Bulk mark/update attendance for a class-section+date
- [x] `GET /api/attendance/monthly?class_section_id=&month=` — Monthly grid (students x days)
- [x] `GET /api/attendance/summary?class_section_id=&type=monthly|yearly` — Per-student attendance %

**Pages:**
- [x] Daily Entry (`/school-admin/attendance`) — Select date + class-section:
  - **"Mark All Present"** — sets all to `present` in one click
  - Toggle individual students via P/A/L/HD buttons
  - Color-coded rows: green (present), red (absent), yellow (late), blue (half day)
  - Bulk save in one API call
- [x] Monthly Grid (`/school-admin/attendance/monthly`) — Students x days grid, color-coded dots
  - Sticky student name column, holiday columns grayed out
  - Legend for status colors
- [x] Summary table on monthly page — Per-student present/absent/late/half_day counts + percentage
  - Color-coded percentage: green (>90%), yellow (75-90%), red (<75%)
- [x] Prevent marking attendance on holidays (API checks `erp_calendar_days`)

admin can see monthly grid of attendence classwise
teacher can only insert entries of the class attendence which is assigned.

 Attendance

#### Daily Attendance Entry
- **Planned Workflow:**
  1. Select Date, Class, and Section
  2. See list of all students in that class
  3. Click "Mark All Present" — sets everyone to P (Present)
  4. Manually toggle individual students to A (Absent), L (Late), or H (Half-day)
  5. Click "Save Attendance"
- **Color coding:** Green = Present, Red = Absent, Yellow = Late, Blue = Half-day
- **Holiday check:** If the selected date is marked as a holiday in the calendar, attendance will not be markable

#### Monthly Attendance Grid
- **What it will show:** A calendar-style grid where:
  - Rows = Students
  - Columns = Days of the month (1, 2, 3... 31)
  - Each cell will show a colored circle (Green=P, Red=A, Yellow=L, Gray=Holiday)
  - Sticky first column so student names are always visible when scrolling
- **Useful for:** Quick visual overview of the entire month's attendance for a class

#### Attendance Summary
- **What it will show:** Per-student attendance statistics
- **Columns:** Student Name, Total Days, Present, Absent, Late, Half-Day, Percentage
- **Color coding:** Green (>90%), Yellow (75-90%), Red (<75%) for attendance percentage

---

 Calendar

- **What it will show:** A monthly calendar view for the academic session
- **Planned Features:**
  - **Generate Calendar** — Will create all 365 days for the session. Sundays will be automatically marked as holidays
  - **Mark All Saturdays** — One-click to mark all Saturdays as holidays
  - **Click any day** — Will open a popup to toggle between Working Day and Holiday, with an optional reason (e.g., "Diwali", "Republic Day")
  - **Monthly summary** at bottom: Total Days, Holidays, Working Days
  - Navigate between months using Prev/Next buttons
  - Select different academic sessions from dropdown
- **Connection to Attendance:** Days marked as holidays will appear as gray non-editable cells in the attendance grid. Teachers will not be able to mark attendance on holidays.

---

### Phase 4 Deliverable
> **Complete.** Calendar with holiday management. Daily attendance with "mark all present" flow. Monthly grid and summary reports.

---

## Phase 5: Exams & Marks

> Goal: Full exam lifecycle — creation, scheduling, marks entry with auto-grading.

### 5.1 Exam Management

**APIs:**
- `GET /api/exams` — `SELECT * FROM erp_exams WHERE class_section_id IN (SELECT id FROM erp_class_sections WHERE session_id IN (SELECT id FROM erp_sessions WHERE partner_id = ?))`
- `POST /api/exams` — Insert into `erp_exams` (linked to `erp_class_sections`)
- `GET /api/exams/:id` — Exam details + schedule
- `PUT /api/exams/:id`, `DELETE /api/exams/:id`
- `GET /api/exams/:id/schedule` — `SELECT * FROM erp_exam_schedules WHERE exam_id = ?`
- `POST /api/exams/:id/schedule` — Add subject to schedule
- `PUT /api/exams/:id/schedule/:subjectId`, `DELETE`

**Pages:**
- [ ] Exam List (`/exams`) — All exams with status badges (upcoming/in_progress/completed)
- [ ] Exam Detail (`/exams/[id]`) — Edit exam + subject-wise schedule (date, time, duration, max marks, room)
- [ ] **"Duplicate Exam"** — copy structure to create new exam
- [ ] Auto-update status based on dates

### 5.2 Marks Entry

**APIs:**
- `GET /api/marks?exam_id=&subject_id=` — Marks grid: join `erp_marks` + `erp_student_enrollments`
- `POST /api/marks/bulk` — Bulk save/update marks (auto-compute percentage + grade from `erp_grading_ranges`)
- `GET /api/marks/overview?exam_id=&class_section_id=` — All subjects overview
- `GET /api/marks/student/:id` — Student marks across all exams
- `GET /api/marks/stats?exam_id=&class_section_id=` — Class statistics (avg, highest, lowest, pass %, topper)

**Pages:**
- [ ] Marks Entry (`/marks`) — Select exam + subject, student grid:
  - Max marks from `erp_exam_schedules.maximum_marks`
  - Tab key navigation for fast keyboard entry
  - Auto-calculate percentage + grade live as marks are typed
  - Absent checkbox per student
  - Color highlight: below threshold in red
  - Bulk save
- [ ] Overview (`/marks/overview`) — All subjects for one exam in one view
- [ ] Student Report (`/marks/student/[id]`) — All exams for one student
- [ ] Stats (`/marks/stats`) — Class statistics, rank computation

### Phase 5 Deliverable
> **Complete.** Exam CRUD with scheduling, marks entry with auto-grading, class statistics, student rankings. Both admin and teacher views.

---

## Phase 6: Holistic Development Tracking

> Goal: Monthly rating entry for all 6 holistic parameters.

### 6.1 Monthly Rating Entry

**APIs:**
- `GET /api/holistic/ratings?parameter_id=&class_section_id=&month=` — Rating grid: join `erp_holistic_ratings` + `erp_student_enrollments`
- `POST /api/holistic/ratings/bulk` — Bulk save ratings
- `GET /api/holistic/ratings/student/:id` — Student's ratings across all months/parameters

**Pages — Dynamic route: `/holistic/[paramId]/page.tsx`**
- [ ] `/holistic` — List all parameters with links
- [ ] `/holistic/[paramId]` — Monthly rating grid:
  - Month selector + class-section selector
  - Grid: rows = students, columns = sub-parameters (from `erp_holistic_sub_parameters WHERE parameter_id = ?`)
  - Input: numeric score (1–10) or grade
  - Comments column per student (optional)
  - **"Set Default Rating"** — fills all cells with default (e.g., 5/10)
  - **"Copy from Previous Month"** — pre-fills from last month
  - Visual: color gradient from red (low) to green (high)
  - Bulk save

### Phase 6 Deliverable
> Teachers can rate students monthly on all holistic parameters. Data feeds into report cards.

---

## Phase 7: Report Cards & PDF

> Goal: Auto-generated report cards from all collected data.

### 7.1 Report APIs

- `GET /api/reports/monthly?student_id=&month=` — Attendance + holistic scores for a month
- `GET /api/reports/exam?student_id=&exam_id=` — Subject-wise marks, percentage, grade, rank
- `GET /api/reports/annual?student_id=&session_id=` — Consolidated: all exams + yearly attendance + holistic trends
- `POST /api/reports/pdf` — Generate single student PDF → store in `erp_report_cards`
- `POST /api/reports/pdf/bulk` — Generate PDFs for entire class

### 7.2 Pages — Dynamic route: `/reports/[type]/page.tsx`

- [ ] `/reports/monthly` — Attendance summary + holistic spider/radar chart
- [ ] `/reports/exam` — Subject-wise marks table, total, percentage, grade, rank
- [ ] `/reports/annual` — Consolidated exams, yearly attendance, holistic trend, teacher remarks
- [ ] PDF templates with @react-pdf/renderer, partner header with logo
- [ ] Individual download + bulk PDF for class

### Phase 7 Deliverable
> Three report types viewable on screen and downloadable as PDF. Bulk generation for entire class.

---

## Phase 8: Dashboard, Export & Polish

> Goal: Polished dashboards, data export, and production readiness.

### 8.1 Dashboards

**API:** `GET /api/dashboard/[role]`
- **Admin dashboard:** Total students, total teachers, today's attendance %, upcoming exams, recent activity
- **Teacher dashboard:** Assigned classes, quick attendance link, pending marks count

### 8.2 Data Export

**API:** `GET /api/export/[type]` (type = `attendance` | `marks`)
- [ ] Export attendance as CSV/Excel for any class/month
- [ ] Export marks as CSV/Excel for any exam/class

### 8.3 Production Polish
- [ ] Input validation on all forms (Zod schemas)
- [ ] Error boundaries and error pages (404, 500)
- [ ] Loading states and skeletons
- [ ] Empty states for all list pages
- [ ] Mobile responsiveness audit
- [ ] Performance optimization (lazy loading, pagination)
- [ ] Security audit: CSRF, XSS, SQL injection prevention
- [ ] Rate limiting on auth endpoints

### 8.4 Deployment
- [ ] PM2 ecosystem config
- [ ] Next.js standalone output build
- [ ] Environment configuration (dev, staging, prod)
- [ ] Domain and SSL setup

### Phase 8 Deliverable
> Production-ready portal with dashboards, exports, and deployment.

---

## API Summary

| Module | Endpoints | Tables Used | Auth |
|--------|:---------:|-------------|:----:|
| Auth | 4 | `users` | Public (login), Authenticated (profile) |
| Partner Profile/Setup | 3 | `partners` | school_admin |
| Sessions | 5 | `erp_sessions` | school_admin |
| Classes & Sections | 8 | `classes`, `sections`, `erp_class_sections` | school_admin |
| Teachers | 7 | `users`, `teachers`, `partner_teachers`, `erp_class_sections`, `erp_subjects` | school_admin |
| Subjects | 4 | `erp_subjects` | school_admin |
| Grading | 8 | `erp_grading_schemes`, `erp_grading_ranges` | school_admin |
| Students | 9 | `students`, `erp_student_enrollments` | school_admin (write), both (read) |
| Calendar | 4 | `erp_calendar_days` | school_admin (write), both (read) |
| Attendance | 4 | `erp_attendance_records` | both |
| Exams | 8 | `erp_exams`, `erp_exam_schedules` | school_admin (create), both (read) |
| Marks | 5 | `erp_marks` | both |
| Holistic Config | 6 | `erp_holistic_parameters`, `erp_holistic_sub_parameters` | school_admin |
| Holistic Ratings | 3 | `erp_holistic_ratings` | both |
| Reports & PDF | 5 | `erp_report_cards` + aggregated | both (view), school_admin (bulk) |
| Dashboard | 2 | aggregated | role-specific |
| Export | 2 | aggregated | both |
| **Total** | **~87** | | |

---

## Access Control Summary

| Module | School Admin | Teacher |
|--------|:---:|:---:|
| Dashboard | All partner data | Assigned classes only |
| Settings (6 tabs) | Full CRUD | No access |
| Teacher Management | Full CRUD | No access |
| Student List & Profile | All students | Assigned classes only |
| Student Add/Edit/Import | Yes | No |
| Attendance Entry | All classes | Assigned classes only |
| Attendance Reports | All classes | Assigned classes only |
| Calendar View | Yes | Yes (read-only) |
| Holiday Management | Yes | No |
| Exam Create/Edit | Yes | No |
| Exam View/Schedule | All exams | Assigned classes only |
| Marks Entry | All subjects | Assigned subjects only |
| Marks Reports | All classes | Assigned classes only |
| Holistic Ratings Entry | All classes | Assigned classes only |
| Report Cards (view/PDF) | All students | Assigned class students |
| Bulk PDF Generation | Yes | No |
| Data Export (CSV/Excel) | All classes | Assigned classes only |

> **Key rule:** Teachers are scoped to their assigned classes/sections/subjects via `erp_class_sections.class_teacher_id`, `erp_class_sections.second_incharge_id`, and `erp_subjects.teacher_id`. School admin sees everything within their partner.

---

## Future Phases (Post-Launch)

### Phase 9: Advanced Features
- [ ] Fee management module
- [ ] Timetable / period scheduling
- [ ] Library management
- [ ] Transport management
- [ ] SMS/WhatsApp notifications
- [ ] Student promotion / session rollover
- [ ] Bulk data export for government reports

### Phase 10: Mobile App
- [ ] React Native or PWA for teacher app
- [ ] Push notifications
- [ ] Offline attendance marking

---

## Phase Summary

| Phase | Focus | Status |
|-------|-------|--------|
| **Phase 1** | Authentication, Login, Partner Setup, Dashboard Shell | In Progress |
| **Phase 2** | Partner Configuration (Sessions, Classes, Subjects, Grading, Holistic Params) | |
| **Phase 3** | Teacher & Student Management | |
| **Phase 4** | Calendar & Attendance | |
| **Phase 5** | Exams & Marks | |
| **Phase 6** | Holistic Development Tracking | |
| **Phase 7** | Report Cards & PDF | |
| **Phase 8** | Dashboard, Export & Production Polish | |
