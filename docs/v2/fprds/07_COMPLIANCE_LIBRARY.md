# FPRD-07 — Compliance Library

**Surfaces:**
- `/compliance` — list page (503 regulations, paginated)
- `/compliance/[id]` — per-regulation editorial detail page

**Primary persona:** Compliance Lead (research / browse), Buzzworks
Agent Manager (action triage from inbox view), Account Manager
(client-facing share)
**Primary agent:** ORACLE

---

## 1. Scope

The library is the read-mostly research view that complements the
action-oriented Compliance Inbox (FPRD-04). It holds **503 regulations**
(10 hand-curated featured + 493 scraped from TeamLease RegTech and
re-pointed to official government sources) covering 7 categories,
10 impact areas, 32 regions, and 24 authorities.

Every regulation has a deep-link detail page in editorial layout
suitable for sharing internally or quoting in client comms.

---

## 2. Library list (`/compliance`)

### 2.1 Information architecture

```
Compliance page
├─ Header                              (h1 "Compliance" + "X regulations · Y need action")
├─ Filter bar
│  ├─ Category multi-select            (7 categories)
│  ├─ Impact area multi-select         (10 areas)
│  ├─ Region multi-select              (32 regions)
│  ├─ Client multi-select              (all clients in any clientsAffected)
│  ├─ Legal risk multi-select          (high/medium/low)
│  ├─ Action-required toggle            (warn-tinted)
│  ├─ Search                           (right-aligned, title/authority/summary/reference)
│  └─ Clear chip                        (when ≥1 filter)
├─ Result strip                        (showing X-Y of Z + total ₹ exposure)
└─ Card list (max-w-4xl, 1-col, 25/page)
   └─ Article card × N
```

### 2.2 Article card composition

```
┌────────────────────────────────────────────────────────────┐
│ [category chip]  [region chip]  [Action required?]   <date>│
│                                                             │
│ Title (text-[15px] semibold)                                │
│ Authority · Effective <date>                                │
│                                                             │
│ Summary paragraph                                            │
│                                                             │
│ Briefcase + impact area chips                                │
│ ────────────────────────────────────────────────────────── │
│ [Penalty exposure]   [Legal risk]    [Operational impact]  │
│ ────────────────────────────────────────────────────────── │
│ Impacted: <client chips>             [external source link] │
└────────────────────────────────────────────────────────────┘
```

The whole card is clickable → `router.push('/compliance/{id}')`. The
external source link inside has `e.stopPropagation()` so opening it
doesn't navigate.

### 2.3 Category meta (7)

| Category            | Color   | Background |
| ------------------- | ------- | ---------- |
| Labour              | #2563EB | rgba(37,99,235,.10) |
| Finance & Taxation  | #059669 | rgba(5,150,105,.10) |
| EHS                 | #D97706 | rgba(217,119,6,.10) |
| Commercial          | #7C3AED | rgba(124,58,237,.10) |
| Secretarial         | #0EA5E9 | rgba(14,165,233,.10) |
| Industry Specific   | #C2185B | rgba(194,24,91,.10) |
| General             | var(--text-2) | var(--surface-2) |

### 2.4 Pagination

- 25 per page
- `<<  prev  1 2 3 ... N  next  >>` pattern
- Sliding window of 7 page numbers when N > 7
- Resets to page 1 on any filter or search change

### 2.5 Penalty exposure summary

When filtered, the result strip shows total `sum(penaltyAmount)` across
the filtered set on the right side, prefixed "potential penalty
exposure in current view".

---

## 3. Article detail (`/compliance/[id]`)

### 3.1 Information architecture

```
Detail page
├─ Top breadcrumb bar
│  ├─ "← Compliance" link
│  ├─ "Category · Region" breadcrumb
│  └─ Right cluster: Bookmark, Share, Notify team (if actionRequired)
├─ Article body  (max-w-3xl mx-auto, py-8)
│  ├─ Meta tags row     (category chip, region chip, Action-required chip if any)
│  ├─ Title h1          (text-[28px] lg:text-[32px] bold tracking-tight)
│  ├─ Byline            (authority · date · reference + "View on <gov source>" link)
│  ├─ Lead paragraph    (intro)
│  ├─ Background & context section
│  ├─ Key changes       (bulleted)
│  ├─ Compliance requirements (numbered with pink circles)
│  ├─ Effective date & timeline (surface-2 card)
│  ├─ Penalty & risk    (warn card with 3-col grid: max penalty, legal risk, ops impact)
│  ├─ Recommended action steps (cards with check icons)
│  ├─ Functional impact areas  (colored chips)
│  ├─ Impact on your clients   (text + client chips)
│  ├─ AI recommendation        (pink card with Sparkles icon + "Draft notification email" CTA)
│  ├─ Official source          (linked card to gov portal — never TeamLease)
│  └─ Related regulations      (5 cards, by category or authority match)
```

### 3.2 Editorial sections — content derivation

The 7-section editorial body is generated deterministically from the
regulation record via `getArticleContent(reg)` in
`lib/compliance-data.ts`. Per-category context phrases, requirement
bases, and action steps come from a seeded mulberry32(reg.id + 7919)
PRNG so the same regulation always produces the same article body.

Sections returned:
```
{
  intro:           string   // 1-2 sentence opening
  context:         string   // background paragraph
  requirements:    string[] // numbered compliance items
  deadlines:       string   // timeline narrative
  penaltySection:  string   // penalty narrative
  actionSteps:     string[] // recommended steps (3-5)
  affectedScope:   string   // who's affected explainer
}
```

`getRelatedRegulations(reg, 5)` returns up to 5 regulations matching
on category OR authority (excluding self).

### 3.3 Notify team CTA on detail page

Only renders when `reg.actionRequired === true`. Routes through
`buildComplianceNotify` (see FPRD-09 NotifyPanel) — same template as
inbox notify.

### 3.4 Share button

Currently no-op. v3: copy URL to clipboard with toast.

### 3.5 Bookmark button

Local state toggle, no persistence yet. v3: per-user bookmarks list.

---

## 4. Source URL policy

ZERO regulations link to TeamLease as the source. Source resolution:

```
resolveSourceUrl(authority, region, category) → official gov portal URL
```

Authority → portal mapping (excerpt):
- EPFO → epfindia.gov.in
- CBDT → incometaxindia.gov.in
- ESIC → esic.gov.in
- Karnataka Labour Dept → karmikaspandana.karnataka.gov.in
- Maharashtra Labour Dept → mahakamgar.gov.in
- Ministry of WCD → wcd.nic.in
- ... (24 authorities, mapping in compliance-data.ts)

Featured regulations (10) have manually-curated URLs to specific
notification PDFs. Generated regulations (493) fall back to authority
home page or category-specific gov portal.

---

## 5. Data model

```ts
interface Regulation {
  id: number
  title: string
  date: string                          // when issued
  category: ComplianceCategory          // 7
  authority: string                     // "EPFO", "CBDT", etc.
  region: string                        // "All India" | state name
  reference: string                     // notification number
  summary: string                       // 1-2 sentence
  effectiveDate: string                 // ISO
  actionRequired: boolean
  legalRisk: RiskLevel                  // high | medium | low
  operationalImpact: RiskLevel          // high | medium | low
  penaltyAmount: number                 // ₹
  penaltyDescription?: string
  impactAreas: ImpactArea[]             // 1-3 of 10
  clientsAffected: string[]             // client names
  keyChanges: string[]                  // 3-6 bullet changes
  sourceUrl: string                     // gov portal
  sourceName: string                    // "EPFO Circulars"
}
```

503 entries total.

---

## 6. NotifyPanel integrations

### 6.1 From inbox / library: `compliance` kind
Routes to ops-lead@buzzworks.com (FPRD-04).

### 6.2 From article detail: same `compliance` kind
Same template, opened from the article header CTA when actionRequired.

### 6.3 From client detail page: `client-compliance` kind (FPRD-05)
Per-client AM + client contact routing.

---

## 7. Edge cases

| Case                                                            | Handling                                       |
| --------------------------------------------------------------- | ---------------------------------------------- |
| URL `/compliance/<unknown id>`                                  | "Regulation not found" + back link             |
| Regulation has 0 clientsAffected                                | Affected scope card hides client chips         |
| Regulation has 0 keyChanges                                     | Key changes section hides                       |
| Regulation has 0 impactAreas                                    | Functional impact areas section hides          |
| `actionRequired === false`                                      | Notify team CTA hides; everything else renders |
| `penaltyAmount === 0`                                           | Penalty card shows "—" instead of ₹0           |
| `getRelatedRegulations` returns 0 (rare)                         | Related regs section hides entirely             |

---

## 8. Telemetry events (proposed)

```
compliance.list.viewed             { page, filtersApplied }
compliance.card.clicked            { id }
compliance.detail.viewed           { id, source: "list" | "inbox" | "client-tab" }
compliance.bookmark.toggled        { id, on: bool }
compliance.share.clicked           { id }
compliance.notify.opened           { id }
compliance.source.clicked          { id, sourceUrl }
compliance.related.clicked         { fromId, toId }
```

---

## 9. Acceptance criteria summary

### List
- AC-1: 25 regulations per page; pagination shows up to 7 numbered buttons
- AC-2: 6 filter dropdowns + 1 toggle + search; clear chip resets all
- AC-3: Total ₹ penalty exposure shown when filtered set has any penalty
- AC-4: Each card click → router.push('/compliance/[id]'); external link click does not navigate
- AC-5: Source link for each card points to gov URL, never teamlease.com

### Detail
- AC-6: Editorial body order matches §3.1; sections hide when source data empty
- AC-7: Title is 28px / 32px on lg; uses lead intro paragraph (17px)
- AC-8: Notify team CTA only renders when actionRequired === true
- AC-9: Penalty card shows max penalty / legal risk / ops impact in 3-col grid
- AC-10: Related regulations card click navigates to that regulation
- AC-11: Bookmark + Share are local-only (no persistence in v2)

---

## 10. Open questions

1. Bookmark persistence (per-user, server-backed). v3.
2. Share = copy link to clipboard with toast. Trivial v3.
3. Real official source URLs per generated regulation (currently most
   fall back to authority home page). v3 needs per-notification URL DB.
4. Comments/annotations on a regulation (Buzzworks-internal). v3.
5. Per-client compliance trail: when did this client first become
   affected, what action was taken. v3.
