import { NextRequest, NextResponse } from "next/server"
import { getSql, isDbConfigured } from "@/lib/db/client"

// GET /api/inbox
//
// Server-paginated, server-filtered timesheet inbox feed. Replaces the
// pattern of fetching every client's full timesheets payload and doing
// pagination + filtering in the browser. The slim row shape carries
// only the fields the row + sidebar render — validations and daily
// entries are fetched lazily by /api/timesheet/[id].
//
// Query params:
//   clients   csv: client_ids to scope (defaults to none → empty)
//   statuses  csv: status filter
//   sources   csv: source filter
//   scoreBands csv: high|med|low (validation_score bands)
//   otOnly    1   : overtime_hours > 0
//   actionableOnly 1 : status in (pending,reviewing,flagged,pending_mgr_approval)
//   q         str : substring search across employee name/email/code/period
//   sort      one of: date | score-asc | score-desc | client | hours
//   page      int (1-based), size int (default 50, capped 200)
//
// Response:
//   { rows: SlimInboxRow[], total, page, size, totals: { actionable, flagged, ot, byStatus } }

const ACTIONABLE_STATUSES = ["pending", "reviewing", "flagged", "pending_mgr_approval"]

function csv(s: string | null): string[] {
  return (s ?? "").split(",").map(x => x.trim()).filter(Boolean)
}

function bandCondition(bands: string[]): string | null {
  // Translate band names → SQL range expression. Combined with OR if multiple.
  const parts: string[] = []
  if (bands.includes("high")) parts.push("t.validation_score >= 85")
  if (bands.includes("med"))  parts.push("(t.validation_score >= 60 AND t.validation_score < 85)")
  if (bands.includes("low"))  parts.push("t.validation_score < 60")
  return parts.length ? `(${parts.join(" OR ")})` : null
}

function orderClause(sort: string): string {
  switch (sort) {
    case "score-asc":  return "t.validation_score ASC, t.period_start DESC"
    case "score-desc": return "t.validation_score DESC, t.period_start DESC"
    case "client":     return "t.client_id ASC, t.period_start DESC"
    case "hours":      return "t.total_hours DESC, t.period_start DESC"
    case "date":
    default:           return "COALESCE(t.submitted_at, t.period_end::timestamptz) DESC, t.id DESC"
  }
}

export async function GET(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({
      configured: false, rows: [], total: 0, page: 1, size: 0,
      totals: { actionable: 0, flagged: 0, ot: 0, byStatus: {} },
    })
  }

  const sp = req.nextUrl.searchParams
  const clients   = csv(sp.get("clients"))
  const statuses  = csv(sp.get("statuses"))
  const sources   = csv(sp.get("sources"))
  const scoreBands = csv(sp.get("scoreBands"))
  const otOnly    = sp.get("otOnly") === "1"
  const actionableOnly = sp.get("actionableOnly") === "1"
  const q         = (sp.get("q") ?? "").trim()
  const sort      = sp.get("sort") ?? "date"
  const page      = Math.max(1, parseInt(sp.get("page") ?? "1", 10))
  const size      = Math.min(200, Math.max(1, parseInt(sp.get("size") ?? "50", 10)))
  const offset    = (page - 1) * size

  const sql = getSql()

  // Build dynamic WHERE — postgres-js's sql.unsafe() with positional params
  // gives us safe parameter binding while keeping the SQL composable.
  const where: string[] = []
  const params: unknown[] = []
  const push = (clause: string, ...vals: unknown[]) => {
    where.push(clause)
    params.push(...vals)
  }

  if (clients.length) {
    push(`t.client_id = ANY($${params.length + 1}::text[])`, clients)
  }
  if (statuses.length) {
    push(`t.status = ANY($${params.length + 1}::text[])`, statuses)
  }
  if (sources.length) {
    push(`t.source = ANY($${params.length + 1}::text[])`, sources)
  }
  if (otOnly) push(`t.overtime_hours > 0`)
  if (actionableOnly) {
    push(`t.status = ANY($${params.length + 1}::text[])`, ACTIONABLE_STATUSES)
  }
  const band = bandCondition(scoreBands)
  if (band) where.push(band)
  if (q) {
    // Trigram-friendly ILIKE — pg_trgm GIN index on employees.name/email
    // makes %q% matches index-eligible.
    const i = params.length + 1
    push(
      `(e.name ILIKE $${i} OR e.email ILIKE $${i} OR e.employee_code ILIKE $${i} OR t.period ILIKE $${i})`,
      `%${q}%`,
    )
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""

  try {
    // Page rows + post-filter total via window function. Validation
    // aggregates are joined as scalar subqueries — only runs for the
    // page's 50 rows, so cost is bounded.
    const rowsSql = `
      SELECT
        t.id, t.employee_id, t.client_id,
        t.period, t.period_start, t.period_end,
        t.submitted_at, t.source, t.source_detail, t.portal_id,
        t.status,
        t.total_hours, t.regular_hours, t.overtime_hours, t.leave_hours,
        t.total_payable,
        t.validation_score, t.flag_reason, t.flagged_by,
        t.approved_by, t.approved_at,
        t.ai_confidence, t.external_url,
        e.name AS employee_name, e.email AS employee_email,
        e.employee_code, e.role AS employee_role,
        e.department AS employee_department,
        e.manager_email, e.manager_name,
        e.avatar_color, e.earned_leaves, e.consumed_leaves,
        (SELECT COUNT(*)::int FROM timesheet_validations v WHERE v.timesheet_id = t.id AND v.result = 'fail')    AS check_fail,
        (SELECT COUNT(*)::int FROM timesheet_validations v WHERE v.timesheet_id = t.id AND v.result = 'warning') AS check_warn,
        (SELECT COUNT(*)::int FROM timesheet_validations v WHERE v.timesheet_id = t.id)                          AS check_total,
        COUNT(*) OVER () AS _total
      FROM timesheets t
      JOIN employees e ON e.id = t.employee_id
      ${whereSql}
      ORDER BY ${orderClause(sort)}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `
    const pageParams = [...params, size, offset]

    // Sidebar bucket totals — scoped only by clients (independent of
    // statuses/sources/q so the pills always reflect the client-wide
    // workload, not the filtered view). One ROLLUP gives per-status
    // counts and the grand total in a single round trip.
    const totalsWhere: string[] = []
    const totalsParams: unknown[] = []
    if (clients.length) {
      totalsWhere.push(`client_id = ANY($${totalsParams.length + 1}::text[])`)
      totalsParams.push(clients)
    }
    const totalsWhereSql = totalsWhere.length ? `WHERE ${totalsWhere.join(" AND ")}` : ""
    const actionableIdx = totalsParams.length + 1
    totalsParams.push(ACTIONABLE_STATUSES)
    const totalsSql = `
      SELECT
        SUM(CASE WHEN status = ANY($${actionableIdx}::text[]) THEN 1 ELSE 0 END)::int AS actionable,
        SUM(CASE WHEN status = 'flagged' THEN 1 ELSE 0 END)::int AS flagged,
        SUM(CASE WHEN overtime_hours > 0 AND status = ANY($${actionableIdx}::text[]) THEN 1 ELSE 0 END)::int AS ot,
        status, COUNT(*)::int AS n
      FROM timesheets
      ${totalsWhereSql}
      GROUP BY ROLLUP (status)
    `

    const [rows, totalsRows] = await Promise.all([
      sql.unsafe<Record<string, unknown>[]>(rowsSql, pageParams as never[]),
      sql.unsafe<{
        actionable: number; flagged: number; ot: number;
        status: string | null; n: number
      }[]>(totalsSql, totalsParams as never[]),
    ])

    const total = rows.length ? Number((rows[0] as { _total: string | number })._total) : 0

    const slim = rows.map(r => ({
      id:             r.id as string,
      employeeId:     r.employee_id as string,
      clientId:       r.client_id as string,
      period:         (r.period as string | null) ?? "",
      periodStart:    r.period_start as string,
      periodEnd:      r.period_end as string,
      submittedAt:    (r.submitted_at as string | null) ?? `${r.period_end}T09:00:00Z`,
      source:         r.source as string,
      sourceDetail:   r.source_detail as string | null,
      portalId:       r.portal_id as string | null,
      status:         r.status as string,
      totalHours:     parseFloat(r.total_hours as string),
      regularHours:   parseFloat(r.regular_hours as string),
      overtimeHours:  parseFloat(r.overtime_hours as string),
      leaveHours:     parseFloat(r.leave_hours as string),
      totalPayable:   r.total_payable ? parseFloat(r.total_payable as string) : 0,
      validationScore: r.validation_score as number,
      flagReason:     (r.flag_reason as string | null) ?? undefined,
      flaggedBy:      (r.flagged_by as string | null) ?? undefined,
      approvedBy:     (r.approved_by as string | null) ?? undefined,
      approvedAt:     (r.approved_at as string | null) ?? undefined,
      aiConfidence:   (r.ai_confidence as number | null) ?? undefined,
      externalUrl:    (r.external_url as string | null) ?? undefined,
      // Validation aggregates so bulk rules can decide without fetching
      // the full validationChecks array (drawer pulls those on demand).
      checkFail:      (r.check_fail as number | null) ?? 0,
      checkWarn:      (r.check_warn as number | null) ?? 0,
      checkTotal:     (r.check_total as number | null) ?? 0,
      // Embedded slim employee — UI doesn't have to maintain a separate map.
      employee: {
        id:             r.employee_id as string,
        name:           r.employee_name as string,
        email:          r.employee_email as string,
        employeeCode:   r.employee_code as string,
        role:           (r.employee_role as string | null) ?? "Contractor",
        department:     (r.employee_department as string | null) ?? "Consulting",
        managerEmail:   r.manager_email as string | null,
        managerName:    r.manager_name as string | null,
        avatarColor:    (r.avatar_color as string | null) ?? "#A100FF",
        earnedLeaves:   parseFloat((r.earned_leaves as string | null) ?? "0"),
        consumedLeaves: parseFloat((r.consumed_leaves as string | null) ?? "0"),
      },
    }))

    const byStatus: Record<string, number> = {}
    let totalsRow = { actionable: 0, flagged: 0, ot: 0 }
    for (const t of totalsRows) {
      if (t.status === null) {
        // ROLLUP grand-total row carries the bucket sums.
        totalsRow = { actionable: t.actionable, flagged: t.flagged, ot: t.ot }
      } else {
        byStatus[t.status] = t.n
      }
    }

    return NextResponse.json(
      {
        configured: true,
        rows: slim,
        total,
        page,
        size,
        totals: { ...totalsRow, byStatus },
      },
      {
        headers: {
          // Stale-while-revalidate keeps the inbox snappy on tab switch
          // while the backend re-queries in the background.
          "Cache-Control": "private, max-age=10, stale-while-revalidate=60",
        },
      },
    )
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
