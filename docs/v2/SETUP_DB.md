# Postgres setup — one-time, ~2 min

The BeeLine import pipeline persists to Postgres. Until you provision a
database and apply the schema, the Settings → Integrations → BeeLine
panel will show a "Postgres not connected" banner and uploads will
fail.

This is a one-time setup. After it's done, push-to-master deploys
continue working as before; no further DB action needed unless the
schema changes.

---

## 1. Provision Vercel Postgres (~60s)

1. Open the project on Vercel → **Storage** tab
2. Click **Create Database** → **Postgres** (Neon-backed, free tier:
   3 GB / 50 compute hours per month — generous for this use case)
3. Name: `agent-dashboard-prod` (or anything; pick a region close to
   your users — `bom1` (Mumbai) or `iad1` (US-East) are sensible)
4. Click **Create**

Vercel auto-injects these env vars into your project on next deploy:

```
DATABASE_URL              ← what our code reads
POSTGRES_URL              ← Vercel's shorter alias (same value)
POSTGRES_PRISMA_URL       ← pooled, prisma-friendly
POSTGRES_URL_NON_POOLING
POSTGRES_USER / HOST / PASSWORD / DATABASE
```

Only `DATABASE_URL` is used by the app.

---

## 2. Trigger a redeploy (~60s)

The env vars are only available on builds after they're set. Either:

- Push any commit to master, OR
- In Vercel: Deployments → top deployment → **Redeploy** → uncheck
  "use existing build cache" → Redeploy

Wait for the deploy to finish.

---

## 3. Apply the schema (~5s)

Visit:

```
https://dev.era.ai/api/admin/migrate
```

Expected response:

```json
{
  "ok": true,
  "tables": [
    "daily_entries",
    "employees",
    "import_runs",
    "timesheet_validations",
    "timesheets"
  ]
}
```

The migration is idempotent (`CREATE TABLE IF NOT EXISTS`). Running
it again is a no-op.

---

## 4. Verify the import flow

1. Settings → Integrations
2. The "BeeLine · Accenture (POC)" card should now show **"No import yet"**
   (no more "Postgres not connected" banner)
3. Click **Sample CSV** to download `beeline-sample-accenture.csv`
4. Drag the file back into the drop zone → status flips to
   **"8 timesheets in database · 8 workers"**, plus any OT-approval or
   leave-balance failure counts depending on the rules
5. Inbox → Timesheets → filter Client to **Accenture Limited** →
   the 8 imported rows now replace the synthetic Accenture data

---

## 5. Re-importing (real BeeLine exports)

When you have a real CSV from BeeLine:

1. Same Settings card → drop the file
2. The API runs in a single transaction:
   - DELETE all prior `client_id='acc'` rows (timesheets cascade to
     daily entries + validations)
   - UPSERT employees (preserves `consumed_leaves` across re-imports)
   - INSERT new timesheets after re-running Accenture validation with
     real consumed-leaves overlay
   - Append a row to `import_runs` audit log
3. Inbox auto-refreshes on next focus event (or hard reload)

**6 months of data** is the recommended export window — no enforcement
in code, but the BeeLine "Reports → Timesheet" report has a date range
field. Set it to last 6 months at export time.

---

## 6. What's stored

```
employees (id, worker_id, client_id, name, email, role, department,
           manager_email, manager_name, avatar_color, start_date,
           earned_leaves, consumed_leaves)

timesheets (id, employee_id, client_id, period_start, period_end,
            submitted_at, status, total_hours, regular_hours,
            overtime_hours, leave_hours, total_payable,
            validation_score, flag_reason, flagged_by, approved_by,
            approved_at, ai_confidence, ot_payout_cycle)

daily_entries (timesheet_id, entry_date, day_of_week,
               regular_hours, overtime_hours, leave_hours, leave_type)

timesheet_validations (timesheet_id, rule_id, category, rule,
                       result, detail)

import_runs (id, source, client_id, row_count, error_count,
             warning_count, errors, warnings, unmapped_headers,
             imported_at)
```

Only fields actually rendered in the Inbox row + drawer + validation
panel are persisted. No extra denormalised columns.

---

## 7. Accenture validation rules (codified in lib/accenture-validation.ts)

```
Weekly cap:        45 hours

If hours > 45h:
  - Hours over cap classified as OT
  - Status:           pending_mgr_approval
  - OT payout:        deferred to next month's payroll
  - Action required:  email manager (employee CC'd) for approval
                      → Notify panel kind "timesheet-mgr-approval"

If hours <= 45h:
  - Check daily entries for leave hours
  - Verify against earned-leaves balance
  - Earned leaves accrue at 1.75 days/month from start_date
  - If consumed > earned → leave-balance check fails
                          → status flagged
                          → flag_reason = "Claimed N.NNd leave; only M.MMd available"

Daily cap: 12h per day across regular + OT + leave (warning only)

OT approver: warning when overtime_hours > 0 and no approver named
```

Score deduction: −20 per fail, −8 per warning (cap 0–100).

---

## 8. Re-running validation without re-importing

The validation runs at insert time, on every imported row. There's no
separate `/api/validate` endpoint — re-import the same CSV to re-validate
with updated rules or updated leave balances.

If you change validation rules (e.g. cap goes from 45 → 48), bump the
constant in `lib/accenture-validation.ts`, push, then re-import the
last CSV to refresh the inbox.

---

## 9. Troubleshooting

**"DATABASE_URL is not set" error on import**
You skipped step 2 (redeploy after creating the DB). Trigger a redeploy.

**"relation 'timesheets' does not exist" error on import**
You skipped step 3. Visit `/api/admin/migrate` once.

**Imported rows not showing in Inbox**
Inbox refreshes on window focus. Tab to another window and back, or
reload `/timesheets`.

**Worker has no manager_email → OT approval mail goes nowhere**
The drawer's "Request OT approval" button falls back to the internal
team escalation when no manager is on file. Update BeeLine to capture
manager email per worker.

**Re-import seems to add duplicates**
It shouldn't — every import begins with `DELETE FROM timesheets WHERE
client_id='acc'`. If you see duplicates, your API call wasn't atomic
(check Vercel logs for transaction failure).

---

## 10. Future (post-POC)

When path A (BeeLine REST API) lands, replace step 1 (manual CSV upload)
with a scheduled fetch + same downstream pipeline. The DB schema, API
read endpoint, and Inbox page don't change. Only the import source
changes.
