export type TimesheetSource = "portal" | "email" | "manual"
export type TimesheetStatus = "pending" | "reviewing" | "flagged" | "approved" | "processed" | "rejected"
export type ValidationResult = "pass" | "fail" | "warning" | "pending"
export type ValidationCategory = "hours" | "overtime" | "leave" | "policy" | "employment"
export type InsightType = "anomaly" | "suggestion" | "warning" | "info"
export type InsightPriority = "high" | "medium" | "low"

export interface Client {
  id: string
  name: string
  code: string
  color: string
  portalName?: string
  policyVersion: string
  weeklyHoursLimit: number
  dailyHoursLimit: number
  overtimeMultiplier: number
  timezone: string
}

export interface LeaveBalance {
  annual: number
  sick: number
  casual: number
  usedAnnual: number
  usedSick: number
  usedCasual: number
}

export interface Employee {
  id: string
  name: string
  email: string
  clientId: string
  role: string
  department: string
  startDate: string
  endDate?: string
  ratePerHour: number
  leaveBalance: LeaveBalance
  managerEmail?: string
}

export interface ValidationCheck {
  id: string
  category: ValidationCategory
  rule: string
  result: ValidationResult
  detail: string
  autoChecked: boolean
}

export interface DailyEntry {
  date: string
  dayOfWeek: string
  regularHours: number
  overtimeHours: number
  leaveType?: string
  leaveHours?: number
  notes?: string
}

export interface Timesheet {
  id: string
  employeeId: string
  clientId: string
  period: string
  periodStart: string
  periodEnd: string
  submittedAt: string
  source: TimesheetSource
  sourceDetail?: string
  emailFrom?: string
  emailSubject?: string
  status: TimesheetStatus
  totalHours: number
  regularHours: number
  overtimeHours: number
  leaveHours: number
  totalPayable: number
  dailyEntries: DailyEntry[]
  validationChecks: ValidationCheck[]
  validationScore: number
  flagReason?: string
  flaggedBy?: "ai" | "ops" | "system"
  reviewedBy?: string
  approvedBy?: string
  approvedAt?: string
  notes?: string
  aiConfidence?: number
}

export interface AIInsight {
  id: string
  type: InsightType
  title: string
  description: string
  timesheetIds?: string[]
  employeeIds?: string[]
  clientId?: string
  priority: InsightPriority
  timestamp: string
  isRead: boolean
}

export interface PayrollSummary {
  clientId: string
  period: string
  approvedTimesheets: number
  totalHours: number
  totalAmount: number
  currency: string
  status: "draft" | "pending_approval" | "processed"
}
