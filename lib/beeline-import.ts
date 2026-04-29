// BeeLine timesheet CSV importer.
//
// Scope: POC for Accenture (clientId="acc"). Parses a CSV exported from
// the BeeLine "Timesheet" report and maps each row to our Timesheet
// shape, generating a synthetic Employee on the fly when needed.
//
// Header matching is permissive (case-insensitive + non-alphanumeric
// stripped) so a BeeLine tenant that calls a column "Worker_ID" vs
// "Worker ID" vs "WorkerID" all resolve to the same field.

import type {
  Timesheet, Employee, ValidationCheck, DailyEntry,
} from "./types"
import { derivePayGradeFields } from "./mock-data"
import { validateAccentureWeek, computeEarnedLeaves } from "./accenture-validation"

// ─── CSV tokenizer (RFC 4180 subset) ─────────────────────────────────────────
//
// Handles: quoted fields, doubled quotes inside quotes, embedded newlines
// inside quoted fields, trailing whitespace. Doesn't handle BOM — strips
// it upfront if present.

function tokenizeCsv(text: string): string[][] {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1) // strip BOM
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

function normaliseHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "")
}

// ─── Header alias map ────────────────────────────────────────────────────────
// Each canonical key has a list of normalised aliases. First match wins.

const HEADER_ALIASES: Record<string, string[]> = {
  workerId:       ["workerid", "employeeid", "resourceid", "userid"],
  workerName:     ["workername", "resourcename", "employeename", "name"],
  workerEmail:    ["workeremail", "email", "useremail", "resourceemail"],
  jobId:          ["jobid", "assignmentid", "positionid", "engagementid"],
  hireManager:    ["hiremanager", "manager", "managername"],
  hireManagerEmail:["hiremanageremail", "manageremail"],
  costCenter:     ["costcenter", "costcentre", "department"],
  periodStart:    ["periodstart", "weekstart", "weekstarting", "startdate"],
  periodEnd:      ["periodend", "weekend", "weekending", "enddate"],
  submissionDate: ["submissiondate", "submitteddate", "submitted"],
  status:         ["status", "approvalstatus", "timesheetstatus"],
  regularHours:   ["regularhours", "standardhours", "straighttimehours", "normalhours"],
  overtimeHours:  ["overtimehours", "othours", "ot"],
  leaveHours:     ["leavehours", "ptohours", "ptoholidayhours", "holidayhours"],
  totalHours:     ["totalhours", "totalhrs", "hours", "hourstotal"],
  hourlyRate:     ["hourlyrate", "rate", "billrate", "ratehour"],
  totalCost:      ["totalcost", "totalamount", "totalpayable", "amount"],
  approver:       ["approver", "approvername", "approvedby"],
  approvalDate:   ["approvaldate", "approveddate", "approvedat"],
  supplier:       ["supplier", "vendor", "agency"],
  client:         ["client", "endclient", "buyer"],
  notes:          ["notes", "comments", "remarks"],
}

function mapHeaders(headerRow: string[]): { map: Record<string, number>; unmapped: string[] } {
  const map: Record<string, number> = {}
  const unmapped: string[] = []
  headerRow.forEach((raw, idx) => {
    const norm = normaliseHeader(raw)
    let matched = false
    for (const [canon, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(norm)) { map[canon] = idx; matched = true; break }
    }
    if (!matched) unmapped.push(raw)
  })
  return { map, unmapped }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function num(s: string | undefined): number {
  if (!s) return 0
  const n = parseFloat(s.replace(/[,₹$]/g, "").trim())
  return isNaN(n) ? 0 : n
}

function parseDate(s: string | undefined): string {
  if (!s) return ""
  const t = s.trim()
  // ISO already
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10)
  // MM/DD/YYYY (US default in BeeLine exports)
  const us = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (us) {
    const [, mm, dd, yyyy] = us
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`
  }
  // DD-MMM-YYYY (e.g. 14-Apr-2026)
  const dm = t.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})/)
  if (dm) {
    const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"]
    const [, dd, mon, yyyy] = dm
    const mi = months.indexOf(mon.toLowerCase())
    if (mi >= 0) return `${yyyy}-${String(mi + 1).padStart(2, "0")}-${dd.padStart(2, "0")}`
  }
  // Fallback: let Date parse, then format
  const d = new Date(t)
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10)
}

function isoDateTime(s: string | undefined, fallbackDate: string): string {
  if (!s) return `${fallbackDate}T09:00:00Z`
  const d = new Date(s.trim())
  if (!isNaN(d.getTime())) return d.toISOString()
  // Date-only: anchor at 09:00 UTC for stable display
  const date = parseDate(s)
  return date ? `${date}T09:00:00Z` : `${fallbackDate}T09:00:00Z`
}

function mapStatus(raw: string | undefined): Timesheet["status"] {
  const s = (raw ?? "").toLowerCase().trim()
  if (s === "approved" || s === "approved & closed" || s === "approved and closed") return "approved"
  if (s === "paid" || s === "closed" || s === "processed") return "processed"
  if (s === "rejected" || s === "denied" || s === "returned") return "rejected"
  if (s === "in review" || s === "reviewing" || s === "under review") return "reviewing"
  // Default bucket: anything not yet decided
  return "pending"
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

// Accenture validation now lives in accenture-validation.ts. Imported above.

// ─── Main parse function ─────────────────────────────────────────────────────

export interface BeelineImportResult {
  timesheets:    Timesheet[]
  employees:     Employee[]   // synthetic, derived from worker rows
  errors:        string[]     // hard errors per row (skipped)
  warnings:      string[]     // soft issues (still imported)
  unmappedHeaders: string[]   // headers we didn't know what to do with
  totalRows:     number       // rows attempted (excluding header)
}

export function parseBeelineCsv(text: string): BeelineImportResult {
  const result: BeelineImportResult = {
    timesheets: [], employees: [], errors: [], warnings: [], unmappedHeaders: [], totalRows: 0,
  }
  const rows = tokenizeCsv(text).filter(r => r.length > 1 || (r[0] ?? "").trim() !== "")
  if (rows.length < 2) {
    result.errors.push("CSV has fewer than 2 rows (need at least a header + one data row)")
    return result
  }
  const { map, unmapped } = mapHeaders(rows[0])
  result.unmappedHeaders = unmapped

  // Validate the bare minimum columns are present
  const required = ["workerId", "workerName", "periodStart", "periodEnd", "totalHours", "status"]
  const missing = required.filter(k => !(k in map))
  if (missing.length > 0) {
    result.errors.push(`Missing required columns: ${missing.join(", ")}. Found: ${rows[0].join(", ")}`)
    return result
  }

  const employeeMap = new Map<string, Employee>()

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    if (row.every(c => !c || c.trim() === "")) continue   // skip blank rows
    result.totalRows++

    const cell = (key: string) => map[key] != null ? row[map[key]] : undefined

    const workerId    = (cell("workerId")   ?? "").trim()
    const workerName  = (cell("workerName") ?? "").trim()
    const periodStart = parseDate(cell("periodStart"))
    const periodEnd   = parseDate(cell("periodEnd"))
    const status      = mapStatus(cell("status"))
    const totalDecl   = num(cell("totalHours"))

    if (!workerId || !workerName) {
      result.errors.push(`Row ${r + 1}: missing worker id or name; skipped`)
      continue
    }
    if (!periodStart || !periodEnd) {
      result.errors.push(`Row ${r + 1}: unparseable period (${cell("periodStart")} → ${cell("periodEnd")}); skipped`)
      continue
    }

    const reg   = num(cell("regularHours"))
    const ot    = num(cell("overtimeHours"))
    const leave = num(cell("leaveHours"))

    // If component hours don't sum, infer regular = total - ot - leave
    let regularHours  = reg
    let overtimeHours = ot
    let leaveHours    = leave
    let totalHours    = totalDecl
    if (regularHours === 0 && totalHours > 0) {
      regularHours = Math.max(0, totalHours - overtimeHours - leaveHours)
      result.warnings.push(`Row ${r + 1}: regular hours inferred as ${regularHours}h (= total − OT − leave)`)
    }
    if (totalHours === 0) totalHours = regularHours + overtimeHours + leaveHours

    const rate     = num(cell("hourlyRate"))
    const cost     = num(cell("totalCost"))
    const declRate = rate > 0 ? rate
                   : (cost > 0 && totalHours > 0) ? Math.round(cost / totalHours)
                   : 0
    const totalPayable = cost > 0 ? cost : Math.round(declRate * (regularHours + overtimeHours * 1.5))

    const approver       = (cell("approver") ?? "").trim()
    const submittedRaw   = cell("submissionDate")
    const submittedAt    = isoDateTime(submittedRaw, periodEnd)
    const approvalDate   = cell("approvalDate")
    const approvedAt     = approvalDate ? isoDateTime(approvalDate, periodEnd) : undefined

    // Resolve / synthesise Employee for this worker
    if (!employeeMap.has(workerId)) {
      const role        = "BeeLine Contractor"
      const jobCategory = "Consulting"
      const grade       = derivePayGradeFields({ id: `acc-${workerId}`, role, jobCategory, ratePerHour: declRate || 600 })
      const slug        = workerName.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z.]/g, "")
      const email       = (cell("workerEmail") ?? `${slug}@accenture.com`).trim()
      const managerEmail = (cell("hireManagerEmail") ?? "").trim() || undefined

      employeeMap.set(workerId, {
        id:               `acc-bl-${workerId}`,
        employeeCode:     workerId,
        name:             workerName,
        email,
        clientId:         "acc",
        role,
        jobCategory,
        department:       (cell("costCenter") ?? "Consulting").trim(),
        city:             "Bangalore",
        startDate:        periodStart,   // best-effort; updated by next import if changed
        ratePerHour:      declRate || 600,
        payGrade:         grade.payGrade,
        payMode:          "hourly",
        payRate:          declRate || 600,
        leaveBalance:     { annual: 21, sick: 12, casual: 8, usedAnnual: 0, usedSick: 0, usedCasual: 0 },
        managerEmail,
        employmentStatus: "active",
        avatarColor:      "#A100FF",  // Accenture purple
      })
    }
    const employee = employeeMap.get(workerId)!

    // Per-employee earned-leaves accrual: 1.75/month from start_date.
    // For a fresh import we only know the worker's start from the first
    // observed period_start; subsequent imports will refine if BeeLine
    // gives an earlier value. Treat consumedLeaves as 0 for first import
    // (the API layer overlays prior consumption from DB on re-import).
    const earnedLeaves = computeEarnedLeaves(employee.startDate, new Date(periodEnd))

    // BeeLine doesn't usually expose per-day leave hours in the timesheet
    // export, so we synthesise daily entries (5 working days, even split)
    // and park leave_hours on Friday for display.
    const dayCount = 5
    const dailyEntries: DailyEntry[] = []
    const dayNames = ["Mon","Tue","Wed","Thu","Fri"]
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(periodStart)
      d.setUTCDate(d.getUTCDate() + i)
      dailyEntries.push({
        date: d.toISOString().slice(0, 10),
        dayOfWeek: dayNames[i],
        regularHours: Math.round((regularHours / dayCount) * 10) / 10,
        overtimeHours: i === dayCount - 1 ? overtimeHours : 0,
        leaveHours:    i === dayCount - 1 ? leaveHours    : 0,
      })
    }

    // Run Accenture-specific validation: 45h cap, leave-balance check,
    // daily cap, OT approver. Resolves the final status (may bump to
    // pending_mgr_approval when over 45h cap).
    const v = validateAccentureWeek({
      regularHours, overtimeHours, leaveHours, totalHours,
      dailyEntries, rawStatus: status, approver,
      earnedLeaves, consumedLeaves: 0,   // overlaid by API at insert time
    })

    const ts: Timesheet = {
      id:            `acc-bl-${workerId}-${periodStart}`,
      employeeId:    employee.id,
      clientId:      "acc",
      period:        fmtPeriod(periodStart, periodEnd),
      periodStart,
      periodEnd,
      submittedAt,
      source:        "portal",
      sourceDetail:  "BeeLine",
      portalId:      "beeline",
      status:        v.resolvedStatus,
      totalHours,
      regularHours,
      overtimeHours: v.resolvedStatus === "pending_mgr_approval"
                       ? Math.max(overtimeHours, totalHours - 45)
                       : overtimeHours,
      leaveHours,
      totalPayable,
      dailyEntries,
      validationChecks: v.checks,
      validationScore:  v.validationScore,
      flagReason:       v.flagReason,
      flaggedBy:        v.flagReason ? "ai" : undefined,
      approvedBy:       approver || undefined,
      approvedAt,
      aiConfidence:     Math.max(50, v.validationScore - 5),
    }

    result.timesheets.push(ts)
  }

  result.employees = Array.from(employeeMap.values())
  return result
}

// ─── Sample CSV (for download as a template) ─────────────────────────────────

export function generateSampleBeelineCsv(): string {
  const header = [
    "Worker ID","Worker Name","Worker Email","Job ID","Hire Manager","Hire Manager Email",
    "Cost Center","Period Start","Period End","Submission Date","Status",
    "Regular Hours","Overtime Hours","Leave Hours","Total Hours",
    "Hourly Rate","Total Cost","Approver","Approval Date","Supplier","Client","Notes",
  ]
  const rows: string[][] = [
    ["ACN-W-1041","Aarav Mehta","aarav.mehta@accenture.com","JOB-7821","Priya Nair","priya.nair@accenture.com","Cloud Infra","04/14/2026","04/18/2026","04/19/2026","Approved","40","2","0","42","850","36550","Priya Nair","04/20/2026","Buzzworks","Accenture",""],
    ["ACN-W-1042","Devika Iyer","devika.iyer@accenture.com","JOB-7822","Priya Nair","priya.nair@accenture.com","Cloud Infra","04/14/2026","04/18/2026","04/19/2026","Approved","40","0","8","48","720","34560","Priya Nair","04/20/2026","Buzzworks","Accenture","Public holiday Apr 14"],
    ["ACN-W-1043","Rohan Pillai","rohan.pillai@accenture.com","JOB-7830","Anita Raghavan","anita.r@accenture.com","Data & AI","04/14/2026","04/18/2026","04/20/2026","Pending Approval","45","5","0","50","920","45080","","","Buzzworks","Accenture","OT for go-live weekend"],
    ["ACN-W-1044","Sneha Kapoor","sneha.kapoor@accenture.com","JOB-7831","Anita Raghavan","anita.r@accenture.com","Data & AI","04/14/2026","04/18/2026","04/19/2026","Submitted","38","0","0","38","780","29640","","","Buzzworks","Accenture",""],
    ["ACN-W-1045","Vikas Shenoy","vikas.shenoy@accenture.com","JOB-7840","Karan Joshi","karan.joshi@accenture.com","Strategy","04/14/2026","04/18/2026","04/19/2026","Approved","40","0","0","40","1100","44000","Karan Joshi","04/19/2026","Buzzworks","Accenture",""],
    ["ACN-W-1046","Ananya Bose","ananya.bose@accenture.com","JOB-7841","Karan Joshi","karan.joshi@accenture.com","Strategy","04/14/2026","04/18/2026","04/19/2026","In Review","40","6","0","46","980","51352","","","Buzzworks","Accenture","Client weekend ask"],
    ["ACN-W-1047","Karthik Nayar","karthik.nayar@accenture.com","JOB-7850","Priya Nair","priya.nair@accenture.com","Cloud Infra","04/14/2026","04/18/2026","04/19/2026","Rejected","42","0","0","42","850","35700","Priya Nair","04/20/2026","Buzzworks","Accenture","Hours don't match attendance log"],
    ["ACN-W-1048","Riya Saxena","riya.saxena@accenture.com","JOB-7851","Anita Raghavan","anita.r@accenture.com","Data & AI","04/14/2026","04/18/2026","04/19/2026","Approved","40","0","0","40","880","35200","Anita Raghavan","04/19/2026","Buzzworks","Accenture",""],
  ]
  return [header, ...rows].map(r => r.map(v => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v).join(",")).join("\n") + "\n"
}
