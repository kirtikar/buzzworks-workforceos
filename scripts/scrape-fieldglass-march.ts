// One-shot scraper: Capgemini Fieldglass time-sheet day-wise → JSONL
//
//   FG_USER=... FG_PASS=... npx tsx scripts/scrape-fieldglass-march.ts
//
// What it does:
//   1. Launches Chromium HEADFULLY so you can watch and complete any
//      MFA / unfamiliar-device prompt manually.
//   2. Logs in at the supplier gateway (www.fieldglass.net) — Venkat2838
//      is a SUPPLIER account; the cgem.us BUYER tenant rejects direct
//      access.
//   3. Navigates to /time_sheet_list.do on the supplier tenant.
//   4. For each row whose End date falls in March 2026, *clicks* the
//      anchor (cgem.us URLs reject direct navigation but allow it via a
//      Referer-bound click from the list page).
//   5. Parses the "Time Worked" table on the detail page — extracts
//      day-wise hours (7 days × hours-as-"Nh Mm") plus Worker ID, TSN,
//      bill rate, period dates.
//   6. Writes one JSON line per timesheet to out/fieldglass-march-daily.jsonl
//   7. Returns to the list (back-button), pagination via the "next" anchor.
//
// Resumability: skips TSNs already present in the JSONL output.
// Throttled to ~1 req/sec to be polite to SAP.

import { chromium, type Browser, type Page } from "playwright"
import * as fs from "fs"
import * as path from "path"

const FG_USER = process.env.FG_USER
const FG_PASS = process.env.FG_PASS
const GATEWAY = process.env.FG_GATEWAY ?? "https://www.fieldglass.net/"
const OUT_DIR  = path.join(process.cwd(), "out")
const OUT_FILE = path.join(OUT_DIR, "fieldglass-march-daily.jsonl")
const ERR_FILE = path.join(OUT_DIR, "scrape-errors.log")
// March 2026 scope (calendar 1-31). Timesheets are weekly Mon→Sun, so
// we cover the 5 weeks that overlap March. Per-window ≤ 1000 rows so
// the supplier list shows everything matching the date filter.
const WINDOWS: { start: string; end: string }[] = [
  { start: "02/03/2026", end: "08/03/2026" },
  { start: "09/03/2026", end: "15/03/2026" },
  { start: "16/03/2026", end: "22/03/2026" },
  { start: "23/03/2026", end: "29/03/2026" },
  { start: "30/03/2026", end: "05/04/2026" },
]

if (!FG_USER || !FG_PASS) { console.error("Missing FG_USER / FG_PASS env vars."); process.exit(1) }
fs.mkdirSync(OUT_DIR, { recursive: true })

interface DailyRow { date: string; hours: number; type?: string }
interface ScrapedTs {
  tsn:          string         // CGEMTS… (matches our DB column)
  workerId?:    string         // CGEMWK…
  workerName?:  string         // "Last, First" from header strip
  periodStart?: string
  periodEnd?:   string
  status?:      string         // "Pending Approval" | "Invoiced" | "Paid" | …
  jobPostingId?: string        // CGEMUP… (work order)
  jobPostingName?: string      // "Altec TC Enhancements" etc.
  managerName?: string         // "Work Order Revision Owner" name part
  managerEmail?: string        // email parenthetical
  approverName?: string        // most recent approver from Comments
  approverEmail?: string
  approvedAt?: string          // approval timestamp from Comments
  legalEntity?: string         // "IN11"
  site?: string                // full site string
  businessUnit?: string
  contingentType?: string      // "Classic" / "ICW" / etc.
  payRate?: number             // cost to supplier (Pay to Worker / Standard Time)
  billRate?: number            // bill to buyer
  totalHours?: number          // weekly total (sum of daily.hours)
  totalBilled?: number         // INR billed to buyer this week
  daily:        DailyRow[]
  scrapedAt:    string
}

function log(...a: unknown[]) {
  const ts = new Date().toISOString().slice(11, 19)
  console.log(`[${ts}]`, ...a)
}
function errLog(id: string, err: unknown) {
  const line = `${new Date().toISOString()} ${id} ${err instanceof Error ? err.stack : String(err)}\n`
  fs.appendFileSync(ERR_FILE, line)
}
function appendJsonl(rec: ScrapedTs) {
  fs.appendFileSync(OUT_FILE, JSON.stringify(rec) + "\n")
}
// "Done" = TSN was cleanly scraped: 7 valid day entries with at least
// one non-zero hours value (a record with all-zero days is suspicious —
// usually indicates a parse failure on a real timesheet, so re-scrape).
// Records with empty / partial `daily` are NOT counted as done so the
// scraper picks them up again on the next run.
function alreadyDone(): Set<string> {
  if (!fs.existsSync(OUT_FILE)) return new Set()
  const done = new Set<string>()
  for (const line of fs.readFileSync(OUT_FILE, "utf-8").split("\n")) {
    if (!line.trim()) continue
    try {
      const r = JSON.parse(line)
      const tsn = r.tsn ?? r.timesheetId
      if (!tsn) continue
      const daily = Array.isArray(r.daily) ? r.daily : []
      const cleanlyScraped = daily.length === 7 &&
        daily.some((d: { hours?: number }) => (d.hours ?? 0) > 0)
      if (cleanlyScraped) done.add(tsn)
    } catch { /* skip */ }
  }
  return done
}

async function dismissCookieBanner(page: Page) {
  const sels = [
    "#onetrust-accept-btn-handler",
    "button#truste-consent-button",
    "button:has-text('Accept All Cookies')",
    "button:has-text('Accept all cookies')",
    "button:has-text('Accept All')",
    "button:has-text('Accept all')",
    "button:has-text('I Accept')",
    "button:has-text('Accept')",
  ]
  for (const sel of sels) {
    try {
      const el = await page.waitForSelector(sel, { timeout: 3_000, state: "visible" })
      if (el) { await el.click(); await page.waitForTimeout(400); return }
    } catch { /* try next */ }
  }
}

async function login(page: Page) {
  log("→ tenant login via gateway:", GATEWAY)
  await page.goto(GATEWAY, { waitUntil: "domcontentloaded", timeout: 60_000 })
  await dismissCookieBanner(page)

  await page.waitForSelector("input[name='username'], input[type='text']", { timeout: 30_000 })
  await page.fill("input[name='username'], input[type='text']", FG_USER!)
  await page.fill("input[type='password']", FG_PASS!)
  await page.click("button:has-text('Sign In'), button[type='submit'], input[type='submit']")
  log("→ submitted credentials. Waiting for login redirect...")

  await page.waitForFunction(
    () => !document.querySelector("input[type='password']"),
    null, { timeout: 300_000 },
  )
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {})
  log("✓ logged in. URL:", page.url())
  // Post-login in-app cookie banner — different one than the public site.
  await dismissCookieBanner(page)
}

// Walk the supplier list table on the current page; return [{ tsn, endIso, href }]
// Uses the jqx-grid container so we only see real rendered rows (anchors
// outside the grid — e.g. nav, dropdowns — are excluded).
async function harvestListPage(page: Page): Promise<{ tsn: string; endIso: string; href: string }[]> {
  return await page.evaluate(() => {
    const out: { tsn: string; endIso: string; href: string }[] = []
    // Document-wide query (jqx-grid renders rows in a virtual scroll
    // container that isn't always reachable by predictable scope id).
    // The TSN-dedup guard prevents duplicate matches from breadcrumbs etc.
    const anchors = Array.from(document.querySelectorAll("a[href*='cgem.us'][href*='time_sheet_detail.do']")) as HTMLAnchorElement[]
    const seen = new Set<string>()
    for (const a of anchors) {
      const tr = a.closest("[role='row']") || a.closest("tr") || a.parentElement?.parentElement
      const text = (tr?.textContent ?? "").replace(/\s+/g, " ").trim()
      const tsnMatch = text.match(/CGEMTS\d{8}/)
      if (!tsnMatch || seen.has(tsnMatch[0])) continue
      seen.add(tsnMatch[0])
      const dates = Array.from(text.matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g))
        .map(m => `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`)
      const endIso = dates.length >= 2 ? dates[dates.length - 1] : (dates[0] ?? "")
      out.push({ tsn: tsnMatch[0], endIso, href: a.href })
    }
    return out
  })
}

async function scrapeDetail(page: Page): Promise<ScrapedTs> {
  // Wait for the Time Worked section to render. document.body can be
  // null very early after navigation, so guard against it.
  await page.waitForFunction(
    `document.body && /Time Worked/.test(document.body.innerText)`,
    null, { timeout: 30_000 },
  ).catch(() => {})
  await page.waitForTimeout(800)

  // Pass the parsing logic as a STRING, not as a function value. tsx
  // instruments function references with `__name` calls that aren't
  // defined in the browser context — passing source text bypasses that.
  return await page.evaluate(`(() => {
    if (!document.body) return { tsn: "", workerId: "", periodStart: "", periodEnd: "", billRate: undefined, totalHours: undefined, daily: [], scrapedAt: "" }
    const all = document.body.innerText
    const tsn = (all.match(/CGEMTS\\d{8}/) || [""])[0]
    const wid = (all.match(/CGEMWK\\d+/) || [""])[0]
    const periodMatch = all.match(/(\\d{2}\\/\\d{2}\\/\\d{4})\\s+to\\s+(\\d{2}\\/\\d{2}\\/\\d{4})/)
    let periodStart = ""
    let periodEnd   = ""
    if (periodMatch) {
      const a = periodMatch[1].match(/(\\d{2})\\/(\\d{2})\\/(\\d{4})/)
      const b = periodMatch[2].match(/(\\d{2})\\/(\\d{2})\\/(\\d{4})/)
      if (a) periodStart = a[3] + "-" + a[2] + "-" + a[1]
      if (b) periodEnd   = b[3] + "-" + b[2] + "-" + b[1]
    }

    // ── Worker context ──────────────────────────────────────────────
    // Header strip: "Time Sheets List\\n.., NAME\\nTime Sheet"
    // Worker name appears just below "Time Sheets List".
    const allLines = all.split("\\n")
    let workerName = ""
    for (let i = 0; i < allLines.length - 1; i++) {
      if (/^Time Sheets List/.test(allLines[i])) {
        for (let j = i + 1; j < Math.min(i + 4, allLines.length); j++) {
          const t = allLines[j].replace(/^[.,\\s]+/, "").trim()
          if (t && t !== "Time Sheet" && !/^\\(Rev/.test(t)) { workerName = t; break }
        }
        break
      }
    }

    // Status (e.g., "Pending Approval", "Invoiced") — first known status keyword.
    const statusMatch = all.match(/\\b(Pending Approval|Invoiced|Paid|Approval Paused|Pending Review|Approved|Rejected)\\b/)
    const status = statusMatch ? statusMatch[1] : ""

    // Job posting: "<name> CGEMUP\\d+" or "CGEMUP\\d+" alone.
    const jpMatch = all.match(/([A-Za-z][^\\n\\t]{2,80}?)\\s*[-:\\s]\\s*(CGEMUP\\d+)/)
    const jobPostingId   = jpMatch ? jpMatch[2] : (all.match(/CGEMUP\\d+/) || [""])[0]
    const jobPostingName = jpMatch ? jpMatch[1].trim() : ""

    // Manager (Work Order Revision Owner) — line is
    //   "Work Order/Work Order Revision Owner\\tLast, First(email@…)"
    const mgrMatch = all.match(/Work Order(?:\\/Work Order)? Revision Owner[\\s\\t]*([^\\n(]+)\\(([^)]+)\\)/)
    const managerName  = mgrMatch ? mgrMatch[1].trim() : ""
    const managerEmail = mgrMatch ? mgrMatch[2].trim() : ""

    // Approver from Comments table — most recent "Approved" / "Approve" entry.
    const approverMatch = all.match(/(\\d{2}\\/\\d{2}\\/\\d{4} \\d{2}:\\d{2} (?:AM|PM))[\\s\\t]+([^\\n(]+)\\(([^)]+)\\)[\\s\\t]+Approved/)
    const approverName  = approverMatch ? approverMatch[2].trim() : ""
    const approverEmail = approverMatch ? approverMatch[3].trim() : ""
    let approvedAt = ""
    if (approverMatch) {
      const m = approverMatch[1].match(/(\\d{2})\\/(\\d{2})\\/(\\d{4}) (\\d{2}):(\\d{2}) (AM|PM)/)
      if (m) {
        let hh = parseInt(m[4], 10); if (m[6] === "PM" && hh < 12) hh += 12; if (m[6] === "AM" && hh === 12) hh = 0
        approvedAt = m[3] + "-" + m[2] + "-" + m[1] + "T" + String(hh).padStart(2, "0") + ":" + m[5] + ":00"
      }
    }

    // Site / Legal Entity / Business Unit (label\\tvalue layout).
    const legalEntityMatch = all.match(/Legal Entity\\s*\\n?\\s*\\t?\\s*([A-Z]{2}\\d{2,})/)
    const legalEntity = legalEntityMatch ? legalEntityMatch[1] : ""
    const siteMatch = all.match(/Site[\\s\\t]+([^\\n]+CAPGEMINI[^\\n]+)/)
    const site = siteMatch ? siteMatch[1].trim() : ""
    const buMatch = all.match(/Business Unit[\\s\\t]+([^\\n]+)/)
    const businessUnit = buMatch ? buMatch[1].trim() : ""
    const ctMatch = all.match(/Contingent Type[\\s\\t]+([A-Za-z][^\\n]{0,40})/)
    const contingentType = ctMatch ? ctMatch[1].trim() : ""

    // ── Rates & amount ───────────────────────────────────────────────
    // "Bill to Buyer" section sums rates × hours. The "Total\\t<amount>" line
    // following it is the amount billed for this week (INR).
    let billRate = undefined
    let payRate  = undefined
    let totalBilled = undefined
    const billSection = all.indexOf("Bill to Buyer")
    if (billSection > 0) {
      const seg = all.slice(billSection, billSection + 1500)
      const rate = seg.match(/Standard Time[^\\n]*\\t([\\d,]+\\.\\d{2})/)
      if (rate) billRate = parseFloat(rate[1].replace(/,/g, ""))
      const totalAmt = seg.match(/Total[\\s\\t]+([\\d,]+\\.\\d{2})/)
      if (totalAmt) totalBilled = parseFloat(totalAmt[1].replace(/,/g, ""))
    }
    const paySection = all.indexOf("Pay to Worker")
    if (paySection > 0) {
      const seg = all.slice(paySection, paySection + 1500)
      const rate = seg.match(/Standard Time[^\\n]*\\t([\\d,]+\\.\\d{2})/)
      if (rate) payRate = parseFloat(rate[1].replace(/,/g, ""))
    }

    // Note: innerText uses TAB to separate cells in the same HTML row.
    // The Time Worked grid renders as:
    //   "Time Worked"
    //   "Day\\t23/2"        ← header lines: <weekday-or-label> TAB <date-or-total>
    //   "Mon\\t24/2"
    //   ...
    //   "Sun\\tTotal Worked"
    //   "Billable"
    //   "<project name>"
    //   "Time Worked\\t0h 0m\\t9h 0m\\t...\\t36h 0m"   ← per-project row
    //   "Total\\t0h 0m\\t9h 0m\\t...\\t36h 0m"          ← row we want (sums all projects)
    //   "Time Sheet Rate Group" or "Accounting (INR)"   ← end marker
    const lines = all.split("\\n")
    let timeWorkedIdx = -1
    let nextSectionIdx = -1
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim()
      if (t === "Time Worked" && timeWorkedIdx < 0) { timeWorkedIdx = i; continue }
      if (timeWorkedIdx >= 0 && nextSectionIdx < 0 &&
          (t === "Time Sheet Rate Group" || t.startsWith("Accounting"))) {
        nextSectionIdx = i; break
      }
    }
    const daily = []
    if (timeWorkedIdx >= 0) {
      const endIdx = nextSectionIdx > 0 ? nextSectionIdx : timeWorkedIdx + 200
      const block = lines.slice(timeWorkedIdx, endIdx)

      // 1. Extract day-of-month dates: header lines "<weekdayOrDay>\\t<DD/M>".
      //    Skip the line whose date-cell is "Total Worked".
      const dates = []
      for (const ln of block) {
        const m = ln.match(/^(Day|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\\t(\\d{1,2}\\/\\d{1,2})$/)
        if (m) dates.push({ dd: m[2].split("/")[0], mm: m[2].split("/")[1] })
      }

      // 2. Find data rows: a row starts with a label (non-empty cell 0)
      //    followed by 8 "Nh Mm" hour cells. Take the LAST one (Total).
      let totalCells = null
      for (const ln of block) {
        const cells = ln.split("\\t")
        if (cells.length < 9) continue
        const tail = cells.slice(cells.length - 8)
        const allHm = tail.every(function(c){ return /^\\d+h\\s*,?\\s*\\d+m$/.test(c.trim()) })
        if (allHm) totalCells = tail   // last 8 = 7 days + 1 row total
      }

      // 3. Build daily entries from first 7 cells (skip per-row total at end).
      const yearStr = (periodStart || periodEnd || "2026-01-01").slice(0, 4)
      if (totalCells && dates.length >= 7) {
        for (let k = 0; k < 7; k++) {
          const hm = totalCells[k].match(/^(\\d+)h\\s*,?\\s*(\\d+)m$/)
          if (!hm) continue
          const hrs = parseInt(hm[1], 10) + parseInt(hm[2], 10) / 60
          const dt = dates[k]
          const isoDate = yearStr + "-" + dt.mm.padStart(2, "0") + "-" + dt.dd.padStart(2, "0")
          daily.push({ date: isoDate, hours: hrs })
        }
      }
    }
    // Week total = sum of daily.hours (more reliable than scraping the
    // "Total Worked" cell, which is ambiguous in multi-project rows).
    const totalHours = daily.reduce(function(s, d){ return s + d.hours }, 0)

    return {
      tsn: tsn, workerId: wid, workerName: workerName,
      periodStart: periodStart, periodEnd: periodEnd, status: status,
      jobPostingId: jobPostingId, jobPostingName: jobPostingName,
      managerName: managerName, managerEmail: managerEmail,
      approverName: approverName, approverEmail: approverEmail, approvedAt: approvedAt,
      legalEntity: legalEntity, site: site, businessUnit: businessUnit,
      contingentType: contingentType,
      payRate: payRate, billRate: billRate,
      totalHours: totalHours, totalBilled: totalBilled,
      daily: daily, scrapedAt: "",
    }
  })()`) as ScrapedTs
}

async function clickThroughList(page: Page, target: { tsn: string; href: string }): Promise<ScrapedTs | null> {
  // Cmd+click the anchor (Mac modifier) so the detail opens in a new
  // tab. This keeps the list page untouched — its date filter + grid
  // pagination stay in place across many iterations.
  const sel = `a[href="${target.href}"]`
  const linkExists = await page.$(sel)
  if (!linkExists) {
    errLog(target.tsn, "anchor not found on current list page")
    return null
  }
  const [popup] = await Promise.all([
    page.context().waitForEvent("page", { timeout: 30_000 }),
    page.click(sel, { modifiers: ["Meta"] }),
  ])
  try {
    await popup.waitForLoadState("domcontentloaded", { timeout: 30_000 }).catch(() => {})
    await popup.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {})
    if (popup.url().includes("auth_error")) {
      errLog(target.tsn, "auth_error in popup")
      return null
    }
    const rec = await scrapeDetail(popup)
    rec.scrapedAt = new Date().toISOString()
    if (!rec.tsn) rec.tsn = target.tsn
    // Diagnostic: when daily is empty for the first record, dump the
    // popup's innerText + HTML so we can fix the parser. One-shot.
    if (rec.daily.length === 0) {
      const dumpPath = path.join(OUT_DIR, "scrape-debug-empty-daily.txt")
      if (!fs.existsSync(dumpPath)) {
        const innerText = await popup.evaluate(`document.body.innerText`)
        fs.writeFileSync(dumpPath, `tsn=${rec.tsn}\nurl=${popup.url()}\n--- innerText ---\n${innerText}`)
        await popup.screenshot({ path: path.join(OUT_DIR, "scrape-debug-empty-daily.png"), fullPage: true })
        log(`✎ saved debug dump to ${dumpPath}`)
      }
    }
    return rec
  } finally {
    await popup.close().catch(() => {})
  }
}

// Apply the From/To date filter on the supplier list page. Inputs accept
// DD/MM/YYYY strings; "Apply Filters" submit reloads the grid with the
// matching window. Each window is small enough (~7 days) to come back
// well under the 1000-row cap, so we never need to paginate.
async function applyDateFilter(page: Page, startDdmmyyyy: string, endDdmmyyyy: string): Promise<number> {
  // Track first-row TSN so we can detect a real refresh vs no-op submit.
  const before = await page.evaluate(() => {
    const a = document.querySelector("a[href*='cgem.us'][href*='time_sheet_detail.do']")
    return (a?.parentElement?.parentElement?.textContent?.match(/CGEMTS\d{8}/) ?? [""])[0]
  })

  // Inputs: clear by triple-click + type, then Tab to commit. The form's
  // calendar widget binds change to specific events; plain .fill() can
  // be ignored. Using sequential focus/select/type/Tab matches a real
  // user typing into the field.
  for (const [sel, val] of [["#filterStartDate", startDdmmyyyy], ["#filterEndDate", endDdmmyyyy]] as const) {
    await page.click(sel, { clickCount: 3 })   // select existing value
    await page.keyboard.press("Backspace")
    await page.keyboard.type(val, { delay: 30 })
    await page.keyboard.press("Tab")           // commit on blur
  }

  // The Apply button starts disabled; typing + blur should enable it.
  // Force-click in case visibility detection misfires.
  await page.click("input[name='timeSheet_supplier_list_search'][value='Apply Filters']", { force: true }).catch(async () => {
    await page.click("input.ttFilterButton", { force: true })
  })

  // Wait for grid to refresh — first row TSN changes OR row count drops to 0
  // (some windows may have 0 results which is also a valid "refresh").
  try {
    await page.waitForFunction((prev) => {
      const a = document.querySelector("a[href*='cgem.us'][href*='time_sheet_detail.do']")
      const cur = (a?.parentElement?.parentElement?.textContent?.match(/CGEMTS\d{8}/) ?? [""])[0]
      // changed, or grid emptied, or "no rows" message visible
      const empty = !a && /No\s+results|no\s+rows|0\s+items?/i.test(document.body.innerText)
      return (cur && cur !== prev) || empty
    }, before, { timeout: 30_000 })
  } catch {
    // fall through; harvest will report 0 rows if grid never updated.
  }
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {})

  // Return harvested-row count so caller can log a sensible progress line.
  const rows = await harvestListPage(page)
  return rows.length
}

async function scrapeOneWindow(
  win: { start: string; end: string },
  done: Set<string>,
): Promise<{ scraped: number; failed: number }> {
  // Each window gets its own browser process. SAP Fieldglass leaks UI
  // state across windows — after ~30 min the filter input becomes
  // unreachable. A fresh login per window avoids the degradation entirely.
  const browser: Browser = await chromium.launch({ headless: false, slowMo: 80 })
  const ctx  = await browser.newContext({ viewport: { width: 1400, height: 950 } })
  const page = await ctx.newPage()
  let scraped = 0, failed = 0

  try {
    await login(page)
    const supplierBase = `https://${new URL(page.url()).host}`

    log(`── window ${win.start} → ${win.end} ──`)
    let filterApplied = false
    for (const attempt of [1, 2]) {
      try {
        if (attempt === 2) log(`  retrying after reload...`)
        await page.goto(`${supplierBase}/time_sheet_list.do`, { waitUntil: "domcontentloaded", timeout: 60_000 })
        await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {})
        await dismissCookieBanner(page)
        await page.waitForSelector("#filterStartDate", { state: "visible", timeout: 30_000 })
        await applyDateFilter(page, win.start, win.end)
        filterApplied = true; break
      } catch (e) {
        errLog(`window-${win.start}-attempt-${attempt}`, e)
        await page.screenshot({ path: path.join(OUT_DIR, `window-${win.start.replace(/\//g, "-")}-fail-${attempt}.png`), fullPage: true }).catch(() => {})
      }
    }
    if (!filterApplied) {
      log(`  ✗ skipping window — filter never applied`)
      return { scraped, failed }
    }

    // Read the grid footer "X-Y of Z" so we know the TRUE row count for
    // this filter. expectedPages = ceil(totalRows / 50). We walk EXACTLY
    // expectedPages with page.goto on the URL fragment — no flaky Next.
    const totalRows = await page.evaluate(() => {
      const txt = document.body.innerText
      const m = txt.match(/(\d+)\s*-\s*(\d+)\s+of\s+(\d+)/)
      return m ? parseInt(m[3], 10) : -1
    }).catch(() => -1)
    log(`  filter result: ${totalRows >= 0 ? totalRows : "unknown"} rows total in grid`)

    let pageNo = 1
    const expectedPages = totalRows > 0 ? Math.ceil(totalRows / 50) : 25
    const MAX_PAGES_PER_WINDOW = Math.max(expectedPages + 2, 5)
    const seenPageSigs = new Set<string>()
    while (true) {
      let rows: { tsn: string; endIso: string; href: string }[]
      try {
        rows = await harvestListPage(page)
      } catch (e) {
        errLog(`harvest-${win.start}-page${pageNo}`, e)
        await page.goto(`${supplierBase}/time_sheet_list.do`, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => {})
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {})
        await dismissCookieBanner(page)
        await applyDateFilter(page, win.start, win.end).catch(() => {})
        await page.waitForTimeout(1000)
        continue
      }
      const target = rows.find(r => !done.has(r.tsn))
      if (!target) {
        log(`win ${win.start}→${win.end} page ${pageNo}: ${rows.length} rows / 0 not-yet-scraped`)
        if (pageNo >= MAX_PAGES_PER_WINDOW) { log(`  hit max-pages cap (${MAX_PAGES_PER_WINDOW})`); break }
        if (rows.length === 0) { log(`  empty page — stopping`); break }
        const firstTsn = rows[0]?.tsn ?? ""
        const sig = rows.map(r => r.tsn).sort().join(",")
        if (seenPageSigs.has(sig)) { log(`  page sig seen — stopping`); break }
        seenPageSigs.add(sig)

        // Use jqx-grid's `gotopage` API (1-indexed) to jump directly to
        // the next page — more deterministic than clicking Next.
        const nextPage = pageNo + 1
        let advanced = false
        try {
          await page.evaluate((p: number) => {
            const w = window as unknown as {
              jQuery?: (sel: string) => { jqxGrid: (action: string, value?: number) => unknown }
            }
            if (w.jQuery) {
              w.jQuery("#timeSheet_supplier_list").jqxGrid("gotopage", p - 1)   // jqx is 0-indexed
            }
          }, nextPage)
          await page.waitForFunction((prev: string) => {
            const a = document.querySelector("a[href*='cgem.us'][href*='time_sheet_detail.do']")
            const cur = (a?.parentElement?.parentElement?.textContent?.match(/CGEMTS\d{8}/) ?? [""])[0]
            return Boolean(cur) && cur !== prev
          }, firstTsn, { timeout: 15_000 })
          await page.waitForTimeout(500)
          advanced = true
        } catch { /* fall back to Next button */ }

        if (!advanced) {
          const next = await page.$("div[role='button'][title='Next']")
          if (!next) { log(`  no Next button`); break }
          const disabled = await next.evaluate(el =>
            el.getAttribute("aria-disabled") === "true"
            || el.classList.contains("jqx-fill-state-disabled"))
          if (disabled) { log(`  Next disabled`); break }
          await next.click()
          try {
            await page.waitForFunction((prev: string) => {
              const a = document.querySelector("a[href*='cgem.us'][href*='time_sheet_detail.do']")
              const cur = (a?.parentElement?.parentElement?.textContent?.match(/CGEMTS\d{8}/) ?? [""])[0]
              return Boolean(cur) && cur !== prev
            }, firstTsn, { timeout: 15_000 })
            await page.waitForTimeout(500)
            advanced = true
          } catch {
            log(`  Next click did not advance — stopping (got ${pageNo}/${expectedPages} pages)`)
            break
          }
        }

        pageNo = nextPage
        continue
      }

      try {
        const rec = await clickThroughList(page, target)
        if (rec && rec.tsn) {
          appendJsonl(rec); done.add(rec.tsn); scraped++
          if (scraped % 10 === 0)
            log(`progress: ${win.start}→${win.end} scraped=${scraped} failed=${failed} last=${rec.tsn}(${rec.daily.length}d)`)
        } else {
          done.add(target.tsn); failed++
        }
      } catch (e) {
        done.add(target.tsn); failed++; errLog(target.tsn, e)
      }
      await page.waitForTimeout(500)
    }
    log(`win ${win.start}→${win.end} complete: ${scraped} scraped, ${failed} failed`)
    return { scraped, failed }
  } catch (e) {
    errLog(`window-${win.start}-fatal`, e)
    log(`  ✗ window aborted: ${(e as Error).message?.slice(0, 120) ?? e}`)
    return { scraped, failed }
  } finally {
    await browser.close().catch(() => {})
  }
}

// Append-only structured progress log alongside the JSONL. Captures every
// window run + pre/post counts so a later session can audit which windows
// have been "cleanly" completed and skip them entirely.
function logRun(entry: Record<string, unknown>) {
  const path = OUT_DIR + "/scrape-progress.log"
  fs.appendFileSync(path, JSON.stringify({ ...entry, ts: new Date().toISOString() }) + "\n")
}

async function run() {
  const done = alreadyDone()
  log(`Resume: ${done.size} cleanly-scraped TSNs already in JSONL.`)
  logRun({ event: "run-start", resumeFromTsns: done.size })

  let totalScraped = 0, totalFailed = 0
  for (const win of WINDOWS) {
    logRun({ event: "window-start", window: `${win.start}→${win.end}`, doneBefore: done.size })
    const { scraped, failed } = await scrapeOneWindow(win, done)
    totalScraped += scraped
    totalFailed  += failed
    logRun({ event: "window-end", window: `${win.start}→${win.end}`, scraped, failed, totalDoneAfter: done.size })
  }

  log(`DONE. totalScraped=${totalScraped} totalFailed=${totalFailed} out=${OUT_FILE}`)
  logRun({ event: "run-end", totalScraped, totalFailed, finalDone: done.size })
}

run().catch((e: unknown) => { console.error(e); process.exit(1) })
