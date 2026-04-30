import { NextResponse } from "next/server"
import { getSql } from "@/lib/db/client"
import { clients, employees as seedEmployees, REAL_DATA_CLIENT_IDS } from "@/lib/mock-data"
import { generateEmployeesForClient } from "@/lib/mock-generator"
import type { Employee } from "@/lib/types"

// POST /api/admin/seed-test-data
//
// Wipes existing is_test_data=true rows and re-seeds the 6 non-real-data
// clients with synthetic employees so the Clients page has a real
// database to compute counts + payroll estimates from.
//
// Real-data clients (REAL_DATA_CLIENT_IDS — Accenture / Capgemini /
// Hexaware / LTIMindtree / PwC) are NEVER touched. Their rows have
// is_test_data=false and are managed through the per-portal import
// flow (BeeLine for Accenture today).
//
// Idempotent: running twice produces the same final state.

const TEST_POOL_SIZE_PER_CLIENT = 80

export async function POST() {
  try {
    const sql = getSql()
    let inserted = 0
    let perClient: Record<string, number> = {}

    await sql.begin(async tx => {
      // Wipe existing test rows (and cascade to their timesheets)
      await tx`DELETE FROM employees WHERE is_test_data = true`

      for (const client of clients) {
        if (REAL_DATA_CLIENT_IDS.has(client.id)) continue

        const seedForClient = seedEmployees.filter(e => e.clientId === client.id)
        const need = Math.min(TEST_POOL_SIZE_PER_CLIENT, client.employeeCount) - seedForClient.length
        const generated = need > 0
          ? generateEmployeesForClient(client.id, need, seedForClient.length)
          : []

        const all: Employee[] = [...seedForClient, ...generated]
        for (const e of all) {
          await tx`
            INSERT INTO employees (
              id, worker_id, client_id, name, employee_code, email,
              role, department, manager_email, manager_name, avatar_color,
              start_date, earned_leaves, consumed_leaves,
              is_test_data, rate_per_hour, pay_mode, pay_rate,
              employment_status
            ) VALUES (
              ${e.id}, ${e.employeeCode}, ${e.clientId}, ${e.name}, ${e.employeeCode}, ${e.email},
              ${e.role ?? null}, ${e.department ?? null}, ${e.managerEmail ?? null},
              ${e.managerName ?? null}, ${e.avatarColor ?? null},
              ${e.startDate ?? null}, 0, 0,
              true, ${e.ratePerHour}, ${e.payMode}, ${e.payRate},
              ${e.employmentStatus}
            )
            ON CONFLICT (id) DO UPDATE SET
              name              = EXCLUDED.name,
              email             = EXCLUDED.email,
              role              = EXCLUDED.role,
              department        = EXCLUDED.department,
              manager_email     = EXCLUDED.manager_email,
              avatar_color      = EXCLUDED.avatar_color,
              rate_per_hour     = EXCLUDED.rate_per_hour,
              pay_mode          = EXCLUDED.pay_mode,
              pay_rate          = EXCLUDED.pay_rate,
              employment_status = EXCLUDED.employment_status,
              is_test_data      = true,
              updated_at        = NOW()
          `
          inserted++
        }
        perClient[client.id] = all.length
      }
    })

    return NextResponse.json({ ok: true, inserted, perClient })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}

// Convenience: GET also runs the seed so the dashboard can be primed
// by visiting the URL once.
export async function GET() {
  return POST()
}
