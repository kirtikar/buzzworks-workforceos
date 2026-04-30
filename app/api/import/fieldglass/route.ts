import { NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db/client"
import {
  parseFieldglassCapCsvs, fieldglassDetailUrl,
} from "@/lib/fieldglass-cap-import"
import {
  validateCapgeminiWeek, computeEarnedLeavesCap,
} from "@/lib/capgemini-validation"

// POST /api/import/fieldglass
// multipart/form-data: file=<csv>[, file=<csv>, …]
//
// Accepts one or more "Supplier List" CSV exports for Capgemini at once
// (week-wise reports overlap → parser dedups by (id, max revision)).
//
// MERGE semantics: per timesheet id, UPSERT — never wipes prior Capgemini
// rows. Daily entries + validation rows are replaced for the touched
// timesheet only. Real `consumed_leaves` from DB is overlaid before
// re-running the Capgemini validator so the leave-balance check reflects
// running totals across uploads.
//
// All inserts are bulk (single INSERT … VALUES … per table, with
// ON CONFLICT for upsertable tables) so the function fits in Vercel
// Hobby's 10s limit even at ~600 timesheets per upload.
//
// Persists external_url (Fieldglass time-sheet detail page deep link) so
// the Inbox UI can drill into real day-wise data — that view isn't bulk-
// exportable from the supplier list endpoint.

export async function POST(req: NextRequest) {
  try {
    const sql = getSql()
    const form = await req.formData()
    const files = form.getAll("file") as File[]
    if (!files || files.length === 0) {
      return NextResponse.json({ ok: false, error: "Missing file(s)" }, { status: 400 })
    }

    const texts  = await Promise.all(files.map(f => f.text()))
    const parsed = parseFieldglassCapCsvs(texts)
    if (parsed.timesheets.length === 0) {
      return NextResponse.json({
        ok: false, error: "No rows imported",
        details: parsed.errors,
      }, { status: 400 })
    }

    // Pre-fetch consumed_leaves so the validator can apply running balance
    // across imports (not just within this batch).
    const priorLeaves = parsed.employees.length > 0
      ? await sql<{ id: string; consumed_leaves: string }[]>`
          SELECT id, consumed_leaves FROM employees WHERE id IN ${sql(parsed.employees.map(e => e.id))}
        `
      : []
    const consumedById = new Map(priorLeaves.map(r => [r.id, parseFloat(r.consumed_leaves)]))

    // ── Validate every timesheet in JS (no DB round-trips) ─────────────────
    const today = new Date().toISOString().slice(0, 10)
    const validated = parsed.timesheets.map(ts => {
      const consumed = consumedById.get(ts.employeeId) ?? 0
      const employee = parsed.employees.find(e => e.id === ts.employeeId)!
      const earned   = computeEarnedLeavesCap(employee.startDate ?? today)
      const v = validateCapgeminiWeek({
        totalHours:      ts.totalHours,
        standardHours:   0,                 // Capgemini tenant: ST always 0
        overtimeHours:   0,                 // Week split handled by validator
        doubletimeHours: 0,
        otherHours:      ts.totalHours,
        nbHours:         0,
        rawStatus:       ts.status,
        earnedLeaves:    earned,
        consumedLeaves:  consumed,
        approver:        ts.approvedBy ?? "",
        dailyEntries:    ts.dailyEntries,
      })
      return {
        ts, v,
        externalUrl:   fieldglassDetailUrl(ts.id),
        mgrApproval:   v.resolvedStatus === "pending_mgr_approval",
        leaveExceeded: v.checks.some(c => c.id === "leave-balance" && c.result === "fail"),
      }
    })

    const mgrApproval   = validated.filter(x => x.mgrApproval).length
    const leaveExceeded = validated.filter(x => x.leaveExceeded).length

    // ── Build row arrays for bulk insert ───────────────────────────────────
    const empRows = parsed.employees.map(e => {
      const earned = computeEarnedLeavesCap(e.startDate ?? today)
      return {
        id: e.id, worker_id: e.employeeCode, client_id: e.clientId,
        name: e.name, employee_code: e.employeeCode, email: e.email,
        role: e.role ?? null, department: e.department ?? null,
        manager_email: e.managerEmail ?? null, manager_name: e.managerName ?? null,
        avatar_color: e.avatarColor ?? null,
        start_date: e.startDate ?? null,
        earned_leaves: earned,
        consumed_leaves: consumedById.get(e.id) ?? 0,
        is_test_data: false,
        rate_per_hour: e.ratePerHour,
        pay_mode: e.payMode, pay_rate: e.payRate,
        employment_status: e.employmentStatus,
      }
    })

    const tsRows = validated.map(({ ts, v, externalUrl }) => ({
      id: ts.id, employee_id: ts.employeeId, client_id: ts.clientId,
      period: ts.period, period_start: ts.periodStart, period_end: ts.periodEnd,
      submitted_at: ts.submittedAt, source: ts.source,
      source_detail: ts.sourceDetail ?? null, portal_id: ts.portalId ?? null,
      status: v.resolvedStatus,
      total_hours: ts.totalHours, regular_hours: ts.regularHours,
      overtime_hours: v.otHours, leave_hours: ts.leaveHours,
      total_payable: ts.totalPayable ?? null,
      validation_score: v.validationScore,
      flag_reason: v.flagReason ?? null,
      flagged_by: v.flagReason ? "ai" : null,
      approved_by: ts.approvedBy ?? null, approved_at: ts.approvedAt ?? null,
      ai_confidence: Math.max(50, v.validationScore - 5),
      ot_payout_cycle: v.otPayoutCycle,
      external_url: externalUrl,
    }))

    const dailyRows = validated.flatMap(({ ts }) =>
      ts.dailyEntries.map(d => ({
        timesheet_id: ts.id, entry_date: d.date, day_of_week: d.dayOfWeek,
        regular_hours: d.regularHours, overtime_hours: d.overtimeHours,
        leave_hours: d.leaveHours ?? 0, leave_type: d.leaveType ?? null,
      })),
    )

    const valRows = validated.flatMap(({ ts, v }) =>
      v.checks.map(c => ({
        timesheet_id: ts.id, rule_id: c.id, category: c.category,
        rule: c.rule, result: c.result, detail: c.detail,
      })),
    )

    const tsIds = validated.map(x => x.ts.id)

    // Postgres caps bind parameters at 65,534 per statement. With 7-col
    // daily rows and 6-col validation rows, a 2,000-row chunk = ~14k
    // params — well under the limit. Employees (19 cols) chunk at 2000
    // = ~38k; timesheets (24 cols) chunk at 1500 = ~36k.
    const chunk = <T>(arr: T[], size: number): T[][] => {
      const out: T[][] = []
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
      return out
    }

    await sql.begin(async tx => {
      // Bulk upsert employees (chunked)
      for (const part of chunk(empRows, 2000)) {
        await tx`
          INSERT INTO employees ${tx(part,
            "id","worker_id","client_id","name","employee_code","email",
            "role","department","manager_email","manager_name","avatar_color",
            "start_date","earned_leaves","consumed_leaves",
            "is_test_data","rate_per_hour","pay_mode","pay_rate","employment_status"
          )}
          ON CONFLICT (id) DO UPDATE SET
            name              = EXCLUDED.name,
            email             = EXCLUDED.email,
            role              = EXCLUDED.role,
            department        = EXCLUDED.department,
            manager_email     = EXCLUDED.manager_email,
            manager_name      = EXCLUDED.manager_name,
            avatar_color      = EXCLUDED.avatar_color,
            earned_leaves     = EXCLUDED.earned_leaves,
            rate_per_hour     = EXCLUDED.rate_per_hour,
            pay_mode          = EXCLUDED.pay_mode,
            pay_rate          = EXCLUDED.pay_rate,
            employment_status = EXCLUDED.employment_status,
            is_test_data      = false,
            updated_at        = NOW()
        `
      }

      // Bulk upsert timesheets (chunked)
      for (const part of chunk(tsRows, 1500)) {
        await tx`
          INSERT INTO timesheets ${tx(part,
            "id","employee_id","client_id","period","period_start","period_end",
            "submitted_at","source","source_detail","portal_id","status",
            "total_hours","regular_hours","overtime_hours","leave_hours",
            "total_payable","validation_score","flag_reason","flagged_by",
            "approved_by","approved_at","ai_confidence","ot_payout_cycle",
            "external_url"
          )}
          ON CONFLICT (id) DO UPDATE SET
            employee_id      = EXCLUDED.employee_id,
            period           = EXCLUDED.period,
            period_start     = EXCLUDED.period_start,
            period_end       = EXCLUDED.period_end,
            submitted_at     = EXCLUDED.submitted_at,
            source           = EXCLUDED.source,
            source_detail    = EXCLUDED.source_detail,
            portal_id        = EXCLUDED.portal_id,
            status           = EXCLUDED.status,
            total_hours      = EXCLUDED.total_hours,
            regular_hours    = EXCLUDED.regular_hours,
            overtime_hours   = EXCLUDED.overtime_hours,
            leave_hours      = EXCLUDED.leave_hours,
            total_payable    = EXCLUDED.total_payable,
            validation_score = EXCLUDED.validation_score,
            flag_reason      = EXCLUDED.flag_reason,
            flagged_by       = EXCLUDED.flagged_by,
            approved_by      = EXCLUDED.approved_by,
            approved_at      = EXCLUDED.approved_at,
            ai_confidence    = EXCLUDED.ai_confidence,
            ot_payout_cycle  = EXCLUDED.ot_payout_cycle,
            external_url     = EXCLUDED.external_url,
            updated_at       = NOW()
        `
      }

      // Replace daily + validation rows for touched timesheets (chunked)
      for (const part of chunk(tsIds, 5000)) {
        await tx`DELETE FROM daily_entries        WHERE timesheet_id IN ${tx(part)}`
        await tx`DELETE FROM timesheet_validations WHERE timesheet_id IN ${tx(part)}`
      }
      for (const part of chunk(dailyRows, 2000)) {
        await tx`
          INSERT INTO daily_entries ${tx(part,
            "timesheet_id","entry_date","day_of_week",
            "regular_hours","overtime_hours","leave_hours","leave_type"
          )}
        `
      }
      for (const part of chunk(valRows, 2000)) {
        await tx`
          INSERT INTO timesheet_validations ${tx(part,
            "timesheet_id","rule_id","category","rule","result","detail"
          )}
        `
      }

      await tx`
        INSERT INTO import_runs (
          source, client_id, row_count, error_count, warning_count,
          errors, warnings, unmapped_headers
        ) VALUES (
          'fieldglass-csv-bulk', 'cap', ${tsRows.length},
          ${parsed.errors.length}, ${parsed.warnings.length},
          ${sql.json(parsed.errors)}, ${sql.json(parsed.warnings)},
          ${[] as string[]}
        )
      `
    })

    return NextResponse.json({
      ok: true,
      summary: {
        rowCount:           tsRows.length,
        employeeCount:      parsed.employees.length,
        filesProcessed:     parsed.filesProcessed,
        rawRowsSeen:        parsed.totalRows,
        uniqueIds:          parsed.uniqueIds,
        mgrApprovalCount:   mgrApproval,
        leaveExceededCount: leaveExceeded,
        warnings:           parsed.warnings,
        errors:             parsed.errors,
      },
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}

// DELETE clears all Capgemini data — Settings card "Trash" button
// reverts the Inbox to empty for that client without re-import.
export async function DELETE() {
  try {
    const sql = getSql()
    await sql.begin(async tx => {
      await tx`DELETE FROM timesheets WHERE client_id = 'cap'`
      await tx`DELETE FROM employees WHERE client_id = 'cap'`
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
