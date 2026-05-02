// Capgemini Fieldglass "Expense Sheet · Supplier List" CSV parser.
//
// Format observed (similar shape to time-sheet supplier list, different
// columns):
//   Header row:   Status,ID,Revision,Worker,Site,Buyer,Submitted,Amount,Currency,
//   Blank line
//   Group header: Worker : <Name>
//   Data row:     Invoiced,CGEMES00115543,0,"., Chetna",<Site>,Capgemini,21/03/2026,1000.00,INR,
//
// Worker resolution: same workerKey scheme as the time-sheet parser so
// expense rows attach to the same employees row in Postgres.

import type { Employee } from "./types"
import { derivePayGradeFields } from "./mock-data"

export interface ExpenseRow {
  id:              string         // CGEMES…
  employeeId:      string         // cap-fg-<workerKey>  (matches timesheet employees)
  clientId:        string         // "cap"
  workerName:      string
  site:            string
  buyer:           string
  submittedAt:     string         // ISO YYYY-MM-DD
  amount:          number
  currency:        string
  status:          string         // "Invoiced" | "Pending Approval" | …
  revision:        number
  sourceDetail:    string         // "Fieldglass · CGEMES…"
  externalUrl:     string
}

export interface ExpenseImportResult {
  expenses:       ExpenseRow[]
  employees:      Employee[]      // synthesised employee records keyed by workerKey
  errors:         string[]
  warnings:       string[]
  totalRows:      number
  uniqueIds:      number
  filesProcessed: number
}

// ─── CSV tokenizer (same as timesheet parser) ────────────────────────────────

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
      } else { cell += ch }
    } else {
      if (ch === '"') { inQuotes = true }
      else if (ch === ",") { row.push(cell); cell = "" }
      else if (ch === "\n" || ch === "\r") {
        if (cell !== "" || row.length > 0) { row.push(cell); rows.push(row); row = []; cell = "" }
        if (ch === "\r" && text[i + 1] === "\n") i++
      } else { cell += ch }
    }
  }
  if (cell !== "" || row.length > 0) { row.push(cell); rows.push(row) }
  return rows
}

function parseDate(s: string | undefined): string {
  if (!s) return ""
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!m) return ""
  return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`
}

function num(s: string | undefined): number {
  if (!s) return 0
  const n = parseFloat(s.replace(/,/g, "").trim())
  return isNaN(n) ? 0 : n
}

function reformatWorkerName(raw: string): string {
  let s = raw.trim().replace(/\s+/g, " ")
  if (s.startsWith(".") || s.startsWith(", ")) s = s.replace(/^[.,\s]+/, "")
  if (s.includes(", ")) {
    const [last, first] = s.split(", ")
    return `${first.trim()} ${last.trim()}`.trim()
  }
  return s
}

function workerKeyOf(workerName: string, fallback: string): string {
  const slug = workerName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z-]/g, "")
  return slug || `unknown-${fallback}`
}

function expenseDetailUrl(esId: string): string {
  return `https://cgem.us.fieldglass.cloud.sap/expense_sheet_detail.do?id=${esId}&buyerCode=CGEM&sjkName=CGEM&dataBaseType=sql&startFlow=true`
}

function cityFromSite(site: string): string {
  const parts = site.split("-")
  if (parts.length >= 2) {
    const candidate = parts[parts.length - 2]?.trim()
    if (candidate && !/^\d+$/.test(candidate)) return candidate
  }
  return "Bangalore"
}

interface RawRow {
  status: string; id: string; revision: number;
  workerNameRaw: string; site: string; buyer: string;
  submittedIso: string; amount: number; currency: string;
}

function parseOneFile(text: string, errors: string[]): RawRow[] {
  const rows = tokenizeCsv(text)
  const out: RawRow[] = []
  let inDataSection = false
  for (const row of rows) {
    if (row.length === 0 || (row.length === 1 && row[0].trim() === "")) continue
    if (row[0] === "Status" && row[1] === "ID") { inDataSection = true; continue }
    if (row[0]?.startsWith("Worker :")) continue
    if (!inDataSection) continue
    if (!row[1]?.startsWith("CGEMES")) continue
    if (row.length < 9) continue

    const id = row[1].trim()
    const submittedIso = parseDate(row[6])
    if (!submittedIso) { errors.push(`Skipped row with bad date: ${row[6]} (id ${id})`); continue }
    out.push({
      status: row[0].trim(),
      id, revision: parseInt(row[2], 10) || 0,
      workerNameRaw: row[3].trim(), site: row[4].trim(),
      buyer: row[5].trim(),
      submittedIso, amount: num(row[7]), currency: (row[8] || "INR").trim(),
    })
  }
  return out
}

export function parseFieldglassExpenseCsvs(fileContents: string[]): ExpenseImportResult {
  const result: ExpenseImportResult = {
    expenses: [], employees: [], errors: [], warnings: [],
    totalRows: 0, uniqueIds: 0, filesProcessed: 0,
  }

  const allRaw: RawRow[] = []
  for (const text of fileContents) {
    const localErrors: string[] = []
    const rows = parseOneFile(text, localErrors)
    result.errors.push(...localErrors)
    allRaw.push(...rows)
    result.filesProcessed++
    result.totalRows += rows.length
  }

  // Dedup by id (keep highest revision).
  const byId = new Map<string, RawRow>()
  for (const r of allRaw) {
    const existing = byId.get(r.id)
    if (!existing || r.revision > existing.revision) byId.set(r.id, r)
  }
  result.uniqueIds = byId.size

  const employeeMap = new Map<string, Employee>()
  for (const r of byId.values()) {
    const workerName = reformatWorkerName(r.workerNameRaw)
    const wKey       = workerKeyOf(workerName, r.id)
    const employeeId = `cap-fg-${wKey}`

    if (!employeeMap.has(wKey)) {
      const empCode = `CAP-${wKey.toUpperCase().replace(/-/g, "")}`
      const role        = "Fieldglass Contractor"
      const jobCategory = "Consulting"
      const grade = derivePayGradeFields({ id: employeeId, role, jobCategory, ratePerHour: 850 })
      employeeMap.set(wKey, {
        id:               employeeId,
        employeeCode:     empCode,
        name:             workerName || empCode,
        email:            `${wKey}@capgemini.com`,
        clientId:         "cap",
        role,
        jobCategory,
        department:       cityFromSite(r.site),
        city:             cityFromSite(r.site),
        startDate:        r.submittedIso,
        ratePerHour:      850,
        payGrade:         grade.payGrade,
        payMode:          "hourly",
        payRate:          850,
        leaveBalance:     { annual: 21, sick: 12, casual: 8, usedAnnual: 0, usedSick: 0, usedCasual: 0 },
        employmentStatus: "active",
        avatarColor:      "#0070AD",
      })
    }

    result.expenses.push({
      id:           `cap-fg-${r.id}`,
      employeeId,
      clientId:     "cap",
      workerName,
      site:         r.site,
      buyer:        r.buyer,
      submittedAt:  r.submittedIso,
      amount:       r.amount,
      currency:     r.currency,
      status:       r.status,
      revision:     r.revision,
      sourceDetail: `Fieldglass · ${r.id}`,
      externalUrl:  expenseDetailUrl(r.id),
    })
  }
  result.employees = Array.from(employeeMap.values())
  return result
}
