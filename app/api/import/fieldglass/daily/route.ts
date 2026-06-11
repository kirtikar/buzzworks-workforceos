import { NextRequest, NextResponse } from "next/server"
import { getSqlChecked } from "@/lib/db/client"

// POST /api/import/fieldglass/daily
//
// Accepts a JSONL body of scraped Fieldglass detail-page payloads and
// replaces the synthesised daily entries with real day-wise data. The
// scraper writes one record per line; we parse, normalise dates against
// the timesheet's period_start (since the scraped DD often lacks a year),
// and bulk-upsert daily_entries for each touched timesheet.
//
// Body format (one JSON object per line):
//   { "timesheetId": "CGEMTS...",
//     "periodStart": "2026-03-09",
//     "periodEnd":   "2026-03-15",
//     "daily": [{ "date": "9", "hours": 9, "type": "Regular" }, ...] }
//
// Behaviour:
//   - Looks up the corresponding timesheet (cap-fg-<id>); skips unknown.
//   - Normalises each `date` field — accepts "DD", "DD/MM", "DD/MM/YYYY"
//     or ISO. Anchors against periodStart's year/month if only DD given.
//   - DELETEs existing daily_entries for the timesheet and bulk-INSERTs
//     fresh rows. Replaces both synthesised and prior real rows.
//   - Returns counts so the caller can verify scope.

interface DailyIn  { date: string; hours: number; type?: string; comment?: string }
interface ScrapedTs {
  timesheetId:  string
  periodStart?: string
  periodEnd?:   string
  daily:        DailyIn[]
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

// Anchor a raw "date" cell against the timesheet's period_start so we
// always store ISO. Accepts "9", "09/03", "09/03/2026", "2026-03-09".
function normaliseDate(raw: string, periodStart: string): string | null {
  const t = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10)
  // DD/MM/YYYY or DD-MM-YYYY
  let m = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (m) {
    const [, dd, mm, yyyy] = m
    return `${yyyy}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`
  }
  // DD/MM
  m = t.match(/^(\d{1,2})[\/\-](\d{1,2})$/)
  if (m) {
    const [, dd, mm] = m
    const year = periodStart.slice(0, 4)
    return `${year}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`
  }
  // Just DD — anchor to period_start's year/month, then bump month if dd<ps_dd
  m = t.match(/^(\d{1,2})$/)
  if (m) {
    const dd = parseInt(m[1], 10)
    const ps = new Date(periodStart)
    if (isNaN(ps.getTime())) return null
    let y = ps.getUTCFullYear(), mo = ps.getUTCMonth()
    if (dd < ps.getUTCDate()) {
      mo += 1
      if (mo > 11) { mo = 0; y += 1 }
    }
    return `${y}-${String(mo+1).padStart(2,"0")}-${String(dd).padStart(2,"0")}`
  }
  return null
}

function dayOfWeek(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? "?" : DAY_NAMES[d.getUTCDay()]
}

export async function POST(req: NextRequest) {
  try {
    const sql  = await getSqlChecked()
    const body = await req.text()
    const lines = body.split("\n").map(l => l.trim()).filter(Boolean)

    const records: ScrapedTs[] = []
    const parseErrors: string[] = []
    for (const line of lines) {
      try { records.push(JSON.parse(line)) }
      catch (e) { parseErrors.push(`bad json: ${line.slice(0,80)}`) }
    }

    if (records.length === 0) {
      return NextResponse.json({ ok: false, error: "No records", parseErrors }, { status: 400 })
    }

    // Map scraped ids back to our prefixed timesheet ids.
    const tsIds = records.map(r => `cap-fg-${r.timesheetId}`)
    const known = await sql<{ id: string; period_start: string }[]>`
      SELECT id, period_start FROM timesheets WHERE id IN ${sql(tsIds)}
    `
    const knownById = new Map(known.map(r => [r.id, r.period_start.slice(0, 10)]))

    // Build all daily rows in one pass.
    const dailyRows: { timesheet_id: string; entry_date: string; day_of_week: string;
                       regular_hours: number; overtime_hours: number; leave_hours: number; leave_type: string | null }[] = []
    const skipMissing: string[] = []
    const skipBadDate: string[] = []
    const touched = new Set<string>()

    for (const r of records) {
      const tsId = `cap-fg-${r.timesheetId}`
      const periodStart = knownById.get(tsId) ?? r.periodStart
      if (!periodStart) { skipMissing.push(r.timesheetId); continue }
      touched.add(tsId)

      for (const d of r.daily) {
        const iso = normaliseDate(d.date, periodStart)
        if (!iso) { skipBadDate.push(`${r.timesheetId}:${d.date}`); continue }

        // Bucket hours by row "type" cell from the scraped grid.
        const tLower = (d.type ?? "").toLowerCase()
        const isLeave = tLower.includes("leave") || tLower.includes("vacation") || tLower.includes("absence") || tLower.includes("holiday")
        const isOt    = tLower.includes("overtime") || tLower === "ot"

        dailyRows.push({
          timesheet_id:   tsId,
          entry_date:     iso,
          day_of_week:    dayOfWeek(iso),
          regular_hours:  isLeave || isOt ? 0 : d.hours,
          overtime_hours: isOt    ? d.hours : 0,
          leave_hours:    isLeave ? d.hours : 0,
          leave_type:     isLeave ? (d.type ?? null) : null,
        })
      }
    }

    // Chunk under PG's 65,534 bind-param cap (7 cols → ~9k rows is safe).
    const chunk = <T>(arr: T[], n: number): T[][] => {
      const out: T[][] = []
      for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
      return out
    }

    const tsIdList = [...touched]
    let inserted = 0

    await sql.begin(async tx => {
      // Replace daily rows for every touched timesheet.
      for (const part of chunk(tsIdList, 5000)) {
        await tx`DELETE FROM daily_entries WHERE timesheet_id IN ${tx(part)}`
      }
      for (const part of chunk(dailyRows, 2000)) {
        if (part.length === 0) continue
        await tx`
          INSERT INTO daily_entries ${tx(part,
            "timesheet_id","entry_date","day_of_week",
            "regular_hours","overtime_hours","leave_hours","leave_type"
          )}
          ON CONFLICT (timesheet_id, entry_date) DO UPDATE SET
            day_of_week    = EXCLUDED.day_of_week,
            regular_hours  = EXCLUDED.regular_hours,
            overtime_hours = EXCLUDED.overtime_hours,
            leave_hours    = EXCLUDED.leave_hours,
            leave_type     = EXCLUDED.leave_type
        `
        inserted += part.length
      }

      await tx`
        INSERT INTO import_runs (
          source, client_id, row_count, error_count, warning_count,
          errors, warnings, unmapped_headers
        ) VALUES (
          'fieldglass-daily-scrape', 'cap', ${inserted},
          ${parseErrors.length + skipBadDate.length}, ${skipMissing.length},
          ${sql.json([...parseErrors, ...skipBadDate.map(s => `bad date: ${s}`)])},
          ${sql.json(skipMissing.map(s => `unknown timesheet: ${s}`))},
          ${[] as string[]}
        )
      `
    })

    return NextResponse.json({
      ok: true,
      summary: {
        recordsReceived: records.length,
        timesheetsTouched: touched.size,
        dailyRowsInserted: inserted,
        skipMissingTimesheet: skipMissing.length,
        skipBadDate: skipBadDate.length,
        parseErrors: parseErrors.length,
      },
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
