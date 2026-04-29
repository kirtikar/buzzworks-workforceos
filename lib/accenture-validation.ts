// Accenture-specific timesheet validation rules (BeeLine source).
//
// Per ops policy:
//   - Weekly cap: 45 hours
//   - > 45h     → hours over 45 are OT, deferred to next month's payroll,
//                 status = pending_mgr_approval, manager email required
//   - <= 45h    → check daily entries for leaves, then verify leave
//                 balance against the 1.75 / month accrual policy
//   - Source of truth for hours, leave hours, employee data: BeeLine

import type { ValidationCheck, DailyEntry, TimesheetStatus } from "./types"

export const ACC_WEEKLY_CAP = 45
export const ACC_LEAVES_PER_MONTH = 1.75
export const HOURS_PER_LEAVE_DAY = 8

export interface AccentureValidationInput {
  regularHours:     number
  overtimeHours:    number
  leaveHours:       number
  totalHours:       number
  dailyEntries:     DailyEntry[]
  rawStatus:        TimesheetStatus     // status as imported from BeeLine
  earnedLeaves:     number              // accrued for this employee to date
  consumedLeaves:   number              // used to date (excluding this week)
  approver:         string
}

export interface AccentureValidationOutput {
  checks:          ValidationCheck[]
  validationScore: number               // 0–100
  resolvedStatus:  TimesheetStatus      // after Accenture rules applied
  flagReason?:     string
  otPayoutCycle:   "current" | "next"
  leaveDaysClaimed: number              // computed from daily entries
}

export function validateAccentureWeek(input: AccentureValidationInput): AccentureValidationOutput {
  const checks: ValidationCheck[] = []

  const computedTotal = input.regularHours + input.overtimeHours + input.leaveHours

  // 1 — Total integrity
  const totalDelta = Math.abs(computedTotal - input.totalHours)
  checks.push({
    id: "total-hours",
    category: "hours",
    rule: "Total hours = regular + OT + leave",
    result: totalDelta > 0.5 ? "fail" : "pass",
    detail: totalDelta > 0.5
      ? `Declared ${input.totalHours}h, computed ${computedTotal.toFixed(2)}h (Δ ${totalDelta.toFixed(2)}h)`
      : `${computedTotal.toFixed(2)}h reconciles with declared total`,
    autoChecked: true,
  })

  // 2 — Weekly 45h cap (Accenture rule)
  const overCap = computedTotal - ACC_WEEKLY_CAP
  const exceeds = overCap > 0.5
  checks.push({
    id: "weekly-cap-45",
    category: "hours",
    rule: "Accenture cap: 45h/week",
    result: exceeds ? "warning" : "pass",
    detail: exceeds
      ? `${computedTotal.toFixed(1)}h logged · ${overCap.toFixed(1)}h treated as OT, deferred to next month's payroll, manager approval required`
      : `${computedTotal.toFixed(1)}h within 45h cap`,
    autoChecked: true,
  })

  // 3 — Leave balance check (only when under cap and leave was claimed)
  const leaveDaysClaimed = input.leaveHours / HOURS_PER_LEAVE_DAY
  const availableLeaves  = input.earnedLeaves - input.consumedLeaves
  if (input.leaveHours > 0) {
    const exceedsBalance = leaveDaysClaimed > availableLeaves + 0.01
    checks.push({
      id: "leave-balance",
      category: "leave",
      rule: "Leave within available balance (1.75d/month accrual)",
      result: exceedsBalance ? "fail" : "pass",
      detail: exceedsBalance
        ? `Claimed ${leaveDaysClaimed.toFixed(2)}d leave · only ${availableLeaves.toFixed(2)}d available`
        : `${leaveDaysClaimed.toFixed(2)}d leave within ${availableLeaves.toFixed(2)}d available`,
      autoChecked: true,
    })
  } else {
    checks.push({
      id: "leave-balance",
      category: "leave",
      rule: "Leave within available balance (1.75d/month accrual)",
      result: "pass",
      detail: `No leave claimed · ${availableLeaves.toFixed(2)}d available`,
      autoChecked: true,
    })
  }

  // 4 — Daily entry consistency: each day ≤ 12h, leave on a working day matches
  const dayOver12 = input.dailyEntries.find(d => (d.regularHours + d.overtimeHours + (d.leaveHours ?? 0)) > 12.01)
  checks.push({
    id: "daily-cap",
    category: "hours",
    rule: "Daily cap (≤ 12h per day across regular + OT + leave)",
    result: dayOver12 ? "warning" : "pass",
    detail: dayOver12
      ? `${dayOver12.date} (${dayOver12.dayOfWeek}) logged ${(dayOver12.regularHours + dayOver12.overtimeHours + (dayOver12.leaveHours ?? 0)).toFixed(1)}h`
      : "All days within 12h cap",
    autoChecked: true,
  })

  // 5 — OT pre-approval recorded (informational)
  checks.push({
    id: "ot-approver",
    category: "overtime",
    rule: "OT has named approver",
    result: input.overtimeHours > 0 ? (input.approver ? "pass" : "warning") : "pass",
    detail: input.overtimeHours > 0
      ? (input.approver ? `OT approved by ${input.approver}` : `${input.overtimeHours.toFixed(1)}h OT without recorded approver`)
      : "No OT claimed",
    autoChecked: true,
  })

  // Resolve final status from Accenture rules
  let resolvedStatus: TimesheetStatus = input.rawStatus
  let otPayoutCycle: "current" | "next" = "current"
  let flagReason: string | undefined

  if (exceeds) {
    resolvedStatus = "pending_mgr_approval"
    otPayoutCycle  = "next"
    flagReason     = `${overCap.toFixed(1)}h above 45h cap — OT deferred to next month's payroll, awaiting manager approval`
  } else {
    const failed = checks.find(c => c.result === "fail")
    if (failed && resolvedStatus === "pending") {
      resolvedStatus = "flagged"
      flagReason = failed.detail
    }
  }

  // Score: −20 per fail, −8 per warning
  let score = 100
  for (const c of checks) {
    if (c.result === "fail") score -= 20
    if (c.result === "warning") score -= 8
  }
  score = Math.max(0, Math.min(100, score))

  return {
    checks,
    validationScore: score,
    resolvedStatus,
    flagReason,
    otPayoutCycle,
    leaveDaysClaimed,
  }
}

// ─── Leave accrual ───────────────────────────────────────────────────────────
// 1.75 days per *whole* month elapsed since employee start_date. Pro-rated
// monthly accrual (no fractional accruals mid-month). today defaults to now.

export function computeEarnedLeaves(startDate: string | Date, today: Date = new Date()): number {
  const s = typeof startDate === "string" ? new Date(startDate) : startDate
  if (isNaN(s.getTime())) return 0
  const months =
    (today.getUTCFullYear() - s.getUTCFullYear()) * 12 +
    (today.getUTCMonth() - s.getUTCMonth()) +
    (today.getUTCDate() >= s.getUTCDate() ? 0 : -1)
  return Math.max(0, months) * ACC_LEAVES_PER_MONTH
}
