/* eslint-disable */
// Ingest out/fieldglass-workers.jsonl into worker_profiles + child tables.
//
// Ingest flow:
//   1. Parse each JSONL line — overview tab gives us the canonical row
//      for `worker_profiles`; sub-tabs feed child tables.
//   2. Insert one row per scrape into `worker_profile_snapshots` for
//      audit / change tracking (full JSONB capture).
//   3. After ingest, backfill `employees.start_date` from
//      worker_profiles.start_date so the dashboard picks up DOJ.
//
// Tab parsers live below — they take {text, html, url} from a tab
// capture and return the structured fields we want. They're DELIBERATELY
// loose: extract what we can from text patterns, else leave nullable.
// As we observe more real HTML samples we tighten them.
//
// Usage:
//   set -a && . .env.production.local && set +a && \
//     npx tsx scripts/ingest-fieldglass-workers.ts

import { getSql } from "../lib/db/client"
import * as fs from "node:fs"

interface TabCapture { label: string; url: string | null; text: string; html: string }
interface WorkerJsonl {
  worker_id:  string
  worker_url: string
  scraped_at: string
  tabs:       Record<string, TabCapture>
  client_id?: string                                       // optional, defaults below
}

const JSONL_PATH = process.env.WORKERS_JSONL ?? "out/fieldglass-workers.jsonl"
const DEFAULT_CLIENT_ID = "cap"                             // adjust as we add real-data clients

// ─── Tab parsers (loose; tighten as we see real HTML) ───────────────────────

// Overview tab: identity, manager, dates, rates, status, site.
// Strategy: Fieldglass renders Overview as a label-value grid. Walk the
// text line-by-line; when we hit a known label, take the next non-empty
// line as the value. Robust to layout shifts within the same row.
function parseOverview(t: TabCapture | undefined) {
  if (!t) return {}
  const lines = t.text.split("\n").map(s => s.trim()).filter(Boolean)
  const findValue = (labels: string[]): string | null => {
    for (let i = 0; i < lines.length; i++) {
      if (labels.some(l => lines[i].toLowerCase() === l.toLowerCase())) {
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          if (lines[j] && !labels.some(l => lines[j].toLowerCase() === l.toLowerCase())) return lines[j]
        }
      }
    }
    return null
  }
  const parseDate = (s: string | null): string | null => {
    if (!s) return null
    // FG renders dates like "01-Apr-2026" or "Apr 1, 2026" or "2026-04-01".
    const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/)
    if (iso) return iso[0]
    const dmy = s.match(/(\d{1,2})[-\s]([A-Za-z]{3,9})[-\s,](\d{4})/)
    if (dmy) {
      const month = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"]
        .indexOf(dmy[2].slice(0, 3).toLowerCase())
      if (month >= 0) {
        return `${dmy[3]}-${String(month + 1).padStart(2, "0")}-${String(parseInt(dmy[1])).padStart(2, "0")}`
      }
    }
    return null
  }
  const parseMoney = (s: string | null): { amount: number | null; currency: string | null } => {
    if (!s) return { amount: null, currency: null }
    const m = s.match(/([A-Z]{3}|₹|\$|€|£)\s*([\d,]+\.?\d*)/)
    if (m) return { amount: parseFloat(m[2].replace(/,/g, "")), currency: m[1] === "₹" ? "INR" : m[1] === "$" ? "USD" : m[1] }
    const n = s.match(/([\d,]+\.?\d*)/)
    if (n) return { amount: parseFloat(n[1].replace(/,/g, "")), currency: null }
    return { amount: null, currency: null }
  }
  const billRate = parseMoney(findValue(["Bill Rate", "Bill rate"]))
  const payRate  = parseMoney(findValue(["Pay Rate", "Pay rate", "Pay to Worker"]))
  return {
    name:            findValue(["Name", "Worker Name"]) ?? null,
    email:           findValue(["Email", "Email Address"]) ?? null,
    phone:           findValue(["Phone", "Phone Number", "Mobile"]) ?? null,
    job_title:       findValue(["Job Title", "Title"]) ?? null,
    job_category:    findValue(["Job Category", "Category"]) ?? null,
    site:            findValue(["Site", "Worksite", "Location"]) ?? null,
    cost_center:     findValue(["Cost Center", "Cost Centre"]) ?? null,
    department:      findValue(["Department"]) ?? null,
    employment_type: findValue(["Worker Type", "Employment Type"]) ?? null,
    status:          findValue(["Status", "Worker Status"]) ?? null,
    manager_name:    findValue(["Manager", "Time Sheet Approver", "Hiring Manager"]) ?? null,
    manager_email:   findValue(["Manager Email", "Approver Email"]) ?? null,
    start_date:      parseDate(findValue(["Start Date", "Job Start Date", "Assignment Start"])),
    end_date:        parseDate(findValue(["End Date", "Job End Date", "Assignment End"])),
    bill_rate:       billRate.amount,
    pay_rate:        payRate.amount,
    currency:        billRate.currency ?? payRate.currency,
    buyer:           findValue(["Buyer", "Buyer Organization"]) ?? null,
  }
}

// Tab name detection — same worker page can label tabs differently
// across FG tenants. Map slug → canonical category.
function pickTab(tabs: Record<string, TabCapture>, candidates: string[]): TabCapture | undefined {
  for (const c of candidates) {
    const k = c.toLowerCase().replace(/\s+/g, "-")
    if (tabs[k]) return tabs[k]
  }
  return undefined
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(JSONL_PATH)) {
    console.error(`No JSONL at ${JSONL_PATH}. Run scrape-fieldglass-workers.ts first.`)
    process.exit(1)
  }
  const sql = getSql()

  const rows: WorkerJsonl[] = []
  for (const line of fs.readFileSync(JSONL_PATH, "utf-8").split("\n")) {
    if (!line.trim()) continue
    try { rows.push(JSON.parse(line)) } catch { /* skip bad lines */ }
  }
  console.log(`Loaded ${rows.length} worker records from ${JSONL_PATH}`)

  let upserted = 0
  for (const w of rows) {
    const clientId = w.client_id ?? DEFAULT_CLIENT_ID
    const overview = parseOverview(pickTab(w.tabs, ["overview", "00-landing", "summary"]))

    await sql`
      INSERT INTO worker_profiles (
        worker_id, client_id,
        name, email, phone,
        job_title, job_category, site, cost_center, department,
        employment_type, status,
        manager_name, manager_email,
        start_date, end_date,
        bill_rate, pay_rate, currency,
        buyer,
        external_url, raw_overview, scraped_at
      ) VALUES (
        ${w.worker_id}, ${clientId},
        ${overview.name}, ${overview.email}, ${overview.phone},
        ${overview.job_title}, ${overview.job_category}, ${overview.site}, ${overview.cost_center}, ${overview.department},
        ${overview.employment_type}, ${overview.status},
        ${overview.manager_name}, ${overview.manager_email},
        ${overview.start_date}, ${overview.end_date},
        ${overview.bill_rate}, ${overview.pay_rate}, ${overview.currency},
        ${overview.buyer},
        ${w.worker_url}, ${sql.json(overview as never)}, ${w.scraped_at}
      )
      ON CONFLICT (worker_id) DO UPDATE SET
        client_id        = EXCLUDED.client_id,
        name             = COALESCE(EXCLUDED.name,             worker_profiles.name),
        email            = COALESCE(EXCLUDED.email,            worker_profiles.email),
        phone            = COALESCE(EXCLUDED.phone,            worker_profiles.phone),
        job_title        = COALESCE(EXCLUDED.job_title,        worker_profiles.job_title),
        job_category     = COALESCE(EXCLUDED.job_category,     worker_profiles.job_category),
        site             = COALESCE(EXCLUDED.site,             worker_profiles.site),
        cost_center      = COALESCE(EXCLUDED.cost_center,      worker_profiles.cost_center),
        department       = COALESCE(EXCLUDED.department,       worker_profiles.department),
        employment_type  = COALESCE(EXCLUDED.employment_type,  worker_profiles.employment_type),
        status           = COALESCE(EXCLUDED.status,           worker_profiles.status),
        manager_name     = COALESCE(EXCLUDED.manager_name,     worker_profiles.manager_name),
        manager_email    = COALESCE(EXCLUDED.manager_email,    worker_profiles.manager_email),
        start_date       = COALESCE(EXCLUDED.start_date,       worker_profiles.start_date),
        end_date         = COALESCE(EXCLUDED.end_date,         worker_profiles.end_date),
        bill_rate        = COALESCE(EXCLUDED.bill_rate,        worker_profiles.bill_rate),
        pay_rate         = COALESCE(EXCLUDED.pay_rate,         worker_profiles.pay_rate),
        currency         = COALESCE(EXCLUDED.currency,         worker_profiles.currency),
        buyer            = COALESCE(EXCLUDED.buyer,            worker_profiles.buyer),
        external_url     = EXCLUDED.external_url,
        raw_overview     = EXCLUDED.raw_overview,
        scraped_at       = EXCLUDED.scraped_at,
        updated_at       = NOW()
    `

    // Snapshot row — full per-tab capture for audit / change tracking.
    await sql`
      INSERT INTO worker_profile_snapshots (worker_id, snapshot_at, raw, raw_html)
      VALUES (
        ${w.worker_id}, ${w.scraped_at},
        ${sql.json(w.tabs as never)},
        ${null}
      )
      ON CONFLICT (worker_id, snapshot_at) DO NOTHING
    `

    // TODO (next pass, after probe HTML is reviewed):
    //   parseAssignments(pickTab(w.tabs, ["job-information","assignments"]))
    //   parseDocuments(pickTab(w.tabs, ["documents"]))
    //   parseTasks(pickTab(w.tabs, ["onboarding","tasks","offboarding"]))
    //   parseCompliance(pickTab(w.tabs, ["compliance","background-check"]))
    //   parseEquipment(pickTab(w.tabs, ["equipment","assets"]))
    //   parseApprovers(pickTab(w.tabs, ["approvers"]))
    //   …and upsert into the corresponding child tables.

    upserted++
  }
  console.log(`✓ Upserted ${upserted} worker profiles`)

  // Backfill DOJ on employees from worker_profiles. We match on
  // employees.worker_id (already set during the timesheet imports).
  const r = await sql<{ updated: number }[]>`
    WITH upd AS (
      UPDATE employees e
      SET start_date = wp.start_date, updated_at = NOW()
      FROM worker_profiles wp
      WHERE e.worker_id = wp.worker_id
        AND wp.start_date IS NOT NULL
        AND (e.start_date IS NULL OR e.start_date <> wp.start_date)
      RETURNING 1
    )
    SELECT COUNT(*)::int AS updated FROM upd
  `
  console.log(`✓ Backfilled employees.start_date for ${r[0]?.updated ?? 0} rows`)

  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
