# FPRD-06 — Employees & Pay Grade

**Surfaces:**
- `/employees` — list page
- `/employees/[id]` — employee detail page
- (also embedded as `/clients/[id]` Employees tab)

**Primary persona:** Buzzworks Agent Manager (operational queries),
Operations Lead (compensation governance), HR / Payroll team (rate
master)

---

## 1. Scope

The Employees module is the people index. Beyond the obvious
list/detail UX, the central concept is the **9×9 pay grade lattice**
(A1..I9 = 81 grades) that replaced the flat "₹X/hour" rate as the
canonical compensation reference. Pay grade abstracts away rate
mode (hourly / monthly / daily) so HR can speak in a consistent
internal currency while payroll computes the actual rupee figure.

---

## 2. Pay grade lattice — design

### 2.1 Grade format

```
<Band><Step>    e.g.  A1, A9, F4, I9
```

- **Band (A–I, 9 levels)** = seniority tier
- **Step (1–9, 9 levels)** = within-band differentiation
- 9 × 9 = **81 grades**

### 2.2 Band semantics

| Band | Label                         | Tier        | Typical role family                       |
| ---- | ----------------------------- | ----------- | ----------------------------------------- |
| A    | Associate / Frontline         | Entry       | Operations associate, junior dev          |
| B    | Junior Specialist             | Entry       | Junior analyst, support engineer          |
| C    | Specialist                    | Mid         | Analyst, developer                        |
| D    | Senior Specialist             | Mid         | Senior analyst, senior dev                |
| E    | Lead / Senior                 | Mid         | Tech lead, business analyst               |
| F    | Principal                     | Senior      | Principal consultant, architect           |
| G    | Staff / Manager               | Senior      | Engineering manager, ops manager          |
| H    | Senior Manager / Architect    | Leadership  | Senior manager, principal architect       |
| I    | Director / Partner            | Leadership  | Director, partner-level consultant         |

Tiers map down further to `Entry / Mid / Senior / Leadership` for the
detail-page chip.

### 2.3 Step semantics

Step 1 = junior-in-band; step 9 = senior-in-band. Step is **not
strictly monotonic** in compensation across bands (an A9 may earn less
than a B3 depending on rate mode and policy), but within a band, higher
step = higher seniority within that band.

### 2.4 Derivation

`derivePayGradeFields()` in `lib/mock-data.ts`:

```
band  = bracket lookup on ratePerHour:
        <350 A | <450 B | <550 C | <650 D | <750 E | <850 F | <950 G | <1050 H | else I

step  = (|hash(id + role)| % 9) + 1     // deterministic per employee

mode  = "hourly" if role contains "consultant"|"contractor" or jobCategory == "Consulting"
        | "daily"  for half of jobCategory ∈ {Healthcare, Operations, Logistics, Manufacturing}
        | "monthly" otherwise

payRate = ratePerHour                          (hourly)
        | ratePerHour * 8                       (daily)
        | round(ratePerHour * 8 * 22, 100)       (monthly gross, ₹100 rounded)
```

Same employee always resolves to same grade + mode + rate (deterministic).

### 2.5 Pay modes

| Mode    | Display unit | Monthly gross derivation       |
| ------- | ------------ | ------------------------------ |
| hourly  | ₹X/hr        | rate × 8 × 22                  |
| daily   | ₹X/day       | rate × 22                      |
| monthly | ₹X/mo        | rate (already monthly)         |

---

## 3. Employees list (`/employees`)

### 3.1 Information architecture

```
Employees page
├─ Header                  (h1 "Employees" + subtitle "X of Y employees" + Export button)
├─ Filter bar
│  ├─ Client multi-select
│  ├─ Department multi-select        (16 job categories)
│  ├─ Region multi-select             (15 cities)
│  ├─ Status multi-select             (active, notice, ended, on_hold)
│  ├─ Date-range filter               (joined date)
│  ├─ Clear chip
│  ├─ Search                          (right-aligned, name/code/role)
│  └─ Sort selector                   (Name, Rate, Newest, Leave)
└─ Data table
   columns: Employee · Client · Role / Department · Region · Joined · **Pay Grade** · **Leave Balance** · Status
```

### 3.2 Pay Grade column

Renders a pink monospace badge with the grade text:

```
┌────┐
│ E5 │   bg: var(--pink-50), color: var(--pink-700), border: var(--pink-100)
└────┘
```

Replaced the old "₹X/hr" rate column. Rate is now revealed via the
detail drawer / page so the list stays scannable.

### 3.3 Leave Balance column

`<LeaveBar>` mini visual + days-remaining number, colored by remaining
% (>60 green, >25 amber, else red). Shows annual leave only; sick +
casual breakdown is on the detail page.

### 3.4 Sort modes

- Name (default)
- Rate ↓
- Newest (joined date desc)
- Leave (remaining annual desc)

### 3.5 Export

Top-right button — currently no-op placeholder. v3 should wire to
CSV export of the filtered set.

---

## 4. Employee detail

Two surfaces give the same content:
- `/employees/[id]` — full page
- Drawer that opens on row click in `/employees`

### 4.1 Information architecture (detail page)

```
Detail page
├─ Header
│  ├─ "← Employees" breadcrumb
│  ├─ Avatar + Name (h1) + role
│  ├─ Briefcase + dept · MapPin + city · Mail + email · Calendar + tenure
│  └─ Right-side KPI pills (3): Employee code · **Pay Grade** · Leave left
├─ Tab nav                          (4 tabs)
│  Overview | Timesheets | Leave | Risk Profile
└─ Tab content
```

### 4.2 Overview tab

- 4 KPI cards (Total timesheets, Approved, Flagged, Avg validation score)
- Weekly hours bar chart (7 weeks, regular + OT)
- 2-column grid:
  - Monthly Earnings card (YTD)
  - **Pay Grade & Compensation** card (pink-tinted) — band + step
    explainer, pay mode chip, declared rate, monthly gross equivalent
- Employment Details card (code, dept, category, joined, manager)

### 4.3 Pay Grade & Compensation card (canonical layout)

```
┌─────────────────────────────────────────────────────────┐
│ Pay Grade & Compensation              [tier chip]       │
│                                                          │
│  ┌────┐  Band E — Lead / Senior                         │
│  │ E5 │  Band E · Step 5 of 9 · 9×9 lattice (81 grades) │
│  └────┘                                                  │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐                       │
│  │ PAY MODE    │  │ DECLARED    │                       │
│  │ Monthly     │  │ ₹130,400/mo │                       │
│  └─────────────┘  └─────────────┘                       │
│                                                          │
│  ┌──────────────────────────────────────────────┐       │
│  │ MONTHLY GROSS EQUIVALENT                      │      │
│  │ ₹130,400                                      │       │
│  │ Direct monthly gross before statutory deductions │   │
│  └──────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

The "monthly gross equivalent" assumption text changes per mode:
- hourly  → "Assumes 8 hr × 22 days"
- daily   → "Assumes 22 billable days"
- monthly → "Direct monthly gross before statutory deductions"

### 4.4 Timesheets tab

Filtered list of `timesheets.filter(t => t.employeeId === emp.id)`.
Same row pattern as global Inbox, with "Open in inbox" eye icon.

### 4.5 Leave tab

3 leave types (Annual, Sick, Casual) each rendered as a card:
- Type label + remaining/total + bar showing used %
- 4 sample upcoming/recent dates (placeholder; real data v3)

### 4.6 Risk Profile tab

Composite risk score from validation history:
- avg validation score, flagged %, OT pattern, no-show count
- Risk level chip (low / medium / high)
- 3 contributing factors with explanations

(In current implementation this tab is partially mocked; flagged for
v3 real-data hookup.)

---

## 5. Per-client Employees tab

Same column set as the global page. Re-uses `clients/[id]/page.tsx`'s
inline `EmployeesTab` component (not the same component as `/employees`,
but column-parity). Future v3 should consolidate to single component.

---

## 6. Data model

```ts
interface Employee {
  id: string                         // "emp001" or "<clientId>-emp-<n>"
  employeeCode: string                // "<CLIENT>0001"
  name: string
  email: string
  phone?: string
  clientId: string                    // 11 valid ids
  role: string
  jobCategory: JobCategory            // 16 enum
  department: string
  city: string                        // 1 of 15
  startDate: string
  endDate?: string
  ratePerHour: number                 // base rate, ₹/hr equivalent
  payGrade: PayGrade                  // A1..I9 derived
  payMode: PayMode                    // "hourly" | "monthly" | "daily" derived
  payRate: number                     // canonical figure for the mode
  leaveBalance: LeaveBalance          // annual/sick/casual + used
  managerEmail?: string
  managerName?: string
  employmentStatus: EmploymentStatus  // active/notice/ended/on_hold
  avatarColor: string
}
```

15 seeded employees (emp001..emp015) cover the 11 clients. Generator
backfills up to 80 per client on demand for the list/pool.

---

## 7. Edge cases

| Case                                                            | Handling                                       |
| --------------------------------------------------------------- | ---------------------------------------------- |
| Generator-only employee (id like `acc-emp-7`) clicked from list  | Detail page resolves via `getEmployeeFromPool` regex; renders generated employee |
| Pay mode with role that doesn't fit any rule                     | Defaults to "monthly"                           |
| Rate < 350 → band A                                              | Step still derived from hash                    |
| `manager*` fields missing                                        | "Not assigned" displayed                        |
| Filter: active=on + notice=on + ended=on + on_hold=on            | Same as no status filter                        |
| Search matches employeeCode (case-insensitive) → row matches      | Yes                                             |
| Date range with from > to                                        | Returns 0 rows (treated as invalid range)       |

---

## 8. Telemetry events (proposed)

```
employees.list.viewed                  { count, filtersApplied }
employees.row.clicked                  { id, source: "list" | "client-tab" }
employees.detail.viewed                { id, tab: "Overview" }
employees.detail.tab.changed           { id, from, to }
employees.export.clicked               { count }
```

---

## 9. Acceptance criteria summary

### List
- AC-1: Pay Grade column renders pink monospace badge (replaces old Rate column)
- AC-2: Leave Balance column renders bar + days-remaining (renamed from "Leave")
- AC-3: 4 sort modes work; default Name asc
- AC-4: 5 filter dropdowns + date range work and combine with AND
- AC-5: Search matches name OR code OR role (case-insensitive)
- AC-6: Pagination — page size 50, resets on filter change

### Detail
- AC-7: Pay Grade pill in KPI row uses pink-700 color
- AC-8: Pay Grade & Compensation card renders band label, step "of 9", mode, declared rate, monthly gross
- AC-9: Mode-specific assumption text per §4.3 mapping
- AC-10: 4 tabs render: Overview · Timesheets · Leave · Risk Profile
- AC-11: Generator-resolved employees render the same as seeded ones

---

## 10. Open questions

1. Rate-master sync: today the rate is mocked. Real flow needs sync
   from the client's HR system (the actual source of truth on band/step).
2. Pay grade taxonomy is internal to Buzzworks and should be configurable
   per-client (some clients use L1..L8 instead). v3 with config table.
3. Leave balance "remaining" assumes calendar-year reset; needs hookup
   to client's leave policy (April-March vs. Jan-Dec).
4. Risk Profile tab is partially mocked; needs real time-series of
   flag/no-show events to compute properly.
5. Export to CSV is a placeholder; should respect current filters.
