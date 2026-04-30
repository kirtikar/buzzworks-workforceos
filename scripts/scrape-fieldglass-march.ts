// One-shot scraper: Capgemini Fieldglass time-sheet detail pages → JSONL
//
// Usage:
//   FG_USER=... FG_PASS=... npx tsx scripts/scrape-fieldglass-march.ts
//
// What it does:
//   1. Launches Chromium HEADFULLY so you can watch progress and complete
//      MFA / unfamiliar-device prompts manually if Fieldglass asks.
//   2. Navigates to Fieldglass login, fills creds, waits for landing.
//   3. Pulls the list of March 2026 timesheet IDs from dev.era.ai.
//   4. For each id, navigates to the detail page, parses the daily hours
//      table from the rendered DOM, writes one JSON line per timesheet to
//      out/fieldglass-march-daily.jsonl
//   5. On any single-page failure, logs to out/scrape-errors.log and
//      continues so a transient hiccup doesn't tank the whole run.
//
// Resumability: skips any id already present in the JSONL output. Re-run
// after a crash to pick up where you left off.
//
// SAP Fieldglass HTML can change without notice — if the day-wise selector
// stops finding rows, inspect the live page DOM and update the parsing
// block below. Logged once-per-page when zero rows are found.

import { chromium, type Browser, type Page } from "playwright"
import * as fs from "fs"
import * as path from "path"

const FG_USER = process.env.FG_USER
const FG_PASS = process.env.FG_PASS
const API_BASE = process.env.API_BASE ?? "https://dev.era.ai"
const OUT_DIR  = path.join(process.cwd(), "out")
const OUT_FILE = path.join(OUT_DIR, "fieldglass-march-daily.jsonl")
const ERR_FILE = path.join(OUT_DIR, "scrape-errors.log")

if (!FG_USER || !FG_PASS) {
  console.error("Missing FG_USER / FG_PASS env vars."); process.exit(1)
}

fs.mkdirSync(OUT_DIR, { recursive: true })

interface DailyRow { date: string; hours: number; type?: string; comment?: string }
interface ScrapedTs {
  timesheetId:  string         // CGEMTS… (no cap-fg- prefix)
  workerId?:    string         // CGEMWK… if surfaced on detail
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
    try { done.add(JSON.parse(line).timesheetId) } catch { /* skip */ }
  }
  return done
}

async function fetchMarchIds(): Promise<{ id: string; url: string; periodStart: string; periodEnd: string; employeeId: string }[]> {
  const r = await fetch(`${API_BASE}/api/timesheets/cap`)
  const d = await r.json() as { timesheets: { id: string; periodStart: string; periodEnd: string; employeeId: string; externalUrl?: string }[] }
  // March 2026 = any week whose period overlaps Mar 1..31
  const inMarch = (s: string, e: string) =>
    !(e < "2026-03-01" || s > "2026-03-31")
  return d.timesheets
    .filter(t => inMarch(t.periodStart.slice(0, 10), t.periodEnd.slice(0, 10)))
    .map(t => ({
      id:           t.id.replace(/^cap-fg-/, ""),
      url:          t.externalUrl ?? `https://cgem.us.fieldglass.cloud.sap/time_sheet_detail.do?id=${t.id.replace(/^cap-fg-/, "")}&buyerCode=CGEM&sjkName=CGEM&dataBaseType=sql&startFlow=true`,
      periodStart:  t.periodStart.slice(0, 10),
      periodEnd:    t.periodEnd.slice(0, 10),
      employeeId:   t.employeeId,
    }))
}

async function login(page: Page) {
  log("→ login.fieldglass.net")
  await page.goto("https://www.fieldglass.net/", { waitUntil: "domcontentloaded", timeout: 60_000 })

  // The login form differs across SAP tenants; try common selectors.
  const userSel = "input[name='username'], input[name='user'], #username, input[type='text']"
  const passSel = "input[name='password'], input[type='password']"

  await page.waitForSelector(userSel, { timeout: 30_000 })
  await page.fill(userSel, FG_USER!)
  await page.fill(passSel, FG_PASS!)

  const submitSel = "button[type='submit'], input[type='submit'], button:has-text('Sign In'), button:has-text('Login')"
  await page.click(submitSel)
  log("→ submitted credentials. If MFA / unfamiliar-device appears, complete it in the browser window.")

  // Wait for any post-login URL change — give user up to 5 min for MFA
  await page.waitForURL(url => !url.toString().includes("login"), { timeout: 300_000 })
  log("✓ logged in. URL:", page.url())
}

async function scrapeOne(page: Page, t: { id: string; url: string; periodStart: string; periodEnd: string; employeeId: string }): Promise<ScrapedTs> {
  await page.goto(t.url, { waitUntil: "domcontentloaded", timeout: 45_000 })
  // Detail pages render server-side; give a beat for any AJAX hydration.
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {})

  // Parse the day-wise table from the DOM. Fieldglass renders the daily
  // hours grid as a table; cells under "Total" or per-day columns hold
  // the hours. We walk the visible day cells under any table that
  // contains both date headers and numeric hour values for the period.
  const parsed = await page.evaluate(({ ps, pe }) => {
    const out: { workerId?: string; workerName?: string; billRate?: number; totalHours?: number; daily: { date: string; hours: number; type?: string; comment?: string }[] } = { daily: [] }

    // Worker name + ID often shown in a header strip
    const headerText = document.body.innerText.slice(0, 5000)
    const widMatch = headerText.match(/CGEMWK\d+/)
    if (widMatch) out.workerId = widMatch[0]
    const billMatch = headerText.match(/(?:bill rate|rate)[\s:]*₹?\s*([\d,]+(?:\.\d+)?)/i)
    if (billMatch) out.billRate = parseFloat(billMatch[1].replace(/,/g, ""))

    // Daily grid: walk all <td>/<th> pairs that look like (date, hours)
    // Strategy A: a table with <th> headers as DD-MMM or DD/MM and <td>
    // siblings holding hour values.
    const dayPattern = /^(\d{1,2})[\/\-\s](\d{1,2}|\w{3})[\/\-\s]?(\d{2,4})?$/
    const tables = Array.from(document.querySelectorAll("table"))
    for (const tbl of tables) {
      const rows = Array.from(tbl.querySelectorAll("tr"))
      // Find header row with date-like cells
      const headerRow = rows.find(r =>
        Array.from(r.querySelectorAll("th, td")).filter(c => dayPattern.test((c.textContent ?? "").trim())).length >= 3,
      )
      if (!headerRow) continue
      const headerCells = Array.from(headerRow.querySelectorAll("th, td"))
      const dateCols: { idx: number; date: string }[] = []
      headerCells.forEach((c, idx) => {
        const txt = (c.textContent ?? "").trim()
        if (dayPattern.test(txt)) {
          // Try to construct ISO date — assume the period_start year/month
          // for the given DD; the script also accepts the raw text and
          // post-processes ISO at ingest time.
          dateCols.push({ idx, date: txt })
        }
      })
      // Now find the row(s) with hour values aligned to those columns.
      for (const r of rows) {
        const cells = Array.from(r.querySelectorAll("td"))
        if (cells.length === 0) continue
        // Heuristic: row with at least 3 numeric cells under the date columns
        let numeric = 0
        for (const dc of dateCols) {
          const c = cells[dc.idx]
          if (!c) continue
          const v = parseFloat((c.textContent ?? "").trim())
          if (!isNaN(v) && v >= 0 && v <= 24) numeric++
        }
        if (numeric < 3) continue
        // Got a day-wise hours row. Capture the type from the first non-numeric cell.
        const firstCellTxt = (cells[0]?.textContent ?? "").trim()
        for (const dc of dateCols) {
          const c = cells[dc.idx]
          if (!c) continue
          const v = parseFloat((c.textContent ?? "").trim())
          if (isNaN(v) || v < 0) continue
          out.daily.push({ date: dc.date, hours: v, type: firstCellTxt || undefined })
        }
      }
      if (out.daily.length > 0) break  // first matching table wins
    }

    // Total hours: any "Total" / "Grand Total" cell
    const allText = document.body.innerText
    const totalMatch = allText.match(/(?:grand\s+total|total\s+hours)[\s:]*([\d.]+)/i)
    if (totalMatch) out.totalHours = parseFloat(totalMatch[1])

    return out
  }, { ps: t.periodStart, pe: t.periodEnd })

  if (parsed.daily.length === 0) {
    errLog(t.id, "WARN: zero daily rows parsed — page DOM may have changed")
  }

  return {
    timesheetId:  t.id,
    workerId:     parsed.workerId,
    workerName:   undefined,        // present in CSV; not re-scraped here
    periodStart:  t.periodStart,
    periodEnd:    t.periodEnd,
    billRate:     parsed.billRate,
    totalHours:   parsed.totalHours,
    daily:        parsed.daily,
    scrapedAt:    new Date().toISOString(),
  }
}

async function run() {
  const browser: Browser = await chromium.launch({ headless: false, slowMo: 100 })
  const ctx  = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()

  try {
    await login(page)

    const targets = await fetchMarchIds()
    log(`Found ${targets.length} March 2026 timesheets to scrape`)

    const done = alreadyDone()
    const todo = targets.filter(t => !done.has(t.id))
    log(`Already scraped: ${done.size}. Remaining: ${todo.length}`)

    let ok = 0, fail = 0
    for (let i = 0; i < todo.length; i++) {
      const t = todo[i]
      try {
        const rec = await scrapeOne(page, t)
        appendJsonl(rec)
        ok++
        if ((i + 1) % 25 === 0 || i === todo.length - 1) {
          log(`progress ${i+1}/${todo.length}  ok=${ok}  fail=${fail}  daily-rows-last=${rec.daily.length}`)
        }
      } catch (e) {
        fail++
        errLog(t.id, e)
      }
      // Light throttle so we don't hammer SAP — ~1 req/sec.
      await page.waitForTimeout(800)
    }

    log(`DONE. ok=${ok}  fail=${fail}  out=${OUT_FILE}`)
  } finally {
    await browser.close()
  }
}

run().catch(e => { console.error(e); process.exit(1) })
