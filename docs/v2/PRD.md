# Product Requirements Document (PRD) — v2

**Product:** Agent Dashboard
**Version covered:** v2.1.0 (current production)
**Sister docs:** BRD.md, fprds/01..12.md, STORIES.csv

This PRD is the architectural map. Per-surface depth lives in the FPRDs.

---

## 1. Product overview

Six AI agents handle the bulk of Buzzworks ops triage; an Agent Manager
reviews their reasoning trails and signs off. The product is a single SPA
console organised into **eight top-level sections** plus shared cross-
cutting components.

```
AGENT DASHBOARD
├─ Home          (KPI tiles + 4 charts; cross-section overview)
├─ Inbox         (4 sub-tabs: Timesheets, Onboarding, Payroll, Compliance)
├─ Clients       (list + per-client detail with 7 tabs)
├─ Employees     (list + per-employee detail; pay grade as central concept)
├─ Compliance    (regulation library + per-regulation detail page)
├─ Policies      (All policies + By client; grouped by workflow subfunction)
├─ AI Agents     (roster + pipelines + live activity)
└─ Settings      (Appearance, Notifications, Account, Integrations, Security, System)
```

---

## 2. Information architecture

### 2.1 Navigation

- Persistent left sidebar (desktop) → 8 nav items + Settings
- Bottom nav (mobile) → 4 primary + a "More" sheet for the rest
- Active item: pink accent + left vertical bar marker

### 2.2 Page anatomy

Every section page follows the same shell:

```
[Header]               px-6 lg:px-8 py-5
  h1.text-xl.font-semibold     ← page title
  p.text-[13px].mt-0.5         ← page subtitle / counts
  [optional action button]     ← right-aligned, flex-shrink-0

[Tab bar]              optional, sits inside or below header
  px-6 lg:px-8 py-2

[Filter bar]           px-6 lg:px-8 py-3
  flex flex-wrap items-center gap-2
  filter dropdowns first, then any toggles, then `ml-auto` search,
  then sort selector at the right

[Stats strip]          px-6 lg:px-8 py-2.5  background: var(--bg)
  text-xs caption-style metrics, totals, exposure

[Bulk action bar]      conditionally rendered when selection exists
  px-6 lg:px-8 py-2.5  background: var(--pink-50)

[Body]                 flex-1 overflow-y-auto pb-nav lg:pb-0
  cards / table / feed depending on surface
```

This shell is enforced across Home, Inbox (×4), Clients, Employees,
Compliance, Policies, Agents, Settings, Payroll, Integrations.

---

## 3. Sections — high-level scope

### 3.1 Home (FPRD-10)

Agent-manager dashboard. CFO-anchored numbers; everything reconciles to
the central financial baseline (₹60 Cr ARR / ₹500 L monthly net revenue
/ ₹18 L April ops cost / 3.6% ratio).

**Components**
- 4 KPI tiles: Monthly Ops Cost, Cases Resolved / FTE, Auto-Approval Rate, SLA Adherence
- Chart 1: Ops Cost as % of Net Revenue (with AI vs without AI, 6-mo trend)
- Chart 2: Ops Cost Breakup (donut, 9 sub-functions)
- Chart 3: Ops Cost by Client (bar list, top 8 + efficiency %)
- Chart 4: Resource Utilisation (cases/FTE bars + headcount line)

### 3.2 Inbox · Timesheets (FPRD-01)

Gmail-style flat list of timesheets needing action. Each row expands
inline; right-side detail drawer for deep review.

**Pipeline:** LEXI compiles policies → CASE validates data → JARVIS
scores + decides → auto-approve OR RIPLEY drafts notify

**Per-row actions**
- Bulk: Approve, Flag, Reject (uses first selected as template for RIPLEY)
- Per-row: Approve (quick), open drawer
- Drawer: Approve, Notify Team (3-button row: Notify team, Flag, Reject)

### 3.3 Inbox · Onboarding (FPRD-02)

12 issue types across 5 stages (doc-collection, verification, validation,
reconciliation, compliance). Severity bands: high/medium/low.

**Per-row actions**
- Bulk: Mark resolved, Notify team
- Per-row: open drawer
- Drawer: Mark resolved, Notify team, Request document

### 3.4 Inbox · Payroll (FPRD-03)

7 issue types across 4 stages (pre-run, cycle-block, statutory, post-run).
Tracks ₹ exposure per issue.

### 3.5 Inbox · Compliance (FPRD-04)

Same Gmail-list pattern as Timesheets, but for regulations. ORACLE feeds
this; RIPLEY drafts the team alert.

### 3.6 Clients (FPRD-05)

Two surfaces:
- **List:** 11 cards with industry, region, portal/manual chip, employees,
  monthly payroll, compliance score, action count
- **Detail:** 7 tabs — Overview, Timesheets, Employees, Onboarding, Policy,
  Compliance, Payroll — each scoped to that single client

### 3.7 Employees (FPRD-06)

- **List:** Pay grade column, leave balance, region, joined, status, sort
- **Detail:** Pay grade card (band + step + mode + declared rate + monthly
  gross), employment details, timesheet history, leave, risk profile

### 3.8 Compliance (FPRD-07)

- **List:** 503 regulations, filters (Category, Impact area, Region,
  Client, Legal risk, Action required), pagination 25/page
- **Detail:** `/compliance/[id]` — editorial layout (intro, context, key
  changes, requirements, deadlines, penalty, action steps, impact areas,
  affected clients, AI rec, official source, related regs)

### 3.9 Policies (FPRD-08)

- **All policies** view: 23 policies grouped by workflow subfunction
- **By client** view: filter to one client at a time
- **AI Policy Creator** modal: plain-English → parsed rule → save

### 3.10 AI Agents (FPRD-09)

- **Hero:** title + 1-paragraph operational copy + impact strip (4 KPIs)
- **Pipelines:** 3 named hand-off flows showing source → agent steps → sink
- **Roster:** 6 agent cards with today volume + headline metric + in/out chips
- **Live activity:** 15-row reverse-chronological feed
- **Drawer:** per-agent acronym, capabilities, hand-off chips, surfaces in
- **Principles:** 3-line footer

### 3.11 Settings (FPRD-11)

6 sub-sections: Appearance, Notifications, Account, Integrations, Security, System.

---

## 4. Cross-cutting modules

### 4.1 NotifyPanel (FPRD-09)

Bottom-right slide-in (440px wide). RIPLEY-drafted email composer with
9 templated kinds:

| Kind                | To                          | CC                                | Use                              |
| ------------------- | --------------------------- | --------------------------------- | -------------------------------- |
| `compliance`        | ops-lead@buzzworks.com      | compliance@buzzworks.com          | Compliance inbox notify          |
| `client-compliance` | client contact + AM         | Buzzworks compliance + client compliance | Per-client regulation alert |
| `timesheet-flag`    | employee                    | manager                           | Flag timesheet for clarification |
| `timesheet-reject`  | employee                    | manager                           | Reject timesheet                 |
| `timesheet-approve` | employee                    | —                                 | Approval confirmation            |
| `timesheet-team`    | hr-ops@buzzworks.com        | manager                           | Internal: timesheet inconsistency review |
| `document-request`  | candidate                   | manager                           | Onboarding doc reminder          |
| `onboarding-issue`  | onboarding-ops@buzzworks    | hr-ops@buzzworks                  | Internal: onboarding blocker     |
| `payroll-issue`     | payroll@buzzworks           | finance-ops@buzzworks             | Internal: payroll cycle issue    |

**Subject conventions** (see FPRD-12 §3 for full grammar):
- Timesheet emails: `<prefix> — <employeeCode>: <main issue>[ (N issues)][ · <period>]`
- Compliance: `Action required: <title>` (or `<client> · action required: <title>`)
- Onboarding: `Onboarding blocker — <candidate> · <issue type>`
- Payroll: `Payroll review — <client> · <cycle>`

**Body conventions**
- Employee-facing emails: no AI/JARVIS mention; ops-voice; bulleted issues; RIPLEY footnote only
- Internal emails: explicit issue list, recommendation, RIPLEY footnote

### 4.2 AIAgentOrb

Floating helper, present on Clients, Employees, Policies, Settings (legacy
surfaces). To be retired in v3 in favour of a contextual command palette.

### 4.3 Filter dropdown component

Single shared multi-select pattern used across every list page:
- Closed: `border + label + active count badge`
- Open: portal-positioned panel with checkboxes + "Clear all"
- Behaviour: outside-click closes; selection rebuilds the URL search-state (TBD in v3)

### 4.4 Stats strip + Bulk action bar

Standard horizontal strips that sit between filters and content. Same
typography, padding, and color tokens across every inbox.

---

## 5. Design system reference

Full spec lives in FPRD-12. Key tokens:

### 5.1 Type scale (7 sizes)

| Token    | Size | Use                                                        |
| -------- | ---- | ---------------------------------------------------------- |
| caption  | 11px | timestamps, chip counts, byline meta, table sub-labels     |
| meta     | 12px | buttons, filter chips, form labels, dense table cells      |
| body     | 14px | default paragraph, card body, list rows, table data        |
| heading  | 16px | section titles, card titles                                |
| title    | 20px | page titles (h1)                                           |
| stat     | 24px | KPI tile values                                            |
| display  | 28px | hero / large stat numbers                                  |

### 5.2 Color palette (pink primary)

- `--pink-50` through `--pink-700` (primary system)
- `--accent` = `var(--pink-700)` for CTAs
- `--surface`, `--surface-2`, `--bg`, `--border`, `--border-strong`
- `--text-1`, `--text-2`, `--text-3` for hierarchy
- `--warn`, `--warn-bg`, `--warn-border` (amber)
- `--danger`, `--danger-bg`, `--danger-border` (red, reserved for hard fails)

### 5.3 Spacing primitives

- Page chrome: `px-6 lg:px-8 py-5` (header), `px-6 lg:px-8 py-3` (filter bar)
- Card chrome: `p-4` or `p-5` for primary cards; `rounded-xl`
- Drawer chrome: `w-[420px]` or `w-[440px]` for NotifyPanel

---

## 6. Data model summary

(Detailed types in `lib/types.ts`)

- **Client** — 11 entries; `timesheetMethod: "portal" | "manual"`,
  `portalId?: "fieldglass" | "beeline"`
- **Portal** — 2 entries (Fieldglass, BeeLine)
- **Employee** — pay grade A1..I9, pay mode hourly/monthly/daily,
  derived `payRate`
- **Timesheet** — source portal/email/manual, validation checks,
  validation score, AI confidence, flag reason
- **Regulation** — 503 entries; category × impact areas × region ×
  legal risk × operational impact × clients affected
- **PolicyRule** — workflow subfunction (7) × category (6) × severity (3)
- **OnboardingIssue** — 12 issue types × 5 stages × 3 severities
- **PayrollIssue** — 7 issue types × 4 stages × 3 severities

---

## 7. Out of scope (v2 PRD)

- Real backend / persistence (UI is fully client-side mock data)
- Authentication beyond demo cookie
- Real LLM calls (RIPLEY drafts are templated; LEXI parsing is mocked)
- Real portal sync (no actual API to Fieldglass/BeeLine)
- Email send (NotifyPanel "Send" button is a 500ms simulation)
- Mobile-first (responsive only; bottom nav sheet for the More menu)
- Real audit log / observability backend
