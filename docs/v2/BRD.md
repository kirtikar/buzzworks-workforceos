# Business Requirements Document (BRD) — v2

**Product:** Agent Dashboard
**Owner:** Buzzworks (managed workforce ops)
**Audience for this doc:** Buzzworks leadership, sales, finance, BD
**Status:** Live (v2.1.0). Replaces v1 BRD dated 2026-04-10.

---

## 1. Executive Summary

Agent Dashboard is the operating console used by Buzzworks Agent Managers
to run managed-workforce ops for 11 enterprise clients (Capgemini,
LTIMindtree, Accenture, Hexaware, Virtusa, Cognizant, PwC, Amphenol
Omniconnect, Bahwan Cybertek, Winomechanic, HMH Technology — combined
managed headcount ≈ 45,000).

Six named AI agents (LEXI, JARVIS, ORACLE, CASE, RIPLEY, TRON) handle the
bulk of ops triage; humans review reasoning trails and sign off. The
console exists to make that hand-off legible, fast, and audited.

The business case is simple: this product is the reason Buzzworks runs
₹60 Cr ARR of managed services on **4 FTE** instead of 7. The 3-FTE
delta = ~₹2.4 Cr/year of fully-loaded ops cost saved while throughput
increases by ~30%.

---

## 2. Strategic Context

### 2.1 What Buzzworks sells

Managed-workforce operations as a service: timesheet validation,
payroll runs, compliance tracking, onboarding/offboarding, and
day-to-day employee ops for clients who want to focus on the people
themselves rather than the back-office machinery around them.

The product sold to clients is "we run your ops". The product
**inside** Buzzworks — Agent Dashboard — is what makes that promise
deliverable at scale without the headcount linear scaling problem.

### 2.2 Why now

| Market force                                        | Implication                                       |
| --------------------------------------------------- | ------------------------------------------------- |
| Foundation models (GPT-4o, Claude 4.x) reliable enough for ops decisions | Replace human triage with agent triage; humans become reviewers |
| Indian regulatory churn: ~1,500 notifications/yr from 24 authorities | Manual compliance tracking can't keep up; ORACLE-class agent is table stakes |
| Buzzworks contracts moving from headcount-billed → outcome-billed | Margin upside from automation accrues to Buzzworks; previously it accrued to client's HRMS vendor |
| Ops manager talent scarce in metros (Mumbai, Bangalore) | Single agent manager doing the work of 3-4 ops people is hireable |

### 2.3 Buzzworks vs the alternatives

- **In-house ops at the client** — expensive, doesn't scale to multi-state
  compliance, no benefit from agent automation
- **Generic VMS (Fieldglass, BeeLine alone)** — handles intake, doesn't
  handle the ops decisions that follow
- **Other staffing managed-services** — typically still operate on
  headcount-driven ops models; Agent Dashboard is the differentiator

---

## 3. Personas

### 3.1 Primary: Buzzworks Agent Manager (Siddharth Kirtikar persona)

- **Role:** Runs ops for 2–4 client accounts simultaneously
- **Tenure:** 2–6 years of HR/ops experience; not necessarily AI-native
- **Daily volume:** Reviews ~180–200 agent decisions across 4 inboxes
- **Tools they replace:** Excel, email rules, a stack of HRMS portals,
  manual compliance trackers
- **Success looks like:** Closes the day with all 4 inboxes at zero
  outstanding "needs-action" items
- **Failure mode:** Loses trust in agents, falls back to manual review
  → throughput collapses

### 3.2 Secondary: Operations Lead

- **Role:** Manages 4–6 agent managers; owns SLA + cost metrics
- **Daily ritual:** Glances at the Home dashboard once or twice;
  drills into Clients tab when a specific account is flagged
- **Success metric:** Ops cost % of net revenue stays in 1–4% band
- **Failure mode:** Agent decisions degrade undetected → SLA slips →
  client churn

### 3.3 Account Manager (AM)

- **Role:** Client-facing relationship owner at Buzzworks
- **Touchpoints:** Receives RIPLEY-drafted notifications when client-
  affecting events happen (compliance changes, escalations, blockers)
- **Success metric:** Zero surprise calls from client; everything they
  hear about, they heard from the agent first

### 3.4 Compliance Lead

- **Role:** Owns multi-state compliance posture across all Buzzworks
  clients
- **Tools:** Compliance section + ORACLE alerts
- **Success metric:** Zero unactioned regulations past their effective
  date; total penalty exposure across all clients < ₹X

### 3.5 Client HR Contact

- **Role:** The named human at the client side who receives Buzzworks
  notifications
- **Touchpoints:** Email — never logs into Agent Dashboard
- **Success metric:** Trusts that an Agent Dashboard email is genuine
  ops content, not bot spam

### 3.6 Employee (end worker)

- **Role:** Subject of the timesheet / leave / onboarding flows
- **Touchpoints:** Email — RIPLEY-drafted, no AI mention, RIPLEY
  footnote only
- **Success metric:** Receives clear, human-feeling ops emails

---

## 4. Business Objectives

### 4.1 Operational

| Objective                                  | KPI                          | Target | Current |
| ------------------------------------------ | ---------------------------- | ------ | ------- |
| Run ₹60 Cr ARR with 4 FTE                  | Cases / FTE / month          | ≥ 700  | 730     |
| Keep ops cost in industry band             | Ops cost % of net revenue    | 1–4%   | 3.6%    |
| Maximise auto-resolved share of work       | Auto-approval rate           | ≥ 60%  | 62%     |
| Hit SLAs across all 4 inboxes              | SLA adherence                | ≥ 95%  | 94.1%   |
| Keep AI savings vs. manual baseline        | ₹/month saved by AI          | ≥ ₹10L | ₹12L    |

### 4.2 Strategic

| Objective                                                   | Measure                       | Horizon |
| ----------------------------------------------------------- | ----------------------------- | ------- |
| Productise so a new Agent Manager can ramp in < 2 weeks     | Onboarding time to first solo shift | Q3 2026 |
| Add 4 new clients without adding ops headcount              | Clients per FTE                | Q4 2026 |
| Cross-sell from timesheet ops → full HR ops at top 3 clients| Revenue per client             | Q1 2027 |

### 4.3 Risk

| Risk                                              | Mitigation                                       |
| ------------------------------------------------- | ------------------------------------------------ |
| Agent decisions degrade undetected                | Live activity feed + per-agent accuracy KPI in roster |
| Compliance slips on a client → financial penalty  | ORACLE daily scan + per-client penalty exposure visible |
| RIPLEY emails feel bot-y → client/employee trust  | No AI mention in body; ops reviews every send  |
| Single Agent Manager out of office → backlog      | Inbox is shared workqueue; any AM can clear     |
| Client wants to know "what does AI know about us" | Per-client compliance + policy + employee tabs |

---

## 5. Commercial Model

### 5.1 Revenue assumptions

```
Annual net revenue (managed services fees):  ₹60 Cr
Monthly net revenue:                          ₹5 Cr  (₹500 L)
Top-8 clients account for:                    ~77% of revenue (₹383 L/mo)
Other 3 clients account for:                  ~23% of revenue (₹117 L/mo)
Avg net revenue per managed head per month:   ~₹1,100
```

### 5.2 Cost structure

```
Monthly ops cost (April):                     ₹18 L
  → Onboarding (PAN, bank, PF, ESI):          26% (₹4.7 L)
  → Timesheet approval & validation:          18% (₹3.2 L)
  → Payroll processing & reconciliation:      15% (₹2.7 L)
  → Compliance & regulation checks:           10% (₹1.8 L)
  → Employee queries & grievances:             8% (₹1.4 L)
  → Leave & attendance reconciliation:         7% (₹1.3 L)
  → Client reporting & AM coordination:        6% (₹1.1 L)
  → HRMS portal sync & issue resolution:       5% (₹0.9 L)
  → Offboarding & F&F settlement:              5% (₹0.9 L)

Ops cost ratio (April):                       3.6%   (target band 1–4%)
Without-AI counterfactual ratio (April):      6.0%
AI savings per month:                         ₹12 L  (~₹1.44 Cr/year)
```

### 5.3 Pricing implications

- Agent Dashboard is **internal IP**, not licensed externally (yet)
- Productisation thesis: at 4 clients per FTE and ≤ 4% ops cost, every
  new client closed is incremental margin

---

## 6. Success Criteria

A v2.x release is considered successful if:

1. Agent managers report subjective trust in agent decisions ≥ "I don't
   re-check most of them"
2. Cases / FTE / month sustains ≥ 700 for 3 consecutive months
3. Ops cost ratio stays in 1–4% band
4. SLA adherence ≥ 95% across all 4 inboxes
5. No P0 incident traced to a silently-wrong agent decision
6. New Agent Manager can take a client account solo within 2 weeks of joining

---

## 7. Out of scope (v2)

- External licensing of Agent Dashboard
- Direct employee-facing portal (employees still email)
- Mobile-first re-architecture (current mobile experience is responsive
  fallback only; bottom nav, touch targets)
- Integrations beyond Fieldglass + BeeLine + email
- Multi-tenant architecture for multiple Buzzworks subsidiaries
- Voice / phone interactions

These belong in v3 planning.
