// Capgemini-specific timesheet validation.
//
// Policy (per Buzzworks ops, validated against Fieldglass exports):
// ─ Weekly target = 45h. Workers fill 9h × 5 days (Mon-Fri).
// ─ When a public holiday falls on a weekday, the worker still enters
//   9h for that day so the weekly total is 45h. This is the
//   "holiday-fill" convention. Ops only checks the weekly total; if
//   it's exactly 45, no day-wise inspection is needed.
// ─ Total > 45h → overtime. The extra hours are NOT paid in the
//   current cycle. They roll to the next month pending manager email
//   approval (CC'd to ops). Status becomes "pending_mgr_approval".
// ─ Total < 45h → leave detected. (45 − total) ÷ 9 = days of leave
//   inferred. We deduct from the worker's earned-leaves balance and
//   flag the timesheet if balance goes negative. Day-wise breakdown
//   only available on the Fieldglass detail page; UI surfaces a deep
//   link for ops to drill into.
//
// Validation tick-marks the inbox card surfaces (in this order):
//   1. Weekly target (45h)
//   2. Holiday-fill / leave inference
//   3. Leave balance covers usage
//   4. OT pre-approval (only when > 45h)
//   5. Status mapping
//
// Anchors back to the Fieldglass timesheet detail page via external_url
// when persisted.

import type {
  ValidationCheck, TimesheetStatus, DailyEntry,
} from "./types"

const TARGET_HOURS_WEEKLY  = 45
const HOURS_PER_FULL_DAY   = 9
const TARGET_DAYS_PER_WEEK = 5
const LEAVES_PER_MONTH     = 1.75   // accrual rate (same as Accenture)

export interface CapgeminiValidationInput {
  totalHours:     number
  // ST/OT/DT/Others/NB breakdown from the Supplier List export. Most
  // Capgemini rows have all weekly time in "others"; we keep the
  // breakdown so individual rate buckets show up in audits.
  standardHours:  number
  overtimeHours:  number
  doubletimeHours: number
  otherHours:     number
  nbHours:        number

  rawStatus:      TimesheetStatus    // status as imported from Fieldglass
  earnedLeaves:   number              // accrued for this employee
  consumedLeaves: number              // used to date (excluding this week)
  approver:       string              // approver name (if any) on the row
  dailyEntries:   DailyEntry[]        // synthesised; real day-wise lives on portal
}

export interface CapgeminiValidationOutput {
  checks:           ValidationCheck[]
  validationScore:  number
  resolvedStatus:   TimesheetStatus
  flagReason?:      string
  otPayoutCycle:    "current" | "next"
  leaveDaysClaimed: number             // (45 − total) / 9, if total < 45
  otHours:          number             // total − 45, if total > 45
}

export function validateCapgeminiWeek(input: CapgeminiValidationInput): CapgeminiValidationOutput {
  const checks: ValidationCheck[] = []

  // Compute working numbers
  const total      = input.totalHours
  const isExact    = Math.abs(total - TARGET_HOURS_WEEKLY) < 0.01
  const isOver     = total > TARGET_HOURS_WEEKLY + 0.01
  const isUnder    = total < TARGET_HOURS_WEEKLY - 0.01
  const otHours    = isOver  ? +(total - TARGET_HOURS_WEEKLY).toFixed(2) : 0
  const shortHours = isUnder ? +(TARGET_HOURS_WEEKLY - total).toFixed(2) : 0
  const leaveDays  = isUnder ? +(shortHours / HOURS_PER_FULL_DAY).toFixed(2) : 0

  // ─── Check 1: Weekly target ────────────────────────────────────────────────
  if (isExact) {
    checks.push({
      id: "weekly-target", category: "hours",
      rule: "Weekly target reached (45h)",
      result: "pass",
      detail: `${total}h logged. Holiday-fill convention assumed for any non-working days; no day-wise inspection needed.`,
      autoChecked: true,
    })
  } else if (isOver) {
    checks.push({
      id: "weekly-target", category: "hours",
      rule: "Weekly target reached (45h)",
      result: "warning",
      detail: `${total}h logged · ${otHours}h over the 45h target.`,
      autoChecked: true,
    })
  } else {
    checks.push({
      id: "weekly-target", category: "hours",
      rule: "Weekly target reached (45h)",
      result: "warning",
      detail: `${total}h logged · ${shortHours}h short of 45h target.`,
      autoChecked: true,
    })
  }

  // ─── Check 2: Holiday-fill / Leave inference ───────────────────────────────
  if (isExact) {
    checks.push({
      id: "holiday-fill", category: "leave",
      rule: "Holiday-fill convention applied",
      result: "pass",
      detail: "All 5 weekdays accounted for at 9h each (or holiday-filled).",
      autoChecked: true,
    })
  } else if (isUnder) {
    const isWholeDays = Math.abs(leaveDays - Math.round(leaveDays)) < 0.01
    checks.push({
      id: "leave-inference", category: "leave",
      rule: "Leave day inference",
      result: isWholeDays ? "pass" : "warning",
      detail: isWholeDays
        ? `${leaveDays} day${leaveDays !== 1 ? "s" : ""} of leave inferred (${shortHours}h ÷ 9h).`
        : `Partial-day shortfall (${shortHours}h, not a multiple of 9). Verify on Fieldglass detail page.`,
      autoChecked: true,
    })
  }
  // Over case: no leave inference; OT branch covers it below.

  // ─── Check 3: Leave balance covers usage ───────────────────────────────────
  if (isUnder && leaveDays > 0) {
    const balanceBefore   = +(input.earnedLeaves - input.consumedLeaves).toFixed(2)
    const balanceAfter    = +(balanceBefore - leaveDays).toFixed(2)
    if (balanceAfter >= 0) {
      checks.push({
        id: "leave-balance", category: "leave",
        rule: "Leave balance covers usage",
        result: "pass",
        detail: `${balanceBefore} days available · ${leaveDays} claimed · ${balanceAfter} remaining.`,
        autoChecked: true,
      })
    } else {
      checks.push({
        id: "leave-balance", category: "leave",
        rule: "Leave balance covers usage",
        result: "fail",
        detail: `Over balance by ${Math.abs(balanceAfter).toFixed(2)} days. ${input.earnedLeaves.toFixed(2)} earned − ${input.consumedLeaves.toFixed(2)} consumed − ${leaveDays} this week.`,
        autoChecked: true,
      })
    }
  }

  // ─── Check 4: OT pre-approval (only when > 45h) ────────────────────────────
  let resolvedStatus: TimesheetStatus = input.rawStatus
  let otPayoutCycle: "current" | "next" = "current"
  let flagReason: string | undefined

  if (isOver) {
    otPayoutCycle = "next"
    if (input.approver && input.approver.trim().length > 0) {
      // Has an approver on record — still defer to next cycle, but
      // mark it as "pending_mgr_approval" until ops sees the email
      // confirmation. Capgemini policy is "OT not paid this month".
      checks.push({
        id: "ot-spillover", category: "overtime",
        rule: "OT requires manager approval",
        result: "warning",
        detail: `${otHours}h OT — payment deferred to next month. Approver on record: ${input.approver}. Confirmation email pending.`,
        autoChecked: true,
      })
      resolvedStatus = "pending_mgr_approval"
      flagReason = `${otHours}h OT awaiting manager email approval (CC'd to ops).`
    } else {
      checks.push({
        id: "ot-spillover", category: "overtime",
        rule: "OT requires manager approval",
        result: "fail",
        detail: `${otHours}h OT with no approver on record. Email manager + ops to authorise next-month payout.`,
        autoChecked: true,
      })
      resolvedStatus = "pending_mgr_approval"
      flagReason = `${otHours}h OT — manager approval not on record.`
    }
  }

  // ─── Check 5: Status mapping ───────────────────────────────────────────────
  checks.push({
    id: "status-recognised", category: "policy",
    rule: "Fieldglass status maps to internal taxonomy",
    result: "pass",
    detail: `Imported as '${input.rawStatus}', resolved to '${resolvedStatus}'.`,
    autoChecked: true,
  })

  // If hours > 45 and there's a hard fail OR balance fail, that drives status
  if (checks.some(c => c.result === "fail" && c.id === "leave-balance")) {
    resolvedStatus = "flagged"
    flagReason = "Leave balance exceeded — ops review required."
  }

  // Score: subtract per failed/warning check
  let score = 100
  for (const c of checks) {
    if (c.result === "fail")    score -= 20
    if (c.result === "warning") score -= 8
  }
  score = Math.max(0, Math.min(100, score))

  return {
    checks, validationScore: score, resolvedStatus,
    flagReason, otPayoutCycle,
    leaveDaysClaimed: leaveDays, otHours,
  }
}

// ─── Earned-leaves accrual (same formula as Accenture) ───────────────────────
//
// 1.75 days/month, prorated by months elapsed since startDate (capped at
// today). Returned as a decimal (e.g. 5.25 for 3 months elapsed).
export function computeEarnedLeavesCap(startDate: string | Date, today: Date = new Date()): number {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate
  if (!start || isNaN(start.getTime())) return 0
  const months = (today.getUTCFullYear() - start.getUTCFullYear()) * 12
              + (today.getUTCMonth()    - start.getUTCMonth())
              + (today.getUTCDate()    >= start.getUTCDate() ? 0 : -1)
  return Math.max(0, +(Math.max(0, months) * LEAVES_PER_MONTH).toFixed(2))
}
