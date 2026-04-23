export type ComplianceCategory =
  | "Labour"
  | "Finance & Taxation"
  | "EHS"
  | "Commercial"
  | "Secretarial"

export type ImpactLevel = "high" | "medium" | "low"

export interface Regulation {
  id:             number
  title:          string
  date:           string
  category:       ComplianceCategory
  authority:      string
  reference:      string
  jurisdiction:   string
  summary:        string
  keyChanges:     string[]
  effectiveDate:  string
  impact:         ImpactLevel
  actionRequired: boolean
  sourceUrl:      string
  sourceName:     string
  clientsAffected: string[]
}

// Functional area icon helpers
export const CATEGORY_META: Record<ComplianceCategory, { label: string; color: string; bg: string }> = {
  "Labour":             { label: "Labour",             color: "#E62E6D", bg: "rgba(230, 46, 109, 0.08)" },
  "Finance & Taxation": { label: "Finance & Tax",      color: "#1F6FEB", bg: "rgba(31, 111, 235, 0.08)" },
  "EHS":                { label: "EHS",                color: "#D32F2F", bg: "rgba(211, 47, 47, 0.08)" },
  "Commercial":         { label: "Commercial",         color: "#7C3AED", bg: "rgba(124, 58, 237, 0.08)" },
  "Secretarial":        { label: "Secretarial",        color: "#0F766E", bg: "rgba(15, 118, 110, 0.08)" },
}

export const IMPACT_META: Record<ImpactLevel, { label: string; color: string; bg: string }> = {
  high:   { label: "High impact",   color: "#DC2626", bg: "rgba(220, 38, 38, 0.08)" },
  medium: { label: "Medium impact", color: "#D97706", bg: "rgba(217, 119, 6, 0.08)" },
  low:    { label: "Low impact",    color: "#6B7280", bg: "rgba(107, 114, 128, 0.08)" },
}

export const REGULATIONS: Regulation[] = [
  {
    id: 1,
    title: "Transition from Form 15G/15H to Consolidated Form 121 for TDS-Exempted Incomes",
    date: "Apr 16, 2026",
    category: "Labour",
    authority: "Employees' Provident Fund Organisation (EPFO)",
    reference: "WSU/TDS Issues/E-772040/2026-27/11",
    jurisdiction: "Central",
    summary: "Forms 15G and 15H have been replaced by consolidated Form 121 under the Income-tax Act, 2025, effective April 1, 2026. Resident taxpayers with nil estimated tax liability may submit Form 121. Payers must generate a Unique Identification Number (UIN) for each form and report it in monthly statements and quarterly TDS returns.",
    keyChanges: [
      "Form 15G/15H replaced by consolidated Form 121",
      "Payers must generate UIN for each form submission",
      "UIN must be reported in monthly statements and quarterly TDS returns",
      "Physical signed forms acceptable until online systems available",
      "Non-compliance on missing UINs may attract penalties",
    ],
    effectiveDate: "Apr 1, 2026",
    impact: "high",
    actionRequired: true,
    sourceUrl: "https://www.epfindia.gov.in/site_en/Circulars.php",
    sourceName: "EPFO Circulars",
    clientsAffected: ["All PF-enrolled clients"],
  },
  {
    id: 2,
    title: "Offline Utility Enabled for Form 145 and Form 146 on e-Filing Portal",
    date: "Apr 16, 2026",
    category: "Finance & Taxation",
    authority: "Income Tax Department",
    reference: "e-Filing Portal Update — Apr 15, 2026",
    jurisdiction: "Central",
    summary: "The Income Tax Department has enabled offline utility for Form 145 and Form 146 on the e-Filing Portal. Users can download, fill, and submit these forms via the portal.",
    keyChanges: [
      "Offline utility now available for Form 145 and Form 146",
      "Forms can be prepared offline and submitted via e-Filing Portal",
    ],
    effectiveDate: "Apr 15, 2026",
    impact: "low",
    actionRequired: false,
    sourceUrl: "https://www.incometax.gov.in/iec/foportal/",
    sourceName: "Income Tax e-Filing",
    clientsAffected: ["TechCorp India", "Infosys BPM", "Hexaware", "L&T Infotech"],
  },
  {
    id: 3,
    title: "Karnataka Shops & Establishments Act — Amended Overtime Rules for Blue-Collar Workers",
    date: "Apr 15, 2026",
    category: "Labour",
    authority: "Department of Labour, Govt. of Karnataka",
    reference: "KAR/LABOUR/OT-2026/Amendment-04",
    jurisdiction: "Karnataka",
    summary: "OT rate for blue-collar workers in Karnataka increased from 1.5x to 2x for hours beyond 9hrs/day. JARVIS OT validation rules for Bangalore-based clients require immediate update.",
    keyChanges: [
      "Overtime rate increased from 1.5x to 2x for hours beyond 9/day",
      "Applies to all establishments under KS&E Act",
      "Immediate effect — no transition period",
      "JARVIS OT validation rules need updating for Karnataka clients",
    ],
    effectiveDate: "Apr 15, 2026",
    impact: "high",
    actionRequired: true,
    sourceUrl: "https://labour.karnataka.gov.in/page/Acts+and+Rules/en",
    sourceName: "Karnataka Labour",
    clientsAffected: ["Dine-In Brands", "Swiggy", "Urban Company", "Infosys BPM"],
  },
  {
    id: 4,
    title: "PF Wage Ceiling Revised to ₹21,000 — Effective May 1, 2026",
    date: "Apr 14, 2026",
    category: "Labour",
    authority: "EPFO",
    reference: "EPFO/Wage-Ceiling/2026-27/Circular-03",
    jurisdiction: "Central",
    summary: "The EPFO has revised the PF wage ceiling from ₹15,000 to ₹21,000 per month. All blue-collar contract workers currently at the ₹15,000 ceiling will see revised PF deductions. Payroll templates must be updated before the May cycle.",
    keyChanges: [
      "PF wage ceiling raised from ₹15,000 to ₹21,000/month",
      "Both employer and employee contribution bases revised",
      "Payroll templates need updating before May 2026 cycle",
    ],
    effectiveDate: "May 1, 2026",
    impact: "high",
    actionRequired: true,
    sourceUrl: "https://www.epfindia.gov.in/site_en/Circulars.php",
    sourceName: "EPFO Circulars",
    clientsAffected: ["Dine-In Brands", "Swiggy", "Zomato", "BigBasket", "Urban Company"],
  },
  {
    id: 5,
    title: "Revised TDS Threshold for Contract Payments Under Section 194C Raised to ₹1 Lakh",
    date: "Apr 13, 2026",
    category: "Finance & Taxation",
    authority: "Central Board of Direct Taxes (CBDT)",
    reference: "CBDT/Notification/2026/48",
    jurisdiction: "Central",
    summary: "IT contract workers below ₹1L annual contract value are now exempt from TDS under Section 194C. Vendor payment configurations for impacted contractors need updating.",
    keyChanges: [
      "Single transaction TDS threshold raised under Section 194C",
      "IT contractors below ₹1L annual value now exempt",
      "Vendor payment configurations need updating",
    ],
    effectiveDate: "Apr 1, 2026",
    impact: "medium",
    actionRequired: true,
    sourceUrl: "https://incometaxindia.gov.in/Pages/communications/notifications.aspx",
    sourceName: "CBDT Notifications",
    clientsAffected: ["TechCorp India", "Infosys BPM", "Wipro GE", "Hexaware", "L&T Infotech"],
  },
  {
    id: 6,
    title: "Maharashtra Minimum Wages Revision — Zone I and Zone II Manufacturing Workers",
    date: "Apr 12, 2026",
    category: "Labour",
    authority: "Labour Commissioner, Govt. of Maharashtra",
    reference: "MAH/MW/2026/Rev-02",
    jurisdiction: "Maharashtra",
    summary: "Minimum daily wages for unskilled manufacturing workers in Zone I (Mumbai, Thane) increased from ₹570 to ₹620. Zone II (Pune, Nagpur) increased from ₹520 to ₹570.",
    keyChanges: [
      "Zone I (Mumbai, Thane): ₹570 → ₹620/day",
      "Zone II (Pune, Nagpur): ₹520 → ₹570/day",
      "Payroll corrections required for affected clients",
    ],
    effectiveDate: "Apr 12, 2026",
    impact: "high",
    actionRequired: true,
    sourceUrl: "https://mahakamgar.maharashtra.gov.in/minimum-wages-702.htm",
    sourceName: "Maharashtra Labour",
    clientsAffected: ["Dine-In Brands", "MedSure Healthcare", "Capgemini"],
  },
  {
    id: 7,
    title: "ESIC Circular: Gig Worker Coverage Framework — Consultation Draft",
    date: "Apr 11, 2026",
    category: "Labour",
    authority: "ESIC",
    reference: "ESIC/GigWorker/2026/Draft-01",
    jurisdiction: "Central",
    summary: "Draft proposes mandatory ESI for platform gig workers earning ₹21,000+/month. Currently in consultation phase. Could impact all platform-based client engagements.",
    keyChanges: [
      "Mandatory ESI proposed for gig workers earning ₹21,000+/month",
      "Currently a consultation draft — not yet effective",
      "Would apply to platform-based workers",
    ],
    effectiveDate: "TBD",
    impact: "medium",
    actionRequired: false,
    sourceUrl: "https://www.esic.in/web/esicnew/circulars-and-orders",
    sourceName: "ESIC Orders",
    clientsAffected: ["Swiggy", "Zomato", "Urban Company", "BigBasket"],
  },
  {
    id: 8,
    title: "Delhi Factories Act Amendment — Fire Safety Compliance for Contract Workers",
    date: "Apr 10, 2026",
    category: "EHS",
    authority: "Department of Industries, Govt. of Delhi",
    reference: "DEL/FACTORIES/FIRE-SAFETY/2026/01",
    jurisdiction: "Delhi",
    summary: "All principal employers engaging contract workers must ensure fire safety training within 30 days of deployment. Non-compliance penalty increased from ₹10,000 to ₹50,000 per incident.",
    keyChanges: [
      "Fire safety training mandatory within 30 days of contract worker deployment",
      "Non-compliance penalty increased 5x (₹10K → ₹50K)",
      "Applies to all factory premises in NCT Delhi",
    ],
    effectiveDate: "Apr 10, 2026",
    impact: "high",
    actionRequired: true,
    sourceUrl: "https://labour.delhi.gov.in/content/factories-act",
    sourceName: "Delhi Labour",
    clientsAffected: ["FinanceHub Ltd", "GlobalStaff Solutions"],
  },
  {
    id: 9,
    title: "POSH Act — Revised Compliance for Contract Staffing Intermediaries",
    date: "Apr 8, 2026",
    category: "Labour",
    authority: "Ministry of Women and Child Development",
    reference: "MWCD/POSH/2026/Amendment-02",
    jurisdiction: "Central",
    summary: "Contract staffing intermediaries are now explicitly required to maintain an Internal Complaints Committee and conduct annual POSH training for all deployed contract workers.",
    keyChanges: [
      "ICC mandatory for staffing intermediaries, not just end-clients",
      "Annual POSH training required for all deployed contract workers",
      "Non-compliance may result in license cancellation",
    ],
    effectiveDate: "Apr 8, 2026",
    impact: "high",
    actionRequired: true,
    sourceUrl: "https://wcd.nic.in/act/sexual-harassment-women-workplace-prevention-prohibition-and-redressal-act-2013",
    sourceName: "Ministry of WCD",
    clientsAffected: ["All clients"],
  },
  {
    id: 10,
    title: "Karnataka Professional Tax — Revised Slab for Contract Workers Above ₹25,000",
    date: "Apr 7, 2026",
    category: "Finance & Taxation",
    authority: "Commercial Taxes Department, Govt. of Karnataka",
    reference: "KAR/PTAX/2026/Rev-01",
    jurisdiction: "Karnataka",
    summary: "Professional tax for workers earning ₹25,001–₹50,000 increased from ₹150 to ₹200/month. Workers above ₹50,000 now pay ₹250/month.",
    keyChanges: [
      "₹25,001–₹50,000 bracket: ₹150 → ₹200/month",
      "Above ₹50,000 bracket: ₹200 → ₹250/month",
      "All Karnataka-based payroll deductions must be updated",
    ],
    effectiveDate: "Apr 7, 2026",
    impact: "medium",
    actionRequired: true,
    sourceUrl: "https://ctax.karnataka.gov.in/english",
    sourceName: "Karnataka CTAX",
    clientsAffected: ["Infosys BPM", "Wipro GE", "Swiggy", "Urban Company"],
  },
]

/** Returns regulations that affect a specific client (by name). */
export function getRegulationsForClient(clientName: string): Regulation[] {
  return REGULATIONS.filter(r =>
    r.clientsAffected.includes(clientName) ||
    r.clientsAffected.includes("All clients") ||
    r.clientsAffected.includes("All PF-enrolled clients")
  )
}

/** Count of action-required regulations for a specific client. */
export function getActionCountForClient(clientName: string): number {
  return getRegulationsForClient(clientName).filter(r => r.actionRequired).length
}

/** Unique list of all client names referenced in regulations. */
export function getAllAffectedClients(): string[] {
  const set = new Set<string>()
  for (const r of REGULATIONS) {
    for (const c of r.clientsAffected) {
      if (!c.startsWith("All ")) set.add(c)
    }
  }
  return Array.from(set).sort()
}
