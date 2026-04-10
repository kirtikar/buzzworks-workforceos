// ─── Primitives ───────────────────────────────────────────────────────────────

export type TimesheetSource    = "portal" | "email" | "manual"
export type TimesheetStatus    = "pending" | "reviewing" | "flagged" | "approved" | "processed" | "rejected"
export type ValidationResult   = "pass" | "fail" | "warning" | "pending"
export type ValidationCategory = "hours" | "overtime" | "leave" | "policy" | "employment"
export type InsightType        = "anomaly" | "suggestion" | "warning" | "info"
export type InsightPriority    = "high" | "medium" | "low"
export type EmploymentStatus   = "active" | "notice" | "ended" | "on_hold"
export type PayrollStatus      = "draft" | "pending_approval" | "approved" | "processed" | "on_hold"
export type PolicySeverity     = "info" | "warning" | "violation"
export type IntegrationStatus  = "connected" | "error" | "syncing" | "disconnected" | "paused"
export type Industry =
  | "IT Services" | "BFSI" | "Healthcare" | "Staffing" | "Manufacturing"
  | "Retail" | "Consulting" | "Fintech" | "AutoTech" | "IT Products"
  | "IT Design" | "IT Training" | "IT Staffing" | "Engineering"

export type PortalSlug =
  | "veltrix" | "hrloop" | "peoplehive" | "orbithcm" | "cloudspire"
  | "leafhr" | "humanedge" | "payaxis" | "talentweave" | "staffpulse"

export type PolicyRuleCategory = "hours" | "overtime" | "leave" | "attendance" | "payroll" | "compliance"

export type JobCategory =
  | "Engineering" | "Design" | "Finance" | "Operations" | "Sales"
  | "HR" | "Marketing" | "Analytics" | "Healthcare" | "Legal"
  | "Consulting" | "PMO" | "Security" | "DevOps" | "QA" | "Admin"

// ─── Portal ───────────────────────────────────────────────────────────────────

export interface Portal {
  id: PortalSlug
  name: string
  shortName: string
  tagline: string
  color: string
  bgColor: string
  status: IntegrationStatus
  connectedClientIds: string[]
  totalEmployees: number
  lastSyncAt: string
  nextSyncAt: string
  syncFrequency: "15min" | "1hr" | "4hr" | "24hr"
  totalSyncedThisMonth: number
  pendingInQueue: number
  errorCount: number
  apiVersion: string
  webhookEnabled: boolean
  features: string[]
  authMethod: "oauth2" | "api_key" | "saml" | "basic"
  tier: "enterprise" | "business" | "starter"
  successRate: number  // 0-100
  avgSyncMs: number
}

// ─── Client ───────────────────────────────────────────────────────────────────

export interface Client {
  id: string
  name: string
  code: string
  color: string
  industry: Industry
  city: string
  state: string
  employeeCount: number
  activeEmployeeCount: number
  portalId?: PortalSlug
  portalName?: string
  policyVersion: string
  weeklyHoursLimit: number
  dailyHoursLimit: number
  overtimeMultiplier: number
  timezone: string
  slaHours: number
  contractStart: string
  contractEnd: string
  accountManager: string
  billingCurrency: "INR"
  status: "active" | "inactive"
  monthlyPayroll: number
  pendingTimesheets: number
  complianceScore: number    // 0-100
  emailOnly?: boolean
}

// ─── Employee ─────────────────────────────────────────────────────────────────

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
  employeeCode: string
  name: string
  email: string
  phone?: string
  clientId: string
  role: string
  jobCategory: JobCategory
  department: string
  city: string
  startDate: string
  endDate?: string
  ratePerHour: number
  leaveBalance: LeaveBalance
  managerEmail?: string
  managerName?: string
  employmentStatus: EmploymentStatus
  avatarColor: string
}

// ─── Policy ───────────────────────────────────────────────────────────────────

export interface PolicyRule {
  id: string
  clientId: string
  category: PolicyRuleCategory
  name: string
  description: string
  triggerCondition: string
  actionOnTrigger: string
  severity: PolicySeverity
  enabled: boolean
  createdAt: string
  updatedAt: string
  createdBy: "ai" | "ops" | "system"
  aiGenerated: boolean
  appliedCount: number  // how many timesheets this month hit this rule
  triggerCount: number  // how many times it actually triggered (subset of applied)
}

// ─── Validation ───────────────────────────────────────────────────────────────

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

// ─── Timesheet ────────────────────────────────────────────────────────────────

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
  portalId?: PortalSlug
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

// ─── AI Insight ───────────────────────────────────────────────────────────────

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
  suggestedAction?: string
}

// ─── Payroll ──────────────────────────────────────────────────────────────────

export interface PayrollBatch {
  id: string
  clientId: string
  period: string
  periodStart: string
  periodEnd: string
  approvedTimesheets: number
  totalTimesheets: number
  totalHours: number
  regularHours: number
  overtimeHours: number
  leaveHours: number
  totalAmount: number
  regularAmount: number
  overtimeAmount: number
  currency: "INR"
  status: PayrollStatus
  createdAt: string
  approvedBy?: string
  approvedAt?: string
  processedAt?: string
  onHoldCount: number
}

// ─── Legacy alias (keeps existing pages compiling) ────────────────────────────

export interface PayrollSummary {
  clientId: string
  period: string
  approvedTimesheets: number
  totalHours: number
  totalAmount: number
  currency: string
  status: "draft" | "pending_approval" | "processed"
}
