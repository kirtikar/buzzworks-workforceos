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
// March 2026 scope: 6 weekly windows covering Feb 23 → Apr 5. The list
// page filter is two DD/MM/YYYY inputs; using a small window per query
// keeps results well under the 1000-row cap and avoids pagination.
const WINDOWS: { start: string; end: string }[] = [
  { start: "23/02/2026", end: "01/03/2026" },
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
  workerName?:  string
  periodStart?: string
  periodEnd?:   string
  billRate?:    number
  totalHours?:  number
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
function alreadyDone(): Set<string> {
  if (!fs.existsSync(OUT_FILE)) return new Set()
  const done = new Set<string>()
  for (const line of fs.readFileSync(OUT_FILE, "utf-8").split("\n")) {
    if (!line.trim()) continue
    try {
      const r = JSON.parse(line)
      // Tolerate the older `timesheetId` key from prior runs
      const tsn = r.tsn ?? r.timesheetId
      if (tsn) done.add(tsn)
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
      const tsnMatch = text.match(/CGEMTS\d+/)
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
    const tsn = (all.match(/CGEMTS\\d+/) || [""])[0]
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
    const billMatch = all.match(/(?:Bill\\s+Rate|Bill\\s+to\\s+Buyer)[\\s\\S]{0,200}?([\\d,]+\\.\\d{2})/)
    const billRate = billMatch ? parseFloat(billMatch[1].replace(/,/g, "")) : undefined

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
    const totalMatch = all.match(/Total\\s+Worked[\\s\\S]{0,80}?(\\d+)h\\s*,?\\s*(\\d+)m/)
    const totalHours = totalMatch ? parseInt(totalMatch[1], 10) + parseInt(totalMatch[2], 10) / 60 : undefined

    return { tsn: tsn, workerId: wid, periodStart: periodStart, periodEnd: periodEnd, billRate: billRate, totalHours: totalHours, daily: daily, scrapedAt: "" }
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
    return (a?.parentElement?.parentElement?.textContent?.match(/CGEMTS\d+/) ?? [""])[0]
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
      const cur = (a?.parentElement?.parentElement?.textContent?.match(/CGEMTS\d+/) ?? [""])[0]
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

async function run() {
  const browser: Browser = await chromium.launch({ headless: false, slowMo: 80 })
  const ctx  = await browser.newContext({ viewport: { width: 1400, height: 950 } })
  const page = await ctx.newPage()

  try {
    await login(page)

    log("→ navigating to time_sheet_list.do")
    const supplierBase = `https://${new URL(page.url()).host}`
    await page.goto(`${supplierBase}/time_sheet_list.do`, { waitUntil: "domcontentloaded", timeout: 60_000 })
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {})
    await dismissCookieBanner(page)

    const done = alreadyDone()
    log(`Resume: ${done.size} TSNs already in JSONL.`)

    let totalScraped = 0, totalFailed = 0

    for (const win of WINDOWS) {
      log(`── window ${win.start} → ${win.end} ──`)
      await applyDateFilter(page, win.start, win.end)
      let pageNo = 1
      let winScraped = 0
      let prevPageTsns: string[] = []
      while (true) {
        const rows = await harvestListPage(page)
        const targets = rows.filter(r => !done.has(r.tsn))
        log(`win ${win.start}→${win.end} page ${pageNo}: ${rows.length} rows / ${targets.length} not-yet-scraped`)

        // Stop if Next click left us on the same set of TSNs (jqx-grid
        // sometimes reports advance falsely when there's only one page).
        const currentTsns = rows.map(r => r.tsn).sort().join(",")
        const prevSig    = prevPageTsns.sort().join(",")
        if (pageNo > 1 && currentTsns === prevSig) {
          log(`win ${win.start}→${win.end}: page ${pageNo} same as page ${pageNo-1} — stopping pagination`)
          break
        }
        prevPageTsns = rows.map(r => r.tsn)

        for (const target of targets) {
          try {
            const rec = await clickThroughList(page, target)
            if (rec && rec.tsn) {
              appendJsonl(rec); done.add(rec.tsn); totalScraped++; winScraped++
              if (totalScraped % 10 === 0)
                log(`progress: scraped=${totalScraped} failed=${totalFailed} last=${rec.tsn}(${rec.daily.length}d)`)
            } else {
              totalFailed++
            }
          } catch (e) {
            totalFailed++; errLog(target.tsn, e)
          }
          await page.waitForTimeout(600)   // light throttle (~1.5 req/s)
        }

        // Try advancing to next grid page within this window.
        const next = await page.$("div[role='button'][title='Next']")
        if (!next) break
        const disabled = await next.evaluate(el =>
          el.getAttribute("aria-disabled") === "true"
          || el.classList.contains("jqx-fill-state-disabled"))
        if (disabled) break
        const before = (await harvestListPage(page))[0]?.tsn ?? ""
        await next.click()
        try {
          await page.waitForFunction((prev) => {
            const a = document.querySelector("a[href*='cgem.us'][href*='time_sheet_detail.do']")
            const cur = (a?.parentElement?.parentElement?.textContent?.match(/CGEMTS\d+/) ?? [""])[0]
            return cur && cur !== prev
          }, before, { timeout: 15_000 })
        } catch { break }
        pageNo++
      }
      log(`win ${win.start}→${win.end} complete: ${winScraped} scraped`)
    }

    log(`DONE. scraped=${totalScraped} failed=${totalFailed} out=${OUT_FILE}`)
  } finally {
    await browser.close()
  }
}

run().catch(e => { console.error(e); process.exit(1) })
