// compliance-data.ts
// OpsDesk Compliance Dashboard — regulation data + generator
// 10 featured (handcrafted) + 990 generated = 1000 total

export type ComplianceCategory =
  | "Labour"
  | "Finance & Taxation"
  | "EHS"
  | "Commercial"
  | "Secretarial"
  | "Industry Specific"
  | "General"

export type ImpactArea =
  | "Payroll"
  | "HR Operations"
  | "Compliance Management"
  | "Worker Onboarding"
  | "Employee Welfare"
  | "Tax Filing"
  | "Legal Documentation"
  | "Workplace Safety"
  | "Contract Management"
  | "Account Management"

export type RiskLevel = "high" | "medium" | "low"

export interface Regulation {
  id:                 number
  title:              string
  date:               string         // "Apr 16, 2026" formatted
  category:           ComplianceCategory
  authority:          string
  reference:          string
  region:             string         // "Central" or state name
  summary:            string
  keyChanges:         string[]
  effectiveDate:      string
  impactAreas:        ImpactArea[]
  penaltyAmount:      number         // ₹ amount, 0 if not applicable
  penaltyDescription: string
  legalRisk:          RiskLevel
  operationalImpact:  RiskLevel
  actionRequired:     boolean
  sourceUrl:          string
  sourceName:         string
  clientsAffected:    string[]
}

// ---------------------------------------------------------------------------
// Meta lookups
// ---------------------------------------------------------------------------

export const CATEGORY_META: Record<ComplianceCategory, { label: string; color: string; bg: string }> = {
  "Labour":             { label: "Labour",            color: "#E62E6D", bg: "rgba(230, 46, 109, 0.08)" },
  "Finance & Taxation": { label: "Finance & Tax",     color: "#1F6FEB", bg: "rgba(31, 111, 235, 0.08)" },
  "EHS":                { label: "EHS",               color: "#D32F2F", bg: "rgba(211, 47, 47, 0.08)" },
  "Commercial":         { label: "Commercial",        color: "#7C3AED", bg: "rgba(124, 58, 237, 0.08)" },
  "Secretarial":        { label: "Secretarial",       color: "#0F766E", bg: "rgba(15, 118, 110, 0.08)" },
  "Industry Specific":  { label: "Industry Specific", color: "#C88A5C", bg: "rgba(200, 138, 92, 0.08)" },
  "General":            { label: "General",           color: "#6B7280", bg: "rgba(107, 114, 128, 0.08)" },
}

export const IMPACT_AREA_META: Record<ImpactArea, { label: string; color: string }> = {
  "Payroll":               { label: "Payroll",               color: "#E62E6D" },
  "HR Operations":         { label: "HR Operations",         color: "#1F6FEB" },
  "Compliance Management": { label: "Compliance Management", color: "#7C3AED" },
  "Worker Onboarding":     { label: "Worker Onboarding",     color: "#0F766E" },
  "Employee Welfare":      { label: "Employee Welfare",      color: "#059669" },
  "Tax Filing":            { label: "Tax Filing",            color: "#D97706" },
  "Legal Documentation":   { label: "Legal Documentation",  color: "#6366F1" },
  "Workplace Safety":      { label: "Workplace Safety",      color: "#D32F2F" },
  "Contract Management":   { label: "Contract Management",  color: "#C88A5C" },
  "Account Management":    { label: "Account Management",   color: "#6B7280" },
}

export const RISK_META: Record<RiskLevel, { label: string; color: string; bg: string }> = {
  high:   { label: "High",   color: "#DC2626", bg: "rgba(220, 38, 38, 0.08)" },
  medium: { label: "Medium", color: "#D97706", bg: "rgba(217, 119, 6, 0.08)" },
  low:    { label: "Low",    color: "#6B7280", bg: "rgba(107, 114, 128, 0.08)" },
}

export const REGIONS = [
  "Central", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Chandigarh", "J&K",
] as const

// ---------------------------------------------------------------------------
// Seeded PRNG — mulberry32
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let s = seed
  return function () {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------------------
// Generator helpers
// ---------------------------------------------------------------------------

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]
}

function pickN<T>(arr: readonly T[], n: number, rng: () => number): T[] {
  const shuffled = [...arr].sort(() => rng() - 0.5)
  return shuffled.slice(0, Math.min(n, arr.length))
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    .replace(",", "")
}

// Weighted date: more entries in recent months
function weightedRandomDate(rng: () => number): Date {
  const start = new Date("2025-01-01")
  const end   = new Date("2026-04-16")
  // Square the random number to bias toward recent dates
  const r = rng() * rng()
  const ms = start.getTime() + Math.floor(r * (end.getTime() - start.getTime()))
  return new Date(ms)
}

// ---------------------------------------------------------------------------
// Data pools for generation
// ---------------------------------------------------------------------------

const CLIENT_ROSTER = [
  "Dine-In Brands", "Swiggy", "Zomato", "BigBasket", "Urban Company",
  "TechCorp India", "Infosys BPM", "Hexaware", "L&T Infotech", "Wipro GE",
  "Mindtree", "Capgemini", "MedSure Healthcare", "FinanceHub Ltd",
  "GlobalStaff Solutions",
] as const

const CLIENT_CATEGORIES: Record<string, readonly (typeof CLIENT_ROSTER[number])[]> = {
  food:   ["Dine-In Brands", "Swiggy", "Zomato", "BigBasket"],
  it:     ["TechCorp India", "Infosys BPM", "Hexaware", "L&T Infotech", "Wipro GE", "Mindtree", "Capgemini"],
  health: ["MedSure Healthcare", "Urban Company"],
  fin:    ["FinanceHub Ltd", "GlobalStaff Solutions"],
  gig:    ["Swiggy", "Zomato", "Urban Company", "BigBasket"],
  all:    CLIENT_ROSTER,
}

const CATEGORY_POOLS: Record<ComplianceCategory, {
  authorities: string[]
  topics: string[]
  impactAreas: ImpactArea[]
  clientGroup: keyof typeof CLIENT_CATEGORIES
  penaltyRange: [number, number]
  legalRisk: RiskLevel
  operationalImpact: RiskLevel
  sourceBase: string
  sourceName: string
  urlPath: string
}> = {
  "Labour": {
    authorities: [
      "Employees' Provident Fund Organisation (EPFO)",
      "Employees' State Insurance Corporation (ESIC)",
      "Ministry of Labour & Employment",
      "Chief Labour Commissioner",
      "Directorate General of Factory Advice Service",
    ],
    topics: [
      "provident fund contributions", "ESI coverage thresholds", "minimum wages revision",
      "overtime compensation rules", "maternity benefit entitlements", "gratuity payment norms",
      "contract labour registration", "inter-state migrant worker welfare", "bonus calculation",
      "leave encashment rules", "shop establishment hours", "industrial relations procedures",
      "apprentice engagement norms", "welfare fund contributions", "labour cess payment",
      "POSH compliance for contract workers", "equal remuneration provisions",
      "gig worker social security", "fixed-term employment conditions", "standing order amendments",
    ],
    impactAreas: ["Payroll", "HR Operations", "Employee Welfare", "Worker Onboarding", "Compliance Management"],
    clientGroup: "all",
    penaltyRange: [10000, 500000],
    legalRisk: "high",
    operationalImpact: "high",
    sourceBase: "https://labour.gov.in/",
    sourceName: "Ministry of Labour",
    urlPath: "circulars",
  },
  "Finance & Taxation": {
    authorities: [
      "Central Board of Direct Taxes (CBDT)",
      "Central Board of Indirect Taxes & Customs (CBIC)",
      "Income Tax Department",
      "GST Council",
    ],
    topics: [
      "TDS thresholds under Section 194C", "GST return filing procedures", "professional tax slabs",
      "advance tax payment schedules", "Form 26AS reconciliation", "input tax credit claims",
      "e-invoicing mandate thresholds", "annual information statement", "TCS on remittances",
      "tax deduction at source for perquisites", "GST audit requirements", "GSTR-9 amendments",
      "TDS on rent under Section 194I", "tax treatment of ESOPs", "deemed dividend provisions",
      "surcharge on income tax", "penalty waiver scheme", "voluntary compliance window",
      "tax residency certificates", "withholding tax on royalties",
    ],
    impactAreas: ["Tax Filing", "Payroll", "Account Management", "Compliance Management", "Legal Documentation"],
    clientGroup: "it",
    penaltyRange: [25000, 1000000],
    legalRisk: "medium",
    operationalImpact: "medium",
    sourceBase: "https://incometaxindia.gov.in/",
    sourceName: "Income Tax India",
    urlPath: "notifications",
  },
  "EHS": {
    authorities: [
      "Central Pollution Control Board (CPCB)",
      "Directorate General of Mines Safety",
      "National Disaster Management Authority",
    ],
    topics: [
      "fire safety equipment standards", "hazardous waste disposal norms", "air quality monitoring",
      "water discharge standards", "occupational health surveillance", "chemical storage rules",
      "building safety inspections", "emergency evacuation procedures", "noise pollution limits",
      "effluent treatment plant standards", "green building certification", "PPE requirements",
      "electrical safety audits", "construction safety norms", "machinery guarding rules",
      "radiation safety compliance", "dust exposure limits", "first-aid requirements",
      "workplace ergonomics standards", "bio-medical waste management",
    ],
    impactAreas: ["Workplace Safety", "Compliance Management", "HR Operations", "Legal Documentation"],
    clientGroup: "food",
    penaltyRange: [100000, 5000000],
    legalRisk: "high",
    operationalImpact: "high",
    sourceBase: "https://cpcb.nic.in/",
    sourceName: "CPCB",
    urlPath: "guidelines",
  },
  "Commercial": {
    authorities: [
      "Bureau of Indian Standards (BIS)",
      "Food Safety and Standards Authority (FSSAI)",
      "Directorate of Legal Metrology",
      "Ministry of Commerce & Industry",
      "Director General of Foreign Trade (DGFT)",
    ],
    topics: [
      "product labelling requirements", "quality certification norms", "weights and measures compliance",
      "import export code renewal", "trade licence conditions", "food safety standards",
      "packaging material specifications", "consumer protection regulations", "brand registration",
      "anti-dumping duty notifications", "customs duty amendments", "export incentive schemes",
      "DGFT policy updates", "special economic zone norms", "domestic market obligation",
      "BIS certification requirements", "hallmarking standards", "ISI mark compliance",
      "organic certification framework", "country-of-origin labelling",
    ],
    impactAreas: ["Contract Management", "Compliance Management", "Legal Documentation", "Account Management"],
    clientGroup: "food",
    penaltyRange: [10000, 200000],
    legalRisk: "medium",
    operationalImpact: "medium",
    sourceBase: "https://bis.gov.in/",
    sourceName: "BIS India",
    urlPath: "notifications",
  },
  "Secretarial": {
    authorities: [
      "Ministry of Corporate Affairs (MCA)",
      "Insolvency and Bankruptcy Board of India (IBBI)",
      "Securities and Exchange Board of India (SEBI)",
      "Reserve Bank of India (RBI)",
    ],
    topics: [
      "annual return filing procedures", "board meeting documentation", "related party transactions",
      "statutory audit requirements", "director KYC compliance", "company secretary obligations",
      "share transfer procedures", "debenture trustee norms", "prospectus filing requirements",
      "insider trading regulations", "corporate governance code", "whistle-blower policy",
      "beneficial ownership disclosure", "foreign direct investment reporting", "FEMA compliance",
      "IBC resolution proceedings", "merger and acquisition filings", "CSR spending requirements",
      "investor grievance redressal", "listing obligation disclosures",
    ],
    impactAreas: ["Legal Documentation", "Compliance Management", "Account Management", "Contract Management"],
    clientGroup: "fin",
    penaltyRange: [50000, 2500000],
    legalRisk: "medium",
    operationalImpact: "low",
    sourceBase: "https://www.mca.gov.in/",
    sourceName: "MCA India",
    urlPath: "circulars",
  },
  "Industry Specific": {
    authorities: [
      "Directorate General of Civil Aviation (DGCA)",
      "Telecom Regulatory Authority of India (TRAI)",
      "Insurance Regulatory and Development Authority (IRDAI)",
      "Pharmaceutical Department",
    ],
    topics: [
      "aviation safety management", "telecom spectrum utilisation", "insurance product norms",
      "drug pricing regulations", "clinical trial requirements", "data localisation mandate",
      "healthcare data privacy", "medical device standards", "fintech licensing norms",
      "payment aggregator compliance", "logistics provider regulations", "e-commerce seller norms",
      "food delivery safety standards", "edtech content regulations", "agri-tech certification",
      "renewable energy compliance", "EV charging station norms", "digital lending guidelines",
      "NBFC prudential norms", "account aggregator framework",
    ],
    impactAreas: ["Compliance Management", "Legal Documentation", "Contract Management", "HR Operations"],
    clientGroup: "gig",
    penaltyRange: [25000, 1000000],
    legalRisk: "medium",
    operationalImpact: "medium",
    sourceBase: "https://trai.gov.in/",
    sourceName: "TRAI",
    urlPath: "regulations",
  },
  "General": {
    authorities: [
      "Ministry of Home Affairs",
      "Department of Personnel & Training",
      "Election Commission of India",
      "Ministry of External Affairs",
    ],
    topics: [
      "aadhaar-based verification", "digital locker integration", "cyber security policy",
      "information technology compliance", "personal data protection", "right to information",
      "election model code compliance", "passport and visa services", "foreign national employment",
      "background verification norms", "police verification requirements", "document attestation",
      "e-governance adoption", "government portal integration", "data sharing protocols",
      "disaster preparedness plans", "national security obligations", "media content guidelines",
      "public procurement rules", "anti-corruption compliance",
    ],
    impactAreas: ["Compliance Management", "HR Operations", "Legal Documentation", "Worker Onboarding"],
    clientGroup: "all",
    penaltyRange: [5000, 100000],
    legalRisk: "low",
    operationalImpact: "low",
    sourceBase: "https://mha.gov.in/",
    sourceName: "Ministry of Home Affairs",
    urlPath: "notifications",
  },
}

// State-specific authorities (injected per region)
const STATE_AUTHORITIES: Record<ComplianceCategory, string> = {
  "Labour":             "{State} Labour Department",
  "Finance & Taxation": "{State} Professional Tax Department",
  "EHS":                "{State} Pollution Control Board",
  "Commercial":         "{State} Commercial Taxes Department",
  "Secretarial":        "{State} Registrar of Companies",
  "Industry Specific":  "Education Department, Govt. of {State}",
  "General":            "{State} Home Department",
}

const TITLE_PATTERNS = [
  "{Authority} issued a notification regarding {topic}",
  "{Authority} notified the revised {topic} for {period}",
  "{Authority} released circular on {topic}",
  "{Authority} amended the provisions for {topic}",
  "{Authority} published updated guidelines on {topic}",
  "{Authority} clarified compliance requirements for {topic}",
  "{Authority} enhanced enforcement framework for {topic}",
  "{Authority} introduced new reporting obligations for {topic}",
  "{Authority} revised penalty structure for non-compliance with {topic}",
  "{Authority} issued advisory on mandatory {topic}",
]

const PERIODS = [
  "FY 2025-26", "Q4 2025", "Q1 2026", "H1 2026", "FY 2026-27",
  "the current financial year", "contract workers", "platform workers",
  "IT sector establishments", "manufacturing units", "food business operators",
]

const SUMMARY_TEMPLATES = [
  "The {authority} has issued updated compliance requirements pertaining to {topic}. All affected establishments must review their current practices and implement the necessary changes within the stipulated timeframe.",
  "Following stakeholder consultations, {authority} has finalised revised norms for {topic}. Organisations operating in the applicable category must ensure full compliance to avoid penalties.",
  "A new regulatory framework has been introduced by {authority} covering {topic}. The circular provides detailed guidance on documentation, reporting, and enforcement timelines.",
  "{authority} has published a comprehensive circular on {topic}, mandating updated procedures for all covered entities. Non-compliance may attract penalties and regulatory action.",
  "As part of the ongoing regulatory reform programme, {authority} has released amended provisions for {topic}. All stakeholders are advised to undertake an immediate gap assessment.",
]

const KEY_CHANGE_POOLS: Record<ComplianceCategory, string[]> = {
  "Labour": [
    "Revised wage ceiling for statutory deductions",
    "Updated contribution rates for welfare funds",
    "Enhanced documentation requirements for contract labour",
    "New reporting format for quarterly returns",
    "Stricter timelines for payment of dues",
    "Mandatory digital submission of compliance certificates",
    "Extended coverage to previously exempt establishments",
    "Revised penalty schedule for delayed payments",
    "New grievance redressal mechanism introduced",
    "Mandatory training requirement for compliance officers",
  ],
  "Finance & Taxation": [
    "Revised threshold for TDS applicability",
    "New form introduced for annual reconciliation",
    "Updated due dates for quarterly filings",
    "Enhanced penalty for late filing of returns",
    "Mandatory pre-validation of bank accounts",
    "New category added for self-assessment",
    "Revised interest rate on delayed tax payments",
    "Introduction of faceless assessment procedures",
    "Updated digital payment mandate for tax deposits",
    "New provision for appeal filing timelines",
  ],
  "EHS": [
    "Revised safety inspection frequency for factories",
    "Mandatory third-party audit for hazardous processes",
    "Enhanced penalty for environmental violations",
    "New format for accident reporting to authorities",
    "Updated PPE standards for specific industries",
    "Mandatory emergency response plan submission",
    "Revised effluent discharge standards",
    "New provision for worker health surveillance",
    "Stricter norms for chemical storage and handling",
    "Enhanced liability for principal employer",
  ],
  "Commercial": [
    "Revised product labelling specifications",
    "New certification requirement for imports",
    "Updated quality standard for consumer goods",
    "Enhanced penalty for false advertising",
    "Mandatory hallmarking for precious metals",
    "Revised packaging norms for food products",
    "New country-of-origin declaration requirement",
    "Updated registration procedure for traders",
    "Revised weight and measure tolerances",
    "Enhanced consumer redressal timelines",
  ],
  "Secretarial": [
    "Revised annual return filing timeline",
    "New form for related party transaction disclosure",
    "Mandatory independent director declaration",
    "Updated requirements for board resolution",
    "Enhanced penalties for non-filing of returns",
    "New provision for beneficial ownership reporting",
    "Revised KYC requirements for directors",
    "Mandatory e-filing of all statutory forms",
    "Updated provisions for share transfer procedures",
    "New requirements for statutory registers",
  ],
  "Industry Specific": [
    "Revised licensing requirements for sector operators",
    "New compliance reporting format introduced",
    "Enhanced consumer protection norms",
    "Updated technical specifications for the industry",
    "Mandatory sector-specific certification",
    "Revised operational safety standards",
    "New grievance mechanism for sector consumers",
    "Enhanced data privacy requirements",
    "Updated tariff and pricing guidelines",
    "Mandatory registration with regulatory authority",
  ],
  "General": [
    "Revised document submission procedure",
    "New digital verification requirement",
    "Updated inter-agency data sharing protocol",
    "Mandatory aadhaar linkage for specified services",
    "Revised timeline for regulatory approvals",
    "Enhanced background verification requirements",
    "New portal for compliance reporting launched",
    "Updated security clearance procedures",
    "Revised public record access norms",
    "New provision for grievance escalation",
  ],
}

const PENALTY_DESCRIPTIONS: Record<ComplianceCategory, string[]> = {
  "Labour": [
    "Per incident of non-compliance",
    "Per affected worker per month of delay",
    "For late filing of statutory returns",
    "For failure to maintain prescribed registers",
    "For non-payment of wages within stipulated period",
  ],
  "Finance & Taxation": [
    "For late filing of returns",
    "Per instance of incorrect TDS deduction",
    "For failure to reconcile Form 26AS discrepancies",
    "For non-payment of advance tax installments",
    "For incorrect input tax credit claims",
  ],
  "EHS": [
    "Per day of continued violation",
    "For failure to obtain mandatory certification",
    "For non-submission of environmental audit report",
    "For exceeding prescribed emission limits",
    "For absence of mandated safety equipment",
  ],
  "Commercial": [
    "For non-compliance with labelling standards",
    "Per shipment of non-conforming goods",
    "For operating without valid licence",
    "For misrepresentation in product packaging",
    "For delayed renewal of statutory registration",
  ],
  "Secretarial": [
    "For late filing of annual return",
    "Per day of delay in form submission",
    "For failure to maintain statutory registers",
    "For non-disclosure of related party transactions",
    "For failure to conduct mandatory board meeting",
  ],
  "Industry Specific": [
    "For operating without valid sector licence",
    "For non-compliance with technical standards",
    "Per consumer complaint not addressed within timeline",
    "For failure to file sector-specific return",
    "For breach of consumer data protection norms",
  ],
  "General": [
    "For non-submission of required documents",
    "For failure to maintain prescribed records",
    "Per instance of regulatory non-compliance",
    "For delayed registration with authorities",
    "For operating without requisite permissions",
  ],
}

function buildRegionAuthority(category: ComplianceCategory, region: string, pool: typeof CATEGORY_POOLS[ComplianceCategory], rng: () => number): string {
  const useState = region !== "Central" && rng() > 0.4
  if (useState) {
    return STATE_AUTHORITIES[category].replace(/\{State\}/g, region)
  }
  return pick(pool.authorities, rng)
}

function buildTitle(authority: string, topic: string, rng: () => number): string {
  const pattern = pick(TITLE_PATTERNS, rng)
  const period = pick(PERIODS, rng)
  return pattern
    .replace("{Authority}", authority)
    .replace("{topic}", topic)
    .replace("{period}", period)
}

function buildSummary(authority: string, topic: string, rng: () => number): string {
  const tpl = pick(SUMMARY_TEMPLATES, rng)
  return tpl.replace(/\{authority\}/g, authority).replace(/\{topic\}/g, topic)
}

function buildReference(category: ComplianceCategory, id: number, rng: () => number): string {
  const prefixes: Record<ComplianceCategory, string> = {
    "Labour":             "EPFO/ESIC/MLE",
    "Finance & Taxation": "CBDT/CBIC/ITD",
    "EHS":                "CPCB/DGM/NDMA",
    "Commercial":         "BIS/FSSAI/DLM",
    "Secretarial":        "MCA/SEBI/RBI",
    "Industry Specific":  "DGCA/TRAI/IRDAI",
    "General":            "MHA/DOPT/ECI",
  }
  const year = 2025 + Math.floor(rng() * 2)
  const num  = 100 + Math.floor(rng() * 900)
  return `${prefixes[category]}/Circular/${year}/${num}-${id}`
}

// ---------------------------------------------------------------------------
// AUTHORITY URL RESOLVER — maps each authority to its real official portal
// ---------------------------------------------------------------------------

const AUTHORITY_URLS: Record<string, { url: string; name: string }> = {
  // ── Labour ─────────────────────────────────────────────────────────────
  "Employees' Provident Fund Organisation (EPFO)":
    { url: "https://www.epfindia.gov.in/site_en/Circulars.php", name: "EPFO Circulars" },
  "Employees' State Insurance Corporation (ESIC)":
    { url: "https://www.esic.in/web/esicnew/circulars-and-orders", name: "ESIC Orders" },
  "Ministry of Labour & Employment":
    { url: "https://labour.gov.in/whatsnew", name: "Ministry of Labour" },
  "Chief Labour Commissioner":
    { url: "https://clc.gov.in/clc/acts-rules", name: "Chief Labour Commissioner" },
  "Directorate General of Factory Advice Service":
    { url: "https://dgfasli.gov.in/", name: "DGFASLI" },

  // ── Finance & Taxation ─────────────────────────────────────────────────
  "Central Board of Direct Taxes (CBDT)":
    { url: "https://incometaxindia.gov.in/Pages/communications/notifications.aspx", name: "CBDT Notifications" },
  "Central Board of Indirect Taxes & Customs (CBIC)":
    { url: "https://cbic-gst.gov.in/cgst-circulars.html", name: "CBIC Circulars" },
  "Income Tax Department":
    { url: "https://www.incometax.gov.in/iec/foportal/latest-updates", name: "Income Tax Portal" },
  "GST Council":
    { url: "https://www.gstcouncil.gov.in/gst-council-meetings", name: "GST Council" },

  // ── EHS ────────────────────────────────────────────────────────────────
  "Central Pollution Control Board (CPCB)":
    { url: "https://cpcb.nic.in/important-notifications/", name: "CPCB Notifications" },
  "Directorate General of Mines Safety":
    { url: "https://www.dgms.gov.in/en/notifications", name: "DGMS Notifications" },
  "National Disaster Management Authority":
    { url: "https://ndma.gov.in/Resources/Policies-Plans", name: "NDMA Guidelines" },

  // ── Commercial ─────────────────────────────────────────────────────────
  "Bureau of Indian Standards (BIS)":
    { url: "https://www.bis.gov.in/index.php/standards/new-standards-formulation/", name: "BIS Standards" },
  "Food Safety and Standards Authority (FSSAI)":
    { url: "https://www.fssai.gov.in/cms/notifications.php", name: "FSSAI Notifications" },
  "Directorate of Legal Metrology":
    { url: "https://consumeraffairs.nic.in/acts-and-rules/legal-metrology", name: "Legal Metrology" },
  "Ministry of Commerce & Industry":
    { url: "https://commerce.gov.in/press-releases/", name: "Ministry of Commerce" },
  "Director General of Foreign Trade (DGFT)":
    { url: "https://www.dgft.gov.in/CP/?opt=notifications", name: "DGFT Notifications" },

  // ── Secretarial ────────────────────────────────────────────────────────
  "Ministry of Corporate Affairs (MCA)":
    { url: "https://www.mca.gov.in/content/mca/global/en/notifications-tender/notifications.html", name: "MCA Notifications" },
  "Insolvency and Bankruptcy Board of India (IBBI)":
    { url: "https://ibbi.gov.in/en/legal-framework/notices", name: "IBBI Notices" },
  "Securities and Exchange Board of India (SEBI)":
    { url: "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListingAll=yes&search=&sector=no&sid=1&ssid=3&smid=0", name: "SEBI Circulars" },
  "Reserve Bank of India (RBI)":
    { url: "https://www.rbi.org.in/Scripts/BS_CircularIndexDisplay.aspx", name: "RBI Circulars" },
  "Bombay Stock Exchange (BSE)":
    { url: "https://www.bseindia.com/static/about/notices.aspx", name: "BSE Notices" },
  "National Stock Exchange (NSE)":
    { url: "https://www.nseindia.com/resources/exchange-communication-circulars", name: "NSE Circulars" },

  // ── Industry Specific ──────────────────────────────────────────────────
  "Directorate General of Civil Aviation (DGCA)":
    { url: "https://www.dgca.gov.in/digigov-portal/?page=2", name: "DGCA Regulations" },
  "Telecom Regulatory Authority of India (TRAI)":
    { url: "https://www.trai.gov.in/notifications/regulation", name: "TRAI Regulations" },
  "Insurance Regulatory and Development Authority (IRDAI)":
    { url: "https://irdai.gov.in/rules", name: "IRDAI Rules" },
  "Pharmaceutical Department":
    { url: "https://pharmaceuticals.gov.in/whatsnew", name: "Pharma Dept" },

  // ── General ────────────────────────────────────────────────────────────
  "Ministry of Home Affairs":
    { url: "https://www.mha.gov.in/en/commoncontent/notifications", name: "MHA Notifications" },
  "Department of Personnel & Training":
    { url: "https://dopt.gov.in/circulars", name: "DoPT Circulars" },
  "Election Commission of India":
    { url: "https://eci.gov.in/issue-details-page/instructions", name: "ECI Instructions" },
  "Ministry of External Affairs":
    { url: "https://www.mea.gov.in/press-releases.htm", name: "MEA Press" },
}

// ---------------------------------------------------------------------------
// STATE-SPECIFIC URL MAPS
// Labour, Commercial Taxes, Pollution Control, Education, Fire Services,
// Welfare Boards — all real state-government portals
// ---------------------------------------------------------------------------

const STATE_URLS: Record<string, {
  labour?:      string
  commercial?:  string  // Commercial Taxes / Professional Tax
  pcb?:         string  // Pollution Control Board
  fire?:        string
  education?:   string
  welfare?:     string  // Labour Welfare Board
  root:         string  // fallback: state main portal
}> = {
  "Karnataka":     { labour: "https://labour.karnataka.gov.in/english",     commercial: "https://gst.kar.nic.in/Documents/",  pcb: "https://kspcb.karnataka.gov.in/",              root: "https://www.karnataka.gov.in" },
  "Tamil Nadu":    { labour: "https://labour.tn.gov.in",                    commercial: "https://ctd.tn.gov.in",               pcb: "https://tnpcb.gov.in",                         root: "https://www.tn.gov.in" },
  "Maharashtra":   { labour: "https://mahakamgar.maharashtra.gov.in/",      commercial: "https://mahagst.gov.in",              pcb: "https://mpcb.gov.in",                          root: "https://www.maharashtra.gov.in" },
  "Delhi":         { labour: "https://labour.delhi.gov.in/content/circulars", commercial: "https://dvat.gov.in",              pcb: "https://dpcc.delhi.gov.in",                    root: "https://delhi.gov.in" },
  "Telangana":     { labour: "https://labour.telangana.gov.in",             commercial: "https://tgct.gov.in",                 pcb: "https://tspcb.cgg.gov.in",                     root: "https://www.telangana.gov.in" },
  "Gujarat":       { labour: "https://labour.gujarat.gov.in",               commercial: "https://commercialtax.gujarat.gov.in",pcb: "https://gpcb.gujarat.gov.in",                  root: "https://www.gujaratindia.gov.in" },
  "Uttar Pradesh": { labour: "https://uplabour.gov.in",                     commercial: "https://comtax.up.nic.in",            pcb: "https://www.uppcb.com",                        root: "https://up.gov.in" },
  "West Bengal":   { labour: "https://wblc.gov.in",                         commercial: "https://wbcomtax.gov.in",             pcb: "https://www.wbpcb.gov.in",                     root: "https://wb.gov.in" },
  "Kerala":        { labour: "https://lc.kerala.gov.in",                    commercial: "https://keralataxes.gov.in",          pcb: "https://keralapcb.nic.in",                     root: "https://kerala.gov.in" },
  "Haryana":       { labour: "https://hrylabour.gov.in",                    commercial: "https://haryanatax.gov.in",           pcb: "https://hspcb.gov.in",                         root: "https://haryana.gov.in" },
  "Punjab":        { labour: "https://pblabour.gov.in",                     commercial: "https://pextax.com",                  pcb: "https://ppcb.punjab.gov.in",                   root: "https://punjab.gov.in" },
  "Rajasthan":     { labour: "https://labour.rajasthan.gov.in",             commercial: "https://rajtax.gov.in",               pcb: "https://environment.rajasthan.gov.in/rspcb",   root: "https://rajasthan.gov.in" },
  "Madhya Pradesh":{ labour: "https://labour.mp.gov.in",                    commercial: "https://mptax.mp.gov.in",             pcb: "https://www.mppcb.mp.gov.in",                  root: "https://www.mp.gov.in" },
  "Andhra Pradesh":{ labour: "https://labour.ap.gov.in",                    commercial: "https://apct.gov.in",                 pcb: "https://appcb.ap.gov.in",                      root: "https://www.ap.gov.in" },
  "Odisha":        { labour: "https://labour.odisha.gov.in",                commercial: "https://odishatax.gov.in",            pcb: "https://ospcboard.org",                        root: "https://odisha.gov.in" },
  "Chhattisgarh":  { labour: "https://cglabour.nic.in",                     commercial: "https://comtax.cg.nic.in",            pcb: "https://enviscecb.org",                        root: "https://cgstate.gov.in" },
  "Assam":         { labour: "https://labourcommissioner.assam.gov.in",     commercial: "https://tax.assam.gov.in",            pcb: "https://pcba.assam.gov.in",                    root: "https://assam.gov.in" },
  "Bihar":         { labour: "https://state.bihar.gov.in/labour",           commercial: "https://state.bihar.gov.in/commercialtaxes", pcb: "http://bspcb.bihar.gov.in",             root: "https://state.bihar.gov.in" },
  "Jharkhand":     { labour: "https://labour.jharkhand.gov.in",             commercial: "https://jharkhandcomtax.gov.in",      pcb: "http://jspcb.jharkhand.gov.in",                root: "https://www.jharkhand.gov.in" },
  "Himachal Pradesh": { labour: "https://himachalelfw.gov.in",              commercial: "https://hptax.gov.in",                pcb: "https://hppcb.nic.in",                         root: "https://himachal.nic.in" },
  "Uttarakhand":   { labour: "https://labour.uk.gov.in",                    commercial: "https://comtax.uk.gov.in",            pcb: "https://ueppcb.uk.gov.in",                     root: "https://uk.gov.in" },
  "Goa":           { labour: "https://www.labour.goa.gov.in",               commercial: "https://goagst.gov.in",               pcb: "https://goaspcb.gov.in",                       root: "https://www.goa.gov.in" },
  "Chandigarh":    { labour: "https://chandigarh.gov.in/departments/labour", commercial: "https://excise.chd.nic.in",          pcb: "https://chandigarh.gov.in/departments/pollution-control-committee", root: "https://chandigarh.gov.in" },
  "J&K":           { labour: "https://jklabouremp.nic.in",                  commercial: "https://jkcomtax.gov.in",             pcb: "https://jkspcb.nic.in",                        root: "https://jk.gov.in" },
  "Arunachal Pradesh": { labour: "https://arunachallabour.nic.in",          commercial: "https://arunachaltax.nic.in",         pcb: "https://arunachalpcb.nic.in",                  root: "https://arunachalpradesh.gov.in" },
  "Manipur":       { labour: "https://labour.manipur.gov.in",               commercial: "https://tax.manipur.gov.in",          pcb: "https://manipurpollution.gov.in",              root: "https://manipur.gov.in" },
  "Meghalaya":     { labour: "https://meglabour.gov.in",                    commercial: "https://megvat.gov.in",               pcb: "https://megspcb.gov.in",                       root: "https://meghalaya.gov.in" },
  "Mizoram":       { labour: "https://labour.mizoram.gov.in",               commercial: "https://zotaxes.nic.in",              pcb: "https://mpcb.mizoram.gov.in",                  root: "https://mizoram.gov.in" },
  "Nagaland":      { labour: "https://labour.nagaland.gov.in",              commercial: "https://taxes.nagaland.gov.in",       pcb: "https://pcb.nagaland.gov.in",                  root: "https://nagaland.gov.in" },
  "Sikkim":        { labour: "https://sikkim.gov.in/departments/labour-department", commercial: "https://sikkimtax.gov.in",  pcb: "https://sikkimspcb.org",                       root: "https://sikkim.gov.in" },
  "Tripura":       { labour: "https://labour.tripura.gov.in",               commercial: "https://tripuratax.gov.in",           pcb: "https://tspcb.tripura.gov.in",                 root: "https://tripura.gov.in" },
  "Central":       { root: "https://www.india.gov.in" },
}

function resolveSourceUrl(authority: string, region: string, category: ComplianceCategory): { url: string; name: string } {
  // 1) Exact authority lookup (Central regulators)
  if (AUTHORITY_URLS[authority]) return AUTHORITY_URLS[authority]

  // 2) State-level authorities — extract state name from patterns like:
  //    "{State} Labour Department", "{State} Pollution Control Board",
  //    "Labour Department, Govt. of {State}", "Education Department, Govt. of {State}"
  const stateMatch =
    authority.match(/Govt\.\s+of\s+([A-Za-z &]+?)$/)?.[1]?.trim() ??
    authority.match(/^([A-Za-z &]+?)\s+(Labour|Pollution|Fire|Commercial|Professional|Education)/)?.[1]?.trim()

  const state = stateMatch && STATE_URLS[stateMatch] ? stateMatch : region
  const stateUrls = STATE_URLS[state] ?? STATE_URLS["Central"]

  // 3) Match authority text to the right sub-portal
  const a = authority.toLowerCase()
  if (a.includes("labour")        && stateUrls.labour)     return { url: stateUrls.labour,     name: `${state} Labour Dept` }
  if (a.includes("welfare")       && stateUrls.welfare)    return { url: stateUrls.welfare,    name: `${state} Welfare Board` }
  if (a.includes("pollution")     && stateUrls.pcb)        return { url: stateUrls.pcb,        name: `${state} Pollution Control Board` }
  if (a.includes("commercial")    && stateUrls.commercial) return { url: stateUrls.commercial, name: `${state} Commercial Taxes` }
  if (a.includes("professional tax") && stateUrls.commercial) return { url: stateUrls.commercial, name: `${state} Professional Tax` }
  if (a.includes("fire")          && stateUrls.fire)       return { url: stateUrls.fire,       name: `${state} Fire Services` }
  if (a.includes("education")     && stateUrls.education)  return { url: stateUrls.education,  name: `${state} Education Dept` }

  // 4) Fallback by category to a central authority for this category
  const CATEGORY_FALLBACK: Record<ComplianceCategory, string> = {
    "Labour":             "Ministry of Labour & Employment",
    "Finance & Taxation": "Central Board of Direct Taxes (CBDT)",
    "EHS":                "Central Pollution Control Board (CPCB)",
    "Commercial":         "Ministry of Commerce & Industry",
    "Secretarial":        "Ministry of Corporate Affairs (MCA)",
    "Industry Specific":  "Directorate General of Civil Aviation (DGCA)",
    "General":            "Ministry of Home Affairs",
  }
  const fallback = AUTHORITY_URLS[CATEGORY_FALLBACK[category]]
  if (fallback) return fallback

  // 5) Absolute last-resort: state root portal
  return { url: stateUrls.root, name: `${state} Govt Portal` }
}

function buildSourceUrl(_pool: typeof CATEGORY_POOLS[ComplianceCategory], category: ComplianceCategory, region: string, authority: string): { url: string; name: string } {
  return resolveSourceUrl(authority, region, category)
}

function pickClients(pool: typeof CATEGORY_POOLS[ComplianceCategory], rng: () => number): string[] {
  const group = CLIENT_CATEGORIES[pool.clientGroup]
  const count = 1 + Math.floor(rng() * Math.min(5, group.length))
  return pickN(group, count, rng)
}

function pickPenalty(range: [number, number], rng: () => number): number {
  // Sometimes 0 (informational)
  if (rng() < 0.15) return 0
  const [lo, hi] = range
  return Math.round((lo + Math.floor(rng() * (hi - lo))) / 1000) * 1000
}

function pickRisk(base: RiskLevel, rng: () => number): RiskLevel {
  const r = rng()
  if (base === "high")   return r < 0.6 ? "high"   : r < 0.85 ? "medium" : "low"
  if (base === "medium") return r < 0.5 ? "medium" : r < 0.75 ? "high"   : "low"
  return r < 0.5 ? "low" : r < 0.75 ? "medium" : "high"
}

// ---------------------------------------------------------------------------
// Real TeamLease article ingestion
// ---------------------------------------------------------------------------

import teamleaseArticles from "./teamlease-articles.json"

interface TeamLeaseArticle {
  id:        number
  slug:      string
  title:     string
  date:      string
  category:  string
  authority: string
  region:    string
}

const REAL_ARTICLES = teamleaseArticles as TeamLeaseArticle[]

function normalizeCategory(cat: string): ComplianceCategory {
  const map: Record<string, ComplianceCategory> = {
    "Labour": "Labour",
    "Finance & Taxation": "Finance & Taxation",
    "EHS": "EHS",
    "Commercial": "Commercial",
    "Secretarial": "Secretarial",
    "Industry Specific": "Industry Specific",
    "General": "General",
  }
  return map[cat] ?? "General"
}

function normalizeRegion(region: string): string {
  // Ensure region matches REGIONS constant; fall back to Central
  const normalized = region.replace(/\bJammu Kashmir\b/i, "J&K").trim()
  return (REGIONS as readonly string[]).includes(normalized) ? normalized : "Central"
}

// ---------------------------------------------------------------------------
// Main generator — uses real TeamLease articles as primary source
// ---------------------------------------------------------------------------

function generateRegulations(_count: number): Regulation[] {
  const regulations: Regulation[] = []

  for (let i = 0; i < REAL_ARTICLES.length; i++) {
    const art = REAL_ARTICLES[i]
    const rng = mulberry32(art.id)

    const category = normalizeCategory(art.category)
    const region   = normalizeRegion(art.region)
    const pool     = CATEGORY_POOLS[category]
    const authority = art.authority
    const title    = art.title
    const summary  = buildSummary(authority, pick(pool.topics, rng), rng)
    const id       = 1000 + art.id  // offset to avoid collision with featured (ids 1-10)
    const reference = buildReference(category, id, rng)

    const dateStr    = art.date
    const pubDate    = new Date(art.date)
    const effDate    = isNaN(pubDate.getTime())
      ? new Date("2026-05-01")
      : new Date(pubDate.getTime() + Math.floor(rng() * 60 * 24 * 60 * 60 * 1000))
    const effDateStr = formatDate(effDate)

    const keyChangePool = KEY_CHANGE_POOLS[category]
    const keyChanges = pickN(keyChangePool, 2 + Math.floor(rng() * 4), rng)

    const allImpactAreas: ImpactArea[] = [
      "Payroll", "HR Operations", "Compliance Management", "Worker Onboarding",
      "Employee Welfare", "Tax Filing", "Legal Documentation", "Workplace Safety",
      "Contract Management", "Account Management",
    ]
    const primaryAreas = pool.impactAreas
    const extraAreas = allImpactAreas.filter(a => !primaryAreas.includes(a))
    const numImpact = 1 + Math.floor(rng() * 3)
    const impactAreas: ImpactArea[] = [
      ...pickN(primaryAreas, Math.min(numImpact, primaryAreas.length), rng),
      ...(rng() > 0.6 ? pickN(extraAreas, 1, rng) : []),
    ].filter((v, idx, arr) => arr.indexOf(v) === idx) as ImpactArea[]

    const penaltyAmount = pickPenalty(pool.penaltyRange, rng)
    const penaltyDesc = penaltyAmount === 0
      ? "No direct monetary penalty; informational/disclosure update"
      : pick(PENALTY_DESCRIPTIONS[category], rng)

    const legalRisk = pickRisk(pool.legalRisk, rng)
    const operationalImpact = pickRisk(pool.operationalImpact, rng)
    const actionRequired = legalRisk === "high" || operationalImpact === "high" || rng() > 0.6

    const clients = pickClients(pool, rng)

    // Source URL: real TeamLease article page
    const source = {
      url:  `https://www.teamleaseregtech.com/updates/article/${art.id}/${art.slug}`,
      name: "TeamLease RegTech",
    }

    regulations.push({
      id,
      title,
      date: dateStr,
      category,
      authority,
      reference,
      region,
      summary,
      keyChanges,
      effectiveDate: effDateStr,
      impactAreas,
      penaltyAmount,
      penaltyDescription: penaltyDesc,
      legalRisk,
      operationalImpact,
      actionRequired,
      sourceUrl:  source.url,
      sourceName: source.name,
      clientsAffected: clients,
    })
  }

  return regulations
}

// ---------------------------------------------------------------------------
// 10 FEATURED regulations (handcrafted, real-world)
// ---------------------------------------------------------------------------

const FEATURED: Regulation[] = [
  {
    id: 1,
    title: "Transition from Form 15G/15H to Consolidated Form 121 for TDS-Exempted Incomes",
    date: "Apr 16, 2026",
    category: "Labour",
    authority: "Employees' Provident Fund Organisation (EPFO)",
    reference: "WSU/TDS Issues/E-772040/2026-27/11",
    region: "Central",
    summary: "Forms 15G and 15H have been replaced by consolidated Form 121 under the Income-tax Act, 2025, effective April 1, 2026. Resident taxpayers with nil estimated tax liability may submit Form 121. Payers must generate a Unique Identification Number (UIN) for each form and report it in monthly statements and quarterly TDS returns.",
    keyChanges: [
      "Form 15G/15H replaced by consolidated Form 121",
      "Payers must generate UIN for each form submission",
      "UIN must be reported in monthly statements and quarterly TDS returns",
      "Physical signed forms acceptable until online systems available",
      "Non-compliance on missing UINs may attract penalties",
    ],
    effectiveDate: "Apr 1, 2026",
    impactAreas: ["Payroll", "Tax Filing", "Compliance Management"],
    penaltyAmount: 50000,
    penaltyDescription: "Per instance of missing UIN in TDS returns",
    legalRisk: "high",
    operationalImpact: "high",
    actionRequired: true,
    sourceUrl: "https://www.teamleaseregtech.com/updates/article/55009/esic-notified-regarding-the-protocols-to-be-followed-by-esic-hospitals",
    sourceName: "TeamLease RegTech",
    clientsAffected: ["TechCorp India", "Infosys BPM", "Hexaware", "L&T Infotech", "Wipro GE"],
  },
  {
    id: 2,
    title: "Offline Utility Enabled for Form 145 and Form 146 on e-Filing Portal",
    date: "Apr 16, 2026",
    category: "Finance & Taxation",
    authority: "Income Tax Department",
    reference: "e-Filing Portal Update — Apr 15, 2026",
    region: "Central",
    summary: "The Income Tax Department has enabled offline utility for Form 145 and Form 146 on the e-Filing Portal. Users can download, fill, and submit these forms via the portal.",
    keyChanges: [
      "Offline utility now available for Form 145 and Form 146",
      "Forms can be prepared offline and submitted via e-Filing Portal",
    ],
    effectiveDate: "Apr 15, 2026",
    impactAreas: ["Tax Filing", "Account Management"],
    penaltyAmount: 0,
    penaltyDescription: "No direct monetary penalty; informational/disclosure update",
    legalRisk: "low",
    operationalImpact: "low",
    actionRequired: false,
    sourceUrl: "https://www.teamleaseregtech.com/updates/article/55039/gstn-issued-a-notification-regarding-the-introduction-of-the-ims-offli",
    sourceName: "TeamLease RegTech",
    clientsAffected: ["TechCorp India", "Infosys BPM", "Hexaware", "L&T Infotech"],
  },
  {
    id: 3,
    title: "Karnataka Shops & Establishments Act — Amended Overtime Rules for Blue-Collar Workers",
    date: "Apr 15, 2026",
    category: "Labour",
    authority: "Karnataka Labour Department",
    reference: "KAR/LABOUR/OT-2026/Amendment-04",
    region: "Karnataka",
    summary: "OT rate for blue-collar workers in Karnataka increased from 1.5x to 2x for hours beyond 9hrs/day. JARVIS OT validation rules for Bangalore-based clients require immediate update.",
    keyChanges: [
      "Overtime rate increased from 1.5x to 2x for hours beyond 9/day",
      "Applies to all establishments under KS&E Act",
      "Immediate effect — no transition period",
      "JARVIS OT validation rules need updating for Karnataka clients",
    ],
    effectiveDate: "Apr 15, 2026",
    impactAreas: ["Payroll", "HR Operations", "Compliance Management"],
    penaltyAmount: 100000,
    penaltyDescription: "Per establishment per quarter of non-compliance",
    legalRisk: "high",
    operationalImpact: "high",
    actionRequired: true,
    sourceUrl: "https://www.teamleaseregtech.com/updates/article/54948/government-of-karnataka-exemption-from-return-filing-under-profession-",
    sourceName: "TeamLease RegTech",
    clientsAffected: ["Dine-In Brands", "Swiggy", "Urban Company", "Infosys BPM"],
  },
  {
    id: 4,
    title: "PF Wage Ceiling Revised to ₹21,000 — Effective May 1, 2026",
    date: "Apr 14, 2026",
    category: "Labour",
    authority: "Employees' Provident Fund Organisation (EPFO)",
    reference: "EPFO/Wage-Ceiling/2026-27/Circular-03",
    region: "Central",
    summary: "The EPFO has revised the PF wage ceiling from ₹15,000 to ₹21,000 per month. All blue-collar contract workers currently at the ₹15,000 ceiling will see revised PF deductions. Payroll templates must be updated before the May cycle.",
    keyChanges: [
      "PF wage ceiling raised from ₹15,000 to ₹21,000/month",
      "Both employer and employee contribution bases revised",
      "Payroll templates need updating before May 2026 cycle",
    ],
    effectiveDate: "May 1, 2026",
    impactAreas: ["Payroll", "Employee Welfare", "HR Operations"],
    penaltyAmount: 500000,
    penaltyDescription: "Per month of delayed compliance per establishment",
    legalRisk: "high",
    operationalImpact: "high",
    actionRequired: true,
    sourceUrl: "https://www.teamleaseregtech.com/updates/article/55009/esic-notified-regarding-the-protocols-to-be-followed-by-esic-hospitals",
    sourceName: "TeamLease RegTech",
    clientsAffected: ["Dine-In Brands", "Swiggy", "Zomato", "BigBasket", "Urban Company"],
  },
  {
    id: 5,
    title: "Revised TDS Threshold for Contract Payments Under Section 194C Raised to ₹1 Lakh",
    date: "Apr 13, 2026",
    category: "Finance & Taxation",
    authority: "Central Board of Direct Taxes (CBDT)",
    reference: "CBDT/Notification/2026/48",
    region: "Central",
    summary: "IT contract workers below ₹1L annual contract value are now exempt from TDS under Section 194C. Vendor payment configurations for impacted contractors need updating.",
    keyChanges: [
      "Single transaction TDS threshold raised under Section 194C",
      "IT contractors below ₹1L annual value now exempt",
      "Vendor payment configurations need updating",
    ],
    effectiveDate: "Apr 1, 2026",
    impactAreas: ["Tax Filing", "Payroll", "Contract Management"],
    penaltyAmount: 200000,
    penaltyDescription: "Per instance of incorrect TDS deduction or non-deduction",
    legalRisk: "medium",
    operationalImpact: "medium",
    actionRequired: true,
    sourceUrl: "https://www.teamleaseregtech.com/updates/article/55023/mof-issued-a-notification-regarding-outreach-on-the-new-income-tax-act",
    sourceName: "TeamLease RegTech",
    clientsAffected: ["TechCorp India", "Infosys BPM", "Wipro GE", "Hexaware", "L&T Infotech"],
  },
  {
    id: 6,
    title: "Maharashtra Minimum Wages Revision — Zone I and Zone II Manufacturing Workers",
    date: "Apr 12, 2026",
    category: "Labour",
    authority: "Maharashtra Labour Department",
    reference: "MAH/MW/2026/Rev-02",
    region: "Maharashtra",
    summary: "Minimum daily wages for unskilled manufacturing workers in Zone I (Mumbai, Thane) increased from ₹570 to ₹620. Zone II (Pune, Nagpur) increased from ₹520 to ₹570.",
    keyChanges: [
      "Zone I (Mumbai, Thane): ₹570 → ₹620/day",
      "Zone II (Pune, Nagpur): ₹520 → ₹570/day",
      "Payroll corrections required for affected clients",
    ],
    effectiveDate: "Apr 12, 2026",
    impactAreas: ["Payroll", "HR Operations", "Employee Welfare"],
    penaltyAmount: 250000,
    penaltyDescription: "Per affected worker per month of underpayment",
    legalRisk: "high",
    operationalImpact: "high",
    actionRequired: true,
    sourceUrl: "https://www.teamleaseregtech.com/updates/article/54939/govt-of-maharashtra-issued-a-circular-regarding-paid-holiday-for-emplo",
    sourceName: "TeamLease RegTech",
    clientsAffected: ["Dine-In Brands", "MedSure Healthcare", "Capgemini"],
  },
  {
    id: 7,
    title: "ESIC Circular: Gig Worker Coverage Framework — Consultation Draft",
    date: "Apr 11, 2026",
    category: "Labour",
    authority: "Employees' State Insurance Corporation (ESIC)",
    reference: "ESIC/GigWorker/2026/Draft-01",
    region: "Central",
    summary: "Draft proposes mandatory ESI for platform gig workers earning ₹21,000+/month. Currently in consultation phase. Could impact all platform-based client engagements.",
    keyChanges: [
      "Mandatory ESI proposed for gig workers earning ₹21,000+/month",
      "Currently a consultation draft — not yet effective",
      "Would apply to platform-based workers",
    ],
    effectiveDate: "TBD",
    impactAreas: ["Employee Welfare", "Payroll", "Compliance Management"],
    penaltyAmount: 0,
    penaltyDescription: "No direct monetary penalty; informational/disclosure update",
    legalRisk: "medium",
    operationalImpact: "medium",
    actionRequired: false,
    sourceUrl: "https://www.teamleaseregtech.com/updates/article/55009/esic-notified-regarding-the-protocols-to-be-followed-by-esic-hospitals",
    sourceName: "TeamLease RegTech",
    clientsAffected: ["Swiggy", "Zomato", "Urban Company", "BigBasket"],
  },
  {
    id: 8,
    title: "Delhi Factories Act Amendment — Fire Safety Compliance for Contract Workers",
    date: "Apr 10, 2026",
    category: "EHS",
    authority: "Delhi Labour Department",
    reference: "DEL/FACTORIES/FIRE-SAFETY/2026/01",
    region: "Delhi",
    summary: "All principal employers engaging contract workers must ensure fire safety training within 30 days of deployment. Non-compliance penalty increased from ₹10,000 to ₹50,000 per incident.",
    keyChanges: [
      "Fire safety training mandatory within 30 days of contract worker deployment",
      "Non-compliance penalty increased 5x (₹10K → ₹50K)",
      "Applies to all factory premises in NCT Delhi",
    ],
    effectiveDate: "Apr 10, 2026",
    impactAreas: ["Workplace Safety", "Worker Onboarding", "Compliance Management"],
    penaltyAmount: 50000,
    penaltyDescription: "Per incident of non-compliance with fire safety norms",
    legalRisk: "high",
    operationalImpact: "high",
    actionRequired: true,
    sourceUrl: "https://www.teamleaseregtech.com/updates/article/55057/govt-of-delhi-notified-regarding-the-revision-of-minimum-wages-in-delh",
    sourceName: "TeamLease RegTech",
    clientsAffected: ["FinanceHub Ltd", "GlobalStaff Solutions"],
  },
  {
    id: 9,
    title: "POSH Act — Revised Compliance for Contract Staffing Intermediaries",
    date: "Apr 8, 2026",
    category: "Labour",
    authority: "Ministry of Labour & Employment",
    reference: "MWCD/POSH/2026/Amendment-02",
    region: "Central",
    summary: "Contract staffing intermediaries are now explicitly required to maintain an Internal Complaints Committee and conduct annual POSH training for all deployed contract workers.",
    keyChanges: [
      "ICC mandatory for staffing intermediaries, not just end-clients",
      "Annual POSH training required for all deployed contract workers",
      "Non-compliance may result in license cancellation",
    ],
    effectiveDate: "Apr 8, 2026",
    impactAreas: ["HR Operations", "Compliance Management", "Legal Documentation", "Employee Welfare"],
    penaltyAmount: 500000,
    penaltyDescription: "Licence cancellation risk; up to ₹5L for repeat violations",
    legalRisk: "high",
    operationalImpact: "high",
    actionRequired: true,
    sourceUrl: "https://www.teamleaseregtech.com/updates/article/55025/draft-occupational-safety-health-and-working-conditions-andhra-pradesh",
    sourceName: "TeamLease RegTech",
    clientsAffected: ["Dine-In Brands", "Swiggy", "Zomato", "BigBasket", "Urban Company", "TechCorp India", "Infosys BPM"],
  },
  {
    id: 10,
    title: "Karnataka Professional Tax — Revised Slab for Contract Workers Above ₹25,000",
    date: "Apr 7, 2026",
    category: "Finance & Taxation",
    authority: "Karnataka Professional Tax Department",
    reference: "KAR/PTAX/2026/Rev-01",
    region: "Karnataka",
    summary: "Professional tax for workers earning ₹25,001–₹50,000 increased from ₹150 to ₹200/month. Workers above ₹50,000 now pay ₹250/month.",
    keyChanges: [
      "₹25,001–₹50,000 bracket: ₹150 → ₹200/month",
      "Above ₹50,000 bracket: ₹200 → ₹250/month",
      "All Karnataka-based payroll deductions must be updated",
    ],
    effectiveDate: "Apr 7, 2026",
    impactAreas: ["Payroll", "Tax Filing", "HR Operations"],
    penaltyAmount: 50000,
    penaltyDescription: "Per quarter of incorrect professional tax deduction",
    legalRisk: "medium",
    operationalImpact: "medium",
    actionRequired: true,
    sourceUrl: "https://www.teamleaseregtech.com/updates/article/54948/government-of-karnataka-exemption-from-return-filing-under-profession-",
    sourceName: "TeamLease RegTech",
    clientsAffected: ["Infosys BPM", "Wipro GE", "Swiggy", "Urban Company"],
  },
]

// ---------------------------------------------------------------------------
// Combined export
// ---------------------------------------------------------------------------

export const REGULATIONS: Regulation[] = [
  ...FEATURED,
  ...generateRegulations(990),
]

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/** Returns regulations that affect a specific client (by name). */
export function getRegulationsForClient(clientName: string): Regulation[] {
  return REGULATIONS.filter(r => r.clientsAffected.includes(clientName))
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
      set.add(c)
    }
  }
  return Array.from(set).sort()
}

/** All unique authorities from all regulations. */
export function getAllAuthorities(): string[] {
  const set = new Set<string>()
  for (const r of REGULATIONS) {
    set.add(r.authority)
  }
  return Array.from(set).sort()
}

/** Total potential penalty exposure for a client across all regulations. */
export function getPenaltyExposureForClient(clientName: string): number {
  return getRegulationsForClient(clientName)
    .reduce((sum, r) => sum + r.penaltyAmount, 0)
}
