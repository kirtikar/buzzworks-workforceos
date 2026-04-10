# Feature PRD: Client Management
## OpsDesk — Module 3

**Document ID:** FPRD-OD-003  
**Version:** 1.0  
**Status:** Approved  
**Date:** 2026-04-10  
**Module Code:** CLIENT  
**Priority:** P0  
**Effort:** Large  

---

## 1. Module Overview

Client Management is the master record layer of OpsDesk. Every timesheet, every employee, every policy rule, every payroll batch belongs to a client. This module provides:

1. **Client list** — filterable overview of all 25 clients with health indicators
2. **Client detail** — deep-dive into a single client across 5 tabs: Overview, Timesheets, Employees, Policies in Force, Payroll

The Client Management module is the primary navigation hub for ops associates who are working on a specific client's account.

---

## 2. Functional Requirements

### FR-CLIENT-01: Client List View

**Priority:** P0 | **Effort:** Medium

**Sub-FR-CLIENT-01-01: Client card**  
Each client is displayed as a card with:
- Client name and code badge
- Industry tag
- City / state
- Employee count (active / total)
- Portal badge (portal name) or "Email only" badge
- Compliance score bar (0–100, colour-coded: <80=red, 80–90=amber, >90=green)
- Pending timesheet count (with urgency colour if >20)
- Monthly payroll value (₹ formatted)
- Coloured left border (client brand colour)

**Sub-FR-CLIENT-01-02: Filter and sort**  
- Search by client name or code
- Industry dropdown filter
- Portal dropdown filter
- Sort: name / compliance score / employee count / pending count / payroll value
- Filter chips showing active filters with clear option

**Acceptance Criteria:**
- [ ] All 25 clients render without scrolling on 1440px screen (with vertical scroll)
- [ ] Compliance bar colour threshold: <80 = red, 80–90 = amber, >90 = green
- [ ] Clicking a card navigates to `/clients/[id]`

---

### FR-CLIENT-02: Client Detail — Overview Tab

**Priority:** P0 | **Effort:** Large

Landing tab when navigating to a client profile.

**Sub-FR-CLIENT-02-01: Client header**  
- Client name, code, industry, city, contract dates
- Account manager
- Portal connection status (connected / error / disconnected)
- Overall compliance score (large display)
- Pending timesheet count with urgency badge

**Sub-FR-CLIENT-02-02: Weekly volume chart**  
- AreaChart: timesheets received vs. processed, last 8 weeks
- Teal fill for processed, violet line for received

**Sub-FR-CLIENT-02-03: Status distribution**  
- PieChart: Approved / Pending / Flagged / Rejected breakdown
- Legend with percentages

**Sub-FR-CLIENT-02-04: Integration panel**  
- Current portal: name, sync status, last sync time, API version
- Webhook status
- Error count this month

**Sub-FR-CLIENT-02-05: Policy snapshot**  
- Count of active rules by category
- Last 2 rules shown (name, severity badge)
- "View all policies" link → Policies in Force tab

**Acceptance Criteria:**
- [ ] Overview tab is the default on client detail page load
- [ ] All charts render with client-specific (not global) data
- [ ] Policy snapshot links to the correct tab

---

### FR-CLIENT-03: Client Detail — Policies in Force Tab

**Priority:** P0 | **Effort:** Large

This is a **prominent, primary tab** — not buried. The Policies in Force tab shows every active policy rule for the selected client, grouped by category.

**Sub-FR-CLIENT-03-01: Rule card**  
Each rule card shows:
- Category icon and label (hours / overtime / leave / attendance / payroll / compliance)
- Severity badge (Info / Warning / Violation) with appropriate colour
- Rule name (bold)
- Description (2–3 lines)
- Trigger condition (monospace code block)
- Action on trigger
- AI-generated badge (if `aiGenerated: true`)
- Enabled/disabled toggle
- `appliedCount` this month / `triggerCount` this month

**Sub-FR-CLIENT-03-02: Add rule button**  
- "Create with AI" button → opens Agent Lumen policy creator modal
- "Add manually" option → opens structured rule form

**Sub-FR-CLIENT-03-03: Category grouping**  
- Rules grouped by category with collapse/expand
- Category header shows rule count and trigger count for that category

**Sub-FR-CLIENT-03-04: Policy version display**  
- Client's current policy version displayed at top (e.g., "v3.2")
- Last updated date

**Acceptance Criteria:**
- [ ] "Policies in Force" tab is labelled prominently (not "Policy" or "Rules")
- [ ] Rules sorted: Violation first → Warning → Info
- [ ] AI-generated rules have a distinct badge (not identical to manual rules)
- [ ] Toggle state change is reflected immediately without page reload
- [ ] Empty state: "No policies configured — add your first rule to get started"

---

### FR-CLIENT-04: Client Detail — Timesheets Tab

**Priority:** P0 | **Effort:** Small

Filtered view of the Timesheet Inbox showing only timesheets for this client.

- Same list row format as global inbox
- Pre-filtered to `clientId` — no client filter needed
- All status tabs (All / Pending / Flagged / etc.)
- Period filter and search available
- Link back to global inbox

**Acceptance Criteria:**
- [ ] Tab shows only timesheets for the selected client
- [ ] Clicking a timesheet row opens the same detail panel as global inbox
- [ ] Empty state per tab is specific (e.g., "No pending timesheets for this client")

---

### FR-CLIENT-05: Client Detail — Employees Tab

**Priority:** P1 | **Effort:** Medium

Filtered employee directory for the selected client.

- Table view: name, code, role, job category, city, start date, rate, status
- Leave balance indicator per employee
- Up to 50 shown with pagination
- Additional generated employees for large-headcount clients
- Link to global employees directory with client pre-filtered

**Acceptance Criteria:**
- [ ] Employee count header shows "Showing X of Y employees" (where Y = client.employeeCount)
- [ ] Seed employees appear first, generated employees follow
- [ ] Leave balance indicator uses the same colour coding as global employee directory

---

### FR-CLIENT-06: Client Detail — Payroll Tab

**Priority:** P1 | **Effort:** Medium

Payroll batch history and current period batch for the selected client.

- Batch cards: period, status, total amount, hours breakdown, OT breakdown
- Action buttons: Approve (if pending_approval) / Hold / Download
- Agent Vault pre-audit result shown per batch
- Month-over-month payroll trend (mini chart)

**Acceptance Criteria:**
- [ ] Only batches for selected client are shown
- [ ] Agent Vault result ("Pre-audit: 0 discrepancies" or "Discrepancy found") visible on each batch card
- [ ] Approve action requires confirmation with batch total visible

---

## 3. User Stories

### Story CLIENT-001 — Client Portfolio Overview
**As** an ops lead,  
**I want** to see all 25 clients on one screen with their compliance score, pending count, and portal status,  
**So that** I can identify which clients need attention without opening each profile individually.

**Acceptance Criteria:**
- All clients visible on one screen (with scroll)
- Compliance score colour makes at-risk clients immediately visible
- Pending count > 20 shown in red

---

### Story CLIENT-002 — Client Policies in Force
**As** an ops associate,  
**I want** to open a client profile and see their full policy rule set prominently,  
**So that** when I'm reviewing timesheets for that client, I understand the rules without switching context.

**Acceptance Criteria:**
- "Policies in Force" is a clearly labelled top-level tab
- All active rules are visible (not paginated unless >20)
- Each rule shows what triggers it and what action it takes

---

### Story CLIENT-003 — Adding a Policy Rule for a Client
**As** an ops associate,  
**I want** to add a new policy rule to a client directly from their Policies in Force tab,  
**So that** when a client updates their HR policy, I can configure it immediately without navigating away.

**Acceptance Criteria:**
- "Create with AI" button is visible on the Policies in Force tab
- After saving, the new rule appears in the rule list immediately
- The new rule is tagged with the current policy version

---

### Story CLIENT-004 — New Client Onboarding
**As** an ops lead,  
**I want** to create a new client profile with their portal integration, base policies, and SLA settings,  
**So that** when we onboard a new client, the system is ready to receive and validate their timesheets from day one.

**Acceptance Criteria (future — Phase 4):**
- Client creation form with all required fields
- Portal connection setup within the same flow
- At least one default policy rule template available on creation

---

## 4. Data Requirements

Each client record requires the following at minimum for OpsDesk to function:

| Field                | Required | Notes                                           |
|----------------------|----------|-------------------------------------------------|
| `id`                 | Yes      | Unique short code (e.g., "hex", "ibp")         |
| `name`               | Yes      | Full client name                                |
| `industry`           | Yes      | One of 14 defined industry types                |
| `employeeCount`      | Yes      | Total headcount (incl. inactive)                |
| `portalId`           | No       | Null if email-only                              |
| `weeklyHoursLimit`   | Yes      | Primary policy parameter                        |
| `overtimeMultiplier` | Yes      | For payroll calculations                        |
| `slaHours`           | Yes      | Validation SLA (24 / 48 / 72)                  |
| `complianceScore`    | Yes      | Computed by Agent Trace                         |
| `policyVersion`      | Yes      | Shown on Policies in Force tab                  |
