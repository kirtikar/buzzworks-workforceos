// Diagnostic: open ONE Fieldglass detail page, dump HTML + screenshot.
// Lets us see the real DOM so we can fix the day-wise parser.
//
//   FG_USER=... FG_PASS=... npx tsx scripts/probe-fieldglass-detail.ts
//
// Outputs to out/probe-detail.html and out/probe-detail.png.

import { chromium } from "playwright"
import * as fs from "fs"
import * as path from "path"

const FG_USER = process.env.FG_USER
const FG_PASS = process.env.FG_PASS
const PROBE_ID = process.env.PROBE_ID ?? "CGEMTS06582389"   // ATHIDOSS sample from screenshots
const OUT_DIR  = path.join(process.cwd(), "out")
fs.mkdirSync(OUT_DIR, { recursive: true })

if (!FG_USER || !FG_PASS) {
  console.error("Missing FG_USER / FG_PASS env vars."); process.exit(1)
}

// SAP Fieldglass shows a cookie consent dialog (OneTrust). Click any
// "Accept All" / "Accept" button we can find, ignoring failures so the
// script proceeds whether or not the banner is present.
async function dismissCookieBanner(page: import("playwright").Page) {
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
      const el = await page.waitForSelector(sel, { timeout: 4_000, state: "visible" })
      if (el) {
        await el.click()
        console.log(`✓ dismissed cookie banner via ${sel}`)
        await page.waitForTimeout(500)
        return
      }
    } catch { /* selector not found, try next */ }
  }
  console.log("· no cookie banner detected")
}

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 100 })
  const ctx  = await browser.newContext({ viewport: { width: 1400, height: 950 } })
  const page = await ctx.newPage()

  // SUPPLIER-side login lives on the public gateway (www.fieldglass.net /
  // www.us.fieldglass.cloud.sap). cgem.us.fieldglass.cloud.sap is the
  // BUYER (Capgemini) tenant; supplier accounts get "not authorized to
  // log into this area" if they hit it directly. We log in at the gateway,
  // then look at where it lands us post-auth to discover the supplier
  // tenant URL pattern.
  const GATEWAY = process.env.FG_GATEWAY ?? "https://www.fieldglass.net/"
  console.log("→ navigating to gateway login:", GATEWAY)
  await page.goto(GATEWAY, { waitUntil: "domcontentloaded", timeout: 60_000 })
  await dismissCookieBanner(page)

  // Snapshot the login screen pre-fill so we can see field selectors / id's.
  await page.screenshot({ path: path.join(OUT_DIR, "probe-01-login.png"), fullPage: true })
  fs.writeFileSync(path.join(OUT_DIR, "probe-01-login.html"), await page.content())

  await page.waitForSelector("input[name='username'], input[type='text']", { timeout: 30_000 })
  await page.fill("input[name='username'], input[type='text']", FG_USER!)
  await page.fill("input[type='password']", FG_PASS!)

  // Snapshot post-fill so we can confirm the right fields got values.
  await page.screenshot({ path: path.join(OUT_DIR, "probe-02-filled.png"), fullPage: true })

  await page.click("button:has-text('Sign In'), button[type='submit'], input[type='submit']")
  console.log("→ clicked Sign In. Waiting 4s and snapshotting...")
  await page.waitForTimeout(4_000)
  await page.screenshot({ path: path.join(OUT_DIR, "probe-03-after-submit.png"), fullPage: true })
  fs.writeFileSync(path.join(OUT_DIR, "probe-03-after-submit.html"), await page.content())
  console.log("URL after submit:", page.url())

  // If we're still on the login form, surface that visibly.
  const stillHasPassword = await page.$("input[type='password']")
  if (stillHasPassword) {
    console.log("⚠ password field still present after submit — login may have failed.")
    console.log("   Page text excerpt:", (await page.textContent("body"))?.slice(0, 500).replace(/\s+/g, " "))
  }

  console.log("Waiting up to 5 min for password field to disappear (or for you to act in browser)...")
  await page.waitForFunction(
    () => !document.querySelector("input[type='password']"),
    null, { timeout: 300_000 },
  )
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {})
  const postLoginUrl = page.url()
  console.log("✓ post-login URL:", postLoginUrl)
  await page.screenshot({ path: path.join(OUT_DIR, "probe-04-post-login.png"), fullPage: true })
  fs.writeFileSync(path.join(OUT_DIR, "probe-04-post-login.html"), await page.content())

  // Look for any links / nav that might point to the supplier tenant.
  // Print the host of the current URL — that tells us the supplier tenant.
  const supplierHost = new URL(postLoginUrl).host
  console.log(`Supplier tenant host: ${supplierHost}`)

  // Dump all unique hostnames present in <a href> on the landing page —
  // any sibling tenant URLs surface here.
  const hosts = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll("a[href]")) as HTMLAnchorElement[]
    const set = new Set<string>()
    for (const a of links) {
      try { set.add(new URL(a.href, document.baseURI).host) } catch { /* skip */ }
    }
    return Array.from(set)
  })
  console.log("Hosts found on landing:", hosts.join(", "))

  // Capture all links containing "time_sheet" / "timesheet" — those will
  // tell us the supplier-side detail page URL pattern.
  const tsLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a[href]"))
      .map(a => (a as HTMLAnchorElement).href)
      .filter(h => /time[_\s-]?sheet/i.test(h))
      .slice(0, 20)
  })
  console.log("Timesheet-ish links on landing:", tsLinks.length ? tsLinks.join("\n  ") : "(none)")

  // Snapshot landing page
  await page.screenshot({ path: path.join(OUT_DIR, "probe-landing.png"), fullPage: true })
  fs.writeFileSync(path.join(OUT_DIR, "probe-landing.html"), await page.content())

  // Dismiss any post-login in-app cookie banner before navigating away.
  await dismissCookieBanner(page)

  // Supplier-side flow: visit the time sheet LIST first to discover the
  // detail URL pattern (different from the buyer-side `time_sheet_detail.do`).
  const supplierBase = `https://${supplierHost}`
  const listUrl = `${supplierBase}/time_sheet_list.do`
  console.log("→ navigating to supplier list:", listUrl)
  await page.goto(listUrl, { waitUntil: "domcontentloaded", timeout: 60_000 })
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {})
  await dismissCookieBanner(page)
  await page.waitForTimeout(2000)
  await page.screenshot({ path: path.join(OUT_DIR, "probe-05-list.png"), fullPage: true })
  fs.writeFileSync(path.join(OUT_DIR, "probe-05-list.html"), await page.content())
  console.log("Supplier list URL after nav:", page.url())

  // Capture every distinct .do endpoint linked from the list, plus any
  // anchors that look like row click-throughs.
  const listLinks = await page.evaluate(() => {
    const out = new Set<string>()
    document.querySelectorAll("a[href]").forEach(a => {
      const h = (a as HTMLAnchorElement).getAttribute("href") ?? ""
      if (h && !h.startsWith("#") && !h.startsWith("javascript:")) out.add(h)
    })
    return Array.from(out).slice(0, 40)
  })
  console.log("Links on time_sheet_list.do:")
  listLinks.forEach(h => console.log(`  ${h}`))

  // Hypothesis: cgem.us detail accepts requests only when arriving via
  // a click from the supplier list (Referer = www.us list page). Try
  // clicking the FIRST cgem.us anchor on the list rather than navigating
  // directly. If this works, the full scraper just iterates anchors.
  const firstCgemHref = listLinks.find(h => h.includes("cgem.us") && h.includes("time_sheet_detail"))
  if (firstCgemHref) {
    console.log("→ clicking first list anchor to test Referer-based auth:", firstCgemHref.slice(0, 100), "...")
    const [popup] = await Promise.all([
      page.waitForEvent("popup", { timeout: 30_000 }).catch(() => null),
      page.click(`a[href="${firstCgemHref}"]`),
    ])
    const target = popup ?? page
    await target.waitForLoadState("domcontentloaded", { timeout: 30_000 }).catch(() => {})
    await target.waitForTimeout(3000)
    console.log("URL after click:", target.url())
    await target.screenshot({ path: path.join(OUT_DIR, "probe-06-via-click.png"), fullPage: true })
    fs.writeFileSync(path.join(OUT_DIR, "probe-06-via-click.html"), await target.content())
    if (popup) await popup.close()
    // Go back to list for the next test
    if (page.url().includes("auth_error")) {
      console.log("⚠ click also hit auth_error — Referer alone isn't enough.")
    }
  }

  // Also try the original direct-navigation as a baseline so we have the
  // contrast for diagnosis.
  const detailUrl = `${supplierBase}/time_sheet_detail.do?id=${PROBE_ID}&buyerCode=CGEM&sjkName=CGEM&dataBaseType=sql&startFlow=true`
  console.log("→ navigating to:", detailUrl)
  await page.goto(detailUrl, { waitUntil: "domcontentloaded", timeout: 60_000 })
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {})

  console.log("URL after detail nav:", page.url())
  await page.waitForTimeout(2000)

  await page.screenshot({ path: path.join(OUT_DIR, "probe-detail.png"), fullPage: true })
  const html = await page.content()
  fs.writeFileSync(path.join(OUT_DIR, "probe-detail.html"), html)
  console.log(`✓ HTML (${html.length} chars) and screenshot written to out/probe-detail.{html,png}`)

  // Quick text dump of <table> structure
  const tableInfo = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("table")).map((t, i) => ({
      idx: i,
      rows: t.querySelectorAll("tr").length,
      headerSnippet: (t.querySelector("th")?.textContent ?? "").trim().slice(0, 60),
      firstRowSnippet: (t.querySelector("tr")?.textContent ?? "").trim().slice(0, 200),
    }))
  })
  console.log(`Found ${tableInfo.length} tables on detail page:`)
  tableInfo.slice(0, 30).forEach(t => console.log(`  table[${t.idx}] rows=${t.rows}  header="${t.headerSnippet}"  first="${t.firstRowSnippet}"`))

  console.log("Browser left open for 60s so you can inspect manually...")
  await page.waitForTimeout(60_000)
  await browser.close()
}

main().catch(e => { console.error(e); process.exit(1) })
