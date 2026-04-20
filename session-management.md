# Session Management — The Right Way

A design spec for how academic sessions *should* be managed, including the
state model, rules, year-end playbook, and concrete differences from the
current implementation.

---

## 1. Mental model

An academic session is a **year-long, ordered, non-overlapping interval** on
a school's timeline. Sessions form a strict sequence: last-year → this-year →
next-year. No gaps, no overlaps, exactly one "live" session at any moment.

Everything in the product — enrollments, attendance, marks, exams, timetable,
reports — is scoped to a session. The session is the root of the data tree
per academic year.

**The two things that matter most:**

1. There is **exactly one active session per school at any point in time**.
   The DB should enforce this, not the application layer.
2. **Past sessions are immutable.** Once archived, nothing about them changes.
   That's how transcripts stay valid five years later.

---

## 2. The three states

Replace the current `is_current` boolean with a `status` enum:

| Status | Meaning | Can read data? | Can write data? |
|---|---|---|---|
| **`draft`** | Created but not started. Shell for next year's structure. | ✅ (in wizard contexts) | ✅ (the admin is configuring it) |
| **`active`** | The live session. This is where operations happen today. | ✅ | ✅ |
| **`archived`** | Past session. Locked for history. | ✅ (read-only) | ❌ |

A boolean `is_current` cannot express "next year is drafted but not yet started" — hence the enum.

---

## 3. The state machine

```
                   ┌─────────────┐
                   │   (create)  │
                   └──────┬──────┘
                          ▼
                   ┌─────────────┐      delete
                   │    draft    │─────────────▶ (gone)
                   └──────┬──────┘
                          │
                     activate (guarded)
                          │
                          ▼
                   ┌─────────────┐
                   │   active    │
                   └──────┬──────┘
                          │
                    transition  (atomic)
                          │
                          ▼
                   ┌─────────────┐
                   │  archived   │   ◀── terminal, no path back
                   └─────────────┘
```

**Allowed transitions and nothing else:**

| From | To | How | Guarded by |
|---|---|---|---|
| — | `draft` | Create session | Overlap check: new date range must not overlap any existing session |
| `draft` | (deleted) | Delete | Only drafts can be deleted |
| `draft` | `active` | Activate | No other session currently active, OR date range covers today |
| `active` | `archived` | Transition | Only via the transition wizard (never a bare state flip) |

**Forbidden transitions — reject at the API:**

- `archived → active` (no reanimating past sessions)
- `archived → draft` (no "editing" history)
- `active → draft` (no "de-activating" back to setup)
- `active → (deleted)` (active sessions cannot be deleted)
- `archived → (deleted)` (archived sessions cannot be deleted)

---

## 4. Invariants (what the system must never violate)

These are the rules every write path must enforce:

1. **Exactly one active session per partner.**
   Enforced via partial unique index:
   ```sql
   CREATE UNIQUE INDEX uq_active_session_per_partner
     ON erp_sessions (partner_id)
     WHERE status = 'active';
   ```
2. **No overlapping date ranges.**
   On `INSERT` or `UPDATE start_date/end_date`, block if any other session for
   the same partner has `[s.start_date, s.end_date]` overlapping the new
   range.
3. **Archived sessions are read-only.**
   Every write handler checks `status = 'active'` for the target session
   before mutating attached data (students, attendance, marks, exams, etc.).
4. **Activation requires no other active session.**
   The activate endpoint refuses if another session is already `active` and
   that session hasn't been archived via transition.
5. **Dates of an active session with recorded activity can only widen.**
   (Same guard you already have; keep it.)
6. **No gaps in the timeline (soft rule).**
   A new session's `start_date` should equal the previous session's
   `end_date + 1`. Warn but don't block — some schools genuinely have summer
   gaps between years.

---

## 5. The two creation paths — and when to use each

Today the UI has "Add Session" and "Session Transition" side-by-side with no
guidance. This is the single biggest source of confusion. Proposed rule:

| Scenario | Use | Why |
|---|---|---|
| **Very first session** (no sessions exist yet) | **Add Session** | There's nothing to transition from. Admin seeds the timeline. |
| **End of an academic year** (active session ending) | **Session Transition** | Only path that does: clone class structure, promote students, mark old enrollments `completed`, flip status atomically. |
| **Mid-year onboarding** (school joining in November) | **Add Session** (with `start_date` = today) | Edge case. No prior year to transition from. |
| **Any other subsequent year** | **Session Transition** | Default. Never use Add Session when an active session exists. |

**UI implication:** hide the **Add Session** button whenever a session already
exists for this partner. Expose it only under an "Advanced" action for the
edge cases.

Backend enforcement: `POST /api/sessions` should refuse if an `active` session
already exists, with a hint that points the admin to the transition wizard.
Exception flag (`?force=true` + admin confirmation) covers the mid-year
onboarding case.

---

## 6. Year-end playbook (the admin's runbook)

This is the happy-path ritual an admin follows every year.

### T-30 days (one month before session end)

- Dashboard shows a banner: *"Current session ends in 30 days — start planning the transition."*
- Admin can open **Session Transition** wizard. Wizard state is saved as a
  *draft target session* — the admin can configure promotions over several
  days without committing.

### T-7 days

- Banner upgrades to warning tone: *"Session ends in 7 days. Complete the transition to avoid disruption."*
- Admin reviews promotions, classes, teacher assignments.

### Day 0 — end_date

- Banner: *"Current session ends today."*
- System does **not** auto-transition. Too much is at stake — require human
  confirmation.
- Writes to the active session continue to work; the date is not an immediate
  hard stop.

### T+1 and beyond (after end_date, not yet transitioned)

- Writes to the active session should start being blocked (new attendance
  records, new enrollments — these don't belong in a year that's already over).
  Reads still work.
- Dashboard CTA becomes blocking: *"Complete transition to 2027-28 to resume operations."*
- Admin opens wizard, confirms promotions, clicks transition → atomic flip:
  old session `active → archived`, new session `draft → active`.

### The transition itself

Exactly what happens (already correct in current code, keep it):

1. Create target session (if not pre-drafted).
2. Clone class-sections + teacher assignments.
3. Clone subjects (optional toggle).
4. Clone timetable (optional).
5. Clone grading scheme (optional).
6. Mark all source enrollments `completed`.
7. Create new enrollments per promotion decisions (`promoted` / `repeater` / graduate=no-new).
8. Generate calendar for new session.
9. Flip statuses: source → `archived`, target → `active`.

All nine steps in one DB transaction. Fail → rollback → nothing changed.

---

## 7. Viewing vs. being the active session — keep these separate

This is a subtle but important distinction the current code already gets
right, and the new model preserves:

- **Active** is a **database state**. There's one active session; writes go
  there.
- **Viewing a session** is a **UI-only concern**. The session switcher at the
  top of the page changes what the user *sees* on screen, not what's active
  in the DB.

A teacher viewing last year's attendance on the switcher never changes the
DB state. The "Read-Only" banner is a UI hint, not a DB lock. The DB lock
comes from `status = 'archived'`, which was set during transition and stays
that way forever.

This means:
- There is **no "Set Current"** button in the proper model. You activate a
  draft once (edge case) or transition from active. Never switch to an
  archived session.
- The session switcher is strictly a viewer, labeled as such.

---

## 8. UI derivations

Once the state model is clean, the UI rules fall out:

### Sessions list (Settings → Sessions)

| Column | What to show |
|---|---|
| Name | e.g., "2026-27" |
| Start / End date | formatted |
| Status badge | `draft` (grey) / `active` (green) / `archived` (muted grey with archive icon) |
| Actions | see decision table below |

### Action button decision table

| Session status | Buttons shown |
|---|---|
| `draft` | **Activate** (if eligible), **Edit**, **Delete** |
| `active` | **Edit** (widen dates only if activity), **Session Transition** |
| `archived` | **View details** only. No Edit, no Delete, no Activate. |

**No generic "Set Current" button anywhere.** Activation of drafts is a
specific, guarded action. Archived sessions cannot be activated at all.

### Top-right session switcher

Purely a viewing control. Shows all sessions (draft + active + archived) but
annotates them: "(draft)", "(active — current)", "(archived)". Selecting a
non-active session shows the Read-Only banner.

---

## 9. Migration from current implementation

Existing DB has `is_current TINYINT(1)`. Proposed:

### Step 1: Add a `status` column (non-breaking)

```sql
ALTER TABLE erp_sessions
  ADD COLUMN status ENUM('draft', 'active', 'archived') NOT NULL DEFAULT 'draft'
  AFTER is_current;

-- Backfill from is_current
UPDATE erp_sessions
   SET status = CASE
     WHEN is_current = 1 THEN 'active'
     ELSE 'archived'
   END;
```

Note: this backfills *every* historical non-current session as `archived`.
If you have truly-drafted sessions lying around, manually fix them to
`draft` before the next step.

### Step 2: Add the uniqueness guarantee

```sql
CREATE UNIQUE INDEX uq_active_session_per_partner
  ON erp_sessions (partner_id, (status = 'active'))
  WHERE status = 'active';  -- MySQL 8+ syntax
```

### Step 3: API changes (smallest set)

| Endpoint | Change |
|---|---|
| `POST /api/sessions` | Add overlap check. Reject if `status='active'` exists for partner and no `?force=true`. |
| `POST /api/sessions/[id]/set-current` | **Rename/repurpose to `POST /api/sessions/[id]/activate`**. Refuse if another active session exists, or if the target is `archived`. |
| `POST /api/sessions/[id]/transition` | Require source `status = 'active'`. On success, set source → `archived`, target → `active` (atomic). |
| `DELETE /api/sessions/[id]` | Refuse unless `status = 'draft'`. |
| `PUT /api/sessions/[id]` | Refuse if `status = 'archived'`. For `active`, keep the existing widen-only guard for dates. |
| New: `PATCH /api/sessions/[id]/archive` | (internal only, used by transition) |

### Step 4: Deprecate `is_current`

Leave the column for one release for rollback safety. Remove in the following
release once everything reads `status` instead.

### Step 5: UI cleanup

- Hide "Add Session" whenever any session exists for this partner (behind an
  "Advanced → Create bare session" link).
- Replace "Set Current" button with "Activate" — only shown on `draft` rows.
- Add a "current session ends in N days" widget to the dashboard.

---

## 10. Decision table cheat-sheet

Keep this in front of you when coding the guards.

| Action | draft | active | archived |
|---|---|---|---|
| Read session + scoped data | ✅ | ✅ | ✅ |
| Edit name | ✅ | ✅ | ❌ |
| Edit dates (narrow) | ✅ | ❌ (if has activity) | ❌ |
| Edit dates (widen) | ✅ | ✅ | ❌ |
| Delete | ✅ | ❌ | ❌ |
| Activate | ✅ (if no other active) | n/a | ❌ |
| Source of Transition | ❌ | ✅ | ❌ |
| Target of Transition | created by wizard | ❌ | ❌ |
| Write attached data (attendance, marks, enrollments, exams) | ❌ | ✅ | ❌ |
| Appears in session switcher | ✅ with (draft) tag | ✅ with (active) tag | ✅ with (archived) tag |

---

## 11. Summary of what changes vs. today

| Today | Proper design |
|---|---|
| `is_current` boolean | `status` enum: `draft` / `active` / `archived` |
| Any session can become current via "Set Current" | Only drafts can be activated; archived is terminal |
| Overlapping sessions are allowed | Blocked by overlap check on create/update |
| Past session can become current | Refused — archived is one-way |
| "Add Session" and "Session Transition" both visible always | "Add Session" only for the very first session; transition is the default path afterwards |
| No end-of-year nudge | Dashboard countdown + banner at T-30, T-7, day-0 |
| Writes to expired session allowed until admin manually transitions | Writes blocked once `end_date < today` for the active session, with a CTA to complete transition |
| Transition can start from any session | Transition requires source `status = 'active'` |

---

## 12. If you want to do this step by step

Smallest meaningful increments, each shippable on its own:

1. **Add the `status` column and backfill.** No behavior change yet.
2. **Enforce overlap check on create.** Prevents new bad data.
3. **Require `status = 'active'` on transition source.** Prevents malformed chains.
4. **Gate "Set Current" to non-archived sessions.** Smallest fix to the most
   dangerous current behavior.
5. **Replace "Set Current" with "Activate", shown only on drafts.** UX clarity.
6. **Dashboard countdown widget.** Proactive nudge.
7. **Block writes to an active session once `end_date < today`.** Forces
   the ritual instead of letting it slide.
8. **Drop the `is_current` column.** Clean-up.

Each step is self-contained. Each one reduces a concrete risk. You don't
need to do all eight at once — but #1–#4 are the minimum for the lifecycle
to be trustworthy.
