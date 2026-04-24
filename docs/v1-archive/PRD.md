# Product Requirements Document (PRD)
## OpsDesk — Timesheet & Payroll Operations Platform

**Document ID:** PRD-OD-001  
**Version:** 2.0  
**Status:** Live — Phase 2 Build Complete  
**Date:** 2026-04-10  
**Product Manager:** Buzzworks Product Team  
**References:** BRD-OD-001, FPRD-OD-001 through FPRD-OD-009  
**Live URL:** https://timesheetexplore.vercel.app  

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
- Monitor process efficiency KRAs: auto-approval rate, SLA adherence, Mark auto-approved count, turnaround time, error rate, payroll on-time, active holds
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

### F-1: Overview Dashboard ✅ Built
- **Process Efficiency KRA strip (7 metrics):**
  - Mark Auto-Approved (count, month) — primary Agent Mark KRA
  - Auto-Approval Rate (% of total submitted)
  - SLA Adherence (% within client SLA window)
  - Avg Turnaround (hours, end-to-end)
  - Validation Error Rate (% policy violations)
  - Payroll On-Time (% batches released in cycle)
  - Active Holds (count — contract / banking / data)
- **Client-wise KPI table** with inline dropdown filters (SLA level, holds, sort)
- **Monthly submission trend chart** (6-month: submitted / approved / flagged)
- **Agent Mark efficiency trend** (6-month auto-approval rate)
- **Payroll batch status donut**
- **Active holds breakdown** by policy category (CEE / PRP / WOV)
- **Agent fleet summary strip** (Mark / ECHO / NEXUS cards with live metrics)

### F-2: Timesheet Inbox ✅ Built
- Tabbed filter: All / Pending / Flagged / Reviewing / Approved / Rejected
- Per-timesheet card: employee, client, period, hours summary, source badge, AI confidence score
- Quick actions: Approve / Reject / Flag / Escalate
- Detail panel: full validation check list, daily breakdown, policy check results, AI notes
- Agent Mark badge on auto-approved timesheets
- 15 seeded timesheets including 7 Agent Mark auto-approvals (ts009–ts015)

### F-3: Client Management ✅ Built
- Client list with search, industry filter, portal filter, compliance score sort
- Client card: compliance score bar, pending count, portal badge, monthly payroll
- Client detail (5 tabs):
  - **Overview:** trend chart, status pie, integration panel, policy snapshot
  - **Timesheets:** filterable table (status / source / approver / search) ← NEW
  - **Employees:** filterable table (department / status / search) ← NEW
  - **Policies in Force:** full policy rule set (editable)
  - **Payroll:** batch history and approval workflow
- 21 clients seeded (large, mid, small, email-only)

### F-4: Employee Directory ✅ Built
- Cross-client employee table with horizontal filter bar (one row)
- Filters: search, Client, Job Category, City, Status, Date Range (joined from/to)
- Clickable rows → Employee Detail page
- Leave balance indicators (annual / sick / casual)
- Employment status badges

### F-4b: Employee Detail Page ✅ Built (NEW)
- 4 tabs: Overview, Timesheets, Leave, Risk Profile
- Overview: KPI cards, weekly hours bar chart, monthly earnings trend, employment details
- Timesheets: full table with Agent Mark badge, link to inbox
- Leave: balance cards + leave history table
- Risk Profile: AI composite risk level (Low/Med/High), 6 signal checks, Agent Mark recommendations

### F-5: Policy Engine ✅ Built
- Per-client policy rule list with 7 policy types:
  - **CEE-001** Contract Expiry Enforcement (auto-reject + salary hold)
  - **PRP-002** Payment Readiness (bank/IFSC missing → hold)
  - **WOV-003** Work Order Validation (null WO → non-billable + hold)
  - **PEP-004** Payroll Eligibility Gate (5-condition composite)
  - **ICP-005** Identity Consistency (employee_id mismatch)
  - **BFP-006** Banking Fraud Prevention (duplicate account detection)
  - **DCM-007** Data Completeness (PAN + bank + WO all required)
- Client-specific operational rules (hours / OT / leave / attendance / compliance)
- Rule card: category, severity, trigger condition, action, toggle

### F-6: Payroll Processing ✅ Built
- 8 payroll batches seeded across 6 clients
- Batch card: coverage, OT breakdown, hold count
- Status workflow: draft → pending_approval → approved → processed
- Finance export trigger

### F-7: Reports & Analytics ✅ Built
- Period selector, 6 KPIs, volume trend, status pie, compliance leaderboard

### F-8: Integrations ✅ Built
- 10 portal integrations (Veltrix, OrbitHCM, PeopleHive, CloudSpire, HRLoop, TalentWeave, StaffPulse, LeafHR, PayAxis, HumanEdge)
- Email ingestion card
- Portal-specific sync frequency + success rate

### F-9: AI Agent Fleet ✅ Built (REDESIGNED)
- **5 agents** (redesigned from original 6-agent concept):
  - **MARK** — Timesheet ingestion, NLP email parse, 7-check validation, auto-approval
  - **ECHO** — Exit lifecycle: asset inventory, salary hold, FnF coordination
  - **SENTINEL** — Manager sentiment analysis, hidden rating, attrition risk detection
  - **RELAY** — Payroll snapshot comms: daily digest, critical escalation emails
  - **NEXUS** — Data completeness gate, banking fraud detection, payroll eligibility
- Sidebar agent nav, full detail panel per agent
- Capabilities, triggers, outputs, 8-metric grid, recent activity logs
- Fleet coordination note (how each agent connects to others)

### F-10: Settings ✅ Built (NEW)
- 6 sections: Appearance, Notifications, Account, Integrations, Security, System
- **Theme toggle:** Light (Microsoft Fluent, default) / Dark (glassmorphism)
- Agent Mark configuration: confidence threshold, batch size, OT escalation
- Portal connection status list
- 2FA, session management, API key
- Data retention + danger zone

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
| Theme                | Light (default, WCAG AA) + Dark; persisted in localStorage           |

---

## 6. Flows & User Journeys

### Journey 1: Morning KRA Review (Ops Lead)
1. Open OpsDesk → Overview KRA strip shows: 266 Mark auto-approved (month), 62% auto rate, 94.1% SLA adherence
2. Active Holds card shows 9 holds — click → Policy hold breakdown (4 contract, 3 banking, 2 data)
3. Filter client table to "With Holds" → identify LTI (4 holds) and HEX (3 holds) as priority
4. Navigate to LTI client detail → Timesheets tab filtered by "Flagged" → review 4 flagged timesheets

### Journey 2: Agent Mark Exit Workflow (ECHO + NEXUS)
1. Sonia Das (FHL0002) moves to notice period
2. Agent ECHO detects status change → places salary hold (EXT-002) + emails HR
3. Agent NEXUS confirms data completeness before FnF release
4. Agent RELAY notifies account manager Riya Shah and finance@financehub.co

### Journey 3: Banking Fraud Detection (NEXUS)
1. Daily sweep at 06:00 — Agent NEXUS detects emp031 and emp044 (both GSS) sharing bank account ••••5521
2. Both records frozen, BFP-006 flag raised, urgent alert dispatched to compliance
3. Ops sees active hold in dashboard; clicks through to Policy section

### Journey 4: Monthly Payroll Approval (Ops Lead)
1. Open Payroll → IBP Apr W1 batch: ₹48L, all checks green
2. Click Approve → batch moves to "Approved"
3. Agent RELAY auto-dispatches cycle-close digest to finance team

---

## 7. Prioritised Feature Backlog

| Priority | Feature                                       | Effort   | Phase | Status      |
|----------|-----------------------------------------------|----------|-------|-------------|
| P0       | Timesheet inbox with validation               | XLarge   | 1     | ✅ Done      |
| P0       | Client management with policy view            | Large    | 1–2   | ✅ Done      |
| P0       | Agent Mark auto-approval + KRA dashboard      | Large    | 2     | ✅ Done      |
| P0       | Portal sync API integration (mock)            | Large    | 2     | ✅ Done      |
| P0       | Email ingestion pipeline (Agent Mark)         | Large    | 2     | ✅ Done      |
| P1       | Policy engine with 7 real-world rule types    | Large    | 2     | ✅ Done      |
| P1       | Payroll batch approval workflow               | Medium   | 2     | ✅ Done      |
| P1       | Reports & analytics                           | Large    | 2     | ✅ Done      |
| P1       | AI Agent Fleet (5 agents)                     | Large    | 2–3   | ✅ Done      |
| P1       | Employee detail page                          | Medium   | 3     | ✅ Done      |
| P1       | Settings page with theme toggle               | Medium   | 3     | ✅ Done      |
| P1       | Horizontal filter bars on all tables          | Medium   | 3     | ✅ Done      |
| P2       | Real portal OAuth integrations                | XLarge   | 4     | Planned     |
| P2       | Live IMAP email pipeline                      | Large    | 4     | Planned     |
| P2       | Multi-user roles and permissions              | Medium   | 4     | Planned     |
| P3       | Client-facing report portal                  | XLarge   | 5     | Future      |
| P3       | Mobile app (ops on-the-go)                   | XLarge   | 5     | Future      |

---

## 8. Open Questions

| # | Question                                                            | Owner         | Target Resolution |
|---|---------------------------------------------------------------------|---------------|-------------------|
| 1 | Should Agent Mark's 95% confidence threshold be configurable per client? | Product  | Phase 4           |
| 2 | What is the override window for Agent Mark auto-approvals? (currently 48h) | Ops Lead | Phase 4     |
| 3 | Which portal should be prioritised for real API integration first?  | Tech + Ops    | Phase 4 kickoff   |
| 4 | Should rejected timesheets trigger an automated email to the employee? | Ops Lead   | Phase 4           |
| 5 | Is the compliance report format client-specific or standardised?   | Client success| Phase 4           |
| 6 | Should SENTINEL's manager reliability score be visible to the ops lead? | Product  | Phase 4           |
| 7 | What is the FnF SLA for ECHO's exit workflow? (currently assumed 45 days) | Ops + Client | Phase 4  |
