# Feature PRD: AI Agent Fleet
## OpsDesk — Module 9

**Document ID:** FPRD-OD-009  
**Version:** 2.0  
**Status:** Live — Phase 2 Complete  
**Date:** 2026-04-10  
**Module Code:** AGENT  
**Priority:** P1  
**Effort:** Large  

---

## 1. Module Overview

The AI Agent Fleet is the autonomous intelligence layer of OpsDesk. It comprises **five specialised agents** — each with a defined domain, capability set, model configuration, trigger conditions, and action authority — that collectively automate the high-volume, rule-bound work of timesheet validation, exit lifecycle management, manager intelligence, payroll communications, and data completeness enforcement.

Every agent is a first-class entity with a profile page, capability list, trigger conditions, outputs, 8-metric live dashboard, and activity log. Agents are not black boxes — every action is explained, logged, and reversible by the ops team.

---

## 2. Agent Roster

| Code     | Name            | Domain                                         | Action Authority                         |
|----------|-----------------|------------------------------------------------|------------------------------------------|
| MARK     | Agent Mark      | Timesheet Ingestion · Validation · Auto-Approval | Auto-approve, escalate, flag, SLA alert |
| ECHO     | Agent ECHO      | Exit Lifecycle · Asset Clearance · FnF         | Salary HOLD, FnF initiation, email HR   |
| SENTINEL | Agent SENTINEL  | Manager Intelligence · Sentiment · Hidden Rating | Internal score, attrition flag          |
| RELAY    | Agent RELAY     | Payroll Communications · Snapshots · Alerts   | Email dispatch, digest, escalation      |
| NEXUS    | Agent NEXUS     | Data Completeness · Payroll Eligibility · Fraud | Eligibility block, fraud flag, hold     |

---

## 3. Functional Requirements

### FR-AGENT-01: Agent Profile & Detail Panel

**Priority:** P0 | **Status:** ✅ Done

Each agent has a sidebar entry and detail panel containing:

- **Identity:** name, codename, version badge, domain label, status badge (active / idle / paused) with pulse indicator
- **8-metric grid:** metrics tailored per agent (not identical across all)
- **Description + tagline:** what the agent does, when it acts, what it doesn't do
- **Capabilities list:** 9–10 bullet capabilities per agent
- **Triggers:** what events activate the agent (event-driven and scheduled)
- **Outputs:** what the agent produces (hold, email, score, flag, etc.)
- **Recent activity log:** last 5 actions with timestamp, action type, outcome badge (success / flagged / escalated / hold), detail string
- **Model & runtime:** model attribution, last action, last action detail
- **Fleet coordination note:** how this agent connects to the other 4

**Acceptance Criteria:**
- [x] All 5 agent profiles render without layout shift
- [x] Status badge animates (dot pulse) only when status = active
- [x] Metrics are distinct per agent
- [x] Activity log shows timestamped, outcome-coded entries
- [x] Fleet coordination note is agent-specific

---

### FR-AGENT-02: Fleet Header & Sidebar Nav

**Priority:** P0 | **Status:** ✅ Done

- Header shows: fleet name, active count, total actions today, "All systems operational" badge
- Left sidebar lists all 5 agents with icon, codename, version, domain excerpt, status dot
- Selecting an agent loads detail panel without page reload
- Agent detail panel scrolls independently

---

### FR-AGENT-03: Agent Mark — Timesheet Ingestion & Auto-Approval

**Priority:** P0 | **Status:** ✅ Done

The highest-visibility agent. Every timesheet submitted enters OpsDesk through Agent Mark.

**Ingestion:**
- Portal syncs: 10 HRMS portals (Veltrix, OrbitHCM, PeopleHive, CloudSpire, HRLoop, TalentWeave, StaffPulse, LeafHR, PayAxis, HumanEdge)
- Email: `candidatemanager@buzzworks.com` — NLP pipeline v3.4 (GPT-4o) extracts structured fields
- Manual: ops-entered timesheets bypass NLP but still run policy validation

**7-check validation suite:**
1. Weekly hours within client cap
2. OT pre-approval check (cross-referenced with portal audit log or email thread)
3. Daily hours cap per client policy
4. Leave balance sufficiency
5. Submission within SLA window
6. Sandwich leave / consecutive OT pattern detection
7. Employment status active (contract not expired)

**Auto-approval logic:**
- All 7 checks green + AI confidence ≥ 95% → auto-approve
- Sets `approvedBy: "Agent Mark"`, `approvedAt: ISO timestamp`, `notes: reasoning string`
- Confidence < 95% with warnings only → queue for ops review
- Any check fails → flag + structured escalation report to ops inbox

**KRA: Mark Auto-Approved count** appears on the Overview dashboard as the first KRA card (month total + vs-prior-month trend).

**Acceptance Criteria:**
- [x] Auto-approved timesheets show "Agent Mark" as approver (distinct from human)
- [x] Notes field populated with check count, confidence %, reasoning
- [x] 7 Agent Mark auto-approvals seeded (ts009–ts015)
- [x] Agent Mark count KRA on dashboard: 266 this month (+18% vs prior month)
- [x] SLA risk events trigger Agent RELAY

---

### FR-AGENT-04: Agent ECHO — Exit Lifecycle Management

**Priority:** P1 | **Status:** ✅ Done

ECHO owns the complete employee exit workflow from status change to FnF release.

**Trigger:** `employment_status` transitions to `"notice"` or `"ended"`

**Workflow:**
1. Detect exit event
2. Query client asset/equipment registry → calculate inventory value (replacement + depreciated)
3. Apply client exit policy (notice period payout, garden leave, asset recovery timeline)
4. Place salary HOLD (code `EXT-002`) immediately
5. Draft FnF statement (salary payable, deductions, gratuity if applicable)
6. Email exit clearance checklist to: HR + manager + account manager
7. Track asset return and clearance confirmations
8. Release HOLD only when all clearances confirmed
9. Escalate if FnF not processed within client SLA (typically 45 days)

**Policy codes triggered by ECHO:** `EXT-002` (exit hold)

**Acceptance Criteria:**
- [x] Salary HOLD placed within seconds of exit event detection
- [x] FnF draft generated with line-item breakdown
- [x] Exit checklist emailed to HR + manager + AM
- [x] Hold released only on full clearance (not time-based)
- [x] 3 active exits seeded (2 FnF pending, 1 FnF complete)

---

### FR-AGENT-05: Agent SENTINEL — Manager Intelligence

**Priority:** P1 | **Status:** ✅ Done

SENTINEL operates silently, building a behavioural intelligence layer over every manager interaction.

**What it tracks:**
- Manager approval / rejection latency per client
- Sentiment in manager email responses (GPT-4o analysis)
- Bias patterns: selective fast-tracking or chronic delays by specific manager
- Correlation between approval speed, employee tenure, attrition
- Employee distress signals in timesheet submission notes

**Output:**
- **Manager reliability score** (0–100, internal only — not exposed to client)
- Feeds directly into Agent Mark's trust tier calculation
- **Attrition risk flag** → ops + account manager alert via RELAY
- Quarterly Manager Intelligence Report → Buzzworks leadership

**Note:** SENTINEL's outputs are internal to Buzzworks. Clients do not see manager reliability scores or sentiment analysis.

**Acceptance Criteria:**
- [x] SENTINEL profiles seeded with 47 managers tracked
- [x] Attrition risk flag demonstrated (Sonia Das / FHL — 6-week sentiment drift confirmed)
- [x] Bias alert demonstrated (MGR-HEX-014 — approves own team 40% faster)
- [x] Fleet coordination note explains trust tier feed to Agent Mark

---

### FR-AGENT-06: Agent RELAY — Payroll Communications

**Priority:** P1 | **Status:** ✅ Done

RELAY is the communications backbone — the only agent that produces external-facing outputs.

**Dispatch types:**
- **Daily digest (18:00 IST):** payroll snapshot to ops team + all account managers; includes pending by client, holds with reasons, payroll amounts
- **Cycle close alert (48h before deadline):** action checklist to ops team
- **Critical escalations (out-of-cycle):** SLA breach, salary hold placed, FnF overdue → immediate dispatch regardless of digest schedule
- **Delivery tracking:** re-send on failure with ops notification

**Routing:** RELAY knows which account manager owns which client — notifications routed accordingly, not broadcast to all.

**Acceptance Criteria:**
- [x] 28 digests dispatched this month seeded
- [x] 6 critical alerts seeded
- [x] 14 unique recipients configured
- [x] Delivery failure tracking (1 failure seeded — re-send triggered)
- [x] Fleet coordination note confirms RELAY is only external-facing agent

---

### FR-AGENT-07: Agent NEXUS — Data Completeness & Fraud Detection

**Priority:** P0 | **Status:** ✅ Done

NEXUS is the last gate before any employee enters the payroll queue.

**Validation checks:**
- PAN number: presence + checksum format validation
- Bank account + IFSC: presence + IFSC format validation
- Work order number: presence + status (`active` or `extended`) against client registry
- Identity consistency: `employee_id` ↔ `client_employee_id` cross-system match
- **Banking fraud detection:** daily cross-employee scan — same `bank_account_no` claimed by multiple employees triggers urgent freeze + compliance alert
- Payroll eligibility composite gate: `is_active` + `contract valid` + `WO valid` + `no open violations` + `manager/agent approved`

**Policy codes:** `PRP-002` (bank), `WOV-003` (work order), `DCM-007` (completeness), `BFP-006` (fraud), `ICP-005` (identity), `PEP-004` (eligibility)

**Acceptance Criteria:**
- [x] 9 employees blocked (eligibility gate fails) seeded
- [x] 3 bank detail holds seeded
- [x] 2 work order gaps seeded
- [x] 1 duplicate account fraud flag seeded (emp031 + emp044 / GSS)
- [x] 0 missing PAN (all employees have PAN in current mock set)
- [x] NEXUS triggers RELAY for urgent fraud escalation bypassing digest

---

## 4. Agent Specifications

### 4.1 Agent Mark (MARK)

**Model:** GPT-4o (NLP parse) + deterministic rule engine (policy validation)  
**Trigger:** Portal sync event; email received at candidatemanager@buzzworks.com; manual reprocess  
**Version:** v2.1  
**Avg processing:** 1.4s per timesheet  
**Confidence formula:**
```
base = 50
+ 20 if all structured fields extracted
+ 10 if source is portal (higher trust)
+ 15 if manager CC or pre-approval detected
- 15 per "fail" check
- 5  per "warning" check
clamp [0, 100]
```
**Output fields:** `approvedBy`, `approvedAt`, `notes`, `aiConfidence`, `validationScore`

---

### 4.2 Agent ECHO (ECHO)

**Model:** Deterministic rule engine + GPT-4o (FnF document generation)  
**Trigger:** `employment_status` → `notice` or `ended`; notice period end date crossed; manual  
**Version:** v1.3  
**Avg FnF initiation:** 4.2s from trigger  
**Hold codes:** `EXT-002`

---

### 4.3 Agent SENTINEL (SENTINEL)

**Model:** GPT-4o (sentiment analysis) + statistical pattern engine  
**Trigger:** Any manager action; weekly scheduled scan; attrition signal from ECHO  
**Version:** v1.0  
**Avg analysis:** 890ms per action  
**Output:** Manager reliability score (internal), attrition risk flag, bias alert

---

### 4.4 Agent RELAY (RELAY)

**Model:** Template engine + GPT-4o (narrative digest summary)  
**Trigger:** Scheduled (18:00 IST daily, 48h before cycle close); event-driven (from Mark, ECHO, NEXUS)  
**Version:** v1.1  
**Avg compile time:** 340ms per dispatch  
**Delivery success:** 99.8%

---

### 4.5 Agent NEXUS (NEXUS)

**Model:** Deterministic rule engine + fuzzy match (account deduplication)  
**Trigger:** Pre-payroll batch run; new employee onboarded; daily 06:00 IST sweep; manual  
**Version:** v1.0  
**Avg check:** 210ms per employee  
**Scope:** 4,820 employees checked this month

---

## 5. Non-Functional Requirements

| NFR                      | Requirement                                                       |
|--------------------------|-------------------------------------------------------------------|
| Agent Mark latency       | <2s from receipt to decision (95th percentile)                    |
| Agent NEXUS throughput   | All active employees checked within 30 min of daily sweep trigger |
| Agent RELAY delivery     | Digest dispatched within 60s of scheduled trigger                 |
| Agent SENTINEL accuracy  | <5% false positive rate on attrition risk flags (quarterly audit) |
| Explainability           | Every agent decision includes a human-readable reason string      |
| Override capability      | Any agent hold or flag reversible by ops with reason logged       |
| Internal-only            | SENTINEL scores and RELAY digest content never exposed to clients |

---

## 6. User Stories

### AGENT-001 — Mark Auto-Approved Count on Dashboard
**As** an ops lead,  
**I want** to see how many timesheets Agent Mark auto-approved this month on the overview dashboard,  
**So that** I can track AI efficiency as a KRA alongside other process metrics.

**Acceptance Criteria:**
- [x] "Mark Auto-Approved" card is the first KRA in the 7-card strip
- [x] Shows current month count (266) and vs-prior-month comparison (+18%)
- [x] Icon is distinct from the auto-approval rate % card

---

### AGENT-002 — Agent Mark Visibility in Timesheet Tables
**As** an ops associate,  
**I want** to distinguish Agent Mark approvals from human approvals in every timesheet table,  
**So that** I can audit the AI layer without opening each record individually.

**Acceptance Criteria:**
- [x] "⚡ Agent Mark" label in all timesheet tables (inbox, client detail, employee detail)
- [x] Human approvals show approver name in muted colour
- [x] Timesheets tab on client detail: filter by "Agent Mark only" or "Human approved"

---

### AGENT-003 — Exit Hold Notification via ECHO + RELAY
**As** an ops associate,  
**I want** to be automatically notified when an employee exits and their salary is held,  
**So that** I don't need to manually monitor employment status changes.

**Acceptance Criteria:**
- [x] ECHO places hold + emails HR checklist within seconds of exit detection
- [x] RELAY dispatches hold notification to account manager immediately (out-of-cycle)
- [x] Hold appears in dashboard "Active Holds" breakdown

---

### AGENT-004 — Fraud Alert from NEXUS
**As** compliance,  
**I want** to receive an immediate alert when two employees share a bank account number,  
**So that** I can investigate and freeze payroll before disbursement.

**Acceptance Criteria:**
- [x] NEXUS daily scan detects duplicate account across any two employees (cross-client)
- [x] Both records frozen immediately
- [x] RELAY dispatches urgent (out-of-cycle) alert to compliance + account managers
- [x] Alert bypasses daily digest schedule

---

### AGENT-005 — Pause Agent Mark for Audit Week
**As** an ops lead,  
**I want** to pause Agent Mark during an audit week so all timesheets are manually reviewed,  
**So that** no approvals are made without human sign-off during that period.

**Acceptance Criteria:**
- [x] Pause button in agent detail panel
- [x] Status badge changes to "Paused"
- [x] Resume restores normal behaviour
