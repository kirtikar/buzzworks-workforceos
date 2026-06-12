import { NextResponse } from "next/server"
import { getSqlChecked } from "@/lib/db/client"

// Runs the EXACT two queries that /api/inbox issues, individually
// timed and individually timeout-protected, so we can pinpoint which
// one hangs.

export const maxDuration = 25

const ACTIONABLE_STATUSES = ["pending", "reviewing", "flagged", "pending_mgr_approval"]

async function withTimeout<T>(label: string, p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label}-timeout`)), ms),
    ),
  ]) as Promise<T>
}

export async function GET() {
  const out: Record<string, unknown> = { commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "unknown" }
  try {
    const sql = await getSqlChecked()

    // 1) rowsSql with scalar subqueries + window function
    const rowsSqlText = `
      SELECT
        t.id, t.employee_id, t.client_id, t.period, t.period_start, t.period_end,
        t.submitted_at, t.source, t.status, t.total_hours,
        e.name AS employee_name,
        (SELECT COUNT(*)::int FROM timesheet_validations v WHERE v.timesheet_id = t.id AND v.result = 'fail')    AS check_fail,
        (SELECT COUNT(*)::int FROM timesheet_validations v WHERE v.timesheet_id = t.id AND v.result = 'warning') AS check_warn,
        (SELECT COUNT(*)::int FROM timesheet_validations v WHERE v.timesheet_id = t.id)                          AS check_total,
        COUNT(*) OVER () AS _total
      FROM timesheets t
      JOIN employees e ON e.id = t.employee_id
      WHERE t.client_id = ANY($1::text[])
      ORDER BY COALESCE(t.submitted_at, t.period_end::timestamptz) DESC, t.id DESC
      LIMIT $2 OFFSET $3
    `
    const t1 = Date.now()
    try {
      const r1 = await withTimeout(
        "rowsSql",
        sql.unsafe<Record<string, unknown>[]>(rowsSqlText, [["cap"], 2, 0] as never[]),
        15_000,
      )
      out.ms_rows = Date.now() - t1
      out.rows_returned = r1.length
    } catch (e) {
      out.ms_rows = Date.now() - t1
      out.rows_error = (e as Error).message
    }

    // 3) BOTH queries via Promise.all — mimics what /api/inbox does
    const totalsSqlForPar = `
      SELECT
        SUM(CASE WHEN status = ANY($2::text[]) THEN 1 ELSE 0 END)::int AS actionable,
        SUM(CASE WHEN status = 'flagged' THEN 1 ELSE 0 END)::int AS flagged,
        status, COUNT(*)::int AS n
      FROM timesheets
      WHERE client_id = ANY($1::text[])
      GROUP BY ROLLUP (status)
    `
    const tPar = Date.now()
    try {
      const [pr1, pr2] = await withTimeout(
        "parallel",
        Promise.all([
          sql.unsafe<Record<string, unknown>[]>(rowsSqlText, [["cap"], 2, 0] as never[]),
          sql.unsafe<Record<string, unknown>[]>(totalsSqlForPar, [["cap"], ACTIONABLE_STATUSES] as never[]),
        ]),
        15_000,
      )
      out.ms_parallel = Date.now() - tPar
      out.parallel_rows = pr1.length
      out.parallel_totals_rows = pr2.length
    } catch (e) {
      out.ms_parallel = Date.now() - tPar
      out.parallel_error = (e as Error).message
    }

    // 2) totalsSql — ROLLUP query
    const totalsSqlText = `
      SELECT
        SUM(CASE WHEN status = ANY($2::text[]) THEN 1 ELSE 0 END)::int AS actionable,
        SUM(CASE WHEN status = 'flagged' THEN 1 ELSE 0 END)::int AS flagged,
        SUM(CASE WHEN overtime_hours > 0 AND status = ANY($2::text[]) THEN 1 ELSE 0 END)::int AS ot,
        status, COUNT(*)::int AS n
      FROM timesheets
      WHERE client_id = ANY($1::text[])
      GROUP BY ROLLUP (status)
    `
    const t2 = Date.now()
    try {
      const r2 = await withTimeout(
        "totalsSql",
        sql.unsafe<Record<string, unknown>[]>(totalsSqlText, [["cap"], ACTIONABLE_STATUSES] as never[]),
        15_000,
      )
      out.ms_totals = Date.now() - t2
      out.totals_rows = r2.length
    } catch (e) {
      out.ms_totals = Date.now() - t2
      out.totals_error = (e as Error).message
    }

    out.ok = true
    return NextResponse.json(out)
  } catch (e) {
    out.ok = false
    out.error = (e as Error).message
    return NextResponse.json(out, { status: 500 })
  }
}
