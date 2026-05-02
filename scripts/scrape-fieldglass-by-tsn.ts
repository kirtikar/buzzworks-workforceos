// Per-TSN scraper. Avoids jqx-grid's flaky pagination by searching one
// TSN at a time using the supplier list page's ID filter. Each search
// returns exactly 1 row, which we click → scrape detail → back. The
// authoritative TSN list comes from our DB (already imported from the
// supplier-list CSVs), so we know exactly what to scrape.
//
//   FG_USER=... FG_PASS=... \
//     [API_BASE=https://dev.era.ai] \
//     [SCOPE_FROM=2026-03-01] [SCOPE_TO=2026-04-05] \
//     npx tsx scripts/scrape-fieldglass-by-tsn.ts
//
// Resumable. Writes to out/fieldglass-march-daily.jsonl alongside the
// page-walk scraper, sharing the same alreadyDone() gate (7 daily entries
// with at least one non-zero hours).

import { chromium, type Browser, type Page } from "playwright"
import * as fs from "fs"
import * as path from "path"

const FG_USER  = process.env.FG_USER
const FG_PASS  = process.env.FG_PASS
const GATEWAY  = process.env.FG_GATEWAY ?? "https://www.fieldglass.net/"
const API_BASE = process.env.API_BASE ?? "https://dev.era.ai"
const SCOPE_FROM = process.env.SCOPE_FROM ?? "2026-03-01"
const SCOPE_TO   = process.env.SCOPE_TO   ?? "2026-04-05"
const OUT_DIR    = path.join(process.cwd(), "out")
const OUT_FILE   = path.join(OUT_DIR, "fieldglass-march-daily.jsonl")
const ERR_FILE   = path.join(OUT_DIR, "scrape-errors.log")

if (!FG_USER || !FG_PASS) { console.error("Missing FG_USER / FG_PASS"); process.exit(1) }
fs.mkdirSync(OUT_DIR, { recursive: true })

interface DailyRow { date: string; hours: number }
interface ScrapedTs {
  tsn:        string
  workerId?:  string
  workerName?: string
  periodStart?: string
  periodEnd?:   string
  status?: string
  jobPostingId?: string
  jobPostingName?: string
  managerName?: string
  managerEmail?: string
  approverName?: string
  approverEmail?: string
  approvedAt?: string
  legalEntity?: string
  site?: string
  businessUnit?: string
  contingentType?: string
  payRate?: number
  billRate?: number
  totalHours?: number
  totalBilled?: number
  daily: DailyRow[]
  scrapedAt: string
}

function log(...a: unknown[]) {
  console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a)
}
function errLog(id: string, err: unknown) {
  fs.appendFileSync(ERR_FILE, `${new Date().toISOString()} ${id} ${err instanceof Error ? err.stack : String(err)}\n`)
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
    "#onetrust-accept-btn-handler", "button#truste-consent-button",
    "button:has-text('Accept All Cookies')", "button:has-text('Accept All')",
    "button:has-text('Accept all')", "button:has-text('Accept')",
  ]
  for (const sel of sels) {
    try {
      const el = await page.waitForSelector(sel, { timeout: 3_000, state: "visible" })
      if (el) { await el.click(); await page.waitForTimeout(400); return }
    } catch { /* try next */ }
  }
}

async function login(page: Page) {
  log("→ login")
  await page.goto(GATEWAY, { waitUntil: "domcontentloaded", timeout: 60_000 })
  await dismissCookieBanner(page)
  await page.waitForSelector("input[name='username'], input[type='text']", { timeout: 30_000 })
  await page.fill("input[name='username'], input[type='text']", FG_USER!)
  await page.fill("input[type='password']", FG_PASS!)
  // noWaitAfter: don't block on the navigation Playwright would otherwise
  // auto-wait for. We have an explicit waitForFunction below.
  await page.click("button:has-text('Sign In'), button[type='submit'], input[type='submit']", { noWaitAfter: true })
  await page.waitForFunction(() => !document.querySelector("input[type='password']"), null, { timeout: 300_000 })
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {})
  await dismissCookieBanner(page)
  log(`✓ logged in: ${page.url()}`)
}

// Fetch the authoritative TSN list. Either:
//   (a) MISSING_FILE — replay just the missing-TSN log file (one JSON per
//       line: { tsn, periodStart, periodEnd }). Used to retry the residue
//       from a prior full-scope run.
//   (b) default — pull the full scope from /api/timesheets/cap and filter
//       by [SCOPE_FROM, SCOPE_TO].
// Each entry carries its own week so the search applies a tight 7-day
// date filter alongside the ID match.
interface Target { tsn: string; periodStart: string; periodEnd: string }
async function fetchTargetTsns(): Promise<Target[]> {
  const missingFile = process.env.MISSING_FILE
  if (missingFile && fs.existsSync(missingFile)) {
    log(`→ loading targets from missing-list ${missingFile}`)
    const out: Target[] = []
    for (const line of fs.readFileSync(missingFile, "utf-8").split("\n")) {
      if (!line.trim()) continue
      try {
        const r = JSON.parse(line)
        if (r.tsn && r.periodStart && r.periodEnd) {
          out.push({ tsn: r.tsn, periodStart: r.periodStart, periodEnd: r.periodEnd })
        }
      } catch { /* skip bad lines */ }
    }
    return out
  }

  log(`→ fetching TSN scope from ${API_BASE}`)
  const r = await fetch(`${API_BASE}/api/timesheets/cap`)
  const d = await r.json() as {
    timesheets: { id: string; periodStart: string; periodEnd: string }[]
  }
  const overlap = (s: string, e: string) =>
    !(e < SCOPE_FROM || s > SCOPE_TO)
  return d.timesheets
    .filter(t => overlap(t.periodStart.slice(0, 10), t.periodEnd.slice(0, 10)))
    .map(t => ({
      tsn:         t.id.replace(/^cap-fg-/, ""),
      periodStart: t.periodStart.slice(0, 10),
      periodEnd:   t.periodEnd.slice(0, 10),
    }))
}

async function searchAndOpenByTsn(
  page: Page, supplierBase: string, target: Target,
): Promise<Page | null> {
  // Navigate to a fresh list page each time so the previous filter doesn't
  // hang around. Then set date filter = TSN's own week, plus type the TSN
  // into the ID search input.
  await page.goto(`${supplierBase}/time_sheet_list.do`, { waitUntil: "domcontentloaded", timeout: 45_000 })
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {})
  await dismissCookieBanner(page)
  await page.waitForSelector("input[name='timeSheet_supplier_list_time_sheet_ref_sch']", { state: "visible", timeout: 20_000 })

  const ddmmyy = (iso: string) => {
    const [y, m, d] = iso.split("-")
    return `${d}/${m}/${y}`
  }
  for (const [sel, val] of [["#filterStartDate", ddmmyy(target.periodStart)],
                            ["#filterEndDate",   ddmmyy(target.periodEnd)]] as const) {
    await page.click(sel, { clickCount: 3 })
    await page.keyboard.press("Backspace")
    await page.keyboard.type(val, { delay: 20 })
    await page.keyboard.press("Tab")
  }

  const idInput = "input[name='timeSheet_supplier_list_time_sheet_ref_sch']"
  await page.click(idInput, { clickCount: 3 })
  await page.keyboard.press("Backspace")
  await page.keyboard.type(target.tsn, { delay: 20 })

  await page.click("input[name='timeSheet_supplier_list_search'][value='Apply Filters']", { force: true })
  try {
    await page.waitForFunction((tsn: string) => {
      const a = document.querySelector(`a[href*='cgem.us'][href*='time_sheet_detail.do']`)
      const txt = a?.parentElement?.parentElement?.textContent ?? ""
      return txt.includes(tsn) || /No\s+results|no\s+rows/i.test(document.body.innerText)
    }, target.tsn, { timeout: 15_000 })
  } catch {
    return null
  }

  const anchor = await page.$(`a[href*='cgem.us'][href*='time_sheet_detail.do']`)
  if (!anchor) return null

  // Cmd+click to open detail in a new tab (preserves list page).
  const [popup] = await Promise.all([
    page.context().waitForEvent("page", { timeout: 30_000 }),
    anchor.click({ modifiers: ["Meta"] }),
  ])
  return popup
}

async function scrapeDetail(popup: Page): Promise<ScrapedTs> {
  await popup.waitForLoadState("domcontentloaded", { timeout: 30_000 }).catch(() => {})
  await popup.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {})
  await popup.waitForFunction(
    `document.body && /Time Worked/.test(document.body.innerText)`,
    null, { timeout: 20_000 },
  ).catch(() => {})
  await popup.waitForTimeout(600)

  return await popup.evaluate(`(() => {
    if (!document.body) return { tsn: "", daily: [], scrapedAt: "" }
    const all = document.body.innerText
    const tsn = (all.match(/CGEMTS\\d{8}/) || [""])[0]
    const wid = (all.match(/CGEMWK\\d+/) || [""])[0]
    const periodMatch = all.match(/(\\d{2}\\/\\d{2}\\/\\d{4})\\s+to\\s+(\\d{2}\\/\\d{2}\\/\\d{4})/)
    let periodStart = "", periodEnd = ""
    if (periodMatch) {
      const a = periodMatch[1].match(/(\\d{2})\\/(\\d{2})\\/(\\d{4})/)
      const b = periodMatch[2].match(/(\\d{2})\\/(\\d{2})\\/(\\d{4})/)
      if (a) periodStart = a[3] + "-" + a[2] + "-" + a[1]
      if (b) periodEnd   = b[3] + "-" + b[2] + "-" + b[1]
    }
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
    const statusMatch = all.match(/\\b(Pending Approval|Invoiced|Paid|Approval Paused|Pending Review|Approved|Rejected)\\b/)
    const status = statusMatch ? statusMatch[1] : ""
    const jpMatch = all.match(/([A-Za-z][^\\n\\t]{2,80}?)\\s*[-:\\s]\\s*(CGEMUP\\d+)/)
    const jobPostingId = jpMatch ? jpMatch[2] : (all.match(/CGEMUP\\d+/) || [""])[0]
    const jobPostingName = jpMatch ? jpMatch[1].trim() : ""
    const mgrMatch = all.match(/Work Order(?:\\/Work Order)? Revision Owner[\\s\\t]*([^\\n(]+)\\(([^)]+)\\)/)
    const managerName  = mgrMatch ? mgrMatch[1].trim() : ""
    const managerEmail = mgrMatch ? mgrMatch[2].trim() : ""
    const approverMatch = all.match(/(\\d{2}\\/\\d{2}\\/\\d{4} \\d{2}:\\d{2} (?:AM|PM))[\\s\\t]+([^\\n(]+)\\(([^)]+)\\)[\\s\\t]+Approved/)
    const approverName  = approverMatch ? approverMatch[2].trim() : ""
    const approverEmail = approverMatch ? approverMatch[3].trim() : ""
    let approvedAt = ""
    if (approverMatch) {
      const m = approverMatch[1].match(/(\\d{2})\\/(\\d{2})\\/(\\d{4}) (\\d{2}):(\\d{2}) (AM|PM)/)
      if (m) {
        let hh = parseInt(m[4], 10); if (m[6] === "PM" && hh < 12) hh += 12; if (m[6] === "AM" && hh === 12) hh = 0
        approvedAt = m[3] + "-" + m[2] + "-" + m[1] + "T" + String(hh).padStart(2,"0") + ":" + m[5] + ":00"
      }
    }
    const legalEntityMatch = all.match(/Legal Entity\\s*\\n?\\s*\\t?\\s*([A-Z]{2}\\d{2,})/)
    const legalEntity = legalEntityMatch ? legalEntityMatch[1] : ""
    const siteMatch = all.match(/Site[\\s\\t]+([^\\n]+CAPGEMINI[^\\n]+)/)
    const site = siteMatch ? siteMatch[1].trim() : ""
    const buMatch = all.match(/Business Unit[\\s\\t]+([^\\n]+)/)
    const businessUnit = buMatch ? buMatch[1].trim() : ""
    const ctMatch = all.match(/Contingent Type[\\s\\t]+([A-Za-z][^\\n]{0,40})/)
    const contingentType = ctMatch ? ctMatch[1].trim() : ""
    let billRate = undefined, payRate = undefined, totalBilled = undefined
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
    const lines = all.split("\\n")
    let timeWorkedIdx = -1, nextSectionIdx = -1
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
      const dates = []
      for (const ln of block) {
        const m = ln.match(/^(Day|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\\t(\\d{1,2}\\/\\d{1,2})$/)
        if (m) dates.push({ dd: m[2].split("/")[0], mm: m[2].split("/")[1] })
      }
      let totalCells = null
      for (const ln of block) {
        const cells = ln.split("\\t")
        if (cells.length < 9) continue
        const tail = cells.slice(cells.length - 8)
        const allHm = tail.every(function(c){ return /^\\d+h\\s*,?\\s*\\d+m$/.test(c.trim()) })
        if (allHm) totalCells = tail
      }
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

function logProgress(entry: Record<string, unknown>) {
  fs.appendFileSync(path.join(OUT_DIR, "scrape-progress.log"),
    JSON.stringify({ ...entry, ts: new Date().toISOString() }) + "\n")
}

// Re-login periodically — SAP session can degrade after ~30-60 min.
const RELOGIN_EVERY = 50

async function run() {
  const targets = await fetchTargetTsns()
  log(`scope: ${targets.length} TSNs in [${SCOPE_FROM} … ${SCOPE_TO}]`)
  const done = alreadyDone()
  const todo = targets.filter(t => !done.has(t.tsn))
  log(`done: ${done.size} cleanly-scraped already → todo: ${todo.length}`)
  logProgress({ event: "by-tsn-run-start", scope: targets.length, alreadyDone: done.size, todo: todo.length })

  let scraped = 0, failed = 0
  let browser: Browser | null = null
  let page: Page | null = null
  let supplierBase = ""

  async function startSession() {
    if (browser) await browser.close().catch(() => {})
    let lastErr: unknown = null
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        browser = await chromium.launch({ headless: false, slowMo: 60 })
        const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } })
        page = await ctx.newPage()
        await login(page)
        supplierBase = `https://${new URL(page.url()).host}`
        return
      } catch (e) {
        lastErr = e
        log(`  login attempt ${attempt} failed: ${(e as Error).message?.slice(0, 80)}`)
        if (browser) await browser.close().catch(() => {})
        await new Promise(r => setTimeout(r, 5000))
      }
    }
    throw lastErr
  }

  await startSession()

  for (let i = 0; i < todo.length; i++) {
    const target = todo[i]
    if (i > 0 && i % RELOGIN_EVERY === 0) {
      log(`── re-login at i=${i} (every ${RELOGIN_EVERY}) ──`)
      await startSession()
    }

    let popup: Page | null = null
    try {
      popup = await searchAndOpenByTsn(page!, supplierBase, target)
      if (!popup) {
        failed++
        errLog(target.tsn, "no result for ID search")
        continue
      }
      const rec = await scrapeDetail(popup)
      rec.scrapedAt = new Date().toISOString()
      if (!rec.tsn) rec.tsn = target.tsn
      appendJsonl(rec)
      done.add(rec.tsn)
      scraped++
      if (scraped % 10 === 0)
        log(`progress: ${scraped}/${todo.length} (failed=${failed}) last=${rec.tsn}(${rec.daily.length}d)`)
    } catch (e) {
      failed++
      errLog(target.tsn, e)
    } finally {
      if (popup) await popup.close().catch(() => {})
    }
    await page!.waitForTimeout(400)
  }

  log(`DONE. scraped=${scraped} failed=${failed}`)
  logProgress({ event: "by-tsn-run-end", scraped, failed })
  const b = browser as Browser | null
  if (b) await b.close().catch(() => {})
}

run().catch((e: unknown) => { console.error(e); process.exit(1) })
