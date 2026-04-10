# Feature PRD: Timesheet Ingestion & Inbox
## OpsDesk — Module 2

**Document ID:** FPRD-OD-002  
**Version:** 1.0  
**Status:** Approved  
**Date:** 2026-04-10  
**Module Code:** INBOX  
**Priority:** P0  
**Effort:** XLarge  

---

## 1. Module Overview

The Timesheet Ingestion & Inbox module is the operational core of OpsDesk. It handles the full lifecycle of a timesheet from the moment it enters the system (via portal sync or email) through AI validation, ops review, and final disposition (approve / reject / escalate).

The module has two distinct components:
1. **Ingestion layer** — receives timesheets from portals (via scheduled sync or webhooks) and email (via IMAP + Agent Iris)
2. **Inbox UI** — the ops team's primary work surface for reviewing, deciding, and actioning timesheets

---

## 2. Functional Requirements

### FR-INBOX-01: Dual Ingestion Channel

**Priority:** P0 | **Effort:** Large

**Sub-FR-INBOX-01-01: Portal ingestion**  
Each connected portal sends timesheets either via webhook (push) or scheduled poll (pull). Every synced timesheet is:
1. Normalised to the internal `Timesheet` schema
2. Tagged with `source: "portal"` and `portalId`
3. Queued for Agent Mark validation

**Sub-FR-INBOX-01-02: Email ingestion**  
Agent Iris monitors `candidatemanager@buzzworks.com` every 5 minutes. On new email:
1. Extract structured fields (name, period, hours, LOP)
2. OCR attachment if present
3. Tag with `source: "email"`, `emailFrom`, `emailSubject`
4. Hand to Agent Mark

**Sub-FR-INBOX-01-03: Manual entry**  
Ops team can manually enter a timesheet (for legacy clients or edge cases). Tagged `source: "manual"`.

**Acceptance Criteria:**
- [ ] Portal-sourced timesheets show portal name badge (e.g., "Veltrix HCM")
- [ ] Email-sourced timesheets show sender email and subject
- [ ] Manual timesheets show "Manual entry" badge
- [ ] All three sources land in the same inbox queue

---

### FR-INBOX-02: Inbox Filter & Sort

**Priority:** P0 | **Effort:** Medium

**Sub-FR-INBOX-02-01: Status tabs**  
Tabs: All | Pending | Flagged | Reviewing | Approved | Rejected  
Tab badges show count. "Pending" tab is default on load.

**Sub-FR-INBOX-02-02: Secondary filters**  
- Client dropdown (all 25 clients)
- Period picker (week selector)
- Source filter (portal / email / manual)
- Sort: newest / oldest / highest flag priority / lowest AI confidence

**Sub-FR-INBOX-02-03: Search**  
Search by employee name, employee code, client name.

**Acceptance Criteria:**
- [ ] Switching tabs updates list in <200ms
- [ ] Filter selections persist within session
- [ ] Empty state message is context-appropriate (e.g., "No flagged timesheets — all clear")

---

### FR-INBOX-03: Timesheet List Row

**Priority:** P0 | **Effort:** Small

Each row in the inbox shows:
- Employee name + employee code
- Client name + client color badge
- Period string
- Hours summary (regular / OT / leave)
- Source badge (portal name or "Email" or "Manual")
- Status badge (colour-coded)
- AI confidence score (%)
- Validation score (%)
- SLA indicator: time remaining or "Breached"
- Quick action buttons: Approve ✓ / Reject ✗ / Flag 🚩

**Acceptance Criteria:**
- [ ] SLA indicator turns red when <4h remaining
- [ ] Agent Mark auto-approved rows show teal "Agent Mark" badge instead of action buttons
- [ ] Row click opens detail panel without navigating away

---

### FR-INBOX-04: Timesheet Detail Panel

**Priority:** P0 | **Effort:** Large

Sliding detail panel (or right-side expansion) on row click:

**Sub-FR-INBOX-04-01: Header section**  
- Employee name, code, role, client
- Period, submitted at, source detail
- Status badge + action buttons

**Sub-FR-INBOX-04-02: Hours breakdown**  
- Total / Regular / Overtime / Leave hours
- Total payable amount (hours × rate)
- Daily entry table: date, day, regular, OT, leave, notes

**Sub-FR-INBOX-04-03: Validation checks**  
- Ordered list: failures first, warnings second, passes last
- Per check: check ID, category icon, rule text, result badge, detail string, auto/manual indicator

**Sub-FR-INBOX-04-04: AI assessment block**  
- Confidence score with visual gauge
- Validation score
- AI model used
- Outcome recommendation

**Sub-FR-INBOX-04-05: Agent Mark auto-approval banner** (conditional)  
For `approvedBy: "Agent Mark"`:
- Green banner: "Auto-approved by Agent Mark v2.1 at [time]"
- Reasoning note from `notes` field
- "Request manual review" override button (48h window)

**Acceptance Criteria:**
- [ ] Validation checks are sorted: fail → warning → pass
- [ ] Daily entry table scrolls if >5 rows
- [ ] Agent Mark banner only shows on AI-approved timesheets
- [ ] Override button triggers a confirmation dialog before requesting review

---

### FR-INBOX-05: Approval / Rejection Workflow

**Priority:** P0 | **Effort:** Medium

**Sub-FR-INBOX-05-01: Approve action**  
- Inline: click Approve → confirmation → status changes to "approved"
- `approvedBy` set to logged-in ops user name
- `approvedAt` set to current timestamp
- Timesheet moves to Approved tab

**Sub-FR-INBOX-05-02: Reject action**  
- Opens reason capture modal: free text + optional rule reference
- Status → "rejected", `reviewedBy` set
- Rejection reason stored in `notes`

**Sub-FR-INBOX-05-03: Flag action**  
- Status → "flagged"
- Opens flag reason picker (pre-defined options + custom)
- `flaggedBy: "ops"`, `flagReason` set

**Sub-FR-INBOX-05-04: Escalate action**  
- Escalation modal: select escalation target (Ops Lead, Client, both)
- Adds escalation note
- Status → "reviewing"

**Acceptance Criteria:**
- [ ] Each action has a confirmation step (no accidental approvals)
- [ ] Status change is reflected in the inbox list immediately (optimistic update)
- [ ] Approved timesheets cannot be re-approved (button disabled)
- [ ] Rejection reason is required (empty reason blocks submission)

---

### FR-INBOX-06: SLA Tracking

**Priority:** P1 | **Effort:** Small

**Sub-FR-INBOX-06-01:** SLA countdown per timesheet  
- Each timesheet has an SLA deadline = `submittedAt + client.slaHours`
- Display: "Xx remaining" (green → amber → red as deadline approaches)
- Display: "Breached Xh ago" (red) if past deadline

**Sub-FR-INBOX-06-02:** SLA breach alerts on dashboard  
- Overview page surfaces timesheets with <4h remaining and breached SLAs

**Acceptance Criteria:**
- [ ] SLA displayed on every inbox row and detail panel
- [ ] Colour transitions: >8h = green, 4–8h = amber, <4h = red, breached = red + "Breached"

---

## 3. User Stories

### Story INBOX-001 — Morning Queue Review
**As** an ops associate,  
**I want** to open the Timesheet Inbox and immediately see what requires my attention today (pending + flagged),  
**So that** I can prioritise my work and meet SLAs without sifting through all timesheets.

**Acceptance Criteria:**
- Default tab is "Pending" on page load
- SLA at-risk timesheets appear at the top of the list
- Agent Mark auto-approved timesheets are visually distinct and require no action

---

### Story INBOX-002 — Reviewing a Flagged Timesheet
**As** an ops associate,  
**I want** to open a flagged timesheet and see exactly which policy check failed and why,  
**So that** I can make a confident decision to approve, reject, or escalate without re-checking the policy document manually.

**Acceptance Criteria:**
- Detail panel shows the specific failed check with rule text and detail string
- Policy version reference is visible (e.g., "TCI policy v3.2")
- I can reject directly from the detail panel with a pre-populated rejection reason based on the failed check

---

### Story INBOX-003 — Reviewing Agent Mark Auto-Approvals
**As** an ops lead,  
**I want** to review a sample of Agent Mark's auto-approvals at the end of each day,  
**So that** I can verify the AI is making correct decisions and intervene on any that look wrong.

**Acceptance Criteria:**
- Approved tab shows Agent Mark approvals with a distinct teal badge
- Each Agent Mark approval shows the confidence score and check list
- I can click "Request manual review" to pull it back within 48h

---

### Story INBOX-004 — Email Timesheet from Email-Only Client
**As** an ops associate,  
**I want** Agent Iris to parse and structure email timesheets from NCS (email-only client) automatically,  
**So that** I don't need to manually read the email and create a timesheet record.

**Acceptance Criteria:**
- Email from `mohan.tripathi@nucleussoftware.com` appears in inbox as a structured timesheet
- Source shows "Email · candidatemanager@buzzworks.com"
- Extracted fields (hours, period, employee name) are pre-populated
- Any extraction uncertainty is flagged with a warning check

---

## 4. Edge Cases

| Edge Case                                    | Handling                                                     |
|----------------------------------------------|--------------------------------------------------------------|
| Duplicate submission (same employee, period) | Flag as duplicate; show link to original record              |
| Forward email (Fwd:/FW: subject prefix)      | Reject immediately; add "forwarded email" check failure      |
| Attachment OCR failure                       | Flag with warning; mark attachment as unreadable             |
| Portal returns 429 rate limit                | Retry after specified interval; surface in Integrations page |
| Zero hours submitted                         | Auto-flag; unusual pattern requires ops confirmation         |
| Timesheet for ended employee                 | Auto-reject; employment status check failure                 |
