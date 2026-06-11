import { NextRequest, NextResponse } from "next/server"
import { getSqlChecked } from "@/lib/db/client"
import { parseFieldglassExpenseCsvs } from "@/lib/fieldglass-expense-import"
import { computeEarnedLeavesCap } from "@/lib/capgemini-validation"

// POST /api/import/fieldglass/expense
// multipart/form-data: file=<csv>[, file=<csv>, …]
//
// Parses Fieldglass "Expense Sheet · Supplier List" exports and bulk-
// upserts into expense_sheets. Employees are upserted alongside (Fieldglass
// uses the same Worker resolution as for timesheets, so an expense-only
// import will still create the worker rows).
//
// Bulk-INSERT chunked under PG's 65k bind-param cap.

export async function POST(req: NextRequest) {
  try {
    const sql = await getSqlChecked()
    const form = await req.formData()
    const files = form.getAll("file") as File[]
    if (!files || files.length === 0) {
      return NextResponse.json({ ok: false, error: "Missing file(s)" }, { status: 400 })
    }

    const texts  = await Promise.all(files.map(f => f.text()))
    const parsed = parseFieldglassExpenseCsvs(texts)
    if (parsed.expenses.length === 0) {
      return NextResponse.json({ ok: false, error: "No expense rows", details: parsed.errors }, { status: 400 })
    }

    // Carry forward consumed_leaves on the employee upsert.
    const priorLeaves = parsed.employees.length > 0
      ? await sql<{ id: string; consumed_leaves: string }[]>`
          SELECT id, consumed_leaves FROM employees WHERE id IN ${sql(parsed.employees.map(e => e.id))}
        `
      : []
    const consumedById = new Map(priorLeaves.map(r => [r.id, parseFloat(r.consumed_leaves)]))

    const today = new Date().toISOString().slice(0, 10)
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
        rate_per_hour: e.ratePerHour, pay_mode: e.payMode, pay_rate: e.payRate,
        employment_status: e.employmentStatus,
      }
    })

    const expRows = parsed.expenses.map(x => ({
      id:            x.id,
      employee_id:   x.employeeId,
      client_id:     x.clientId,
      worker_name:   x.workerName,
      site:          x.site,
      buyer:         x.buyer,
      submitted_at:  x.submittedAt,
      amount:        x.amount,
      currency:      x.currency,
      status:        x.status,
      revision:      x.revision,
      source_detail: x.sourceDetail,
      external_url:  x.externalUrl,
    }))

    const chunk = <T>(arr: T[], n: number): T[][] => {
      const out: T[][] = []
      for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
      return out
    }

    let upserted = 0
    await sql.begin(async tx => {
      // Upsert employees in chunks
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

      for (const part of chunk(expRows, 2000)) {
        await tx`
          INSERT INTO expense_sheets ${tx(part,
            "id","employee_id","client_id","worker_name","site","buyer",
            "submitted_at","amount","currency","status","revision",
            "source_detail","external_url"
          )}
          ON CONFLICT (id) DO UPDATE SET
            worker_name   = EXCLUDED.worker_name,
            site          = EXCLUDED.site,
            buyer         = EXCLUDED.buyer,
            submitted_at  = EXCLUDED.submitted_at,
            amount        = EXCLUDED.amount,
            currency      = EXCLUDED.currency,
            status        = EXCLUDED.status,
            revision      = EXCLUDED.revision,
            source_detail = EXCLUDED.source_detail,
            external_url  = EXCLUDED.external_url,
            updated_at    = NOW()
        `
        upserted += part.length
      }

      await tx`
        INSERT INTO import_runs (
          source, client_id, row_count, error_count, warning_count,
          errors, warnings, unmapped_headers
        ) VALUES (
          'fieldglass-expense-csv', 'cap', ${upserted},
          ${parsed.errors.length}, ${parsed.warnings.length},
          ${sql.json(parsed.errors)}, ${sql.json(parsed.warnings)},
          ${[] as string[]}
        )
      `
    })

    return NextResponse.json({
      ok: true,
      summary: {
        rowCount:        upserted,
        employeeCount:   parsed.employees.length,
        filesProcessed:  parsed.filesProcessed,
        rawRowsSeen:     parsed.totalRows,
        uniqueIds:       parsed.uniqueIds,
        warnings:        parsed.warnings,
        errors:          parsed.errors,
      },
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}

// DELETE wipes all Capgemini expense sheets — quick reset.
export async function DELETE() {
  try {
    const sql = await getSqlChecked()
    await sql`DELETE FROM expense_sheets WHERE client_id = 'cap'`
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
