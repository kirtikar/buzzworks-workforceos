import postgres from "postgres"
const sql = postgres(process.env.POSTGRES_URL ?? process.env.DATABASE_URL!, { ssl: "require" })
async function run() {
  const before = await sql<{ tot: string; test: string }[]>`
    SELECT COUNT(*) AS tot, COUNT(*) FILTER (WHERE is_test_data) AS test FROM employees`
  console.log(`before: ${before[0].tot} employees (${before[0].test} test)`)

  await sql.begin(async tx => {
    await tx`DELETE FROM employees WHERE is_test_data = true`
  })

  const after = await sql<{ emp_total: string; ts_total: string; cap: string }[]>`
    SELECT (SELECT COUNT(*) FROM employees) AS emp_total,
           (SELECT COUNT(*) FROM timesheets) AS ts_total,
           (SELECT COUNT(*) FROM timesheets WHERE client_id='cap') AS cap`
  console.log(`after:  ${after[0].emp_total} employees · ${after[0].ts_total} timesheets (cap=${after[0].cap})`)
}
run().catch(e => { console.error(e); process.exit(1) }).finally(() => sql.end())
