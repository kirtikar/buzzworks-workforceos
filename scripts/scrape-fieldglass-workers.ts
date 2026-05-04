/* eslint-disable */
// Crawl all workers from the Fieldglass supplier portal and dump their
// per-tab content to JSONL. Mirrors the structure of
// scrape-fieldglass-by-tsn.ts (login retry, re-login every 50, resumable
// JSONL gate).
//
// Usage:
//   FG_USER=… FG_PASS=… npx tsx scripts/scrape-fieldglass-workers.ts
//
//   Optional:
//     RELOGIN_EVERY=50  WORKER_LIMIT=20  RESUME=1
//     WORKER_LIST_URL=https://www.us.fieldglass.cloud.sap/worker_list.do
//
// Output:
//   out/fieldglass-workers.jsonl
//   { worker_id, worker_url, scraped_at, tabs: { <slug>: { label, text, html, url } } }
//
// Tab parsers live separately (parse-worker-tabs.ts) so we can iterate
// on them without re-running the crawl.

import { chromium, Page } from "playwright"
import * as fs from "node:fs"

const FG_USER  = process.env.FG_USER
const FG_PASS  = process.env.FG_PASS
const GATEWAY  = process.env.FG_GATEWAY ?? "https://www.fieldglass.net/"
const WORKER_LIST_URL_OVERRIDE = process.env.WORKER_LIST_URL
const RELOGIN_EVERY = parseInt(process.env.RELOGIN_EVERY ?? "50", 10)
const WORKER_LIMIT  = parseInt(process.env.WORKER_LIMIT ?? "0", 10)   // 0 = no limit
const RESUME        = process.env.RESUME !== "0"
const OUT_PATH      = "out/fieldglass-workers.jsonl"

if (!FG_USER || !FG_PASS) {
  console.error("FG_USER and FG_PASS env vars required.")
  process.exit(1)
}

function ts() { return new Date().toISOString().replace("T", " ").slice(11, 19) }
function log(s: string) { console.log(`[${ts()}] ${s}`) }
function slug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") }

// ─── Auth ────────────────────────────────────────────────────────────────────
async function login(page: Page) {
  log("→ login")
  await page.goto(GATEWAY, { waitUntil: "domcontentloaded", timeout: 60_000 })
  await page.fill('input[name="username"], input#username, input[type="text"]', FG_USER!)
  await page.fill('input[name="password"], input#password, input[type="password"]', FG_PASS!)
  await Promise.all([
    page.waitForURL(/desktop\.do|fieldglass\.cloud\.sap/, { timeout: 60_000 }),
    page.click('button[type="submit"], input[type="submit"]'),
  ])
  log(`✓ logged in: ${page.url()}`)
}

async function loginWithRetry(page: Page, attempts = 3): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await login(page)
      return
    } catch (e) {
      log(`  login attempt ${attempt} failed: ${(e as Error).message?.slice(0, 80)}`)
      if (attempt === attempts) throw e
      await new Promise(r => setTimeout(r, 5_000))
    }
  }
}

// ─── Discover worker URLs ────────────────────────────────────────────────────
async function fetchWorkerUrls(page: Page): Promise<string[]> {
  const supplierBase = new URL(page.url()).origin
  const listUrl = WORKER_LIST_URL_OVERRIDE ?? `${supplierBase}/worker_list.do`
  log(`→ fetching worker list from ${listUrl}`)
  await page.goto(listUrl, { waitUntil: "domcontentloaded", timeout: 60_000 })
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {})

  // jqx-grid based lists need pagination handling. Start by collecting
  // all currently-visible worker links; the probe script captures the
  // exact pagination DOM so we can refine if needed.
  const urls = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
      .filter(a => /worker_detail\.do|personnel_detail\.do/i.test(a.href))
    return Array.from(new Set(links.map(a => a.href)))
  })
  log(`  found ${urls.length} worker URLs on first page`)
  // TODO: paginate if the list spans multiple pages — we'll wire this
  // after the probe shows the actual jqx-grid pagination layout.
  return urls
}

// ─── Probe one worker (all tabs) ─────────────────────────────────────────────
interface TabCapture {
  label: string
  url:   string | null
  text:  string
  html:  string
}

async function scrapeWorker(page: Page, workerUrl: string): Promise<{
  worker_id: string
  worker_url: string
  scraped_at: string
  tabs: Record<string, TabCapture>
} | null> {
  await page.goto(workerUrl, { waitUntil: "domcontentloaded", timeout: 60_000 })
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {})

  const workerId = (workerUrl.match(/[?&]id=([^&]+)/)?.[1] ?? "").replace(/[^A-Za-z0-9_-]/g, "")
  if (!workerId) {
    log(`  ⚠ could not extract worker_id from ${workerUrl}`)
    return null
  }

  const tabs: Record<string, TabCapture> = {}
  // Default landing tab.
  tabs["overview"] = {
    label: "Overview",
    url:   page.url(),
    text:  await page.evaluate(() => document.body.innerText).catch(() => ""),
    html:  await page.content(),
  }

  // Enumerate tab elements. SAP Fieldglass tabs vary; we grab anything
  // that looks like a tab and click it.
  const tabSpecs = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(
      'a[role="tab"], div[role="tab"], li[role="tab"], a.tab, .tabs a, .tab-list a, [data-tab]'
    ))
    const out: { label: string }[] = []
    const seen = new Set<string>()
    for (const el of els) {
      const label = ((el as HTMLElement).innerText || el.textContent || "").trim()
      if (!label || label.length > 60 || seen.has(label)) continue
      seen.add(label)
      out.push({ label })
    }
    return out
  })

  for (const spec of tabSpecs) {
    try {
      const clicked = await page.evaluate((label) => {
        const els = Array.from(document.querySelectorAll<HTMLElement>(
          'a[role="tab"], div[role="tab"], li[role="tab"], a.tab, .tabs a, .tab-list a, [data-tab]'
        ))
        const el = els.find(e => ((e as HTMLElement).innerText || "").trim() === label)
        if (el) { (el as HTMLElement).click(); return true }
        return false
      }, spec.label)
      if (!clicked) continue
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {})
      await new Promise(r => setTimeout(r, 600))
      const key = slug(spec.label) || `tab-${Object.keys(tabs).length}`
      tabs[key] = {
        label: spec.label,
        url:   page.url(),
        text:  await page.evaluate(() => document.body.innerText).catch(() => ""),
        html:  await page.content(),
      }
    } catch (e) {
      log(`    · tab "${spec.label}" failed: ${(e as Error).message?.slice(0, 80)}`)
    }
  }

  return {
    worker_id:   workerId,
    worker_url:  workerUrl,
    scraped_at:  new Date().toISOString(),
    tabs,
  }
}

// ─── Resume gate ─────────────────────────────────────────────────────────────
function alreadyDone(): Set<string> {
  if (!RESUME || !fs.existsSync(OUT_PATH)) return new Set()
  const done = new Set<string>()
  for (const line of fs.readFileSync(OUT_PATH, "utf-8").split("\n")) {
    if (!line.trim()) continue
    try {
      const r = JSON.parse(line)
      if (r.worker_id && r.tabs && Object.keys(r.tabs).length > 0) done.add(r.worker_id)
    } catch { /* skip */ }
  }
  return done
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function run() {
  fs.mkdirSync("out", { recursive: true })
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  })
  const page = await context.newPage()

  try {
    await loginWithRetry(page)
    const allUrls = await fetchWorkerUrls(page)
    const done = alreadyDone()
    log(`done: ${done.size} cleanly-scraped already`)

    let urls = allUrls.filter(u => {
      const id = (u.match(/[?&]id=([^&]+)/)?.[1] ?? "").replace(/[^A-Za-z0-9_-]/g, "")
      return id && !done.has(id)
    })
    if (WORKER_LIMIT > 0) urls = urls.slice(0, WORKER_LIMIT)
    log(`scope: ${allUrls.length} total / ${urls.length} todo`)

    const out = fs.createWriteStream(OUT_PATH, { flags: "a" })
    let scraped = 0, failed = 0

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      try {
        const data = await scrapeWorker(page, url)
        if (data) {
          out.write(JSON.stringify(data) + "\n")
          scraped++
        } else {
          failed++
        }
      } catch (e) {
        log(`  ✗ worker ${url}: ${(e as Error).message?.slice(0, 80)}`)
        failed++
      }
      if ((i + 1) % 5 === 0) {
        log(`progress: ${i + 1}/${urls.length} (scraped=${scraped} failed=${failed})`)
      }
      if ((i + 1) % RELOGIN_EVERY === 0 && i + 1 < urls.length) {
        log(`── re-login at i=${i + 1} (every ${RELOGIN_EVERY}) ──`)
        await loginWithRetry(page)
      }
    }
    out.end()
    log(`DONE. scraped=${scraped} failed=${failed}`)
  } catch (e) {
    log(`✗ fatal: ${(e as Error).message}`)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

run()
