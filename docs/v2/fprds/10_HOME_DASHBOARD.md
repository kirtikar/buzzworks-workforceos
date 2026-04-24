# FPRD-10 — Home Dashboard

**Surface:** `/`
**Primary persona:** Buzzworks Agent Manager (start of shift),
Operations Lead (account-health glance)

---

## 1. Scope

The Home page is the first thing an Agent Manager sees on login. It
sets the operational frame for the day: what's the current ops cost
posture, how many cases were auto-resolved, what's the SLA, and how
much money is the agent system saving vs the manual baseline.

Every number on this page derives from a small set of central
constants (the "CFO baseline") so the page can never internally
contradict itself.

---

## 2. Information architecture

```
Home page
├─ Greeting block
│  ├─ "Good morning, <FirstName>" (h1)
│  └─ "<Month YYYY> · <N> clients · <N> ops cases auto-resolved" subtitle
│
├─ KPI row (4 stat cards)
│  ├─ Monthly Ops Cost           (with delta "−₹12L vs without AI")
│  ├─ Cases resolved / FTE        (with delta vs Mar)
│  ├─ Auto-Approval Rate          (with delta)
│  └─ SLA Adherence               (with target)
│
└─ Charts grid (1-col mobile, 2-col lg)
   ├─ Chart 1: Ops Cost as % of Net Revenue        (area chart, with vs without AI)
   ├─ Chart 2: Ops cost breakup                    (donut + per-row legend)
   ├─ Chart 3: Ops Cost by Client                  (custom horizontal bar list)
   └─ Chart 4: Resource Utilization                (bar chart + headcount footer)
```

---

## 3. CFO baseline (centralised constants)

```
ANNUAL_NET_REVENUE        = ₹60 Cr
MONTHLY_NET_REVENUE       = ₹5 Cr (₹500 L)
APR_OPS_COST              = ₹18 L
APR_OPS_RATIO             = 18 / 500 × 100 = 3.6 %
APR_OPS_RATIO_WITHOUT_AI  = 6.0 %
APR_AI_SAVINGS            = 500 L × (6.0 − 3.6) / 100 = ₹12 L / month
                          ≈ ₹1.44 Cr / year
```

Every chart, KPI delta, and tooltip reads from these constants.
Touching one number propagates everywhere.

---

## 4. KPI cards (4)

| Label                  | Value | Delta                       | Trend | Color           |
| ---------------------- | ----- | --------------------------- | ----- | --------------- |
| Monthly Ops Cost        | ₹18L  | −₹12L vs without AI          | down  | var(--accent)   |
| Cases resolved / FTE    | 730   | +31% vs Mar (557)           | up    | var(--accent)   |
| Auto-Approval Rate      | 62%   | +4.2pp vs last month         | up    | var(--accent)   |
| SLA Adherence           | 94.1% | Target: 95%                  | up    | var(--info)     |

KPI cards use `.stat-card` class — pink-50 bg + pink-200 border + pink
value text.

---

## 5. Chart 1 — Ops Cost as % of Net Revenue

Subtitle: "Industry band 1–4% · AI saves ₹12L/mo (~₹1.44Cr/yr)".
Right-side current value: 3.6% (April).

### 5.1 Data series

```
Month  withoutAI  withAI
Nov    5.6        5.4
Dec    5.7        5.0
Jan    5.8        4.6
Feb    5.9        4.2
Mar    5.9        3.9
Apr    6.0        3.6
```

### 5.2 Visualisation

- Area chart, two stacked layers
- "Without AI (projected)" — `var(--lavender)`, dashed stroke
- "With AI (actual)" — `var(--accent)` solid stroke
- Y-axis domain `[2, 7]` to fit 1–4% band
- Tooltip shows both values as %

### 5.3 What this tells the user

The gap between the two areas is the agent system's contribution to
margin. If with-AI ratio drifts up (toward without-AI line), the
agents are losing efficacy and ops should investigate.

---

## 6. Chart 2 — Ops Cost breakup

Subtitle: "₹18L/mo across sub-functions"

### 6.1 Data (9 sub-functions)

| Sub-function                                  | %  | ₹      |
| --------------------------------------------- | -- | ------ |
| Onboarding (PAN, bank, PF, ESI)               | 26 | ₹4.7L |
| Timesheet approval & validation               | 18 | ₹3.2L |
| Payroll processing & reconciliation           | 15 | ₹2.7L |
| Compliance & regulation checks                | 10 | ₹1.8L |
| Employee queries & grievances                 | 8  | ₹1.4L |
| Leave & attendance reconciliation             | 7  | ₹1.3L |
| Client reporting & AM coordination            | 6  | ₹1.1L |
| HRMS portal sync & issue resolution           | 5  | ₹0.9L |
| Offboarding & F&F settlement                  | 5  | ₹0.9L |

### 6.2 Visualisation

- Donut chart (160×160), 9 colored slices
- Right-side legend: per-row dot + label + % (max-h-200, scrollable)
- Tooltip: `<%> · <₹>`

---

## 7. Chart 3 — Ops Cost by Client

Subtitle: "Top 8 ≈ ₹12.6L of ₹18L · efficiency = ops cost ÷ client revenue"

### 7.1 Data

| Client              | Cost   | Revenue | Efficiency |
| ------------------- | ------ | ------- | ---------- |
| Infosys BPM         | ₹2.5L  | ₹84L    | 2.98%      |
| Hexaware            | ₹2.1L  | ₹68L    | 3.09%      |
| L&T Infotech        | ₹1.7L  | ₹52L    | 3.27%      |
| Capgemini India     | ₹1.6L  | ₹47L    | 3.40%      |
| Mindtree            | ₹1.5L  | ₹44L    | 3.41%      |
| Cognizant Digital   | ₹1.4L  | ₹37L    | 3.78%      |
| Persistent Systems  | ₹0.9L  | ₹28L    | 3.21%      |
| Mphasis Corp        | ₹0.9L  | ₹23L    | 3.91%      |

(These are dashboard-aggregated names; the actual client list since
the v2 client refresh is the 11 in FPRD-05. Top-8 representation
preserved for dashboard continuity.)

### 7.2 Visualisation

- Custom horizontal bar list (not Recharts) for tighter control
- Each row: name (110px) · bar (flex) · cost label · efficiency %
- Bar width relative to max cost in set; bar bg = var(--accent) at 85%
- Efficiency color thresholds:
  - <3.3% → #059669 (healthy)
  - 3.3–4.0% → var(--warn) (watch)
  - >4.0% → var(--danger) (risk)

### 7.3 Threshold legend (footer)

`<3.3% healthy · 3.3–4.0% watch · >4.0% risk`

---

## 8. Chart 4 — Resource Utilization

Subtitle: "Cases resolved per FTE — across timesheet, onboarding,
payroll & compliance inboxes"

Right-side meta: "Apr headcount · 4 FTE"

### 8.1 Data (cases/FTE/month + headcount)

```
Month  perPerson  headcount
Nov    320        7
Dec    340        6
Jan    410        6
Feb    440        6
Mar    557        5
Apr    730        4
```

### 8.2 Visualisation

- Bar chart, single series "Cases / FTE"
- Bar color: var(--accent), 28px width
- Footer: 6-cell grid showing per-month headcount in lavender
- Total cases April: 730 × 4 = 2,920 (used in greeting subtitle)

---

## 9. Personalisation

Greeting uses logged-in user's first name. Subtitle uses live
`clients.length` from mock-data + live computed `APR_TOTAL_ITEMS`.

---

## 10. Edge cases

| Case                                                            | Handling                                       |
| --------------------------------------------------------------- | ---------------------------------------------- |
| New month rollover (May 1)                                      | Constants are hard-coded for April; v3 needs month-aware data |
| Client list changes mid-deploy                                  | Greeting subtitle reflects current `clients.length` |
| KPI tooltip on mobile                                            | Recharts default; keep                          |
| Chart 1 with-AI line crosses without-AI line (savings disappear) | UI still renders; numerically impossible per current data |

---

## 11. Telemetry events (proposed)

```
home.viewed                     {}
home.kpi.hovered                { label }
home.chart.tooltip.shown        { chartId, x }
home.chart.legend.toggled       { chartId, key }
```

---

## 12. Acceptance criteria summary

- AC-1: Greeting "Good morning, <name>" + subtitle "<month> · X clients · Y ops cases auto-resolved"
- AC-2: 4 KPI cards in §4 layout with deltas
- AC-3: Chart 1 Y-axis domain [2,7]; with-AI line drops monotonically; subtitle calls out band 1–4% + AI savings
- AC-4: Chart 2 donut + 9-row legend; tooltip shows % + ₹
- AC-5: Chart 3 efficiency thresholds: <3.3% green / 3.3–4.0% amber / >4.0% red
- AC-6: Chart 4 bars use cases/FTE; footer cells show headcount per month
- AC-7: APR_TOTAL_ITEMS = perPerson × headcount in April, used in greeting subtitle
- AC-8: All numbers derived from CFO baseline constants in §3 — touching one updates everywhere

---

## 13. Open questions

1. April-only data is hard-coded; v3 needs month-aware data feed
   (likely from a backend KPI store).
2. Per-client costs in Chart 3 use legacy dashboard names; consolidate
   on the v2 11-client roster in v3.
3. Drill-down: Chart 2 slice click should open Inbox filtered to that
   sub-function. v3.
4. Chart 4 should show forward projection (cases/FTE if we hire 1 less,
   or auto-rate climbs to 70%). v3.
5. SLA card needs per-inbox breakdown on hover. v3.
