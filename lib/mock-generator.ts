/**
 * Deterministic employee generator.
 * Given a clientId + index, always returns the same employee — no randomness at runtime.
 * This lets us "generate" tens of thousands of employees without storing them.
 */

import type {
  Employee, JobCategory, EmploymentStatus,
  Timesheet, TimesheetSource, TimesheetStatus,
  ValidationCheck, DailyEntry, PortalSlug,
} from "./types"
import { derivePayGradeFields } from "./mock-data"

// ─── Seed data ────────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  "Rahul","Priya","Amit","Neha","Vikram","Deepa","Arjun","Sonia","Rajesh","Kavya",
  "Suresh","Anita","Mohan","Pooja","Kiran","Divya","Ravi","Meena","Vijay","Lakshmi",
  "Arun","Sunita","Krishnan","Uma","Sanjay","Nisha","Ramesh","Geeta","Ashok","Rekha",
  "Manoj","Seema","Venkat","Padma","Girish","Shanti","Dinesh","Saroja","Murali","Nalini",
  "Prakash","Sudha","Harish","Jyothi","Bala","Radha","Pavan","Tara","Naveen","Latha",
  "Sachin","Anjali","Rohit","Kavitha","Pravin","Smita","Nikhil","Madhuri","Deepak","Rashmi",
  "Ajay","Sneha","Gaurav","Shruti","Kunal","Preeti","Sandeep","Ruchika","Vivek","Manisha",
]

const LAST_NAMES = [
  "Sharma","Verma","Gupta","Singh","Kumar","Rao","Patel","Mehta","Joshi","Nair",
  "Menon","Iyer","Reddy","Pillai","Mukherjee","Chatterjee","Das","Bose","Ghosh","Sinha",
  "Tiwari","Mishra","Shukla","Pandey","Dubey","Tripathi","Bajaj","Shah","Malhotra","Kapoor",
  "Khanna","Arora","Batra","Chawla","Grover","Saxena","Agarwal","Banerjee","Rajan","Krishnamurthy",
  "Naidu","Subramaniam","Venkatesh","Balakrishnan","Natarajan","Subramanian","Ramachandran","Gopal","Hegde","Kulkarni",
]

const CITIES = [
  "Mumbai","Bangalore","Hyderabad","Chennai","Pune",
  "Gurgaon","Noida","Delhi","Kolkata","Ahmedabad",
  "Chandigarh","Coimbatore","Kochi","Jaipur","Bhubaneswar",
  "Mysuru","Vadodara","Surat","Nagpur","Indore",
]

const AVATAR_COLORS = [
  "#00D4A5","#8B5CF6","#F59E0B","#FF6B6B","#3B82F6",
  "#10B981","#EC4899","#6366F1","#14B8A6","#84CC16",
  "#F97316","#06B6D4","#A855F7","#EF4444","#22C55E",
]

const ROLES_BY_CATEGORY: Record<JobCategory, string[]> = {
  Engineering:  ["Junior Developer","Software Engineer","Senior Developer","Lead Engineer","Principal Engineer","Tech Lead","Engineering Manager","Solution Architect","Cloud Architect","Platform Engineer","Staff Engineer"],
  Design:       ["UI Designer","UX Designer","Product Designer","Visual Designer","Design Lead","UX Researcher","Interaction Designer"],
  Finance:      ["Financial Analyst","Senior Analyst","Finance Manager","Accountant","Senior Accountant","Treasury Analyst","Cost Analyst","Controller"],
  Operations:   ["Operations Analyst","Process Lead","Business Operations","Operations Manager","Delivery Manager","Support Lead"],
  Sales:        ["Sales Analyst","Account Executive","Sales Manager","Business Development","Client Partner","Inside Sales"],
  HR:           ["HR Executive","HRBP","Talent Acquisition","HR Manager","Recruiter","People Operations","Learning & Dev"],
  Marketing:    ["Marketing Analyst","Content Strategist","Brand Manager","Digital Marketer","SEO Specialist"],
  Analytics:    ["Data Analyst","Data Scientist","Analytics Engineer","ML Engineer","BI Developer","Insights Analyst"],
  Healthcare:   ["Healthcare Coordinator","Clinical Analyst","Medical Billing Analyst","Healthcare IT Specialist","Nurse Informatics","Patient Coordinator"],
  Legal:        ["Legal Analyst","Compliance Officer","Contract Manager","Legal Counsel"],
  Consulting:   ["Consultant","Senior Consultant","Managing Consultant","Principal Consultant","Solution Advisor"],
  PMO:          ["Project Coordinator","Project Manager","Senior PM","Program Manager","Scrum Master","Delivery Lead"],
  Security:     ["Security Analyst","Penetration Tester","SOC Analyst","InfoSec Engineer","Compliance Analyst"],
  DevOps:       ["DevOps Engineer","SRE","Platform Engineer","Infrastructure Engineer","Release Engineer"],
  QA:           ["QA Engineer","Test Lead","SDET","Quality Manager","Test Architect","Automation Engineer"],
  Admin:        ["Executive Assistant","Office Manager","Administrative Analyst","Facilities Coordinator"],
}

const CATEGORIES: JobCategory[] = Object.keys(ROLES_BY_CATEGORY) as JobCategory[]

const DEPARTMENTS_BY_CATEGORY: Record<JobCategory, string> = {
  Engineering:  "Engineering",
  Design:       "Product & Design",
  Finance:      "Finance",
  Operations:   "Operations",
  Sales:        "Sales",
  HR:           "Human Resources",
  Marketing:    "Marketing",
  Analytics:    "Data & Analytics",
  Healthcare:   "Clinical Services",
  Legal:        "Legal & Compliance",
  Consulting:   "Consulting",
  PMO:          "Project Management Office",
  Security:     "Information Security",
  DevOps:       "Platform & Infrastructure",
  QA:           "Quality Assurance",
  Admin:        "Administration",
}

const RATES_BY_CATEGORY: Record<JobCategory, [number, number]> = {
  Engineering:  [350, 1200],
  Design:       [300, 800],
  Finance:      [400, 900],
  Operations:   [250, 600],
  Sales:        [280, 700],
  HR:           [250, 550],
  Marketing:    [280, 650],
  Analytics:    [400, 1000],
  Healthcare:   [300, 700],
  Legal:        [500, 1400],
  Consulting:   [600, 1500],
  PMO:          [450, 1000],
  Security:     [500, 1200],
  DevOps:       [450, 1100],
  QA:           [300, 750],
  Admin:        [200, 450],
}

const STATUS_WEIGHTS: EmploymentStatus[] = [
  "active","active","active","active","active","active","active","active",  // 80% active
  "notice","notice",                                                         // 15% notice (some)
  "ended",                                                                   // 5% ended
]

// ─── Seeded RNG ───────────────────────────────────────────────────────────────

function hashStr(str: string): number {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function seededRng(seed: number) {
  let s = seed >>> 0
  return {
    next(): number {
      s = (Math.imul(1664525, s) + 1013904223) >>> 0
      return s / 0xffffffff
    },
    pick<T>(arr: T[]): T {
      return arr[Math.floor(this.next() * arr.length)]
    },
    int(min: number, max: number): number {
      return Math.floor(this.next() * (max - min + 1)) + min
    },
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a deterministic employee for a given client + index.
 */
export function generateEmployee(clientId: string, index: number): Employee {
  const seed = hashStr(`${clientId}::${index}`)
  const rng  = seededRng(seed)

  const firstName    = rng.pick(FIRST_NAMES)
  const lastName     = rng.pick(LAST_NAMES)
  const name         = `${firstName} ${lastName}`
  const category     = rng.pick(CATEGORIES)
  const role         = rng.pick(ROLES_BY_CATEGORY[category])
  const department   = DEPARTMENTS_BY_CATEGORY[category]
  const city         = rng.pick(CITIES)
  const [rMin, rMax] = RATES_BY_CATEGORY[category]
  const rate         = Math.round(rng.int(rMin, rMax) / 50) * 50
  const color        = rng.pick(AVATAR_COLORS)
  const status       = rng.pick(STATUS_WEIGHTS)

  // DOJ: 1–4 years ago
  const daysAgo     = rng.int(90, 1460)
  const doj         = new Date(Date.now() - daysAgo * 86_400_000)
  const startDate   = doj.toISOString().split("T")[0]

  const annualLeave = rng.int(15, 24)
  const sickLeave   = rng.int(10, 15)
  const casualLeave = rng.int(6, 10)

  const slug        = name.toLowerCase().replace(/\s+/g, ".")
  const clientDomain = clientEmailDomain(clientId)

  const id   = `${clientId}-emp-${index}`
  const grade = derivePayGradeFields({ id, role, jobCategory: category, ratePerHour: rate })

  return {
    id,
    employeeCode:     `${clientId.toUpperCase().slice(0, 3)}${String(index).padStart(4, "0")}`,
    name,
    email:            `${slug}@${clientDomain}`,
    clientId,
    role,
    jobCategory:      category,
    department,
    city,
    startDate,
    ratePerHour:      rate,
    payGrade:         grade.payGrade,
    payMode:          grade.payMode,
    payRate:          grade.payRate,
    employmentStatus: status,
    avatarColor:      color,
    leaveBalance: {
      annual:      annualLeave,
      sick:        sickLeave,
      casual:      casualLeave,
      usedAnnual:  rng.int(0, annualLeave),
      usedSick:    rng.int(0, sickLeave),
      usedCasual:  rng.int(0, casualLeave),
    },
  }
}

/**
 * Generate `count` employees for a client, starting at offset.
 */
export function generateEmployeesForClient(
  clientId: string,
  count: number,
  offset = 0,
): Employee[] {
  const result: Employee[] = []
  for (let i = offset; i < offset + count; i++) {
    result.push(generateEmployee(clientId, i))
  }
  return result
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function clientEmailDomain(clientId: string): string {
  const domainMap: Record<string, string> = {
    hex: "hexaware.com",
    ibp: "infosysbpm.com",
    tci: "techcorp.in",
    gss: "globalstaff.com",
    fhl: "financehub.co",
    msh: "medsure.health",
    cgi: "capgemini.com",
    wvl: "wipro.com",
    cdg: "cognizant.com",
    hhc: "hclhealthcare.com",
    tes: "tataelxsi.com",
    mpc: "mphasis.com",
    nit: "niit.com",
    mtd: "mastechdigital.com",
    psy: "persistent.com",
    zns: "zensar.com",
    brl: "birlasoft.com",
    snt: "sonatasoftware.com",
    kpt: "kpit.com",
    lti: "ltimindtree.com",
    cyn: "cyient.com",
    mnd: "mindtree.com",
    ncs: "nucleussoftware.com",
    ngs: "newgensoft.com",
    idn: "intellectdesign.com",
  }
  return domainMap[clientId] ?? `${clientId}.in`
}

// ═════════════════════════════════════════════════════════════════════════════
// TIMESHEET GENERATOR
// ═════════════════════════════════════════════════════════════════════════════

const TIMESHEET_STATUS_WEIGHTS: TimesheetStatus[] = [
  "pending",  "pending",  "pending",  "pending",  "pending",   // ~25% pending
  "reviewing", "reviewing",                                     // ~10% reviewing
  "flagged",  "flagged",  "flagged",                            // ~15% flagged
  "approved", "approved", "approved", "approved",               // ~20% approved
  "processed","processed","processed",                          // ~15% processed
  "rejected",                                                    // ~5%  rejected
]

const SOURCE_WEIGHTS: TimesheetSource[] = [
  "portal", "portal", "portal", "portal", "portal", "portal",  // ~60% portal
  "email",  "email",  "email",                                  // ~30% email
  "manual",                                                      // ~10% manual
]

const FLAG_REASONS = [
  "OT cap exceeded",
  "Missing work order reference",
  "Sandwich leave detected",
  "Daily hours > 12h",
  "Weekend work without prior approval",
  "Email parsing low confidence",
  "Duplicate submission detected",
  "Rate mismatch with master data",
  "Pre-approval missing",
  "Hours total mismatch",
]

const VALIDATION_RULES = [
  { id: "r-cap",    cat: "Hours",     rule: "Weekly hours within cap" },
  { id: "r-daily",  cat: "Hours",     rule: "Daily hours under 12h" },
  { id: "r-ot",     cat: "Overtime",  rule: "OT pre-approval" },
  { id: "r-leave",  cat: "Leave",     rule: "Leave balance available" },
  { id: "r-rate",   cat: "Pay",       rule: "Rate matches master data" },
  { id: "r-wo",     cat: "Reference", rule: "Work order valid" },
  { id: "r-dup",    cat: "Integrity", rule: "No duplicate submission" },
] as const

const PORTAL_POOL: PortalSlug[] = [
  "veltrix", "hrloop", "peoplehive", "orbithcm", "cloudspire",
  "leafhr", "humanedge", "payaxis", "talentweave", "staffpulse",
]

function portalForClient(clientId: string): PortalSlug {
  const idx = hashStr(clientId) % PORTAL_POOL.length
  return PORTAL_POOL[idx]
}

/**
 * Generate a deterministic timesheet for a given employee + week index.
 * weekIndex 0 = current week, increases backwards
 */
export function generateTimesheet(employee: Employee, weekIndex: number): Timesheet {
  const seed = hashStr(`${employee.id}::ts::${weekIndex}`)
  const rng  = seededRng(seed)

  // Period dates: weekIndex back from this week
  const today = new Date("2026-04-17")
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay() - (weekIndex * 7) + 1)  // Monday
  const weekEnd   = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 4) // Friday

  const fmtMD = (d: Date) => d.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
  const fmtY  = (d: Date) => d.getFullYear()
  const period = `${fmtMD(weekStart)}–${fmtMD(weekEnd)}, ${fmtY(weekEnd)}`
  const periodStart = weekStart.toISOString().split("T")[0]
  const periodEnd   = weekEnd.toISOString().split("T")[0]

  // Hours: usually 40h regular, 0–8h OT, 0 leave (or full leave week)
  const hasLeave   = rng.next() < 0.10
  const leaveHours = hasLeave ? rng.int(8, 24) : 0
  const otHours    = rng.next() < 0.30 ? rng.int(2, 10) : 0
  const regular    = Math.max(8, 40 - leaveHours)
  const totalHours = regular + otHours + leaveHours
  const totalPayable = Math.round(
    regular * employee.ratePerHour +
    otHours * employee.ratePerHour * 1.5 +
    leaveHours * employee.ratePerHour
  )

  // Source weighted
  const source = rng.pick(SOURCE_WEIGHTS)
  const portalId = source === "portal" ? portalForClient(employee.clientId) : undefined

  // Submitted timestamp (1-3 days after period end)
  const submittedDays = rng.int(1, 3)
  const submitted = new Date(weekEnd)
  submitted.setDate(submitted.getDate() + submittedDays)
  submitted.setHours(rng.int(8, 19), rng.int(0, 59))

  // Status: weekIndex affects status — older weeks are more likely processed
  let status: TimesheetStatus
  if (weekIndex === 0) status = rng.pick(["pending", "pending", "pending", "reviewing", "flagged"])
  else if (weekIndex === 1) status = rng.pick(["pending", "reviewing", "flagged", "approved", "approved"])
  else status = rng.pick(["approved", "processed", "processed", "processed", "rejected"])

  // Override status if rng says so for variety
  if (rng.next() < 0.15) status = rng.pick(TIMESHEET_STATUS_WEIGHTS)

  // Validation checks
  const validationChecks: ValidationCheck[] = VALIDATION_RULES.map(vr => {
    const r = rng.next()
    let result: ValidationCheck["result"]
    if (r < 0.78) result = "pass"
    else if (r < 0.92) result = "warning"
    else result = "fail"
    return {
      id:          vr.id,
      category:    vr.cat as ValidationCheck["category"],
      rule:        vr.rule,
      result,
      detail:      result === "pass"
        ? "OK"
        : result === "warning"
          ? "Borderline — review recommended"
          : "Failed validation",
      autoChecked: true,
    }
  })

  // Score: based on pass count
  const passCount = validationChecks.filter(v => v.result === "pass").length
  const failCount = validationChecks.filter(v => v.result === "fail").length
  const baseScore = Math.round((passCount / validationChecks.length) * 100)
  const validationScore = Math.max(0, baseScore - (failCount * 8))

  const flagReason = (status === "flagged" || status === "rejected") ? rng.pick(FLAG_REASONS) : undefined

  // Daily entries
  const dailyEntries: DailyEntry[] = ["Mon","Tue","Wed","Thu","Fri"].map((dow, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    const isLeaveDay = hasLeave && i < Math.ceil(leaveHours / 8)
    return {
      date:         d.toISOString().split("T")[0],
      dayOfWeek:    dow,
      regularHours: isLeaveDay ? 0 : 8,
      overtimeHours: !isLeaveDay && i === 4 ? otHours : 0,
      leaveType:    isLeaveDay ? rng.pick(["annual", "sick", "casual"]) : undefined,
      leaveHours:   isLeaveDay ? 8 : undefined,
    }
  })

  return {
    id:                `ts-${employee.id}-w${weekIndex}`,
    employeeId:        employee.id,
    clientId:          employee.clientId,
    period,
    periodStart,
    periodEnd,
    submittedAt:       submitted.toISOString(),
    source,
    portalId,
    emailFrom:         source === "email" ? employee.email : undefined,
    emailSubject:      source === "email" ? `Timesheet ${period}` : undefined,
    status,
    totalHours,
    regularHours:      regular,
    overtimeHours:     otHours,
    leaveHours,
    totalPayable,
    dailyEntries,
    validationChecks,
    validationScore,
    flagReason,
    flaggedBy:         flagReason ? "ai" : undefined,
    approvedBy:        (status === "approved" || status === "processed")
      ? (rng.next() < 0.6 ? "JARVIS" : "Riya Shah")
      : undefined,
    approvedAt:        (status === "approved" || status === "processed")
      ? new Date(submitted.getTime() + rng.int(1, 8) * 3600_000).toISOString()
      : undefined,
    aiConfidence:      Math.max(40, validationScore + rng.int(-5, 8)),
  }
}

/**
 * Generate `count` timesheets across the given employees pool, distributing
 * over the last 4 weeks. Deterministic by employee + week.
 */
export function generateTimesheets(employees: Employee[], count: number): Timesheet[] {
  const result: Timesheet[] = []
  const weeks = 4
  let i = 0
  while (result.length < count && i < count * 2) {
    const emp = employees[i % employees.length]
    const week = Math.floor(i / employees.length) % weeks
    result.push(generateTimesheet(emp, week))
    i++
  }
  return result
}
