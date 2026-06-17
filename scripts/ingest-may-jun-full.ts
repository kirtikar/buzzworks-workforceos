/* eslint-disable */
// Full ingest from the per-TSN scraper's JSONL into Postgres.
//
// The existing ingest-fieldglass-daily.ts only inserts daily_entries
// and skips records whose parent timesheet row doesn't already exist.
// That gap is fine when the parent rows came from a CSV import (April
// flow) but NOT for the post-Apr-27 May/Jun crawl, where there is no
// CSV — the scraper IS the source of truth.
//
// This script reads the JSONL, upserts employees + timesheets from
// the rich record fields the scraper captures, then lets the existing
// daily ingest finish the job.
//
// Usage:
//   set -a && . .env.production.local && set +a && \
//     npx tsx scripts/ingest-may-jun-full.ts

import { getSql } from "../lib/db/client"
import * as fs from "fs"
import * as path from "path"

const JSONL = process.env.JSONL ?? "out/fieldglass-march-daily.jsonl"

// Same status mapping as lib/fieldglass-cap-import.ts. Inlined so this
// script has no dependency on app/ code (which would pull in Next).
function mapStatus(raw: string | undefined): string {
  const s = (raw ?? "").toLowerCase().trim()
  if (s === "invoiced" || s === "paid")                              return "processed"
  if (s === "approved" || s === "completed")                         return "approved"
  if (s === "approval paused")                                       return "reviewing"
  if (s === "pending approval" || s === "in approval")               return "reviewing"
  if (s === "pending review" || s === "submitted")                   return "pending"
  if (s === "rejected" || s === "returned for changes" || s === "returned") return "rejected"
  return "pending"
}

function detailPageUrl(tsn: string): string {
  return `https://cgem.us.fieldglass.cloud.sap/time_sheet_detail.do?id=${tsn}&buyerCode=CGEM&sjkName=CGEM&dataBaseType=sql&startFlow=true`
}

// Normalise "Last, First" or "LAST  , FIRST" → "First Last" for display
// and slugify for the employee id. Same convention used elsewhere.
function normaliseName(raw: string): { display: string; slug: string } {
  const cleaned = raw.replace(/ /g, " ").replace(/\s+/g, " ").trim()
  let display = cleaned
  const m = cleaned.match(/^([^,]+),\s*(.+)$/)
  if (m) display = `${m[2].trim()} ${m[1].trim()}`
  const slug = display.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  return { display, slug }
}

function periodLabel(startIso: string, endIso: string): string {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  const s = new Date(startIso + "T00:00:00Z")
  const e = new Date(endIso + "T00:00:00Z")
  if (s.getUTCMonth() === e.getUTCMonth() && s.getUTCFullYear() === e.getUTCFullYear()) {
    return `${months[s.getUTCMonth()]} ${s.getUTCDate()} – ${e.getUTCDate()}, ${s.getUTCFullYear()}`
  }
  return `${months[s.getUTCMonth()]} ${s.getUTCDate()} – ${months[e.getUTCMonth()]} ${e.getUTCDate()}, ${e.getUTCFullYear()}`
}

interface JsonlRec {
  tsn:          string
  workerId?:    string
  workerName?:  string
  periodStart?: string
  periodEnd?:   string
  status?:      string
  totalHours?:  number
  totalBilled?: number
  billRate?:    number
  payRate?:     number
  managerName?: string
  managerEmail?: string
  site?:        string
  daily?: { date: string; hours: number; type?: string }[]
}

interface TsRow {
  id:               string
  employee_id:      string
  client_id:        string
  period:           string
  period_start:     string
  period_end:       string
  submitted_at:     string
  source:           string
  source_detail:    string
  portal_id:        string
  status:           string
  total_hours:      number
  regular_hours:    number
  overtime_hours:   number
  leave_hours:      number
  total_payable:    number
  validation_score: number
  external_url:     string
}

interface EmpRow {
  id:              string
  worker_id:       string
  client_id:       string
  name:            string
  employee_code:   string
  email:           string
  role:            string
  department:      string
  manager_email:   string | null
  manager_name:    string | null
  avatar_color:    string
  earned_leaves:   number
  consumed_leaves: number
}

async function main() {
  if (!fs.existsSync(JSONL)) { console.error(`No file at ${JSONL}`); process.exit(1) }
  const sql = getSql()

  const records: JsonlRec[] = []
  for (const line of fs.readFileSync(JSONL, "utf-8").split("\n")) {
    if (!line.trim()) continue
    try { records.push(JSON.parse(line)) } catch { /* skip bad */ }
  }
  console.log(`Loaded ${records.length} JSONL records`)

  // Build employee rows (one per unique worker), keeping the most
  // recent name spelling + manager info.
  const employees = new Map<string, EmpRow>()
  const timesheets: TsRow[] = []

  for (const r of records) {
    if (!r.tsn || !r.workerName) continue
    const { display, slug } = normaliseName(r.workerName)
    const empId = `cap-fg-${slug}`

    // Derive hour split. The legacy scraper records totalHours but not
    // a regular/OT split per timesheet (it's in daily). Use totalHours
    // as regular_hours; OT comes from daily.type aggregation. For now,
    // approximate: regular = totalHours, overtime/leave = 0 — the
    // daily ingest fixes the split downstream when daily entries land.
    const totalH = r.totalHours ?? 0
    const billed = r.totalBilled ?? 0

    if (!employees.has(empId)) {
      employees.set(empId, {
        id:              empId,
        worker_id:       r.workerId ?? "",
        client_id:       "cap",
        name:            display,
        employee_code:   `CAP-${slug.toUpperCase().replace(/-/g, "")}`,
        email:           `${slug}@capgemini.com`,
        role:            "Fieldglass Contractor",
        department:      r.site ?? "Consulting",
        manager_email:   r.managerEmail ?? null,
        manager_name:    r.managerName ?? null,
        avatar_color:    "#0070AD",                            // Capgemini blue
        earned_leaves:   0,
        consumed_leaves: 0,
      })
    } else {
      // Refresh manager/site from the latest record (in case it changed).
      const e = employees.get(empId)!
      if (r.managerEmail) e.manager_email = r.managerEmail
      if (r.managerName)  e.manager_name  = r.managerName
      if (r.site)         e.department    = r.site
    }

    timesheets.push({
      id:               `cap-fg-${r.tsn}`,
      employee_id:      empId,
      client_id:        "cap",
      period:           periodLabel(r.periodStart ?? "", r.periodEnd ?? ""),
      period_start:     r.periodStart ?? "",
      period_end:       r.periodEnd ?? "",
      submitted_at:     `${r.periodEnd}T09:00:00Z`,
      source:           "portal",
      source_detail:    `Fieldglass · ${r.tsn}`,
      portal_id:        "fieldglass",
      status:           mapStatus(r.status),
      total_hours:      totalH,
      regular_hours:    totalH,
      overtime_hours:   0,
      leave_hours:      0,
      total_payable:    billed,
      validation_score: 95,
      external_url:     detailPageUrl(r.tsn),
    })
  }

  // Dedupe timesheets by id — the JSONL may have revisions / duplicates.
  const tsById = new Map<string, TsRow>()
  for (const t of timesheets) tsById.set(t.id, t)
  const tsArr = [...tsById.values()]
  console.log(`Parsed ${employees.size} employees, ${tsArr.length} timesheets`)

  // Chunk inserts to stay under PG bind-param cap.
  const chunk = <T,>(arr: T[], n: number): T[][] => {
    const out: T[][] = []
    for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
    return out
  }

  await sql.begin(async tx => {
    let empCount = 0
    for (const part of chunk([...employees.values()], 500)) {
      await tx`
        INSERT INTO employees ${tx(part,
          "id","worker_id","client_id","name","employee_code","email",
          "role","department","manager_email","manager_name","avatar_color",
          "earned_leaves","consumed_leaves",
        )}
        ON CONFLICT (id) DO UPDATE SET
          worker_id      = EXCLUDED.worker_id,
          name           = EXCLUDED.name,
          email          = EXCLUDED.email,
          role           = EXCLUDED.role,
          department     = EXCLUDED.department,
          manager_email  = EXCLUDED.manager_email,
          manager_name   = EXCLUDED.manager_name,
          updated_at     = NOW()
      `
      empCount += part.length
    }
    console.log(`✓ upserted ${empCount} employees`)

    let tsCount = 0
    for (const part of chunk(tsArr, 1500)) {
      await tx`
        INSERT INTO timesheets ${tx(part,
          "id","employee_id","client_id","period","period_start","period_end",
          "submitted_at","source","source_detail","portal_id","status",
          "total_hours","regular_hours","overtime_hours","leave_hours",
          "total_payable","validation_score","external_url",
        )}
        ON CONFLICT (id) DO UPDATE SET
          status         = EXCLUDED.status,
          total_hours    = EXCLUDED.total_hours,
          regular_hours  = EXCLUDED.regular_hours,
          total_payable  = EXCLUDED.total_payable,
          external_url   = EXCLUDED.external_url,
          updated_at     = NOW()
      `
      tsCount += part.length
    }
    console.log(`✓ upserted ${tsCount} timesheets`)
  })

  console.log(`\nNext step: re-run scripts/ingest-fieldglass-daily.ts to land daily_entries`)
  process.exit(0)
}
main().catch(e => { console.error(e); process.exit(1) })
