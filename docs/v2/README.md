# Agent Dashboard — Product Documentation v2

Complete revamp of the v1 product docs (April 10) to reflect what
actually shipped through April 24. v1 docs preserved unchanged
under [`../v1-archive/`](../v1-archive/) for historical reference.

---

## What's in here

```
docs/v2/
├─ README.md                     ← you are here
├─ PRODUCT_REALITY_CHECK.md      ← what shipped vs v1 plan; strategic shifts
├─ BRD.md                         ← business requirements: positioning, personas, business case
├─ PRD.md                         ← product requirements: IA, sections, design system reference
├─ JIRA_IMPORT.md                 ← how to bulk-import STORIES.csv into Jira (~5 min)
├─ STORIES.csv                    ← 12 epics + 143 stories, Jira-import ready
└─ fprds/                         ← per-surface deep-dives
   ├─ 01_INBOX_TIMESHEETS.md
   ├─ 02_INBOX_ONBOARDING.md
   ├─ 03_INBOX_PAYROLL.md
   ├─ 04_INBOX_COMPLIANCE.md
   ├─ 05_CLIENTS.md
   ├─ 06_EMPLOYEES_AND_PAYGRADE.md
   ├─ 07_COMPLIANCE_LIBRARY.md
   ├─ 08_POLICIES_AND_WORKFLOWS.md
   ├─ 09_AGENTS_AND_NOTIFYPANEL.md
   ├─ 10_HOME_DASHBOARD.md
   ├─ 11_SETTINGS_AND_ADMIN.md
   └─ 12_DESIGN_SYSTEM.md
```

---

## How to read these in order

**If you're a new joiner / new stakeholder:**
1. [PRODUCT_REALITY_CHECK.md](PRODUCT_REALITY_CHECK.md) — what's
   shipped, what changed since v1, why
2. [BRD.md](BRD.md) — what we sell, who uses it, what success means
3. [PRD.md](PRD.md) — how the product is structured (8 sections,
   shared shell, design system)
4. Pick the FPRD for the surface you'll work on
5. [STORIES.csv](STORIES.csv) — what's done, what's open

**If you're a developer picking up a ticket:**
1. Find the ticket on Jira (filter by Status: To Do)
2. Note the Epic Link → maps to an FPRD
3. Read the relevant FPRD section
4. Cross-reference acceptance criteria in the story + FPRD §AC summary

**If you're a PM updating scope:**
1. Update the FPRD first (source of truth for behavior + AC)
2. Update relevant stories on Jira (NOT in the CSV — Jira is the
   live source after initial import)
3. Note the change in PRODUCT_REALITY_CHECK if it's a major shift

---

## Doc → Code mapping (so it's easy to keep in sync)

| FPRD                              | Primary code path                                  |
| --------------------------------- | -------------------------------------------------- |
| 01 Inbox · Timesheets             | `app/timesheets/page.tsx` (default sub-tab)        |
| 02 Inbox · Onboarding             | `components/OnboardingInbox.tsx`                   |
| 03 Inbox · Payroll                | `components/PayrollInbox.tsx`                      |
| 04 Inbox · Compliance             | `components/ComplianceInbox.tsx`                   |
| 05 Clients                        | `app/clients/page.tsx` + `app/clients/[id]/page.tsx` |
| 06 Employees & Pay Grade          | `app/employees/page.tsx` + `app/employees/[id]/page.tsx` + `lib/types.ts` PayGrade types + `lib/mock-data.ts` derivePayGradeFields |
| 07 Compliance Library             | `app/compliance/page.tsx` + `app/compliance/[id]/page.tsx` + `lib/compliance-data.ts` |
| 08 Policies & Workflows           | `app/policy/page.tsx` + `lib/types.ts` PolicyWorkflow + `lib/mock-data.ts` deriveWorkflow + WORKFLOW_META |
| 09 Agents & NotifyPanel           | `app/agents/page.tsx` + `components/NotifyPanel.tsx` (9 builders) |
| 10 Home Dashboard                 | `app/page.tsx`                                      |
| 11 Settings & Admin               | `app/settings/page.tsx`                             |
| 12 Design System & Cross-cutting  | `app/globals.css` + `components/Sidebar.tsx` + `components/BottomNav.tsx` |

---

## Status snapshot (as of v2.1.0)

- **Shipped (Status: Done in CSV):** ~125 stories — covers all 8
  sections, 9 NotifyPanel builders, 7 workflow subfunctions, 9×9 pay
  grades, 503 regulations, 11 clients, 6 agents
- **Open (Status: To Do in CSV):** ~18 stories — v3 work, mostly
  backend integration: real LLM for LEXI/RIPLEY, real send for
  NotifyPanel, real-time activity feed, per-user persistence,
  accessibility audit, i18n

---

## Versioning

- **v1** (April 10) → archived at `docs/v1-archive/`
- **v2** (this folder, April 24) → live
- **v3** → next major scope shift; budget for backend integration +
  multi-tenant + a11y + i18n

When v3 starts: copy `docs/v2/` → `docs/v2-archive/`, create
`docs/v3/` from the v3 PRD.
