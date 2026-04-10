# Feature PRD: AI Agent Fleet
## OpsDesk — Module 9

**Document ID:** FPRD-OD-009  
**Version:** 1.0  
**Status:** Approved  
**Date:** 2026-04-10  
**Module Code:** AGENT  
**Priority:** P1  
**Effort:** Large  

---

## 1. Module Overview

The AI Agent Fleet module is the operational intelligence layer of OpsDesk. It comprises six specialised AI agents — each with a defined domain, capability set, model configuration, and action authority — that collectively automate the high-volume, rule-bound work of timesheet validation, anomaly detection, email parsing, payroll pre-audit, policy recommendation, and audit logging.

This module surfaces each agent as a first-class entity with a profile, activity log, real-time metrics, and ops controls (pause, resume, restart). Agents are not black boxes; every action they take is explained, logged, and reversible by the ops team.

---

## 2. Agent Roster

| Agent Code | Agent Name    | Domain                             | Action Authority          |
|------------|---------------|------------------------------------|---------------------------|
| MARK       | Agent Mark    | Timesheet Validation & Approval    | Auto-approve, escalate    |
| NOVA       | Agent Nova    | Anomaly Detection & Patterns       | Flag, report              |
| IRIS       | Agent Iris    | Email Parsing & Ingestion          | Parse, hand off, quarantine|
| VAULT      | Agent Vault   | Payroll Compliance & Audit         | Pre-audit, block, clear   |
| LUMEN      | Agent Lumen   | Policy Recommendation Engine       | Draft rules, suggest      |
| TRACE      | Agent Trace   | Audit Trail & Risk Scoring         | Log, score, export        |

---

## 3. Functional Requirements

### FR-AGENT-01: Agent Profile Page

**Priority:** P0 | **Effort:** Small

Every agent must have a profile page / detail panel containing:

**Sub-FR-AGENT-01-01:** Identity display  
- Agent name, codename, version badge
- Domain label
- Status badge (Active / Idle / Paused) with animated indicator when active

**Sub-FR-AGENT-01-02:** Key metrics display  
- Processed today (count)
- Processed this month (count)
- Success rate (%)
- Average processing latency (ms)
- Secondary metrics: auto-approved / flagged / escalated (where applicable)

**Sub-FR-AGENT-01-03:** Description and capabilities  
- 2–3 paragraph agent description (what it does, when it acts, what it doesn't do)
- Bullet list of specific capabilities (6–8 items)

**Sub-FR-AGENT-01-04:** Activity log  
- Last 5 actions with: timestamp, action type, outcome badge (success / flagged / escalated), detail string

**Sub-FR-AGENT-01-05:** Model attribution  
- Display: model name (claude-3-5-sonnet), provider (Anthropic), deployment context

**Acceptance Criteria:**
- [ ] All 6 agent profiles render without layout shift
- [ ] Status badge animates (dot pulse) only when status = active
- [ ] Metrics are distinct per agent (not identical across all)
- [ ] Activity log shows timestamped, outcome-coded entries

---

### FR-AGENT-02: Fleet Dashboard

**Priority:** P0 | **Effort:** Small

**Sub-FR-AGENT-02-01:** Fleet KPI row  
- Total processed today (sum across all agents)
- Total processed this month
- Fleet-average success rate
- Active agent count (X of 6)

**Sub-FR-AGENT-02-02:** Agent card grid  
- 2-column grid of agent cards (one per agent)
- Card: icon, name, version, domain, status badge, tagline, 3-metric row (today / success% / month), last action preview
- Clicking a card opens the agent detail panel (right side or below)

**Sub-FR-AGENT-02-03:** Active agents indicator  
- Persistent badge in page header showing "X agents active" with pulse dot

**Acceptance Criteria:**
- [ ] Fleet KPIs are computed as aggregates from agent data
- [ ] Selecting an agent card loads that agent's detail without page reload
- [ ] Active count badge reflects real agent status, not hardcoded

---

### FR-AGENT-03: Agent Mark Auto-Approval Feed

**Priority:** P0 | **Effort:** Medium

This is the highest-visibility feature of the agent module — a live feed showing Agent Mark's auto-approval actions, making the AI's work visible and accountable to ops.

**Sub-FR-AGENT-03-01:** Auto-approval list  
- Show last N timesheets auto-approved by Agent Mark today
- Per row: employee name, client code, period, hours, confidence %, time of approval, "AUTO-APPROVED" badge

**Sub-FR-AGENT-03-02:** Override notice  
- Persistent notice: "Ops can override any auto-approval within 48h"
- Each auto-approved timesheet in the Timesheet Inbox must show a distinct Agent Mark badge (not a human-approval badge)

**Sub-FR-AGENT-03-03:** Agent Mark record in timesheets  
- `approvedBy: "Agent Mark"` field on auto-approved timesheets
- `approvedAt` timestamp set to the second of AI decision
- `notes` field containing: version, checks passed, confidence, reasoning summary

**Acceptance Criteria:**
- [ ] Auto-approved timesheets show "Agent Mark" as approver (not "Riya Shah" or ops name)
- [ ] Notes field is populated with AI reasoning, not blank
- [ ] Feed on Agents page shows at least 3 real auto-approved records from mock data
- [ ] Override notice is visible without scrolling

---

### FR-AGENT-04: Agent Controls

**Priority:** P1 | **Effort:** Small

**Sub-FR-AGENT-04-01:** Per-agent action buttons  
- Pause: sets agent status to "paused", stops it processing new items
- Resume: sets paused agent back to active
- Restart: resets agent state (simulated; in production would restart the process)

**Sub-FR-AGENT-04-02:** Status persistence  
- Status change must reflect immediately on both the card (in grid) and the detail panel
- Status badge in sidebar AI agent section must also update

**Acceptance Criteria:**
- [ ] Pause/Resume toggle is mutually exclusive (can't see both at once)
- [ ] Button states are colour-coded: pause = coral/red, resume = teal
- [ ] Status change is reflected in both card and detail panel simultaneously

---

### FR-AGENT-05: Agent Mark Integration in Timesheet Inbox

**Priority:** P0 | **Effort:** Medium

Agent Mark's decisions must be first-class in the Timesheet Inbox — not indistinguishable from human approvals.

**Sub-FR-AGENT-05-01:** Auto-approved badge in inbox  
- Timesheets with `approvedBy: "Agent Mark"` must show a distinct teal "Agent Mark" badge in the inbox row
- Human approvals show the approver's name in white/grey

**Sub-FR-AGENT-05-02:** Auto-approval detail in timesheet panel  
- The timesheet detail view for Agent Mark approvals must show:
  - A highlighted banner: "Auto-approved by Agent Mark [version] at [time]"
  - Full validation check list (all checks shown as passed)
  - The reasoning note from the `notes` field
  - Override button: "Request manual review" (available within 48h)

**Acceptance Criteria:**
- [ ] Agent Mark approvals are visually distinct from Riya Shah / ops approvals
- [ ] The reasoning note is readable and specific (not generic)
- [ ] Override button is present on Agent Mark approvals (disabled or absent on manual approvals)

---

## 4. Agent Specifications

### 4.1 Agent Mark (MARK)

**Model:** claude-3-5-sonnet  
**Trigger:** New timesheet received (portal sync or email parse)  
**Decision logic:**
1. Run 5 policy checks against client's active PolicyRule set
2. Compute confidence score (0–100)
3. If all checks pass AND confidence ≥ 95: auto-approve
4. If any check fails: flag and escalate to ops queue
5. If confidence 75–94 with warnings only: queue for ops review

**Confidence score formula:**
```
base = 50
+ 20 if totalHours extracted
+ 10 if daysPresent extracted
+ 15 if attachment present
+ 5  if manager CC detected
- 15 per "fail" check
- 5  per "warning" check
clamp to [0, 100]
```

**Output fields:**
- `approvedBy: "Agent Mark"`
- `approvedAt: ISO timestamp`
- `notes: "Auto-approved by Agent Mark (v2.1) — [N]/[total] checks passed, confidence [X]%, [reasoning]"`
- `aiConfidence: number`
- `validationScore: number`

---

### 4.2 Agent Nova (NOVA)

**Model:** claude-3-5-sonnet  
**Trigger:** Scheduled — runs nightly at 00:01 and intra-day at 06:00  
**Scope:** All timesheets submitted in the rolling 30-day window  
**Output:** Anomaly report entries pushed to AI Insights feed

**Detection patterns:**
- Consecutive weeks of OT > 8h for same employee
- Repeated Friday under-reporting (< 6h on Fridays)
- Leave clustering within 3 days of public holidays
- Sudden hour spike > 20% above personal baseline
- Client-level decline in validation score (3-week trend)

---

### 4.3 Agent Iris (IRIS)

**Model:** claude-3-5-sonnet  
**Trigger:** New email at candidatemanager@buzzworks.com (5-min IMAP poll)  
**Pipeline:**
1. Fetch email → extract from, subject, body, CC, attachment
2. OCR attachment if image/PDF
3. Field extraction: employee name, period, total hours, days present, LOP
4. Match sender to employee register
5. Hand structured payload to Agent Mark

**Handled edge cases:**
- Forwarded email (Fwd:/FW: prefix) → reject with reason
- Unknown sender domain → quarantine
- No attachment on attachment-required client → flag before Mark
- Duplicate submission (same employee, same period) → merge or flag

---

### 4.4 Agent Vault (VAULT)

**Model:** claude-3-5-sonnet  
**Trigger:** Payroll batch enters "pending_approval" status  
**Checks:**
- `totalAmount == sum(employee hours × rate)`
- `overtimeAmount == OT hours × rate × client.overtimeMultiplier`
- `lopDeduction == lopDays × (rate × 8)`
- Leave balance used does not exceed available balance
- All included timesheets have status "approved" (not pending/flagged)

**Output:** Pre-audit report with check list; batch blocked if any check fails

---

### 4.5 Agent Lumen (LUMEN)

**Model:** claude-3-5-sonnet  
**Trigger:** (a) Ops team uses "Create with AI" in Policy Engine; (b) Weekly analysis run  
**NL → Rule conversion:** Input text → PolicyRule object with all fields populated  
**Pattern library:** 20 common policy rule templates (sandwich leave, consecutive OT, hours deviation, etc.)  
**Impact simulation:** Before accepting a new rule, Lumen estimates how many historical timesheets it would have triggered (retroactive simulation)

---

### 4.6 Agent Trace (TRACE)

**Model:** claude-3-5-sonnet (lightweight)  
**Trigger:** Every system event (append-only)  
**Events logged:** Timesheet submission, validation run, approval, rejection, escalation, policy create/update/delete, payroll batch status change, agent action, ops user action  

**Risk score formula (Employee):**
```
score = 100
- 10 per flag in last 30 days
- 5  per late submission in last 30 days
- 3  per LOP day in last 60 days
+ 5  if 100% on-time submissions in last 8 weeks
clamp to [0, 100]
```

**Risk score formula (Client):**
```
compliance_score = (pass_checks / total_checks) × 100
adjusted for: OT frequency, flag rate, portal sync health, SLA breach rate
```

---

## 5. Non-Functional Requirements

| NFR                      | Requirement                                                       |
|--------------------------|-------------------------------------------------------------------|
| Agent Mark latency       | <2s from receipt to decision (95th percentile)                    |
| Agent Iris latency       | <3s from email receipt to structured output                       |
| Agent Trace throughput   | >1,000 events/minute without queue backup                         |
| Agent Nova accuracy      | <5% false positive rate on anomaly detection (measured quarterly) |
| Explainability           | Every agent decision must include a human-readable reason string  |
| Override capability      | Any agent action must be reversible by ops within defined window  |

---

## 6. User Stories

### Story AGENT-001 — Agent Mark Auto-Approval Visibility
**As** an ops associate,  
**I want** to see which timesheets were auto-approved by Agent Mark and which were approved by a human,  
**So that** I can audit Agent Mark's decisions and intervene if needed.

**Acceptance Criteria:**
- Agent Mark approvals show distinct badge in inbox list
- Detail panel shows Agent Mark version, timestamp, and full check list
- A human-approved timesheet shows the approver's name without the agent badge

---

### Story AGENT-002 — Agent Fleet Status at a Glance
**As** an ops lead,  
**I want** to see the current status, today's activity, and success rate of all 6 agents on a single screen,  
**So that** I can ensure the AI layer is healthy and no agent has silently stopped working.

**Acceptance Criteria:**
- Fleet page loads all 6 agent cards in one view
- Active agent count badge at top of page
- Each card shows: status, today's count, success rate, last action preview
- An "idle" or "paused" agent is visually distinct from an "active" one

---

### Story AGENT-003 — Pause an Agent
**As** an ops lead,  
**I want** to pause Agent Mark when I need to review all timesheets manually (e.g., audit week),  
**So that** no timesheets are auto-approved without human review during that period.

**Acceptance Criteria:**
- Pause button on Agent Mark detail panel
- After pause: status badge changes to "Paused", new timesheets join ops review queue instead of being auto-approved
- Resume button restores normal behaviour

---

### Story AGENT-004 — Policy Rule from Natural Language
**As** an ops associate,  
**I want** to type a policy requirement in plain English and have Agent Lumen convert it into a structured rule,  
**So that** I don't need to understand the rule schema or involve engineering.

**Acceptance Criteria:**
- Text input in Policy Engine → "Create with AI" triggers Lumen
- Preview shows: category, severity, trigger condition, action, AI badge
- Ops can edit any field before saving
- Saved rule immediately applies to future timesheet validations for that client

---

### Story AGENT-005 — View Agent Reasoning for a Flagged Timesheet
**As** an ops associate,  
**I want** to see exactly why Agent Mark flagged a timesheet — not just a failure label,  
**So that** I can make an informed decision to approve, reject, or escalate.

**Acceptance Criteria:**
- Flagged timesheet shows each failed/warning check with a detail string
- Detail string is specific: "12h OT — no pre-approval on file (TCI policy v3.2 §4.2)"
- Check list is ordered: failures first, warnings second, passes last
