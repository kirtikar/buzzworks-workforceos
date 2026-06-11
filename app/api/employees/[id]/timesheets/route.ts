import { NextRequest, NextResponse } from "next/server"
import { getSqlChecked, isDbConfigured } from "@/lib/db/client"
import { getClient } from "@/lib/mock-data"
import type { Timesheet, ValidationCheck, DailyEntry, ExpenseSheet, Employee } from "@/lib/types"

// GET /api/employees/[id]/timesheets?include=daily,validations,expenses
//
// Per-employee history. Replaces the pattern of pulling the entire
// client's timesheet payload (~3 MB for Capgemini, 4,462 rows) just to
// render one employee's calendar.

interface TsRow {
  id: string; employee_id: string; client_id: string
  period: string | null; period_start: string; period_end: string
  submitted_at: string | null; source: string; source_detail: string | null
  portal_id: string | null; status: string
  total_hours: string; regular_hours: string; overtime_hours: string; leave_hours: string
  total_payable: string | null
  validation_score: number; flag_reason: string | null; flagged_by: string | null
  approved_by: string | null; approved_at: string | null
  ai_confidence: number | null; ot_payout_cycle: string | null; external_url: string | null
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const include = (req.nextUrl.searchParams.get("include") ?? "").split(",").map(s => s.trim())
  const wantDaily       = include.includes("daily")
  const wantValidations = include.includes("validations")
  const wantExpenses    = include.includes("expenses")

  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false, timesheets: [] })
  }
  const sql = await getSqlChecked()
  try {
    const [empRows, timesheets] = await Promise.all([
      sql<{
        id: string; worker_id: string; client_id: string; name: string; employee_code: string;
        email: string; role: string | null; department: string | null;
        manager_email: string | null; manager_name: string | null;
        avatar_color: string | null; start_date: string | null;
        earned_leaves: string; consumed_leaves: string;
      }[]>`
        SELECT id, worker_id, client_id, name, employee_code, email,
               role, department, manager_email, manager_name, avatar_color,
               start_date, earned_leaves, consumed_leaves
        FROM employees WHERE id = ${id} LIMIT 1
      `,
      sql<TsRow[]>`SELECT * FROM timesheets WHERE employee_id = ${id} ORDER BY period_start DESC`,
    ])
    const tsIds = timesheets.map(t => t.id)
    const er = empRows[0]
    const clientMeta = er ? getClient(er.client_id) : undefined
    const employee: Employee | null = er ? {
      id: er.id, employeeCode: er.employee_code, name: er.name, email: er.email,
      clientId: er.client_id,
      role: er.role ?? "Contractor",
      jobCategory: "Consulting",
      department: er.department ?? "Consulting",
      city: er.department && er.department !== "Consulting"
              ? er.department : (clientMeta?.city ?? "Bangalore"),
      startDate: er.start_date ?? "",
      ratePerHour: 600, payGrade: "C5", payMode: "hourly", payRate: 600,
      leaveBalance: {
        annual: parseFloat(er.earned_leaves), sick: 0, casual: 0,
        usedAnnual: parseFloat(er.consumed_leaves), usedSick: 0, usedCasual: 0,
      },
      managerEmail: er.manager_email ?? undefined,
      managerName:  er.manager_name ?? undefined,
      employmentStatus: "active",
      avatarColor: er.avatar_color ?? clientMeta?.color ?? "#A100FF",
    } : null

    const [validations, daily, expenses] = await Promise.all([
      wantValidations && tsIds.length
        ? sql<{ timesheet_id: string; rule_id: string; category: string; rule: string; result: string; detail: string }[]>`
            SELECT timesheet_id, rule_id, category, rule, result, detail
            FROM timesheet_validations WHERE timesheet_id IN ${sql(tsIds)}`
        : Promise.resolve([] as { timesheet_id: string; rule_id: string; category: string; rule: string; result: string; detail: string }[]),
      wantDaily && tsIds.length
        ? sql<{ timesheet_id: string; entry_date: string; day_of_week: string; regular_hours: string; overtime_hours: string; leave_hours: string; leave_type: string | null }[]>`
            SELECT timesheet_id, entry_date, day_of_week, regular_hours, overtime_hours, leave_hours, leave_type
            FROM daily_entries WHERE timesheet_id IN ${sql(tsIds)} ORDER BY entry_date`
        : Promise.resolve([] as { timesheet_id: string; entry_date: string; day_of_week: string; regular_hours: string; overtime_hours: string; leave_hours: string; leave_type: string | null }[]),
      wantExpenses
        ? sql<{ id: string; employee_id: string; client_id: string; worker_name: string | null; site: string | null; buyer: string | null; submitted_at: Date | string | null; amount: string; currency: string; status: string; revision: number; source_detail: string | null; external_url: string | null }[]>`
            SELECT * FROM expense_sheets WHERE employee_id = ${id} ORDER BY submitted_at DESC`.catch(() => [])
        : Promise.resolve([] as { id: string; employee_id: string; client_id: string; worker_name: string | null; site: string | null; buyer: string | null; submitted_at: Date | string | null; amount: string; currency: string; status: string; revision: number; source_detail: string | null; external_url: string | null }[]),
    ])

    const validationsByTs = new Map<string, ValidationCheck[]>()
    for (const v of validations) {
      const list = validationsByTs.get(v.timesheet_id) ?? []
      list.push({
        id: v.rule_id, category: v.category as ValidationCheck["category"],
        rule: v.rule, result: v.result as ValidationCheck["result"],
        detail: v.detail, autoChecked: true,
      })
      validationsByTs.set(v.timesheet_id, list)
    }
    const dailyByTs = new Map<string, DailyEntry[]>()
    for (const d of daily) {
      const list = dailyByTs.get(d.timesheet_id) ?? []
      list.push({
        date: d.entry_date, dayOfWeek: d.day_of_week,
        regularHours:  parseFloat(d.regular_hours),
        overtimeHours: parseFloat(d.overtime_hours),
        leaveHours:    parseFloat(d.leave_hours),
        leaveType: d.leave_type ?? undefined,
      })
      dailyByTs.set(d.timesheet_id, list)
    }

    const tsList: Timesheet[] = timesheets.map(t => ({
      id: t.id, employeeId: t.employee_id, clientId: t.client_id,
      period: t.period ?? "",
      periodStart: t.period_start, periodEnd: t.period_end,
      submittedAt: t.submitted_at ?? `${t.period_end}T09:00:00Z`,
      source: t.source as Timesheet["source"],
      sourceDetail: t.source_detail ?? undefined,
      portalId: (t.portal_id as Timesheet["portalId"]) ?? undefined,
      status: t.status as Timesheet["status"],
      totalHours: parseFloat(t.total_hours),
      regularHours: parseFloat(t.regular_hours),
      overtimeHours: parseFloat(t.overtime_hours),
      leaveHours: parseFloat(t.leave_hours),
      totalPayable: t.total_payable ? parseFloat(t.total_payable) : 0,
      dailyEntries: dailyByTs.get(t.id) ?? [],
      validationChecks: validationsByTs.get(t.id) ?? [],
      validationScore: t.validation_score,
      flagReason: t.flag_reason ?? undefined,
      flaggedBy: (t.flagged_by as Timesheet["flaggedBy"]) ?? undefined,
      approvedBy: t.approved_by ?? undefined,
      approvedAt: t.approved_at ?? undefined,
      aiConfidence: t.ai_confidence ?? undefined,
      externalUrl: t.external_url ?? undefined,
    }))

    const expenseList: ExpenseSheet[] = expenses.map(x => ({
      id: x.id, employeeId: x.employee_id, clientId: x.client_id,
      workerName: x.worker_name ?? "", site: x.site ?? "", buyer: x.buyer ?? "",
      submittedAt: x.submitted_at instanceof Date
        ? x.submitted_at.toISOString().slice(0, 10)
        : (x.submitted_at ?? ""),
      amount: parseFloat(x.amount), currency: x.currency,
      status: x.status, revision: x.revision,
      sourceDetail: x.source_detail ?? "", externalUrl: x.external_url ?? "",
    }))

    return NextResponse.json(
      { configured: true, employee, timesheets: tsList, expenses: expenseList },
      { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=120" } },
    )
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
