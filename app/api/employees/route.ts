import { NextRequest, NextResponse } from "next/server"
import { getSql, isDbConfigured } from "@/lib/db/client"
import { getClient } from "@/lib/mock-data"

// GET /api/employees
//
// Server-paginated, server-filtered global employee directory. Replaces
// the pattern of fan-out fetching /api/employees/[clientId] for every
// client and then filtering in the browser.
//
// Query params:
//   clients   csv: client_ids to scope (defaults to none → all)
//   cities    csv: city/department filter
//   statuses  csv: employment_status filter
//   q         str : search across name/email/employee_code/role
//   sort      one of: name | rate | startDate | leave
//   page, size
//
// Response: { rows: Employee[], total, page, size }

function csv(s: string | null): string[] {
  return (s ?? "").split(",").map(x => x.trim()).filter(Boolean)
}

function orderClause(sort: string): string {
  switch (sort) {
    case "rate":      return "e.rate_per_hour DESC NULLS LAST, e.name ASC"
    case "startDate": return "e.start_date DESC NULLS LAST, e.name ASC"
    case "leave":     return "(e.earned_leaves - e.consumed_leaves) DESC, e.name ASC"
    case "name":
    default:          return "e.name ASC"
  }
}

export async function GET(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, rows: [], total: 0, page: 1, size: 0 })
  }

  const sp = req.nextUrl.searchParams
  const clients  = csv(sp.get("clients"))
  const cities   = csv(sp.get("cities"))
  const statuses = csv(sp.get("statuses"))
  const q        = (sp.get("q") ?? "").trim()
  const sort     = sp.get("sort") ?? "name"
  const page     = Math.max(1, parseInt(sp.get("page") ?? "1", 10))
  const size     = Math.min(200, Math.max(1, parseInt(sp.get("size") ?? "50", 10)))
  const offset   = (page - 1) * size

  const sql = getSql()

  const where: string[] = ["e.is_test_data = false"]
  const params: unknown[] = []
  const push = (clause: string, ...vals: unknown[]) => {
    where.push(clause); params.push(...vals)
  }

  if (clients.length)  push(`e.client_id = ANY($${params.length + 1}::text[])`, clients)
  if (cities.length)   push(`e.department = ANY($${params.length + 1}::text[])`, cities)
  if (statuses.length) push(`e.employment_status = ANY($${params.length + 1}::text[])`, statuses)
  if (q) {
    const i = params.length + 1
    push(
      `(e.name ILIKE $${i} OR e.email ILIKE $${i} OR e.employee_code ILIKE $${i} OR COALESCE(e.role,'') ILIKE $${i})`,
      `%${q}%`,
    )
  }
  const whereSql = `WHERE ${where.join(" AND ")}`

  try {
    const rowsSql = `
      SELECT
        e.id, e.worker_id, e.client_id, e.name, e.employee_code, e.email,
        e.role, e.department, e.manager_email, e.manager_name, e.avatar_color,
        e.start_date, e.earned_leaves, e.consumed_leaves,
        e.rate_per_hour, e.pay_mode, e.pay_rate, e.employment_status,
        COUNT(*) OVER () AS _total
      FROM employees e
      ${whereSql}
      ORDER BY ${orderClause(sort)}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `

    const rows = await sql.unsafe<Record<string, unknown>[]>(rowsSql, [...params, size, offset] as never[])
    const total = rows.length ? Number((rows[0] as { _total: string | number })._total) : 0

    const out = rows.map(r => {
      const clientId = r.client_id as string
      const clientMeta = getClient(clientId)
      const department = (r.department as string | null) ?? "Consulting"
      return {
        id:               r.id as string,
        employeeCode:     r.employee_code as string,
        name:             r.name as string,
        email:            r.email as string,
        clientId,
        role:             (r.role as string | null) ?? "Contractor",
        jobCategory:      "Consulting",
        department,
        // Region: prefer department (we store resolved site city there for
        // Fieldglass workers); fall back to client default.
        city:             department && department !== "Consulting"
                            ? department : (clientMeta?.city ?? "Bangalore"),
        startDate:        (r.start_date as string | null) ?? "",
        ratePerHour:      r.rate_per_hour ? parseFloat(r.rate_per_hour as string) : 600,
        payGrade:         "C5",
        payMode:          (r.pay_mode as string | null) ?? "hourly",
        payRate:          r.pay_rate ? parseFloat(r.pay_rate as string) : 600,
        leaveBalance: {
          annual:      parseFloat((r.earned_leaves as string | null)   ?? "0"),
          sick: 0, casual: 0,
          usedAnnual:  parseFloat((r.consumed_leaves as string | null) ?? "0"),
          usedSick: 0, usedCasual: 0,
        },
        managerEmail:     (r.manager_email as string | null) ?? undefined,
        managerName:      (r.manager_name as string | null) ?? undefined,
        employmentStatus: (r.employment_status as string | null) ?? "active",
        avatarColor:      (r.avatar_color as string | null) ?? clientMeta?.color ?? "#A100FF",
      }
    })

    return NextResponse.json(
      { configured: true, rows: out, total, page, size },
      { headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=60" } },
    )
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
