# FPRD-12 — Design System & Cross-cutting

**Surfaces:** every page

This FPRD is the source of truth for tokens, components, copy
conventions, and behaviour patterns that span the whole product.
Change here = change everywhere.

---

## 1. Type scale (7-step ladder)

| Token        | Size | Weight | Line | Use                                                    |
| ------------ | ---- | ------ | ---- | ------------------------------------------------------ |
| `.t-caption` | 11px | 400    | 16   | timestamps, chip counts, byline meta, table sub-labels |
| `.t-meta`    | 12px | 500    | 16   | buttons, filter chips, form labels, dense table cells  |
| `.t-body`    | 14px | 400    | 20   | default paragraph, card body, list rows, table data    |
| `.t-heading` | 16px | 600    | 22   | section titles, card titles                            |
| `.t-title`   | 20px | 600    | 26   | page titles (h1)                                        |
| `.t-stat`    | 24px | 600    | 28   | KPI tile values                                         |
| `.t-display` | 28px | 700    | 32   | hero / large stat numbers                              |

Ratio ~1.25 (major third). Body anchored at 14px per dashboard
convention. Defined as utility classes in `app/globals.css`.

Legacy aliases (for compatibility while migrating older code):
`.text-display`, `.text-title`, `.text-body`, `.text-caption` map
to the same sizes.

### 1.1 Sizes that should not appear

8, 9, 10 px (too small to read at any density), 13, 15 px (collapse
into 14), 17, 18 px (collapse into 16/20), 22, 26, 32 px (collapse
into 24/28).

### 1.2 Tailwind aliases in use

- `text-xs` (12px) ≡ t-meta
- `text-sm` (14px) ≡ t-body
- `text-base` (16px) ≡ t-heading
- `text-xl` (20px) ≡ t-title
- `text-2xl` (24px) ≡ t-stat
- `text-[28px]` ≡ t-display

---

## 2. Color palette

### 2.1 Primary (pink)

7-step pink scale based on a wedding-elegant palette:

| Token        | Hex   | Use                                              |
| ------------ | ----- | ------------------------------------------------ |
| --pink-50    | (light tint) | Card bg, hover state, callout bg          |
| --pink-100   | (lighter)   | Subtle borders, chip bg                    |
| --pink-200   | …            | Strong borders                              |
| --pink-700   | (dark)       | CTA bg, accent text, primary actions       |

### 2.2 Aliases

- `--accent` ≡ `var(--pink-700)`
- `--accent-dim` — light tint of accent for hover/active subtle
- `--accent-border` — accent at low alpha

### 2.3 Surfaces

- `--bg` — page background (warm parchment in light, near-black in dark)
- `--surface` — card surface
- `--surface-2` — second-level surface (input bg, sub-card)
- `--surface-hover` — hover state for surface

### 2.4 Borders

- `--border` — subtle 1px
- `--border-strong` — emphasised 1px

### 2.5 Text

- `--text-1` — primary text (high contrast)
- `--text-2` — secondary text
- `--text-3` — tertiary / placeholder text

### 2.6 Semantic

- `--warn`, `--warn-bg`, `--warn-border` — amber, used for caution
- `--danger`, `--danger-bg`, `--danger-border` — red, **reserved for
  hard fails / cycle blockers / SOS** (not for routine warnings)
- `--info` — blue, used for informational accents
- `#059669` — success green, used for approved/passed states
- `--lavender` — used for "without AI" line in Chart 1, headcount
  footer in Chart 4

### 2.7 The "danger" rule

`--danger` is reserved for genuine failure states:
- Compliance overdue
- Payroll cycle blockers
- Bank validation failure
- Hard policy violations

Routine warnings (overtime without pre-approval, sandwich leave) use
`--warn`. The product is calm by default.

---

## 3. Spacing primitives

### 3.1 Page chrome

| Region       | Padding                              |
| ------------ | ------------------------------------ |
| Header       | `px-6 lg:px-8 py-5`                  |
| Tab bar      | `px-6 lg:px-8 py-2`                  |
| Filter bar   | `px-6 lg:px-8 py-3`                  |
| Stats strip  | `px-6 lg:px-8 py-2.5` on `var(--bg)` |
| Bulk action  | `px-6 lg:px-8 py-2.5` on `var(--pink-50)` |
| Body         | `px-6 lg:px-8` (or constrained max-w) |

### 3.2 Card chrome

- Primary card: `p-4` or `p-5`, `rounded-xl`, `border 1px var(--border)`
- KPI card: `.stat-card` (defined in globals.css)
- Hero card: `p-6 lg:p-8`, `rounded-2xl`

### 3.3 Drawers

- Right-slide: `w-[420px]` (timesheet detail) or `w-[440px]`
  (NotifyPanel) or `max-w-md` (agent drawer)
- All right-slides have `position: fixed`, `inset-0` overlay click
  to close

---

## 4. Page shell pattern

Every section page follows this shell (enforced):

```jsx
<div className="flex h-screen overflow-hidden app-bg">
  <Sidebar />
  <div className="flex-1 flex flex-col overflow-hidden">

    {/* Header */}
    <header className="px-6 lg:px-8 py-5 flex-shrink-0 flex items-start gap-4"
      style={{ background: "var(--surface)", boxShadow: "0 1px 0 var(--border)" }}>
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-[13px] mt-0.5">{subtitle}</p>
      </div>
      {action}
    </header>

    {/* Optional tab bar */}
    {/* Optional filter bar */}
    {/* Optional stats strip */}
    {/* Optional bulk action bar */}

    {/* Body */}
    <main className="flex-1 overflow-y-auto pb-nav lg:pb-0">
      {body}
    </main>

  </div>
  <BottomNav />
</div>
```

This shell is consistent across: Home, Inbox (4 tabs), Clients,
Employees, Compliance, Policies, Agents, Settings, Payroll,
Integrations.

---

## 5. Filter bar pattern

Standard layout (left-to-right):

```
[FilterDropdown × N]    [Toggles × N]    [Clear chip if active]    ml-auto    [Search]    [Sort]
```

### 5.1 FilterDropdown component

Single shared multi-select component (each page has its own copy
currently; v3 should consolidate to one library file):

```jsx
<FilterDropdown
  label="Category"
  icon={Tag}
  options={[{ value, label, color? }]}
  selected={[string[]]}
  onToggle={(v) => void}
  onClear={() => void}
/>
```

Behaviour:
- Closed: pill button with label + active count badge (when ≥1 selected)
- Open: portal-positioned panel, max-h-64 scrollable list
- Outside-click closes (mousedown listener on document)
- Selection state: pink-50 row bg + accent checkbox
- "Clear all" link at top when ≥1 selected

### 5.2 Search

Right-aligned via `ml-auto`. Standard input with magnifier icon
inside on the left.

### 5.3 Sort

Native `<select>` with custom chevron, label "Sort by" left of select.

---

## 6. Stats strip pattern

```jsx
<div className="flex items-center gap-6 px-6 lg:px-8 py-2.5 flex-shrink-0 text-xs"
  style={{ background: "var(--bg)", color: "var(--text-3)" }}>
  <span>
    <span style={{ color: "var(--text-1)", fontWeight: 600 }}>{count}</span> items
  </span>
  ...more stats...
  <span className="ml-auto">{total or right-side meta}</span>
</div>
```

Caption-style metrics inline. Numeric value bumped to t-body weight
for emphasis. Total/exposure/page-meta on the right.

---

## 7. Bulk action bar pattern

```jsx
{selectedCount > 0 && (
  <div className="flex items-center gap-3 px-6 lg:px-8 py-2.5 flex-shrink-0"
    style={{ background: "var(--pink-50)", boxShadow: "0 1px 0 var(--border)" }}>
    <span className="text-xs font-medium" style={{ color: "var(--pink-700)" }}>
      {selectedCount} selected
    </span>
    <button className="btn-primary ...">Action</button>
    <button className="btn-ghost ...">Notify team</button>
    <button onClick={clear} className="btn-ghost ml-auto">Clear</button>
  </div>
)}
```

Pink-50 bg distinguishes it from filter bar (surface) and stats
strip (bg).

---

## 8. Card patterns

### 8.1 Article card (compliance)
- Border-left 3px in category color
- Header row of chips (category, region, action-required, date)
- Title + authority + summary
- Impact area chips
- 3-col penalty/risk/impact strip
- Affected clients chips + external source link

### 8.2 Inbox row (timesheet/onboarding/payroll)
- Compact: 1 line (status icon + chips + name + meta + chips + indicators + caret)
- Expanded: same row collapsed → 2 or 3-col grid below
- Selectable: checkbox left, only when status allows action

### 8.3 RuleCard (policy)
- Border-left 3px in category color (or neutral when disabled)
- Icon tile + name + chips on top row
- Description + mono trigger line + usage stats
- Right-side labelled toggle pill

### 8.4 ClientCard
- Border-left 3px in client color
- Avatar tile + name + code+industry chip
- Status + action count chips
- 2×2 stats grid
- Compliance bar
- City + policy + "View →" footer

---

## 9. Button conventions

| Class           | Use                                                       |
| --------------- | --------------------------------------------------------- |
| `.btn-primary`  | Primary CTA — accent bg, white text                       |
| `.btn-teal`     | Legacy primary alias (used in some sections)              |
| `.btn-ghost`    | Secondary CTA — transparent bg, accent border             |
| `.btn-coral`    | Removed in v2 (was used in Danger Zone)                   |

Padding within buttons: `padding: "8px 14px"` for primary; `"7px 14px"`
for compact toolbars.

---

## 10. Iconography

- Library: `lucide-react`
- Icon sizes: 11px (chip inline), 12-13px (button inline), 14-15px
  (card title), 16-18px (page header / large action), 20-22px (drawer)
- Stroke width: 1.5 for default, 2 for active state on nav

---

## 11. Empty / loading / error states

### 11.1 Empty list

```
<div className="text-center py-20 text-sm" style={{ color: "var(--text-3)" }}>
  {empty copy specific to surface}
</div>
```

Examples:
- "No items match the current filters"
- "No regulations currently affecting this client"
- "No policy rules match the current filters"

### 11.2 Loading

Currently no loading state needed (all data is in-memory mock).
v3 needs skeleton rows for inbox lists, donut placeholder for charts.

### 11.3 Error

Currently no error state in UI. v3 needs toasts for failed mutations.

---

## 12. Copy conventions

### 12.1 Voice

- Operational, ground-level, short. No marketing words ("delight",
  "powerful", "intelligent")
- Sentence-case, not Title-Case
- Use real numbers ("₹12L saved this month") not vague claims
  ("significant savings")
- Address ops as a peer, not a user

### 12.2 Banned phrases

- "AI-powered" — agents are named; don't generic-ify them
- "leverage" — say "use"
- "synergy", "robust", "seamless" — never appear
- "Drafted by [agent]" inline — only the RIPLEY footnote (FPRD-09)

### 12.3 Subject grammar

See FPRD-09 §4.5 for the canonical subject grammar per email kind.

### 12.4 Greeting

Sidebar / Settings / Home all use "Siddharth Kirtikar" / "Ops Agent"
post-rebrand. First-name only in greetings ("Good morning, Siddharth"
removed in commit favouring localised greeting; current copy is
"Good morning, Riya" — to be standardised with logged-in user).

---

## 13. Brand

- Product name: **Agent Dashboard** (not OpsDesk, not Buzz Agent
  Dash)
- Subtitle in headers: **Buzzworks** or **For Buzzworks Agent
  Managers** (login)
- Sidebar avatar tile: "B" (Buzzworks), pink-700 bg
- Login email: `agentic@buzzworks.com` (not ops-agentic)
- Demo password: `buzzworks@123`

---

## 14. Responsive breakpoints

- `sm` → 640px (mobile portrait)
- `md` → 768px (mobile landscape)
- `lg` → 1024px (tablet/desktop boundary; sidebar collapses below this)
- `xl` → 1280px (large desktop, 3-col grids enabled here)

Mobile: bottom nav with 4 primary items + More sheet.
Desktop: persistent left sidebar (240px wide).

---

## 15. Accessibility (current state + gaps)

### 15.1 Current

- Buttons have aria-titles where keyboard reach matters (toggle pills)
- Color is not the only indicator (icons + text labels accompany)
- Type sizes ≥ 11px (WCAG passable for UI; body is 14px = AA at
  normal contrast)

### 15.2 Gaps (v3)

- No keyboard navigation tested for filter dropdowns
- No focus rings consistently applied
- No reduced-motion support
- No screen-reader audit done
- No high-contrast mode

---

## 16. Acceptance criteria summary

- AC-1: Type sizes only from §1 ladder (11/12/14/16/20/24/28); no
  others appear in app code
- AC-2: Color tokens used by name (var(--accent) etc.), not hex,
  except for legacy chart colors and brand colors
- AC-3: Page shell §4 enforced on all 11 section pages
- AC-4: Filter bar §5 layout: dropdowns left, toggles, clear, ml-auto
  search, sort
- AC-5: Stats strip §6 + bulk action bar §7 appear in all 4 inbox
  sub-tabs + Compliance library
- AC-6: Buttons use canonical classes (btn-primary, btn-ghost); no
  inline-styled buttons except for chip-style action elements
- AC-7: Iconography limited to lucide-react; sizes follow §10
- AC-8: Copy follows §12 voice; banned phrases never appear

---

## 17. Open questions

1. Component library extraction — currently FilterDropdown is
   duplicated in ~5 places. Move to `components/ui/FilterDropdown.tsx`
   in v3.
2. Theme: Light vs Dark currently both shipped; primary color drift
   between modes (pink vs teal). Standardise palette across modes
   in v3.
3. Internationalisation — copy is English only; all chip labels and
   subject lines need i18n keys. v3.
4. Print stylesheet for compliance article detail (so Compliance
   Lead can print/PDF and share). v3.
5. Theme picker on the login screen. v3.
