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

    // Build the full insert payload in memory first, then send as one
    // bulk-insert statement (vs ~480 round-trips which times out on
    // Vercel Hobby's 30s function limit at Mumbai-DB latency).
    const rows: Array<{
      id: string; worker_id: string; client_id: string;
      name: string; employee_code: string; email: string;
      role: string | null; department: string | null;
      manager_email: string | null; manager_name: string | null;
      avatar_color: string | null; start_date: string | null;
      earned_leaves: number; consumed_leaves: number;
      is_test_data: boolean; rate_per_hour: number;
      pay_mode: string; pay_rate: number; employment_status: string;
    }> = []

    for (const client of clients) {
      if (REAL_DATA_CLIENT_IDS.has(client.id)) continue
      const seedForClient = seedEmployees.filter(e => e.clientId === client.id)
      const need = Math.min(TEST_POOL_SIZE_PER_CLIENT, client.employeeCount) - seedForClient.length
      const generated = need > 0
        ? generateEmployeesForClient(client.id, need, seedForClient.length)
        : []
      const all: Employee[] = [...seedForClient, ...generated]
      for (const e of all) {
        rows.push({
          id: e.id, worker_id: e.employeeCode, client_id: e.clientId,
          name: e.name, employee_code: e.employeeCode, email: e.email,
          role: e.role ?? null, department: e.department ?? null,
          manager_email: e.managerEmail ?? null, manager_name: e.managerName ?? null,
          avatar_color: e.avatarColor ?? null, start_date: e.startDate ?? null,
          earned_leaves: 0, consumed_leaves: 0,
          is_test_data: true, rate_per_hour: e.ratePerHour,
          pay_mode: e.payMode, pay_rate: e.payRate,
          employment_status: e.employmentStatus,
        })
      }
      perClient[client.id] = all.length
    }

    await sql.begin(async tx => {
      await tx`DELETE FROM employees WHERE is_test_data = true`
      if (rows.length > 0) {
        await tx`
          INSERT INTO employees ${tx(rows,
            "id", "worker_id", "client_id", "name", "employee_code", "email",
            "role", "department", "manager_email", "manager_name", "avatar_color",
            "start_date", "earned_leaves", "consumed_leaves",
            "is_test_data", "rate_per_hour", "pay_mode", "pay_rate", "employment_status"
          )}
        `
      }
    })
    inserted = rows.length

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
