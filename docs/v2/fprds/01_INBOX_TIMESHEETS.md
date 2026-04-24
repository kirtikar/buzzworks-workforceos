# FPRD-01 — Inbox · Timesheets

**Surface:** `/timesheets` (default sub-tab in Inbox)
**Primary persona:** Buzzworks Agent Manager
**Primary agent:** JARVIS (with LEXI + CASE upstream, RIPLEY downstream)

---

## 1. Scope

The timesheet inbox is the single largest source of agent-manager work
volume (~320/day). Every timesheet ingested via portal sync, email, or
manual entry lands here and is scored by JARVIS against the LEXI-compiled
policy pack for the client. Clean ones auto-approve. The rest queue for
human review with a full reasoning trail.

This FPRD covers: list shell, filter bar, bulk actions, row interactions,
detail drawer, three notify flows, pagination, sorting, and the Quick Rules
auto-approval bar.

---

## 2. Information architecture

```
Inbox (page)
├─ Header                            (page title "Inbox" + count)
├─ Tab bar                           (Timesheets | Compliance | Onboarding | Payroll)
└─ Timesheets sub-tab
   ├─ Filter bar
   │  ├─ Needs-action toggle          (default ON, scopes to pending/reviewing/flagged)
   │  ├─ Status multi-select          (Pending, Reviewing, Flagged, Approved, Processed, Rejected)
   │  ├─ Client multi-select          (11 client options)
   │  ├─ Source multi-select          (Portal, Email, Manual)
   │  ├─ Score multi-select           (High ≥85, Med 60-84, Low <60)
   │  ├─ Has-overtime toggle
   │  ├─ Clear chip                   (visible when ≥1 filter active)
   │  ├─ Search                       (right-aligned, by employee/client/period)
   │  └─ Sort selector                (Most recent | Lowest score | Highest score | Hours | Client)
   ├─ Stats strip
   │  ├─ Total items count
   │  ├─ Flagged count
   │  ├─ Items with overtime count
   │  └─ Page indicator (right-aligned)
   ├─ Bulk action bar                  (only when ≥1 selected)
   │  ├─ "N selected" label
   │  ├─ Approve selected button       (skips flagged)
   │  ├─ Flag button                   (opens NotifyPanel for first selected)
   │  ├─ Reject button                 (opens NotifyPanel for first selected)
   │  └─ Clear selection button
   ├─ Quick Rules bar                  (when actionableOnly, showing rules with count > 0)
   │  ├─ "Score ≥ 95, all checks pass" rule
   │  ├─ "Portal source, no flags" rule
   │  └─ "Under 40h, single client" rule
   ├─ Select-all row                   (sticky, only when ≥1 actionable in filter)
   └─ List
      └─ Row × N
         ├─ Selection checkbox         (only for actionable statuses)
         ├─ Status icon
         ├─ Client code chip
         ├─ Employee name + period + hours (+ OT badge)
         ├─ Source icon                (Mail | Globe | Edit3)
         ├─ AI suggestion chip         (Auto-approve | Notify HR | Verify OT | Manual review)
         ├─ Score with F/W badges
         ├─ Quick Approve button       (only for non-flagged actionable)
         └─ Detail expand caret
```

When a row is expanded → opens **right-side detail drawer** (420px, hidden
on mobile). List collapses to single-column on lg+ when drawer is open.

---

## 3. Pipeline

```
Source ──┐
(Portal/  │
 Email/   ▼
 Manual)  CASE   ──validates PAN/IFSC/dup checks──┐
                                                   ▼
                  LEXI's compiled policy pack ──► JARVIS ──► decision
                                                              │
              ┌───────────────────────────────────────────────┤
              ▼                       ▼                       ▼
         Auto-approve            Flag (drawer)          Reject (drawer)
              │                       │                       │
              ▼                       ▼                       ▼
         Payroll cycle      RIPLEY drafts flag email   RIPLEY drafts reject
                                      │                  email
                                      ▼                  │
                                  Notify-team             ▼
                                  (3-button     Employee + manager
                                   row in drawer)
```

---

## 4. Data model (per row)

```ts
interface Timesheet {
  id: string
  employeeId: string             // resolves to Employee
  clientId: string               // 11 valid ids
  period: string                 // human-readable, e.g. "Apr 8-14, 2026"
  periodStart: string            // ISO date
  periodEnd: string              // ISO date
  source: "portal" | "email" | "manual"
  sourceDetail?: string          // e.g. "Fieldglass", "Outlook"
  portalId?: PortalSlug          // when source=portal
  status: "pending" | "reviewing" | "flagged" | "approved" | "processed" | "rejected"
  totalHours: number
  regularHours: number
  overtimeHours: number
  leaveHours: number
  totalPayable: number
  validationScore: number        // 0-100
  aiConfidence?: number          // 0-100, JARVIS confidence
  validationChecks: ValidationCheck[]   // 7 checks per timesheet
  flagReason?: string            // human-set or JARVIS-set
  flaggedBy?: "ai" | "ops" | "system"
  approvedBy?: string
  approvedAt?: string
  submittedAt: string
  dailyEntries?: DailyEntry[]
}

interface ValidationCheck {
  id: string
  rule: string                   // e.g. "Daily cap"
  detail: string                 // human-readable explanation of result
  result: "pass" | "fail" | "warning" | "pending"
}
```

7 standard validation checks: hours, overtime, leave, attendance, rate,
work-order reference, integrity (no duplicate submission).

---

## 5. States

### 5.1 Row visual states

| Selection | Expanded | Background           |
| --------- | -------- | -------------------- |
| no        | no       | `var(--surface)`     |
| yes       | no       | `var(--surface-hover)` |
| —         | yes      | `var(--pink-50)`     |

### 5.2 Status icons + colors

| Status     | Icon         | Color                |
| ---------- | ------------ | -------------------- |
| pending    | Clock        | `var(--text-3)`      |
| reviewing  | Sparkles     | `var(--accent)`      |
| flagged    | AlertTriangle| `var(--warn)`        |
| approved   | CheckCircle2 | `#059669`            |
| processed  | CheckCircle2 | `var(--accent)`      |
| rejected   | XCircle      | `var(--danger)`      |

### 5.3 Score color thresholds

- ≥85 → success green
- 60–84 → `var(--warn)` amber
- <60 → `var(--danger)` red

### 5.4 AI suggestion chip logic

```
if score ≥ 95 AND no failed checks      → "Auto-approve"
elif status == "flagged"                → "Notify HR"
elif overtimeHours > 0                  → "Verify OT pre-approval"
else                                    → "Manual review"
```

---

## 6. Detail drawer

420px right-side panel. Sections, top to bottom:

1. **Sticky header** — employee avatar (initials), name, client chip, period, close button
2. **Employee meta card** — large avatar, role, department, client name
3. **Hours grid** — 3 cells (Regular, Overtime, Leave) + total payable strip
4. **JARVIS Validation** — confidence pill, validation score card with color,
   list of 7 checks with pass/fail/warning/pending icons + rule + detail
5. **Flag reason card** — only when `flagReason` is set
6. **Leave balance** — 3 cells (Annual, Sick, Casual) with remaining/total + bar
7. **Action group** — visible only for pending/reviewing/flagged status:
   - Primary "Approve timesheet" (full-width)
   - "Notify team — flag inconsistencies" (full-width, pink-50 bg)
   - 2-column grid: "Flag" (warn) | "Reject" (danger)
8. **Status confirmation** — for approved/processed states (read-only)

---

## 7. Bulk actions

### 7.1 Selection model

- Per-row checkbox visible only when status ∈ {pending, reviewing, flagged}
- Sticky "Select all actionable" row at top of list (when ≥1 actionable)
- `selectedIds: Set<string>` in component state
- Bulk action bar appears when `selectedCount > 0`

### 7.2 Bulk Approve

- Filters `selectedIds` to only those with status ∈ {pending, reviewing}
  (skips flagged)
- Sets each to `approved`, attribution `Siddharth Kirtikar`, timestamp now
- Clears selection
- No confirmation dialog (reversible via undo? — TBD v3)

### 7.3 Bulk Flag / Reject

- Opens NotifyPanel pre-filled with the **first selected** timesheet's
  context — caller acknowledges this is "send one email per selection" UX
  is deferred to v3
- Acceptance criterion: opening the panel does not mutate state

### 7.4 Quick Rules

- Three pre-defined rules; each shows live count of matching items
- Click rule → set status `approved`, attribution `Siddharth Kirtikar (Bulk)`
- Bar only renders when `actionableOnly === true` AND any rule has count > 0

---

## 8. Notify-team flow (3rd button)

When ops wants to escalate inconsistencies internally rather than mail
the employee. Routes through `buildTimesheetNotifyTeam` builder.

**Email composition**
- **To:** `hr-ops@buzzworks.com`
- **CC:** employee's `managerEmail` (or `payroll@buzzworks.com` fallback)
- **Subject:** `Timesheet review — <employeeCode>: <main issue>[ (N issues)] · <period>`
- **Body:**
  ```
  Team,

  Timesheet inconsistencies detected and require review:

  Employee: <name> (<code>)
  Client:   <name>
  Period:   <period>
  Hours:    <total>h (incl. <OT>h OT)
  Validation score: <score>

  Issues flagged:
  • <rule> — <detail>
  • ...

  Please confirm whether to approve with exceptions, flag the employee,
  or reject. Ops needs sign-off by EOD to keep payroll on track.

  — This message was written using RIPLEY.
  ```

Inconsistency list = `validationChecks.filter(c => result ∈ {fail, warning})`,
prepended with `flagReason` if set and not already in list.

---

## 9. Pagination & sorting

- Page size: 50
- Sort modes: date (default), score-asc, score-desc, hours, client
- Page state resets on any filter change

---

## 10. Edge cases

| Case                                                           | Handling                                       |
| -------------------------------------------------------------- | ---------------------------------------------- |
| Employee not found in pool (id matches `<client>-emp-<n>` regex) | Generator backfills on demand; row renders with generated employee |
| Employee not found AND id doesn't match regex                  | Row returns null (silently skipped)            |
| `validationChecks` empty                                       | "Manual review required — score below threshold" fallback line in NotifyPanel body |
| `flagReason` is set but already covered by a check             | Don't duplicate in inconsistency list           |
| Filter combination yields 0 rows                               | "No items match current filters" empty state   |
| Bulk Approve with all flagged in selection                     | No-op silently (bulkApprove filter excludes flagged) |
| Drawer open + filter changes hide the active row               | Drawer remains open; row no longer in list     |
| User clicks "Notify team" with empty validationChecks          | NotifyPanel still opens; body shows fallback line |

---

## 11. Telemetry events (proposed for v3 backend)

```
timesheet.row.expanded         { id, status, score }
timesheet.bulk.approved        { count, source: "selection" | "rule:<name>" }
timesheet.action.approve       { id }
timesheet.action.flag          { id }
timesheet.action.reject        { id }
timesheet.notify.opened        { id, kind: "flag" | "reject" | "approve" | "team" }
timesheet.notify.sent          { id, kind, draftEditedChars: number }
timesheet.filter.applied       { filterKey, value }
timesheet.search.typed         { length }
```

---

## 12. Acceptance criteria summary

- AC-1: Default load shows actionable items only (pending/reviewing/flagged), sorted by date desc
- AC-2: Filter combinations apply with AND semantics; clear chip resets all + search
- AC-3: Sticky select-all row appears when filter has ≥1 actionable item
- AC-4: Bulk Approve skips flagged items in the selection
- AC-5: Quick Rules bar only renders when `actionableOnly` AND any rule count > 0
- AC-6: Notify-team button opens NotifyPanel with subject = `<prefix> — <code>: <issue>[ (N issues)] · <period>`
- AC-7: Notify-team body excludes "JARVIS confidence" and any AI/agent attribution in body; RIPLEY footnote present
- AC-8: Drawer Approve sets status=approved with current user attribution + timestamp
- AC-9: Score color thresholds: ≥85 green, 60-84 amber, <60 red
- AC-10: Pagination resets to page 1 on any filter or sort change

---

## 13. Open questions

1. **Audit trail**: every action mutates state in-memory only. Real backend
   needs an action log (who did what, when, on which item, what was the
   pre/post state). Out of scope v2.
2. **Undo**: bulk Approve is destructive in current UI. Add a 5-second
   undo toast in v3.
3. **Send-per-selection**: bulk Flag/Reject only opens panel for first
   selected. Real flow needs to either (a) batch-send N emails or
   (b) show a list-aware composer.
4. **Score recompute**: when a Quick Rule auto-approves, JARVIS validation
   isn't re-run; the existing score is treated as final. OK for v2,
   document for v3.
