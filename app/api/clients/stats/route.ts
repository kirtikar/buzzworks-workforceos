import { NextResponse } from "next/server"
import { getSqlChecked, isDbConfigured } from "@/lib/db/client"

// GET /api/clients/stats
//
// Returns a per-client snapshot of headcount + monthly payroll estimate
// derived live from the universal employees table. Backs the Clients
// page so the displayed numbers always reflect the actual database
// (test or real) rather than the hardcoded mock-data.ts values.
//
// monthly_payroll_estimate is computed per pay mode:
//   hourly  → rate_per_hour × 8 × 22
//   daily   → pay_rate × 22
//   monthly → pay_rate
//
// Returns { configured: false, stats: {} } when DATABASE_URL is unset
// so the Clients page can fall back to the static mock-data values.

interface StatsRow {
  client_id: string
  active_count: string
  total_count: string
  monthly_payroll: string | null
  is_test_data: boolean
}

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, stats: {} })
  }
  try {
    const sql = await getSqlChecked()
    const rows = await sql<StatsRow[]>`
      SELECT
        client_id,
        COUNT(*) FILTER (WHERE employment_status = 'active') AS active_count,
        COUNT(*) AS total_count,
        ROUND(SUM(
          CASE pay_mode
            WHEN 'monthly' THEN COALESCE(pay_rate, 0)
            WHEN 'daily'   THEN COALESCE(pay_rate, 0) * 22
            WHEN 'hourly'  THEN COALESCE(rate_per_hour, 0) * 8 * 22
            ELSE 0
          END
        ))::TEXT AS monthly_payroll,
        BOOL_AND(is_test_data) AS is_test_data
      FROM employees
      GROUP BY client_id
    `

    const stats: Record<string, {
      activeEmployees: number
      totalEmployees: number
      monthlyPayroll: number
      isTestData: boolean
    }> = {}
    for (const r of rows) {
      stats[r.client_id] = {
        activeEmployees: parseInt(r.active_count, 10),
        totalEmployees:  parseInt(r.total_count, 10),
        monthlyPayroll:  r.monthly_payroll ? parseFloat(r.monthly_payroll) : 0,
        isTestData:      r.is_test_data,
      }
    }

    return NextResponse.json({ configured: true, stats })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
