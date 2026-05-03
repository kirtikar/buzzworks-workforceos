import { NextRequest, NextResponse } from "next/server"
import { getSql, isDbConfigured } from "@/lib/db/client"
import { getClient } from "@/lib/mock-data"
import type { Timesheet, Employee, ValidationCheck, DailyEntry } from "@/lib/types"

// GET /api/timesheets/[clientId]
//
// Returns the live per-client timesheet inbox state from Postgres,
// shaped exactly like the in-memory Timesheet[] + Employee[] objects
// the Inbox page already knows how to render. Same shape as the old
// /api/timesheets/acc; clientId is now a URL param so any real-data
// client (acc, cap, hex, lmt, pwc) can be queried.
//
// When DATABASE_URL is unset, returns { configured: false, ... } so
// the UI falls back gracefully.

interface DbTimesheetRow {
  id: string
  employee_id: string
  client_id: string
  period: string | null
  period_start: string
  period_end: string
  submitted_at: string | null
  source: string
  source_detail: string | null
  portal_id: string | null
  status: string
  total_hours: string
  regular_hours: string
  overtime_hours: string
  leave_hours: string
  total_payable: string | null
  validation_score: number
  flag_reason: string | null
  flagged_by: string | null
  approved_by: string | null
  approved_at: string | null
  ai_confidence: number | null
  ot_payout_cycle: string | null
  external_url: string | null
}

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

interface DbValidationRow {
  timesheet_id: string
  rule_id: string
  category: string
  rule: string
  result: string
  detail: string
}

interface DbDailyRow {
  timesheet_id: string
  entry_date: string
  day_of_week: string
  regular_hours: string
  overtime_hours: string
  leave_hours: string
  leave_type: string | null
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const { clientId } = await params
  // ?include=daily — opt-in to the heavy daily_entries join. Skipped by
  // default so the Inbox payload stays small (Capgemini drops from ~10
  // MB to ~3 MB when daily is excluded).
  const includeParam = req.nextUrl.searchParams.get("include") ?? ""
  const includeDaily = includeParam.split(",").includes("daily")

  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, timesheets: [], employees: [], expenses: [] })
  }

  try {
    const sql        = getSql()
    const clientMeta = getClient(clientId)
    const fallbackColor = clientMeta?.color ?? "#A100FF"
    const fallbackCity  = clientMeta?.city  ?? "Bangalore"

    // Run employees + timesheets + expenses in parallel.
    const [employees, timesheets, expenses] = await Promise.all([
      sql<DbEmployeeRow[]>`SELECT * FROM employees WHERE client_id = ${clientId}`,
      sql<DbTimesheetRow[]>`SELECT * FROM timesheets WHERE client_id = ${clientId} ORDER BY period_start DESC`,
      sql<{
        id: string; employee_id: string; client_id: string;
        worker_name: string | null; site: string | null; buyer: string | null;
        submitted_at: Date | string | null;
        amount: string; currency: string; status: string; revision: number;
        source_detail: string | null; external_url: string | null;
      }[]>`
        SELECT * FROM expense_sheets WHERE client_id = ${clientId} ORDER BY submitted_at DESC
      `.catch(() => []),
    ])
    const tsIds = timesheets.map(t => t.id)
    // Validations are needed by the Inbox drawer's JARVIS card (~6 rows
    // per timesheet). Daily entries (~7/ts) are only needed by the
    // Employee Detail calendar — opt-in via ?include=daily.
    const [validations, daily] = tsIds.length > 0
      ? await Promise.all([
          sql<DbValidationRow[]>`SELECT * FROM timesheet_validations WHERE timesheet_id IN ${sql(tsIds)}`,
          includeDaily
            ? sql<DbDailyRow[]>`SELECT * FROM daily_entries WHERE timesheet_id IN ${sql(tsIds)} ORDER BY entry_date`
            : Promise.resolve([] as DbDailyRow[]),
        ])
      : [[] as DbValidationRow[], [] as DbDailyRow[]]

    const validationsByTs = new Map<string, ValidationCheck[]>()
    for (const v of validations) {
      const list = validationsByTs.get(v.timesheet_id) ?? []
      list.push({
        id:          v.rule_id,
        category:    v.category as ValidationCheck["category"],
        rule:        v.rule,
        result:      v.result as ValidationCheck["result"],
        detail:      v.detail,
        autoChecked: true,
      })
      validationsByTs.set(v.timesheet_id, list)
    }

    const dailyByTs = new Map<string, DailyEntry[]>()
    for (const d of daily) {
      const list = dailyByTs.get(d.timesheet_id) ?? []
      list.push({
        date: d.entry_date,
        dayOfWeek: d.day_of_week,
        regularHours: parseFloat(d.regular_hours),
        overtimeHours: parseFloat(d.overtime_hours),
        leaveHours: parseFloat(d.leave_hours),
        leaveType: d.leave_type ?? undefined,
      })
      dailyByTs.set(d.timesheet_id, list)
    }

    const tsList: Timesheet[] = timesheets.map(t => ({
      id:               t.id,
      employeeId:       t.employee_id,
      clientId:         t.client_id,
      period:           t.period ?? "",
      periodStart:      t.period_start,
      periodEnd:        t.period_end,
      submittedAt:      t.submitted_at ?? `${t.period_end}T09:00:00Z`,
      source:           t.source as Timesheet["source"],
      sourceDetail:     t.source_detail ?? undefined,
      portalId:         (t.portal_id as Timesheet["portalId"]) ?? undefined,
      status:           t.status as Timesheet["status"],
      totalHours:       parseFloat(t.total_hours),
      regularHours:     parseFloat(t.regular_hours),
      overtimeHours:    parseFloat(t.overtime_hours),
      leaveHours:       parseFloat(t.leave_hours),
      totalPayable:     t.total_payable ? parseFloat(t.total_payable) : 0,
      dailyEntries:     dailyByTs.get(t.id) ?? [],
      validationChecks: validationsByTs.get(t.id) ?? [],
      validationScore:  t.validation_score,
      flagReason:       t.flag_reason ?? undefined,
      flaggedBy:        (t.flagged_by as Timesheet["flaggedBy"]) ?? undefined,
      approvedBy:       t.approved_by ?? undefined,
      approvedAt:       t.approved_at ?? undefined,
      aiConfidence:     t.ai_confidence ?? undefined,
      externalUrl:      t.external_url ?? undefined,
    }))

    const empList: Employee[] = employees.map(e => ({
      id:               e.id,
      employeeCode:     e.employee_code,
      name:             e.name,
      email:            e.email,
      clientId:         e.client_id,
      role:             e.role ?? "Contractor",
      jobCategory:      "Consulting",
      department:       e.department ?? "Consulting",
      city:             fallbackCity,
      startDate:        e.start_date ?? "",
      ratePerHour:      600,            // not surfaced in inbox; placeholder
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

    const lastImport = await sql<{ imported_at: string; row_count: number }[]>`
      SELECT imported_at, row_count FROM import_runs
      WHERE client_id = ${clientId} ORDER BY imported_at DESC LIMIT 1
    `

    const expenseList = expenses.map(x => ({
      id:           x.id,
      employeeId:   x.employee_id,
      clientId:     x.client_id,
      workerName:   x.worker_name ?? "",
      site:         x.site ?? "",
      buyer:        x.buyer ?? "",
      submittedAt:  x.submitted_at instanceof Date ? x.submitted_at.toISOString().slice(0, 10) : (x.submitted_at ?? ""),
      amount:       parseFloat(x.amount),
      currency:     x.currency,
      status:       x.status,
      revision:     x.revision,
      sourceDetail: x.source_detail ?? "",
      externalUrl:  x.external_url ?? "",
    }))

    return NextResponse.json({
      configured: true,
      clientId,
      timesheets: tsList,
      employees:  empList,
      expenses:   expenseList,
      lastImport: lastImport[0] ?? null,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
