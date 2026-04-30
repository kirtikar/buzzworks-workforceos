// Fieldglass timesheet CSV importer.
//
// Scope: POC for Capgemini (clientId="cap"). Mirrors the BeeLine parser
// (lib/beeline-import.ts) but tuned to Fieldglass's typical timesheet
// report column names. Header matching is permissive (case-insensitive +
// non-alphanumeric stripped).
//
// We share validation rules with Accenture for now because both run on
// a 45h weekly cap with OT spillover and a 1.75 leaves/month accrual.
// Capgemini-specific rules (if different) can override later by passing
// a custom validator into validateAccentureWeek.

import type {
  Timesheet, Employee, DailyEntry,
} from "./types"
import { derivePayGradeFields } from "./mock-data"
import { validateAccentureWeek, computeEarnedLeaves } from "./accenture-validation"

// ─── CSV tokenizer (RFC 4180 subset) — same as BeeLine ───────────────────────

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

function normaliseHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "")
}

// ─── Fieldglass header alias map ─────────────────────────────────────────────
// Fieldglass column names from a standard "Time Sheet" report. Most
// overlap with BeeLine; keeping a separate map so each portal evolves
// independently.

const HEADER_ALIASES: Record<string, string[]> = {
  workerId:        ["workerid", "workernumber", "workercode", "employeeid", "resourceid"],
  workerName:      ["workername", "worker", "resourcename", "name"],
  workerEmail:     ["workeremail", "email", "useremail", "resourceemail"],
  jobId:           ["jobid", "positionid", "positioncode", "assignmentid", "jobpostingid"],
  hireManager:     ["hiremanager", "hiringmanager", "manager", "approvalmanager"],
  hireManagerEmail:["hiremanageremail", "hiringmanageremail", "manageremail"],
  costCenter:      ["costcenter", "costcentre", "department", "businessunit"],
  periodStart:     ["periodstart", "weekstart", "weekstarting", "startdate"],
  periodEnd:       ["periodend", "weekend", "weekending", "enddate"],
  submissionDate:  ["submissiondate", "submitteddate", "submitted"],
  status:          ["status", "timesheetstatus", "approvalstatus"],
  regularHours:    ["regularhours", "standardhours", "straighttimehours"],
  overtimeHours:   ["overtimehours", "othours"],
  leaveHours:      ["leavehours", "ptohours", "holidayhours", "vacationhours"],
  totalHours:      ["totalhours", "hours", "totalhrs"],
  hourlyRate:      ["billrate", "hourlybillrate", "hourlyrate", "rate"],
  totalCost:       ["totalcost", "totalamount", "amount", "billamount"],
  approver:        ["approver", "approvername", "approvedby", "approvalmanager"],
  approvalDate:    ["approvaldate", "approveddate"],
  buyer:           ["buyer", "buyername", "client", "endclient"],
  supplier:        ["supplier", "vendor", "agency"],
  timesheetId:     ["timesheetid", "timesheetnumber", "timecard"],
  notes:           ["notes", "comments", "remarks"],
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function num(s: string | undefined): number {
  if (!s) return 0
  const n = parseFloat(s.replace(/[,₹$£€]/g, "").trim())
  return isNaN(n) ? 0 : n
}

function parseDate(s: string | undefined): string {
  if (!s) return ""
  const t = s.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10)
  const us = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (us) {
    const [, mm, dd, yyyy] = us
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`
  }
  const dm = t.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})/)
  if (dm) {
    const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"]
    const [, dd, mon, yyyy] = dm
    const mi = months.indexOf(mon.toLowerCase())
    if (mi >= 0) return `${yyyy}-${String(mi + 1).padStart(2, "0")}-${dd.padStart(2, "0")}`
  }
  const d = new Date(t)
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10)
}

function isoDateTime(s: string | undefined, fallbackDate: string): string {
  if (!s) return `${fallbackDate}T09:00:00Z`
  const d = new Date(s.trim())
  if (!isNaN(d.getTime())) return d.toISOString()
  const date = parseDate(s)
  return date ? `${date}T09:00:00Z` : `${fallbackDate}T09:00:00Z`
}

function mapStatus(raw: string | undefined): Timesheet["status"] {
  // Fieldglass status vocabulary differs slightly from BeeLine's.
  const s = (raw ?? "").toLowerCase().trim()
  if (s === "approved" || s === "approved & closed" || s === "completed") return "approved"
  if (s === "paid" || s === "closed" || s === "processed" || s === "invoiced") return "processed"
  if (s === "rejected" || s === "denied" || s === "returned for changes" || s === "returned") return "rejected"
  if (s === "in approval" || s === "pending approval" || s === "pending review") return "reviewing"
  // Default: any "submitted" / "draft" / "saved" / "submitted by worker" → pending
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

// ─── Main parse function ─────────────────────────────────────────────────────

export interface FieldglassImportResult {
  timesheets:    Timesheet[]
  employees:     Employee[]
  errors:        string[]
  warnings:      string[]
  unmappedHeaders: string[]
  totalRows:     number
}

export function parseFieldglassCsv(text: string): FieldglassImportResult {
  const result: FieldglassImportResult = {
    timesheets: [], employees: [], errors: [], warnings: [], unmappedHeaders: [], totalRows: 0,
  }
  const rows = tokenizeCsv(text).filter(r => r.length > 1 || (r[0] ?? "").trim() !== "")
  if (rows.length < 2) {
    result.errors.push("CSV has fewer than 2 rows (need header + at least one data row)")
    return result
  }
  const { map, unmapped } = mapHeaders(rows[0])
  result.unmappedHeaders = unmapped

  const required = ["workerId", "workerName", "periodStart", "periodEnd", "totalHours", "status"]
  const missing  = required.filter(k => !(k in map))
  if (missing.length > 0) {
    result.errors.push(`Missing required columns: ${missing.join(", ")}. Found: ${rows[0].join(", ")}`)
    return result
  }

  const employeeMap = new Map<string, Employee>()

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    if (row.every(c => !c || c.trim() === "")) continue
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
      result.errors.push(`Row ${r + 1}: unparseable period; skipped`)
      continue
    }

    const reg   = num(cell("regularHours"))
    const ot    = num(cell("overtimeHours"))
    const leave = num(cell("leaveHours"))
    let regularHours  = reg
    let overtimeHours = ot
    let leaveHours    = leave
    let totalHours    = totalDecl
    if (regularHours === 0 && totalHours > 0) {
      regularHours = Math.max(0, totalHours - overtimeHours - leaveHours)
      result.warnings.push(`Row ${r + 1}: regular hours inferred as ${regularHours}h`)
    }
    if (totalHours === 0) totalHours = regularHours + overtimeHours + leaveHours

    const rate     = num(cell("hourlyRate"))
    const cost     = num(cell("totalCost"))
    const declRate = rate > 0 ? rate
                   : (cost > 0 && totalHours > 0) ? Math.round(cost / totalHours)
                   : 0

    const approver       = (cell("approver") ?? cell("hireManager") ?? "").trim()
    const submittedRaw   = cell("submissionDate")
    const submittedAt    = isoDateTime(submittedRaw, periodEnd)
    const approvalDate   = cell("approvalDate")
    const approvedAt     = approvalDate ? isoDateTime(approvalDate, periodEnd) : undefined

    if (!employeeMap.has(workerId)) {
      const role        = "Fieldglass Contractor"
      const jobCategory = "Consulting"
      const grade       = derivePayGradeFields({ id: `cap-${workerId}`, role, jobCategory, ratePerHour: declRate || 850 })
      const slug        = workerName.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z.]/g, "")
      const email       = (cell("workerEmail") ?? `${slug}@capgemini.com`).trim()
      const managerEmail = (cell("hireManagerEmail") ?? "").trim() || undefined

      employeeMap.set(workerId, {
        id:               `cap-fg-${workerId}`,
        employeeCode:     workerId,
        name:             workerName,
        email,
        clientId:         "cap",
        role,
        jobCategory,
        department:       (cell("costCenter") ?? "Consulting").trim(),
        city:             "Mumbai",
        startDate:        periodStart,
        ratePerHour:      declRate || 850,
        payGrade:         grade.payGrade,
        payMode:          "hourly",
        payRate:          declRate || 850,
        leaveBalance:     { annual: 21, sick: 12, casual: 8, usedAnnual: 0, usedSick: 0, usedCasual: 0 },
        managerEmail,
        employmentStatus: "active",
        avatarColor:      "#0070AD",   // Capgemini blue
      })
    }
    const employee = employeeMap.get(workerId)!

    // Synthesise 5-day daily entries (Fieldglass exports usually don't
    // expose per-day breakdown in the timesheet report). Park OT + leave
    // on Friday so the drawer renders something meaningful.
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

    // Run validation (same Accenture ruleset for now: 45h cap, OT
    // spillover, leave-balance check). The /api/import/fieldglass route
    // re-runs this with consumed_leaves overlaid from DB.
    const startDate    = employee.startDate ?? new Date().toISOString().slice(0, 10)
    const earnedLeaves = computeEarnedLeaves(startDate, new Date(periodEnd))
    const v = validateAccentureWeek({
      regularHours, overtimeHours, leaveHours, totalHours,
      dailyEntries, rawStatus: status, approver,
      earnedLeaves, consumedLeaves: 0,
    })

    const totalPayable = cost > 0 ? cost
      : Math.round(declRate * (regularHours + (v.otPayoutCycle === "current" ? overtimeHours * 1.5 : 0)))

    const ts: Timesheet = {
      id:               `cap-fg-${workerId}-${periodStart}`,
      employeeId:       employee.id,
      clientId:         "cap",
      period:           fmtPeriod(periodStart, periodEnd),
      periodStart,
      periodEnd,
      submittedAt,
      source:           "portal",
      sourceDetail:     "Fieldglass",
      portalId:         "fieldglass",
      status:           v.resolvedStatus,
      totalHours,
      regularHours,
      overtimeHours:    v.resolvedStatus === "pending_mgr_approval"
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

// ─── Sample CSV (Capgemini Fieldglass-flavoured) ─────────────────────────────

export function generateSampleFieldglassCsv(): string {
  const header = [
    "Worker ID","Worker Name","Worker Email","Job ID","Hire Manager","Hire Manager Email",
    "Cost Center","Period Start","Period End","Submission Date","Status",
    "Regular Hours","Overtime Hours","Leave Hours","Total Hours",
    "Bill Rate","Total Cost","Approver","Approval Date","Buyer","Supplier","Notes",
  ]
  const rows: string[][] = [
    ["CAP-W-2041","Karan Mehta","karan.mehta@capgemini.com","JOB-CAP-1182","Sneha Iyer","sneha.iyer@capgemini.com","Cloud & Apps","04/14/2026","04/18/2026","04/19/2026","Approved","40","2","0","42","850","36550","Sneha Iyer","04/20/2026","Capgemini Technology Services India Ltd.","Buzzworks",""],
    ["CAP-W-2042","Riya Banerjee","riya.banerjee@capgemini.com","JOB-CAP-1183","Sneha Iyer","sneha.iyer@capgemini.com","Cloud & Apps","04/14/2026","04/18/2026","04/19/2026","Approved","40","0","8","48","720","34560","Sneha Iyer","04/20/2026","Capgemini Technology Services India Ltd.","Buzzworks","Public holiday Apr 14"],
    ["CAP-W-2043","Aditya Khanna","aditya.khanna@capgemini.com","JOB-CAP-1190","Manish Verma","manish.verma@capgemini.com","Insights & Data","04/14/2026","04/18/2026","04/20/2026","Pending Approval","45","6","0","51","920","46920","","","Capgemini Technology Services India Ltd.","Buzzworks","OT for go-live weekend"],
    ["CAP-W-2044","Pooja Reddy","pooja.reddy@capgemini.com","JOB-CAP-1191","Manish Verma","manish.verma@capgemini.com","Insights & Data","04/14/2026","04/18/2026","04/19/2026","Submitted","38","0","0","38","780","29640","","","Capgemini Technology Services India Ltd.","Buzzworks",""],
    ["CAP-W-2045","Harshvardhan Bose","harsh.bose@capgemini.com","JOB-CAP-1200","Anita Pillai","anita.pillai@capgemini.com","Strategy","04/14/2026","04/18/2026","04/19/2026","Approved","40","0","0","40","1100","44000","Anita Pillai","04/19/2026","Capgemini Technology Services India Ltd.","Buzzworks",""],
    ["CAP-W-2046","Tanvi Joshi","tanvi.joshi@capgemini.com","JOB-CAP-1201","Anita Pillai","anita.pillai@capgemini.com","Strategy","04/14/2026","04/18/2026","04/19/2026","In Approval","40","6","0","46","980","51352","","","Capgemini Technology Services India Ltd.","Buzzworks","Client weekend ask"],
    ["CAP-W-2047","Rohit Saxena","rohit.saxena@capgemini.com","JOB-CAP-1210","Sneha Iyer","sneha.iyer@capgemini.com","Cloud & Apps","04/14/2026","04/18/2026","04/19/2026","Returned for Changes","42","0","0","42","850","35700","Sneha Iyer","04/20/2026","Capgemini Technology Services India Ltd.","Buzzworks","Hours don't match attendance log"],
    ["CAP-W-2048","Ananya Malhotra","ananya.malhotra@capgemini.com","JOB-CAP-1211","Manish Verma","manish.verma@capgemini.com","Insights & Data","04/14/2026","04/18/2026","04/19/2026","Approved","40","0","0","40","880","35200","Manish Verma","04/19/2026","Capgemini Technology Services India Ltd.","Buzzworks",""],
  ]
  return [header, ...rows].map(r => r.map(v => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v).join(",")).join("\n") + "\n"
}
