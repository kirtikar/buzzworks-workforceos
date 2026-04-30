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

    // Pre-fetch consumed_leaves per employee so the validator can apply
    // running balance across imports (not just within this batch).
    const priorLeaves = parsed.employees.length > 0
      ? await sql<{ id: string; consumed_leaves: string }[]>`
          SELECT id, consumed_leaves FROM employees WHERE id IN ${sql(parsed.employees.map(e => e.id))}
        `
      : []
    const consumedById = new Map(priorLeaves.map(r => [r.id, parseFloat(r.consumed_leaves)]))

    let upserted     = 0
    let mgrApproval  = 0
    let leaveExceeded = 0

    await sql.begin(async tx => {
      // Upsert employees. is_test_data=false → real Fieldglass-sourced.
      for (const e of parsed.employees) {
        const earned = computeEarnedLeavesCap(e.startDate ?? new Date().toISOString().slice(0, 10))
        await tx`
          INSERT INTO employees (
            id, worker_id, client_id, name, employee_code, email,
            role, department, manager_email, manager_name, avatar_color,
            start_date, earned_leaves, consumed_leaves,
            is_test_data, rate_per_hour, pay_mode, pay_rate, employment_status
          ) VALUES (
            ${e.id}, ${e.employeeCode}, ${e.clientId}, ${e.name}, ${e.employeeCode}, ${e.email},
            ${e.role ?? null}, ${e.department ?? null}, ${e.managerEmail ?? null},
            ${e.managerName ?? null}, ${e.avatarColor ?? null},
            ${e.startDate ?? null}, ${earned}, ${consumedById.get(e.id) ?? 0},
            false, ${e.ratePerHour}, ${e.payMode}, ${e.payRate}, ${e.employmentStatus}
          )
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

      // Per-timesheet upsert. Re-run validator with real consumed_leaves
      // overlay so the leave-balance check reflects DB state, not the
      // parse-time assumption of 0.
      for (const ts of parsed.timesheets) {
        const consumed = consumedById.get(ts.employeeId) ?? 0
        const employee = parsed.employees.find(e => e.id === ts.employeeId)!
        const earned   = computeEarnedLeavesCap(employee.startDate ?? new Date().toISOString().slice(0, 10))

        // Recompute the per-week ST/OT/DT/Other split from the parsed
        // Timesheet. The parser stuffs all "Others" into regularHours
        // and any over-45 spill into overtimeHours, but for validation
        // we want the original totalHours and the validator handles
        // the policy split itself.
        const v = validateCapgeminiWeek({
          totalHours:      ts.totalHours,
          standardHours:   0,                           // Capgemini tenant: ST always 0
          overtimeHours:   0,                           // Likewise — week split handled by validator
          doubletimeHours: 0,
          otherHours:      ts.totalHours,
          nbHours:         0,
          rawStatus:       ts.status,
          earnedLeaves:    earned,
          consumedLeaves:  consumed,
          approver:        ts.approvedBy ?? "",
          dailyEntries:    ts.dailyEntries,
        })

        if (v.resolvedStatus === "pending_mgr_approval") mgrApproval++
        if (v.checks.some(c => c.id === "leave-balance" && c.result === "fail")) leaveExceeded++

        const externalUrl = fieldglassDetailUrl(ts.id)

        await tx`
          INSERT INTO timesheets (
            id, employee_id, client_id, period, period_start, period_end,
            submitted_at, source, source_detail, portal_id, status,
            total_hours, regular_hours, overtime_hours, leave_hours,
            total_payable, validation_score, flag_reason, flagged_by,
            approved_by, approved_at, ai_confidence, ot_payout_cycle,
            external_url
          ) VALUES (
            ${ts.id}, ${ts.employeeId}, ${ts.clientId}, ${ts.period},
            ${ts.periodStart}, ${ts.periodEnd},
            ${ts.submittedAt}, ${ts.source}, ${ts.sourceDetail ?? null},
            ${ts.portalId ?? null}, ${v.resolvedStatus},
            ${ts.totalHours}, ${ts.regularHours}, ${v.otHours}, ${ts.leaveHours},
            ${ts.totalPayable ?? null}, ${v.validationScore},
            ${v.flagReason ?? null}, ${v.flagReason ? "ai" : null},
            ${ts.approvedBy ?? null}, ${ts.approvedAt ?? null},
            ${Math.max(50, v.validationScore - 5)}, ${v.otPayoutCycle},
            ${externalUrl}
          )
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

        // Replace daily + validation rows for this timesheet only.
        await tx`DELETE FROM daily_entries        WHERE timesheet_id = ${ts.id}`
        await tx`DELETE FROM timesheet_validations WHERE timesheet_id = ${ts.id}`

        for (const d of ts.dailyEntries) {
          await tx`
            INSERT INTO daily_entries (
              timesheet_id, entry_date, day_of_week,
              regular_hours, overtime_hours, leave_hours, leave_type
            ) VALUES (
              ${ts.id}, ${d.date}, ${d.dayOfWeek},
              ${d.regularHours}, ${d.overtimeHours}, ${d.leaveHours ?? 0}, ${d.leaveType ?? null}
            )
          `
        }

        for (const c of v.checks) {
          await tx`
            INSERT INTO timesheet_validations (
              timesheet_id, rule_id, category, rule, result, detail
            ) VALUES (
              ${ts.id}, ${c.id}, ${c.category}, ${c.rule}, ${c.result}, ${c.detail}
            )
          `
        }

        upserted++
      }

      await tx`
        INSERT INTO import_runs (
          source, client_id, row_count, error_count, warning_count,
          errors, warnings, unmapped_headers
        ) VALUES (
          'fieldglass-csv-bulk', 'cap', ${upserted},
          ${parsed.errors.length}, ${parsed.warnings.length},
          ${sql.json(parsed.errors)}, ${sql.json(parsed.warnings)},
          ${[] as string[]}
        )
      `
    })

    return NextResponse.json({
      ok: true,
      summary: {
        rowCount:           upserted,
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
