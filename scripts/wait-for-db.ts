import { getSql } from "../lib/db/client"

// Poll the Supabase pooler every 15s until SELECT 1 succeeds, then
// dump a few headline counts so we can confirm data integrity in one
// glance. Exits 0 on first success, or after ~30 min if it never wakes.

async function probe(): Promise<string | null> {
  try {
    const sql = getSql()
    const [{ ts, emp, daily, valid, exp }] = await sql<{
      ts: string; emp: string; daily: string; valid: string; exp: string
    }[]>`
      SELECT
        (SELECT COUNT(*) FROM timesheets)::text             AS ts,
        (SELECT COUNT(*) FROM employees)::text              AS emp,
        (SELECT COUNT(*) FROM daily_entries)::text          AS daily,
        (SELECT COUNT(*) FROM timesheet_validations)::text  AS valid,
        (SELECT COUNT(*) FROM expense_sheets)::text         AS exp
    `
    return `timesheets=${ts} employees=${emp} daily=${daily} validations=${valid} expenses=${exp}`
  } catch (e) {
    const msg = (e as Error).message
    if (msg.includes("tenant/user") || msg.includes("ENOTFOUND")) return null
    throw e
  }
}

async function main() {
  const start = Date.now()
  const DEADLINE_MS = 30 * 60 * 1000
  let attempt = 0
  while (Date.now() - start < DEADLINE_MS) {
    attempt++
    const out = await probe()
    if (out) {
      console.log(`✓ DB awake on attempt ${attempt}`)
      console.log(`  ${out}`)
      process.exit(0)
    }
    process.stdout.write(`. attempt ${attempt} — still paused\n`)
    await new Promise(r => setTimeout(r, 15_000))
  }
  console.log(`✗ deadline reached after ${attempt} attempts`)
  process.exit(1)
}
main().catch(e => { console.error(e); process.exit(1) })
