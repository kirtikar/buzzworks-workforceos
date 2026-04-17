"use client"

import { useState, useMemo } from "react"
import Sidebar from "@/components/Sidebar"
import BottomNav from "@/components/BottomNav"
import {
  Scale, ExternalLink, Search, AlertTriangle,
  MapPin, ChevronDown, Calendar, Building2,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "Labour" | "Finance & Taxation" | "EHS" | "Commercial" | "Secretarial"

interface Regulation {
  id:             number
  title:          string
  date:           string
  category:       Category
  authority:      string
  reference:      string
  jurisdiction:   string
  summary:        string
  keyChanges:     string[]
  effectiveDate:  string
  actionRequired: boolean
  sourceUrl:      string
  sourceName:     string
  clientsAffected: string[]
}

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIES: { value: Category | "all"; label: string }[] = [
  { value: "all",                 label: "All" },
  { value: "Labour",             label: "Labour" },
  { value: "Finance & Taxation", label: "Finance & Tax" },
  { value: "EHS",                label: "EHS" },
  { value: "Commercial",         label: "Commercial" },
  { value: "Secretarial",       label: "Secretarial" },
]

const STATES = [
  "All", "Central", "Karnataka", "Maharashtra", "Delhi", "Tamil Nadu",
  "Telangana", "Gujarat", "Uttar Pradesh", "Haryana", "Kerala",
]

// ─── Regulations data ─────────────────────────────────────────────────────────

const REGULATIONS: Regulation[] = [
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
    actionRequired: true,
    sourceUrl: "https://www.epfindia.gov.in/site_en/Circulars.php",
    sourceName: "EPFO Circulars Portal",
    clientsAffected: ["All clients with PF-enrolled workers"],
  },
  {
    id: 2,
    title: "Offline Utility Enabled for Form 145 and Form 146 on e-Filing Portal",
    date: "Apr 16, 2026",
    category: "Finance & Taxation",
    authority: "Income Tax Department",
    reference: "e-Filing Portal Update — Apr 15, 2026",
    jurisdiction: "Central",
    summary: "The Income Tax Department has enabled offline utility for Form 145 and Form 146 on the e-Filing Portal. Users can download, fill, and submit these forms via the portal under Downloads → Income Tax Forms → Income Tax Act, 2025.",
    keyChanges: [
      "Offline utility now available for Form 145 and Form 146",
      "Forms can be prepared offline and submitted via e-Filing Portal",
      "Accessible under Downloads → Income Tax Forms → Income Tax Act, 2025",
    ],
    effectiveDate: "Apr 15, 2026",
    actionRequired: false,
    sourceUrl: "https://www.incometax.gov.in/iec/foportal/",
    sourceName: "Income Tax e-Filing Portal",
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
    summary: "OT rate for blue-collar workers in Karnataka increased from 1.5x to 2x for hours beyond 9hrs/day. This amendment applies to all establishments registered under the Karnataka Shops and Establishments Act. JARVIS OT validation rules for Bangalore-based clients require immediate update.",
    keyChanges: [
      "Overtime rate increased from 1.5x to 2x for hours beyond 9/day",
      "Applies to all establishments under KS&E Act",
      "Immediate effect — no transition period",
      "JARVIS OT validation rules need updating for Karnataka clients",
    ],
    effectiveDate: "Apr 15, 2026",
    actionRequired: true,
    sourceUrl: "https://labour.karnataka.gov.in/page/Acts+and+Rules/en",
    sourceName: "Karnataka Labour Department",
    clientsAffected: ["Dine-In Brands", "Swiggy", "Urban Company", "Infosys BPM"],
  },
  {
    id: 4,
    title: "PF Wage Ceiling Revised to ₹21,000 — Effective May 1, 2026",
    date: "Apr 14, 2026",
    category: "Labour",
    authority: "Employees' Provident Fund Organisation (EPFO)",
    reference: "EPFO/Wage-Ceiling/2026-27/Circular-03",
    jurisdiction: "Central",
    summary: "The EPFO has revised the PF wage ceiling from ₹15,000 to ₹21,000 per month. All blue-collar contract workers currently at the ₹15,000 ceiling will see revised PF deductions. Employer contribution increases proportionally. Payroll templates must be updated before the May cycle.",
    keyChanges: [
      "PF wage ceiling raised from ₹15,000 to ₹21,000/month",
      "Both employer and employee contribution bases revised",
      "Payroll templates need updating before May 2026 cycle",
      "Affects all workers currently at or near ₹15,000 ceiling",
    ],
    effectiveDate: "May 1, 2026",
    actionRequired: true,
    sourceUrl: "https://www.epfindia.gov.in/site_en/Circulars.php",
    sourceName: "EPFO Circulars Portal",
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
    summary: "IT contract workers below ₹1L annual contract value are now exempt from TDS under Section 194C. Previous threshold was ₹30,000 per single transaction or ₹1,00,000 aggregate. Vendor payment configurations for impacted contractors need updating across payroll systems.",
    keyChanges: [
      "Single transaction TDS threshold raised under Section 194C",
      "IT contractors below ₹1L annual value now exempt",
      "Vendor payment configurations need updating",
      "Effective for FY 2026-27 onwards",
    ],
    effectiveDate: "Apr 1, 2026",
    actionRequired: true,
    sourceUrl: "https://incometaxindia.gov.in/Pages/communications/notifications.aspx",
    sourceName: "Income Tax India — Notifications",
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
    summary: "Minimum daily wages for unskilled manufacturing workers in Zone I (Mumbai, Thane) increased from ₹570 to ₹620. Zone II (Pune, Nagpur) increased from ₹520 to ₹570. Effective immediately. Payroll corrections needed for Mumbai and Pune-based clients.",
    keyChanges: [
      "Zone I (Mumbai, Thane): ₹570 → ₹620/day for unskilled workers",
      "Zone II (Pune, Nagpur): ₹520 → ₹570/day for unskilled workers",
      "Immediate effect — no transition period",
      "Payroll corrections required for affected clients",
    ],
    effectiveDate: "Apr 12, 2026",
    actionRequired: true,
    sourceUrl: "https://mahakamgar.maharashtra.gov.in/minimum-wages-702.htm",
    sourceName: "Maharashtra Labour Department",
    clientsAffected: ["Dine-In Brands", "MedSure Healthcare", "Capgemini"],
  },
  {
    id: 7,
    title: "ESIC Circular: Gig Worker Coverage Framework — Consultation Draft",
    date: "Apr 11, 2026",
    category: "Labour",
    authority: "Employees' State Insurance Corporation (ESIC)",
    reference: "ESIC/GigWorker/2026/Draft-01",
    jurisdiction: "Central",
    summary: "Draft proposes mandatory ESI for platform gig workers earning ₹21,000+/month. Currently in consultation phase — no immediate action required. Monitor for final notification. Could impact all platform-based client engagements.",
    keyChanges: [
      "Mandatory ESI proposed for gig workers earning ₹21,000+/month",
      "Currently a consultation draft — not yet effective",
      "Would apply to platform-based workers (delivery, ride-hailing, etc.)",
      "Public comments invited — deadline not yet announced",
    ],
    effectiveDate: "TBD (consultation)",
    actionRequired: false,
    sourceUrl: "https://www.esic.in/web/esicnew/circulars-and-orders",
    sourceName: "ESIC — Circulars & Orders",
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
    summary: "All principal employers engaging contract workers must ensure fire safety training within 30 days of deployment. Non-compliance penalty increased from ₹10,000 to ₹50,000 per incident. Applies to all factory premises in NCT Delhi.",
    keyChanges: [
      "Fire safety training mandatory within 30 days of contract worker deployment",
      "Non-compliance penalty increased from ₹10,000 to ₹50,000",
      "Applies to all factory premises in NCT Delhi",
      "Principal employer bears responsibility, not contractor",
    ],
    effectiveDate: "Apr 10, 2026",
    actionRequired: true,
    sourceUrl: "https://labour.delhi.gov.in/content/factories-act",
    sourceName: "Delhi Labour Department",
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
    summary: "Contract staffing intermediaries are now explicitly required to maintain an Internal Complaints Committee and conduct annual POSH training for all deployed contract workers — not just internal employees. Applies directly to Buzzworks and all similar staffing firms.",
    keyChanges: [
      "ICC mandatory for staffing intermediaries, not just end-clients",
      "Annual POSH training required for all deployed contract workers",
      "Intermediary bears compliance responsibility regardless of principal employer",
      "Non-compliance may result in license cancellation",
    ],
    effectiveDate: "Apr 8, 2026",
    actionRequired: true,
    sourceUrl: "https://wcd.nic.in/act/sexual-harassment-women-workplace-prevention-prohibition-and-redressal-act-2013",
    sourceName: "Ministry of WCD — POSH Act",
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
    summary: "Professional tax for workers earning ₹25,001–₹50,000 increased from ₹150 to ₹200/month. Workers above ₹50,000 now pay ₹250/month (from ₹200). All Karnataka payroll deductions need updating for the new slab structure.",
    keyChanges: [
      "₹25,001–₹50,000 bracket: ₹150 → ₹200/month",
      "Above ₹50,000 bracket: ₹200 → ₹250/month",
      "All Karnataka-based payroll deductions must be updated",
      "Effective immediately for current assessment year",
    ],
    effectiveDate: "Apr 7, 2026",
    actionRequired: true,
    sourceUrl: "https://ctax.karnataka.gov.in/english",
    sourceName: "Karnataka Commercial Taxes",
    clientsAffected: ["Infosys BPM", "Wipro GE", "Swiggy", "Urban Company"],
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const [category, setCategory]   = useState<Category | "all">("all")
  const [jurisdiction, setJurisdiction] = useState("All")
  const [search, setSearch]       = useState("")
  const [actionOnly, setActionOnly] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const filtered = useMemo(() => {
    let list = [...REGULATIONS]
    if (category !== "all") list = list.filter(r => r.category === category)
    if (jurisdiction !== "All") list = list.filter(r => r.jurisdiction === jurisdiction || r.jurisdiction === "Central")
    if (actionOnly) list = list.filter(r => r.actionRequired)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.authority.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        r.reference.toLowerCase().includes(q)
      )
    }
    return list
  }, [category, jurisdiction, search, actionOnly])

  const actionCount = REGULATIONS.filter(r => r.actionRequired).length

  return (
    <div className="flex h-screen overflow-hidden app-bg">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="px-6 lg:px-8 py-5 flex-shrink-0" style={{ background: "var(--surface)", boxShadow: "0 1px 0 var(--border)" }}>
          <div className="flex items-center gap-3">
            <Scale size={20} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
            <div>
              <h1 className="text-xl font-semibold" style={{ color: "var(--text-1)" }}>Compliance</h1>
              <p className="text-[13px] mt-0.5" style={{ color: "var(--text-3)" }}>
                Regulatory updates monitored by ORACLE · {REGULATIONS.length} documents · {actionCount} require action
              </p>
            </div>
          </div>
        </header>

        {/* Filter bar */}
        <div className="flex items-center gap-3 px-6 lg:px-8 py-3 flex-shrink-0 overflow-x-auto scrollbar-none"
          style={{ background: "var(--surface)", boxShadow: "0 1px 0 var(--border)" }}>

          {/* Category pills */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0"
                style={{
                  background: category === c.value ? "var(--accent-dim)" : "transparent",
                  color: category === c.value ? "var(--accent)" : "var(--text-3)",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="w-px h-4 flex-shrink-0" style={{ background: "var(--border)" }} />

          {/* Jurisdiction */}
          <div className="relative flex-shrink-0">
            <select
              value={jurisdiction}
              onChange={e => setJurisdiction(e.target.value)}
              className="glass-input py-1.5 text-xs pr-7 appearance-none cursor-pointer"
              style={{ width: 130 }}
            >
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-3)" }} />
          </div>

          {/* Action required toggle */}
          <button
            onClick={() => setActionOnly(!actionOnly)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 transition-all"
            style={{
              background: actionOnly ? "var(--warn-bg)" : "transparent",
              color: actionOnly ? "var(--warn)" : "var(--text-3)",
            }}
          >
            <AlertTriangle size={12} />
            Action required ({actionCount})
          </button>

          {/* Search */}
          <div className="relative flex-shrink-0 ml-auto">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
            <input
              className="glass-input pl-8 py-1.5 text-xs w-48"
              placeholder="Search regulations…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Document feed */}
        <div className="flex-1 overflow-y-auto pb-nav lg:pb-0">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 py-6 space-y-4">

            <div className="text-xs mb-2" style={{ color: "var(--text-3)" }}>
              {filtered.length} of {REGULATIONS.length} regulations
            </div>

            {filtered.map(reg => {
              const expanded = expandedId === reg.id

              return (
                <article
                  key={reg.id}
                  className="rounded-xl transition-all cursor-pointer"
                  style={{ background: "var(--surface)", boxShadow: expanded ? "var(--shadow-md)" : "var(--shadow)" }}
                  onClick={() => setExpandedId(expanded ? null : reg.id)}
                >
                  {/* Document header */}
                  <div className="p-5 lg:p-6">

                    {/* Meta row */}
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md"
                        style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
                        {reg.category}
                      </span>
                      {reg.actionRequired && (
                        <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md"
                          style={{ background: "var(--warn-bg)", color: "var(--warn)" }}>
                          <AlertTriangle size={10} /> Action required
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-3)" }}>
                        <MapPin size={10} /> {reg.jurisdiction}
                      </span>
                      <span className="text-[11px] ml-auto" style={{ color: "var(--text-3)" }}>
                        {reg.date}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-[15px] font-semibold leading-snug" style={{ color: "var(--text-1)" }}>
                      {reg.title}
                    </h3>

                    {/* Authority + Reference */}
                    <div className="flex items-center gap-3 mt-2 text-[13px]" style={{ color: "var(--text-2)" }}>
                      <span>{reg.authority}</span>
                      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded"
                        style={{ background: "var(--surface-2)", color: "var(--text-3)" }}>
                        {reg.reference}
                      </span>
                    </div>

                    {/* Summary */}
                    <p className="text-[13px] leading-relaxed mt-3" style={{ color: "var(--text-2)" }}>
                      {reg.summary}
                    </p>
                  </div>

                  {/* Expanded content */}
                  {expanded && (
                    <div className="px-5 lg:px-6 pb-5 lg:pb-6 animate-fade-in">
                      <div style={{ borderTop: "1px solid var(--border)" }} className="pt-4 space-y-4">

                        {/* Key changes */}
                        <div>
                          <div className="text-[13px] font-medium mb-2" style={{ color: "var(--text-1)" }}>
                            Key Changes
                          </div>
                          <ul className="space-y-1.5">
                            {reg.keyChanges.map((change, i) => (
                              <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: "var(--text-2)" }}>
                                <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "var(--accent)" }} />
                                {change}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Effective date */}
                        <div className="flex items-center gap-2 text-[13px]">
                          <Calendar size={13} style={{ color: "var(--text-3)" }} />
                          <span style={{ color: "var(--text-3)" }}>Effective:</span>
                          <span className="font-medium" style={{ color: "var(--text-1)" }}>{reg.effectiveDate}</span>
                        </div>

                        {/* Clients affected */}
                        <div>
                          <div className="flex items-center gap-1.5 text-[13px] mb-2" style={{ color: "var(--text-3)" }}>
                            <Building2 size={13} /> Clients impacted
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {reg.clientsAffected.map(c => (
                              <span key={c} className="text-xs px-2 py-0.5 rounded-md"
                                style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Source link */}
                        <a
                          href={reg.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-[13px] font-medium transition-opacity hover:opacity-70"
                          style={{ color: "var(--accent)" }}
                        >
                          <ExternalLink size={13} />
                          {reg.sourceName}
                        </a>
                      </div>
                    </div>
                  )}
                </article>
              )
            })}

            {filtered.length === 0 && (
              <div className="text-center py-20 text-sm" style={{ color: "var(--text-3)" }}>
                No regulations match the current filters
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
