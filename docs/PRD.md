# Product Requirements Document (PRD)
## OpsDesk — Timesheet & Payroll Operations Platform

**Document ID:** PRD-OD-001  
**Version:** 1.0  
**Status:** In Review  
**Date:** 2026-04-10  
**Product Manager:** Buzzworks Product Team  
**References:** BRD-OD-001, FPRD-OD-001 through FPRD-OD-007  

---

## 1. Product Vision

> **OpsDesk turns the Buzzworks ops team from reactive validators into strategic partners** — by automating the repetitive, high-volume validation work with AI agents, and giving ops the tools to monitor, intervene, and improve at a level of precision that was impossible before.

---

## 2. Product Principles

1. **Ops-first UX** — Every screen is designed for the ops team's real workflow, not a generic HR admin. Speed and clarity over completeness.
2. **AI as a co-worker, not a black box** — Agent Mark doesn't just approve. It explains what it checked, what it found, and why it decided what it decided. Ops can always override.
3. **Client specificity is a first-class feature** — Everything — policies, reports, payroll batches, compliance scores — is scoped to the client. The system never conflates clients.
4. **Auditability over convenience** — Ops actions are always logged. Agent actions are always logged. There are no untracked state changes.
5. **No configuration, no deployment** — Ops team must be able to create policy rules, update SLAs, and configure portal connections without involving engineering.

---

## 3. Users & Use Cases

### Primary User: Ops Associate
**Who:** 3–4 team members who process timesheets daily  
**Core jobs-to-be-done:**
- Open the queue, see what needs attention today
- Review flagged timesheets and take a decision (approve / reject / escalate)
- Track whether SLAs are being met
- Add or adjust a policy rule when a client raises a new requirement

### Secondary User: Ops Lead (Riya Shah)
**Who:** Single team lead who oversees all clients and team output  
**Core jobs-to-be-done:**
- Get a daily overview of the full ops picture (KPIs, SLA health, agent activity)
- Review team workload and reassign if needed
- Approve payroll batches before they go to finance
- Pull a compliance report for a client on demand

### Tertiary User: Finance Team
**Who:** 1–2 finance team members who process approved payroll  
**Core jobs-to-be-done:**
- Download approved payroll batch for a specific client
- Verify batch totals before bank processing
- Flag discrepancies back to ops

---

## 4. Feature Map

### F-1: Overview Dashboard
- Real-time KPIs: pending timesheets, today's processed, auto-approval rate, active flags
- Trend chart: weekly timesheet volume (received vs. processed vs. auto-approved)
- AI insights feed: anomalies and suggestions from Agent Nova and Agent Lumen
- SLA health indicator: timesheets approaching breach
- Portal sync status: last sync time per integration

### F-2: Timesheet Inbox
- Tabbed filter: All / Pending / Flagged / Reviewing / Approved / Rejected
- Per-timesheet card: employee, client, period, hours summary, source badge (portal/email), AI confidence score
- Quick actions: Approve / Reject / Flag / Escalate
- Detail panel: full validation check list, daily breakdown, policy check results, AI notes
- Agent Mark badge on auto-approved timesheets (non-editable within 48h unless override requested)

### F-3: Client Management
- Client list with search, industry filter, portal filter, sort
- Client card: compliance score bar, pending count, portal badge, monthly payroll
- Client detail (5 tabs):
  - **Overview:** trend chart, status pie, integration panel, policy snapshot
  - **Timesheets:** filtered timesheet list for this client
  - **Employees:** employee table with generated entries
  - **Policies in Force:** full policy rule set for this client (prominent, editable)
  - **Payroll:** batch history and approval workflow

### F-4: Employee Directory
- Cross-client employee table
- Left filter sidebar: client, job category, city, status, rate range
- Leave balance indicators (annual / sick / casual used vs. total)
- Employment status badges: active / notice / ended / on hold
- Seeded deterministic generation for clients with large headcounts

### F-5: Policy Engine
- Per-client policy rule list
- Rule card: category, severity, trigger condition, action, toggle
- AI Policy Creator: natural language → structured rule (Agent Lumen)
- Quick suggestion chips for common policy patterns
- Rule categories: hours / overtime / leave / attendance / payroll / compliance

### F-6: Payroll Processing
- Batch card: coverage, OT breakdown, conditional actions
- Tabs: Overview (trend + client breakdown charts) / Batches / History
- Agent Vault pre-audit result displayed on each batch
- Finance export trigger (Download)
- Approve / Hold actions with reason capture

### F-7: Reports & Analytics
- Period selector (last week / month / quarter / YTD / custom)
- 6 KPIs with period-over-period change
- Volume trend (received / processed / auto-approved)
- Status distribution pie
- Ops health radar chart
- Compliance leaderboard (clients ranked by score)
- Turnaround time trend

### F-8: Integrations
- Portal card grid: sync status, client connections, feature chips, Sync Now action
- Email ingestion card: IMAP stats, test connection
- Connect new portal CTA
- Portal-specific latency indicators

### F-9: AI Agent Fleet
- Agent grid with profile cards (name, domain, status, key metrics)
- Agent detail panel: description, capabilities, activity log, model info
- Fleet KPI row: processed today, this month, fleet success rate, active count
- Agent Mark spotlight: recent auto-approvals with confidence scores
- Pause / Resume / Restart controls per agent

---

## 5. Non-Functional Requirements

| NFR                  | Requirement                                                           |
|----------------------|-----------------------------------------------------------------------|
| Performance          | Dashboard load <2s; timesheet detail load <500ms                     |
| AI response time     | Agent Mark validation <2s per timesheet (95th percentile)            |
| Availability         | 99.5% uptime during business hours (Mon–Sat, 8am–8pm IST)            |
| Data freshness       | Portal sync: per portal schedule (15min–24hr); email: 5-min poll     |
| Security             | Internal-only access; no PII exposed in URLs; audit log immutable    |
| Accessibility        | WCAG AA for all interactive elements                                  |
| Browser support      | Chrome, Firefox, Safari (last 2 versions); no IE                     |

---

## 6. Flows & User Journeys

### Journey 1: Morning Queue Review (Ops Associate)
1. Open OpsDesk at 9am → Overview shows 23 pending timesheets, 3 SLA at risk
2. Navigate to Timesheet Inbox → Filter to "Pending" tab
3. Click ts001 (Rahul Sharma / TCI) → Detail panel opens
4. See: Agent Mark escalated this (12h OT, no pre-approval), validation score 62%
5. Review daily breakdown → Reject with note "OT pre-approval required per TCI v3.2"
6. Move to next → ts009 shows "Auto-approved by Agent Mark" → Skip (no action needed)
7. Continue until queue is clear or shift ends

### Journey 2: Adding a New Policy Rule (Ops Lead)
1. Client (TCI) calls to say they want to flag any employee taking leave the day before a public holiday
2. Open Policy Engine → Select TCI from client list
3. Click "Create with AI" → Type: "Flag leave taken immediately before a public holiday"
4. Agent Lumen parses → shows structured preview: category=leave, severity=warning, trigger=leaveAdjacentToHoliday
5. Review → Save → Rule is now active for all future TCI timesheets

### Journey 3: Monthly Payroll Approval (Ops Lead)
1. Open Payroll → Batches tab → Filter to April
2. See IBP Apr W1 batch: ₹48L, 14,200 employees, Agent Vault pre-audit: 0 discrepancies
3. Click Approve → Batch moves to "Approved" status
4. Finance team downloads batch → Processes disbursement

### Journey 4: Client Compliance Report (Ops Lead)
1. Client (HEX) requests compliance report for Q1 FY26
2. Open Reports → Set period to Q1 FY26 → Filter by client: Hexaware Technologies
3. View: 12,500 submissions, 94% auto-approved, 2 policy violations, avg turnaround 1.2h
4. Download → Send to client HR contact

---

## 7. Prioritised Feature Backlog

| Priority | Feature                                       | Effort   | Phase |
|----------|-----------------------------------------------|----------|-------|
| P0       | Timesheet inbox with validation               | XLarge   | 1     |
| P0       | Client management with policy view            | Large    | 1–2   |
| P0       | Agent Mark auto-approval                      | Large    | 2     |
| P0       | Portal sync API integration                   | Large    | 2     |
| P0       | Email ingestion pipeline (Iris)               | Large    | 2     |
| P1       | Policy engine with AI creator                 | Large    | 2     |
| P1       | Payroll batch approval workflow               | Medium   | 2     |
| P1       | Reports & analytics                           | Large    | 2     |
| P1       | Agent Fleet page                              | Medium   | 3     |
| P1       | BRD / PRD / FPRD documentation               | Large    | 3     |
| P2       | Real portal OAuth integrations                | XLarge   | 4     |
| P2       | Live IMAP email pipeline                      | Large    | 4     |
| P2       | Multi-user roles and permissions              | Medium   | 4     |
| P3       | Client-facing report portal                  | XLarge   | 5     |
| P3       | Mobile app (ops on-the-go)                   | XLarge   | 5     |

---

## 8. Open Questions

| # | Question                                                            | Owner         | Target Resolution |
|---|---------------------------------------------------------------------|---------------|-------------------|
| 1 | Should Agent Mark's 95% confidence threshold be configurable per client? | Product  | Phase 3           |
| 2 | What is the override window for Agent Mark auto-approvals? (currently 48h) | Ops Lead | Phase 3     |
| 3 | Which portal should be prioritised for real API integration first?  | Tech + Ops    | Phase 4 kickoff   |
| 4 | Should rejected timesheets trigger an automated email to the employee? | Ops Lead   | Phase 4           |
| 5 | Is the compliance report format client-specific or standardised?   | Client success| Phase 4           |
