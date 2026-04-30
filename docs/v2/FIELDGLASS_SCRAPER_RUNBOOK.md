# Fieldglass Day-Wise Scraper — Runbook

This is a one-shot scraping pipeline that pulls per-day timesheet hours
out of the **SAP Fieldglass supplier portal** and lands them in our
Supabase Postgres. We use it for Capgemini today; the same pattern will
work for any other Fieldglass-buyer client where Buzzworks holds a
supplier login (different `buyerCode` parameter on the detail URL).

> Day-wise data is **not bulk-exportable** from the supplier-side
> Supplier List CSV — it lives only on each timesheet's detail page.
> The detail page lives on the buyer's tenant subdomain, but the
> supplier session can reach it **only via a click from the supplier
> list page** (Referer-bound auth). Direct `goto()` returns
> `auth_error.jsp?msg=noAuth`.

The scraper, ingest script, and calendar UI all live in this repo —
nothing depends on any cloud function. Vercel deploys are not in the
critical path for either scraping or ingest.

## Files

| Path | Purpose |
|---|---|
| `scripts/scrape-fieldglass-march.ts` | Headful Playwright scraper. Logs in, walks date-filtered weekly windows, clicks each row → new tab → parses `Time Worked` table → JSONL. |
| `scripts/ingest-fieldglass-daily.ts`  | Direct-Postgres ingest of the JSONL into `daily_entries`. Bulk-upsert, chunked under PG's 65k bind-param cap. |
| `scripts/probe-fieldglass-detail.ts`  | Diagnostic: opens **one** detail page and dumps HTML + screenshot. Use this when SAP changes their DOM. |
| `app/api/import/fieldglass/daily/route.ts` | HTTP equivalent of the local ingest. Same logic, runs on Vercel. Use for ad-hoc curl uploads after a scrape. |
| `app/employees/[id]/page.tsx` (`MonthCalendar`) | Month-grid UI that renders the day-wise data. Cells deep-link back to Fieldglass detail. |
| `out/fieldglass-march-daily.jsonl` | Resumable scrape state — one record per timesheet, keyed by TSN. Gitignored. |

## Prerequisites

```bash
# Install Playwright + Chromium browser binary (one-time)
npm install --no-save --no-audit --no-fund playwright
npx playwright install chromium

# Pull production env vars (DATABASE_URL et al) from Vercel
npx vercel env pull .env.production.local --environment=production
```

`.env.production.local` is gitignored. It contains `POSTGRES_URL` /
`DATABASE_URL` for the Supabase Mumbai instance.

## Steps

### 1. Scrape
```bash
FG_USER='Venkat2838' FG_PASS='Buzz@2027' \
  npx tsx scripts/scrape-fieldglass-march.ts
```

Headful Chromium opens. The script:
1. Hits `https://www.fieldglass.net/` (gateway). Auto-dismisses the
   pre-login cookie banner (`button#truste-consent-button`).
2. Submits credentials. Login redirects to the supplier tenant
   (`https://www.us.fieldglass.cloud.sap/desktop.do`). Auto-dismisses
   the in-app cookie banner that appears post-login.
3. For each weekly window in `WINDOWS`, navigates to
   `/time_sheet_list.do`, types the From/To dates into `#filterStartDate`
   / `#filterEndDate` (DD/MM/YYYY), clicks `input[name='timeSheet_supplier_list_search']`.
4. For each visible row not already in JSONL: **Cmd+clicks** the anchor
   to open the detail page in a new tab. Parses `Time Worked` table from
   `document.body.innerText` (cells are tab-separated; the first 7 cells
   of the **last** row labeled `Total` are the day-wise hours).
5. Writes `{ tsn, workerId, periodStart, periodEnd, billRate, totalHours, daily: [...] }`
   to `out/fieldglass-march-daily.jsonl`.

**Resumable.** Re-run after a crash; already-scraped TSNs are skipped.

**Throttle.** ~500 ms between detail pages. ~17 s end-to-end per record
(login form rendering on cgem.us is the bulk of it). Plan for **~30
seconds per row of in-scope data**.

**Scope.** Edit the `WINDOWS` array at the top of the file. Each window
is a `{ start, end }` pair in DD/MM/YYYY format. Keep windows ≤ 7 days
to stay under the list page's 1000-row cap.

### 2. Ingest
After every scrape pass (or once at the end):
```bash
set -a && . .env.production.local && set +a
npx tsx scripts/ingest-fieldglass-daily.ts
```

This connects directly to Supabase (no Vercel function in the path) and
does a transactional `DELETE … WHERE timesheet_id IN (…)` followed by
chunked bulk `INSERT` into `daily_entries`. Bulk size is hard-capped at
2,000 rows per `INSERT` (≈14k bind params; PG limit is 65,534).

The script reports `Matched N / M TSNs`. The mismatch number is your
out-of-scope tail — TSNs in the JSONL that don't exist as parent
`timesheets` rows. Usually safe to ignore (those weeks weren't part of
the original CSV import).

### 3. Verify
```bash
curl -sS https://dev.era.ai/api/timesheets/cap > /tmp/cap.json
python3 -c "
import json; d = json.load(open('/tmp/cap.json'))
real = [t for t in d['timesheets']
        if any((float(e.get('regularHours') or 0) + float(e.get('overtimeHours') or 0)) > 0
               for e in t.get('dailyEntries', []))]
print(f'{len(real)} / {len(d[\"timesheets\"])} timesheets have non-zero day-wise data')
"
```

Visually: open `https://dev.era.ai/employees/<id>` for any worker we
scraped, click the **Timesheets** tab. The month calendar at the top
should show a non-uniform pattern (e.g. `9·9·0·9·9·0·0` instead of the
synthetic `9·9·9·9·9·0·0` baseline). Cells deep-link to the Fieldglass
detail page so ops can drill in.

## When the DOM changes

SAP ships UI updates without notice. If parsing degrades, run the probe:

```bash
FG_USER=… FG_PASS=… PROBE_ID=CGEMTS06582389 \
  npx tsx scripts/probe-fieldglass-detail.ts
```

It writes `out/probe-detail.html` + `out/probe-detail.png`. Look at the
`Time Worked` section to identify the new DOM/text shape, then update
the `page.evaluate(...)` parser in `scripts/scrape-fieldglass-march.ts`.

The parser intentionally uses **textContent line + tab analysis**, not
HTML selectors, because Fieldglass uses jqx-grid + SAP UI5 components
whose markup changes from release to release. Text patterns
(`/Time Worked/`, `/^(Mon|Tue|…)$/`, `/^\d+h\s*\d+m$/`) have proven
much more durable.

## Gotchas / lessons learned

1. **Two distinct logins.** `www.fieldglass.net` is the supplier
   gateway; `cgem.us.fieldglass.cloud.sap` is the **buyer's** tenant.
   The supplier credential `Venkat2838` is rejected by direct
   buyer-tenant login with "You are not authorized to log into this
   area." We log in at the gateway only.

2. **Detail pages live on the buyer tenant** but require a click from
   the supplier list page. `page.goto(detailUrl)` → `auth_error.jsp`.
   `page.click(anchor)` works because Fieldglass binds session
   transitively to the Referer.

3. **tsx instruments `page.evaluate` callbacks** with `__name(…)` for
   class-name preservation. The instrumented function fails in the
   browser (`__name is not defined`). The fix: pass parser logic as a
   **string** (`page.evaluate(\`(() => { … })()\`)`).

4. **`document.body` can be null** in the very first ms after navigating
   to a detail page (cgem.us has a brief redirect-bridge state). Guard
   in evaluate; combine with `waitForFunction` on `Time Worked` text.

5. **innerText cell separator is TAB**, not newline. The header
   row of the `Time Worked` table renders as 8 lines like `"Day\\t23/2"`,
   `"Mon\\t24/2"` … because each `<th>` has nested elements separated by
   `\\n` and `<th>` cells separated by `\\t`. The data rows are single
   tab-separated lines: `"Total\\t0h 0m\\t9h 0m\\t…\\t36h 0m"`.

6. **Date format inside cells is `DD/M`** (not `DD/MM` and not `DD-MMM`).
   Year is implicit (always the period's year). Anchor with
   `periodStart.slice(0, 4)`.

7. **Multi-project workers.** A single timesheet can have multiple
   "Billable" project rows, each with its own `Time Worked` row. The
   parser must take the **last** 8 hour-cells in the section (the
   summary `Total` row), not the first.

8. **The list page caps display at 1000 rows.** Don't try to filter for
   a whole month (potentially 1,500+ rows) — split into ≤ 7-day windows.
   Each window also paginates 50 rows at a time inside the grid.

9. **Cmd+click new-tab > go-back.** Opening detail in a new tab keeps
   the list page (filter + page state) intact across many iterations.
   The earlier go-back approach lost filter state after ~50 popups and
   produced "anchor not found" errors.

10. **Don't trust `aria-disabled='false'` on the Next pager button.**
    jqx-grid sometimes leaves the Next button enabled-looking even when
    advancing it just redraws the same rows. The pagination loop now
    compares the SET of TSNs after Next to the SET before — same set →
    stop.

11. **Pre-create `out/` before piping to `tee`**. The shell's `tee` runs
    before the script's `mkdirSync`. The first crash was a `tee:
    out/scrape-run.log: No such file or directory` — silent loss of
    every line of the run.

12. **`vercel env pull` is the easiest way to DATABASE_URL** locally.
    Don't paste it. Don't commit `.env.production.local` (it's
    gitignored, but verify with `git check-ignore`).

## Future portability

To scrape a different Fieldglass buyer (e.g. PwC, Hexaware) for which
Buzzworks holds a supplier login:

- Update `WINDOWS` for the period of interest.
- Update the `buyerCode` query param in `external_url` construction
  inside the parser (see `scripts/fieldglass-cap-import.ts:detailPageUrl`).
- Update the `cap-fg-` prefix on TSN ids if you want to keep buyer
  data segregated; everything else is generic.
- Stuff the buyer-specific bits into env vars before wiring them
  permanently.
