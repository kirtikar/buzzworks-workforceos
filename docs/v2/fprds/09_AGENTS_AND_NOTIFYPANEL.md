# FPRD-09 — Agents & NotifyPanel

**Surfaces:**
- `/agents` — agent control room
- NotifyPanel — bottom-right slide-in, present on every surface that
  drafts an email

**Primary persona:** All — every agent-manager interaction with a
flagged item ends in either an inbox decision or an email drafted by
RIPLEY.

---

## 1. Scope

This FPRD covers two intertwined concepts:

1. **The agent roster page** — the public-facing "what these agents do
   for you" surface, with live activity, hand-off pipelines, and a
   per-agent drawer
2. **The NotifyPanel component** — RIPLEY's actual output mechanism;
   templated email composer with 9 builders, used from every other
   inbox / detail page

Both are owned by the agent system. RIPLEY is one of the 6 agents and
is the only one with a tangible UI surface (NotifyPanel) outside of
the /agents page itself.

---

## 2. The 6 agents

| Order | Name   | Role                | Color   | Surfaces in                         |
| ----- | ------ | ------------------- | ------- | ----------------------------------- |
| 1     | LEXI   | Policy interpreter  | #9333EA | Policies → All Policies feed        |
| 2     | JARVIS | Timesheet validator | #2563EB | Inbox → Timesheets                  |
| 3     | ORACLE | Regulation watcher  | #059669 | Compliance → Article feed           |
| 4     | CASE   | Data integrity      | #0EA5E9 | Inbox → Onboarding                  |
| 5     | RIPLEY | Email drafter       | #7C3AED | NotifyPanel (bottom-right)          |
| 6     | TRON   | Ops broadcaster     | #D97706 | Scheduled · background              |

Order in the roster is **pipeline order**, not alphabetical. Each card
shows live volume + a headline metric + in/out hand-off chips so the
pipeline graph reads at a glance.

---

## 3. Agents page (`/agents`)

### 3.1 Information architecture

```
Agents page
├─ Header
│  ├─ h1 "Agents" + 1-paragraph operational copy
│  └─ Right: "6 agents · all active" status pill (green dot)
│
├─ Impact strip                          (4 KPI tiles)
│  ├─ Auto-resolved today                 (318)
│  ├─ Waiting on your review              (47)
│  ├─ First-pass accuracy                 (94.1%)
│  └─ Est. ops cost saved                 (₹12L)
│
├─ How the agents collaborate            (3 named pipelines)
│  └─ Pipeline card × 3
│     ├─ Pipeline title + volume tag + summary line
│     └─ Horizontal flow: source → agent step × N → sink
│        (each agent step = clickable button → opens agent drawer)
│        + outcome line at bottom
│
├─ Agent roster + Live activity          (lg: 2-col, sm: stacked)
│  ├─ Roster (lg:col-span-2)
│  │  └─ Agent card × 6
│  │     ├─ Avatar (initial) + Name + Active dot + role line
│  │     ├─ Today volume + headline metric
│  │     └─ in: <agent chips>  out: <agent chips>  · works in: <surface>
│  │
│  └─ Live activity (lg:col-span-1)
│     ├─ Section header
│     └─ Feed × 15 rows (reverse chrono)
│        Each row: agent avatar, summary line, status icon, agent name, age
│
└─ Principles footer                      (pink card)
   3 lines: "One agent, one job · Hand-offs visible · Humans review, don't do"
```

### 3.2 The 3 pipelines

#### Timesheet lifecycle (~320/day)
```
Portal sync · Email · Manual entry
  → LEXI (compile policy)
  → CASE (validate data)
  → JARVIS (score + decide)
  → RIPLEY (draft flag email)
  → Payroll cycle
```
Outcome: ~94% auto-approved, 6% flagged with reasoning trail.

#### Regulation to client alert (~9/day)
```
EPFO · CBDT · ESIC · 18 state boards
  → ORACLE (scan + classify)
  → LEXI (map to policy)
  → RIPLEY (draft client email)
  → AM + client contacts
```
Outcome: AM gets a pre-filled email per affected client, 1-click send.

#### Payroll cycle & broadcast (~23/day)
```
JARVIS-approved timesheets
  → JARVIS (approved batch)
  → TRON (digest + alerts)
  → AMs, client leads, ops
```
Outcome: Weekly AM digests, payment confirmations, on-time SLA 98%.

### 3.3 Agent drawer (right-slide, 440px)

Opens when an agent button or card is clicked.

```
Drawer
├─ Sticky header: avatar + name + role + close
├─ Acronym (uppercase tracking, text-3 color)
├─ "What it does" — 2-3 sentence operational paragraph
├─ Today volume / headline metric (2 tiles)
├─ Capabilities list (4-6 items with check icons)
├─ Hand-offs section
│  └─ in/out chips, each clickable to open that agent's drawer
└─ "Surfaces in: <surface>" pink-tinted footer chip
```

### 3.4 Live activity feed

15 hand-curated rows seeded for realism. Each minute, a `tick` state
update increments `minutesAgo` so age labels age gracefully ("now" →
"2m" → "1h") without reshuffling the feed. Rows are clickable and
open the source agent's drawer.

### 3.5 Impact strip metrics — derivation

- **Auto-resolved today**: 318 (mock; real = sum across 4 inboxes
  where status moved to approved/processed/resolved today)
- **Waiting on your review**: 47 (mock; real = sum of actionable items
  in 4 inboxes at this moment)
- **First-pass accuracy**: 94.1% (rolling 30-day; matches Home KPI)
- **Est. ops cost saved**: ₹12L (per Home page CFO baseline)

---

## 4. NotifyPanel component

### 4.1 Visual

- Fixed positioning: `bottom-4 right-4`
- Width: 440px, max `calc(100vw-2rem)`
- Height: content-driven, max ~80vh
- Pink-50 header bar with RIPLEY mail icon + kind label + close

### 4.2 Form layout

Top to bottom:
- **To** input (email)
- **CC** input (email, optional)
- **Subject** input (text)
- **Body** textarea (8 rows, monospace fallback for tabular content)
- **Source reference link** (when source URL provided)
- Footer:
  - Cancel button (ghost)
  - Send button (primary, right-aligned)

### 4.3 Send simulation

Click Send → Sending… (500ms) → ✓ Sent (900ms) → auto-close.
No real network call; v3 backend will wire to Postmark / SES / Gmail API.

### 4.4 The 9 builders

| Kind                | To                                        | CC                                  | Use                                      |
| ------------------- | ----------------------------------------- | ----------------------------------- | ---------------------------------------- |
| `compliance`        | ops-lead@buzzworks.com                    | compliance@buzzworks.com            | Compliance inbox notify                  |
| `client-compliance` | clientContact + AM                        | compliance-ops@buzzworks + compliance@<client-domain> | Per-client compliance alert (FPRD-05) |
| `timesheet-flag`    | employee email                            | manager email                        | Flag timesheet for clarification         |
| `timesheet-reject`  | employee email                            | manager email                        | Reject timesheet                         |
| `timesheet-approve` | employee email                            | —                                   | Approval confirmation                    |
| `timesheet-team`    | hr-ops@buzzworks.com                      | manager / payroll@buzzworks fallback | Internal: timesheet inconsistency review |
| `document-request`  | candidate (synthesised email)              | manager (when known)                 | Onboarding doc reminder                  |
| `onboarding-issue`  | onboarding-ops@buzzworks.com               | hr-ops@buzzworks.com                 | Internal: onboarding blocker             |
| `payroll-issue`     | payroll@buzzworks.com                     | finance-ops@buzzworks.com            | Internal: payroll cycle issue            |

### 4.5 Subject grammar

- **Timesheet emails** (flag/reject/approve/team):
  ```
  <prefix> — <employeeCode>: <main issue>[ (N issues)][ · <period>]
  ```
  Examples:
  - `Timesheet review — HEX0001: Daily cap exceeded · Apr 8–14`
  - `Timesheet rejected — HEX0001: OT without pre-approval (3 issues) · Apr 8–14`
  - `Timesheet approved — HEX0001 · Apr 8–14`
- **Compliance**: `Action required: <title (60 chars)>`
- **Client compliance**: `<client> · action required: <title (50 chars)>`
- **Onboarding**: `Onboarding blocker — <candidate> · <issue type>`
- **Document request**: `Document update required — <docType>`
- **Payroll**: `Payroll review — <client> · <cycle>`

### 4.6 Body conventions

**Employee-facing** (timesheet-flag, timesheet-reject, timesheet-approve,
document-request):
- Greeting: "Hi <first name>,"
- Body in plain ops voice (no "JARVIS confidence", no "AI agent",
  no "Drafted by AI")
- Bulleted issue list (not single one-liner)
- Sign-off: "Thanks, Buzzworks Ops"
- Footnote: blank line + `— This message was written using RIPLEY.`

**Internal** (compliance, client-compliance, timesheet-team,
onboarding-issue, payroll-issue):
- Opener: "Team," (or "Hi <contact>" for client-compliance)
- Structured details + bulleted findings
- Action prompt
- Footnote: same RIPLEY attribution

### 4.7 Rationale: why no AI mention in body

Outbound emails should feel like an ops person wrote them. The agent
attribution is on purpose limited to a single trailing line — enough
to stay accountable / discoverable, light enough not to spook
recipients (employees, clients) who don't want to feel like they're
arguing with a bot.

---

## 5. Component contract

```ts
<NotifyPanel
  context={NotifyContext | null}    // null = closed
  onClose={() => void}
  onSend?={(final: NotifyContext) => void}
/>
```

`NotifyContext = { kind, to, cc?, subject, body, sourceUrl?, sourceLabel? }`

Open by setting `context = builder({...})`. Builders live in
`components/NotifyPanel.tsx`.

### 5.1 Builders exported

```ts
buildClientComplianceNotify(input)
buildComplianceNotify(input)
buildTimesheetFlag(input)
buildTimesheetReject(input)
buildTimesheetApprove(input)
buildTimesheetNotifyTeam(input)
buildDocumentRequest(input)
buildOnboardingIssue(input)
buildPayrollIssue(input)
```

---

## 6. Edge cases

| Case                                                            | Handling                                       |
| --------------------------------------------------------------- | ---------------------------------------------- |
| User edits To/CC/Subject/Body before sending                    | `onSend` receives the edited final NotifyContext |
| Close clicked mid-edit                                          | Discards edits silently                         |
| Subject empty after edit                                        | Send disabled                                   |
| To empty after edit                                              | Send disabled                                   |
| Drawer click on agent that's already selected                   | Toggle off (close drawer)                       |
| Live activity tick fires while drawer open                      | Drawer state preserved; only feed ages          |
| Pipeline agent button clicked outside drawer                    | Opens drawer for that agent                     |

---

## 7. Telemetry events (proposed)

```
agents.page.viewed
agents.pipeline.clicked          { pipelineId, agentId, stepIndex }
agents.card.clicked              { agentId }
agents.drawer.opened             { agentId, source: "card" | "pipeline" | "feed" }
agents.activity.row.clicked      { agentId, summaryDigest }

notify.opened                    { kind }
notify.edited                    { kind, field: "to" | "cc" | "subject" | "body", chars }
notify.sent                      { kind, totalEditChars }
notify.cancelled                 { kind }
```

---

## 8. Acceptance criteria summary

### Agents page
- AC-1: Header copy is grounded operational language (no "reasoning loops")
- AC-2: Impact strip shows 4 KPI tiles tied to Home dashboard numbers
- AC-3: 3 pipeline cards render in §3.2 order with source/sink/agent steps/outcome
- AC-4: Each agent step button opens that agent's drawer
- AC-5: 6-agent roster in pipeline order; cards show today + headline metric + in/out chips + surface
- AC-6: Live activity feed: 15 rows, reverse chrono, 1-min tick to age timestamps
- AC-7: Drawer right-slides, shows acronym + operational copy + capabilities + hand-offs + surface
- AC-8: Principles footer 3 lines

### NotifyPanel
- AC-9: 9 kinds, each with correct To/CC defaults per §4.4
- AC-10: Subject grammar follows §4.5 per kind
- AC-11: Employee-facing bodies have no AI/JARVIS mention; only RIPLEY footnote
- AC-12: Internal bodies have RIPLEY footnote at end
- AC-13: Send simulates 500ms then ✓ Sent then auto-close 900ms later
- AC-14: Edits to fields before send are passed to onSend final context

---

## 9. Open questions

1. Real LLM integration for RIPLEY — currently builder functions are
   templated. v3 needs JSON-schema-structured drafting from agent
   context.
2. Agent activity feed in v2 is seeded; needs real event source in v3
   (websocket or SSE).
3. Pipeline visualisation should support drill-down: click a step →
   see the last 10 instances of that step. v3.
4. Per-agent settings (pause an agent, switch model, raise threshold).
   v3.
5. Email send needs real backend (Postmark or domain-bounded Gmail
   API). v3 with delivery audit.
6. Multi-language emails (Hindi for blue-collar segments). v3.
