# API Test Results

Ran the curl-based test harness at `scripts/api-test/` against `http://localhost:3000`
on 2026-04-20 with two live sessions:

- **school_admin** — `lakshay@school.com` (user_id=2, school_id=2)
- **teacher** — `lakshay@gmail.com` (user_id=5, school_id=2)

**Final result: 77 pass / 77 total.** (Originally 76/77 — the §2.1 authz
leak and §3.4 debug endpoint have since been patched; see ✅ FIXED markers.)

## How to run

```bash
# one-time: ensure dev server is running, then:
bash scripts/api-test/run.sh                  # run all suites
bash scripts/api-test/run.sh auth             # run a single suite (match by suffix)
bash scripts/api-test/run.sh admin-read authz # run multiple
```

Outputs:
- Live per-request log with expected-vs-actual status codes.
- Final pass/fail summary with any failures listed.
- Raw response bodies archived under `scripts/api-test/.tmp/bodies/<label>.json`
  for inspection after the run.

Config lives in `scripts/api-test/.env` (BASE_URL + test creds).

---

## 1. OK endpoints (passing)

All responded with the expected status and a well-formed JSON body.

### Auth & health

| Endpoint | Method | Notes |
|---|---|---|
| `/api/auth/csrf` | GET | Returns csrf token as expected. |
| `/api/auth/callback/credentials` | POST | Cookie-based login works end-to-end. |
| `/api/debug/token` | GET | Echoes session payload. **See §3.4 — should not ship to prod as-is.** |
| `/api/health` | GET | OK. |

### Admin reads

| Endpoint | Method |
|---|---|
| `/api/dashboard` | GET |
| `/api/partner/profile` | GET |
| `/api/sessions` | GET |
| `/api/sessions/[id]/transition/preview` | GET |
| `/api/teachers`, `/api/teachers/[id]`, `/api/teachers/[id]/assignments` | GET |
| `/api/staff` | GET |
| `/api/classes`, `/api/classes/[id]/sections` | GET |
| `/api/subjects?class_section_id=…` | GET |
| `/api/calendar?session_id=…&month=…` | GET |
| `/api/grading/schemes`, `/api/grading/ranges?scheme_id=…` | GET |
| `/api/holistic/parameters`, `/api/holistic/sub-parameters?parameter_id=…`, `/api/holistic/ratings?parameter_id=…&class_section_id=…&month=…` | GET |
| `/api/timetable/config`, `/api/timetable/slots?class_section_id=…` | GET |
| `/api/attendance?class_section_id=…&date=…`, `/api/attendance/summary`, `/api/attendance/monthly` | GET |
| `/api/exams`, `/api/exams/[id]`, `/api/exams/[id]/schedule` | GET |
| `/api/marks?exam_id=…&subject_id=…`, `/api/marks/stats`, `/api/marks/overview` | GET |
| `/api/students`, `/api/students/[id]`, `/api/students/[id]/enrollments`, `/api/students/export` | GET |
| `/api/reports/exam?student_id=<enrollment_id>&exam_id=…` | GET |
| `/api/reports/monthly?student_id=…&month=…` | GET |
| `/api/reports/annual?student_id=…&session_id=…` | GET |

### Admin CRUD

| Endpoint | Methods covered |
|---|---|
| `/api/classes` | POST ✅ 201 |
| `/api/classes/[id]` | PUT ✅ 200 |
| `/api/classes/[id]/sections` | POST ✅ 201 |
| `/api/subjects` | POST ✅ 201 |
| `/api/subjects/[id]` | PUT ✅ 200 |
| `/api/staff` | POST ✅ 201 |
| `/api/staff/[id]` | PUT ✅ 200, DELETE ✅ 200 |
| `/api/teachers` | POST ✅ 201 |
| `/api/teachers/[id]` | PUT ✅ 200, DELETE ✅ 200 |
| `/api/teachers/[id]/password` | PUT ✅ 200 |
| `/api/students` | POST ✅ 201 |
| `/api/students/[id]` | PUT ✅ 200, DELETE ✅ 200 (soft delete) |

**Negative paths verified:**
- `POST /api/students` with missing fields → 400 ✅
- `POST /api/teachers` with duplicate email → 409 ✅
- `POST /api/classes` with empty name → 400 ✅

### Teacher portal

| Endpoint | Method |
|---|---|
| `/api/sessions` | GET (shared with admin) |
| `/api/teacher/classes` | GET |
| `/api/teacher/students?class_section_id=…` | GET |
| `/api/teacher/attendance?class_section_id=…&month=…` | GET |
| `/api/teacher/timetable` | GET |

### Authorization gates

- Anonymous → 401 on `/dashboard`, `/teachers`, `/students`, `/partner/profile` ✅
- Teacher → 403 on admin-only routes (`/classes`, `/teachers`, `/staff`, `/students`) ✅
- Admin → 403 on teacher-only routes (`/teacher/classes`, `/teacher/timetable`) ✅
- Nonexistent student id → 404 ✅

---

## 2. Endpoints that need improvement

### 2.1 🔴 ✅ FIXED — `GET /api/partner/profile` leaks school profile to teachers

**Severity: medium — authz leak.**

The GET handler called `await auth()` directly and only checked
`if (!session?.user)` for 401, so any authenticated user (including a teacher
for the same school) got 200 with the full partner row, including
`registration_number`, `contact_*`, `affiliated_board`, etc.

**Fix applied** — added an explicit role check that mirrors `getAuthContext`
semantics, while preserving the existing `school_id == null` fallback for the
onboarding flow:

```ts
// app/api/partner/profile/route.ts (GET)
if (!session?.user) return 401 Unauthorized
if (session.user.role !== "school_admin") return 403 Forbidden   // ← new
if (!school_id) return 200 { data: null }
```

The `teacher→admin: partner` assertion in `04-authz.sh` now returns **403 as
expected** — used as a regression guard going forward.

### 2.2 🟡 `GET /api/students/:id` with a non-numeric id returns 404 instead of 400

```ts
// app/api/students/[id]/route.ts:10
const { id } = await params
...
WHERE st.id = ? AND st.deleted_at IS NULL                 // ← id never parseInt'd
```

The value is passed straight into the WHERE clause; MySQL coerces
`"not-a-number"` to `0`, no row matches, and the route returns 404. Other
`[id]` routes (`classes`, `teachers`) do `parseInt` + `isNaN` and return 400.
Inconsistent, and can hide client bugs.

**Fix:** parseInt + 400 early, matching sibling routes.

### 2.3 🟡 Missing DELETE endpoints for core resources

Only 7 routes implement DELETE. These are conspicuously absent:

| Resource | Has DELETE? |
|---|---|
| `/api/classes/[id]` | ❌ |
| `/api/subjects/[id]` | ❌ |
| `/api/classes/[id]/sections/[sectionId]` | ❌ (no per-section route at all) |
| `/api/calendar/[id]` | ❌ |
| `/api/grading/schemes/[id]`, `/api/grading/ranges/[id]` | ❌ (no `[id]` routes) |
| `/api/holistic/parameters/[id]`, `/api/holistic/sub-parameters/[id]` | ❌ |
| `/api/timetable/slots/[id]` | ❌ |

For some of these, soft-delete via `status='inactive'` is the right answer —
but that should still be exposed as an explicit endpoint, not only inferable
from a bulk PUT.

### 2.4 🟡 `PUT /api/classes/[id]` silently drops `display_order`

`POST /api/classes` accepts `{ name, code, grade_level, display_order, sections }`
but the PUT body only reads `{ name, code, grade_level }` — so editing
`display_order` after creation is impossible through the API.

```ts
// app/api/classes/[id]/route.ts:32
const { name, code, grade_level } = body           // ← no display_order
```

### 2.5 🟡 `/api/reports/exam` parameter name is misleading

The query parameter is called `student_id`, but the handler treats it as an
**enrollment id** (joins against `erp_student_enrollments.id`). Easy to use
wrong; I did on the first pass. Either rename the param to `enrollment_id` or
accept the actual `student_id` and look up the enrollment internally.

### 2.6 🟢 Inconsistent response envelope across endpoints

Hit while chaining test values:

| Endpoint | `data` shape |
|---|---|
| `/api/sessions` | `Session[]` (bare array) |
| `/api/classes` | `Class[]` |
| `/api/grading/schemes` | `Scheme` (single object) + extra top-level `session_id` |
| `/api/holistic/parameters` | `Parameter[]` with nested `sub_parameters[]` |
| `/api/teachers` | `{ teachers, total, page, limit }` |
| `/api/students` | `{ students, total, page, limit }` |
| `/api/staff` | `{ staff, total, page, limit }` |
| `/api/exams` | `{ exams, total, page, limit }` |

Paginated lists each pick a different key name for the array; non-paginated
endpoints are sometimes objects, sometimes arrays. Any generic client-side
abstraction over this is going to have special cases. Consider a uniform
envelope like `{ data: T[] | T, meta?: { total, page, limit } }`.

### 2.7 🟢 Inconsistent query-param requirements for session-scoped reads

Some endpoints auto-default to the partner's current session; others hard-require
`session_id`. Example: `/api/classes` and `/api/students` default (via
`resolveSessionId`), but `/api/calendar` returns 400 unless `session_id` is
explicit. For consumers, it is easier if the default-to-current-session
behaviour is consistent across all session-scoped reads.

### 2.8 🟢 `ensureCurrentSession` gate only applied in one place

`ensureCurrentSession` exists in `auth-utils.ts` to prevent writes against past
sessions, but grep shows it is only called from `POST /api/students`. Other
writes (`/api/attendance/bulk`, `/api/marks/bulk`, `/api/exams`, section POST)
appear to let you mutate data for a non-current session.

### 2.9 🟢 Only 4 routes use Zod validation

`createStudentSchema`, `createTeacherSchema`, `bulkAttendanceSchema`,
`bulkMarksSchema` are defined in `app/lib/validations.ts`, but most POST/PUT
routes still do ad-hoc `if (!x || !y) return 400`. Moving to Zod uniformly gives
you:

- field-level error messages (already the shape of `parseOrError`),
- automatic coercion (`z.coerce.number()`) — useful for URL params,
- a single place to review the API contract.

Write endpoints that would benefit most: `/api/staff` POST/PUT,
`/api/classes` POST/PUT, `/api/subjects` POST/PUT, `/api/sessions` POST,
`/api/exams` POST/PUT, `/api/calendar/*` PUT, `/api/timetable/*` PUT,
`/api/grading/*` POST.

---

## 3. Cross-cutting improvement areas

### 3.1 Error payload shape is not standardized

Most errors: `{ error: "message" }`.
Zod validation errors: `{ error: "Validation failed", details: [{ field, message }] }`.
Some generic catches: `{ error: "Internal server error" }`.

Client code has to branch on which variant it got. Consider a single shape:

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "...", "details": [...] } }
```

### 3.2 DB LIMIT/OFFSET interpolation

Five routes build `LIMIT ${limit} OFFSET ${offset}` as string concatenation
(e.g. `app/api/students/route.ts:63`). The values are clamped integers so this
is safe today, but it is a footgun — any future refactor that forgets the clamp
becomes a SQL injection. mysql2 supports `LIMIT ?, ?` with integer placeholders;
use them.

### 3.3 Login rate limit exists but is in-memory only

**Correction to an earlier draft of this doc:** `middleware.ts:6-24` *does*
rate-limit `POST /api/auth/callback/credentials` to **5 attempts per minute per
IP** using the helper in `app/lib/rate-limit.ts`. The auditor missed it on the
first pass.

The remaining concern is that the limiter state is an in-process `Map`:
- Multi-instance deploys (Vercel, K8s replicas) each keep their own counter,
  so the effective limit is `5 × N_instances` per minute.
- Restarts reset the counter.
- No audit trail of who got rate-limited.

**Recommendation for production:** swap the in-memory store for Upstash/Redis
(`@upstash/ratelimit`) or rely on an upstream edge limiter (Cloudflare,
Vercel WAF). The existing `rateLimit()` helper has a clean interface, so the
swap is ~30 lines in `app/lib/rate-limit.ts`.

### 3.4 ✅ FIXED — `/api/debug/token` should not exist in production

It's harmless (read-only, session-aware), but it's explicitly a debug hook.

**Fix applied** — the handler now short-circuits with 404 when
`NODE_ENV === "production"`, keeping it available for the local test harness
and developer debugging without exposing it on deployed environments.

```ts
// app/api/debug/token/route.ts
if (process.env.NODE_ENV === "production") {
  return NextResponse.json({ error: "Not found" }, { status: 404 })
}
```

### 3.5 Missing route tests for PUT `/api/sessions/[id]` not yet covered

The harness skips PUT on sessions to avoid renaming the partner's live session.
If the user wants it, a disposable-session CRUD chain (create → rename →
set-current → delete) is the next addition — it just needs `partner_id`
reassignment logic confirmed.

### 3.6 Soft-delete semantics vary

- `students` uses `deleted_at IS NULL` (soft).
- `staff` / `teachers` appear to hard-delete.
- `classes` / `subjects` / `sections` use `status = 'active'` (soft, but not
  via `deleted_at`).

If a student enrolled in a deleted class is later queried, the joins may silently
hide them. A uniform convention (prefer soft delete with `deleted_at`, set
`status` for "active/inactive" state transitions only) would remove a class of
data-integrity surprises.

### 3.7 Response-level observability

Routes log to `console.error` with a route-specific prefix, which is good. Two
small upgrades:

- Include the request path + method in the log line (not just the route name),
  because multiple handlers in the same file (`GET`/`POST`) share a prefix.
- On 500s, return a request id in the response body and log the same id — lets
  a user report an error that an operator can grep for in one step.

---

## 4. Known test limitations

- **No teardown of created classes/sections/subjects** — the admin-CRUD suite
  deletes its staff, student, and teacher rows but leaves the disposable class
  and section behind (no DELETE endpoint; see §2.3). Re-runs accumulate rows
  like `APITest Class <timestamp>` in the DB. Clean them up manually:
  ```sql
  DELETE FROM classes WHERE name LIKE 'APITest Class %';
  ```
- **No schema-level assertions** — the harness checks status codes + extracts a
  few fields for chaining. It does not validate response shape. If the output
  format of an endpoint changes silently (e.g. `.data.students` → `.data.items`),
  this harness will still pass but downstream consumers will break. For that
  level of safety, consider adding Bruno / Hurl / REST Client files, or a
  Vitest + supertest suite that imports your Zod schemas.
- **Bulk-write endpoints not exercised** — `/api/attendance/bulk`,
  `/api/marks/bulk`, `/api/students/import`, `/api/reports/pdf` and
  `/api/reports/pdf/bulk` are on the surface list but not invoked. They require
  multi-record payloads and the PDF routes return binary data. Add later if
  needed.
- **Session-transition, calendar-generate, holidays, set-current** — these
  mutate the live session state, so the harness does not fire them destructively.
  Worth covering against a seeded test DB.
