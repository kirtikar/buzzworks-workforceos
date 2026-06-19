import { getSql } from "../lib/db/client"
import * as fs from "fs"

// Week-by-week coverage check for Capgemini timesheets.
// Compares what's in Postgres (timesheets + daily_entries) against
// what the Phase-1 discovery scrape said should be there.
//
// Output: per-week summary plus the list of TSNs that were discovered
// but haven't been ingested yet (so we can see exactly what's missing
// in each week).

async function main() {
  const sql = getSql()

  // ─── What's discovered (the target scope) ─────────────────────────
  const discovery: Record<string, Set<string>> = {}     // weekStart → TSN set
  if (fs.existsSync("out/may-jun-discovery.jsonl")) {
    for (const line of fs.readFileSync("out/may-jun-discovery.jsonl", "utf-8").split("\n")) {
      if (!line.trim()) continue
      try {
        const r = JSON.parse(line)
        if (!r.tsn || !r.periodStart) continue
        if (!discovery[r.periodStart]) discovery[r.periodStart] = new Set()
        discovery[r.periodStart].add(r.tsn)
      } catch { /* skip */ }
    }
  }

  // ─── What's in DB ─────────────────────────────────────────────────
  const dbRows = await sql<{ period_start: string; n: string; with_daily: string }[]>`
    SELECT
      period_start::text,
      COUNT(*)::text AS n,
      SUM(CASE WHEN EXISTS (SELECT 1 FROM daily_entries d WHERE d.timesheet_id = t.id) THEN 1 ELSE 0 END)::text AS with_daily
    FROM timesheets t
    WHERE client_id = 'cap'
    GROUP BY period_start
    ORDER BY period_start
  `
  const dbByWeek = new Map<string, { count: number; withDaily: number }>()
  for (const r of dbRows) {
    dbByWeek.set(r.period_start, { count: parseInt(r.n, 10), withDaily: parseInt(r.with_daily, 10) })
  }

  // Status distribution per week
  const statusRows = await sql<{ period_start: string; status: string; n: string }[]>`
    SELECT period_start::text, status, COUNT(*)::text AS n
    FROM timesheets WHERE client_id = 'cap'
    GROUP BY period_start, status
    ORDER BY period_start, status
  `
  const statusByWeek = new Map<string, Record<string, number>>()
  for (const r of statusRows) {
    if (!statusByWeek.has(r.period_start)) statusByWeek.set(r.period_start, {})
    statusByWeek.get(r.period_start)![r.status] = parseInt(r.n, 10)
  }

  // ─── Build coverage table ─────────────────────────────────────────
  const allWeeks = new Set<string>([
    ...Object.keys(discovery),
    ...dbByWeek.keys(),
  ])
  const weeks = [...allWeeks].sort().reverse()                  // newest first

  console.log("\n═══ WEEK-BY-WEEK COVERAGE (Capgemini) ═══\n")
  console.log("  WeekStart   DB rows  w/ Daily  Discovered  Missing  Coverage")
  console.log("  ─────────────────────────────────────────────────────────────")
  let totalMissing = 0
  const missingByWeek: Record<string, string[]> = {}
  for (const wk of weeks) {
    const db = dbByWeek.get(wk) ?? { count: 0, withDaily: 0 }
    const disc = discovery[wk]?.size ?? 0
    const inDb = await sql<{ id: string }[]>`
      SELECT id FROM timesheets WHERE client_id = 'cap' AND period_start = ${wk}
    `
    const dbTsns = new Set(inDb.map(r => r.id.replace(/^cap-fg-/, "")))
    const missing: string[] = []
    if (discovery[wk]) {
      for (const tsn of discovery[wk]) {
        if (!dbTsns.has(tsn)) missing.push(tsn)
      }
    }
    missingByWeek[wk] = missing
    totalMissing += missing.length
    const coverage = disc > 0 ? `${((db.count / disc) * 100).toFixed(1)}%` : "—"
    const dailyPct = db.count > 0 ? `(${((db.withDaily / db.count) * 100).toFixed(0)}%)` : ""
    console.log(`  ${wk}  ${String(db.count).padStart(7)}  ${String(db.withDaily).padStart(5)} ${dailyPct.padEnd(6)}  ${String(disc).padStart(10)}  ${String(missing.length).padStart(7)}  ${coverage}`)
  }
  console.log(`\n  Total missing TSNs across all weeks: ${totalMissing}`)

  // ─── Status breakdown per week (only May-Jun, the new scope) ──────
  console.log("\n═══ STATUS BREAKDOWN (May-Jun weeks) ═══\n")
  const mayJunWeeks = weeks.filter(w => w >= "2026-05-04")
  for (const wk of mayJunWeeks) {
    const s = statusByWeek.get(wk) ?? {}
    const parts = Object.entries(s).sort().map(([k, v]) => `${k}=${v}`).join("  ")
    console.log(`  ${wk}:  ${parts || "(none in DB)"}`)
  }

  // ─── First 5 missing TSNs per week (for retry) ────────────────────
  console.log("\n═══ SAMPLE MISSING TSNs (first 5 per week) ═══\n")
  for (const wk of mayJunWeeks) {
    const m = missingByWeek[wk] ?? []
    if (m.length > 0) {
      console.log(`  ${wk}: ${m.slice(0, 5).join(", ")}${m.length > 5 ? ` …(+${m.length - 5} more)` : ""}`)
    }
  }

  process.exit(0)
}
main().catch(e => { console.error(e); process.exit(1) })
