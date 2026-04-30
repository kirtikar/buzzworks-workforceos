// Capgemini Fieldglass "Supplier List" CSV parser.
//
// Format: SAP Fieldglass exports a hierarchical CSV with this shape:
//   Header row:    Status,ID,Revision,Worker,Site,End,ST,OT,DT,Others,NB,
//   Blank line
//   Group header:  Worker : <Name>
//   Data row:      Invoiced,CGEMTS06619905,2,"Last, First",<Site>,DD/MM/YYYY,...
//   ...
//   Blank line
//   Worker : ...
//
// We parse all rows across multiple uploaded files at once, dedup by
// (timesheet_id, revision) keeping the highest revision, and synthesise
// 5-day daily entries (real day-wise lives only on the Fieldglass detail
// page — UI offers a deep link).
//
// All weekly time at this Capgemini tenant lands in the "Others" bucket;
// ST/OT/DT/NB are kept separately in case the configuration changes
// later and we need to honour individual rate cards.

import type {
  Timesheet, Employee, DailyEntry,
} from "./types"
import { derivePayGradeFields } from "./mock-data"
import {
  validateCapgeminiWeek, computeEarnedLeavesCap,
} from "./capgemini-validation"

// ─── CSV tokenizer (RFC 4180) ────────────────────────────────────────────────

function tokenizeCsv(text: string): string[][] {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ }
        else { inQuotes = false }
      } else {
        cell += ch
      }
    } else {
      if (ch === '"') { inQuotes = true }
      else if (ch === ",") { row.push(cell); cell = "" }
      else if (ch === "\n" || ch === "\r") {
        if (cell !== "" || row.length > 0) { row.push(cell); rows.push(row); row = []; cell = "" }
        if (ch === "\r" && text[i + 1] === "\n") i++
      } else {
        cell += ch
      }
    }
  }
  if (cell !== "" || row.length > 0) { row.push(cell); rows.push(row) }
  return rows
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function num(s: string | undefined): number {
  if (!s) return 0
  const n = parseFloat(s.replace(/,/g, "").trim())
  return isNaN(n) ? 0 : n
}

// Fieldglass exports DD/MM/YYYY. Returns ISO YYYY-MM-DD.
function parseDate(s: string | undefined): string {
  if (!s) return ""
  const t = s.trim()
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) {
    const [, dd, mm, yyyy] = m
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10)
  return ""
}

// Fieldglass exports worker as "Last, First" or just "First" with a leading
// "." for missing surname. Reformat to "First Last" with cleanup.
function reformatWorkerName(raw: string): string {
  let s = raw.trim().replace(/\s+/g, " ")
  // Trim leading dots used as missing-surname marker (e.g. "., Athidoss")
  if (s.startsWith(".") || s.startsWith(", ")) s = s.replace(/^[.,\s]+/, "")
  if (s.includes(", ")) {
    const [last, first] = s.split(", ")
    return `${first.trim()} ${last.trim()}`.trim()
  }
  return s
}

// Convert period-end date back to period-start (6 days earlier; weekly
// timesheets in this tenant span Mon-Sun ending on Sunday).
function startFromEnd(end: string): string {
  const d = new Date(end)
  if (isNaN(d.getTime())) return end
  d.setUTCDate(d.getUTCDate() - 6)
  return d.toISOString().slice(0, 10)
}

function fmtPeriod(start: string, end: string): string {
  if (!start || !end) return start || end || ""
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  const s = new Date(start), e = new Date(end)
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return `${start} – ${end}`
  const sameYear  = s.getUTCFullYear() === e.getUTCFullYear()
  const sameMonth = sameYear && s.getUTCMonth() === e.getUTCMonth()
  if (sameMonth) {
    return `${months[s.getUTCMonth()]} ${s.getUTCDate()}–${e.getUTCDate()}, ${s.getUTCFullYear()}`
  }
  if (sameYear) {
    return `${months[s.getUTCMonth()]} ${s.getUTCDate()} – ${months[e.getUTCMonth()]} ${e.getUTCDate()}, ${s.getUTCFullYear()}`
  }
  return `${months[s.getUTCMonth()]} ${s.getUTCDate()}, ${s.getUTCFullYear()} – ${months[e.getUTCMonth()]} ${e.getUTCDate()}, ${e.getUTCFullYear()}`
}

function mapStatus(raw: string | undefined): Timesheet["status"] {
  const s = (raw ?? "").toLowerCase().trim()
  if (s === "invoiced" || s === "paid")        return "processed"
  if (s === "approved" || s === "completed")   return "approved"
  if (s === "approval paused")                 return "reviewing"
  if (s === "pending approval" || s === "in approval") return "reviewing"
  if (s === "pending review" || s === "submitted")     return "pending"
  if (s === "rejected" || s === "returned for changes" || s === "returned") return "rejected"
  return "pending"
}

// Fieldglass detail-page URL pattern (Capgemini SAP cloud tenant).
function detailPageUrl(timesheetId: string): string {
  return `https://cgem.us.fieldglass.cloud.sap/time_sheet_detail.do?id=${timesheetId}&buyerCode=CGEM&sjkName=CGEM&dataBaseType=sql&startFlow=true`
}

// ─── Parse one file → list of "raw" rows ─────────────────────────────────────

interface RawRow {
  status:         string
  id:             string
  revision:       number
  workerNameRaw:  string
  site:           string
  endDate:        string   // DD/MM/YYYY → ISO
  stHours:        number
  otHours:        number
  dtHours:        number
  otherHours:     number
  nbHours:        number
}

function parseOneFile(text: string, errors: string[]): RawRow[] {
  const rows = tokenizeCsv(text)
  const out: RawRow[] = []
  let inDataSection = false

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (row.length === 0 || (row.length === 1 && row[0].trim() === "")) continue

    // Header row
    if (row[0] === "Status" && row[1] === "ID") { inDataSection = true; continue }

    // Group header: "Worker : <Name>"
    if (row[0]?.startsWith("Worker :")) continue

    if (!inDataSection) continue
    if (!row[1]?.startsWith("CGEMTS")) continue
    if (row.length < 11) continue

    const id       = row[1].trim()
    const revision = parseInt(row[2], 10) || 0
    const endIso   = parseDate(row[5])
    if (!endIso) {
      errors.push(`Skipped row with unparseable date: ${row[5]} (id ${id})`)
      continue
    }

    out.push({
      status:        row[0].trim(),
      id,
      revision,
      workerNameRaw: row[3].trim(),
      site:          row[4].trim(),
      endDate:       endIso,
      stHours:       num(row[6]),
      otHours:       num(row[7]),
      dtHours:       num(row[8]),
      otherHours:    num(row[9]),
      nbHours:       num(row[10]),
    })
  }
  return out
}

// ─── Top-level parse: accepts multiple file contents, dedups, validates ──────

export interface FieldglassCapImportResult {
  timesheets:       Timesheet[]
  employees:        Employee[]
  errors:           string[]
  warnings:         string[]
  totalRows:        number     // raw rows seen across all files (incl. dups)
  uniqueIds:        number
  filesProcessed:   number
}

/**
 * Parse one or more Fieldglass Supplier-List CSVs into our Timesheet shape.
 *
 * Dedup strategy: per timesheet_id, keep the row with the highest revision.
 * Ties broken by file order (later wins).
 *
 * @param fileContents - array of raw CSV text payloads (one per uploaded file)
 */
export function parseFieldglassCapCsvs(fileContents: string[]): FieldglassCapImportResult {
  const result: FieldglassCapImportResult = {
    timesheets: [], employees: [], errors: [], warnings: [],
    totalRows: 0, uniqueIds: 0, filesProcessed: 0,
  }

  // Pass 1: collect all rows across files
  const allRaw: RawRow[] = []
  for (const text of fileContents) {
    const localErrors: string[] = []
    const rows = parseOneFile(text, localErrors)
    result.errors.push(...localErrors)
    allRaw.push(...rows)
    result.filesProcessed++
    result.totalRows += rows.length
  }

  // Pass 2: dedup by (id) keeping highest revision
  const byId = new Map<string, RawRow>()
  for (const r of allRaw) {
    const existing = byId.get(r.id)
    if (!existing || r.revision > existing.revision) byId.set(r.id, r)
  }
  result.uniqueIds = byId.size

  // Pass 3: build employees + timesheets
  const employeeMap = new Map<string, Employee>()

  for (const r of byId.values()) {
    const totalHours = r.stHours + r.otHours + r.dtHours + r.otherHours + r.nbHours
    const periodEnd  = r.endDate
    const periodStart = startFromEnd(periodEnd)
    const workerName = reformatWorkerName(r.workerNameRaw)

    // Worker key: use the cleaned name as the dedup key. Real Worker IDs
    // (CGEMWK*) live only on the detail page; the supplier list CSV
    // doesn't expose them, so we synthesise from the name.
    const workerKey = workerName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z-]/g, "") || `unknown-${r.id}`

    if (!employeeMap.has(workerKey)) {
      // Employee id derived from the full workerKey so collisions can't
      // happen via truncation. employeeCode stays short for UI display.
      const empCode = `CAP${workerKey.slice(0, 12).toUpperCase().replace(/-/g, "")}`
      const empId   = `cap-fg-${workerKey}`
      const role        = "Fieldglass Contractor"
      const jobCategory = "Consulting"
      const grade = derivePayGradeFields({ id: empId, role, jobCategory, ratePerHour: 850 })
      const slug  = workerKey
      const email = `${slug}@capgemini.com`

      employeeMap.set(workerKey, {
        id:               empId,
        employeeCode:     empCode,
        name:             workerName || empCode,
        email,
        clientId:         "cap",
        role,
        jobCategory,
        department:       r.site.split("-").slice(2, 4).join(" - ").trim() || "Capgemini India",
        city:             cityFromSite(r.site),
        startDate:        periodStart,    // earliest period seen — refined below
        ratePerHour:      850,
        payGrade:         grade.payGrade,
        payMode:          "hourly",
        payRate:          850,
        leaveBalance:     { annual: 21, sick: 12, casual: 8, usedAnnual: 0, usedSick: 0, usedCasual: 0 },
        employmentStatus: "active",
        avatarColor:      "#0070AD",
      })
    }
    const employee = employeeMap.get(workerKey)!

    // Refine employee.startDate to earliest period seen
    if (!employee.startDate || periodStart < employee.startDate) {
      employee.startDate = periodStart
    }

    // Synthesise 5-day daily entries (Mon-Fri × hours/5 each).
    // Real day-wise lives on the Fieldglass detail page — UI surfaces
    // the deep link via external_url (persisted at API layer below).
    const dailyEntries: DailyEntry[] = []
    const dayNames = ["Mon","Tue","Wed","Thu","Fri"]
    const perDay = totalHours / 5
    for (let i = 0; i < 5; i++) {
      const d = new Date(periodStart)
      d.setUTCDate(d.getUTCDate() + i)
      dailyEntries.push({
        date: d.toISOString().slice(0, 10),
        dayOfWeek: dayNames[i],
        regularHours: Math.round(perDay * 10) / 10,
        overtimeHours: 0,    // OT handled at week level by validator
        leaveHours: 0,
      })
    }

    // Run Capgemini validation. consumed_leaves is overlaid with real DB
    // value at API insert time; here we pass 0 so the parse step is
    // deterministic and stateless.
    const earnedLeaves = computeEarnedLeavesCap(employee.startDate ?? periodStart, new Date(periodEnd))
    const v = validateCapgeminiWeek({
      totalHours,
      standardHours:   r.stHours,
      overtimeHours:   r.otHours,
      doubletimeHours: r.dtHours,
      otherHours:      r.otherHours,
      nbHours:         r.nbHours,
      rawStatus:       mapStatus(r.status),
      earnedLeaves,
      consumedLeaves:  0,
      approver:        "",
      dailyEntries,
    })

    // Bill rate isn't in the Supplier List export. Rate × hours estimate
    // uses the synthesised default. Real bill rate is on the detail page.
    const billRate     = employee.ratePerHour
    const totalPayable = Math.round(billRate * totalHours)

    const ts: Timesheet = {
      id:               `cap-fg-${r.id}`,
      employeeId:       employee.id,
      clientId:         "cap",
      period:           fmtPeriod(periodStart, periodEnd),
      periodStart,
      periodEnd,
      submittedAt:      `${periodEnd}T09:00:00Z`,
      source:           "portal",
      sourceDetail:     `Fieldglass · ${r.id}`,
      portalId:         "fieldglass",
      status:           v.resolvedStatus,
      totalHours,
      regularHours:     r.otherHours + r.stHours,   // Capgemini: all "real" time
      overtimeHours:    v.otHours,
      leaveHours:       0,                           // inferred via validator, not logged
      totalPayable,
      dailyEntries,
      validationChecks: v.checks,
      validationScore:  v.validationScore,
      flagReason:       v.flagReason,
      flaggedBy:        v.flagReason ? "ai" : undefined,
      approvedAt:       undefined,
      aiConfidence:     Math.max(50, v.validationScore - 5),
    }
    result.timesheets.push(ts)
  }

  result.employees = Array.from(employeeMap.values())
  return result
}

// Best-effort city extraction from the Fieldglass Site string.
// Format observed: "<code>-CAPGEMINI TS IND LTD-<location>-<city>-<zone>"
// Examples:
//   IN71-CAPGEMINI TS IND LTD-EPIP industrial Area-Bangalore-STPI → Bangalore
//   IN60-CAPGEMINI TS IND LTD-Main Dadri Road,-Noida-SEZ          → Noida
function cityFromSite(site: string): string {
  const parts = site.split("-")
  // The last 2 parts are typically "<city>-<zone>" (zone = STPI/SEZ/DTA).
  if (parts.length >= 2) {
    const candidate = parts[parts.length - 2]?.trim()
    if (candidate && !/^\d+$/.test(candidate)) return candidate
  }
  return "Bangalore"
}

// Convenience: deep link for a Capgemini Fieldglass timesheet detail page.
export function fieldglassDetailUrl(timesheetIdRaw: string): string {
  // Strip our cap-fg- prefix if present
  const id = timesheetIdRaw.replace(/^cap-fg-/, "")
  return detailPageUrl(id)
}
