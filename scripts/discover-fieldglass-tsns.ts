/* eslint-disable */
// Phase 1 of the post-Apr-27 Fieldglass crawl: TSN DISCOVERY.
//
// Login at the SAP gateway, iterate the 6 week-windows (May 4 → Jun 14),
// apply each date filter, and read the supplier-list jqx-grid's data
// source directly via jqxGrid('getrows'). That returns the complete
// filtered row set regardless of virtual-scroll viewport — solves the
// "only first 16 rows visible" problem cleanly.
//
// Output: out/may-jun-discovery.jsonl, one JSON per line:
//   { tsn, periodStart, periodEnd, status, totalHours, workerName }
//
// This file feeds Phase 2 (scripts/scrape-fieldglass-by-tsn.ts) via the
// MISSING_FILE env var. That script uses the proven per-TSN search
// pattern to extract daily entries reliably.
//
// Usage:
//   FG_USER=… FG_PASS=… npx tsx scripts/discover-fieldglass-tsns.ts

import { chromium, Page } from "playwright"
import * as fs from "fs"
import * as path from "path"

const FG_USER  = process.env.FG_USER
const FG_PASS  = process.env.FG_PASS
const GATEWAY  = process.env.FG_GATEWAY ?? "https://www.us.fieldglass.cloud.sap/"
const OUT_DIR  = path.join(process.cwd(), "out")
const OUT_FILE = path.join(OUT_DIR, "may-jun-discovery.jsonl")

// Mon→Sun weeks AFTER 2026-04-27 (last week already in DB).
const WINDOWS: { start: string; end: string }[] = [
  { start: "04/05/2026", end: "10/05/2026" },
  { start: "11/05/2026", end: "17/05/2026" },
  { start: "18/05/2026", end: "24/05/2026" },
  { start: "25/05/2026", end: "31/05/2026" },
  { start: "01/06/2026", end: "07/06/2026" },
  { start: "08/06/2026", end: "14/06/2026" },
]

if (!FG_USER || !FG_PASS) { console.error("Missing FG_USER / FG_PASS"); process.exit(1) }
fs.mkdirSync(OUT_DIR, { recursive: true })

function log(...a: unknown[]) { console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a) }
function ddmmyyyy_to_iso(s: string): string {
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : ""
}

async function dismissCookieBanner(page: Page) {
  for (const sel of [
    "button:has-text('Accept all')", "button:has-text('Accept All')",
    "button:has-text('Accept')",      "button:has-text('OK')",
    "#truste-consent-button",         "#onetrust-accept-btn-handler",
  ]) {
    try {
      const el = await page.$(sel)
      if (el) { await el.click(); await page.waitForTimeout(300); return }
    } catch { /* try next */ }
  }
}

async function login(page: Page) {
  log("→ login")
  await page.goto(GATEWAY, { waitUntil: "domcontentloaded", timeout: 60_000 })
  await dismissCookieBanner(page)
  // Short-circuit if already on a post-login URL.
  if (/\/(desktop|time_sheet_list|home)\.do/.test(page.url())) {
    const hasPw = await page.$("input[type='password']").catch(() => null)
    if (!hasPw) { log("✓ session reused"); return }
  }
  await page.waitForSelector("input[name='username'], input[type='text']", { timeout: 30_000 })
  await page.fill("input[name='username'], input[type='text']", FG_USER!)
  await page.fill("input[type='password']", FG_PASS!)
  await page.click("button:has-text('Sign In'), button[type='submit'], input[type='submit']", { noWaitAfter: true })
  await page.waitForFunction(
    () => !document.querySelector("input[type='password']") && /desktop\.do/.test(location.href),
    null, { timeout: 300_000 },
  )
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {})
  await dismissCookieBanner(page)
  log(`✓ logged in: ${page.url()}`)
}

// Apply the From/To date filter on the supplier-list page. Inputs accept
// DD/MM/YYYY. The dates come straight from WINDOWS so no reformat needed.
async function applyDateFilter(page: Page, start: string, end: string) {
  // The filter has two inputs called startDate / endDate (sometimes
  // suffixed with date-range component ids).
  await page.waitForSelector("#filterStartDate", { state: "visible", timeout: 30_000 })
  await page.fill("#filterStartDate", start)
  await page.fill("#filterEndDate", end)
  // The Apply Filters button has a stable name attribute.
  const apply = await page.$("input[name='timeSheet_supplier_list_search'][value='Apply Filters']")
  if (apply) {
    await apply.click({ force: true })
  } else {
    // Fallback button label.
    await page.click("button:has-text('Apply Filters'), button:has-text('Apply')", { force: true })
  }
  // Wait for grid refresh — the previous TSN list is replaced.
  await page.waitForTimeout(800)
  await page.waitForLoadState("networkidle", { timeout: 12_000 }).catch(() => {})
}

interface DiscoveryRow {
  tsn: string
  periodStart: string
  periodEnd: string
  status?: string
  totalHours?: number
  workerName?: string
}

// Read every row from the jqx-grid's data source via its public API.
// Bypasses the virtual-scroll viewport entirely — no scrolling needed.
async function harvestAllRows(page: Page, defaultEndIso: string): Promise<DiscoveryRow[]> {
  const apiRows = await page.evaluate(() => {
    const w = window as unknown as {
      jQuery?: (sel: string | HTMLElement) => { jqxGrid: (action: string) => unknown }
      $?:      (sel: string | HTMLElement) => { jqxGrid: (action: string) => unknown }
    }
    const $$ = w.jQuery ?? w.$
    if (!$$) return null
    for (const sel of [
      "#timeSheet_supplier_list",
      "[id^='timesheetlist']",
      "[id*='supplier_list']",
      "div.jqx-grid",
    ]) {
      for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
        try {
          const rows = $$(el).jqxGrid("getrows") as unknown[]
          if (Array.isArray(rows) && rows.length > 0) {
            return { id: el.id || "(no-id)", rows: rows as Record<string, unknown>[] }
          }
        } catch { /* try next */ }
      }
    }
    return null
  })
  if (!apiRows) return []

  const out: DiscoveryRow[] = []
  const seen = new Set<string>()
  for (const r of apiRows.rows) {
    let tsn = ""; let periodEnd = ""; let workerName = ""; let status = ""; let totalHours: number | undefined
    for (const [k, v] of Object.entries(r)) {
      if (typeof v === "string") {
        const m = v.match(/CGEMTS\d{8}/)
        if (m && !tsn) tsn = m[0]
        const dm = Array.from(v.matchAll(/(\d{2})\/(\d{2})\/(\d{4})/g))
        if (dm.length >= 1) {
          const last = dm[dm.length - 1]
          periodEnd = periodEnd || `${last[3]}-${last[2]}-${last[1]}`
        }
        // Status column varies in name; capture any cell that looks like a status keyword.
        if (/^(Pending Approval|Approved|Invoiced|Paid|Submitted|Rejected|Withdrawn)$/.test(v.trim())) {
          status = v.trim()
        }
        // Worker name column: "Last, First" with no digits — pick the
        // first field that matches this shape (best-effort heuristic).
        if (!workerName && /^[A-Z][A-Za-z'.-]+,?\s+[A-Z][A-Za-z'.-]+$/.test(v.trim())) {
          workerName = v.trim()
        }
      } else if (typeof v === "number" && k.toLowerCase().includes("hour")) {
        totalHours = v
      }
    }
    if (!tsn || seen.has(tsn)) continue
    seen.add(tsn)
    out.push({
      tsn,
      // Each row is from the same window, so periodEnd is consistent
      // with this window's filter end. Use filter end as fallback.
      periodEnd: periodEnd || defaultEndIso,
      periodStart: "",     // filled below
      status: status || undefined,
      totalHours,
      workerName: workerName || undefined,
    })
  }
  return out
}

async function discoverWindow(page: Page, win: { start: string; end: string }): Promise<DiscoveryRow[]> {
  const supplierBase = `https://${new URL(page.url()).host}`
  await page.goto(`${supplierBase}/time_sheet_list.do`, { waitUntil: "domcontentloaded", timeout: 60_000 })
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {})
  await dismissCookieBanner(page)
  await applyDateFilter(page, win.start, win.end)
  // Read the grid footer for a sanity check.
  const totalRows = await page.evaluate(() => {
    const m = document.body.innerText.match(/(\d+)\s*-\s*(\d+)\s+of\s+(\d+)/)
    return m ? parseInt(m[3], 10) : -1
  }).catch(() => -1)
  log(`  window ${win.start}→${win.end}: footer reports ${totalRows >= 0 ? totalRows : "?"} rows`)

  const endIso = ddmmyyyy_to_iso(win.end)
  const startIso = ddmmyyyy_to_iso(win.start)
  const rows = await harvestAllRows(page, endIso)
  for (const r of rows) { r.periodStart = startIso; r.periodEnd = endIso }
  log(`  harvested ${rows.length} TSNs (vs ${totalRows} expected)`)
  return rows
}

async function run() {
  const ctx = await chromium.launchPersistentContext(path.join(OUT_DIR, "fg-chrome-profile"), {
    headless: false,
    viewport: { width: 1400, height: 950 },
    executablePath: "/Users/kirtikar/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  })
  const page = ctx.pages()[0] ?? await ctx.newPage()
  // Truncate the output before writing — discovery is cheap and
  // benefits from fresh state each run.
  fs.writeFileSync(OUT_FILE, "")
  try {
    await login(page)
    let total = 0
    for (const win of WINDOWS) {
      try {
        const rows = await discoverWindow(page, win)
        for (const r of rows) fs.appendFileSync(OUT_FILE, JSON.stringify(r) + "\n")
        total += rows.length
      } catch (e) {
        log(`  ✗ window ${win.start} aborted: ${(e as Error).message?.slice(0, 100)}`)
      }
    }
    log(`DONE. ${total} TSNs discovered → ${OUT_FILE}`)
  } finally {
    await ctx.close()
  }
}
run().catch(e => { console.error(e); process.exit(1) })
