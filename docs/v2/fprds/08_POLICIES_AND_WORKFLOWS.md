# FPRD-08 — Policies & Workflows

**Surface:** `/policy`
**Primary persona:** Compliance Lead (defines policies),
Buzzworks Agent Manager (consumes policies via JARVIS at runtime)
**Primary agent:** LEXI (compiles policies into machine-checkable rules)

---

## 1. Scope

The Policies module is the operating manual that LEXI parses and JARVIS
executes. The shipped library has **23 policies** classified across:

- **7 workflow subfunctions** (the orthogonal "what business process
  does this rule govern" axis)
- **6 categories** (the older "what kind of rule" axis: hours, overtime,
  leave, attendance, payroll, compliance)
- **3 severity levels** (info, warning, violation)

A policy can be at the same time `workflow=onboarding`,
`category=payroll`, `severity=violation` — e.g. "bank details must
exist before first payroll runs".

The page presents policies grouped by workflow rather than category
because the workflow axis maps more directly to user mental models
("show me all the rules that affect onboarding").

---

## 2. Information architecture

```
Policies page
├─ Header
│  ├─ h1 "Policies" + subtitle ("X rules across 7 workflows · Y active")
│  └─ Right action: "+ Add policy rule"        (opens AIPolicyCreator)
│
├─ Top tabs
│  ├─ All policies      (default; global pool, all clients)
│  └─ By client         (scopes to one client at a time)
│
├─ Client picker rail   (only in By client mode)
│  └─ horizontal chip rail with all 11 clients + per-client rule count
│
├─ Filter bar
│  ├─ Workflow multi-select        (7 workflows)
│  ├─ Category multi-select         (6 categories)
│  ├─ Severity multi-select         (3 levels)
│  ├─ Client multi-select           (only in All policies mode)
│  ├─ Enabled-only toggle
│  ├─ Search                        (right-aligned, name/desc/trigger)
│  └─ Clear chip
│
├─ Stats strip
│  └─ rules · active · applications · triggers   (+ active client name in By client mode)
│
└─ Body                            (max-w-5xl, py-6, space-y-6)
   └─ Workflow section × N         (rendered in WORKFLOWS order, hidden if 0 rules)
      ├─ Section header
      │  ├─ Workflow icon tile + label + count chip
      │  └─ One-line description of what this subfunction handles
      └─ RuleCard × N
```

---

## 3. The 7 workflow subfunctions

| Workflow              | Color   | One-line description                                                                       |
| --------------------- | ------- | ------------------------------------------------------------------------------------------ |
| timesheet-validation  | #2563EB | Rules that run when a timesheet is submitted — hours, overtime, attendance, daily caps    |
| onboarding            | #6366F1 | Rules for new-joiner completeness — KYC, bank details, documents, first-cycle readiness   |
| leave-attendance      | #0EA5E9 | Rules for leave applications, approvals, sandwich leave, carry-forward, LOP recon         |
| payroll               | #10B981 | Rules that gate a payroll run — computations, statutory deductions, bonus, disbursement   |
| compliance            | #F59E0B | Rules for EPF/ESIC/PT/LWF, contract term, statutory filings, workplace safety              |
| exit                  | #C2185B | Rules for offboarding, notice period, contract expiry, asset recovery                      |
| fnf                   | #B76E79 | Rules for full and final settlement — leave encashment, gratuity, recoverables, clearance |

Order in nav and grouped sections: timesheet-validation → onboarding →
leave-attendance → payroll → compliance → exit → fnf (chronological
employee lifecycle).

---

## 4. RuleCard composition

```
┌────────────────────────────────────────────────────────────────┐
│ [icon tile]   Name      [Severity chip] [Category chip] [Client chip] [AI chip if AI-generated] │
│               Description (text-[12px], leading-relaxed)        │
│               ┌─────────────────────────────────────┐           │
│               │ if (triggerCondition) → action       │  mono     │
│               └─────────────────────────────────────┘           │
│               Applied N×  ·  Triggered N× ·  by createdBy ·  date │
│                                          [Enabled / Disabled toggle pill] │
└────────────────────────────────────────────────────────────────┘
```

Border-left 3px in category color when enabled; neutral when disabled.
Card opacity 60% when disabled.

### 4.1 Enabled / Disabled toggle

Right-side labelled pill (not a tiny icon-only toggle):
- Enabled: `<ToggleRight>` + "Enabled", colored by category color, light tinted bg
- Disabled: `<ToggleLeft>` + "Disabled", neutral surface-2 bg

---

## 5. AI Policy Creator modal

Triggered by header "+ Add policy rule" button.

### 5.1 Stages

```
input → thinking → preview → saved
```

### 5.2 Input stage
- Textarea: "Describe the policy rule" (3-row, plain English)
- Quick suggestions chip rail (6 suggestions to seed)
- Primary CTA: "Generate rule"

### 5.3 Thinking stage
- Spinner + "Analysing policy intent…"
- 1.2-second simulated latency

### 5.4 Preview stage
- Pink-tinted preview card showing:
  - Category chip (inferred from keywords)
  - Severity chip (inferred from "must / require / cannot")
  - "AI" badge
  - Editable Rule name input
  - Mono-styled `if (...) → action` line (read-only)
- Warn-box reminder: "Review before saving. Ops can refine the trigger after save."
- Two CTAs: "Edit prompt" | "Save rule"

### 5.5 Saved stage
- Big checkmark + "Rule saved" text
- Auto-closes after 800ms

### 5.6 Inference logic (`parseAIRule`)

Category:
- contains "overtime" or "ot" → overtime
- contains "leave" or "absence" → leave
- contains "hour" → hours
- contains "attendance" or "present" → attendance
- contains "payroll" or "salary" → payroll
- else → compliance

Severity:
- contains "cannot" or "prohibited" or "must not" → violation
- contains "require" or "must" → warning
- else → info

Trigger condition:
- Pulls first number from input
- Per-category template: `dailyOT > N`, `monthlyHours < N || > N`, `sickLeaveDays > N`
- Falls back to `custom_condition`

Workflow: derived via `deriveWorkflow()` AFTER save (looks at full
rule text), so it lands in the right section of the list immediately.

---

## 6. Client picker (By client mode)

Horizontal scrolling chip rail under the header. Each chip:
- Coloured dot (client.color)
- Client name
- Rule count for that client (`· N`)
- Active state: tinted background + colored border
- Inactive state: surface bg + border

Selecting a client filters the body to that client's rules. The Client
filter dropdown in the filter bar hides in this mode (already scoped).

---

## 7. Workflow inference (`deriveWorkflow`)

Used for any rule that doesn't have an explicit workflow set, plus all
new AI-created rules. Inspects `name + description + triggerCondition +
actionOnTrigger` text, lower-cased, and routes:

```
contains "fnf" / "full and final" / "gratuity" / "leave encashment"
  → fnf
contains "exit" / "offboard" / "notice period" / "contract_end" / "separation"
  → exit
contains "onboard" / "joining" / "kyc" / "aadhaar" / "pan " / ("bank" with "ifsc"|"proof") / "uan"
  → onboarding
category === "payroll" OR contains "payroll" / "salary hold" / "bonus" / "tds" / "disbursement"
  → payroll
category === "leave" OR contains "leave" / "sandwich" / "lop" / "attendance"
  → leave-attendance
category === "compliance" OR contains "epf" / "esic" / "statutory" / "compliance" / "pt " / "lwf"
  → compliance
default
  → timesheet-validation
```

This runs at module load time on every rule and is also exported for
new-rule classification.

---

## 8. Data model

```ts
interface PolicyRule {
  id: string                          // "pol001" .. "pol-fnf-002"
  clientId: string                    // 11 valid ids
  category: PolicyRuleCategory         // 6
  workflow?: PolicyWorkflow            // 7, derived
  name: string
  description: string
  triggerCondition: string             // pseudo-code string, e.g. "dailyOT > 3"
  actionOnTrigger: string              // human-readable consequence
  severity: PolicySeverity             // info | warning | violation
  enabled: boolean
  createdAt: string
  updatedAt: string
  createdBy: "ai" | "ops" | "system"
  aiGenerated: boolean
  appliedCount: number                 // hits this month
  triggerCount: number                 // actual trigger fires (subset of applied)
}
```

23 seeded rules.

---

## 9. Stats strip metrics

- **rules**: filtered.length (count after all filters applied)
- **active**: count where `enabled === true` in filtered set
- **applications**: sum(appliedCount) in filtered set
- **triggers**: sum(triggerCount) in filtered set
- **client meta** (By client mode only): client name + policy version
  pinned to the right

---

## 10. Edge cases

| Case                                                            | Handling                                       |
| --------------------------------------------------------------- | ---------------------------------------------- |
| 0 rules in workflow section                                      | Section hides entirely                         |
| 0 rules total after filters                                      | "No policy rules match the current filters" empty state |
| AI-generated rule with no recognised keyword                     | Falls to category=compliance, severity=info, workflow=timesheet-validation |
| Toggling enabled state                                            | Local state only; no backend persist          |
| Mode = "By client" but client has 0 rules                         | All workflow sections hide; empty state shows |
| AI Creator save with 0 input                                      | Save button disabled when input is empty      |

---

## 11. Telemetry events (proposed)

```
policy.list.viewed              { mode: "all" | "client", clientId?, count }
policy.mode.changed             { from, to }
policy.client.changed           { id }
policy.filter.applied           { key, value }
policy.rule.toggled             { id, enabled: bool }
policy.creator.opened           {}
policy.creator.generated        { categoryInferred, severityInferred }
policy.creator.saved            { id, workflowDerived }
policy.creator.cancelled        { stage: "input" | "preview" }
```

---

## 12. Acceptance criteria summary

- AC-1: Header includes "+ Add policy rule" CTA opening AIPolicyCreator
- AC-2: Two top tabs: All policies / By client; persists current filters across switch
- AC-3: In By-client mode, horizontal client rail under header; Client filter hidden
- AC-4: Filter bar: Workflow + Category + Severity + Client (All-mode only) + Enabled-only + Search + Clear
- AC-5: Stats strip: rules · active · applications · triggers (+ client name in By-client)
- AC-6: Body groups rules by workflow in WORKFLOWS order; section header shows icon + label + count + description
- AC-7: RuleCard left-border color matches category; opacity 60% when disabled
- AC-8: Enable/Disable is a labelled pill (not tiny icon), category-tinted when enabled
- AC-9: AI creator inference: category from keywords, severity from "must/cannot", trigger from numeric
- AC-10: Saved rule lands in correct workflow section based on `deriveWorkflow`

---

## 13. Open questions

1. Real LEXI: today the "AI" parsing is regex-based. v3 needs actual
   LLM call with structured-output (JSON schema) for category, severity,
   trigger expression, workflow.
2. Trigger expression compilation: the `if (X) → Y` is a string. JARVIS
   needs an actual evaluable expression. v3 needs a small DSL or JSON
   AST.
3. Conflict detection: two rules with overlapping triggers should be
   surfaced. v3.
4. Per-rule audit trail: who edited it, when, what changed. v3 with
   backend.
5. Bulk toggle (enable/disable all in a workflow). v3.
6. Import policies from PDF / DOC contract. The "LEXI reads policies
   in plain English" pitch needs this end-to-end. v3.
