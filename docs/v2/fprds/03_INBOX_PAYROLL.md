# FPRD-03 — Inbox · Payroll

**Surface:** `/timesheets` → Payroll sub-tab
**Component:** `components/PayrollInbox.tsx`
**Primary persona:** Buzzworks Agent Manager (with finance ops as
secondary reviewer for cycle blockers)
**Primary agent:** TRON (downstream of JARVIS)

---

## 1. Scope

Payroll is intentionally lighter than timesheets and onboarding (~72
active issues at any time) because most issues here are *cycle-level
exceptions* rather than per-employee. They cluster around payroll-cycle
windows: pre-run prep, in-cycle blockers, statutory submissions, and
post-run reconciliations.

A single unresolved Cycle Block can hold an entire client's payroll
cycle, so prioritisation here is not by volume but by **₹ exposure**
(how much salary is held until the issue clears).

---

## 2. Information architecture

Same shell pattern as Onboarding, with these differences:

```
Payroll sub-tab
├─ Filter bar
│  ├─ Stage multi-select       (4 stages: pre-run, cycle-block, statutory, post-run)
│  ├─ Issue type multi-select  (7 types)
│  ├─ Severity multi-select    (high, medium, low)
│  ├─ Client multi-select       (only when not client-scoped)
│  ├─ Clear chip
│  ├─ Search                   (right-aligned, by issue/client/cycle)
│  └─ Sort selector            (Highest amount | Oldest first | Highest severity | Client name)
├─ Stats strip
│  ├─ Total issues count
│  ├─ Cycle blockers count
│  └─ Total exposure (₹)        (right-aligned, danger color)
├─ Bulk action bar              (when ≥1 selected)
│  ├─ "N selected"
│  ├─ Mark resolved
│  ├─ Notify team
│  └─ Clear
└─ List
   └─ Row × N
      ├─ Selection checkbox
      ├─ Stage dot
      ├─ Client chip (full client name, not just code)
      ├─ Issue type + cycle (Apr 2026 / Mar 2026 / Feb 2026)
      ├─ Stage label chip
      ├─ Severity label chip
      ├─ Affected employees count    (Users icon + number)
      ├─ ₹ exposure                   (tabular-nums, danger color)
      └─ Expand caret
```

Expanded inline (no drawer) — 3-column grid:
- 2/3: stage + cycle + age chips, issue type heading, bulleted details
- 1/3: Exposure card (₹ + affected employees), AI suggests card

Below the grid: Recommended action line + 3-button action row
(Mark resolved, Notify team, timestamp meta).

---

## 3. The 7 issue types

| Type                              | Stage         | Severity | Recommended action                                     | AI suggests                                      |
| --------------------------------- | ------------- | -------- | ------------------------------------------------------ | ------------------------------------------------ |
| Bank account validation failure   | cycle-block   | high     | Collect corrected bank proofs; reroute failed credits  | Auto-email employees with failed bank validation |
| PT slab mismatch                  | statutory     | medium   | Realign PT slab in HRMS; retro-adjust in next cycle    | Push state-wise PT matrix into payroll config    |
| LOP reconciliation variance       | pre-run       | medium   | Confirm LOP with line managers; re-run variance report | Auto-query managers for LOP sign-off             |
| Overtime pre-approval missing     | pre-run       | medium   | Validate OT with line managers or disallow per policy  | Disallow unapproved OT per client policy         |
| PF contribution ceiling breach    | statutory     | high     | Cap contribution at ₹15,000 ceiling or raise exception | Apply statutory ceiling unless voluntary opt-in  |
| TDS deduction mismatch            | post-run      | medium   | Revise tax computation; reissue Form 16 if needed      | Re-run tax engine with latest declarations       |
| Bonus payout block                | cycle-block   | low      | Confirm bonus eligibility with client; release or hold | Hold for client approval and re-release          |

---

## 4. Stages (4)

| Stage       | Color           | Background         | Description                                  |
| ----------- | --------------- | ------------------ | -------------------------------------------- |
| pre-run     | #6366F1         | rgba(99,102,241,.10) | Issue must be resolved before cycle starts |
| cycle-block | var(--danger)   | var(--danger-bg)   | Blocks the cycle from releasing              |
| statutory   | #F59E0B         | rgba(245,158,11,.10) | Statutory body deadline / compliance      |
| post-run    | #0EA5E9         | rgba(14,165,233,.10) | Reconciliation after cycle has run        |

---

## 5. Data model

```ts
interface PayrollIssue {
  id: string                       // "pay-1" .. "pay-72"
  clientId: string                 // 11 valid ids
  clientName: string
  clientColor: string
  cycle: string                    // "Apr 2026" | "Mar 2026" | "Feb 2026"
  issueType: string                // 1 of 7
  stage: PayrollStage              // 1 of 4
  severity: PayrollSeverity        // high | medium | low
  affectedCount: number            // 1..18
  amountImpact: number             // ₹ value at risk
  aiSuggestion: string
  details: string[]                // bullet lines
  recommendedAction: string
  createdAt: string
  ageDays: number                  // 0..9
}
```

Generated deterministically via mulberry32 PRNG seeded with `20260429`.
Total 72 issues. ₹ exposure varies; sum is shown in the stats strip.

---

## 6. NotifyPanel integration (`payroll-issue` kind)

```
To:      payroll@buzzworks.com
CC:      finance-ops@buzzworks.com
Subject: Payroll review — <client> · <cycle>
Body:
  Team,

  Payroll issue detected that may block the <cycle> cycle for <client>:

  Issue type: <type>
  Affected employees: <N>

  Details:
  • <detail 1>
  • <detail 2>

  Please confirm the correct treatment so the cycle can close on schedule.

  — This message was written using RIPLEY.
```

---

## 7. ₹ exposure formatting

`fmtINR(n)` helper:
- 0 → "—"
- ≥ 1Cr → `₹X.YCr`
- ≥ 1L → `₹X.YL`
- ≥ 1k → `₹Xk`
- < 1k → `₹X` with comma grouping

Right-edge of every row + total in stats strip + exposure card in
expanded view.

---

## 8. Edge cases

| Case                                                            | Handling                                       |
| --------------------------------------------------------------- | ---------------------------------------------- |
| Empty details array                                             | Fallback line "See payroll detail for context" |
| `amountImpact = 0`                                              | Renders "—" instead of ₹0                      |
| Filter yields 0 rows                                            | "No payroll issues match the filters" empty state |
| Per-client view (`clientId` prop) with 0 issues                 | Empty state                                     |
| Multiple cycles in selection (Apr + Mar)                        | Bulk Notify uses first selected; v3 must batch by cycle |

---

## 9. Telemetry events (proposed)

```
payroll.row.expanded            { id, stage, severity, amountImpact }
payroll.action.resolved         { id }
payroll.notify.opened           { id }
payroll.notify.sent             { id }
payroll.filter.applied          { key, value }
```

---

## 10. Acceptance criteria summary

- AC-1: Default sort = amount-desc (highest exposure first)
- AC-2: Stats strip shows live counts and total ₹ exposure across filtered set
- AC-3: Cycle blockers count uses `stage === "cycle-block"` filter
- AC-4: Per-row exposure label uses fmtINR rules from §7
- AC-5: NotifyPanel routes to payroll@buzzworks + finance-ops on CC
- AC-6: Inside per-client view, Client filter is hidden
- AC-7: Sort by amount uses `amountImpact` desc; sort by client uses `clientName` asc

---

## 11. Open questions

1. Cycle-by-cycle payroll calendar: the inbox shows issues but doesn't
   visualise the cycle timeline. v3 should add a "Cycle window" header
   showing T-7 / T-3 / T-0 / T+3 markers.
2. Per-client cycle config (some clients run weekly, some monthly).
   v2 assumes monthly only.
3. Statutory deadlines (e.g. EPF ECR by 15th) need a hard-deadline
   indicator on the row. v3.
4. Bulk Notify same v2 limitation as the other inboxes — first selected
   only.
