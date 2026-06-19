import { getSql } from "../lib/db/client"
import * as fs from "fs"

// Re-sort the MISSING_FILE so the by-TSN scraper processes weeks
// strictly in order: every TSN missing from Week 2 first, then every
// TSN missing from Week 3, etc. Already-scraped TSNs are dropped from
// the file entirely (the by-TSN scraper would have skipped them via
// its alreadyDone() gate anyway, but trimming makes the progress
// counters meaningful).

interface Row { tsn: string; periodStart: string; periodEnd: string; status?: string; totalHours?: number; workerName?: string }

async function main() {
  const sql = getSql()

  // What TSNs are already in DB (cap-fg-<tsn>) — these are "done"
  const done = await sql<{ tsn: string }[]>`
    SELECT REPLACE(id, 'cap-fg-', '') AS tsn FROM timesheets
    WHERE client_id = 'cap' AND id LIKE 'cap-fg-CGEMTS%'
  `
  const doneSet = new Set(done.map(r => r.tsn))
  console.log(`DB has ${doneSet.size} cap-fg-CGEMTS… timesheets`)

  // Discovery rows, in original order
  const all: Row[] = []
  for (const line of fs.readFileSync("out/may-jun-discovery.jsonl", "utf-8").split("\n")) {
    if (!line.trim()) continue
    try { all.push(JSON.parse(line)) } catch { /* skip */ }
  }
  console.log(`Discovery JSONL has ${all.length} rows`)

  // Group by week, dropping already-done ones
  const byWeek: Record<string, Row[]> = {}
  for (const r of all) {
    if (doneSet.has(r.tsn)) continue
    if (!byWeek[r.periodStart]) byWeek[r.periodStart] = []
    byWeek[r.periodStart].push(r)
  }

  // Emit in chronological week order (oldest first), preserving the
  // discovery sequence within each week (matches the jqx-grid row
  // order — usually most-recently-submitted first).
  const weeks = Object.keys(byWeek).sort()
  const out: Row[] = []
  for (const wk of weeks) out.push(...byWeek[wk])

  console.log("\nWeek-by-week missing count (in the new file's order):")
  for (const wk of weeks) console.log(`  ${wk}: ${byWeek[wk].length} TSNs`)
  console.log(`\nTotal to write: ${out.length} TSNs`)

  // Backup the old file, then write the new one.
  const orig = "out/may-jun-discovery.jsonl"
  const backup = `out/may-jun-discovery.jsonl.bak-${Date.now()}`
  fs.copyFileSync(orig, backup)
  console.log(`Backed up original → ${backup}`)
  fs.writeFileSync(orig, out.map(r => JSON.stringify(r)).join("\n") + "\n")
  console.log(`✓ Rewrote ${orig} — week 2 first, then 3, 4, 5, 6`)
  process.exit(0)
}
main().catch(e => { console.error(e); process.exit(1) })
