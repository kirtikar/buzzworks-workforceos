/* eslint-disable */
// Probe one Fieldglass Worker page and dump per-tab HTML to disk.
//
// Goal: capture real DOM structure for each tab (Overview, Job, Time,
// Documents, Tasks, Compliance, Equipment, Approvers, …) so we can
// build precise parsers in scrape-fieldglass-workers.ts.
//
// Usage:
//   FG_USER=… FG_PASS=… npx tsx scripts/probe-fieldglass-worker.ts
//
//   Or to probe a specific worker:
//   WORKER_URL=https://www.us.fieldglass.cloud.sap/worker_detail.do?id=… \
//     npx tsx scripts/probe-fieldglass-worker.ts
//
// Output:
//   out/probe-worker/<worker_id>/list.html         (the My Workers list)
//   out/probe-worker/<worker_id>/<tab-slug>.html   (each tab's HTML)
//   out/probe-worker/<worker_id>/<tab-slug>.txt    (each tab's innerText)
//   out/probe-worker/<worker_id>/screenshot.png

import { chromium, Page } from "playwright"
import * as fs from "node:fs"
import * as path from "node:path"

const FG_USER  = process.env.FG_USER
const FG_PASS  = process.env.FG_PASS
const GATEWAY  = process.env.FG_GATEWAY ?? "https://www.fieldglass.net/"
const WORKER_URL_OVERRIDE = process.env.WORKER_URL
const OUT_DIR  = "out/probe-worker"

if (!FG_USER || !FG_PASS) {
  console.error("FG_USER and FG_PASS env vars required.")
  process.exit(1)
}

function ts() { return new Date().toISOString().replace("T", " ").slice(11, 19) }
function log(s: string) { console.log(`[${ts()}] ${s}`) }

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

async function login(page: Page) {
  log("→ login")
  await page.goto(GATEWAY, { waitUntil: "domcontentloaded", timeout: 60_000 })
  // Same flow as scrape-fieldglass-by-tsn.ts
  await page.fill('input[name="username"], input#username, input[type="text"]', FG_USER!)
  await page.fill('input[name="password"], input#password, input[type="password"]', FG_PASS!)
  await Promise.all([
    page.waitForURL(/desktop\.do|fieldglass\.cloud\.sap/, { timeout: 60_000 }),
    page.click('button[type="submit"], input[type="submit"]'),
  ])
  log(`✓ logged in: ${page.url()}`)
}

async function findFirstWorkerUrl(page: Page): Promise<string> {
  // Navigate to the supplier's Worker list. SAP Fieldglass supplier
  // tenants surface a "Workers" or "Personnel" link in the left rail.
  const supplierBase = new URL(page.url()).origin
  log(`→ navigating to worker list at ${supplierBase}`)
  // Try the canonical worker list path (mirror of time_sheet_list.do).
  const candidates = [
    `${supplierBase}/worker_list.do`,
    `${supplierBase}/personnel_list.do`,
    `${supplierBase}/workers.do`,
  ]
  for (const url of candidates) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 })
      const html = await page.content()
      if (/worker|personnel/i.test(html)) {
        log(`✓ list at ${url}`)
        // Save the list HTML for review.
        fs.writeFileSync(path.join(OUT_DIR, "list.html"), html)
        await page.screenshot({ path: path.join(OUT_DIR, "list.png"), fullPage: true })
        // First worker link.
        const href = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
            .filter(a => /worker_detail\.do|personnel_detail\.do/i.test(a.href))
          return links[0]?.href ?? null
        })
        if (href) return href
      }
    } catch (e) {
      log(`  skipped ${url}: ${(e as Error).message?.slice(0, 60)}`)
    }
  }
  throw new Error("Could not locate worker list page. Check supplier tenant URL.")
}

async function dumpTab(page: Page, label: string, outDir: string) {
  const html = await page.content()
  const text = await page.evaluate(() => document.body.innerText)
  fs.writeFileSync(path.join(outDir, `${slug(label)}.html`), html)
  fs.writeFileSync(path.join(outDir, `${slug(label)}.txt`), text)
  log(`  · saved tab "${label}" (${html.length} bytes html, ${text.length} bytes text)`)
}

async function probeAllTabs(page: Page, workerUrl: string) {
  log(`→ open worker: ${workerUrl}`)
  await page.goto(workerUrl, { waitUntil: "domcontentloaded", timeout: 60_000 })
  // Pull worker_id from URL or the page header.
  const workerId = (workerUrl.match(/[?&]id=([^&]+)/)?.[1] ?? "unknown").replace(/[^A-Za-z0-9_-]/g, "")
  const outDir = path.join(OUT_DIR, workerId)
  fs.mkdirSync(outDir, { recursive: true })
  log(`output dir: ${outDir}`)

  // Default landing page = Overview tab (or the first visible tab).
  await dumpTab(page, "00-landing", outDir)
  await page.screenshot({ path: path.join(outDir, "screenshot.png"), fullPage: true })

  // Discover all tab links/buttons. SAP Fieldglass typically uses
  // <a class="tab"…> or role="tab" elements. We grab all distinct
  // tab labels that exist on this page.
  const tabs = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(
      'a[role="tab"], div[role="tab"], li[role="tab"], a.tab, .tabs a, .tab-list a, [data-tab]'
    ))
    const out: { label: string; href: string | null }[] = []
    for (const el of candidates) {
      const label = (el.innerText || el.textContent || "").trim()
      if (!label || label.length > 60) continue
      const href = el instanceof HTMLAnchorElement ? el.href : null
      out.push({ label, href })
    }
    return out
  })
  log(`  found ${tabs.length} tab candidates: ${tabs.map(t => t.label).slice(0, 10).join(" | ")}…`)
  fs.writeFileSync(path.join(outDir, "_tabs.json"), JSON.stringify(tabs, null, 2))

  // Click each tab in turn. After a click the URL or the visible
  // section changes — we wait for network idle and dump.
  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i]
    try {
      log(`  → click tab "${tab.label}"`)
      // Find by text again (DOM may have re-rendered).
      const clicked = await page.evaluate((label) => {
        const els = Array.from(document.querySelectorAll<HTMLElement>(
          'a[role="tab"], div[role="tab"], li[role="tab"], a.tab, .tabs a, .tab-list a, [data-tab]'
        ))
        const el = els.find(e => (e.innerText || "").trim() === label)
        if (el) { (el as HTMLElement).click(); return true }
        return false
      }, tab.label)
      if (!clicked) { log(`    · could not click "${tab.label}"`); continue }
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {})
      await new Promise(r => setTimeout(r, 800))
      await dumpTab(page, `${String(i + 1).padStart(2, "0")}-${tab.label}`, outDir)
    } catch (e) {
      log(`    · tab "${tab.label}" failed: ${(e as Error).message?.slice(0, 80)}`)
    }
  }
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  })
  const page = await context.newPage()
  try {
    await login(page)
    const workerUrl = WORKER_URL_OVERRIDE ?? await findFirstWorkerUrl(page)
    await probeAllTabs(page, workerUrl)
    log("✓ probe complete")
    log(`Inspect output under ${OUT_DIR}/`)
  } catch (e) {
    log(`✗ ${(e as Error).message}`)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

run()
