# FPRD-04 — Inbox · Compliance

**Surface:** `/timesheets` → Compliance sub-tab
**Component:** `components/ComplianceInbox.tsx`
**Primary persona:** Compliance Lead (with Agent Manager as escalation
handler when an issue requires client-facing communication)
**Primary agents:** ORACLE (upstream) → RIPLEY (downstream)

---

## 1. Scope

The Compliance Inbox is the daily action surface for ORACLE-detected
regulations that have `actionRequired = true`. While the broader
Compliance Library (FPRD-07) is the read-mostly research view, this
inbox is the *what-needs-doing-this-week* triage queue.

Each row is a regulation (not an event); the same regulation can affect
multiple clients but appears as one row with all affected clients listed.

---

## 2. Information architecture

```
Compliance sub-tab
├─ Filter bar
│  ├─ Category multi-select       (Labour, Finance & Taxation, EHS, Commercial, Secretarial)
│  ├─ Impact area multi-select    (10 areas: Payroll, HR Ops, Compliance Mgmt, Worker Onboarding, ...)
│  ├─ Client multi-select         (only client names that appear in actionable list)
│  ├─ Clear chip
│  ├─ Search                      (right-aligned, by title/authority/clientsAffected)
│  └─ Sort selector               (Nearest deadline | Highest cost | Highest risk)
├─ Stats strip
│  ├─ Total action items count
│  ├─ Overdue count
│  ├─ Due-this-week count
│  └─ Total non-compliance exposure ₹    (right-aligned)
├─ Bulk action bar                (when ≥1 selected)
│  ├─ "N selected"
│  ├─ Mark done
│  ├─ Notify team
│  └─ Clear
├─ Sticky select-all row
└─ List
   └─ Row × N
      ├─ Selection checkbox
      ├─ Category dot
      ├─ Clients-affected chip    (single name OR "All clients" OR "<first> +N")
      ├─ Title + authority        (truncated)
      ├─ AI suggestion chip       (per category: "Update payroll rules", "Update tax config", "Compliance audit", etc.)
      ├─ Deadline label           (color-coded: overdue red, <7d red, <30d amber, else neutral)
      ├─ Cost label               (₹ exposure incl. penalty + ops mult + legal floor)
      └─ Expand caret
```

Expanded inline (no drawer) — 2-column grid:

- 2/3: regulation card (category, region, effective date, authority,
  summary, impact area chips)
- 1/3: Cost-of-non-compliance card + AI recommends card

Action row at bottom: Mark done · Notify team · external source link.

---

## 3. Cost of non-compliance formula

```
totalCostOfNonCompliance(reg) =
    reg.penaltyAmount
  + reg.penaltyAmount * opsMultiplier
  + legalFloor

where:
  opsMultiplier = high → 2.5
                  medium → 1.2
                  low → 0.4

  legalFloor    = high   → max(50,000, penalty * 0.30)
                  medium → max(25,000, penalty * 0.15)
                  low    → 10,000
```

Penalty alone understates the real downside (ops disruption + legal
defense + reputational drag). The total is what shows up in the row
cost label and aggregates into stats strip.

---

## 4. Deadline labelling

```
days = effectiveDate − today
  if days < 0   → "Nd overdue" (red)
  if days == 0  → "Today" (red)
  if days == 1  → "Tomorrow" (red)
  if days < 7   → "Nd left" (red)
  if days < 30  → "Nw" (amber)
  else          → "Nmo" (neutral)
```

Color thresholds match `deadlineColor()` helper. "Today" is treated as
the same urgency as overdue — once you're at the day-of, you've missed
the prep window.

---

## 5. AI suggestion → category mapping

```
Labour             → "Update payroll rules"
Finance & Taxation → "Update tax config"
EHS                → "Compliance audit"
Commercial         → "Review contracts"
Secretarial        → "Update filings"
default            → "Review & assign"
```

Shows on row as pink chip. Future v3: per-regulation custom suggestions
from ORACLE+LEXI cross-reference.

---

## 6. NotifyPanel integration (`compliance` kind)

```
To:      ops-lead@buzzworks.com
CC:      compliance@buzzworks.com
Subject: Action required: <title> (truncated to 60 chars)
Body:
  Team,

  New <authority> notification needs attention:

  "<title>"
  Region: <region> · Effective <date> · Deadline <label>
  Penalty exposure if not actioned: <fmtPenalty(cost)>

  Impacted clients: <clientList or "All clients">

  Please review and confirm action plan by EOD.

  — RIPLEY on behalf of Ops
```

For per-client compliance alerts (drafted from `/clients/[id]` Compliance
tab), the `client-compliance` kind routes to AM + client contact + CCs.
That flow is owned by FPRD-05.

---

## 7. clientsLabel rendering

The chip on the left of each row shows affected clients:

```
clients = []                       → "—"
clients includes "All XYZ"          → "All clients"
clients length == 1                 → that one name
clients length > 1                  → "<first> +N"
```

In the expanded view, full list is rendered as separate chips.

---

## 8. Edge cases

| Case                                                            | Handling                                       |
| --------------------------------------------------------------- | ---------------------------------------------- |
| `actionRequired === false` regulations                          | Filtered out at source; never appear in this inbox |
| Zero penalty amount                                             | Cost label still shows non-zero (legal floor + ops mult on small base) |
| `clientsAffected` empty                                         | Chip renders "—"                                |
| Same regulation affects 11 clients (everyone)                   | Chip renders "All clients" if any name starts with "All " |
| Filter combination yields 0 rows                                | "No action-required regulations match the filters" empty state |
| Bulk Notify with all selected                                   | Uses first selected (v2 limitation)            |

---

## 9. Telemetry events (proposed)

```
compliance-inbox.row.expanded          { id, category, riskLevel, daysToDeadline }
compliance-inbox.notify.opened         { id }
compliance-inbox.notify.sent           { id }
compliance-inbox.markdone              { id }
compliance-inbox.filter.applied        { key, value }
compliance-inbox.sort.changed          { mode }
```

---

## 10. Acceptance criteria summary

- AC-1: Default sort = nearest deadline first
- AC-2: Stats strip shows: total · overdue · due this week · total cost exposure
- AC-3: Cost calc uses §3 formula (penalty + ops mult + legal floor)
- AC-4: Deadline label colors per §4 thresholds
- AC-5: AI suggestion chip per §5 mapping
- AC-6: clientsLabel render per §7 rules
- AC-7: NotifyPanel routes to ops-lead + compliance CC; subject `Action required: <title>`
- AC-8: External source link in expanded action row points to gov portal (no TeamLease)
- AC-9: Mark-done removes the row from the inbox (sets actionRequired=false locally)

---

## 11. Open questions

1. Mark-done is local-only; backend needs an audit trail and per-user
   ownership of who marked which regulation as done.
2. Per-client compliance escalation should be one click from this inbox,
   not just from the per-client Compliance tab. v3.
3. SLA breach indicators: when a regulation has been actionable >7d,
   surface a red badge on the row. v3.
4. Cost formula tunables: opsMultiplier and legalFloor should be config,
   not hard-coded. v3.
