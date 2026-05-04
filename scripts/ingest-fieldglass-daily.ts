// Local Postgres ingest for scraped Fieldglass day-wise JSONL.
//
// Why local: Vercel function deploys can lag and the upstream HTTP route
// (/api/import/fieldglass/daily) is rate-bound by the 10s function limit.
// Connecting directly from your dev machine bypasses both — and skips the
// public attack surface for a one-shot bulk import.
//
//   DATABASE_URL=postgres://...:...@...supabase.co:5432/postgres \
//     npx tsx scripts/ingest-fieldglass-daily.ts \
//     [out/fieldglass-march-daily.jsonl]
//
// Replaces synthesised daily_entries for every timesheet_id present in
// the JSONL with the scraped rows. Idempotent — safe to re-run after
// each scrape pass.

import * as fs from "fs"
import postgres from "postgres"

const file = process.argv[2] ?? "out/fieldglass-march-daily.jsonl"
const url  = process.env.DATABASE_URL ?? process.env.POSTGRES_URL
if (!url) { console.error("Set DATABASE_URL or POSTGRES_URL."); process.exit(1) }
if (!fs.existsSync(file)) { console.error(`File not found: ${file}`); process.exit(1) }

interface DailyIn  { date: string; hours: number; type?: string }
interface ScrapedTs {
  tsn:          string
  workerId?:    string
  periodStart?: string
  periodEnd?:   string
  daily:        DailyIn[]
}

const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
function dayOfWeek(iso: string): string {
  const d = new Date(iso); return isNaN(d.getTime()) ? "?" : DAY_NAMES[d.getUTCDay()]
}

const records: ScrapedTs[] = []
for (const line of fs.readFileSync(file, "utf-8").split("\n")) {
  if (!line.trim()) continue
  try { records.push(JSON.parse(line)) } catch { /* skip */ }
}
console.log(`Loaded ${records.length} scraped records from ${file}`)

const sql = postgres(url, { ssl: "require", max: 4, idle_timeout: 20 })

async function main() {
  // Map scraped TSN → our prefixed timesheet id.
  const tsIds = records.map(r => `cap-fg-${r.tsn}`)
  const known = await sql<{ id: string; period_start: Date | string }[]>`
    SELECT id, period_start FROM timesheets WHERE id IN ${sql(tsIds)}
  `
  const isoOf = (v: Date | string): string =>
    v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10)
  const knownById = new Map(known.map(r => [r.id, isoOf(r.period_start)]))
  console.log(`Matched ${knownById.size} / ${records.length} TSNs to existing timesheets`)

  const dailyRows: { timesheet_id: string; entry_date: string; day_of_week: string;
                     regular_hours: number; overtime_hours: number; leave_hours: number; leave_type: string | null }[] = []
  const skipMissing: string[] = []
  const touched = new Set<string>()

  for (const r of records) {
    const tsId = `cap-fg-${r.tsn}`
    if (!knownById.has(tsId)) { skipMissing.push(r.tsn); continue }
    touched.add(tsId)
    for (const d of r.daily) {
      // Scraper writes ISO dates already (YYYY-MM-DD); pass through.
      const iso = /^\d{4}-\d{2}-\d{2}/.test(d.date) ? d.date.slice(0, 10) : null
      if (!iso) continue
      const tLower = (d.type ?? "").toLowerCase()
      const isLeave = tLower.includes("leave") || tLower.includes("vacation") || tLower.includes("absence") || tLower.includes("holiday")
      const isOt    = tLower.includes("overtime") || tLower === "ot"
      dailyRows.push({
        timesheet_id:   tsId,
        entry_date:     iso,
        day_of_week:    dayOfWeek(iso),
        regular_hours:  isLeave || isOt ? 0 : d.hours,
        overtime_hours: isOt    ? d.hours : 0,
        leave_hours:    isLeave ? d.hours : 0,
        leave_type:     isLeave ? (d.type ?? null) : null,
      })
    }
  }

  // Dedupe by (timesheet_id, entry_date) — last write wins. The JSONL
  // can contain the same TSN twice (re-scraped during a residue pass);
  // ON CONFLICT DO UPDATE rejects same-row updates within one batch, so
  // we collapse here before the INSERT.
  const dedup = new Map<string, typeof dailyRows[number]>()
  for (const r of dailyRows) dedup.set(`${r.timesheet_id}|${r.entry_date}`, r)
  const dailyRowsDedup = [...dedup.values()]
  if (dailyRowsDedup.length !== dailyRows.length) {
    console.log(`Deduped ${dailyRows.length - dailyRowsDedup.length} duplicate (timesheet_id, entry_date) rows`)
  }

  console.log(`Will upsert ${dailyRowsDedup.length} daily rows across ${touched.size} timesheets ` +
              `(skip ${skipMissing.length} unknown TSNs)`)

  // Chunk under PG 65k bind-param cap. 7 cols → 9k row safe.
  const chunk = <T>(arr: T[], n: number): T[][] => {
    const out: T[][] = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out
  }

  await sql.begin(async tx => {
    const tsIdList = [...touched]
    for (const part of chunk(tsIdList, 5000)) {
      await tx`DELETE FROM daily_entries WHERE timesheet_id IN ${tx(part)}`
    }
    for (const part of chunk(dailyRowsDedup, 2000)) {
      if (part.length === 0) continue
      await tx`
        INSERT INTO daily_entries ${tx(part,
          "timesheet_id","entry_date","day_of_week",
          "regular_hours","overtime_hours","leave_hours","leave_type"
        )}
        ON CONFLICT (timesheet_id, entry_date) DO UPDATE SET
          day_of_week    = EXCLUDED.day_of_week,
          regular_hours  = EXCLUDED.regular_hours,
          overtime_hours = EXCLUDED.overtime_hours,
          leave_hours    = EXCLUDED.leave_hours,
          leave_type     = EXCLUDED.leave_type
      `
    }

    await tx`
      INSERT INTO import_runs (
        source, client_id, row_count, error_count, warning_count,
        errors, warnings, unmapped_headers
      ) VALUES (
        'fieldglass-daily-local', 'cap', ${dailyRows.length},
        ${0}, ${skipMissing.length},
        ${sql.json([])}, ${sql.json(skipMissing.map(s => `unknown timesheet: ${s}`))},
        ${[] as string[]}
      )
    `
  })

  console.log(`✓ DONE: ${dailyRows.length} daily rows ingested for ${touched.size} timesheets.`)
  if (skipMissing.length > 0) {
    console.log(`  Skipped ${skipMissing.length} unknown TSNs (first 5: ${skipMissing.slice(0, 5).join(", ")})`)
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => sql.end())
