import { NextRequest, NextResponse } from "next/server"
import { getSql, isDbConfigured } from "@/lib/db/client"
import { getClient } from "@/lib/mock-data"
import type { Employee } from "@/lib/types"

// GET /api/employees/[clientId]
//
// Lightweight roster endpoint — returns just the employee list plus a
// few aggregate counts for KPI rendering. Avoids the 10 MB payload of
// /api/timesheets/[clientId] (which joins timesheets + daily_entries +
// validations + expense_sheets) for callers that only need the roster.
//
// Pages that consume it:
//   • /employees           — list view
//   • /clients             — per-client KPIs in the table
//   • /clients/[id]        — header KPIs (Active, Pending, Payroll)
//   • / (home)             — Ops Cost by Client chart
//
// Pages that still use the heavy /api/timesheets/[clientId]:
//   • /timesheets          — Inbox, needs timesheets + validations
//   • /employees/[id]      — needs full timesheet history for calendar

interface DbEmployeeRow {
  id: string
  worker_id: string
  client_id: string
  name: string
  employee_code: string
  email: string
  role: string | null
  department: string | null
  manager_email: string | null
  manager_name: string | null
  avatar_color: string | null
  start_date: string | null
  earned_leaves: string
  consumed_leaves: string
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const { clientId } = await params

  if (!isDbConfigured()) {
    return NextResponse.json({
      configured: false, clientId, employees: [], summary: null,
    })
  }

  try {
    const sql        = getSql()
    const clientMeta = getClient(clientId)
    const fallbackColor = clientMeta?.color ?? "#A100FF"

    const [employees, summary] = await Promise.all([
      sql<DbEmployeeRow[]>`
        SELECT id, worker_id, client_id, name, employee_code, email,
               role, department, manager_email, manager_name, avatar_color,
               start_date, earned_leaves, consumed_leaves
        FROM employees WHERE client_id = ${clientId}
      `,
      // One-shot aggregate query — avoids returning the timesheets table.
      sql<{
        ts_count: string
        ts_pending: string
        march_payroll: string | null
        april_payroll: string | null
        expense_invoiced: string | null
        expense_pending:  string | null
      }[]>`
        SELECT
          (SELECT COUNT(*) FROM timesheets WHERE client_id = ${clientId})::text                                                AS ts_count,
          (SELECT COUNT(*) FROM timesheets WHERE client_id = ${clientId} AND status IN ('pending','reviewing'))::text         AS ts_pending,
          (SELECT COALESCE(SUM(total_payable), 0) FROM timesheets
           WHERE client_id = ${clientId} AND period_start >= '2026-03-01' AND period_start <  '2026-04-01')::text             AS march_payroll,
          (SELECT COALESCE(SUM(total_payable), 0) FROM timesheets
           WHERE client_id = ${clientId} AND period_start >= '2026-04-01' AND period_start <  '2026-05-01')::text             AS april_payroll,
          (SELECT COALESCE(SUM(amount), 0) FROM expense_sheets WHERE client_id = ${clientId} AND status = 'Invoiced')::text   AS expense_invoiced,
          (SELECT COALESCE(SUM(amount), 0) FROM expense_sheets WHERE client_id = ${clientId} AND status ILIKE 'pending%')::text AS expense_pending
      `.catch(() => [{
        ts_count: "0", ts_pending: "0",
        march_payroll: "0", april_payroll: "0",
        expense_invoiced: "0", expense_pending: "0",
      }]),
    ])

    const empList: Employee[] = employees.map(e => ({
      id:               e.id,
      employeeCode:     e.employee_code,
      name:             e.name,
      email:            e.email,
      clientId:         e.client_id,
      role:             e.role ?? "Contractor",
      jobCategory:      "Consulting",
      department:       e.department ?? "Consulting",
      // Region: prefer the employee's own department/site descriptor (we
      // store the resolved city as department for Fieldglass workers).
      // Fall back to the client's default city only as a last resort.
      city:             e.department && e.department !== "Consulting"
                          ? e.department
                          : (clientMeta?.city ?? "Bangalore"),
      startDate:        e.start_date ?? "",
      ratePerHour:      600,
      payGrade:         "C5",
      payMode:          "hourly",
      payRate:          600,
      leaveBalance: {
        annual: parseFloat(e.earned_leaves),
        sick: 0, casual: 0,
        usedAnnual: parseFloat(e.consumed_leaves),
        usedSick: 0, usedCasual: 0,
      },
      managerEmail:     e.manager_email ?? undefined,
      managerName:      e.manager_name ?? undefined,
      employmentStatus: "active",
      avatarColor:      e.avatar_color ?? fallbackColor,
    }))

    const s = summary[0]
    return NextResponse.json({
      configured: true,
      clientId,
      employees:  empList,
      summary: {
        employeeCount:   empList.length,
        timesheetCount:  parseInt(s?.ts_count ?? "0", 10),
        pendingCount:    parseInt(s?.ts_pending ?? "0", 10),
        marchPayroll:    parseFloat(s?.march_payroll ?? "0"),
        aprilPayroll:    parseFloat(s?.april_payroll ?? "0"),
        expenseInvoiced: parseFloat(s?.expense_invoiced ?? "0"),
        expensePending:  parseFloat(s?.expense_pending  ?? "0"),
      },
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
