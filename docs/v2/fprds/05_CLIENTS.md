# FPRD-05 — Clients (list + detail)

**Surfaces:**
- `/clients` — list page
- `/clients/[id]` — detail page (7 tabs)

**Primary persona:** Buzzworks Agent Manager (per-client deep work),
Account Manager (relationship view), Operations Lead (account health
glance)

---

## 1. Scope

The 11 managed-workforce clients are the central organising entity in
the product. Almost every other surface has a per-client cut. This FPRD
covers the list page (entry point) and the detail page (the per-client
control room).

The current 11 clients are real BD accounts with the
portal/manual classification given in BRD §3 / mock-data §clients.

---

## 2. Clients list (`/clients`)

### 2.1 Information architecture

```
Clients page
├─ Header                 (h1 "Clients" + subtitle "X active · Y employees")
├─ Filter bar
│  ├─ Industry multi-select        (11 industry options)
│  ├─ Region multi-select           (state-based)
│  ├─ Source multi-select           (Fieldglass | BeeLine | Manual (no portal))
│  ├─ Sort selector                  (Employees | Payroll | Compliance | Name)
│  ├─ Clear chip                     (when ≥1 filter)
│  ├─ Search                         (right-aligned, name/code/city/state)
│  └─ Result count                   ("X of Y" right of search)
└─ Card grid (1 / 2 / 3 cols)
   └─ ClientCard × N
```

### 2.2 ClientCard composition

Border-left 3px in client.color. Inside:

```
[Header row]
  Avatar tile (3 letters from code, color-tinted)
  ┌ Name (text-[14px] bold)
  └ Code · Industry chip
  ┌ Status chip                 ("active" or "inactive")
  └ Action count chip           (Bell + N when actionable compliances > 0)

[Stats grid 2×2]
  Active employees / Total employees     (Users)
  Pending timesheets OR "All clear"      (Clock or CheckCircle2)
  Monthly payroll                        (TrendingUp)
  Source / Manual chip                   (Globe or Mail)

[Compliance bar]
  "Compliance score" label + segmented bar + N% (color thresholded)

[Footer row]
  City · Policy version
  "View →" CTA
```

### 2.3 Method/Portal chip

```
if client.timesheetMethod === "manual"  → Mail icon + "Manual" (lavender)
elif client.portalId                    → Globe icon + portal.shortName (portal color)
else                                    → null
```

### 2.4 Compliance score color thresholds

```
score ≥ 90 → var(--accent) (good)
score ≥ 75 → #c89060 (warn)
score < 75 → #c07070 (bad)
```

### 2.5 Action count badge

```
actionCount = getActionCountForClient(client.name)
visible if > 0
clicking → navigates to /compliance (filtered to client) — v3 deep link
```

---

## 3. Client detail (`/clients/[id]`)

### 3.1 Information architecture

```
Client detail page
├─ Header
│  ├─ "← Clients" breadcrumb
│  ├─ Avatar tile (3 letters)
│  ├─ Name (h1)
│  ├─ Industry chip
│  ├─ Method/portal chip                (Manual or portal)
│  ├─ "<city>, <state> · Policy <version> · AM: <name>" meta line
│  └─ Right-side KPI pills (4): Active employees, Pending TS, Monthly payroll, Compliance score
├─ Tab nav                              (7 tabs)
│  Overview | Timesheets | Employees | Onboarding | Policy | Compliance | Payroll
└─ Tab content
```

### 3.2 Tabs

#### Overview
CFO-style view: monthly revenue (~20% of monthly payroll, the staffing
margin), monthly ops cost (formula based on pending TS + active employees),
ops cost % of revenue, agent coverage average. Two charts:
- Revenue & Ops Cost Efficiency (composed: bars + line)
- Agent Coverage by Work Stream (5 work types: timesheet validation,
  compliance tracking, policy checks, payroll processing, communications)

#### Timesheets
Filtered timesheet list scoped to this client. Filter bar at top
(Status / Source / Approver). Table format with employee, period,
hours, source chip, score, approved-by, status, eye-icon to open in
the global Inbox.

#### Employees
Filtered employee list scoped to this client. Department / Status /
Search filters. Same column set as global Employees page (Name, Role,
Department, City, **Pay Grade**, **Leave Balance**, Status).

#### Onboarding
Re-mounts the global `OnboardingInbox` component with `clientId={client.id}`
prop. Hides the Client filter from that inbox.

#### Policy
Lists `getClientPolicyRules(clientId)`. Each rule shows:
- Category chip + Severity chip on the left rail
- Rule name + AI badge if AI-generated + enabled-state dot
- Description
- `if (...) → action` mono-styled trigger line
- Usage stats (applied count, trigger count, created-by)

If no rules: empty state with "Open Policy Engine" CTA → `/policy`.

#### Compliance
- 3 KPI cards (Total regs · Action required · High legal risk)
- **Stakeholder strip**: AM name, client contact, CC line — pre-resolved
  via `getClientContacts(client)`
- Per-regulation card with category/risk chips, action-required chip,
  title, authority+effective date, summary, **action row**:
  - Notify team (primary) — opens NotifyPanel `client-compliance` kind
  - Full article (ghost) → `/compliance/[id]`
  - External source link

#### Payroll
List of `getClientPayrollBatches(clientId)`:
- Period header
- Status chip (draft / pending_approval / approved / processed / on_hold)
- Hold count badge
- 3 stats (Timesheets, Total hours, Amount)
- Action button (Approve when pending; Review when draft)

---

## 4. `getClientContacts(client)` resolver

```ts
{
  amName:          client.accountManager,
  amEmail:         "<slug>@buzzworks.com",          // first.last from AM name
  clientContact:   { name, email },                  // deterministic pick from CONTACT_POOL
  buzzworksCc:     "compliance-ops@buzzworks.com",
  clientCc:        "compliance@<client-domain>",
}
```

Same client always resolves to same contact (hash on client.id selects
from CONTACT_POOL of 7 names). Domain comes from `clientEmailDomain()`
in mock-generator.

---

## 5. NotifyPanel integration: `client-compliance` kind

```
To:      <clientContact.email>, <amEmail>
CC:      <buzzworksCc>, <clientCc>
Subject: <client name> · action required: <reg.title (50 chars)>
Body:
  Hi <contact first name> (cc <AM first name>),

  Flagging a new <authority> notification that affects <client>:

  "<title>"
  Region: <region> · Effective <date> · Ref: <reference>
  Penalty exposure if not actioned: <penalty>

  Summary:
  <reg.summary>

  Please review and confirm the action plan on your side. Happy to set
  up a call with our compliance team if you need help mapping this to
  your operational rollout. Copying <AM name> (Buzzworks AM), Buzzworks
  compliance ops, and your compliance lead for awareness.

  Thanks,
  — RIPLEY on behalf of Buzzworks Ops
```

This is the only NotifyPanel kind addressed to *external* people on the
To: line.

---

## 6. The 11 clients (current managed-workforce roster)

| id  | Name                                                       | Industry      | City      | State       | EmpCount | TimesheetMethod | Portal     |
| --- | ---------------------------------------------------------- | ------------- | --------- | ----------- | -------- | --------------- | ---------- |
| cap | Capgemini Technology Services India Ltd.                   | IT Services   | Mumbai    | Maharashtra | 8500     | portal          | Fieldglass |
| lmt | LTIMindtree Ltd.                                           | IT Services   | Mumbai    | Maharashtra | 4800     | manual          | —          |
| acc | Accenture Limited                                          | Consulting    | Bangalore | Karnataka   | 12000    | portal          | BeeLine    |
| hex | Hexaware Technologies Ltd.                                 | IT Services   | Mumbai    | Maharashtra | 3200     | manual          | —          |
| vir | Virtusa Consulting Services Pvt. Ltd.                      | IT Services   | Hyderabad | Telangana   | 2800     | manual          | —          |
| cts | Cognizant Technology Solutions India Pvt. Ltd.             | IT Services   | Chennai   | Tamil Nadu  | 9500     | manual          | —          |
| pwc | PwC India                                                  | Consulting    | Mumbai    | Maharashtra | 2400     | portal          | BeeLine    |
| aoc | Amphenol Omniconnect India Pvt. Ltd.                       | Manufacturing | Bangalore | Karnataka   | 680      | manual          | —          |
| bct | Bahwan Cybertek Pvt. Ltd.                                  | IT Services   | Chennai   | Tamil Nadu  | 520      | manual          | —          |
| wno | Winomechanic Pvt. Ltd.                                     | Engineering   | Pune      | Maharashtra | 220      | manual          | —          |
| hmh | HMH Technology Private Limited                             | IT Services   | Pune      | Maharashtra | 310      | manual          | —          |

Total managed headcount ~45,000.
Source of truth: `lib/mock-data.ts` `clients` array.

---

## 7. Edge cases

| Case                                                            | Handling                                       |
| --------------------------------------------------------------- | ---------------------------------------------- |
| Client has no `accountManager` set                              | Stakeholder strip degrades; AM line shows "Not assigned" |
| Client has 0 policies                                           | Policy tab empty state with CTA to `/policy`   |
| Client has 0 actionable compliances                             | Compliance tab still renders KPIs (zeros) + empty list |
| Client has 0 onboarding issues                                  | Onboarding tab shows OnboardingInbox empty state |
| Client domain not in `clientEmailDomain` map                    | Falls back to `<clientId>.in`                   |
| URL `/clients/<unknown>`                                        | "Client not found" with link back to `/clients` |

---

## 8. Telemetry events (proposed)

```
clients.list.viewed                     { count, filtersApplied }
clients.card.clicked                    { id }
clients.detail.viewed                   { id, tab: "Overview" }
clients.detail.tab.changed              { id, from, to }
clients.compliance.notify.opened        { id, regulationId }
clients.compliance.notify.sent          { id, regulationId }
```

---

## 9. Acceptance criteria summary

### Clients list
- AC-1: Cards render in 1/2/3-col responsive grid
- AC-2: Filter dropdown for Source includes Fieldglass, BeeLine, Manual (no portal)
- AC-3: Manual clients show Mail icon + "Manual" chip
- AC-4: Action count chip is a click target → routes to /compliance
- AC-5: Compliance bar color thresholds: ≥90 green, ≥75 amber, else red

### Clients detail
- AC-6: 7 tabs render in the order: Overview · Timesheets · Employees · Onboarding · Policy · Compliance · Payroll
- AC-7: Header shows Manual or portal chip per timesheetMethod
- AC-8: KPI pills show 4 stats; pendingTimesheets uses warn color when > 0
- AC-9: Compliance tab shows stakeholder strip with AM, client contact, both CCs
- AC-10: Each compliance card has "Notify team", "Full article", and external source link buttons
- AC-11: NotifyPanel for client-compliance kind addresses To: clientContact + AM, CC: both compliance lines
- AC-12: Onboarding tab is the OnboardingInbox component scoped to client (Client filter hidden)

---

## 10. Open questions

1. AM/Client contact email addresses are synthesised. Real CRM
   integration needed for v3.
2. Cross-tab persistence (e.g. open Compliance tab, navigate away,
   come back → resumes on same tab). v3 with URL state.
3. "Notify team" on compliance from the per-client view should be the
   default flow (not the generic ops-lead@buzzworks template). Already
   built; document this as the canonical client-facing path.
4. Per-client cycle-frequency config (some clients run weekly payroll,
   some monthly) → affects Payroll tab grouping.
