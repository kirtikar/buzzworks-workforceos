import { getSql } from "../lib/db/client"
import * as fs from "node:fs"

// One-shot: find April timesheets in Postgres that have no daily_entries
// rows. Writes out/april-missing.jsonl in the format the scraper accepts
// via MISSING_FILE. Bypasses /api/timesheets/cap (which can time out on
// large payloads) by querying Postgres directly.

async function main() {
  const sql = getSql()
  const rows = await sql<{ id: string; period_start: string; period_end: string }[]>`
    SELECT t.id, t.period_start::text, t.period_end::text
    FROM timesheets t
    WHERE t.client_id = 'cap'
      AND t.period_start >= '2026-03-29' AND t.period_start <= '2026-04-05'
      AND NOT EXISTS (SELECT 1 FROM daily_entries d WHERE d.timesheet_id = t.id)
    ORDER BY t.period_start, t.id
  `
  const lines = rows.map(r => JSON.stringify({
    tsn: r.id.replace(/^cap-fg-/, ""),
    periodStart: r.period_start,
    periodEnd:   r.period_end,
    firstNoted:  new Date().toISOString().slice(0, 10),
  }))
  fs.writeFileSync(
    "/Users/kirtikar/Documents/Codes/consulting/timesheet_explore/out/april-missing.jsonl",
    lines.join("\n") + (lines.length ? "\n" : ""),
  )
  console.log(`April missing: ${rows.length}`)
  const byWeek = new Map<string, number>()
  for (const r of rows) byWeek.set(r.period_end, (byWeek.get(r.period_end) ?? 0) + 1)
  console.log("by week:")
  for (const [w, n] of [...byWeek].sort()) console.log(`  ending ${w}: ${n}`)
  process.exit(0)
}
main().catch(e => { console.error(e); process.exit(1) })
