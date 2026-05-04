import { getSql } from "../lib/db/client"

async function main() {
  const sql = getSql()
  const t0 = Date.now()
  const rows = await sql.unsafe(`
    SELECT
      t.id, t.employee_id, t.client_id,
      t.period, t.period_start, t.period_end,
      t.status, t.total_hours, t.overtime_hours,
      t.validation_score,
      e.name AS employee_name, e.email AS employee_email,
      (SELECT COUNT(*)::int FROM timesheet_validations v WHERE v.timesheet_id = t.id AND v.result = 'fail')    AS check_fail,
      (SELECT COUNT(*)::int FROM timesheet_validations v WHERE v.timesheet_id = t.id AND v.result = 'warning') AS check_warn,
      (SELECT COUNT(*)::int FROM timesheet_validations v WHERE v.timesheet_id = t.id)                          AS check_total,
      COUNT(*) OVER () AS _total
    FROM timesheets t
    JOIN employees e ON e.id = t.employee_id
    WHERE t.client_id = ANY($1::text[])
    ORDER BY COALESCE(t.submitted_at, t.period_end::timestamptz) DESC, t.id DESC
    LIMIT $2 OFFSET $3
  `, [["cap"], 10, 0] as never[])
  const ms = Date.now() - t0
  console.log(`rows query: ${ms}ms, returned ${rows.length}`)
  if (rows.length) console.log("first row keys:", Object.keys(rows[0]).join(","))

  const t1 = Date.now()
  const totalsRows = await sql.unsafe(`
    SELECT
      SUM(CASE WHEN status = ANY($2::text[]) THEN 1 ELSE 0 END)::int AS actionable,
      SUM(CASE WHEN status = 'flagged' THEN 1 ELSE 0 END)::int AS flagged,
      SUM(CASE WHEN overtime_hours > 0 AND status = ANY($2::text[]) THEN 1 ELSE 0 END)::int AS ot,
      status, COUNT(*)::int AS n
    FROM timesheets
    WHERE client_id = ANY($1::text[])
    GROUP BY ROLLUP (status)
  `, [["cap"], ["pending","reviewing","flagged","pending_mgr_approval"]] as never[])
  const ms1 = Date.now() - t1
  console.log(`totals query: ${ms1}ms, returned ${totalsRows.length} rows`)

  process.exit(0)
}
main().catch(e => { console.error(e); process.exit(1) })
