/**
 * Deterministic employee generator.
 * Given a clientId + index, always returns the same employee — no randomness at runtime.
 * This lets us "generate" tens of thousands of employees without storing them.
 */

import type { Employee, JobCategory, EmploymentStatus } from "./types"

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

  return {
    id:               `${clientId}-emp-${index}`,
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

function clientEmailDomain(clientId: string): string {
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
