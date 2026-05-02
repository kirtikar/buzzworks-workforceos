import postgres from "postgres"
const sql = postgres(process.env.POSTGRES_URL ?? process.env.DATABASE_URL!, { ssl: "require" })
async function run() {
  // Find dup rows first (employee_id, period_start) → keep newest TSN by id
  const dups = await sql<{ employee_id: string; period_start: Date; cnt: string }[]>`
    SELECT employee_id, period_start, COUNT(*) AS cnt
    FROM timesheets
    GROUP BY employee_id, period_start
    HAVING COUNT(*) > 1
  `
  console.log(`existing duplicates by (employee_id, period_start): ${dups.length} groups`)
  if (dups.length > 0) console.log(`  e.g. ${dups[0].employee_id} ${dups[0].period_start}`)

  // Drop the constraint so April uploads with revisions can co-exist.
  await sql`ALTER TABLE timesheets DROP CONSTRAINT IF EXISTS timesheets_employee_id_period_start_key`
  console.log(`✓ dropped UNIQUE (employee_id, period_start)`)
}
run().catch(e => { console.error(e); process.exit(1) }).finally(() => sql.end())
