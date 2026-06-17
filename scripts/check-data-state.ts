import { getSql } from "../lib/db/client"

async function main() {
  const sql = getSql()
  const r1 = await sql<{ period_start: string; period_end: string; n: string; statuses: string }[]>`
    SELECT period_start::text, period_end::text, COUNT(*)::text AS n,
           STRING_AGG(DISTINCT status, ',' ORDER BY status) AS statuses
    FROM timesheets WHERE client_id = 'cap'
    GROUP BY period_start, period_end
    ORDER BY period_start DESC
    LIMIT 12
  `
  console.table(r1)
  const r2 = await sql<{ earliest: string; latest: string; total: string; with_daily: string }[]>`
    SELECT
      MIN(period_start)::text AS earliest,
      MAX(period_start)::text AS latest,
      COUNT(*)::text AS total,
      (SELECT COUNT(DISTINCT timesheet_id)::text FROM daily_entries) AS with_daily
    FROM timesheets WHERE client_id = 'cap'
  `
  console.log("\ncap summary:", r2[0])
  process.exit(0)
}
main().catch(e => { console.error(e); process.exit(1) })
