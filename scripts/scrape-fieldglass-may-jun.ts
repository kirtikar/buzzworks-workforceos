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
// 2026-06: the old gateway (https://www.fieldglass.net/) now returns
// a static "no longer available" page redirecting to the new SAP-
// branded URL. The previous scraper kept hitting the old URL and
// timing out on the missing login form. Switching to the new gateway.
const GATEWAY = process.env.FG_GATEWAY ?? "https://www.us.fieldglass.cloud.sap/"
const OUT_DIR  = path.join(process.cwd(), "out")
const OUT_FILE = path.join(OUT_DIR, "fieldglass-may-jun-daily.jsonl")
const ERR_FILE = path.join(OUT_DIR, "scrape-may-jun-errors.log")
// May/June 2026 scope — the 6 Mon→Sun weeks that start AFTER the
// 2026-04-27 → 2026-05-03 boundary (which is already in the DB up
// to 2026-04-27 latest period_start).  Per-window ≤ 1000 rows so
// the supplier list shows everything matching the date filter.
const WINDOWS: { start: string; end: string }[] = [
  { start: "04/05/2026", end: "10/05/2026" },
  { start: "11/05/2026", end: "17/05/2026" },
  { start: "18/05/2026", end: "24/05/2026" },
  { start: "25/05/2026", end: "31/05/2026" },
  { start: "01/06/2026", end: "07/06/2026" },
  { start: "08/06/2026", end: "14/06/2026" },
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

// Detect whether we're already authenticated by visiting the supplier
// gateway. We only consider it "authed" when the page settles on a
// post-login URL (desktop.do or one of the tenant work pages) AND
// there is no password input on the page. The gateway HOSTNAME alone
// is NOT enough — the public gateway lives at *.fieldglass.cloud.sap
// too, so matching just the host was false-positive.
async function isAuthed(page: Page): Promise<boolean> {
  try {
    await page.goto(GATEWAY, { waitUntil: "domcontentloaded", timeout: 60_000 })
    await page.waitForLoadState("networkidle", { timeout: 12_000 }).catch(() => {})
    const u = page.url()
    // Must be on a post-login page path, NOT the gateway homepage.
    const isPostLoginPath = /\/(desktop|time_sheet_list|home|work_item_list)\.do/i.test(u)
    if (!isPostLoginPath) return false
    const hasPw = await page.$("input[type='password']").catch(() => null)
    return hasPw === null
  } catch {
    return false
  }
}

async function login(page: Page) {
  // FALLBACK: when MANUAL_LOGIN=1, just open the gateway and let the
  // operator sign in interactively (handles MFA, captchas, new SSO
  // flows that have broken since the script was written). The
  // persistent browser context preserves the cookies for subsequent
  // runs so this only has to happen once.
  if (process.env.MANUAL_LOGIN === "1") {
    log("→ MANUAL_LOGIN mode: opening", GATEWAY, "— please sign in in the Chrome window")
    await page.goto(GATEWAY, { waitUntil: "domcontentloaded", timeout: 60_000 })
    await page.waitForFunction(
      () => /fieldglass\.cloud\.sap|desktop\.do/i.test(location.href),
      null, { timeout: 10 * 60_000 },                                // 10 min budget for human
    )
    log("✓ logged in (manual). URL:", page.url())
    await dismissCookieBanner(page)
    return
  }

  log("→ tenant login via gateway:", GATEWAY)
  if (await isAuthed(page)) {
    log("✓ already authenticated (cookies reused). URL:", page.url())
    await dismissCookieBanner(page)
    return
  }

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

// Read ALL rows from the jqx-grid's data source via its public JS API
// — bypasses the virtual-scroll viewport entirely. jqxGrid('getrows')
// returns the full filtered dataset; we just translate field names.
// Falls back to a viewport scroll if the grid isn't exposed (e.g.,
// older SAP versions or different grid ids).
async function harvestListAllRows(
  page: Page,
  expectedTotal: number,
  log: (...a: unknown[]) => void,
): Promise<{ tsn: string; endIso: string; href: string }[]> {
  // Discover the jqx-grid element ID, then call getrows on it.
  const apiRows = await page.evaluate(() => {
    type Row = Record<string, unknown>
    const w = window as unknown as {
      jQuery?: (sel: string | HTMLElement) => { jqxGrid: (action: string) => unknown }
      $?:      (sel: string | HTMLElement) => { jqxGrid: (action: string) => unknown }
    }
    const $$ = w.jQuery ?? w.$
    if (!$$) return null
    // Try known IDs first, then scan for any jqx-grid element on the page.
    const candidates: HTMLElement[] = []
    for (const sel of [
      "#timeSheet_supplier_list",
      "[id^='timesheetlist']",
      "[id*='supplier_list']",
      "div.jqx-grid",
    ]) {
      document.querySelectorAll<HTMLElement>(sel).forEach(el => candidates.push(el))
    }
    for (const el of candidates) {
      try {
        const rows = $$(el).jqxGrid("getrows") as Row[] | undefined
        if (Array.isArray(rows) && rows.length > 0) {
          return { id: el.id || "(no-id)", rows }
        }
      } catch { /* try next */ }
    }
    return null
  })

  if (apiRows && Array.isArray(apiRows.rows) && apiRows.rows.length > 0) {
    log(`  jqx-getrows: grid="${apiRows.id}" returned ${apiRows.rows.length} rows`)
    const out: { tsn: string; endIso: string; href: string }[] = []
    const seen = new Set<string>()
    for (const r of apiRows.rows as Record<string, unknown>[]) {
      // Field names vary across SAP versions; collect any TSN-shaped
      // value from the row's values.
      let tsn = ""
      let endIso = ""
      for (const v of Object.values(r)) {
        if (typeof v === "string") {
          const m = v.match(/CGEMTS\d{8}/)
          if (m) { tsn = m[0]; continue }
          // Capture week-end date if present (DD/MM/YYYY → ISO).
          const dm = v.match(/(\d{2})\/(\d{2})\/(\d{4})/g)
          if (dm && dm.length >= 1) {
            const last = dm[dm.length - 1].match(/(\d{2})\/(\d{2})\/(\d{4})/)
            if (last) endIso = endIso || `${last[3]}-${last[2]}-${last[1]}`
          }
        }
      }
      if (!tsn || seen.has(tsn)) continue
      seen.add(tsn)
      // Construct the detail href deterministically. SAP serves the
      // timesheet detail at the buyer tenant with the TSN as the id
      // query param + the standard buyer flow flags. Matches the
      // external_url shape we already store in DB.
      const href = `https://cgem.us.fieldglass.cloud.sap/time_sheet_detail.do?id=${tsn}&buyerCode=CGEM&sjkName=CGEM&dataBaseType=sql&startFlow=true`
      out.push({ tsn, endIso, href })
    }
    if (out.length > 0) {
      log(`  parsed ${out.length} unique TSNs from getrows()`)
      return out
    }
    log(`  getrows() returned data but no TSNs parsed — falling back to viewport scroll`)
  } else {
    log(`  jqx getrows API not available on this page — falling back to viewport scroll`)
  }

  // FALLBACK: viewport scroll (used to be the primary path; kept for
  // compatibility if the API path can't find the grid).
  const all = new Map<string, { tsn: string; endIso: string; href: string }>()
  let stagnantSteps = 0
  for (let step = 0; step < 200; step++) {
    const rows = await harvestListPage(page)
    let newCount = 0
    for (const r of rows) {
      if (!all.has(r.tsn)) { all.set(r.tsn, r); newCount++ }
    }
    if (step % 5 === 0 || newCount === 0) {
      log(`  fallback-scroll step ${step}: visible=${rows.length} total=${all.size}/${expectedTotal} (+${newCount} new)`)
    }
    stagnantSteps = newCount === 0 ? stagnantSteps + 1 : 0
    if (all.size >= expectedTotal && stagnantSteps >= 1) break
    if (stagnantSteps >= 4) break
    await page.evaluate(() => {
      const cs = document.querySelectorAll(".jqx-grid-content") as NodeListOf<HTMLElement>
      for (const el of cs) el.scrollTop = el.scrollTop + el.clientHeight * 0.85
      window.scrollBy(0, 600)
    })
    await page.waitForTimeout(500)
  }
  return [...all.values()]
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
  // Two strategies, in order:
  //   1) If a matching anchor IS rendered on the current list page,
  //      Cmd+click it to open detail in a new tab (preserves the list
  //      page's date filter for subsequent iterations).
  //   2) Otherwise (post-getrows path — only 16 anchors rendered at
  //      a time, but we know ALL TSNs from the data API), open a new
  //      tab and navigate to target.href directly.
  const sel = `a[href="${target.href}"]`
  const linkExists = await page.$(sel)

  let popup: Page
  if (linkExists) {
    const result = await Promise.all([
      page.context().waitForEvent("page", { timeout: 30_000 }),
      page.click(sel, { modifiers: ["Meta"] }),
    ])
    popup = result[0]
  } else {
    popup = await page.context().newPage()
    try {
      await popup.goto(target.href, { waitUntil: "domcontentloaded", timeout: 45_000 })
    } catch (e) {
      errLog(target.tsn, `direct nav failed: ${(e as Error).message?.slice(0, 80)}`)
      await popup.close().catch(() => {})
      return null
    }
  }
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
  // Reuse the cached chromium-1217 that the previous scraper installs
  // saved — avoids re-downloading hundreds of MB every time playwright
  // is re-installed (which kept happening as we toggled deps).
  const chromiumFallback = "/Users/kirtikar/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
  // Persistent user-data dir: cookies + localStorage survive across
  // runs and across windows. The operator only needs to authenticate
  // ONCE (via MANUAL_LOGIN=1 on the first run) — subsequent windows
  // and subsequent script invocations reuse that session.
  const userDataDir = path.join(OUT_DIR, "fg-chrome-profile")
  fs.mkdirSync(userDataDir, { recursive: true })
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 80,
    viewport: { width: 1400, height: 950 },
    executablePath: fs.existsSync(chromiumFallback) ? chromiumFallback : undefined,
  })
  // Persistent-context API doesn't return a Browser. Re-cast for the
  // `browser.close()` call later — they share the close() shape.
  const browser = ctx.browser() ?? ({ close: () => ctx.close() } as unknown as Browser)
  const page = ctx.pages()[0] ?? await ctx.newPage()
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

    // NEW (post-2026-06 SAP-gateway): the supplier list is a single
    // virtual-scroll jqx-grid that renders ALL filtered rows in one
    // "page" — there's no real pagination. Harvest by scrolling the
    // inner viewport until every TSN is captured. Then iterate.
    const allTargets = await harvestListAllRows(
      page,
      totalRows > 0 ? totalRows : 1000,
      log,
    )
    log(`  harvest complete: ${allTargets.length}/${totalRows >= 0 ? totalRows : "?"} TSNs collected`)

    // Filter out anything already scraped in a previous run (resumable).
    const remaining = allTargets.filter(t => !done.has(t.tsn))
    log(`  ${remaining.length} TSNs to scrape this window (${done.size} previously done)`)

    for (let i = 0; i < remaining.length; i++) {
      const target = remaining[i]
      try {
        const rec = await clickThroughList(page, target)
        if (rec && rec.tsn) {
          appendJsonl(rec); done.add(rec.tsn); scraped++
          if (scraped % 10 === 0)
            log(`progress: ${win.start}→${win.end} scraped=${scraped}/${remaining.length} failed=${failed} last=${rec.tsn}(${rec.daily.length}d)`)
        } else {
          done.add(target.tsn); failed++
        }
      } catch (e) {
        done.add(target.tsn); failed++; errLog(target.tsn, e)
      }
      await page.waitForTimeout(400)
      // Re-login every 50 records — Fieldglass session degrades.
      if ((i + 1) % 50 === 0 && i + 1 < remaining.length) {
        log(`  ── re-login at i=${i + 1} (every 50) ──`)
        try {
          await login(page)
          // Re-apply the date filter so we land back on the same window.
          await page.goto(`${supplierBase}/time_sheet_list.do`, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => {})
          await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {})
          await dismissCookieBanner(page)
          await applyDateFilter(page, win.start, win.end).catch(() => {})
        } catch (e) {
          log(`  ✗ re-login failed: ${(e as Error).message?.slice(0, 80)}`)
        }
      }
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
