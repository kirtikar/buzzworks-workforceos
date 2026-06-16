# OpsDesk — Product Release Notes (v1.0)
## Internal Operations Walkthrough

**For:** Buzzworks Operations Team
**Live at:** https://dev.era.ai
**Release date:** 16 June 2026
**Prepared by:** Kirtikar Consulting

> **How to read this document.** Each section walks through one page or feature of the OpsDesk dashboard with: (a) what it is, (b) where to click, (c) what the data means, (d) tips the team should know. Screenshot placeholders are marked `[SCREENSHOT]` — replace with an actual image and the annotated arrows shown beneath each placeholder.

---

## What's New in This Release

| # | Feature | Page | Status |
|---|---|---|---|
| 1 | **Server-paginated Inbox** — fast load, on-demand drawer detail | `/timesheets` | live |
| 2 | **Bulk-approval rules** — one-click clearance of clean timesheets | `/timesheets` | live |
| 3 | **Weekly day-by-day breakdown** — visible in the timesheet drawer | `/timesheets` | live (NEW) |
| 4 | **Google-Calendar-style monthly view** — per-employee timesheet calendar with approval-coloured cells | `/employees/[id]` | live |
| 5 | **Worker profile schema (Phase 1)** — 8 tables ready to ingest Fieldglass Worker page data | DB | shipped, ingest pending |
| 6 | **Pre-aggregated client KPIs** — Home Ops-Cost-by-Client chart wired to live rosters | `/` | live |
| 7 | **Per-client KPI page** — Active / Pending / Payroll / Expenses | `/clients/[id]` | live |
| 8 | **Trigram search** — fast worker name / email lookup | `/employees`, `/timesheets` | live |
| 9 | **Password-protected access** — `agentic@buzzworks.com` + ops password | `/login` | live |
| 10 | **Fieldglass + BeeLine ingestion** — Capgemini / Accenture timesheet, daily, and expense sheets | backend | live |

**Data live today:** Capgemini (Fieldglass) — **3,620 timesheets**, **494 employees**, **24,944 day-wise entries**, **297 expense sheets**, **₹6.5cr March payroll**, **₹6.6cr April payroll**.

---

## 1. Login & Access

The dashboard is gated. Only ops team members with the credentials may sign in.

```
[SCREENSHOT 1 — /login]
   ┌───────────────────────────────────────────┐
   │                                           │
   │           Agent Dashboard                 │
   │   For Buzzworks Agent Managers            │
   │                                           │
   │   Sign in                                 │
   │   Access restricted to Buzzworks Agent…   │
   │                                           │
   │   Email address    [_________________]    │  ← arrow: use agentic@buzzworks.com
   │   Password         [_________________]    │  ← arrow: contact ops for the secret
   │                    Sign in →              │
   │                                           │
   │   ─── access hint ───                     │
   │   🔒 Use the email below — password       │
   │      protected                            │
   │      agentic@buzzworks.com                │
   │      Contact ops for the password.        │
   │                                           │
   └───────────────────────────────────────────┘
```

**Annotation arrows:**
- Top arrow → email field, "use `agentic@buzzworks.com`"
- Bottom arrow → access-hint card, "password is internal — never leaked client-side"

**Tip:** the session cookie lasts 8 hours; sign-in once per workday.

---

## 2. Inbox — Timesheet Triage

The Inbox is the primary working surface. It lists every pending timesheet across all clients and lets ops triage them with filters, search, bulk rules, and one-click actions.

### 2.1 Page Structure

```
[SCREENSHOT 2 — /timesheets, no filter selected]

  ┌──────────────────────────────────────────────────────────────────────────┐
  │  Inbox                                                                   │
  │  143 items need your attention                                           │
  │                                                                          │
  │  [Timesheets 143]  [Compliance 12]  [Onboarding 4]  [Payroll 0]          │ ← category tabs
  │                                                                          │
  │  [Needs action 143] [Status ▼] [Client ▼] [Source ▼] [Score ▼]           │ ← filter row
  │  [Has overtime 19]  [Clear (3)]                                          │
  │                                                       [Search…] [Sort ▼] │
  │  ────────────────────────────────────────────────────────────────────────│
  │  143 items · 19 flagged · 19 with overtime              Page 1 of 4      │
  │  ────────────────────────────────────────────────────────────────────────│
  │  ✨ Quick rules:                                                          │
  │  [Score ≥ 95, all checks pass  87 ✓] [Portal source, no flags  62 ✓]     │ ← bulk approve
  │  ────────────────────────────────────────────────────────────────────────│
  │  □  ⏰ CAP   VENKATESWARLU GUDIKANDULA · Apr 27-May 3 · 45h  ⚡Auto      │
  │  □  ⏰ CAP   P KAVYA · Apr 27-May 3 · 45h               ⚡Auto  100 →   │
  │  □  ⚠️ CAP   RAVI KUMAR · Apr 27-May 3 · 47h (+2 OT)   Verify OT  82 → │
  │  …                                                                       │
  └──────────────────────────────────────────────────────────────────────────┘
```

**Annotation arrows:**
- Top arrow → category tabs (Timesheets / Compliance / Onboarding / Payroll); switch focus area
- Middle arrow → filter row (multi-select); narrows the queue
- Bottom arrow → Quick Rules bar; one click approves every timesheet matching the rule

### 2.2 Row Anatomy

| Element | Meaning |
|---|---|
| Checkbox | Multi-select for bulk approve / flag / reject |
| Status icon | ⏰ pending · ✨ reviewing · ⚠️ flagged · ✅ approved · 💵 processed · ❌ rejected |
| Client chip | Coloured by client (Capgemini blue, Accenture purple, …) |
| Worker name | Full name from Fieldglass / BeeLine portal |
| Period · hours | "Apr 27 – May 3, 2026 · 45h"; overtime appears as `(+2 OT)` in amber |
| Source icon | 🌐 portal · ✉️ email · ✏️ manual |
| AI chip | JARVIS recommendation: **Auto-approve** / Notify HR / Verify OT pre-approval / Manual review |
| Score | Validation score 0–100 (green ≥85, amber 60–84, red <60) |
| Quick Approve button | One-click approve for actionable rows with no failures |

### 2.3 Filters

- **Needs action** — pin to actionable statuses only (pending / reviewing / flagged / pending OT approval).
- **Status** — multi-select across all 7 timesheet statuses.
- **Client** — narrow to one or more real-data clients.
- **Source** — Portal / Email / Manual.
- **Score** — High (≥85), Medium (60–84), Low (<60).
- **Has overtime** — only show rows with OT > 0.
- **Search** — debounced 250 ms — searches worker name, email, employee code, period.

### 2.4 Drawer (Click Any Row)

```
[SCREENSHOT 3 — /timesheets with a row expanded — side drawer visible]

  ┌────────────────────────────┬─────────────────────────────────────────┐
  │ INBOX LIST (continues)     │ DRAWER — Worker · Apr 27 – May 3        │
  │ …                          │ CAP  Apr 27 – May 3, 2026               │
  │ ▶ ROW IS EXPANDED          │                                         │
  │                            │  Fieldglass Contractor                  │
  │                            │  IT Park - Hyderabad · Capgemini        │
  │                            │                                         │
  │                            │  HOURS                                  │
  │                            │  Regular 45h    Overtime 0h   Leave 0h  │
  │                            │  ────────────────────────────────────── │
  │                            │  Total payable    ₹38,250               │
  │                            │                                         │
  │                            │  WEEKLY BREAKDOWN · Apr 27 – May 3      │ ← NEW (this release)
  │                            │  ┌────┬────┬────┬────┬────┬────┬────┐  │
  │                            │  │MON │TUE │WED │THU │FRI │SAT │SUN │  │
  │                            │  │ 27 │ 28 │ 29 │ 30 │  1 │  2 │  3 │  │
  │                            │  │ 9h │ 9h │ 9h │ 9h │ 9h │ —  │ —  │  │
  │                            │  └────┴────┴────┴────┴────┴────┴────┘  │
  │                            │  Worked 5/7 days · Avg 9h/day           │
  │                            │                                         │
  │                            │  JARVIS · Capgemini policy   95% conf   │
  │                            │  ✓ 45h  ✓ Holiday  ✓ Leave  ✓ Balance   │
  │                            │  ✓ OT mgr  ✓ Status                     │
  │                            │  Validation score              100      │
  │                            │  [✓ Approve timesheet]                  │
  │                            │  [📧 Notify team — flag inconsistencies] │
  │                            │  [🚩 Flag] [❌ Reject]                   │
  └────────────────────────────┴─────────────────────────────────────────┘
```

**Annotation arrows:**
- Arrow at "WEEKLY BREAKDOWN" → "NEW: Day-by-day strip — shows what hours were logged each day of the week. Same colour palette as the Employee Detail calendar."
- Arrow at "JARVIS" row → "Per-client validation engine — each tile is a rule (45h cap, holiday fill, leave inference, OT approval, etc.)"
- Arrow at action buttons → "Single-click triage — Approve / Flag / Reject / Email manager"

### 2.5 Bulk Rules

Three preset rules clear the easy stuff in one click:

1. **Score ≥ 95, all checks pass** — auto-approves clean submissions.
2. **Portal source, no flags** — approves portal-synced timesheets with zero failures.
3. **Under 40h, single client** — approves standard non-OT weeks.

Each rule shows the count of rows it would approve on the current page. Click to approve all matching rows at once. Audit log records `approvedBy = "Siddharth Kirtikar (Bulk)"`.

### 2.6 Manager Escalation (OT > 45h)

If a row has Total Hours > 45 and the worker's manager email is on file, the drawer surfaces a **Request OT approval from manager** button. Clicks open a templated email pre-filled with:

- Worker name, employee code
- Period, regular vs OT split
- Over-cap delta (e.g., "2.5h over 45h cap")
- "Please approve before next month's payroll"

If no manager email exists, falls back to internal team escalation.

---

## 3. Employees — Directory

```
[SCREENSHOT 4 — /employees]

  ┌─────────────────────────────────────────────────────────────────────────┐
  │  Employees                                                              │
  │  494 employees                                                          │
  │                                                                         │
  │  [Client ▼] [Department ▼] [Region ▼] [Status ▼]                        │ ← multi-select
  │                                                          [Search…]      │
  │  ─────────────────────────────────────────────────────────────────────  │
  │  Name              Client    Region          Role            Started    │
  │  ─────────────────────────────────────────────────────────────────────  │
  │  B M Ruby          CAP       EPIP industry…  Fieldglass…     —          │
  │  P Kavya           CAP       IT Park - Hyd…  Fieldglass…     —          │
  │  …                                                                      │
  │                                                                         │
  │                                          Page 1 of 10 · 494 employees   │
  └─────────────────────────────────────────────────────────────────────────┘
```

**Annotation arrows:**
- Filter row → "Server-side filtered; results update on toggle"
- Search box → "Trigram-indexed; finds partial matches instantly even at 494+ rows"
- Pagination → "50 per page; data lazy-loaded as you scroll into the drawer"

### 3.1 Employee Drawer Tabs

Click any row to open a side drawer with 4 tabs:

| Tab | Contents |
|---|---|
| **Overview** | KPI strip: total timesheets, approved, flagged, avg validation score. Weekly hours chart (last 7 weeks). Expense sheets card with Invoiced / Pending totals + scrollable list with deep-link to Fieldglass |
| **Timesheets** | Filterable list of every timesheet (status, source, approver). Quick view of each |
| **Leave** | Annual / sick / casual balance + utilisation bars |
| **Risk Profile** | Aggregate of validation failures, OT frequency, late submissions over time |

---

## 4. Employee Detail Page

Each row in the Employee directory links through to a dedicated profile page at `/employees/[id]` with tabs for **Overview**, **Timesheets**, **Leave**, and **Risk Profile**.

### 4.1 Google-Calendar-Style Monthly View (NEW)

The Timesheets tab now shows a **Google-Calendar-style monthly view** colour-coded by approval status — the headline new feature in this release.

```
[SCREENSHOT 5 — /employees/[id] · Timesheets tab · Calendar visible]

  ┌──────────────────────────────────────────────────────────────────────┐
  │  April 2026                                       [< ] [Today] [> ]  │  ← month nav
  │  178h worked · 18 approved · 4 pending · 8h leave                    │  ← summary line
  │                                                                      │
  │  MON  TUE  WED  THU  FRI  SAT  SUN                                   │
  │  ─────────────────────────────────────                               │
  │       1    2    3    4    5    6      ← prev month days (dimmed)     │
  │  7    8    9    10   11   12   13                                    │
  │  14   15   16   17   18   19   20                                    │
  │  ─────────────────────────────────────                               │
  │  21   22   23   24   25   26   27                                    │
  │  9h   9h   9h   9h   9h   —    —      ← green = approved             │
  │  ─────────────────────────────────────                               │
  │  28   29   30   1    2    3    4      ← next month days (dimmed)     │
  │  9h   8h   8h                                                        │
  │  PEN  PEN  PEN                        ← orange = pending             │
  │                                                                      │
  │  Legend:  ▇ Approved  ▇ Pending  ▇ Leave  ▇ No submission            │
  └──────────────────────────────────────────────────────────────────────┘
```

**Annotation arrows:**
- Top arrow → "Month navigation — left / right slides, 'Today' jumps to current month"
- Mid arrow → "Cell colour by **approval status**, NOT just by hours. Green = approved/processed, Orange = pending/reviewing/flagged, Red = rejected, Indigo = leave"
- Bottom arrow → "Greyed cells = days outside the current month (Google Calendar convention)"

#### Behaviour Notes
- **Dynamic 5 or 6 rows** — Google Calendar's actual behaviour; the grid shrinks when the month fits in 5 weeks.
- **Today's cell** carries a pink ring outline.
- **Click a cell** with an externalUrl → opens the source portal's day-wise view in a new tab.
- **Header summary** counts approved days, pending days, total worked hours, and leave hours — in-month only.

### 4.2 Other Tabs

The Overview tab shows the Last-6-Months payroll trend with a NA placeholder for months with no data — keeps the chart honest about partial coverage.

The Risk Profile tab aggregates validation-rule failures over time so ops can spot workers with recurring issues.

---

## 5. Client Detail Page

```
[SCREENSHOT 6 — /clients/cap]

  ┌─────────────────────────────────────────────────────────────────────┐
  │  Capgemini                                                          │
  │  [Active 494] [Pending 143] [March ₹6.5cr] [April ₹6.6cr]           │ ← KPI strip
  │                                                                     │
  │  [Overview] [Timesheets] [Employees] [Compliance] [Policy] [Payroll]│ ← tabs
  │  ─────────────────────────────────────────────────────────────────  │
  │  …                                                                  │
  └─────────────────────────────────────────────────────────────────────┘
```

**Annotation arrows:**
- KPI strip → "Live numbers pulled from `/api/employees/[clientId]` — refreshed on every visit, cached 15s"
- Tabs → "Per-client deep-dive; same structure as the global pages but filtered to this client"

### 5.1 KPIs Explained

| KPI | Source |
|---|---|
| **Active** | `COUNT(*)` on `employees` where `client_id = X` and `is_test_data = false` |
| **Pending** | `COUNT(*)` on `timesheets` where `status IN ('pending','reviewing')` |
| **March / April Payroll** | `SUM(total_payable)` on `timesheets` filtered by month |
| **Expense Invoiced / Pending** | `SUM(amount)` on `expense_sheets` filtered by status |

---

## 6. Home — Ops Cost by Client

```
[SCREENSHOT 7 — /]

  ┌─────────────────────────────────────────────────────────────────────┐
  │  Ops Cost by Client                                                 │
  │  Real-time monthly cost per client × revenue × efficiency           │
  │                                                                     │
  │  Capgemini  ████████████████████████  494 emp · ₹17.3L / ₹44.5L     │
  │  Hexaware   ███████                    85 emp · ₹3L / ₹7.7L         │
  │  …                                                                  │
  └─────────────────────────────────────────────────────────────────────┘
```

**Annotation arrow:** "Wired to `/api/clients/summary` — a single SQL query returns all clients' KPIs in one round trip"

Cost model (back-of-envelope, configurable):
- Ops cost ≈ `employees × ₹350 / worker / month`
- Revenue ≈ `employees × ₹9,000 / worker / month`
- Efficiency = cost / revenue (target band: 1–4 %)

---

## 7. Backend & Data Sources

### 7.1 What's Ingested

| Source | Pipeline | Volume Today |
|---|---|---|
| **Fieldglass Supplier Portal** (Capgemini) | Playwright scraper (login, jqx-grid pagination, per-TSN search) → JSONL → Postgres | 3,620 timesheets, 494 workers, 24,944 day-wise entries, 297 expense sheets |
| **BeeLine** (Accenture) | CSV import → Postgres | Inactive until production CSVs arrive |
| **Hexaware / LTIMindtree / PwC** | Manual / portal import (planned) | Empty today |

### 7.2 Database (Supabase Postgres, Mumbai region)

8 core tables today:

```
employees          ─── timesheets  ─── daily_entries
                        │
                        └── timesheet_validations
                        │
                        └── expense_sheets
                        │
                        └── import_runs (audit)
```

8 worker-profile tables seeded for the next phase (Fieldglass Worker page snapshot):

```
worker_profiles          ─── worker_assignments
                         ├── worker_documents
                         ├── worker_tasks
                         ├── worker_compliance
                         ├── worker_equipment
                         ├── worker_approvers
                         └── worker_profile_snapshots
```

The crawler + parser scaffold is in `scripts/scrape-fieldglass-workers.ts` and `scripts/ingest-fieldglass-workers.ts`. Awaiting one sample Fieldglass Worker page to harden tab parsers.

### 7.3 Performance Indexes

Composite + trigram indexes on the hot paths so server-side filtering / sort / search remain index-bound:

- `(client_id, period_start DESC, status)` — Inbox sort + status filter
- `(employee_id, period_start DESC)` — Employee detail history
- Partial `WHERE overtime_hours > 0` — OT-only filter
- pg_trgm GIN on `employees.name` + `employees.email` — fast ILIKE search

---

## 8. Known Limitations / Coming Next

| Item | Why it's deferred | When |
|---|---|---|
| BeeLine ingestion at scale | Real Accenture CSV cadence not yet locked | Phase 2 |
| Fieldglass Worker profile snapshot | Awaiting sample Worker page for parser hardening | Phase 2 (~2 weeks after access) |
| Compliance overlay (TeamLease RegTech) | Scoped but not built | Phase 2 |
| Payroll handoff (downstream file / API) | Awaiting downstream system contract | Phase 2 |
| Server-side auth (vs client-side password) | Demo-grade today; move to env-var + secure cookie before public exposure | Phase 2 |

---

## 9. Quick-Start Cheat Sheet for Ops

| Want to … | Do this |
|---|---|
| Triage today's actionable items | Inbox → "Needs action" toggle ON → sort by Lowest score first |
| Approve all clean timesheets | Inbox → toggle "Needs action" → click rule "Score ≥ 95, all checks pass" |
| See last week's hours per day for a worker | Inbox → click row → drawer → scroll to **Weekly breakdown** |
| Spot OT > 45h | Inbox → "Has overtime" toggle ON |
| Email a manager for OT approval | Drawer → "Request OT approval from manager" button |
| See a worker's calendar | Click worker name → goes to `/employees/[id]` → Timesheets tab |
| See March vs April payroll for one client | `/clients/[id]` → KPI strip at the top |
| Cross-check against the source portal | Any timesheet drawer → "View day-wise on Fieldglass →" link |

---

## 10. Support & Feedback

| Topic | Channel |
|---|---|
| Bug / unexpected behaviour | Ops Slack #opsdesk-feedback |
| New feature ask | Same channel, prefixed `[feature]` |
| Data discrepancy | Same channel, attach the Inbox row URL + portal screenshot |
| Production outage | Page on-call (Kirtikar Consulting) |

---

_Document version: v1.0 · Built from commit `60a8689` on 16 June 2026. Replace `[SCREENSHOT N]` placeholders with actual annotated screenshots before circulating widely._
