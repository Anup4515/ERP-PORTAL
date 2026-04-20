# Partners Portal — Honest Evaluation

Stack: Next.js 16 (App Router) · React 19 · TypeScript (strict) · NextAuth v5 · MySQL (mysql2) · Tailwind v4 · Zod (partial) · no tests.

Repo surveyed on 2026-04-20. 147 TS/TSX files. 62 API route files. 8 migration files.

---

## 1. Overall Rating

| Area | Score | One-line verdict |
|---|---|---|
| **UI/UX** | **7.0 / 10** | Real design system, modern aesthetic on auth/dashboard; CRUD pages lack polish; a11y gaps. |
| **Code Quality** | **5.5 / 10** | Strict TS on paper but 85+ `as any` escapes, 4/62 routes validated, 0 tests, no ESLint config. |
| **Architecture & Scalability** | **5.5 / 10** | Middleware + migrations show maturity; but 59 client pages (RSC wasted), duplicated SQL in 34+ routes, no service layer. |
| **Performance** | **4.5 / 10** | Zero caching, sequential DB queries on dashboard, unbounded fan-out in annual reports, client-side fetches everywhere. |
| **Security** | **6.5 / 10** | NextAuth JWT + bcrypt + parameterized queries + edge rate-limit are correct; but recent authz leak (§6.1), weak password rules, no MFA/reset. |
| **Overall** | **5.8 / 10** | Competent mid-junior work. Ships features, but not hardened for production at 1k+ schools. |

---

## 2. Strengths (what's actually done well)

1. **Edge middleware does real work.** `middleware.ts:12-24` rate-limits `/api/auth/callback/credentials` to 5/min per IP, and `middleware.ts:52-104` enforces role-based routing (admin → `/school-admin`, teacher → `/teacher`, admin-without-partner → `/setup-partner`) at the edge before page components render. Most junior projects do this at the page level, if at all.
2. **Auth design is clean.** `app/lib/auth.ts:45-87` — role mapping + `resolveSchoolId()` with a fallback for legacy `partner_teachers` JSON array (lines 77-84). JWT strategy with 24-hour maxAge. Credentials provider uses bcrypt (not a hand-rolled SHA).
3. **Migration runner is legit.** `migrations/run.ts` (~220 lines): schema versioning table, multi-statement SQL support, `up/status/create` commands, reuses the app's mysql2 driver. No Prisma overhead, no external CLI.
4. **Design system exists and is consistent.** Tailwind v4 `@theme` tokens (`app/globals.css:3-28`), 13 reusable primitives in `app/components/shared/`, `cn()` util, unified variant/size prop contract across Button/Input/Select. This is beyond typical student/junior work.
5. **Responsive by default.** Mobile sidebar drawer, 28 `md:`/`lg:` breakpoint usages, tables `overflow-x-auto` — all the expected breakpoints are wired.
6. **Partner-scoped data isolation is applied consistently.** Every scoped query joins through `erp_sessions.partner_id` (see e.g. `app/api/subjects/route.ts:21-26`). No accidental cross-tenant reads spotted.
7. **Strict TypeScript on.** `tsconfig.json:11` — `"strict": true`. Path alias `@/*`. No `noImplicitAny: false` escape hatch.
8. **`output: "standalone"`** (`next.config.ts:4`) — Docker-friendly, forward-thinking for deployment.
9. **Bulk-write endpoints use Zod** (`validations.ts`: `bulkAttendanceSchema`, `bulkMarksSchema`). The places where a typo can wreck the DB are actually validated.
10. **Session switching + read-only mode for past sessions** (`ReadOnlyBanner`, `useViewingSession`, `ensureCurrentSession` helper). Domain-aware UX that most school ERPs botch.

---

## 3. Weaknesses (brutal but fair)

### Code hygiene
- **85+ type escapes.** 56× `as any`, 29× `: any`, 8× `unknown as`. Examples:
  - `app/lib/auth.ts:135-145` — `(user as any).user_id` on every callback. Module augmentation exists (lines 23-43) but isn't trusted.
  - `app/api/students/route.ts:129` — `(studentResult as any).insertId` instead of `ResultSetHeader`.
- **Zero tests.** No `jest.config`, no `vitest.config`, no `__tests__/`, no `*.test.ts`. The only test harness in the repo is the one we built last session (`scripts/api-test/`).
- **No ESLint config.** `eslint@9.39.4` and `eslint-config-next` are in `package.json` but there is no `.eslintrc` / `eslint.config.*`. Static analysis is effectively off.
- **88+ `console.error` calls** are the entire observability layer. No request IDs, no structured logging, no Sentry.
- **Response envelope inconsistent.** `/api/sessions` → `{ data: [...] }`; `/api/students` → `{ data: { students, total, page, limit } }`; `/api/grading/schemes` → `{ data: {...}, session_id: N }`. Five or six shapes across 62 routes.
- **Only 4 of 62 routes use Zod.** `validations.ts` has 4 schemas; the other 58 routes do ad-hoc `if (!name) return 400` (`app/api/classes/route.ts:77-82`, `app/api/staff/route.ts:51`).
- **Repeated query patterns.** The `JOIN erp_class_sections → erp_sessions WHERE partner_id = ?` pattern appears in 34+ routes. The `parseInt page/limit` pagination parser appears in 10+ routes. No extracted helper for either.
- **Repo root clutter.** `phase3_partner_renaming.sql`, `queries.sql`, `u645317425_admin_panel.sql`, `scale.txt`, `background_ui.png`, `plan.md` living at root looks unprofessional and makes reviewers think "this wasn't cleaned up".

### Architecture
- **59 files declare `"use client"`.** The entire `school-admin/*/page.tsx` and `teacher/*/page.tsx` are client components that `useEffect` → `fetch('/api/…')`. Next.js 16's main selling point — RSC — is essentially unused. Every page re-fetches on mount, waterfalls, and can't be statically cached.
- **No service layer.** Business logic lives inline in route handlers, pasted across files. A `services/students.ts` with `listStudents(ctx, filters)` would remove ~30% of the route code.
- **No `hooks/` directory.** `useViewingSession` is imported from a context, but data-fetching hooks (`useStudents`, `useExams`) don't exist — every page rolls its own `useState` + `useEffect`.
- **Soft-delete conventions are inconsistent.** Students use `deleted_at IS NULL`; classes/subjects/sections use `status = 'active'`; teachers and staff hard-delete. A soft-deleted class doesn't hide its students.
- **Half-finished features.** `Forgot Password` link is commented out (`app/(auth)/login/page.tsx:151-158`); CSV Import modal is commented out on the students page.

### Performance
- **Zero caching.** No `unstable_cache`, no `revalidateTag`, no `fetch(next: {revalidate})`, no `Cache-Control` headers, no Redis. Every dashboard load recomputes four aggregations from scratch (`app/api/dashboard/route.ts:46-106`).
- **Dashboard stats are sequential.** Four `executeQuery` calls fire one after another when they're independent — should be `Promise.all`.
- **Annual report is O(exams × students).** `app/api/reports/annual/route.ts:93-165` loops over exams; per exam it runs 2 queries and an in-memory rank pass. 10 exams × 50 students = minutes per report.
- **Pool `connectionLimit: 50`** (`app/lib/db.ts:16`) with no `queueLimit`, no `acquireTimeout`. Saturates fast under bulk-import or report-generation bursts.
- **`@react-pdf/renderer` and `exceljs`** are imported at module level. Bundle-heavy libraries that should be `dynamic()`-imported in the report/export routes only.

### Security
- **Authz leak recently fixed.** `GET /api/partner/profile` used `auth()` directly, so teachers could read the school's full profile (registration_number, contact info). Fixed last session — good, but it shouldn't have been there, and it raises the question of what else slipped.
- **In-memory rate limiter** (`app/lib/rate-limit.ts:4`). Works for single-instance dev. On a multi-instance deploy, each instance has its own Map — 5 attempts per instance × N instances = effective limit scales with fleet size. Doesn't survive a restart. Swap for Redis/Upstash for production.
- **Password policy is weak.** `validations.ts:45` — `z.string().min(6)`. Industry minimum is 8 chars with at least one number+letter.
- **No account lockout, MFA, or password reset flow.** The "Forgot Password" link is commented out in the login page.
- **No audit log.** Destructive actions (teacher delete, student delete, class edit) vanish without a trace. Schools expect a "who changed what when" trail.
- **24-hour JWT with no rotation.** A stolen cookie is valid for a day. Short-TTL access + refresh token is the standard.

### UI/UX
- **Empty state is flat text.** `DataTable.tsx:38` renders `"No data available"` — no icon, no illustration, no CTA. Meanwhile `EmptyState.tsx` exists and is nicer; just isn't wired into DataTable.
- **Accessibility gaps.** Icon-only action buttons (`app/school-admin/students/page.tsx:253-267`) have `title=` but no `aria-label`. Form error text (`Input.tsx:42`) isn't linked to the input via `aria-describedby`.
- **No toast system.** Mutations (add/delete student) have no success/failure notification pattern. Only the login page has a banner.
- **No column sorting, no multi-select, no inline editing** on any data table. Functional but not modern.
- **Accent-on-dark-navy contrast** (`#F0C227` on `primary-900`) may fail WCAG AA for small text. Not verified.

---

## 4. UI/UX Improvements (specific, against modern SaaS)

Linear / Notion / Stripe all share these; your portal skips them:

| # | Change | Where | Effort |
|---|---|---|---|
| 1 | Replace flat `"No data available"` with `<EmptyState>` (icon + title + description + CTA). | `DataTable.tsx:38` — already have `EmptyState.tsx`, just wire it through an `emptyState` prop. | S |
| 2 | Add a global toast system for mutations. | New `components/shared/Toast.tsx` + provider in `app/layout.tsx`. Use `react-hot-toast` or roll your own. | M |
| 3 | Column sorting on DataTable. | `DataTable.tsx` — accept `sortable?: boolean` per column, lift sort state, update API calls with `?sort=name&dir=asc`. | M |
| 4 | As-you-type validation. | `students/page.tsx:285-311` runs only on submit. Move to `onBlur` per field using Zod's `safeParse` on each field. | M |
| 5 | Row skeleton on pagination change. | DataTable currently re-mounts fully; swap to a 6-row skeleton over the table. | S |
| 6 | Command palette (Cmd+K). | Every modern SaaS has it. Use `cmdk` lib + route to students/teachers/classes. | M |
| 7 | Status badges with dots + icons, not flat pills. | `Badge.tsx` — add `dot: boolean` variant. Stripe-style. | S |
| 8 | A11y: `aria-label` on every icon button, `aria-describedby` linking error text to inputs. | 30-ish spots. A codemod or mass edit. | S |
| 9 | Re-enable or remove the commented-out "Forgot Password" + Import CSV. Half-finished UI shakes trust. | `login/page.tsx:151`, `students/page.tsx:~416`. | S / M |
| 10 | Verify accent contrast (WCAG AA needs 4.5:1 for small text). | `globals.css:20` — `#F0C227` on `#0E1E3D` — run through a contrast checker; if it fails, darken accent-400 by one stop. | S |
| 11 | Breadcrumbs on nested pages (e.g. Student → Enrollments → Marks). | New shared `Breadcrumbs.tsx`. Flat nav hurts deep-linking. | M |
| 12 | Keyboard shortcut hints (e.g. "Press N to add student"). | Reveals the product feels fast. | S |

**Comparison ruler:** design-wise you're at ~2022-era Retool / Airtable; you're not at 2024-era Linear yet. The difference is micro-interactions (toast, command palette, inline edits, smooth list transitions), not color theory. Your palette is already solid.

---

## 5. Code & Architecture Improvements

### 5.1 Extract helpers that are currently copy-pasted

```ts
// app/lib/query-helpers.ts (new)
export function parsePagination(sp: URLSearchParams) {
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10))
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "50", 10)))
  return { page, limit, offset: (page - 1) * limit }
}

export async function verifyCsOwnership(csId: number, partnerUserId: number) {
  const rows = await executeQuery<{ id: number }[]>(
    `SELECT ecs.id FROM erp_class_sections ecs
       JOIN erp_sessions es ON es.id = ecs.session_id
      WHERE ecs.id = ? AND es.partner_id = ?`,
    [csId, partnerUserId]
  )
  return rows.length > 0
}
```

Replaces ~300 lines of duplication across 40+ routes.

### 5.2 Single response helper

```ts
// app/lib/api.ts
export const ok = <T>(data: T, init?: ResponseInit) =>
  NextResponse.json({ data }, init)
export const created = <T>(data: T) => ok(data, { status: 201 })
export const fail = (code: string, message: string, status = 400, details?: unknown) =>
  NextResponse.json({ error: { code, message, details } }, { status })
```

Fixes §3 response-envelope chaos. Migrate routes one at a time.

### 5.3 Move list pages to Server Components

Most `school-admin/*/page.tsx` can become:

```tsx
// app/school-admin/students/page.tsx
export default async function StudentsPage({ searchParams }) {
  const sp = await searchParams
  const data = await getStudents(sp) // server-side, no /api round-trip
  return <StudentsClient initial={data} />
}
```

Offload `useEffect`/`fetch` to client-only sub-components that do mutations or local state. Cuts TTFB, removes loading spinners on navigation, and lets you use `revalidatePath` on mutations.

### 5.4 Generate DB types from schema

Hand-written row interfaces drift from the schema. Use `drizzle-kit introspect` or `@databases/mysql-schema-cli` to emit a `generated/schema.ts`. Kills 80% of `as any`.

### 5.5 Split fat pages

`app/school-admin/students/page.tsx` is 470+ lines. Split into:
- `components/students/StudentTable.tsx`
- `components/students/AddStudentModal.tsx`
- `hooks/useStudents.ts`
- `page.tsx` (wiring only, < 80 lines)

Same pattern for attendance (377 lines), dashboard (295 lines).

### 5.6 ESLint + Prettier

```bash
npx eslint --init  # next/core-web-vitals + @typescript-eslint/recommended
npm i -D prettier eslint-config-prettier
```

Add a `lint` npm script. Run on CI. This would have caught ~30 of the `any` casts.

### 5.7 Folder layout

Current:
```
app/{api,components,lib,school-admin,teacher,(auth),setup-partner}
```

Better for 150+ files:
```
app/
  (auth)/              # route group
  (dashboard)/         # route group: school-admin + teacher share a layout
    school-admin/
    teacher/
  api/
components/{shared,students,teachers,forms,providers}
lib/{auth,db,validation,logging,cache}
services/              # DB access layer — listStudents, createTeacher, etc
hooks/
types/
```

---

## 6. Security Issues (ordered by severity)

### 6.1 🟠 Medium (fixed this session) — `GET /api/partner/profile` leaked to teachers
Covered in `scripts/api-test/test.md §2.1`. The GET handler used `auth()` directly with no role check. **Fix applied** — teacher now gets 403.

### 6.2 🟠 Medium — In-memory login rate limit
`app/lib/rate-limit.ts:4` — `new Map()` at module scope. Works single-instance. At production scale:
- Per-instance counters → `5 × N_instances` attempts/min.
- Memory leaks bounded by cleanup at every 100th call (acceptable).
- Restart resets counters.

**Fix:** swap for `@upstash/ratelimit` backed by Redis, or move to Cloudflare/Vercel edge rate-limit.

### 6.3 🟠 Medium — Weak password policy
`validations.ts:45` — `z.string().min(6)`. No complexity. No blocklist. No max-length check (bcrypt truncates at 72 bytes — silently). Enforce min 10 chars, a top-500 common-passwords check, and reject > 72-byte inputs.

### 6.4 🟠 Medium — No password reset / MFA
Forgot-password link is commented out (`login/page.tsx:151-158`). Zero MFA. For a platform that stores student PII, this is below the line expected by most districts.

### 6.5 🟡 Low/Medium — Long-lived JWT, no rotation
`app/lib/auth.ts:129-131` — `maxAge: 24*60*60`. A stolen cookie is valid 24h. Add a short-TTL session + refresh-token rotation, or move to DB-backed sessions (NextAuth supports this natively).

### 6.6 🟡 Low — `/api/debug/token` (fixed this session)
Patched last session to 404 in prod.

### 6.7 🟡 Low — No audit log
No table logs who deleted which student, or renamed which class. For an education product, "who approved that grade change" is a reasonable audit demand.

### 6.8 🟢 Tracked — Non-numeric IDs get 404 instead of 400
`app/api/students/[id]/route.ts` — id flows into SQL unparsed, coerces to 0, returns 404. Matters for client error handling, not for security (parameterized queries are safe).

### 6.9 🟢 Tracked — Missing DELETE endpoints
Classes, subjects, calendar days, grading schemes, holistic params, timetable slots have no DELETE. Users resort to UPDATE-based "soft delete" through side channels. Functional gap, not a CVE.

### 6.10 🟢 Observational — CSRF
NextAuth's cookie is `SameSite=Lax`. Cross-origin state-changing POSTs are blocked by the browser, so CSRF is moot in practice. No action needed unless you embed the app in iframes.

---

## 7. Performance Improvements

### 7.1 Add Redis cache for hot reads

| Endpoint | Cache key | TTL | Reasoning |
|---|---|---|---|
| `GET /api/dashboard` | `dashboard:{partnerId}:{sessionId}` | 120s | Hit on login, hammered at 9am. Stats tolerate 2-minute staleness. |
| `GET /api/sessions` | `sessions:{partnerId}` | 300s | Changes ~1×/year. |
| `GET /api/classes` | `classes:{partnerId}:{sessionId}` | 300s | Changes a few times/month. |
| `GET /api/grading/schemes` | `grading:{partnerId}:{sessionId}` | 600s | Rarely changes. |
| `GET /api/teacher/classes` | `teacher-classes:{userId}:{sessionId}` | 300s | Per-teacher. |

Invalidate on related writes via `revalidateTag`.

### 7.2 Parallelize dashboard
```ts
// app/api/dashboard/route.ts:46
const [students, teachers, attendance, exams] = await Promise.all([
  executeQuery(studentSQL, ...), executeQuery(teacherSQL, ...),
  executeQuery(attendanceSQL, ...), executeQuery(examSQL, ...),
])
```
Four queries in parallel. Dashboard latency drops ~70% immediately.

### 7.3 Rewrite annual report with single batched query
`app/api/reports/annual/route.ts:93-165` loops over exams. Replace with one query:
```sql
SELECT m.exam_id, m.subject_id, m.obtained_marks, m.is_absent
  FROM erp_marks m
  JOIN erp_exams e ON e.id = m.exam_id
 WHERE m.enrollment_id = ? AND e.session_id = ?
```
Group/aggregate in JS. One round-trip instead of 2N.

### 7.4 Tune the pool
```ts
// app/lib/db.ts:14
mysql.createPool({
  uri: process.env.DATABASE_URL,
  connectionLimit: 50,
  waitForConnections: true,
  queueLimit: 500,
  connectTimeout: 10_000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,
})
```

### 7.5 Code-split heavy libs
`@react-pdf/renderer` and `exceljs` only run on report/export routes. Use `next/dynamic` or plain `await import()` inside the handler so they never ship with the client bundle.

### 7.6 Use parameterized LIMIT/OFFSET
5 files still do `LIMIT ${limit} OFFSET ${offset}` string interpolation (`students/route.ts:63`, `teachers/route.ts:40`, `staff/route.ts:32`, `exams/route.ts`, `marks/stats/route.ts`). Safe today because values are clamped, but:
```ts
pool.execute("... LIMIT ? OFFSET ?", [...params, limit, offset])
```
Requires driver flag for integer binding (`mysql2` supports `rowsAsArray: false` + type coercion).

### 7.7 Index review
Migration 002:22-23 has `(enrollment_id, date, status)` — good. But dashboard does `COUNT(DISTINCT se.student_id) … WHERE cs.session_id = ? AND ar.date = CURDATE()` — run `EXPLAIN`. If it's filesorting, add `(date, session_id)` on attendance.

### 7.8 Client-side: add SWR or React Query
Deduplicates concurrent fetches, provides `revalidateOnFocus`, and removes half the `useState+useEffect` boilerplate. Low-effort, high-impact.

### 7.9 Move client pages to RSC (see §5.3)
Removes the "click link → white flash → spinner → content" sequence that makes the app feel 2018.

---

## 8. Features to Add

### Production-level essentials (these block launch)
1. **Password reset flow** — token email, 15-min expiry, single-use. Already has a commented-out link; needs backend.
2. **Audit log** — `audit_events(id, actor_id, action, entity_type, entity_id, diff_json, ip, at)`. Expose under Settings.
3. **Email/SMS notifications** — SMTP (Resend/Postmark) + Twilio for attendance alerts, exam reminders. Critical for an education product.
4. **File uploads** — student photos, exam PDFs, signed documents. S3/R2 + signed URLs.
5. **Background job queue** — PDF generation, bulk import, monthly reports. Use Inngest or BullMQ + a worker. Right now, `POST /api/reports/pdf/bulk` likely blocks the request thread for 30+ seconds.
6. **CSV bulk import (complete it)** — the skeleton is commented out; finish it. Schools will not enter 500 students one at a time.
7. **MFA** — TOTP minimum. Recovery codes. Don't skip for an education product with PII.
8. **Data export** — per-school data dump as SQL/JSON (compliance / GDPR Art. 20 / FERPA).
9. **Health & metrics endpoint** — `/api/health` exists; extend with `/metrics` (Prometheus format) for DB pool, cache hit rate, job queue depth.
10. **Proper error page** — `app/error.tsx` exists but isn't a "contact support with request id X" page. Add request IDs.

### Would impress recruiters
- **Live attendance** via Server-Sent Events — teacher sees new marks as they happen.
- **Role-based feature flags** (partnr-level, per-school) with an admin UI.
- **Parent portal** (read-only) — different auth flow, limited scope.
- **PWA with offline cache** for the teacher app — marking attendance on a train.
- **Impersonation with audit** — "support logged in as lakshay@school.com" banner.
- **Internal admin super-dashboard** — ops view across all partners, with usage/retention charts.
- **OpenAPI spec** generated from Zod schemas (e.g. `@asteasolutions/zod-to-openapi`) + a `/docs` UI.

---

## 9. Real-World Readiness

### Can this scale to 1,000+ users?

**1,000 users (~20 schools, ~10k students):** **yes, after the fixes in §7.** The DB schema is reasonable, the pool is adequate, the code works. Latency and bundle size are the pain points, not correctness.

**1,000 schools (~500k students, ~100M attendance rows/year):** **no, not without work.** Breakpoints in order:

1. **Connection pool saturation.** 50 conns vs hundreds of concurrent dashboard hits at 9am. First to blow.
2. **Dashboard uncached.** 50k simultaneous recomputations at peak. DB CPU pinned.
3. **Annual report blocks the request thread.** Needs to move to a job queue.
4. **No observability.** When it breaks, nobody knows why.
5. **No horizontal story for rate limiting.** Memory-local counters do nothing on a 5-instance Vercel deploy.

### What's missing for production

- [ ] Observability: Sentry + OpenTelemetry + structured logs (pino).
- [ ] Caching: Redis/Upstash.
- [ ] Background jobs: Inngest / BullMQ / Temporal.
- [ ] CI/CD: `.github/workflows/` — run `tsc`, `lint`, `test`, `build`, run migrations on deploy.
- [ ] Backups & point-in-time recovery. Verify with a restore drill.
- [ ] Secrets vaulting (not `.env.local` on a server). AWS Secrets Manager / Doppler.
- [ ] SSL/cert automation.
- [ ] Multi-region or at minimum read replicas.
- [ ] GDPR/FERPA stance: DPA, data retention, deletion on request, processor list.
- [ ] Status page + incident runbook.
- [ ] Onboarding docs for new engineers (`CONTRIBUTING.md`, architecture diagram).
- [ ] A real `README.md` — the current one is near-empty.

### Compliance posture
Schools store PII on minors. FERPA-equivalent expectations apply:
- Audit log: ❌
- Data export / deletion: ❌
- Access control at row level: ✅ (partner scoping is solid)
- Encryption in transit: assumed ✅
- Encryption at rest: ❌ (depends on DB config — no explicit notes)
- Breach notification runbook: ❌

---

## 10. Final Verdict

**Would I hire the developer behind this?** **Yes, for a junior-to-mid role on a team with senior engineers.** Not for solo ownership of a production platform, not for a staff/lead role.

**Level:** **Strong junior / early mid-level.** The evidence:

| Signal | Observation |
|---|---|
| Knows the framework | Uses App Router, route groups, middleware, standalone output. ✅ |
| Knows the domain | Session switching, partner scoping, bulk attendance modeling. Non-trivial. ✅ |
| Writes composable UI | Design system exists and is used consistently. ✅ |
| Ships features end-to-end | Working login → dashboard → CRUD → export → reports. ✅ |
| Thinks about security | Middleware rate limit, parameterized queries, bcrypt, role routing. ✅ |
| Writes type-safe code | 85+ `any` escapes, no DB codegen. ❌ |
| Writes tests | Zero. ❌ |
| Thinks about performance | No caching, sequential queries, client-heavy pages. ❌ |
| Uses framework capabilities fully | `"use client"` everywhere — RSC wasted. ❌ |
| Maintainability-minded | Repeated query blocks in 30+ files, no service layer, 470-line page components. ❌ |
| Responds to review | In the previous test-harness session, accepted findings and applied fixes immediately. ✅ |

**Hiring call by role:**

| Role | Fit |
|---|---|
| Intern / trainee | Overqualified — above this level. |
| Junior IC (0-2 yrs) | 🟢 Strong hire. |
| Mid IC (2-4 yrs) | 🟡 Hire if they show they can apply the feedback in this document. Growth trajectory looks right. |
| Senior IC / Tech Lead (5+ yrs) | 🔴 Not yet. The absence of tests, caching story, and service layer is load-bearing for "senior". |

**What to tell them in the interview:**
> "Your platform works and looks modern. The things that separate you from senior are: (1) you default to `'use client'` and miss what the framework gives you, (2) there are no tests, (3) there's no caching or background-job story, and (4) ~40 routes copy-paste the same JOIN. Fix those four things and the gap closes."

---

## Appendix — Top 10 concrete fixes, ranked by ROI

1. **Add ESLint config + `npm run lint` in CI.** Catches ~30 `any` casts immediately. *S*
2. **Extract `parsePagination()`, `verifyCsOwnership()`, `ok()/created()/fail()` helpers.** Removes ~500 lines of duplicated code. *S*
3. **`Promise.all` the dashboard queries.** 70% latency drop on the most-hit page. *S*
4. **Cache dashboard + classes + sessions with Redis, 2-5 min TTL.** Biggest infra win. *M*
5. **Convert 5 most-viewed pages to RSC with async data fetching.** Faster nav, fewer `useEffect` bugs. *M*
6. **Move report PDF generation to a background job.** Unblocks the request thread. *M*
7. **Complete the "Forgot Password" flow.** Uncomment, wire email provider. *M*
8. **Add vitest + tests for `lib/auth-utils.ts`, `lib/validations.ts`, `lib/db.ts`.** Lowest-hanging fruit; raises coverage from 0 → ~30% in a day. *S*
9. **Replace in-memory rate limiter with Upstash.** Needed for multi-instance. *S*
10. **Generate MySQL types** (drizzle-kit introspect or similar). Removes most `as any`. *M*

Legend: S = < 1 day, M = 1-3 days.
