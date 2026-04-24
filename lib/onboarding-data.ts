// Onboarding inbox data — ops work around document validation,
// field reconciliation across docs/forms, and compliance checks for
// new hires. Generated deterministically from a seeded PRNG so the
// same candidate shows up in the global inbox and in the client tab.

import { clients } from "./mock-data"

// ─── Seeded PRNG (mulberry32) ────────────────────────────────────────────────

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function pick<T>(rnd: () => number, arr: T[]): T { return arr[Math.floor(rnd() * arr.length)] }

// ─── Types ────────────────────────────────────────────────────────────────────

export type OnboardingStage =
  | "doc-collection" | "verification" | "validation" | "reconciliation" | "compliance"

export type OnboardingSeverity = "high" | "medium" | "low"

export interface OnboardingIssue {
  id: string
  candidateName: string
  candidateCode: string
  clientId: string
  clientName: string
  clientColor: string
  role: string
  issueType: string
  stage: OnboardingStage
  severity: OnboardingSeverity
  aiSuggestion: string
  documents: string[]
  inconsistencies: string[]
  createdAt: string
  ageDays: number
  recommendedAction: string
  joiningDate: string
  location: string
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export const ONBOARDING_ISSUE_TYPES = [
  "Aadhaar–form name mismatch",
  "PAN verification failure",
  "DOB mismatch (PAN vs Aadhaar)",
  "Address proof conflict",
  "Bank proof missing",
  "Education certificate pending",
  "Previous employer relieving letter missing",
  "Background verification pending",
  "Medical fitness test pending",
  "ESIC enrollment pending",
  "EPF UAN mismatch",
  "Client policy acknowledgement missing",
] as const

export const STAGE_META: Record<OnboardingStage, { label: string; color: string; bg: string }> = {
  "doc-collection":  { label: "Doc collection",  color: "#6366F1", bg: "rgba(99,102,241,0.10)" },
  "verification":    { label: "Verification",    color: "#2563EB", bg: "rgba(37,99,235,0.10)" },
  "validation":      { label: "Validation",      color: "#0EA5E9", bg: "rgba(14,165,233,0.10)" },
  "reconciliation":  { label: "Reconciliation",  color: "#C2185B", bg: "rgba(194,24,91,0.10)" },
  "compliance":      { label: "Compliance",      color: "#F59E0B", bg: "rgba(245,158,11,0.10)" },
}

export const SEVERITY_META: Record<OnboardingSeverity, { label: string; color: string; bg: string }> = {
  high:   { label: "High",   color: "var(--danger)", bg: "var(--danger-bg)" },
  medium: { label: "Medium", color: "var(--warn)",   bg: "var(--warn-bg)" },
  low:    { label: "Low",    color: "var(--text-2)", bg: "var(--surface-2)" },
}

// ─── Issue recipe: per issue type, deterministic inconsistency lines ──────────

const FIRST = ["Arjun","Priya","Rahul","Sonia","Vikram","Neha","Amit","Divya","Karan","Meera","Rohit","Anita","Ravi","Sneha","Pranav","Nisha","Sanjay","Kavya","Sumit","Tanvi","Deepak","Lakshmi","Rakesh","Sana","Ishaan","Aarti","Yash","Manasi","Omar","Preeti","Saurabh","Asha","Vivek","Rhea","Harsh","Pooja","Nikhil","Mansi","Ajay","Aditi"]
const LAST  = ["Sharma","Menon","Rao","Verma","Kumar","Gupta","Das","Singh","Reddy","Nair","Iyer","Pillai","Joshi","Mehta","Patel","Shah","Krishnan","Tripathi","Banerjee","Chopra","Sethi","Balan","Jain","Bose","Kapoor","Desai","Chatterjee","Agarwal","Arora","Bhat"]

const ROLES = [
  "Junior Developer","Field Executive","Support Engineer","Operations Associate",
  "Data Analyst","Customer Service Rep","Warehouse Associate","Accountant",
  "Sales Executive","HR Associate","Logistics Coordinator","QA Engineer",
  "Technical Recruiter","Business Analyst","Process Associate","Delivery Lead",
]

const LOCATIONS = [
  "Bangalore","Mumbai","Pune","Chennai","Hyderabad","Delhi","Noida","Gurgaon","Kolkata","Ahmedabad","Jaipur","Kochi","Coimbatore","Indore",
]

interface IssueRecipe {
  stage: OnboardingStage
  severity: OnboardingSeverity
  docs: string[]
  inconsistencies: (rnd: () => number, name: string) => string[]
  recommendedAction: string
  aiSuggestion: string
}

const ISSUE_RECIPES: Record<string, IssueRecipe> = {
  "Aadhaar–form name mismatch": {
    stage: "reconciliation", severity: "high",
    docs: ["Aadhaar card","Onboarding form","HR master record"],
    recommendedAction: "Request corrected Aadhaar or updated form",
    aiSuggestion: "Trigger name correction workflow",
    inconsistencies: (_rnd, name) => [
      `Form name "${name}" does not match Aadhaar name "${name.split(" ")[0]} ${name.split(" ")[1] ?? ""}".`,
      "OCR confidence 96% — mismatch is unlikely to be a read error.",
      "ESIC enrollment blocked until name reconciled across documents.",
    ],
  },
  "PAN verification failure": {
    stage: "verification", severity: "high",
    docs: ["PAN card","NSDL verification response"],
    recommendedAction: "Raise re-verification with NSDL provider",
    aiSuggestion: "Request fresh PAN copy from candidate",
    inconsistencies: (_rnd) => [
      "NSDL API returned 'Invalid PAN' status on first attempt.",
      "Candidate’s DOB on PAN does not match Aadhaar DOB.",
      "Payroll cannot commence until PAN is validated.",
    ],
  },
  "DOB mismatch (PAN vs Aadhaar)": {
    stage: "reconciliation", severity: "high",
    docs: ["PAN card","Aadhaar card"],
    recommendedAction: "Collect corrected PAN or Aadhaar",
    aiSuggestion: "Ask candidate for corrected ID + affidavit",
    inconsistencies: (rnd) => [
      `PAN DOB: 12 Mar 19${85 + Math.floor(rnd() * 15)}. Aadhaar DOB: 1 Jan 19${85 + Math.floor(rnd() * 15)}.`,
      "Difference affects PF retirement window and gratuity eligibility.",
      "Client HRMS will reject upload until DOB is identical across IDs.",
    ],
  },
  "Address proof conflict": {
    stage: "reconciliation", severity: "medium",
    docs: ["Aadhaar card","Utility bill","Rental agreement"],
    recommendedAction: "Request latest utility bill or updated Aadhaar",
    aiSuggestion: "Accept rental agreement with notarisation",
    inconsistencies: (_rnd) => [
      "Aadhaar address is old permanent address; utility bill is current rental.",
      "HRMS city code inferred from utility bill differs from Aadhaar.",
      "Tax deduction city may impact professional tax slab.",
    ],
  },
  "Bank proof missing": {
    stage: "doc-collection", severity: "medium",
    docs: ["Cancelled cheque","Passbook front page","Bank letter"],
    recommendedAction: "Chase candidate for bank proof",
    aiSuggestion: "Send auto-reminder with portal upload link",
    inconsistencies: (_rnd) => [
      "No cancelled cheque or passbook uploaded 3 days after onboarding start.",
      "Salary account cannot be opened without bank proof.",
      "First payroll credit will fail if proof not collected before cutoff.",
    ],
  },
  "Education certificate pending": {
    stage: "doc-collection", severity: "low",
    docs: ["Degree certificate","Consolidated marksheet"],
    recommendedAction: "Send reminder; defer final onboarding if needed",
    aiSuggestion: "Allow provisional onboarding with 30-day SLA",
    inconsistencies: (_rnd) => [
      "Candidate uploaded provisional certificate only.",
      "University verification not yet initiated.",
      "Role requires degree verification before confirmation.",
    ],
  },
  "Previous employer relieving letter missing": {
    stage: "doc-collection", severity: "medium",
    docs: ["Relieving letter","Experience letter","Last payslip"],
    recommendedAction: "Follow up with candidate; cross-check via BGV",
    aiSuggestion: "Proceed with BGV agency verification in parallel",
    inconsistencies: (_rnd) => [
      "Last employer relieving letter not uploaded.",
      "Experience dates on resume differ from UAN record.",
      "Total experience computation blocked for grade mapping.",
    ],
  },
  "Background verification pending": {
    stage: "verification", severity: "medium",
    docs: ["BGV consent form","Prior employment records"],
    recommendedAction: "Escalate to BGV vendor for SLA breach",
    aiSuggestion: "Nudge BGV vendor; reset SLA",
    inconsistencies: (rnd) => [
      `BGV vendor status: ${pick(rnd, ["awaiting employer response","address verification in progress","pending court record check"])}.`,
      "SLA of 7 days breached by 3 days.",
      "Client allows provisional onboarding but flag raised in HRMS.",
    ],
  },
  "Medical fitness test pending": {
    stage: "compliance", severity: "low",
    docs: ["Medical fitness certificate","Doctor’s report"],
    recommendedAction: "Book clinic appointment; defer joining if needed",
    aiSuggestion: "Auto-book nearest empanelled clinic",
    inconsistencies: (_rnd) => [
      "Candidate has not attended scheduled medical slot.",
      "Client requires fitness clearance before asset handover.",
      "Onboarding incomplete in HRMS until certificate received.",
    ],
  },
  "ESIC enrollment pending": {
    stage: "compliance", severity: "medium",
    docs: ["Aadhaar card","Bank proof","ESIC declaration"],
    recommendedAction: "Complete ESIC registration within 10 days",
    aiSuggestion: "Push declaration via portal; attach Aadhaar",
    inconsistencies: (_rnd) => [
      "ESIC declaration form not signed by candidate.",
      "Statutory deadline (10 days from joining) approaching.",
      "Employee insurance coverage cannot start without IP number.",
    ],
  },
  "EPF UAN mismatch": {
    stage: "reconciliation", severity: "high",
    docs: ["UAN record","Prior employer Form 11","Aadhaar"],
    recommendedAction: "Ask candidate to correct UAN via UAN portal",
    aiSuggestion: "Raise EPFO grievance if candidate cannot self-fix",
    inconsistencies: (_rnd) => [
      "UAN name differs from Aadhaar; EPFO transfer rejected.",
      "Service history on UAN missing last 11 months.",
      "Employer contribution cannot be routed to candidate’s PF account.",
    ],
  },
  "Client policy acknowledgement missing": {
    stage: "validation", severity: "low",
    docs: ["Code of conduct","IT policy","NDA"],
    recommendedAction: "Resend policy pack; nudge candidate",
    aiSuggestion: "Send DocuSign pack with 48h deadline",
    inconsistencies: (rnd) => [
      `Pending acknowledgements: ${Math.max(1, Math.floor(rnd() * 3))} of 5 client policies.`,
      "NDA requires witness signature — candidate uploaded blank.",
      "Asset issuance gated on signed acknowledgement.",
    ],
  },
}

// ─── Generator ────────────────────────────────────────────────────────────────

function fmtDate(daysAgo: number): string {
  const d = new Date("2026-04-24T00:00:00Z")
  d.setUTCDate(d.getUTCDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}
function fmtJoining(daysFromNow: number): string {
  const d = new Date("2026-04-24T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + daysFromNow)
  return d.toISOString().slice(0, 10)
}

function generateOnboardingIssues(): OnboardingIssue[] {
  const rnd = mulberry32(20260424)
  const list: OnboardingIssue[] = []
  const target = 260
  for (let i = 0; i < target; i++) {
    const issueType = pick(rnd, [...ONBOARDING_ISSUE_TYPES])
    const recipe    = ISSUE_RECIPES[issueType]
    const first     = pick(rnd, FIRST)
    const last      = pick(rnd, LAST)
    const name      = `${first} ${last}`
    const client    = pick(rnd, clients)
    const role      = pick(rnd, ROLES)
    const ageDays   = Math.floor(rnd() * 14)
    const offsetN   = Math.floor(rnd() * 30) - 5    // -5 to +24 joining offset
    const code      = `${client.code}C${String(1000 + i).padStart(4, "0")}`

    list.push({
      id: `onb-${i + 1}`,
      candidateName:   name,
      candidateCode:   code,
      clientId:        client.id,
      clientName:      client.name,
      clientColor:     client.color,
      role,
      issueType,
      stage:             recipe.stage,
      severity:          recipe.severity,
      aiSuggestion:      recipe.aiSuggestion,
      documents:         recipe.docs,
      inconsistencies:   recipe.inconsistencies(rnd, name),
      recommendedAction: recipe.recommendedAction,
      createdAt:   fmtDate(ageDays),
      ageDays,
      joiningDate: fmtJoining(offsetN),
      location:    pick(rnd, LOCATIONS),
    })
  }
  return list
}

export const ONBOARDING_ISSUES: OnboardingIssue[] = generateOnboardingIssues()

export function getOnboardingIssuesForClient(clientId: string): OnboardingIssue[] {
  return ONBOARDING_ISSUES.filter(i => i.clientId === clientId)
}

// ─── Payroll issues ───────────────────────────────────────────────────────────

export type PayrollStage =
  | "pre-run" | "cycle-block" | "statutory" | "post-run"

export type PayrollSeverity = OnboardingSeverity

export interface PayrollIssue {
  id: string
  clientId:    string
  clientName:  string
  clientColor: string
  cycle:       string             // e.g. "Apr 2026"
  issueType:   string
  stage:       PayrollStage
  severity:    PayrollSeverity
  affectedCount: number
  amountImpact:  number
  aiSuggestion:  string
  details:       string[]
  recommendedAction: string
  createdAt: string
  ageDays:   number
}

export const PAYROLL_ISSUE_TYPES = [
  "Bank account validation failure",
  "PT slab mismatch",
  "LOP reconciliation variance",
  "Overtime pre-approval missing",
  "PF contribution ceiling breach",
  "TDS deduction mismatch",
  "Bonus payout block",
] as const

export const PAYROLL_STAGE_META: Record<PayrollStage, { label: string; color: string; bg: string }> = {
  "pre-run":     { label: "Pre-run",     color: "#6366F1", bg: "rgba(99,102,241,0.10)" },
  "cycle-block": { label: "Cycle block", color: "var(--danger)", bg: "var(--danger-bg)" },
  "statutory":   { label: "Statutory",   color: "#F59E0B", bg: "rgba(245,158,11,0.10)" },
  "post-run":    { label: "Post-run",    color: "#0EA5E9", bg: "rgba(14,165,233,0.10)" },
}

const PAYROLL_RECIPES: Record<string, { stage: PayrollStage; severity: PayrollSeverity; recommendedAction: string; aiSuggestion: string; template: (rnd: () => number, affectedCount: number, amount: number) => string[] }> = {
  "Bank account validation failure": {
    stage: "cycle-block", severity: "high",
    recommendedAction: "Collect corrected bank proofs; reroute failed credits",
    aiSuggestion: "Auto-email employees with failed bank validation",
    template: (_r, n, amt) => [
      `NPCI IFSC validation failed for ${n} employee${n > 1 ? "s" : ""}.`,
      `Total blocked salary credit: ₹${amt.toLocaleString("en-IN")}.`,
      "Cycle cannot be released until failures are resolved or excluded.",
    ],
  },
  "PT slab mismatch": {
    stage: "statutory", severity: "medium",
    recommendedAction: "Realign PT slab in HRMS; retro-adjust in next cycle",
    aiSuggestion: "Push state-wise PT matrix into payroll config",
    template: (_r, n) => [
      `${n} employees assigned to wrong state PT slab after recent relocation.`,
      "Variance risks statutory notice from state revenue department.",
      "Retro adjustment required in current cycle output.",
    ],
  },
  "LOP reconciliation variance": {
    stage: "pre-run", severity: "medium",
    recommendedAction: "Confirm LOP with line managers; re-run variance report",
    aiSuggestion: "Auto-query managers for LOP sign-off",
    template: (rnd, n) => [
      `Attendance system reports ${Math.floor(rnd() * 25) + 5} LOP days not confirmed by managers.`,
      `Affects ${n} employees across multiple cost centres.`,
      "Without sign-off payroll may overpay this cycle.",
    ],
  },
  "Overtime pre-approval missing": {
    stage: "pre-run", severity: "medium",
    recommendedAction: "Validate OT with line managers or disallow as per policy",
    aiSuggestion: "Disallow unapproved OT per client policy",
    template: (_r, n, amt) => [
      `${n} employees claim overtime without manager pre-approval.`,
      `Unapproved OT amount in variance: ₹${amt.toLocaleString("en-IN")}.`,
      "Client policy disallows OT without written approval.",
    ],
  },
  "PF contribution ceiling breach": {
    stage: "statutory", severity: "high",
    recommendedAction: "Cap contribution at ₹15,000 wage ceiling or raise exception",
    aiSuggestion: "Apply statutory ceiling unless employee opted for voluntary",
    template: (_r, n) => [
      `${n} employees exceed ₹15,000 wage ceiling without voluntary opt-in.`,
      "EPFO will reject ECR if not capped.",
      "Excess contributions must be refunded via next cycle.",
    ],
  },
  "TDS deduction mismatch": {
    stage: "post-run", severity: "medium",
    recommendedAction: "Revise tax computation; issue revised Form 16 if needed",
    aiSuggestion: "Re-run tax engine with latest declarations",
    template: (_r, n, amt) => [
      `${n} employees’ projected tax differs from investment declaration.`,
      `Adjustment delta: ₹${amt.toLocaleString("en-IN")} for the cycle.`,
      "Requires reissue of payslip TDS lines before 24Q filing.",
    ],
  },
  "Bonus payout block": {
    stage: "cycle-block", severity: "low",
    recommendedAction: "Confirm bonus eligibility with client; release or hold",
    aiSuggestion: "Hold for client approval and re-release next run",
    template: (_r, n, amt) => [
      `${n} employees’ bonus component is under eligibility review.`,
      `Blocked bonus amount: ₹${amt.toLocaleString("en-IN")}.`,
      "Client has asked to revalidate eligibility criteria for this cycle.",
    ],
  },
}

function generatePayrollIssues(): PayrollIssue[] {
  const rnd = mulberry32(20260429)
  const list: PayrollIssue[] = []
  const target = 72  // intentionally lighter than onboarding
  for (let i = 0; i < target; i++) {
    const issueType   = pick(rnd, [...PAYROLL_ISSUE_TYPES])
    const recipe      = PAYROLL_RECIPES[issueType]
    const client      = pick(rnd, clients)
    const ageDays     = Math.floor(rnd() * 10)
    const affected    = Math.floor(rnd() * 18) + 1
    const amount      = affected * (Math.floor(rnd() * 80000) + 4000)
    const cycle       = pick(rnd, ["Apr 2026","Mar 2026","Feb 2026"])
    list.push({
      id: `pay-${i + 1}`,
      clientId:   client.id,
      clientName: client.name,
      clientColor: client.color,
      cycle,
      issueType,
      stage:           recipe.stage,
      severity:        recipe.severity,
      affectedCount:   affected,
      amountImpact:    amount,
      aiSuggestion:    recipe.aiSuggestion,
      details:         recipe.template(rnd, affected, amount),
      recommendedAction: recipe.recommendedAction,
      createdAt: fmtDate(ageDays),
      ageDays,
    })
  }
  return list
}

export const PAYROLL_ISSUES: PayrollIssue[] = generatePayrollIssues()

export function getPayrollIssuesForClient(clientId: string): PayrollIssue[] {
  return PAYROLL_ISSUES.filter(i => i.clientId === clientId)
}
