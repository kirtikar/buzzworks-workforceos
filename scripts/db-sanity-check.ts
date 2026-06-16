import { getSql } from "../lib/db/client"

async function main() {
  const sql = getSql()

  console.log("=== Per-client timesheet & employee counts ===")
  const counts = await sql<{
    client_id: string
    ts_count: string
    emp_count: string
    daily_count: string
    valid_count: string
    exp_count: string
  }[]>`
    SELECT
      c.client_id,
      (SELECT COUNT(*) FROM timesheets t WHERE t.client_id = c.client_id)::text AS ts_count,
      (SELECT COUNT(*) FROM employees  e WHERE e.client_id = c.client_id)::text AS emp_count,
      (SELECT COUNT(*) FROM daily_entries d JOIN timesheets t ON d.timesheet_id = t.id WHERE t.client_id = c.client_id)::text AS daily_count,
      (SELECT COUNT(*) FROM timesheet_validations v JOIN timesheets t ON v.timesheet_id = t.id WHERE t.client_id = c.client_id)::text AS valid_count,
      (SELECT COUNT(*) FROM expense_sheets x WHERE x.client_id = c.client_id)::text AS exp_count
    FROM (
      SELECT DISTINCT client_id FROM timesheets
      UNION SELECT DISTINCT client_id FROM employees
    ) c
    ORDER BY c.client_id
  `
  console.table(counts)

  console.log("\n=== Status distribution per client ===")
  const statuses = await sql<{ client_id: string; status: string; n: string }[]>`
    SELECT client_id, status, COUNT(*)::text AS n
    FROM timesheets
    GROUP BY client_id, status
    ORDER BY client_id, status
  `
  console.table(statuses)

  console.log("\n=== Latest 3 timesheets per client (most recent period) ===")
  const latest = await sql<{
    client_id: string; id: string; employee_id: string;
    period_start: string; period_end: string; status: string;
    total_hours: string; submitted_at: string | null
  }[]>`
    SELECT DISTINCT ON (client_id, period_start)
      client_id, id, employee_id, period_start::text, period_end::text,
      status, total_hours::text, submitted_at::text
    FROM timesheets
    ORDER BY client_id, period_start DESC, id
    LIMIT 30
  `
  console.table(latest)

  console.log("\n=== Sample employee record per client ===")
  const sampleEmp = await sql<{
    client_id: string; id: string; name: string; employee_code: string; department: string | null
  }[]>`
    SELECT DISTINCT ON (client_id)
      client_id, id, name, employee_code, department
    FROM employees
    ORDER BY client_id, id
  `
  console.table(sampleEmp)

  console.log("\n=== Simulate what /api/inbox?clients=acc,cap,hex,lmt,pwc returns (first page) ===")
  const inboxRows = await sql.unsafe(`
    SELECT
      t.id, t.client_id, t.status, t.period::text, t.period_start::text, t.total_hours::text,
      e.name AS employee_name
    FROM timesheets t
    JOIN employees e ON e.id = t.employee_id
    WHERE t.client_id = ANY($1::text[])
    ORDER BY COALESCE(t.submitted_at, t.period_end::timestamptz) DESC, t.id DESC
    LIMIT 5
  `, [["acc", "cap", "hex", "lmt", "pwc"]] as never[])
  console.table(inboxRows)

  process.exit(0)
}
main().catch(e => { console.error(e); process.exit(1) })
