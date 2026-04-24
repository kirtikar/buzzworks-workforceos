# Product Reality Check — v2 vs v1 (April 10) docs

A short audit of what shipped vs what the original April-10 product docs assumed,
written before drafting BRD v2 / PRD v2 so the rewrite has a defensible baseline.

## TL;DR

The product moved from a single-purpose **timesheet validation tool for one
client persona** into a **multi-inbox agent control room for four ops
workflows** (timesheets, onboarding, payroll, compliance) with policy +
regulation engines feeding it. Branding shifted from "OpsDesk" to "Agent
Dashboard" and the ICP narrowed from "ops staff" to "Buzzworks Agent
Managers" — a deliberate productisation move that recasts the human user as
an *operator of agents* rather than a *worker doing tickets*.

About 75% of the v1 docs are now stale. Archived under `docs/v1-archive/`.

---

## What shipped (and is in production today)

### Sections (8 top-level)

1. **Home** — agent-manager dashboard with 4 KPI tiles + 4 charts (Ops cost
   % of net revenue with vs. without AI, Ops cost breakup pie, Ops cost by
   client, Resource utilisation as cases/FTE)
2. **Inbox** — 4 sub-tabs:
   - **Timesheets** — ~600 generated items, JARVIS validation,
     Flag / Reject / Notify-team / Approve, RIPLEY-drafted emails
   - **Onboarding** — ~260 items, 12 issue types, doc-collection /
     verification / validation / reconciliation / compliance stages
   - **Payroll** — ~72 items, 7 issue types, 4 stages
   - **Compliance** — actionable regulations from the library
3. **Clients** — 11 real client accounts (Capgemini, LTIMindtree, Accenture,
   Hexaware, Virtusa, Cognizant, PwC, Amphenol, Bahwan, Winomechanic, HMH);
   list page + detail page with 7 tabs
4. **Employees** — list with **9×9 pay grade lattice** (A1..I9),
   leave balance, region; detail page with grade card + compensation panel
5. **Compliance** — 503 regulations (10 featured, 493 scraped from
   TeamLease RegTech and rebranded to gov sources only); list with filters
   + per-regulation detail page in editorial layout
6. **Policies** — 23 policies grouped by **7 workflow subfunctions**
   (timesheet-validation, onboarding, leave-attendance, payroll, compliance,
   exit, fnf); All-policies vs By-client tabs; AI Policy Creator
7. **AI Agents** — 6 agents (LEXI, JARVIS, ORACLE, CASE, RIPLEY, TRON);
   pipelines view + roster + live activity feed + drawer
8. **Settings** — Appearance / Notifications / Account / Integrations /
   Security / System

### Cross-cutting

- **NotifyPanel** — bottom-right slide-in, RIPLEY-drafted emails for 9 use
  cases (compliance, client-compliance, timesheet-flag/reject/approve/team,
  document-request, onboarding-issue, payroll-issue)
- **AIAgentOrb** — floating helper
- **Design system** — pink palette, 7-step type scale (11/12/14/16/20/24/28),
  shared filter dropdown, stats strip, card patterns
- **Login** — `agentic@buzzworks.com`, "Agent Dashboard" branding,
  "For Buzzworks Agent Managers" subtitle
- **Sidebar / BottomNav** — "Agent Dashboard" branding throughout

---

## What was in v1 docs but never shipped

| v1 doc claim                                         | Reality                          |
| ---------------------------------------------------- | -------------------------------- |
| 25 client accounts (TechCorp, Infosys BPM, etc.)     | 11 real accounts as per BD table |
| 10 invented portal slugs (Veltrix, OrbitHCM…)        | 2 real VMS portals: Fieldglass + BeeLine |
| `emailOnly` boolean on clients                       | Replaced by `timesheetMethod: "portal" \| "manual"` |
| Single-FPRD scope: timesheet ingestion only          | 12 FPRDs needed (one per surface) |
| OpsDesk branding                                     | Agent Dashboard rebrand           |
| Generic "ops team" persona                           | "Buzzworks Agent Manager" persona |
| MAPE workflow (Monitor → Analyze → Plan → Execute)   | Replaced by named hand-off pipelines that map to actual product surfaces |
| 5 agents                                             | 6 agents (LEXI added as policy interpreter) |
| AI confidence shown in employee-facing emails        | All AI/JARVIS mentions stripped from outbound copy; RIPLEY footnote only |

---

## What shipped but isn't in any v1 doc

These need fresh FPRDs:

- **Onboarding inbox** (FPRD-02) — 12 issue types, severity bands,
  document-request + onboarding-issue NotifyPanel flows
- **Payroll inbox** (FPRD-03) — 7 issue types, ₹ exposure tracking, cycle
  blockers vs pre-run vs statutory vs post-run stages
- **Compliance article detail** (FPRD-07) — full editorial layout per
  regulation, related regulations, AI recommendation card
- **Pay grade lattice** (FPRD-06) — A1..I9, three pay modes (hourly /
  monthly / daily), monthly gross derivation
- **Workflow subfunctions** (FPRD-08) — orthogonal classification
  (workflow + category + severity)
- **Per-client compliance Notify-team** (FPRD-04) — AM + client contact
  + Buzzworks CC + client CC routing
- **Agent pipelines** (FPRD-09) — three named hand-off flows, live
  activity feed
- **Region filter on Clients** (FPRD-05)
- **CFO-anchored home charts** (FPRD-10) — ₹60 Cr ARR, 1–4% ops
  cost band, ₹12 L/mo AI savings
- **Design system tokens** (FPRD-12) — 7-step type scale,
  pink palette, NotifyKind taxonomy

---

## Strategic shifts to acknowledge in v2

1. **From "tool" to "console"**: the user is not finishing tickets; they are
   supervising agents that finish tickets. Every interaction surface should
   show what an agent already did, what it recommends, and what the human
   needs to sign off.
2. **From single workflow to four**: ops at Buzzworks isn't just timesheets;
   it's onboarding, payroll, and compliance too. Each gets first-class
   inbox real estate and its own NotifyPanel template family.
3. **From client list to managed-workforce roster**: 11 clients with
   real names, real domains, real portal/manual classification.
4. **From flat policies to workflow-grouped policies**: clients buy ops
   outcomes, not "rules"; surfacing rules under the workflow they govern
   makes the policy library an operating manual rather than a config screen.
5. **From "AI helps you" to "AI is a named coworker"**: each agent has a
   role, a scope, an in/out hand-off graph, and live volume metrics. RIPLEY
   doesn't sign emails inline; it only attributes via a footnote — the
   illusion is that ops wrote it.

---

## Implications for v2 docs

- BRD needs new positioning + new persona + new TAM math
- PRD needs a real information architecture for 8 sections + design
  system reference
- FPRDs need to triple (3 → ~12) to cover everything that shipped
- Stories need to be re-estimated — most v1 work is done; v2 stories
  are mostly polish, depth, and integration work
