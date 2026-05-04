# WiserWits Partners Portal

A multi-tenant ERP for partner institutions (schools, coaching centres, colleges, universities). Built for two roles only — **`school_admin`** (principal / office) and **`teacher`** — sitting on top of a database shared with a separate Admin Portal that provisions partners.

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Postgres · NextAuth v5 · Tailwind 4.

## Prerequisites

- **Node.js** 20+
- **PostgreSQL** 14+ (local install, Docker, Supabase, Neon, or any managed Postgres)
- **npm** (comes with Node.js)

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd partners-portal
npm install
```

### 2. Create the database

Local Postgres:

```bash
createdb dev_db
```

Or via SQL:

```sql
CREATE DATABASE dev_db;
```

For managed providers (Supabase / Neon / Azure / RDS) just create an empty database in the dashboard and grab the connection string.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
# Postgres connection. For local dev:
DATABASE_URL=postgres://postgres:yourpassword@127.0.0.1:5432/dev_db

# For managed providers, paste the full URL they give you.
# Append ?sslmode=verify-full for production-grade cert validation,
# or ?sslmode=require for permissive (matches most managed defaults).
# DATABASE_URL=postgres://user:pass@host:5432/db?sslmode=verify-full

# NextAuth v5
AUTH_URL=http://localhost:3000
AUTH_SECRET=<run: openssl rand -base64 32>
NEXTAUTH_SECRET=<same value as AUTH_SECRET>

# App
NEXT_PUBLIC_APP_NAME=WiserWits
```

Generate a secret:

```bash
openssl rand -base64 32
```

Use the same value for both `AUTH_SECRET` and `NEXTAUTH_SECRET` (NextAuth v5 reads either; matching them avoids subtle JWT-verification mismatches).

### 4. Run migrations

```bash
npm run migrate
```

This applies (in order):

| File | Purpose |
|---|---|
| `001_baseline_schema.sql` | All ~38 tables (auth, partners, classes, sessions, exams, marks, attendance, holistic, fees, support, chat). Real PG `ENUM` types, `JSONB`, `BIGSERIAL` PKs, `TIMESTAMPTZ`. A shared `set_updated_at()` trigger handles `updated_at` on every UPDATE. |
| `002_create_views.sql` | `vw_school_health`, `vw_class_section_health` for the data-health pages. |
| `003_seed_data.sql` | Default roles, the admin user, 100 holistic-development templates. |

Check status:

```bash
npm run migrate:status
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Login

Seeded credentials:

| | |
|---|---|
| Email | `admin@school.com` |
| Password | `password123` |

After first login you'll land on `/setup-partner` to create your school profile, then on `/school-admin/dashboard` thereafter.

**Change the default password before deploying to production.**

## Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run migrate` | Apply pending migrations |
| `npm run migrate:status` | Show which migrations have / haven't been applied |
| `npm run migrate:create <name>` | Scaffold a new migration file |

## Creating new migrations

```bash
npm run migrate:create add_some_feature
```

This creates `migrations/00X_add_some_feature.sql` with a header. Edit it, then `npm run migrate`. The runner wraps each file in a transaction and records the version in `schema_migrations`.

## Project structure

```
app/
  (auth)/                  # /login, /forgot-password
  api/                     # Next.js Route Handlers (~30 trees)
    attendance/  calendar/  chat/  classes/  consultant-chat/
    dashboard/   enrollments/ exams/  fees/    grading/
    health/      holistic/  marks/   partner/ reports/
    sessions/    staff/     students/ subjects/ support/
    teacher/     teachers/  timetable/
  components/
    chat/         dashboard/ layouts/  providers/
    reports/      shared/    teacher-dashboard/
  lib/
    api-client.ts  auth.ts   auth-utils.ts   chat.ts
    class-section-health.ts  db.ts         fee-assignment.ts
    form-scroll.ts partner-type.ts rate-limit.ts
    school-health.ts  session.ts  utils.ts  validations.ts
  school-admin/             # 16 sections (dashboard, students, fees, …)
  teacher/                  # 13 sections (dashboard, classes, marks, …)
  setup-partner/            # First-run partner profile form
  layout.tsx  page.tsx
migrations/
  001_baseline_schema.sql  002_create_views.sql  003_seed_data.sql
  run.ts                   # The runner (uses pg)
  _mysql_archive/          # Original MySQL-era migrations, preserved
proxy.ts                   # Auth-aware request gating + login rate-limit
```

## Key concepts

### Roles and tenancy

- One `users` row per real human. `role_id = 4` → school_admin, `role_id = 5` → teacher.
- One `partners` row per institution, linked 1:1 to a `users` row.
- Every `erp_*` table denormalises **`partner_id` referencing `users(id)`** (the partner's account row). Two legacy outliers — `teachers.partner_id` and `student_subscriptions.payer_partner_id` — reference `partners(id)` instead. The auth context exposes both: `ctx.partnerUserId` (the `users.id`) and `ctx.schoolId` (the `partners.id`).

### Sessions and read-only past data

Each partner has multiple `erp_sessions` (academic years) but exactly one with `is_current = TRUE`. Admins can view past sessions through the top-right session switcher; the UI flips to read-only mode (banner + disabled buttons) and the API blocks writes via `ensureCurrentSession`. See `app/lib/auth-utils.ts` for the three-helper auth flow:

- `getAuthContext(allowedRoles)` — verifies session + role + partner profile.
- `resolveSessionId(request, partnerUserId)` — accepts `?session_id=` or defaults to current.
- `ensureCurrentSession(sessionId, partnerUserId)` — write guard, 403s on past sessions.

### Fees

A three-table system:

- **`erp_fee_structures`** — templates (e.g. "Tuition Q1 2026, ₹3000/mo, Apr–Mar"). Supports `recurrence='one_time'` and `recurrence='monthly'`.
- **`erp_fee_dues`** — per-student-per-period expected dues. Generated by the Assign action; idempotent via `(structure_id, student_enrollment_id, period_label)` unique key.
- **`erp_fee_payments`** — append-only log of collections. Each insert recomputes the parent due's `amount_paid` and `status` in the same transaction.

New students are auto-assigned all in-scope fee structures via `app/lib/fee-assignment.ts` inside the same transaction that creates them.

### Support / queries

`erp_support_queries` is a one-way channel: school admins post, the superadmin team (in a separate `admin_panel` codebase) reads and replies via `resolution_note`. The contract is documented in `SUPPORT_QUERIES_CONTRACT.md`.

### Database conventions

- Every `created_at` and `updated_at` is `TIMESTAMPTZ DEFAULT NOW()`. The shared `set_updated_at()` trigger fires `BEFORE UPDATE` on every table, so application code doesn't need to set `updated_at = NOW()` manually (though many places still do, for clarity).
- Time-of-day columns: `TIME` (timetable).
- Money columns: `DECIMAL(10,2)`. The `pg` driver returns these as **strings** to preserve precision; coerce with `Number(...)` only at the point of arithmetic / display.
- `BOOLEAN` columns (e.g. `is_current`, `is_holiday`, `is_default`) are returned as `1`/`0` numbers via a custom type-parser in `app/lib/db.ts`. Existing code compares with `=== 1` / `!== 1`.
- `BIGINT` columns (every PK and FK) are returned as JS numbers via the same file's parser.

## Database driver notes

`app/lib/db.ts` is the single entry point and:

- Translates `?` placeholders to `$1, $2, …` automatically (skip-aware of string literals and comments) — call sites use `?` everywhere, no per-query rewriting.
- Provides `executeQuery<T>(sql, params)` returning `T` (rows array).
- Provides `executeTransaction(callback)` with a `connection.execute(sql, params)` shim that returns `[rows, undefined]` for compatibility with the destructure pattern used by transactional code.
- Sets `keepAlive: true` and `idleTimeoutMillis: 30s` on the pool — managed Postgres providers (Azure / RDS / Cloud SQL) silently kill idle TCP connections; without keepalive you get periodic `ETIMEDOUT`.
- Attaches `pool.on('error', …)` so a dropped idle client doesn't crash the Node process.
- Custom type parsers for OID 20 (BIGINT → number) and OID 16 (BOOL → 1/0) so existing call-site code works without changes.

For INSERTs that need the new id back, append `RETURNING id` and read `result[0].id`. There is no `insertId` field — PG doesn't have one.

## Auth model

- NextAuth v5 (Credentials provider, JWT strategy, 24h session).
- The proxy (`proxy.ts`) gates every request:
  - Login is rate-limited to 5 attempts / minute / IP.
  - Authenticated users are redirected away from `/login` to the right dashboard.
  - `/school-admin/*` requires `role === 'school_admin'` AND a `school_id`.
  - `/teacher/*` requires `role === 'teacher'`.
  - `/setup-partner` is reachable only by school_admins missing a `school_id`.

## Common operations

### Add an admin-style migration

```bash
npm run migrate:create add_xxx_to_yyy
# Edit migrations/00N_add_xxx_to_yyy.sql
npm run migrate
```

### Reset the local database

```bash
dropdb dev_db && createdb dev_db && npm run migrate
```

### Inspect the seed user

```bash
psql "$DATABASE_URL" -c "SELECT id, email, role_id FROM users WHERE email='admin@school.com';"
```

Should return one row with `role_id=4`. If `role_id` is anything else, the seed didn't apply — re-run `npm run migrate`.

## Production checklist

- [ ] `AUTH_URL` points to the deployed origin (no trailing slash, https in prod)
- [ ] `AUTH_SECRET` and `NEXTAUTH_SECRET` are identical, 32+ random bytes
- [ ] `DATABASE_URL` has `?sslmode=verify-full` for managed Postgres
- [ ] Default admin password (`password123`) has been changed
- [ ] Migrations are applied (`npm run migrate:status` shows all "applied")
- [ ] `npm run build` succeeds
- [ ] Connection pool size in `app/lib/db.ts` (currently `max: 20`) is appropriate for your DB tier

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `ERR_TOO_MANY_REDIRECTS` after login | Stale cookie from a prior database state — clear cookies for the localhost origin |
| `read ETIMEDOUT` on Postgres calls after idle | Cloud DB killed the connection. The pool is configured with `keepAlive` to prevent this — if it still happens, your provider's idle timeout is shorter than the OS keepalive interval. Lower `idleTimeoutMillis` in `app/lib/db.ts`. |
| `relation "xxx" does not exist` | Migrations didn't apply. Run `npm run migrate:status`. |
| `column "xxx" does not exist` | The MySQL-era migration is in `_mysql_archive/`; the PG schema is in `001_baseline_schema.sql`. The two are out of sync — likely you need to add the column to the PG baseline (or write a new migration). |
| `operator does not exist: enum_type = unknown` | A query is comparing an `ENUM` column to a string literal where PG can't auto-cast. Add `::enum_type` to the literal (e.g. `'active'::active_status`). |

## Migration history

The MySQL versions of migrations 001–021 are preserved in `migrations/_mysql_archive/`. The current Postgres baseline (`001_baseline_schema.sql`) folds in every structural change from those migrations:

- 001 baseline + 002 indexes + 003 seeds (incorporated into PG 003)
- 004 indexes & constraints (folded into PG baseline)
- 005 partner_id on exams + enrollments (folded in)
- 006 session-transition support (folded in)
- 007 holistic templates (incorporated into PG 003)
- 008 staff date_of_joining (folded in)
- 009 partners.logo widening (folded in — `TEXT`)
- 010 / 011 exam_type addition + rename (folded in)
- 012 chat threads + messages (folded in)
- 013 / 014 health views (PG 002)
- 015 chat read_at (folded in)
- 016 partner tier + plan (folded in)
- 017 student_subscriptions extension (folded in)
- 018 partner_assignments (folded in)
- 019 fee tracking (folded in)
- 020 recurring fees (folded into 019's table shape)
- 021 support queries (folded in)

If admin_panel needs the same database, it'll need its own port — these migrations cover only the partners-portal essential set.
