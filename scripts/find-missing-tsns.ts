// Recompute the missing-TSN log by diffing the DB scope against the
// cleanly-scraped JSONL. Run any time after a fresh ingest to refresh
// the retry queue.
//
//   [API_BASE=https://dev.era.ai] [SCOPE_FROM=2026-03-01] \
//   [SCOPE_TO=2026-04-05] [JSONL=out/fieldglass-march-daily.jsonl] \
//   [OUT=out/fieldglass-march-missing.jsonl] \
//     npx tsx scripts/find-missing-tsns.ts
//
// Output is one JSON per line:
//   { "tsn": "CGEMTS06...", "periodStart": "2026-03-09", "periodEnd": "2026-03-15", "firstNoted": "2026-05-02" }
//
// Replay with:
//   MISSING_FILE=out/fieldglass-march-missing.jsonl FG_USER=… FG_PASS=… \
//     npx tsx scripts/scrape-fieldglass-by-tsn.ts

import * as fs from "fs"

const API_BASE   = process.env.API_BASE   ?? "https://dev.era.ai"
const SCOPE_FROM = process.env.SCOPE_FROM ?? "2026-03-01"
const SCOPE_TO   = process.env.SCOPE_TO   ?? "2026-04-05"
const JSONL_IN   = process.env.JSONL      ?? "out/fieldglass-march-daily.jsonl"
const OUT        = process.env.OUT        ?? "out/fieldglass-march-missing.jsonl"

interface Target { tsn: string; periodStart: string; periodEnd: string }

async function main() {
  const r = await fetch(`${API_BASE}/api/timesheets/cap`)
  const d = await r.json() as { timesheets: { id: string; periodStart: string; periodEnd: string }[] }
  const scope: Target[] = d.timesheets
    .filter(t => {
      const s = t.periodStart.slice(0, 10), e = t.periodEnd.slice(0, 10)
      return !(e < SCOPE_FROM || s > SCOPE_TO)
    })
    .map(t => ({
      tsn:         t.id.replace(/^cap-fg-/, ""),
      periodStart: t.periodStart.slice(0, 10),
      periodEnd:   t.periodEnd.slice(0, 10),
    }))

  const done = new Set<string>()
  if (fs.existsSync(JSONL_IN)) {
    for (const line of fs.readFileSync(JSONL_IN, "utf-8").split("\n")) {
      if (!line.trim()) continue
      try {
        const r2 = JSON.parse(line)
        const tsn = r2.tsn ?? r2.timesheetId
        if (!tsn) continue
        const daily = Array.isArray(r2.daily) ? r2.daily : []
        if (daily.length === 7 && daily.some((dy: { hours?: number }) => (dy.hours ?? 0) > 0)) {
          done.add(tsn)
        }
      } catch { /* skip */ }
    }
  }

  const missing = scope.filter(t => !done.has(t.tsn))
  const today = new Date().toISOString().slice(0, 10)
  fs.writeFileSync(OUT, missing.map(t => JSON.stringify({ ...t, firstNoted: today })).join("\n") + "\n")

  console.log(`scope:   ${scope.length}`)
  console.log(`done:    ${done.size}`)
  console.log(`missing: ${missing.length} → ${OUT}`)

  // Per-week breakdown
  const byWeek = new Map<string, number>()
  for (const t of missing) byWeek.set(t.periodEnd, (byWeek.get(t.periodEnd) ?? 0) + 1)
  console.log("per-week missing:")
  for (const [k, v] of [...byWeek.entries()].sort()) {
    console.log(`  ending ${k}: ${v}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
