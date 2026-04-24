import type {
  Client, Employee, Timesheet, AIInsight, PayrollSummary,
  Portal, PolicyRule, PayrollBatch,
  PayGrade, PayBand, PayStep, PayMode,
  PolicyWorkflow,
} from "./types"

// ─── Policy workflow metadata (shared with policy page) ──────────────────────

export const WORKFLOW_META: Record<PolicyWorkflow, { label: string; color: string; bg: string; description: string }> = {
  "timesheet-validation": { label: "Timesheet validation", color: "#2563EB", bg: "rgba(37,99,235,0.10)",  description: "Rules that run when a timesheet is submitted — hours, overtime, attendance, daily caps." },
  "onboarding":           { label: "Onboarding",           color: "#6366F1", bg: "rgba(99,102,241,0.10)",  description: "Rules for new-joiner completeness — KYC, bank details, documents, first-cycle readiness." },
  "leave-attendance":     { label: "Leave & attendance",   color: "#0EA5E9", bg: "rgba(14,165,233,0.10)",  description: "Rules for leave applications, approvals, sandwich leave, carry-forward, LOP reconciliation." },
  "payroll":              { label: "Payroll processing",   color: "#10B981", bg: "rgba(16,185,129,0.10)",  description: "Rules that gate a payroll run — computations, statutory deductions, bonus, disbursement." },
  "compliance":           { label: "Compliance checks",    color: "#F59E0B", bg: "rgba(245,158,11,0.10)",  description: "Rules for EPF/ESIC/PT/LWF, contract term, statutory filings, workplace safety." },
  "exit":                 { label: "Exit / separation",    color: "#C2185B", bg: "rgba(194,24,91,0.10)",   description: "Rules for offboarding, notice period, contract expiry, asset recovery." },
  "fnf":                  { label: "Full & Final (FnF)",   color: "#B76E79", bg: "rgba(183,110,121,0.10)", description: "Rules for final settlement — leave encashment, gratuity, recoverables, clearance." },
}

// Deterministic workflow inference from rule text so existing seeded rules can
// be grouped without manually labelling each one. Falls back to timesheet
// validation (which is the biggest bucket anyway).
export function deriveWorkflow(rule: Pick<PolicyRule, "category" | "name" | "description" | "triggerCondition" | "actionOnTrigger" | "workflow">): PolicyWorkflow {
  if (rule.workflow) return rule.workflow
  const blob = `${rule.name} ${rule.description} ${rule.triggerCondition} ${rule.actionOnTrigger}`.toLowerCase()

  if (blob.includes("fnf") || blob.includes("full and final") || blob.includes("gratuity") ||
      blob.includes("leave encashment") || blob.includes("final settlement")) return "fnf"

  if (blob.includes("exit") || blob.includes("offboard") || blob.includes("notice period") ||
      blob.includes("contract_end") || blob.includes("contract expiry") || blob.includes("separation") ||
      blob.includes("asset recovery")) return "exit"

  if (blob.includes("onboard") || blob.includes("joining") || blob.includes("new joiner") ||
      blob.includes("kyc") || blob.includes("aadhaar") || blob.includes("pan ") ||
      (blob.includes("bank") && (blob.includes("ifsc") || blob.includes("proof"))) ||
      blob.includes("uan")) return "onboarding"

  if (rule.category === "payroll" || blob.includes("payroll") || blob.includes("salary hold") ||
      blob.includes("bonus") || blob.includes("tds") || blob.includes("disbursement") ||
      blob.includes("bank details")) return "payroll"

  if (rule.category === "leave" || blob.includes("leave") || blob.includes("sandwich") ||
      blob.includes("lop") || blob.includes("attendance")) return "leave-attendance"

  if (rule.category === "compliance" || blob.includes("epf") || blob.includes("esic") ||
      blob.includes("statutory") || blob.includes("compliance") || blob.includes("pt ") ||
      blob.includes("lwf")) return "compliance"

  return "timesheet-validation"
}

// ─── Pay grade derivation ────────────────────────────────────────────────────
//
// Pay grade is a letter band (A-I) × step (1-9) = 81-cell lattice.
// Band maps to rate bracket (seniority tier), step differentiates within a band
// deterministically from a hash of the employee id + role so each run gives
// the same answer. Pay mode is per-role: consulting roles bill hourly, field /
// shift roles bill daily, everyone else is monthly.
export function derivePayGradeFields(input: {
  id: string
  role: string
  jobCategory: Employee["jobCategory"]
  ratePerHour: number
}): { payGrade: PayGrade; payMode: PayMode; payRate: number } {
  const brackets: [number, PayBand][] = [
    [350, "A"], [450, "B"], [550, "C"], [650, "D"],
    [750, "E"], [850, "F"], [950, "G"], [1050, "H"], [Number.POSITIVE_INFINITY, "I"],
  ]
  const band = (brackets.find(([cap]) => input.ratePerHour < cap) ?? brackets[brackets.length - 1])[1]

  let h = 0
  const s = input.id + input.role
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  const step = (((Math.abs(h) % 9) + 1) as PayStep)

  const role = input.role.toLowerCase()
  const cat  = input.jobCategory
  let payMode: PayMode = "monthly"
  if (role.includes("consultant") || role.includes("contractor") || cat === "Consulting") {
    payMode = "hourly"
  } else if (["Healthcare", "Operations", "Logistics", "Manufacturing"].includes(cat as string)) {
    payMode = (Math.abs(h) % 2) === 0 ? "monthly" : "daily"
  }

  const payRate = payMode === "hourly" ? input.ratePerHour
    : payMode === "daily" ? input.ratePerHour * 8
    : Math.round(input.ratePerHour * 8 * 22 / 100) * 100  // rounded monthly gross

  return { payGrade: `${band}${step}` as PayGrade, payMode, payRate }
}

// ─── Portals (2, VMS integrations) ───────────────────────────────────────────

export const portals: Portal[] = [
  {
    id: "fieldglass",
    name: "SAP Fieldglass",
    shortName: "Fieldglass",
    tagline: "Enterprise VMS for contingent workforce and services procurement",
    color: "#0070AD",
    bgColor: "rgba(0,112,173,0.08)",
    status: "connected",
    connectedClientIds: ["cap"],
    totalEmployees: 8500,
    lastSyncAt: "2026-04-24T06:30:00Z",
    nextSyncAt: "2026-04-24T07:00:00Z",
    syncFrequency: "15min",
    totalSyncedThisMonth: 7840,
    pendingInQueue: 12,
    errorCount: 0,
    apiVersion: "v2024.1",
    webhookEnabled: true,
    features: [
      "Contingent worker timesheets",
      "Rate card enforcement",
      "Statement of work approvals",
      "Purchase order linkage",
    ],
    authMethod: "oauth2",
    tier: "enterprise",
    successRate: 99.7,
    avgSyncMs: 240,
  },
  {
    id: "beeline",
    name: "BeeLine",
    shortName: "BeeLine",
    tagline: "Leading VMS for non-employee workforce management",
    color: "#F4B400",
    bgColor: "rgba(244,180,0,0.08)",
    status: "connected",
    connectedClientIds: ["acc", "pwc"],
    totalEmployees: 14400,
    lastSyncAt: "2026-04-24T06:15:00Z",
    nextSyncAt: "2026-04-24T07:15:00Z",
    syncFrequency: "1hr",
    totalSyncedThisMonth: 13260,
    pendingInQueue: 23,
    errorCount: 2,
    apiVersion: "v12",
    webhookEnabled: true,
    features: [
      "Supplier & worker management",
      "Approval workflows",
      "Integrated invoicing",
      "Assignment & rate governance",
    ],
    authMethod: "oauth2",
    tier: "enterprise",
    successRate: 99.4,
    avgSyncMs: 310,
  },
]

// ─── Clients (11, real managed-workforce accounts) ───────────────────────────
//
// timesheetMethod + portalId match the authoritative client table (see
// README). Portal clients integrate via Fieldglass or BeeLine VMS; manual
// clients have no portal and are handled by ops via email / sheets.

export const clients: Client[] = [
  // ─ Portal-integrated (Fieldglass / BeeLine) ────────────────────────────────
  { id:"cap", name:"Capgemini Technology Services India Ltd.", code:"CAP", color:"#0070AD", industry:"IT Services", city:"Mumbai",    state:"Maharashtra",  employeeCount:8500, activeEmployeeCount:8100, timesheetMethod:"portal", portalId:"fieldglass", portalName:"SAP Fieldglass", policyVersion:"v4.2", weeklyHoursLimit:45, dailyHoursLimit:9,  overtimeMultiplier:1.5,  timezone:"Asia/Kolkata", slaHours:48, contractStart:"2022-04-01", contractEnd:"2027-03-31", accountManager:"Priya Shah",        billingCurrency:"INR", status:"active", monthlyPayroll:30000000, pendingTimesheets:82, complianceScore:93 },
  { id:"acc", name:"Accenture Limited",                         code:"ACC", color:"#A100FF", industry:"Consulting",  city:"Bangalore", state:"Karnataka",    employeeCount:12000,activeEmployeeCount:11500,timesheetMethod:"portal", portalId:"beeline",    portalName:"BeeLine VMS",    policyVersion:"v5.0", weeklyHoursLimit:40, dailyHoursLimit:8,  overtimeMultiplier:1.5,  timezone:"Asia/Kolkata", slaHours:24, contractStart:"2021-01-01", contractEnd:"2026-12-31", accountManager:"Rahul Mehta",       billingCurrency:"INR", status:"active", monthlyPayroll:42000000, pendingTimesheets:119,complianceScore:96 },
  { id:"pwc", name:"PwC India",                                 code:"PWC", color:"#DC6B2F", industry:"Consulting",  city:"Mumbai",    state:"Maharashtra",  employeeCount:2400, activeEmployeeCount:2330, timesheetMethod:"portal", portalId:"beeline",    portalName:"BeeLine VMS",    policyVersion:"v3.5", weeklyHoursLimit:45, dailyHoursLimit:9,  overtimeMultiplier:1.5,  timezone:"Asia/Kolkata", slaHours:48, contractStart:"2022-10-01", contractEnd:"2026-09-30", accountManager:"Deepa Nair",        billingCurrency:"INR", status:"active", monthlyPayroll:8500000,  pendingTimesheets:28, complianceScore:92 },

  // ─ Manual (timesheets via email / sheet / PDF) ─────────────────────────────
  { id:"lmt", name:"LTIMindtree Ltd.",                          code:"LMT", color:"#7F4DFF", industry:"IT Services", city:"Mumbai",    state:"Maharashtra",  employeeCount:4800, activeEmployeeCount:4600, timesheetMethod:"manual",                                                              policyVersion:"v4.1", weeklyHoursLimit:45, dailyHoursLimit:9,  overtimeMultiplier:1.5,  timezone:"Asia/Kolkata", slaHours:48, contractStart:"2021-10-01", contractEnd:"2026-09-30", accountManager:"Anita Rao",         billingCurrency:"INR", status:"active", monthlyPayroll:15000000, pendingTimesheets:58, complianceScore:94 },
  { id:"hex", name:"Hexaware Technologies Ltd.",                code:"HEX", color:"#FF6B35", industry:"IT Services", city:"Mumbai",    state:"Maharashtra",  employeeCount:3200, activeEmployeeCount:3080, timesheetMethod:"manual",                                                              policyVersion:"v3.6", weeklyHoursLimit:45, dailyHoursLimit:9,  overtimeMultiplier:1.5,  timezone:"Asia/Kolkata", slaHours:48, contractStart:"2022-04-01", contractEnd:"2027-03-31", accountManager:"Priya Shah",        billingCurrency:"INR", status:"active", monthlyPayroll:10000000, pendingTimesheets:41, complianceScore:91 },
  { id:"vir", name:"Virtusa Consulting Services Pvt. Ltd.",     code:"VIR", color:"#00A9E0", industry:"IT Services", city:"Hyderabad", state:"Telangana",    employeeCount:2800, activeEmployeeCount:2680, timesheetMethod:"manual",                                                              policyVersion:"v3.3", weeklyHoursLimit:45, dailyHoursLimit:9,  overtimeMultiplier:1.5,  timezone:"Asia/Kolkata", slaHours:48, contractStart:"2023-04-01", contractEnd:"2027-03-31", accountManager:"Arjun Sharma",      billingCurrency:"INR", status:"active", monthlyPayroll:8000000,  pendingTimesheets:36, complianceScore:89 },
  { id:"cts", name:"Cognizant Technology Solutions India Pvt. Ltd.", code:"CTS", color:"#1A5CA8", industry:"IT Services", city:"Chennai", state:"Tamil Nadu", employeeCount:9500, activeEmployeeCount:9050, timesheetMethod:"manual",                                                          policyVersion:"v4.0", weeklyHoursLimit:40, dailyHoursLimit:8,  overtimeMultiplier:1.25, timezone:"Asia/Kolkata", slaHours:48, contractStart:"2022-07-01", contractEnd:"2027-06-30", accountManager:"Vikram Iyer",       billingCurrency:"INR", status:"active", monthlyPayroll:32000000, pendingTimesheets:95, complianceScore:90 },
  { id:"aoc", name:"Amphenol Omniconnect India Pvt. Ltd.",      code:"AOC", color:"#6B7280", industry:"Manufacturing",city:"Bangalore", state:"Karnataka",    employeeCount:680,  activeEmployeeCount:660,  timesheetMethod:"manual",                                                              policyVersion:"v2.4", weeklyHoursLimit:48, dailyHoursLimit:9,  overtimeMultiplier:2.0,  timezone:"Asia/Kolkata", slaHours:48, contractStart:"2024-01-01", contractEnd:"2027-12-31", accountManager:"Kavya Reddy",       billingCurrency:"INR", status:"active", monthlyPayroll:2500000,  pendingTimesheets:12, complianceScore:88 },
  { id:"bct", name:"Bahwan Cybertek Pvt. Ltd.",                 code:"BCT", color:"#0A8B8F", industry:"IT Services", city:"Chennai",   state:"Tamil Nadu",   employeeCount:520,  activeEmployeeCount:505,  timesheetMethod:"manual",                                                              policyVersion:"v2.1", weeklyHoursLimit:45, dailyHoursLimit:9,  overtimeMultiplier:1.5,  timezone:"Asia/Kolkata", slaHours:48, contractStart:"2024-04-01", contractEnd:"2027-03-31", accountManager:"Rahul Mehta",       billingCurrency:"INR", status:"active", monthlyPayroll:2000000,  pendingTimesheets:9,  complianceScore:87 },
  { id:"wno", name:"Winomechanic Pvt. Ltd.",                    code:"WNO", color:"#7CB342", industry:"Engineering", city:"Pune",      state:"Maharashtra",  employeeCount:220,  activeEmployeeCount:215,  timesheetMethod:"manual",                                                              policyVersion:"v1.6", weeklyHoursLimit:48, dailyHoursLimit:9,  overtimeMultiplier:1.75, timezone:"Asia/Kolkata", slaHours:72, contractStart:"2024-07-01", contractEnd:"2027-06-30", accountManager:"Anita Rao",         billingCurrency:"INR", status:"active", monthlyPayroll:650000,   pendingTimesheets:4,  complianceScore:85 },
  { id:"hmh", name:"HMH Technology Private Limited",            code:"HMH", color:"#00625F", industry:"IT Services", city:"Pune",      state:"Maharashtra",  employeeCount:310,  activeEmployeeCount:300,  timesheetMethod:"manual",                                                              policyVersion:"v1.8", weeklyHoursLimit:45, dailyHoursLimit:9,  overtimeMultiplier:1.5,  timezone:"Asia/Kolkata", slaHours:48, contractStart:"2024-10-01", contractEnd:"2027-09-30", accountManager:"Vikram Iyer",       billingCurrency:"INR", status:"active", monthlyPayroll:950000,   pendingTimesheets:5,  complianceScore:86 },
]

// ─── Seed Employees (spread across key clients) ───────────────────────────────

type EmployeeSeed = Omit<Employee, "payGrade" | "payMode" | "payRate">

const _employeeSeeds: EmployeeSeed[] = [
  // TCI - TechCorp India
  { id:"emp001", employeeCode:"TCI0001", name:"Rahul Sharma",    email:"rahul.sharma@techcorp.in",        clientId:"acc", role:"Senior Developer",        jobCategory:"Engineering", department:"Engineering",       city:"Bangalore",  startDate:"2024-01-15", ratePerHour:500,  employmentStatus:"active",  avatarColor:"#00D4A5", managerEmail:"mgr@techcorp.in", leaveBalance:{annual:18,sick:10,casual:6,usedAnnual:5,usedSick:2,usedCasual:1} },
  { id:"emp002", employeeCode:"TCI0002", name:"Priya Menon",     email:"priya.menon@techcorp.in",         clientId:"acc", role:"UX Designer",             jobCategory:"Design",      department:"Product & Design",  city:"Bangalore",  startDate:"2024-03-01", ratePerHour:450,  employmentStatus:"active",  avatarColor:"#8B5CF6", leaveBalance:{annual:18,sick:10,casual:6,usedAnnual:8,usedSick:3,usedCasual:2} },
  { id:"emp003", employeeCode:"TCI0003", name:"Deepa Rao",       email:"deepa.rao@techcorp.in",           clientId:"acc", role:"Project Manager",         jobCategory:"PMO",         department:"PMO",               city:"Bangalore",  startDate:"2023-02-28", ratePerHour:700,  employmentStatus:"active",  avatarColor:"#F59E0B", managerEmail:"vp@techcorp.in", leaveBalance:{annual:18,sick:10,casual:6,usedAnnual:3,usedSick:0,usedCasual:1} },
  // GSS - GlobalStaff Solutions
  { id:"emp004", employeeCode:"GSS0001", name:"Amit Verma",      email:"amit.verma@globalstaff.com",      clientId:"vir", role:"Business Analyst",        jobCategory:"Consulting",  department:"Consulting",        city:"Mumbai",     startDate:"2023-07-01", ratePerHour:600,  employmentStatus:"active",  avatarColor:"#00D4A5", managerEmail:"lead@globalstaff.com", leaveBalance:{annual:21,sick:12,casual:8,usedAnnual:12,usedSick:1,usedCasual:3} },
  { id:"emp005", employeeCode:"GSS0002", name:"Arjun Kumar",     email:"arjun.kumar@globalstaff.com",     clientId:"vir", role:"Full Stack Developer",    jobCategory:"Engineering", department:"Engineering",       city:"Mumbai",     startDate:"2024-04-15", ratePerHour:480,  employmentStatus:"active",  avatarColor:"#3B82F6", managerEmail:"lead@globalstaff.com", leaveBalance:{annual:18,sick:10,casual:6,usedAnnual:1,usedSick:0,usedCasual:0} },
  // FHL - FinanceHub Ltd
  { id:"emp006", employeeCode:"FHL0001", name:"Neha Gupta",      email:"neha.gupta@financehub.co",        clientId:"pwc", role:"Financial Analyst",       jobCategory:"Finance",     department:"Finance",           city:"Mumbai",     startDate:"2022-11-15", ratePerHour:550,  employmentStatus:"active",  avatarColor:"#F59E0B", leaveBalance:{annual:24,sick:14,casual:10,usedAnnual:18,usedSick:5,usedCasual:4} },
  { id:"emp007", employeeCode:"FHL0002", name:"Sonia Das",       email:"sonia.das@financehub.co",         clientId:"pwc", role:"Senior Accountant",       jobCategory:"Finance",     department:"Finance",           city:"Mumbai",     startDate:"2021-08-01", ratePerHour:520,  employmentStatus:"notice",  avatarColor:"#EC4899", leaveBalance:{annual:24,sick:14,casual:10,usedAnnual:22,usedSick:8,usedCasual:7} },
  // MSH - MedSure Health
  { id:"emp008", employeeCode:"MSH0001", name:"Vikram Singh",    email:"vikram.singh@medsure.health",     clientId:"aoc", role:"Healthcare Coordinator",  jobCategory:"Healthcare",  department:"Clinical Services", city:"Hyderabad",  startDate:"2024-06-01", ratePerHour:400,  employmentStatus:"active",  avatarColor:"#FF6B6B", leaveBalance:{annual:18,sick:15,casual:6,usedAnnual:2,usedSick:4,usedCasual:0} },
  // HEX - Hexaware Technologies
  { id:"emp009", employeeCode:"HEX0001", name:"Kavya Reddy",     email:"kavya.reddy@hexaware.com",        clientId:"hex", role:"Cloud Architect",         jobCategory:"Engineering", department:"Engineering",       city:"Mumbai",     startDate:"2022-06-01", ratePerHour:950,  employmentStatus:"active",  avatarColor:"#FF6B35", managerEmail:"director@hexaware.com", leaveBalance:{annual:21,sick:12,casual:8,usedAnnual:6,usedSick:1,usedCasual:2} },
  { id:"emp010", employeeCode:"HEX0002", name:"Suresh Nair",     email:"suresh.nair@hexaware.com",        clientId:"hex", role:"Data Scientist",          jobCategory:"Analytics",   department:"Data & Analytics",  city:"Mumbai",     startDate:"2023-03-15", ratePerHour:800,  employmentStatus:"active",  avatarColor:"#10B981", leaveBalance:{annual:21,sick:12,casual:8,usedAnnual:4,usedSick:2,usedCasual:1} },
  // IBP - Infosys BPM
  { id:"emp011", employeeCode:"IBP0001", name:"Anita Joshi",     email:"anita.joshi@infosysbpm.com",      clientId:"cts", role:"Operations Manager",      jobCategory:"Operations",  department:"Operations",        city:"Pune",       startDate:"2021-09-01", ratePerHour:650,  employmentStatus:"active",  avatarColor:"#0070F3", managerEmail:"vp@infosysbpm.com", leaveBalance:{annual:24,sick:14,casual:10,usedAnnual:10,usedSick:3,usedCasual:4} },
  { id:"emp012", employeeCode:"IBP0002", name:"Rajesh Pillai",   email:"rajesh.pillai@infosysbpm.com",    clientId:"cts", role:"Process Lead",            jobCategory:"Operations",  department:"Operations",        city:"Pune",       startDate:"2022-01-15", ratePerHour:580,  employmentStatus:"active",  avatarColor:"#6366F1", leaveBalance:{annual:21,sick:12,casual:8,usedAnnual:7,usedSick:1,usedCasual:2} },
  // NCS - Nucleus Software (email only)
  { id:"emp013", employeeCode:"NCS0001", name:"Mohan Tripathi",  email:"mohan.tripathi@nucleussoftware.com", clientId:"bct", role:"Legal Analyst",       jobCategory:"Legal",       department:"Legal & Compliance",city:"Noida",      startDate:"2023-05-01", ratePerHour:700,  employmentStatus:"active",  avatarColor:"#607D8B", managerEmail:"gm@nucleussoftware.com", leaveBalance:{annual:18,sick:10,casual:6,usedAnnual:3,usedSick:1,usedCasual:0} },
  // CGI - Capgemini India
  { id:"emp014", employeeCode:"CGI0001", name:"Divya Krishnan",  email:"divya.krishnan@capgemini.com",    clientId:"cap", role:"Principal Consultant",    jobCategory:"Consulting",  department:"Consulting",        city:"Chennai",    startDate:"2020-11-01", ratePerHour:1100, employmentStatus:"active",  avatarColor:"#003189", managerEmail:"partner@capgemini.com", leaveBalance:{annual:24,sick:14,casual:10,usedAnnual:15,usedSick:2,usedCasual:5} },
  // LTI - L&T Infotech
  { id:"emp015", employeeCode:"LTI0001", name:"Ravi Menon",      email:"ravi.menon@ltimindtree.com",      clientId:"lmt", role:"Tech Lead",               jobCategory:"Engineering", department:"Engineering",       city:"Mumbai",     startDate:"2022-03-01", ratePerHour:850,  employmentStatus:"active",  avatarColor:"#009A44", managerEmail:"mgr@ltimindtree.com", leaveBalance:{annual:21,sick:12,casual:8,usedAnnual:8,usedSick:2,usedCasual:3} },
]

export const employees: Employee[] = _employeeSeeds.map(e => ({
  ...e,
  ...derivePayGradeFields({ id: e.id, role: e.role, jobCategory: e.jobCategory, ratePerHour: e.ratePerHour }),
}))

// ─── Timesheets ───────────────────────────────────────────────────────────────

export const timesheets: Timesheet[] = [
  {
    id:"ts001", employeeId:"emp001", clientId:"acc",
    period:"Mar 31 – Apr 4, 2026", periodStart:"2026-03-31", periodEnd:"2026-04-04",
    submittedAt:"2026-04-07T09:23:00Z", source:"portal", sourceDetail:"PeopleHive", portalId:"fieldglass",
    status:"flagged", totalHours:52, regularHours:40, overtimeHours:12, leaveHours:0,
    totalPayable:29000, validationScore:62, aiConfidence:44,
    dailyEntries:[
      {date:"2026-03-31",dayOfWeek:"Mon",regularHours:8,overtimeHours:2},
      {date:"2026-04-01",dayOfWeek:"Tue",regularHours:8,overtimeHours:2},
      {date:"2026-04-02",dayOfWeek:"Wed",regularHours:8,overtimeHours:3},
      {date:"2026-04-03",dayOfWeek:"Thu",regularHours:8,overtimeHours:3},
      {date:"2026-04-04",dayOfWeek:"Fri",regularHours:8,overtimeHours:2},
    ],
    validationChecks:[
      {id:"v1",category:"hours",rule:"Weekly hours ≤ 40 (regular)",result:"pass",detail:"40 regular hours — within limit",autoChecked:true},
      {id:"v2",category:"overtime",rule:"OT requires manager pre-approval",result:"fail",detail:"12 OT hours — no pre-approval on file",autoChecked:true},
      {id:"v3",category:"overtime",rule:"Max OT per day ≤ 3 hours (TCI policy)",result:"warning",detail:"Wed & Thu at exactly 3 hrs OT — at policy ceiling",autoChecked:true},
      {id:"v4",category:"policy",rule:"3rd consecutive week with OT > 8h",result:"warning",detail:"Pattern detected — manager review required per TCI v3.2",autoChecked:false},
      {id:"v5",category:"employment",rule:"Active employment status",result:"pass",detail:"Contract active until Dec 2026",autoChecked:true},
    ],
    flagReason:"OT pre-approval missing + 3-week consecutive OT pattern",
    flaggedBy:"ai",
  },
  {
    id:"ts002", employeeId:"emp002", clientId:"acc",
    period:"Mar 31 – Apr 4, 2026", periodStart:"2026-03-31", periodEnd:"2026-04-04",
    submittedAt:"2026-04-06T14:11:00Z", source:"email",
    sourceDetail:"candidatemanager@buzzworks.com",
    emailFrom:"priya.menon@techcorp.in",
    emailSubject:"Timesheet - Week of Mar 31 - Priya Menon - TCI",
    status:"reviewing", totalHours:38, regularHours:38, overtimeHours:0, leaveHours:0,
    totalPayable:17100, validationScore:91, aiConfidence:89,
    dailyEntries:[
      {date:"2026-03-31",dayOfWeek:"Mon",regularHours:8,overtimeHours:0},
      {date:"2026-04-01",dayOfWeek:"Tue",regularHours:8,overtimeHours:0},
      {date:"2026-04-02",dayOfWeek:"Wed",regularHours:7,overtimeHours:0},
      {date:"2026-04-03",dayOfWeek:"Thu",regularHours:8,overtimeHours:0},
      {date:"2026-04-04",dayOfWeek:"Fri",regularHours:7,overtimeHours:0},
    ],
    validationChecks:[
      {id:"v1",category:"hours",rule:"Weekly hours ≤ 40 (regular)",result:"pass",detail:"38 hours — within limit",autoChecked:true},
      {id:"v2",category:"policy",rule:"Email submission: manager CC required",result:"warning",detail:"Manager mgr@techcorp.in not CC'd — noted",autoChecked:true},
      {id:"v3",category:"employment",rule:"Active employment status",result:"pass",detail:"Contract active",autoChecked:true},
      {id:"v4",category:"leave",rule:"No leave claimed — balance check skipped",result:"pass",detail:"No leave hours in submission",autoChecked:true},
    ],
  },
  {
    id:"ts003", employeeId:"emp004", clientId:"vir",
    period:"Mar 31 – Apr 4, 2026", periodStart:"2026-03-31", periodEnd:"2026-04-04",
    submittedAt:"2026-04-07T11:05:00Z", source:"portal", sourceDetail:"HRLoop", portalId:"beeline",
    status:"approved", totalHours:45, regularHours:45, overtimeHours:0, leaveHours:0,
    totalPayable:27000, validationScore:100, aiConfidence:97,
    dailyEntries:[
      {date:"2026-03-31",dayOfWeek:"Mon",regularHours:9,overtimeHours:0},
      {date:"2026-04-01",dayOfWeek:"Tue",regularHours:9,overtimeHours:0},
      {date:"2026-04-02",dayOfWeek:"Wed",regularHours:9,overtimeHours:0},
      {date:"2026-04-03",dayOfWeek:"Thu",regularHours:9,overtimeHours:0},
      {date:"2026-04-04",dayOfWeek:"Fri",regularHours:9,overtimeHours:0},
    ],
    validationChecks:[
      {id:"v1",category:"hours",rule:"Weekly hours ≤ 45 (GSS policy)",result:"pass",detail:"45 hours — at limit, permitted",autoChecked:true},
      {id:"v2",category:"overtime",rule:"No OT claimed",result:"pass",detail:"No overtime entries",autoChecked:true},
      {id:"v3",category:"employment",rule:"Active employment status",result:"pass",detail:"Contract active",autoChecked:true},
      {id:"v4",category:"policy",rule:"Manager approval on portal",result:"pass",detail:"Approved by lead@globalstaff.com via portal",autoChecked:true},
    ],
    approvedBy:"Siddharth Kirtikar (Ops)", approvedAt:"2026-04-08T10:00:00Z",
  },
  {
    id:"ts004", employeeId:"emp006", clientId:"pwc",
    period:"Mar 31 – Apr 4, 2026", periodStart:"2026-03-31", periodEnd:"2026-04-04",
    submittedAt:"2026-04-05T08:30:00Z", source:"email",
    sourceDetail:"candidatemanager@buzzworks.com",
    emailFrom:"neha.gupta@financehub.co",
    emailSubject:"Fwd: Timesheet April Week 1 - Neha",
    status:"pending", totalHours:42, regularHours:40, overtimeHours:2, leaveHours:0,
    totalPayable:22000, validationScore:35, aiConfidence:21,
    dailyEntries:[
      {date:"2026-03-31",dayOfWeek:"Mon",regularHours:8,overtimeHours:0},
      {date:"2026-04-01",dayOfWeek:"Tue",regularHours:8,overtimeHours:1},
      {date:"2026-04-02",dayOfWeek:"Wed",regularHours:8,overtimeHours:0},
      {date:"2026-04-03",dayOfWeek:"Thu",regularHours:8,overtimeHours:1},
      {date:"2026-04-04",dayOfWeek:"Fri",regularHours:8,overtimeHours:0},
    ],
    validationChecks:[
      {id:"v1",category:"hours",rule:"Weekly hours ≤ 40 (regular)",result:"pass",detail:"40 regular hours — within limit",autoChecked:true},
      {id:"v2",category:"overtime",rule:"FHL policy: No overtime permitted",result:"fail",detail:"2 OT hours claimed — FinanceHub prohibits OT under all circumstances",autoChecked:true},
      {id:"v3",category:"employment",rule:"Active employment status",result:"pass",detail:"Contract active",autoChecked:true},
      {id:"v4",category:"policy",rule:"Email format: original submission required",result:"fail",detail:"Email is a forward — original not attached",autoChecked:true},
    ],
    flagReason:"OT not permitted (FHL policy v4.1) + email format non-compliant",
    flaggedBy:"system",
  },
  {
    id:"ts005", employeeId:"emp008", clientId:"aoc",
    period:"Mar 31 – Apr 6, 2026", periodStart:"2026-03-31", periodEnd:"2026-04-06",
    submittedAt:"2026-04-08T07:15:00Z", source:"portal", sourceDetail:"TalentWeave", portalId:"fieldglass",
    status:"pending", totalHours:60, regularHours:48, overtimeHours:12, leaveHours:0,
    totalPayable:33600, validationScore:78, aiConfidence:73,
    dailyEntries:[
      {date:"2026-03-31",dayOfWeek:"Mon",regularHours:12,overtimeHours:0},
      {date:"2026-04-01",dayOfWeek:"Tue",regularHours:12,overtimeHours:0},
      {date:"2026-04-02",dayOfWeek:"Wed",regularHours:0,overtimeHours:0,leaveType:"Off Day",leaveHours:0},
      {date:"2026-04-03",dayOfWeek:"Thu",regularHours:12,overtimeHours:4},
      {date:"2026-04-04",dayOfWeek:"Fri",regularHours:12,overtimeHours:4},
      {date:"2026-04-05",dayOfWeek:"Sat",regularHours:0,overtimeHours:4},
      {date:"2026-04-06",dayOfWeek:"Sun",regularHours:0,overtimeHours:0},
    ],
    validationChecks:[
      {id:"v1",category:"hours",rule:"Weekly hours ≤ 48 regular (healthcare)",result:"pass",detail:"48 regular hours — at limit",autoChecked:true},
      {id:"v2",category:"overtime",rule:"OT rate 2x for MSH employees",result:"pass",detail:"12 OT hours at ₹800/hr (2x)",autoChecked:true},
      {id:"v3",category:"policy",rule:"Minimum 1 rest day per 7-day period",result:"warning",detail:"1 rest day (Wed) — at minimum",autoChecked:true},
      {id:"v4",category:"employment",rule:"Shift schedule matches timesheet",result:"pending",detail:"Awaiting shift roster from PeopleStrong portal",autoChecked:false},
    ],
  },
  {
    id:"ts006", employeeId:"emp003", clientId:"acc",
    period:"Mar 31 – Apr 4, 2026", periodStart:"2026-03-31", periodEnd:"2026-04-04",
    submittedAt:"2026-04-09T10:30:00Z", source:"email",
    sourceDetail:"candidatemanager@buzzworks.com",
    emailFrom:"deepa.rao@techcorp.in",
    emailSubject:"Timesheet Apr W1 - Deepa Rao, PM - TCI - Manager Approved",
    status:"pending", totalHours:40, regularHours:36, overtimeHours:0, leaveHours:4,
    totalPayable:25200, validationScore:88, aiConfidence:85,
    dailyEntries:[
      {date:"2026-03-31",dayOfWeek:"Mon",regularHours:8,overtimeHours:0},
      {date:"2026-04-01",dayOfWeek:"Tue",regularHours:8,overtimeHours:0},
      {date:"2026-04-02",dayOfWeek:"Wed",regularHours:8,overtimeHours:0},
      {date:"2026-04-03",dayOfWeek:"Thu",regularHours:8,overtimeHours:0},
      {date:"2026-04-04",dayOfWeek:"Fri",regularHours:4,overtimeHours:0,leaveType:"Casual",leaveHours:4},
    ],
    validationChecks:[
      {id:"v1",category:"hours",rule:"Weekly hours ≤ 40 (regular)",result:"pass",detail:"36 work + 4 casual leave = 40 hours",autoChecked:true},
      {id:"v2",category:"leave",rule:"Casual leave balance sufficient",result:"pass",detail:"5 casual days remaining — balance ok",autoChecked:true},
      {id:"v3",category:"policy",rule:"Leave pre-approved by manager",result:"pass",detail:"Email subject confirms manager approval",autoChecked:true},
      {id:"v4",category:"employment",rule:"Active employment status",result:"pass",detail:"Contract active until Jan 2027",autoChecked:true},
    ],
  },
  {
    id:"ts007", employeeId:"emp009", clientId:"hex",
    period:"Mar 31 – Apr 4, 2026", periodStart:"2026-03-31", periodEnd:"2026-04-04",
    submittedAt:"2026-04-07T12:00:00Z", source:"portal", sourceDetail:"Veltrix HCM", portalId:"fieldglass",
    status:"approved", totalHours:45, regularHours:45, overtimeHours:0, leaveHours:0,
    totalPayable:42750, validationScore:100, aiConfidence:99,
    dailyEntries:[
      {date:"2026-03-31",dayOfWeek:"Mon",regularHours:9,overtimeHours:0},
      {date:"2026-04-01",dayOfWeek:"Tue",regularHours:9,overtimeHours:0},
      {date:"2026-04-02",dayOfWeek:"Wed",regularHours:9,overtimeHours:0},
      {date:"2026-04-03",dayOfWeek:"Thu",regularHours:9,overtimeHours:0},
      {date:"2026-04-04",dayOfWeek:"Fri",regularHours:9,overtimeHours:0},
    ],
    validationChecks:[
      {id:"v1",category:"hours",rule:"Weekly hours ≤ 45",result:"pass",detail:"45 hours — at limit, permitted",autoChecked:true},
      {id:"v2",category:"employment",rule:"Active employment status",result:"pass",detail:"Active",autoChecked:true},
    ],
    approvedBy:"Siddharth Kirtikar (Ops)", approvedAt:"2026-04-09T09:00:00Z",
  },
  {
    id:"ts008", employeeId:"emp013", clientId:"bct",
    period:"Mar 31 – Apr 4, 2026", periodStart:"2026-03-31", periodEnd:"2026-04-04",
    submittedAt:"2026-04-09T09:00:00Z", source:"email",
    sourceDetail:"candidatemanager@buzzworks.com",
    emailFrom:"mohan.tripathi@nucleussoftware.com",
    emailSubject:"Timesheet Apr W1 - Mohan Tripathi - NCS",
    status:"reviewing", totalHours:40, regularHours:40, overtimeHours:0, leaveHours:0,
    totalPayable:28000, validationScore:95, aiConfidence:92,
    dailyEntries:[
      {date:"2026-03-31",dayOfWeek:"Mon",regularHours:8,overtimeHours:0},
      {date:"2026-04-01",dayOfWeek:"Tue",regularHours:8,overtimeHours:0},
      {date:"2026-04-02",dayOfWeek:"Wed",regularHours:8,overtimeHours:0},
      {date:"2026-04-03",dayOfWeek:"Thu",regularHours:8,overtimeHours:0},
      {date:"2026-04-04",dayOfWeek:"Fri",regularHours:8,overtimeHours:0},
    ],
    validationChecks:[
      {id:"v1",category:"hours",rule:"Weekly hours ≤ 40 (regular)",result:"pass",detail:"40 hours — within limit",autoChecked:true},
      {id:"v2",category:"policy",rule:"Email submission: no portal — accepted",result:"pass",detail:"NCS is email-only client",autoChecked:true},
      {id:"v3",category:"employment",rule:"Active employment status",result:"pass",detail:"Active",autoChecked:true},
    ],
  },
  // ─ JARVIS auto-approved ────────────────────────────────────────────────
  {
    id:"ts009", employeeId:"emp010", clientId:"hex",
    period:"Mar 31 – Apr 4, 2026", periodStart:"2026-03-31", periodEnd:"2026-04-04",
    submittedAt:"2026-04-07T08:10:00Z", source:"portal", sourceDetail:"Veltrix HCM", portalId:"fieldglass",
    status:"approved", totalHours:40, regularHours:40, overtimeHours:0, leaveHours:0,
    totalPayable:32000, validationScore:100, aiConfidence:98,
    approvedBy:"JARVIS", approvedAt:"2026-04-07T08:11:42Z",
    notes:"Auto-approved by JARVIS (v2.1) — 5/5 checks passed, confidence 98%, no anomalies detected. Consistent with prior 6 weeks.",
    dailyEntries:[
      {date:"2026-03-31",dayOfWeek:"Mon",regularHours:8,overtimeHours:0},
      {date:"2026-04-01",dayOfWeek:"Tue",regularHours:8,overtimeHours:0},
      {date:"2026-04-02",dayOfWeek:"Wed",regularHours:8,overtimeHours:0},
      {date:"2026-04-03",dayOfWeek:"Thu",regularHours:8,overtimeHours:0},
      {date:"2026-04-04",dayOfWeek:"Fri",regularHours:8,overtimeHours:0},
    ],
    validationChecks:[
      {id:"v1",category:"hours",rule:"Weekly hours ≤ 45 (HEX policy)",result:"pass",detail:"40h regular — within limit",autoChecked:true},
      {id:"v2",category:"overtime",rule:"No unapproved overtime",result:"pass",detail:"0h OT logged",autoChecked:true},
      {id:"v3",category:"employment",rule:"Active employment status",result:"pass",detail:"Active — contract valid",autoChecked:true},
      {id:"v4",category:"leave",rule:"Leave balance sufficient",result:"pass",detail:"No leave taken this period",autoChecked:true},
      {id:"v5",category:"policy",rule:"Submission within 3-day SLA",result:"pass",detail:"Submitted Mon after period end",autoChecked:true},
    ],
  },
  {
    id:"ts010", employeeId:"emp012", clientId:"cts",
    period:"Mar 31 – Apr 4, 2026", periodStart:"2026-03-31", periodEnd:"2026-04-04",
    submittedAt:"2026-04-07T09:00:00Z", source:"portal", sourceDetail:"OrbitHCM", portalId:"beeline",
    status:"approved", totalHours:40, regularHours:40, overtimeHours:0, leaveHours:0,
    totalPayable:23200, validationScore:100, aiConfidence:99,
    approvedBy:"JARVIS", approvedAt:"2026-04-07T09:01:18Z",
    notes:"Auto-approved by JARVIS (v2.1) — perfect match across all 5 policy checks. Employee has 100% on-time submission record (18 consecutive weeks).",
    dailyEntries:[
      {date:"2026-03-31",dayOfWeek:"Mon",regularHours:8,overtimeHours:0},
      {date:"2026-04-01",dayOfWeek:"Tue",regularHours:8,overtimeHours:0},
      {date:"2026-04-02",dayOfWeek:"Wed",regularHours:8,overtimeHours:0},
      {date:"2026-04-03",dayOfWeek:"Thu",regularHours:8,overtimeHours:0},
      {date:"2026-04-04",dayOfWeek:"Fri",regularHours:8,overtimeHours:0},
    ],
    validationChecks:[
      {id:"v1",category:"hours",rule:"Weekly hours ≤ 40 (IBP policy)",result:"pass",detail:"40h — exactly at standard",autoChecked:true},
      {id:"v2",category:"overtime",rule:"No unapproved overtime",result:"pass",detail:"0h OT logged",autoChecked:true},
      {id:"v3",category:"employment",rule:"Active employment status",result:"pass",detail:"Active — contract valid until Dec 2026",autoChecked:true},
      {id:"v4",category:"leave",rule:"Leave balance sufficient",result:"pass",detail:"No leave applied",autoChecked:true},
      {id:"v5",category:"policy",rule:"Submission within 24-hr SLA (IBP)",result:"pass",detail:"Submitted within SLA window",autoChecked:true},
    ],
  },
  {
    id:"ts011", employeeId:"emp003", clientId:"acc",
    period:"Mar 24 – Mar 28, 2026", periodStart:"2026-03-24", periodEnd:"2026-03-28",
    submittedAt:"2026-03-31T08:45:00Z", source:"portal", sourceDetail:"PeopleHive", portalId:"fieldglass",
    status:"approved", totalHours:40, regularHours:40, overtimeHours:0, leaveHours:0,
    totalPayable:28000, validationScore:100, aiConfidence:97,
    approvedBy:"JARVIS", approvedAt:"2026-03-31T08:46:55Z",
    notes:"Auto-approved by JARVIS (v2.1) — clean submission, all checks green. PMO-category employees historically exhibit high compliance; pattern score 97%.",
    dailyEntries:[
      {date:"2026-03-24",dayOfWeek:"Mon",regularHours:8,overtimeHours:0},
      {date:"2026-03-25",dayOfWeek:"Tue",regularHours:8,overtimeHours:0},
      {date:"2026-03-26",dayOfWeek:"Wed",regularHours:8,overtimeHours:0},
      {date:"2026-03-27",dayOfWeek:"Thu",regularHours:8,overtimeHours:0},
      {date:"2026-03-28",dayOfWeek:"Fri",regularHours:8,overtimeHours:0},
    ],
    validationChecks:[
      {id:"v1",category:"hours",rule:"Weekly hours ≤ 40 (TCI policy)",result:"pass",detail:"40h regular — within cap",autoChecked:true},
      {id:"v2",category:"overtime",rule:"OT pre-approval mandatory",result:"pass",detail:"No OT claimed",autoChecked:true},
      {id:"v3",category:"employment",rule:"Active employment status",result:"pass",detail:"Active contract",autoChecked:true},
      {id:"v4",category:"leave",rule:"No leave balance deficit",result:"pass",detail:"Leave balance healthy",autoChecked:true},
      {id:"v5",category:"policy",rule:"Submission within 3-day SLA",result:"pass",detail:"On-time submission",autoChecked:true},
    ],
  },
  {
    id:"ts012", employeeId:"emp001", clientId:"acc",
    period:"Mar 17 – Mar 21, 2026", periodStart:"2026-03-17", periodEnd:"2026-03-21",
    submittedAt:"2026-03-24T07:58:00Z", source:"portal", sourceDetail:"PeopleHive", portalId:"fieldglass",
    status:"approved", totalHours:40, regularHours:40, overtimeHours:0, leaveHours:0,
    totalPayable:20000, validationScore:100, aiConfidence:99,
    approvedBy:"JARVIS", approvedAt:"2026-03-24T07:59:12Z",
    notes:"Auto-approved by JARVIS (v2.1) — 6/6 checks passed, confidence 99%. Rahul Sharma has 22 consecutive clean submissions; behavioural pattern matches historical baseline within 0.3% variance.",
    dailyEntries:[
      {date:"2026-03-17",dayOfWeek:"Mon",regularHours:8,overtimeHours:0},
      {date:"2026-03-18",dayOfWeek:"Tue",regularHours:8,overtimeHours:0},
      {date:"2026-03-19",dayOfWeek:"Wed",regularHours:8,overtimeHours:0},
      {date:"2026-03-20",dayOfWeek:"Thu",regularHours:8,overtimeHours:0},
      {date:"2026-03-21",dayOfWeek:"Fri",regularHours:8,overtimeHours:0},
    ],
    validationChecks:[
      {id:"v1",category:"hours",rule:"Weekly hours ≤ 40 (TCI policy)",result:"pass",detail:"40h — exactly at standard weekly cap",autoChecked:true},
      {id:"v2",category:"overtime",rule:"OT pre-approval mandatory",result:"pass",detail:"No OT claimed this period",autoChecked:true},
      {id:"v3",category:"employment",rule:"Active employment status",result:"pass",detail:"Contract active until Dec 2026",autoChecked:true},
      {id:"v4",category:"leave",rule:"No leave balance deficit",result:"pass",detail:"13 annual leave days remaining",autoChecked:true},
      {id:"v5",category:"policy",rule:"Submission within 3-day SLA",result:"pass",detail:"Submitted 3 days after period end — within SLA",autoChecked:true},
      {id:"v6",category:"policy",rule:"No anomalous patterns detected",result:"pass",detail:"Daily hour distribution matches prior 3 weeks",autoChecked:true},
    ],
  },
  {
    id:"ts013", employeeId:"emp005", clientId:"vir",
    period:"Mar 31 – Apr 4, 2026", periodStart:"2026-03-31", periodEnd:"2026-04-04",
    submittedAt:"2026-04-07T08:33:00Z", source:"portal", sourceDetail:"HRLoop", portalId:"beeline",
    status:"approved", totalHours:45, regularHours:40, overtimeHours:5, leaveHours:0,
    totalPayable:28800, validationScore:98, aiConfidence:97,
    approvedBy:"JARVIS", approvedAt:"2026-04-07T08:34:51Z",
    notes:"Auto-approved by JARVIS (v2.1) — OT hours pre-approved via HRLoop on Mar 29; all policy conditions met. 5h OT at 1.25× rate correctly calculated. AI confidence 97%.",
    dailyEntries:[
      {date:"2026-03-31",dayOfWeek:"Mon",regularHours:8,overtimeHours:0},
      {date:"2026-04-01",dayOfWeek:"Tue",regularHours:8,overtimeHours:2},
      {date:"2026-04-02",dayOfWeek:"Wed",regularHours:8,overtimeHours:0},
      {date:"2026-04-03",dayOfWeek:"Thu",regularHours:8,overtimeHours:3},
      {date:"2026-04-04",dayOfWeek:"Fri",regularHours:8,overtimeHours:0},
    ],
    validationChecks:[
      {id:"v1",category:"hours",rule:"Weekly hours ≤ 45 (GSS policy incl. OT)",result:"pass",detail:"45h total — within policy cap",autoChecked:true},
      {id:"v2",category:"overtime",rule:"OT pre-approved",result:"pass",detail:"5h OT approved via HRLoop ticket #OT-2604 on 2026-03-29",autoChecked:true},
      {id:"v3",category:"employment",rule:"Active employment status",result:"pass",detail:"Active — joined Apr 2024",autoChecked:true},
      {id:"v4",category:"leave",rule:"No leave balance deficit",result:"pass",detail:"17 annual leave days remaining",autoChecked:true},
      {id:"v5",category:"policy",rule:"OT rate 1.25× for GSS",result:"pass",detail:"5h × ₹600 × 1.25 = ₹3,750 OT correctly calculated",autoChecked:true},
    ],
  },
  {
    id:"ts014", employeeId:"emp014", clientId:"cap",
    period:"Mar 31 – Apr 4, 2026", periodStart:"2026-03-31", periodEnd:"2026-04-04",
    submittedAt:"2026-04-07T06:15:00Z", source:"portal", sourceDetail:"CloudSpire", portalId:"fieldglass",
    status:"approved", totalHours:40, regularHours:40, overtimeHours:0, leaveHours:0,
    totalPayable:44000, validationScore:100, aiConfidence:100,
    approvedBy:"JARVIS", approvedAt:"2026-04-07T06:15:38Z",
    notes:"Auto-approved by JARVIS (v2.1) — 38-second processing time (new record for this employee). Divya Krishnan: 5-year tenure, zero-anomaly history. Confidence floor raised to 100% via trust tier T3.",
    dailyEntries:[
      {date:"2026-03-31",dayOfWeek:"Mon",regularHours:8,overtimeHours:0},
      {date:"2026-04-01",dayOfWeek:"Tue",regularHours:8,overtimeHours:0},
      {date:"2026-04-02",dayOfWeek:"Wed",regularHours:9,overtimeHours:0},
      {date:"2026-04-03",dayOfWeek:"Thu",regularHours:7,overtimeHours:0},
      {date:"2026-04-04",dayOfWeek:"Fri",regularHours:8,overtimeHours:0},
    ],
    validationChecks:[
      {id:"v1",category:"hours",rule:"Weekly hours ≤ 45 (CGI policy)",result:"pass",detail:"40h — well within cap",autoChecked:true},
      {id:"v2",category:"overtime",rule:"No unapproved overtime",result:"pass",detail:"No OT this period",autoChecked:true},
      {id:"v3",category:"employment",rule:"Active employment status",result:"pass",detail:"Senior tenure, active since Nov 2020",autoChecked:true},
      {id:"v4",category:"leave",rule:"Leave balance sufficient",result:"pass",detail:"9 annual leave days remaining",autoChecked:true},
      {id:"v5",category:"policy",rule:"Submission within 48-hr SLA (CGI)",result:"pass",detail:"Submitted morning after period end — well within SLA",autoChecked:true},
      {id:"v6",category:"hours",rule:"Daily cap ≤ 9h (CGI policy)",result:"pass",detail:"Max daily 9h — within limit",autoChecked:true},
    ],
  },
  {
    id:"ts015", employeeId:"emp015", clientId:"lmt",
    period:"Mar 31 – Apr 4, 2026", periodStart:"2026-03-31", periodEnd:"2026-04-04",
    submittedAt:"2026-04-07T09:20:00Z", source:"email", sourceDetail:"candidatemanager@buzzworks.com",
    status:"approved", totalHours:45, regularHours:40, overtimeHours:5, leaveHours:0,
    totalPayable:48875, validationScore:97, aiConfidence:95,
    approvedBy:"JARVIS", approvedAt:"2026-04-07T09:22:14Z",
    notes:"Auto-approved by JARVIS (v2.1) — Email parsed via NLP pipeline v3.4 with 95% field-extraction confidence. OT pre-auth found in email thread #LTI-OT-0407. All 5 policy checks cleared. Minor note: PDF attachment quality low but all figures extractable.",
    dailyEntries:[
      {date:"2026-03-31",dayOfWeek:"Mon",regularHours:8,overtimeHours:0},
      {date:"2026-04-01",dayOfWeek:"Tue",regularHours:8,overtimeHours:0},
      {date:"2026-04-02",dayOfWeek:"Wed",regularHours:9,overtimeHours:2},
      {date:"2026-04-03",dayOfWeek:"Thu",regularHours:8,overtimeHours:3},
      {date:"2026-04-04",dayOfWeek:"Fri",regularHours:7,overtimeHours:0},
    ],
    validationChecks:[
      {id:"v1",category:"hours",rule:"Weekly hours ≤ 45 (LTI policy)",result:"pass",detail:"45h total (40h + 5h OT) — at limit",autoChecked:true},
      {id:"v2",category:"overtime",rule:"OT pre-approved (LTI)",result:"pass",detail:"OT approved in email thread #LTI-OT-0407 dated Mar 29",autoChecked:true},
      {id:"v3",category:"employment",rule:"Active employment status",result:"pass",detail:"Active since Mar 2022",autoChecked:true},
      {id:"v4",category:"leave",rule:"No leave deficit",result:"pass",detail:"13 annual leave days remaining",autoChecked:true},
      {id:"v5",category:"policy",rule:"OT rate 1.5× for LTI",result:"pass",detail:"5h × ₹850 × 1.5 = ₹6,375 OT — correctly calculated",autoChecked:true},
    ],
  },
]

// ─── Policy Rules (per client sample) ────────────────────────────────────────

const _policyRuleSeeds: PolicyRule[] = [

  // ── GLOBAL / SYSTEM-WIDE POLICIES (applied across all clients) ──────────────

  // CEE-001 · Contract Expiry Enforcement
  // IF current_date > contract_end_date → Auto-reject timesheet, Salary HOLD, Notify HR + Manager
  { id:"pol-cee-001", clientId:"acc", category:"compliance", name:"Contract Expiry Enforcement",
    description:"If the current date exceeds the employee's contract end date, the timesheet is auto-rejected, salary is placed on hold (code EXT-002), and HR + manager are notified immediately. No manual override without a contract renewal confirmation.",
    triggerCondition:"current_date > contract_end_date",
    actionOnTrigger:"Auto-reject timesheet · Salary HOLD (EXT-002) · Notify HR + Manager",
    severity:"violation", enabled:true, createdAt:"2023-01-01", updatedAt:"2025-06-01", createdBy:"system", aiGenerated:false, appliedCount:8, triggerCount:8 },

  { id:"pol-cee-002", clientId:"pwc", category:"compliance", name:"Contract Expiry Enforcement",
    description:"Timesheets submitted after contract_end_date are auto-rejected. Salary hold placed (EXT-002). FHL finance team notified within 1 hour.",
    triggerCondition:"current_date > contract_end_date",
    actionOnTrigger:"Auto-reject · Salary HOLD (EXT-002) · Alert finance@financehub.co",
    severity:"violation", enabled:true, createdAt:"2022-10-01", updatedAt:"2025-06-01", createdBy:"system", aiGenerated:false, appliedCount:3, triggerCount:3 },

  { id:"pol-cee-003", clientId:"hex", category:"compliance", name:"Contract Expiry Enforcement",
    description:"Hexaware contract expiry enforcement. Auto-reject + hold for any submission post contract_end_date. Hexaware AM (Priya Shah) notified.",
    triggerCondition:"current_date > contract_end_date",
    actionOnTrigger:"Auto-reject · Salary HOLD (EXT-002) · Notify AM Priya Shah",
    severity:"violation", enabled:true, createdAt:"2022-04-01", updatedAt:"2025-06-01", createdBy:"system", aiGenerated:false, appliedCount:5, triggerCount:5 },

  // PRP-002 · Payment Readiness Policy
  // IF bank_account_no OR ifsc_code missing → Salary HOLD, Notify employee
  { id:"pol-prp-001", clientId:"acc", category:"payroll", name:"Payment Readiness — Bank Details",
    description:"Payroll cannot be released if bank_account_no or ifsc_code is missing or fails IFSC checksum validation. Salary hold placed (code PRP-002). Employee notified via email to update details in portal.",
    triggerCondition:"bank_account_no IS NULL OR ifsc_code IS NULL OR ifsc_validate(ifsc_code) = false",
    actionOnTrigger:"Salary HOLD (PRP-002) · Email employee to update bank details · Block payroll batch",
    severity:"violation", enabled:true, createdAt:"2023-01-01", updatedAt:"2024-09-01", createdBy:"system", aiGenerated:false, appliedCount:24, triggerCount:3 },

  { id:"pol-prp-002", clientId:"vir", category:"payroll", name:"Payment Readiness — Bank Details",
    description:"GSS employees must have verified bank account and IFSC on file before the payroll cut-off date. Missing or unverified details trigger hold.",
    triggerCondition:"bank_account_no IS NULL OR ifsc_code IS NULL",
    actionOnTrigger:"Salary HOLD (PRP-002) · Notify employee + GSS HR lead",
    severity:"violation", enabled:true, createdAt:"2023-04-01", updatedAt:"2024-09-01", createdBy:"system", aiGenerated:false, appliedCount:12, triggerCount:2 },

  // WOV-003 · Work Order Validation Policy
  // IF work_order_no is null → Mark as non-billable, Salary HOLD
  { id:"pol-wov-001", clientId:"lmt", category:"payroll", name:"Work Order Validation",
    description:"Every billable employee must have an active, non-expired Work Order number on file. If work_order_no is null or expired, the employee is flagged as non-billable and salary is held pending WO confirmation from the client's procurement team.",
    triggerCondition:"work_order_no IS NULL OR work_order_status = 'expired'",
    actionOnTrigger:"Flag as non-billable · Salary HOLD (WOV-003) · Notify AM + LTI procurement",
    severity:"violation", enabled:true, createdAt:"2021-10-01", updatedAt:"2025-01-10", createdBy:"system", aiGenerated:false, appliedCount:18, triggerCount:4 },

  { id:"pol-wov-002", clientId:"hex", category:"payroll", name:"Work Order Validation",
    description:"Hexaware requires a valid WO on every billable resource. Agent NEXUS validates WO against Veltrix HCM work order registry at each payroll pre-check.",
    triggerCondition:"work_order_no IS NULL OR work_order_status NOT IN ('active','extended')",
    actionOnTrigger:"Non-billable flag · Salary HOLD (WOV-003) · Notify Hexaware PM",
    severity:"violation", enabled:true, createdAt:"2022-04-01", updatedAt:"2025-01-10", createdBy:"system", aiGenerated:false, appliedCount:32, triggerCount:6 },

  // PEP-004 · Payroll Eligibility Policy (CORE)
  // Eligible ONLY IF: is_active AND contract active AND work_order exists AND no violations AND manager approved
  { id:"pol-pep-001", clientId:"acc", category:"payroll", name:"Payroll Eligibility Gate (Core)",
    description:"Composite gate: employee must satisfy ALL five conditions before entering payroll queue — (1) is_active = true, (2) contract_end_date ≥ today, (3) work_order is valid and non-expired, (4) no unresolved policy violations on current timesheet, (5) manager has approved or JARVIS has auto-approved.",
    triggerCondition:"is_active = false OR contract_expired OR work_order_invalid OR open_violations > 0 OR !manager_approved",
    actionOnTrigger:"Block payroll entry · Surface failed gate(s) to ops · Salary HOLD until all conditions met",
    severity:"violation", enabled:true, createdAt:"2023-01-01", updatedAt:"2025-03-01", createdBy:"system", aiGenerated:false, appliedCount:156, triggerCount:12 },

  { id:"pol-pep-002", clientId:"cts", category:"payroll", name:"Payroll Eligibility Gate (Core)",
    description:"IBP composite payroll gate: is_active + contract + work_order + zero violations + manager/agent approval. IBP requires 24h SLA on manager approval; auto-escalation if overdue.",
    triggerCondition:"is_active = false OR contract_expired OR work_order_invalid OR open_violations > 0 OR !manager_approved",
    actionOnTrigger:"Block payroll · List failed conditions · Auto-escalate if manager overdue > 24h",
    severity:"violation", enabled:true, createdAt:"2021-01-01", updatedAt:"2025-03-01", createdBy:"system", aiGenerated:false, appliedCount:420, triggerCount:9 },

  // ICP-005 · Identity Consistency Policy
  // IF mismatch between employee_id and client_employee_id → Flag discrepancy
  { id:"pol-icp-001", clientId:"hex", category:"compliance", name:"Identity Consistency Check",
    description:"The Buzzworks employee_id must match the client_employee_id in Veltrix HCM for every submission. A mismatch indicates either a data entry error or a potential identity fraud attempt. Flag and hold pending manual verification.",
    triggerCondition:"employee_id != client_employee_id (cross-system lookup)",
    actionOnTrigger:"Flag discrepancy · Salary HOLD (ICP-005) · Notify ops + account manager for manual ID verification",
    severity:"violation", enabled:true, createdAt:"2022-04-01", updatedAt:"2024-11-01", createdBy:"system", aiGenerated:false, appliedCount:47, triggerCount:2 },

  { id:"pol-icp-002", clientId:"cts", category:"compliance", name:"Identity Consistency Check",
    description:"OrbitHCM cross-system identity validation. Buzzworks employee_id vs IBP client_employee_id mismatch triggers immediate freeze on the record.",
    triggerCondition:"employee_id != client_employee_id",
    actionOnTrigger:"Freeze record · Flag ICP-005 · Notify IBP HR + Buzzworks ops within 1h",
    severity:"violation", enabled:true, createdAt:"2021-01-01", updatedAt:"2024-11-01", createdBy:"system", aiGenerated:false, appliedCount:68, triggerCount:1 },

  // BFP-006 · Banking Fraud Prevention
  // IF same bank_account_no used by multiple employees → Flag for review
  { id:"pol-bfp-001", clientId:"vir", category:"compliance", name:"Banking Fraud Prevention",
    description:"Agent NEXUS runs a daily cross-employee duplicate account scan. If the same bank_account_no is found against two or more employees — regardless of client — the record is frozen, compliance is notified immediately, and both employees are held pending verification. This is an urgent, out-of-cycle escalation.",
    triggerCondition:"bank_account_no IN (SELECT bank_account_no FROM employees GROUP BY bank_account_no HAVING COUNT(*) > 1)",
    actionOnTrigger:"Freeze both records · Urgent flag BFP-006 · Notify compliance + ops + account managers immediately",
    severity:"violation", enabled:true, createdAt:"2023-04-01", updatedAt:"2025-02-01", createdBy:"system", aiGenerated:false, appliedCount:340, triggerCount:1 },

  { id:"pol-bfp-002", clientId:"hex", category:"compliance", name:"Banking Fraud Prevention",
    description:"Hexaware banking fraud gate. Same account used by multiple Hexaware or cross-client employees flags an immediate urgent review.",
    triggerCondition:"bank_account_no shared across multiple employee records (global scan)",
    actionOnTrigger:"Freeze salary · Urgent alert BFP-006 · Compliance + Hexaware AM notified",
    severity:"violation", enabled:true, createdAt:"2022-04-01", updatedAt:"2025-02-01", createdBy:"system", aiGenerated:false, appliedCount:420, triggerCount:0 },

  // DCM-007 · Data Completeness Policy
  // IF missing PAN, Bank details, or Work Order → Block payroll
  { id:"pol-dcm-001", clientId:"acc", category:"payroll", name:"Data Completeness Gate",
    description:"Before any payroll is released, Agent NEXUS verifies that all three critical data fields are present and valid: (1) PAN number (format validation), (2) bank_account_no + IFSC code, (3) work_order_no (active). Missing any one field blocks payroll entirely for that employee.",
    triggerCondition:"pan IS NULL OR pan_format_invalid OR bank_account_no IS NULL OR ifsc_code IS NULL OR work_order_no IS NULL",
    actionOnTrigger:"Block payroll (DCM-007) · Itemised gap report to HR · Employee email notification",
    severity:"violation", enabled:true, createdAt:"2023-01-01", updatedAt:"2025-01-01", createdBy:"system", aiGenerated:false, appliedCount:156, triggerCount:5 },

  { id:"pol-dcm-002", clientId:"cts", category:"payroll", name:"Data Completeness Gate",
    description:"IBP data completeness enforcement. PAN + bank details + work order must all be valid. IBP additionally requires Aadhar-linked bank account verification.",
    triggerCondition:"pan IS NULL OR bank_account_no IS NULL OR ifsc_code IS NULL OR work_order_no IS NULL OR aadhar_link_verified = false",
    actionOnTrigger:"Block payroll (DCM-007) · Notify IBP HR + Buzzworks ops · Hold until all fields verified",
    severity:"violation", enabled:true, createdAt:"2021-01-01", updatedAt:"2025-01-01", createdBy:"system", aiGenerated:false, appliedCount:420, triggerCount:7 },

  // ── CLIENT-SPECIFIC OPERATIONAL POLICIES ────────────────────────────────────

  // TCI — operational rules
  { id:"pol001", clientId:"acc", category:"hours",      name:"Standard Weekly Hours Cap",
    description:"No employee may log more than 40 regular hours in a single work week.",
    triggerCondition:"regularHours > 40",
    actionOnTrigger:"Flag timesheet for ops review",
    severity:"warning", enabled:true, createdAt:"2023-01-01", updatedAt:"2024-06-15", createdBy:"system", aiGenerated:false, appliedCount:156, triggerCount:8 },

  { id:"pol002", clientId:"acc", category:"overtime",   name:"OT Pre-Approval Mandatory",
    description:"Any overtime hours must have explicit pre-approval from the reporting manager before the work period begins.",
    triggerCondition:"overtimeHours > 0 && !managerApproval",
    actionOnTrigger:"Reject — request manager approval",
    severity:"violation", enabled:true, createdAt:"2023-01-01", updatedAt:"2025-01-10", createdBy:"system", aiGenerated:false, appliedCount:42, triggerCount:15 },

  { id:"pol003", clientId:"acc", category:"overtime",   name:"Daily OT Cap (3 Hours)",
    description:"Overtime on any single day cannot exceed 3 hours as per TCI policy v3.2.",
    triggerCondition:"dailyOT > 3",
    actionOnTrigger:"Flag for review — OT ceiling hit",
    severity:"warning", enabled:true, createdAt:"2023-06-01", updatedAt:"2024-06-15", createdBy:"ops", aiGenerated:false, appliedCount:28, triggerCount:6 },

  { id:"pol004", clientId:"acc", category:"compliance", name:"Consecutive OT Pattern Alert",
    description:"After 2 consecutive weeks of more than 8 overtime hours, manager review is mandatory.",
    triggerCondition:"consecutiveOTWeeks >= 2 && weeklyOT > 8",
    actionOnTrigger:"Escalate to manager + ops team",
    severity:"warning", enabled:true, createdAt:"2024-01-15", updatedAt:"2024-01-15", createdBy:"ai", aiGenerated:true, appliedCount:12, triggerCount:4 },

  { id:"pol005", clientId:"acc", category:"leave",      name:"Sandwich Leave Detection",
    description:"Leave taken immediately before or after a public holiday without manager approval is flagged as sandwich leave.",
    triggerCondition:"leaveAdjacentToHoliday && !managerApproval",
    actionOnTrigger:"Flag and request manager confirmation",
    severity:"warning", enabled:true, createdAt:"2024-03-01", updatedAt:"2024-03-01", createdBy:"ai", aiGenerated:true, appliedCount:18, triggerCount:5 },

  // FHL — operational rules
  { id:"pol006", clientId:"pwc", category:"overtime",   name:"Zero Overtime Policy",
    description:"FinanceHub Ltd does not permit overtime under any circumstances. Any overtime claim will be rejected.",
    triggerCondition:"overtimeHours > 0",
    actionOnTrigger:"Auto-reject — no OT permitted",
    severity:"violation", enabled:true, createdAt:"2022-10-01", updatedAt:"2022-10-01", createdBy:"system", aiGenerated:false, appliedCount:34, triggerCount:12 },

  { id:"pol007", clientId:"pwc", category:"hours",      name:"Standard 40-Hour Week",
    description:"All employees must maintain exactly 40 hours per week. Under or over submissions require explanation.",
    triggerCondition:"totalHours < 38 || totalHours > 40",
    actionOnTrigger:"Request explanation from employee",
    severity:"warning", enabled:true, createdAt:"2022-10-01", updatedAt:"2024-08-20", createdBy:"system", aiGenerated:false, appliedCount:67, triggerCount:11 },

  { id:"pol008", clientId:"pwc", category:"compliance", name:"Original Email Required",
    description:"Forwarded emails are not accepted as timesheet submissions. The original employee-sent email must be attached.",
    triggerCondition:"emailIsForward",
    actionOnTrigger:"Reject — request original submission",
    severity:"violation", enabled:true, createdAt:"2023-04-01", updatedAt:"2023-04-01", createdBy:"system", aiGenerated:false, appliedCount:18, triggerCount:7 },

  // MSH — operational rules
  { id:"pol009", clientId:"aoc", category:"hours",      name:"Healthcare Shift Week Cap",
    description:"Medical staff may work up to 48 regular hours per week in accordance with healthcare shift norms.",
    triggerCondition:"regularHours > 48",
    actionOnTrigger:"Flag for compliance review",
    severity:"violation", enabled:true, createdAt:"2024-01-01", updatedAt:"2024-01-01", createdBy:"system", aiGenerated:false, appliedCount:45, triggerCount:3 },

  { id:"pol010", clientId:"aoc", category:"attendance", name:"Minimum 1 Rest Day Per Week",
    description:"Every employee must have at least one designated rest day in each 7-day period for health and safety compliance.",
    triggerCondition:"restDaysInWeek < 1",
    actionOnTrigger:"Warning — contact employee and manager",
    severity:"warning", enabled:true, createdAt:"2024-01-01", updatedAt:"2024-01-01", createdBy:"system", aiGenerated:false, appliedCount:60, triggerCount:8 },

  { id:"pol011", clientId:"aoc", category:"overtime",   name:"Double-Pay for OT",
    description:"All overtime is compensated at 2× the standard hourly rate per MSH healthcare worker agreements.",
    triggerCondition:"overtimeHours > 0",
    actionOnTrigger:"Auto-calculate 2x OT in payroll",
    severity:"info", enabled:true, createdAt:"2024-01-01", updatedAt:"2024-01-01", createdBy:"system", aiGenerated:false, appliedCount:80, triggerCount:30 },

  // GSS — operational rules
  { id:"pol012", clientId:"vir", category:"hours",      name:"45-Hour Weekly Standard",
    description:"GSS employees work a 45-hour standard week (9 hrs × 5 days). Submissions within ±2 hours auto-approve.",
    triggerCondition:"regularHours > 45 || regularHours < 43",
    actionOnTrigger:"Flag for review",
    severity:"warning", enabled:true, createdAt:"2023-04-01", updatedAt:"2024-09-01", createdBy:"system", aiGenerated:false, appliedCount:90, triggerCount:7 },

  { id:"pol013", clientId:"vir", category:"leave",      name:"Manager CC on Email Submissions",
    description:"All email timesheet submissions must CC the reporting manager. Submissions without manager CC are flagged.",
    triggerCondition:"emailSubmission && !managerCC",
    actionOnTrigger:"Warning — notify and log",
    severity:"warning", enabled:true, createdAt:"2023-06-15", updatedAt:"2023-06-15", createdBy:"system", aiGenerated:false, appliedCount:35, triggerCount:4 },

  // HEX — operational rules
  { id:"pol014", clientId:"hex", category:"hours",      name:"45-Hour Standard Week",
    description:"Hexaware standard work week is 45 hours. Submissions up to 45 regular hours auto-approve.",
    triggerCondition:"regularHours > 45",
    actionOnTrigger:"Flag for overtime review",
    severity:"warning", enabled:true, createdAt:"2022-04-01", updatedAt:"2024-01-01", createdBy:"system", aiGenerated:false, appliedCount:420, triggerCount:22 },

  { id:"pol015", clientId:"hex", category:"compliance", name:"Monthly Hour Target (180h)",
    description:"Employees are expected to complete approximately 180 regular hours per month. Significant deviation triggers review.",
    triggerCondition:"monthlyRegularHours < 160 || monthlyRegularHours > 200",
    actionOnTrigger:"Flag for manager review",
    severity:"warning", enabled:true, createdAt:"2022-04-01", updatedAt:"2024-01-01", createdBy:"ai", aiGenerated:true, appliedCount:200, triggerCount:15 },

  // ── ONBOARDING WORKFLOW ─────────────────────────────────────────────────────

  { id:"pol-onb-001", clientId:"cts", category:"compliance", workflow:"onboarding",
    name:"New joiner KYC completeness",
    description:"Before the first timesheet is accepted, Aadhaar + PAN + bank proof + signed offer letter must be present in HRMS. Missing any field blocks first-cycle payroll.",
    triggerCondition:"isFirstCycle && (kyc.aadhaar IS NULL || kyc.pan IS NULL || kyc.bankProof IS NULL || kyc.offer IS NULL)",
    actionOnTrigger:"Block first-cycle payroll · Notify onboarding ops",
    severity:"violation", enabled:true, createdAt:"2024-01-10", updatedAt:"2026-02-15", createdBy:"system", aiGenerated:false, appliedCount:64, triggerCount:9 },

  { id:"pol-onb-002", clientId:"hex", category:"payroll", workflow:"onboarding",
    name:"Bank details pre-flight",
    description:"Within 3 business days of joining, bank_account_no + ifsc_code must be validated via NPCI penny-drop. Unvalidated accounts pause salary disbursement for that employee.",
    triggerCondition:"daysSinceJoining >= 3 && !bank.npciValidated",
    actionOnTrigger:"Pause disbursement · Email employee for corrected proof",
    severity:"violation", enabled:true, createdAt:"2023-06-01", updatedAt:"2026-03-10", createdBy:"ops", aiGenerated:false, appliedCount:180, triggerCount:14 },

  // ── LEAVE & ATTENDANCE WORKFLOW ─────────────────────────────────────────────

  { id:"pol-lvl-001", clientId:"acc", category:"leave", workflow:"leave-attendance",
    name:"Sandwich leave approval",
    description:"Leaves that bridge a weekend or holiday (sandwich leave) require manager approval at least 48 hours in advance. Late submissions auto-flag for variance review.",
    triggerCondition:"isSandwichLeave && hoursBeforeStart < 48",
    actionOnTrigger:"Flag for manager review · Mark as variance in next payroll",
    severity:"warning", enabled:true, createdAt:"2023-02-10", updatedAt:"2025-09-01", createdBy:"ops", aiGenerated:false, appliedCount:42, triggerCount:6 },

  { id:"pol-lvl-002", clientId:"lmt", category:"leave", workflow:"leave-attendance",
    name:"LOP reconciliation at cycle close",
    description:"Loss of pay days from attendance system must be reconciled with line-manager sign-off before payroll cut-off. Unreconciled LOP holds the cycle for the affected cost centre.",
    triggerCondition:"lop.unsignedCount > 0 && beforeCutoff = false",
    actionOnTrigger:"Hold cost-centre payroll · Notify manager + HR ops",
    severity:"violation", enabled:true, createdAt:"2023-11-05", updatedAt:"2026-03-20", createdBy:"system", aiGenerated:false, appliedCount:28, triggerCount:5 },

  // ── EXIT / SEPARATION WORKFLOW ──────────────────────────────────────────────

  { id:"pol-exit-001", clientId:"cap", category:"compliance", workflow:"exit",
    name:"Notice period coverage check",
    description:"When separation is initiated, confirm that resignation + signed notice period intent + handover plan are on file. Missing any blocks clearance and final-cycle payroll.",
    triggerCondition:"separationInitiated && (resignation IS NULL || notice IS NULL || handover IS NULL)",
    actionOnTrigger:"Hold clearance · Notify HR BP + line manager",
    severity:"violation", enabled:true, createdAt:"2022-11-01", updatedAt:"2025-12-15", createdBy:"system", aiGenerated:false, appliedCount:22, triggerCount:3 },

  { id:"pol-exit-002", clientId:"lmt", category:"compliance", workflow:"exit",
    name:"Asset recovery gate",
    description:"Laptop, access cards, and confidential asset acknowledgement must be returned or acknowledged by IT + Admin before FnF is released. Missing asset recovery records keep FnF on hold.",
    triggerCondition:"separationStage = 'fnf' && assetRecovery.complete = false",
    actionOnTrigger:"Hold FnF · Notify IT ops + Admin + HR",
    severity:"violation", enabled:true, createdAt:"2023-05-01", updatedAt:"2026-01-18", createdBy:"ops", aiGenerated:false, appliedCount:16, triggerCount:4 },

  // ── FULL & FINAL (FnF) WORKFLOW ─────────────────────────────────────────────

  { id:"pol-fnf-001", clientId:"cts", category:"payroll", workflow:"fnf",
    name:"Gratuity eligibility & computation",
    description:"Employees with ≥ 5 years continuous service are eligible for gratuity in FnF. Computation = (last drawn basic × 15/26) × completed years. Mismatches with HRMS auto-flag for finance ops.",
    triggerCondition:"tenureYears >= 5 && gratuityAmount != expectedGratuity",
    actionOnTrigger:"Flag FnF batch · Review with finance ops",
    severity:"warning", enabled:true, createdAt:"2022-07-01", updatedAt:"2026-02-28", createdBy:"system", aiGenerated:false, appliedCount:11, triggerCount:2 },

  { id:"pol-fnf-002", clientId:"pwc", category:"payroll", workflow:"fnf",
    name:"Leave encashment cap",
    description:"Leave encashment in FnF is capped at the sum of available earned leave at separation date. Any excess balance requires explicit HR BP approval and is held until signed off.",
    triggerCondition:"encashedLeaves > availableEarnedLeaves",
    actionOnTrigger:"Hold FnF · Require HR BP approval",
    severity:"violation", enabled:true, createdAt:"2022-10-01", updatedAt:"2026-01-05", createdBy:"system", aiGenerated:false, appliedCount:9, triggerCount:1 },
]

export const policyRules: PolicyRule[] = _policyRuleSeeds.map(rule => ({
  ...rule,
  workflow: deriveWorkflow(rule),
}))

// ─── AI Insights ──────────────────────────────────────────────────────────────

export const aiInsights: AIInsight[] = [
  { id:"ai001", type:"anomaly",    title:"3-Week OT Pattern — Rahul Sharma (TCI)",            description:"Rahul logged 10+ OT hours for 3 consecutive weeks. TCI policy v3.2 mandates manager review. Pre-approval missing.",  timesheetIds:["ts001"], employeeIds:["emp001"], clientId:"acc",  priority:"high",   timestamp:"2026-04-09T08:00:00Z", isRead:false, suggestedAction:"Request manager approval email from mgr@techcorp.in before processing." },
  { id:"ai002", type:"warning",    title:"OT Policy Violation — Neha Gupta (FHL)",             description:"Neha claims 2 OT hours. FinanceHub prohibits overtime under policy v4.1. Will be rejected unless corrected.",           timesheetIds:["ts004"], employeeIds:["emp006"], clientId:"pwc",  priority:"high",   timestamp:"2026-04-09T08:05:00Z", isRead:false, suggestedAction:"Send rejection notice and ask employee to resubmit without OT hours." },
  { id:"ai003", type:"suggestion", title:"2 Email Timesheets Unprocessed >48h",                description:"Priya Menon and Deepa Rao submitted via email 2–3 days ago and are still pending. SLA risk: 48h turnaround.",           timesheetIds:["ts002","ts006"],                                    priority:"medium", timestamp:"2026-04-09T08:10:00Z", isRead:false, suggestedAction:"Prioritise both timesheets — they can auto-approve given 91% and 88% validation scores." },
  { id:"ai004", type:"info",       title:"Payroll Ready: GSS Apr Week 1",                     description:"2 GlobalStaff timesheets approved and verified. Total ₹46,200 ready to process.",                                         clientId:"vir",                                                    priority:"low",    timestamp:"2026-04-09T09:00:00Z", isRead:true },
  { id:"ai005", type:"anomaly",    title:"Hexaware: 18 timesheets synced, 3 parsing errors",  description:"Darwinbox sync completed at 07:45. 3 timesheets failed parsing due to missing employee codes. Manual review needed.",    clientId:"hex",                                                    priority:"medium", timestamp:"2026-04-10T07:50:00Z", isRead:false, suggestedAction:"Open Hexaware portal and cross-check employee codes HEX8821, HEX8822, HEX8901." },
  { id:"ai006", type:"warning",    title:"Sonia Das on Notice — FHL payroll hold required",   description:"Sonia Das (FHL0002) is on notice period. Per FHL policy, payroll must be reviewed by finance before release.",           timesheetIds:["ts004"], employeeIds:["emp007"], clientId:"pwc",  priority:"high",   timestamp:"2026-04-09T09:30:00Z", isRead:false, suggestedAction:"Flag FHL payroll batch for manual finance team review." },
]

// ─── Payroll Batches ──────────────────────────────────────────────────────────

export const payrollBatches: PayrollBatch[] = [
  { id:"pay001", clientId:"hex", period:"Apr 2026 (Week 1)",   periodStart:"2026-03-30", periodEnd:"2026-04-04", approvedTimesheets:42, totalTimesheets:87, totalHours:1890, regularHours:1760, overtimeHours:130, leaveHours:0,   totalAmount:7840000, regularAmount:7410000, overtimeAmount:430000, currency:"INR", status:"draft",            createdAt:"2026-04-09", onHoldCount:3 },
  { id:"pay002", clientId:"cts", period:"Apr 2026 (Week 1)",   periodStart:"2026-03-30", periodEnd:"2026-04-04", approvedTimesheets:68, totalTimesheets:124, totalHours:2720, regularHours:2720, overtimeHours:0,   leaveHours:240, totalAmount:9580000, regularAmount:9580000, overtimeAmount:0,       currency:"INR", status:"pending_approval", createdAt:"2026-04-08", onHoldCount:0 },
  { id:"pay003", clientId:"acc", period:"Apr 2026 (Week 1)",   periodStart:"2026-03-30", periodEnd:"2026-04-04", approvedTimesheets:8,  totalTimesheets:23,  totalHours:320,  regularHours:305,  overtimeHours:15,  leaveHours:8,   totalAmount:1240000, regularAmount:1210000, overtimeAmount:30000,   currency:"INR", status:"draft",            createdAt:"2026-04-09", onHoldCount:2 },
  { id:"pay004", clientId:"vir", period:"Apr 2026 (Week 1)",   periodStart:"2026-03-30", periodEnd:"2026-04-04", approvedTimesheets:11, totalTimesheets:16,  totalHours:495,  regularHours:495,  overtimeHours:0,   leaveHours:0,   totalAmount:2020000, regularAmount:2020000, overtimeAmount:0,       currency:"INR", status:"approved",         createdAt:"2026-04-08", approvedBy:"Siddharth Kirtikar", approvedAt:"2026-04-09T11:00:00Z", onHoldCount:0 },
  { id:"pay005", clientId:"pwc", period:"Mar 2026",            periodStart:"2026-03-01", periodEnd:"2026-03-31", approvedTimesheets:29, totalTimesheets:29,  totalHours:1160, regularHours:1160, overtimeHours:0,   leaveHours:80,  totalAmount:4200000, regularAmount:4200000, overtimeAmount:0,       currency:"INR", status:"processed",        createdAt:"2026-04-01", approvedBy:"Siddharth Kirtikar", approvedAt:"2026-04-02T10:00:00Z", processedAt:"2026-04-03T14:00:00Z", onHoldCount:0 },
  { id:"pay006", clientId:"aoc", period:"Mar 2026",            periodStart:"2026-03-01", periodEnd:"2026-03-31", approvedTimesheets:18, totalTimesheets:20,  totalHours:972,  regularHours:864,  overtimeHours:108, leaveHours:0,   totalAmount:680000, regularAmount:518400,   overtimeAmount:161600,  currency:"INR", status:"processed",        createdAt:"2026-04-01", approvedBy:"Siddharth Kirtikar", approvedAt:"2026-04-02T12:00:00Z", processedAt:"2026-04-03T16:00:00Z", onHoldCount:0 },
  { id:"pay007", clientId:"cap", period:"Apr 2026 (Week 1)",   periodStart:"2026-03-30", periodEnd:"2026-04-04", approvedTimesheets:35, totalTimesheets:52,  totalHours:1575, regularHours:1485, overtimeHours:90,  leaveHours:0,   totalAmount:6800000, regularAmount:6440000, overtimeAmount:360000,  currency:"INR", status:"pending_approval", createdAt:"2026-04-09", onHoldCount:1 },
  { id:"pay008", clientId:"lmt", period:"Apr 2026 (Week 1)",   periodStart:"2026-03-30", periodEnd:"2026-04-04", approvedTimesheets:55, totalTimesheets:78,  totalHours:2475, regularHours:2340, overtimeHours:135, leaveHours:0,   totalAmount:8900000, regularAmount:8380000, overtimeAmount:520000,  currency:"INR", status:"draft",            createdAt:"2026-04-09", onHoldCount:4 },
]

// ─── Weekly Trend ─────────────────────────────────────────────────────────────

export const weeklyTrend = [
  { week:"Mar W1", received:142, processed:138, autoApproved:82 },
  { week:"Mar W2", received:168, processed:161, autoApproved:95 },
  { week:"Mar W3", received:175, processed:168, autoApproved:101 },
  { week:"Mar W4", received:151, processed:148, autoApproved:89 },
  { week:"Apr W1", received:186, processed:74,  autoApproved:44 },
]

// ─── Client Distribution (for dashboard donut) ────────────────────────────────

export const clientDistribution = [
  { name:"HEX", value:87,  color:"#FF6B35" },
  { name:"IBP", value:124, color:"#0070F3" },
  { name:"CGI", value:52,  color:"#003189" },
  { name:"LTI", value:78,  color:"#009A44" },
  { name:"Others", value:295, color:"rgba(255,255,255,0.15)" },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getEmployee(id: string) { return employees.find(e => e.id === id) }
export function getClient(id: string)   { return clients.find(c => c.id === id) }
export function getPortal(id: string)   { return portals.find(p => p.id === id) }

// Resolve the mailing group for a client-side notification — Buzzworks AM +
// client correspondent on the To: line, with one extra Buzzworks stakeholder
// and one extra client-side stakeholder on CC:.
// Deterministic: same client always resolves to the same people.
export function getClientContacts(client: Client): {
  amName: string; amEmail: string
  clientContact: { name: string; email: string }
  buzzworksCc: string
  clientCc: string
} {
  const amSlug = client.accountManager.toLowerCase().replace(/\s+/g, ".")
  const amEmail = `${amSlug}@buzzworks.com`

  // Import domain resolver lazily to avoid circular dep.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { clientEmailDomain } = require("./mock-generator") as typeof import("./mock-generator")
  const domain = clientEmailDomain(client.id)

  // Deterministic contact name from client id (stable across renders).
  const CONTACT_POOL = [
    { first: "Neha",    last: "Kapoor"    },
    { first: "Vikas",   last: "Bhatia"    },
    { first: "Shalini", last: "Iyer"      },
    { first: "Manish",  last: "Khandelwal"},
    { first: "Aarti",   last: "Shah"      },
    { first: "Rohan",   last: "Deshpande" },
    { first: "Kriti",   last: "Banerjee"  },
  ]
  let h = 0
  for (let i = 0; i < client.id.length; i++) h = ((h << 5) - h + client.id.charCodeAt(i)) | 0
  const pick = CONTACT_POOL[Math.abs(h) % CONTACT_POOL.length]
  const contactName  = `${pick.first} ${pick.last}`
  const contactEmail = `${pick.first.toLowerCase()}.${pick.last.toLowerCase()}@${domain}`

  return {
    amName:  client.accountManager,
    amEmail,
    clientContact: { name: contactName, email: contactEmail },
    buzzworksCc: "compliance-ops@buzzworks.com",
    clientCc:    `compliance@${domain}`,
  }
}

export function getClientPolicyRules(clientId: string) {
  return policyRules.filter(r => r.clientId === clientId)
}

export function getClientPayrollBatches(clientId: string) {
  return payrollBatches.filter(b => b.clientId === clientId)
}

// Legacy alias — keeps existing pages compiling
export const payrollSummaries: PayrollSummary[] = payrollBatches.map(b => ({
  clientId: b.clientId,
  period: b.period,
  approvedTimesheets: b.approvedTimesheets,
  totalHours: b.totalHours,
  totalAmount: b.totalAmount,
  currency: b.currency,
  status: b.status === "approved" ? "pending_approval" : b.status === "processed" ? "processed" : "draft",
}))
