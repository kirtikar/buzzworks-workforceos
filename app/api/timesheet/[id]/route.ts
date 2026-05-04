import { NextRequest, NextResponse } from "next/server"
import { getSql, isDbConfigured } from "@/lib/db/client"
import type { Timesheet, ValidationCheck, DailyEntry, Employee } from "@/lib/types"

// GET /api/timesheet/[id]?include=daily,validations,employee
//
// Detail-on-demand. The Inbox row carries only what the row renders;
// the drawer triggers this fetch to pull validations, daily entries,
// and the embedded employee. Cuts the inbox initial payload by ~80%.

interface Row {
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
  const wantValidations = include.includes("validations") || include.length === 0  // default include
  const wantEmployee    = include.includes("employee")    || include.length === 0  // default include

  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false })
  }
  const sql = getSql()
  try {
    const [tsRows, validations, daily, empRows] = await Promise.all([
      sql<Row[]>`SELECT * FROM timesheets WHERE id = ${id} LIMIT 1`,
      wantValidations
        ? sql<{ rule_id: string; category: string; rule: string; result: string; detail: string }[]>`
            SELECT rule_id, category, rule, result, detail FROM timesheet_validations WHERE timesheet_id = ${id}`
        : Promise.resolve([] as { rule_id: string; category: string; rule: string; result: string; detail: string }[]),
      wantDaily
        ? sql<{ entry_date: string; day_of_week: string; regular_hours: string; overtime_hours: string; leave_hours: string; leave_type: string | null }[]>`
            SELECT entry_date, day_of_week, regular_hours, overtime_hours, leave_hours, leave_type
            FROM daily_entries WHERE timesheet_id = ${id} ORDER BY entry_date`
        : Promise.resolve([] as { entry_date: string; day_of_week: string; regular_hours: string; overtime_hours: string; leave_hours: string; leave_type: string | null }[]),
      wantEmployee
        ? sql<{
            id: string; worker_id: string; client_id: string; name: string; employee_code: string;
            email: string; role: string | null; department: string | null;
            manager_email: string | null; manager_name: string | null;
            avatar_color: string | null; start_date: string | null;
            earned_leaves: string; consumed_leaves: string;
          }[]>`
            SELECT e.id, e.worker_id, e.client_id, e.name, e.employee_code, e.email,
                   e.role, e.department, e.manager_email, e.manager_name, e.avatar_color,
                   e.start_date, e.earned_leaves, e.consumed_leaves
            FROM employees e
            JOIN timesheets t ON t.employee_id = e.id
            WHERE t.id = ${id} LIMIT 1`
        : Promise.resolve([] as never[]),
    ])

    const t = tsRows[0]
    if (!t) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })

    const validationChecks: ValidationCheck[] = validations.map(v => ({
      id: v.rule_id, category: v.category as ValidationCheck["category"],
      rule: v.rule, result: v.result as ValidationCheck["result"],
      detail: v.detail, autoChecked: true,
    }))
    const dailyEntries: DailyEntry[] = daily.map(d => ({
      date: d.entry_date, dayOfWeek: d.day_of_week,
      regularHours: parseFloat(d.regular_hours),
      overtimeHours: parseFloat(d.overtime_hours),
      leaveHours: parseFloat(d.leave_hours),
      leaveType: d.leave_type ?? undefined,
    }))

    const timesheet: Timesheet = {
      id:              t.id,
      employeeId:      t.employee_id,
      clientId:        t.client_id,
      period:          t.period ?? "",
      periodStart:     t.period_start,
      periodEnd:       t.period_end,
      submittedAt:     t.submitted_at ?? `${t.period_end}T09:00:00Z`,
      source:          t.source as Timesheet["source"],
      sourceDetail:    t.source_detail ?? undefined,
      portalId:        (t.portal_id as Timesheet["portalId"]) ?? undefined,
      status:          t.status as Timesheet["status"],
      totalHours:      parseFloat(t.total_hours),
      regularHours:    parseFloat(t.regular_hours),
      overtimeHours:   parseFloat(t.overtime_hours),
      leaveHours:      parseFloat(t.leave_hours),
      totalPayable:    t.total_payable ? parseFloat(t.total_payable) : 0,
      dailyEntries,
      validationChecks,
      validationScore: t.validation_score,
      flagReason:      t.flag_reason ?? undefined,
      flaggedBy:       (t.flagged_by as Timesheet["flaggedBy"]) ?? undefined,
      approvedBy:      t.approved_by ?? undefined,
      approvedAt:      t.approved_at ?? undefined,
      aiConfidence:    t.ai_confidence ?? undefined,
      externalUrl:     t.external_url ?? undefined,
    }

    let employee: Employee | undefined
    const er = empRows[0]
    if (er) {
      employee = {
        id: er.id, employeeCode: er.employee_code, name: er.name, email: er.email,
        clientId: er.client_id,
        role: er.role ?? "Contractor",
        jobCategory: "Consulting", department: er.department ?? "Consulting",
        city: er.department && er.department !== "Consulting" ? er.department : "Bangalore",
        startDate: er.start_date ?? "",
        ratePerHour: 600, payGrade: "C5", payMode: "hourly", payRate: 600,
        leaveBalance: {
          annual: parseFloat(er.earned_leaves), sick: 0, casual: 0,
          usedAnnual: parseFloat(er.consumed_leaves), usedSick: 0, usedCasual: 0,
        },
        managerEmail: er.manager_email ?? undefined,
        managerName:  er.manager_name ?? undefined,
        employmentStatus: "active",
        avatarColor: er.avatar_color ?? "#A100FF",
      }
    }

    return NextResponse.json(
      { configured: true, timesheet, employee },
      { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=120" } },
    )
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
