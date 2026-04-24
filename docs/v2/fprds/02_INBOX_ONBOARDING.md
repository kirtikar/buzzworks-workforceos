# FPRD-02 — Inbox · Onboarding

**Surface:** `/timesheets` → Onboarding sub-tab
**Component:** `components/OnboardingInbox.tsx` (also re-mounted as a
client-scoped tab on `/clients/[id]`)
**Primary persona:** Buzzworks Agent Manager
**Primary agent:** CASE (with LEXI policy guidance)

---

## 1. Scope

Buzzworks ops works ~260 active onboarding cases across 11 clients at any
moment. Most fail on document hygiene and field reconciliation rather than
candidate quality. This inbox surfaces every blocker by stage and severity,
attached to the candidate, the client, the docs, and the AI suggestion.

Re-used inside the per-client Onboarding tab — same component, just passed
a `clientId` prop to filter.

---

## 2. Information architecture

```
Onboarding sub-tab
├─ Filter bar
│  ├─ Stage multi-select         (5 stages)
│  ├─ Issue type multi-select    (12 types)
│  ├─ Severity multi-select      (high, medium, low)
│  ├─ Client multi-select         (only when not client-scoped)
│  ├─ Clear chip
│  ├─ Search                     (right-aligned, by candidate / code / type / client)
│  └─ Sort selector              (Oldest first | Newest first | Highest severity | Client name)
├─ Stats strip
│  ├─ Total issues count
│  ├─ High severity count
│  └─ Aging count (≥ 7d old)
├─ Bulk action bar               (when ≥1 selected)
│  ├─ "N selected"
│  ├─ Mark resolved
│  ├─ Notify team                 (uses first selected as template)
│  └─ Clear
├─ Sticky select-all row         (when ≥1 row visible)
└─ List
   └─ Row × N (compact)
      ├─ Selection checkbox
      ├─ Stage dot
      ├─ Client chip
      ├─ Candidate name + issue type
      ├─ Stage label chip
      ├─ Severity label chip
      ├─ Age label             (Today / Yesterday / Nd ago / Nw ago)
      └─ Expand caret
```

When expanded inline (no drawer), 3-column grid:

- 2/3: stage chip + meta + issue title + bulleted findings + document chips
- 1/3: Recommended action card + AI suggests card

Action row at the bottom of the expanded section:
- Mark resolved (primary)
- Notify team (ghost)
- Request document (ghost) → opens NotifyPanel with `document-request` template
- Right-aligned timestamp meta

---

## 3. The 12 issue types

| Type                                              | Stage           | Severity | Recommended action                                   | AI suggests                                    |
| ------------------------------------------------- | --------------- | -------- | ---------------------------------------------------- | ---------------------------------------------- |
| Aadhaar–form name mismatch                        | reconciliation  | high     | Request corrected Aadhaar or updated form            | Trigger name correction workflow               |
| PAN verification failure                          | verification    | high     | Raise re-verification with NSDL provider             | Request fresh PAN copy from candidate          |
| DOB mismatch (PAN vs Aadhaar)                     | reconciliation  | high     | Collect corrected PAN or Aadhaar                     | Ask for corrected ID + affidavit               |
| Address proof conflict                            | reconciliation  | medium   | Request latest utility bill or updated Aadhaar       | Accept rental agreement with notarisation      |
| Bank proof missing                                | doc-collection  | medium   | Chase candidate for bank proof                       | Send auto-reminder with portal upload link     |
| Education certificate pending                     | doc-collection  | low      | Send reminder; defer final onboarding if needed      | Allow provisional onboarding with 30-day SLA   |
| Previous employer relieving letter missing        | doc-collection  | medium   | Follow up with candidate; cross-check via BGV        | Proceed with BGV agency verification in parallel |
| Background verification pending                   | verification    | medium   | Escalate to BGV vendor for SLA breach                | Nudge BGV vendor; reset SLA                    |
| Medical fitness test pending                      | compliance      | low      | Book clinic appointment; defer joining if needed     | Auto-book nearest empanelled clinic            |
| ESIC enrollment pending                           | compliance      | medium   | Complete ESIC registration within 10 days            | Push declaration via portal; attach Aadhaar    |
| EPF UAN mismatch                                  | reconciliation  | high     | Ask candidate to correct UAN via UAN portal          | Raise EPFO grievance if candidate cannot self-fix |
| Client policy acknowledgement missing             | validation      | low      | Resend policy pack; nudge candidate                  | Send DocuSign pack with 48h deadline           |

---

## 4. Stages (5)

| Stage          | Color   | Background           | Description                                                              |
| -------------- | ------- | -------------------- | ------------------------------------------------------------------------ |
| doc-collection | #6366F1 | rgba(99,102,241,.10) | Waiting for candidate to upload docs                                     |
| verification   | #2563EB | rgba(37,99,235,.10)  | External vendor / API check in progress (NSDL, BGV)                      |
| validation     | #0EA5E9 | rgba(14,165,233,.10) | Buzzworks ops checking docs against form data                            |
| reconciliation | #C2185B | rgba(194,24,91,.10)  | Field mismatch across docs needs candidate correction                    |
| compliance     | #F59E0B | rgba(245,158,11,.10) | Statutory enrollment / regulatory step pending                           |

---

## 5. Data model

```ts
interface OnboardingIssue {
  id: string                         // "onb-1" .. "onb-260"
  candidateName: string
  candidateCode: string              // "<CLIENT>C0001"
  clientId: string                   // 11 valid ids
  clientName: string
  clientColor: string                // for chip
  role: string
  issueType: string                  // 1 of 12
  stage: OnboardingStage             // 1 of 5
  severity: OnboardingSeverity       // high | medium | low
  aiSuggestion: string
  documents: string[]                // chips
  inconsistencies: string[]          // bullet lines in expanded view
  recommendedAction: string
  createdAt: string
  ageDays: number                    // 0..14
  joiningDate: string
  location: string
}
```

All 260 issues generated deterministically via mulberry32 PRNG seeded
with `20260424`. Same render every load.

---

## 6. NotifyPanel integrations

### 6.1 Notify team (`onboarding-issue` kind)

```
To:      onboarding-ops@buzzworks.com
CC:      hr-ops@buzzworks.com
Subject: Onboarding blocker — <candidate> · <issue type>
Body:
  Team,

  Onboarding validation issue detected for a new candidate:

  Candidate: <name>
  Client:    <name>
  Issue type: <type>
  Documents: <doc1, doc2, doc3>

  Findings:
  • <inconsistency 1>
  • <inconsistency 2>
  • ...

  Onboarding is blocked until this is resolved. Please reconcile the
  flagged fields or request updated documents. Target resolution: 48 hours.

  — This message was written using RIPLEY.
```

### 6.2 Request document (`document-request` kind)

```
To:      <candidateCode>@candidate.in   (synthetic; real form will hold candidate email)
CC:      manager (when known)
Subject: Document update required — <docType>
Body:
  Hi <first name>,

  We need an updated copy of your <docType> on file for <client>.

  Reason: <first inconsistency>

  Please upload a valid copy via the employee portal within 3 business
  days. Reply to this email if you need support or clarification.

  Thanks,
  Buzzworks Ops

  — This message was written using RIPLEY.
```

`docType = issue.documents[0]`. Future v3: let user pick which doc to
request from a select.

---

## 7. Per-client view (Onboarding tab on `/clients/[id]`)

- Component re-mounted with `clientId={client.id}` prop
- Hides the Client filter from the filter bar (already scoped)
- All other filters/sort/search remain
- Header is replaced by the parent client page header

---

## 8. States

### 8.1 Age coloring

- `age < 3` → `var(--text-3)` neutral
- `3 ≤ age < 7` → `var(--warn)` amber
- `age ≥ 7` → `var(--danger)` red

### 8.2 Severity chip colors

| Severity | Color           | Background        |
| -------- | --------------- | ----------------- |
| high     | var(--danger)   | var(--danger-bg)  |
| medium   | var(--warn)     | var(--warn-bg)    |
| low      | var(--text-2)   | var(--surface-2)  |

---

## 9. Edge cases

| Case                                                           | Handling                                       |
| -------------------------------------------------------------- | ---------------------------------------------- |
| Empty inconsistencies array                                    | Fallback line "See candidate file for details" |
| Empty documents array                                          | Document chip row not rendered                  |
| Filter yields 0 rows                                           | "No onboarding issues match the filters" empty state |
| Bulk Notify with all selected having different issue types     | Uses first selected only (v2 limitation)       |
| Inside per-client tab with 0 issues                            | Empty state copy adjusts ("No onboarding blockers for this client") |

---

## 10. Telemetry events (proposed)

```
onboarding.row.expanded         { id, stage, severity }
onboarding.action.resolved      { id }
onboarding.notify.opened        { id, kind: "team" | "doc-request" }
onboarding.notify.sent          { id, kind }
onboarding.filter.applied       { key, value }
```

---

## 11. Acceptance criteria summary

- AC-1: Default sort = age-desc (oldest first)
- AC-2: All 5 filters work independently and combine with AND
- AC-3: Stats strip shows live counts that respect current filters
- AC-4: Bulk Notify uses first selected as template (call out as v2 limitation)
- AC-5: Stage colors + severity colors match table in §4 / §8.2
- AC-6: Inside per-client view, the Client filter is not rendered
- AC-7: NotifyPanel for `onboarding-issue` routes to onboarding-ops + hr-ops
- AC-8: Document request opens with subject `Document update required — <docType>`
- AC-9: Age label format: Today / Yesterday / Nd ago / Nw ago

---

## 12. Open questions

1. Real candidate emails: in v2 we synthesise `<code>@candidate.in`. Real
   flow needs the application form to capture candidate email.
2. Mark-resolved is local state only. Backend needs to update the
   onboarding tracker and trigger the next workflow step.
3. v3: per-client SLA targets (some clients allow 7-day BGV, others 3).
4. v3: bulk Notify should batch into one email per recipient set, not
   one per selected item.
