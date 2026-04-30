import { NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db/client"
import { parseBeelineCsv } from "@/lib/beeline-import"
import { validateAccentureWeek, computeEarnedLeaves } from "@/lib/accenture-validation"

// POST /api/import/beeline
// multipart/form-data: file=<csv>
//
// Transactional flow:
//   1. Parse CSV via parseBeelineCsv (no DB).
//   2. BEGIN
//   3. DELETE prior Accenture rows (timesheets + daily_entries +
//      timesheet_validations cascade).
//   4. UPSERT employees (preserves consumed_leaves across re-imports).
//   5. Re-run Accenture validation per row using the now-known
//      consumed_leaves from prior data, so the leave-balance check
//      reflects real history rather than the per-import assumption of 0.
//   6. INSERT timesheets, daily_entries, validations.
//   7. INSERT into import_runs audit log.
//   8. COMMIT.
//
// Net: every successful import gives us a complete, consistent snapshot
// of Accenture timesheet state in DB. Mock data for other 10 clients is
// never touched.

export async function POST(req: NextRequest) {
  try {
    const sql = getSql()
    const form = await req.formData()
    const file = form.get("file") as File | null
    if (!file) return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 })

    const text   = await file.text()
    const parsed = parseBeelineCsv(text)
    if (parsed.timesheets.length === 0) {
      return NextResponse.json({
        ok: false, error: "No rows imported", details: parsed.errors, unmappedHeaders: parsed.unmappedHeaders,
      }, { status: 400 })
    }

    // Pre-fetch consumed_leaves per employee to overlay into validation
    const workerIds = parsed.employees.map(e => e.employeeCode)
    const priorLeaves = workerIds.length > 0
      ? await sql<{ id: string; consumed_leaves: string }[]>`
          SELECT id, consumed_leaves FROM employees WHERE id IN ${sql(parsed.employees.map(e => e.id))}
        `
      : []
    const consumedById = new Map(priorLeaves.map(r => [r.id, parseFloat(r.consumed_leaves)]))

    let inserted = 0
    let mgrApproval = 0
    let leaveExceeded = 0

    await sql.begin(async tx => {
      // Wipe prior Accenture rows. CASCADE handles daily_entries + validations
      // (they FK on timesheets which FKs employees).
      await tx`DELETE FROM timesheets WHERE client_id = 'acc'`

      // Upsert employees, preserving consumed_leaves. is_test_data=false
      // marks these as real BeeLine-sourced rows.
      for (const e of parsed.employees) {
        const earned = computeEarnedLeaves(e.startDate ?? new Date().toISOString().slice(0, 10))
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

      // Re-validate each timesheet with real consumed_leaves overlay
      for (const ts of parsed.timesheets) {
        const consumed = consumedById.get(ts.employeeId) ?? 0
        const employee = parsed.employees.find(e => e.id === ts.employeeId)!
        const earned   = computeEarnedLeaves(employee.startDate ?? new Date().toISOString().slice(0, 10))
        const v = validateAccentureWeek({
          regularHours:    ts.regularHours,
          overtimeHours:   ts.overtimeHours,
          leaveHours:      ts.leaveHours,
          totalHours:      ts.totalHours,
          dailyEntries:    ts.dailyEntries,
          rawStatus:       ts.status,
          approver:        ts.approvedBy ?? "",
          earnedLeaves:    earned,
          consumedLeaves:  consumed,
        })

        if (v.resolvedStatus === "pending_mgr_approval") mgrApproval++
        if (v.checks.some(c => c.id === "leave-balance" && c.result === "fail")) leaveExceeded++

        await tx`
          INSERT INTO timesheets (
            id, employee_id, client_id, period, period_start, period_end,
            submitted_at, source, source_detail, portal_id, status,
            total_hours, regular_hours, overtime_hours, leave_hours,
            total_payable, validation_score, flag_reason, flagged_by,
            approved_by, approved_at, ai_confidence, ot_payout_cycle
          ) VALUES (
            ${ts.id}, ${ts.employeeId}, ${ts.clientId}, ${ts.period},
            ${ts.periodStart}, ${ts.periodEnd},
            ${ts.submittedAt}, ${ts.source}, ${ts.sourceDetail ?? null},
            ${ts.portalId ?? null}, ${v.resolvedStatus},
            ${ts.totalHours}, ${ts.regularHours}, ${ts.overtimeHours}, ${ts.leaveHours},
            ${ts.totalPayable ?? null}, ${v.validationScore},
            ${v.flagReason ?? null}, ${v.flagReason ? "ai" : null},
            ${ts.approvedBy ?? null}, ${ts.approvedAt ?? null},
            ${Math.max(50, v.validationScore - 5)}, ${v.otPayoutCycle}
          )
        `

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

        inserted++
      }

      await tx`
        INSERT INTO import_runs (
          source, client_id, row_count, error_count, warning_count,
          errors, warnings, unmapped_headers
        ) VALUES (
          'beeline-csv', 'acc', ${inserted},
          ${parsed.errors.length}, ${parsed.warnings.length},
          ${sql.json(parsed.errors)}, ${sql.json(parsed.warnings)},
          ${parsed.unmappedHeaders}
        )
      `
    })

    return NextResponse.json({
      ok: true,
      summary: {
        rowCount:        inserted,
        employeeCount:   parsed.employees.length,
        mgrApprovalCount: mgrApproval,
        leaveExceededCount: leaveExceeded,
        warnings:        parsed.warnings,
        errors:          parsed.errors,
        unmappedHeaders: parsed.unmappedHeaders,
      },
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}

// DELETE clears all Accenture data — used by the Settings card "Trash"
// button so ops can revert to an empty inbox without re-importing.
export async function DELETE() {
  try {
    const sql = getSql()
    await sql.begin(async tx => {
      await tx`DELETE FROM timesheets WHERE client_id = 'acc'`
      await tx`DELETE FROM employees WHERE client_id = 'acc'`
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
