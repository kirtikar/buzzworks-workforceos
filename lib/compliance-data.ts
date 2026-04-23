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

function buildSourceUrl(pool: typeof CATEGORY_POOLS[ComplianceCategory], _category: ComplianceCategory, region: string): string {
  if (region !== "Central") {
    return `https://${region.toLowerCase().replace(/\s+/g, "")}.gov.in/compliance`
  }
  return `${pool.sourceBase}${pool.urlPath}`
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
// Main generator
// ---------------------------------------------------------------------------

function generateRegulations(count: number): Regulation[] {
  const rng = mulberry32(0xdeadbeef)
  const regulations: Regulation[] = []

  const categories: ComplianceCategory[] = [
    "Labour", "Finance & Taxation", "EHS", "Commercial",
    "Secretarial", "Industry Specific", "General",
  ]

  // Weight distribution: Labour heavy, General light
  const categoryWeights = [0.28, 0.20, 0.14, 0.10, 0.12, 0.10, 0.06]
  const categoryThresholds: number[] = []
  let cum = 0
  for (const w of categoryWeights) {
    cum += w
    categoryThresholds.push(cum)
  }

  function pickCategory(): ComplianceCategory {
    const r = rng()
    for (let i = 0; i < categoryThresholds.length; i++) {
      if (r <= categoryThresholds[i]) return categories[i]
    }
    return "Labour"
  }

  const REGIONS_GEN = REGIONS.filter(r => r !== "Central").concat(
    Array(8).fill("Central") // boost Central
  )

  for (let i = 0; i < count; i++) {
    const id = 11 + i
    const category = pickCategory()
    const pool = CATEGORY_POOLS[category]

    const region = pick(REGIONS_GEN, rng)
    const authority = buildRegionAuthority(category, region, pool, rng)
    const topic = pick(pool.topics, rng)
    const title = buildTitle(authority, topic, rng)
    const summary = buildSummary(authority, topic, rng)
    const reference = buildReference(category, id, rng)

    const pubDate = weightedRandomDate(rng)
    const effDate = new Date(pubDate.getTime() + Math.floor(rng() * 60 * 24 * 60 * 60 * 1000))
    const dateStr = formatDate(pubDate)
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
    const sourceUrl = buildSourceUrl(pool, category, region)

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
      sourceUrl,
      sourceName: pool.sourceName,
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
    sourceUrl: "https://www.epfindia.gov.in/site_en/Circulars.php",
    sourceName: "EPFO Circulars",
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
    sourceUrl: "https://www.incometax.gov.in/iec/foportal/",
    sourceName: "Income Tax e-Filing",
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
    sourceUrl: "https://labour.karnataka.gov.in/page/Acts+and+Rules/en",
    sourceName: "Karnataka Labour",
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
    sourceUrl: "https://incometaxindia.gov.in/Pages/communications/notifications.aspx",
    sourceName: "CBDT Notifications",
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
    sourceUrl: "https://mahakamgar.maharashtra.gov.in/minimum-wages-702.htm",
    sourceName: "Maharashtra Labour",
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
    sourceUrl: "https://www.esic.in/web/esicnew/circulars-and-orders",
    sourceName: "ESIC Orders",
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
    sourceUrl: "https://labour.delhi.gov.in/content/factories-act",
    sourceName: "Delhi Labour",
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
    sourceUrl: "https://wcd.nic.in/act/sexual-harassment-women-workplace-prevention-prohibition-and-redressal-act-2013",
    sourceName: "Ministry of WCD",
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
    sourceUrl: "https://ctax.karnataka.gov.in/english",
    sourceName: "Karnataka CTAX",
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
