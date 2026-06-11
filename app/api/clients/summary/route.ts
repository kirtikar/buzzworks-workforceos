import { NextRequest, NextResponse } from "next/server"
import { getSqlChecked, isDbConfigured } from "@/lib/db/client"

// GET /api/clients/summary
//
// All-clients KPI rollup in a single round trip. Replaces the home
// page's pattern of fan-out fetching /api/employees/[c] for every
// client just to read 8 numbers each.
//
// Response: { rows: Array<{
//   clientId, employeeCount, timesheetCount, pendingCount,
//   marchPayroll, aprilPayroll, expenseInvoiced, expensePending
// }> }

export async function GET(_req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, rows: [] })
  }
  const sql = await getSqlChecked()
  try {
    // Three GROUP BY queries in parallel keeps each query tight on its
    // own composite index. A single mega-CTE would force a sequential
    // scan across employees+timesheets+expense_sheets.
    const [emp, ts, exp] = await Promise.all([
      sql<{ client_id: string; n: string }[]>`
        SELECT client_id, COUNT(*)::text AS n FROM employees
        WHERE is_test_data = false GROUP BY client_id
      `,
      sql<{
        client_id: string; n: string; pending: string;
        march: string; april: string;
      }[]>`
        SELECT
          client_id,
          COUNT(*)::text                                                    AS n,
          SUM(CASE WHEN status IN ('pending','reviewing') THEN 1 ELSE 0 END)::text AS pending,
          COALESCE(SUM(CASE WHEN period_start >= '2026-03-01' AND period_start < '2026-04-01'
                            THEN total_payable ELSE 0 END), 0)::text         AS march,
          COALESCE(SUM(CASE WHEN period_start >= '2026-04-01' AND period_start < '2026-05-01'
                            THEN total_payable ELSE 0 END), 0)::text         AS april
        FROM timesheets GROUP BY client_id
      `,
      sql<{ client_id: string; invoiced: string; pending: string }[]>`
        SELECT
          client_id,
          COALESCE(SUM(CASE WHEN status = 'Invoiced'        THEN amount ELSE 0 END), 0)::text AS invoiced,
          COALESCE(SUM(CASE WHEN status ILIKE 'pending%'    THEN amount ELSE 0 END), 0)::text AS pending
        FROM expense_sheets GROUP BY client_id
      `.catch(() => []),
    ])

    const byClient = new Map<string, {
      clientId: string
      employeeCount: number
      timesheetCount: number
      pendingCount: number
      marchPayroll: number
      aprilPayroll: number
      expenseInvoiced: number
      expensePending: number
    }>()
    const seed = (id: string) => {
      if (!byClient.has(id)) {
        byClient.set(id, {
          clientId: id, employeeCount: 0, timesheetCount: 0, pendingCount: 0,
          marchPayroll: 0, aprilPayroll: 0, expenseInvoiced: 0, expensePending: 0,
        })
      }
      return byClient.get(id)!
    }
    for (const r of emp) seed(r.client_id).employeeCount   = parseInt(r.n, 10)
    for (const r of ts)  {
      const x = seed(r.client_id)
      x.timesheetCount = parseInt(r.n, 10)
      x.pendingCount   = parseInt(r.pending, 10)
      x.marchPayroll   = parseFloat(r.march)
      x.aprilPayroll   = parseFloat(r.april)
    }
    for (const r of exp) {
      const x = seed(r.client_id)
      x.expenseInvoiced = parseFloat(r.invoiced)
      x.expensePending  = parseFloat(r.pending)
    }

    return NextResponse.json(
      { configured: true, rows: [...byClient.values()] },
      { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=120" } },
    )
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
