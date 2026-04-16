"use client"

import { useState, useMemo } from "react"
import Sidebar from "@/components/Sidebar"
import BottomNav from "@/components/BottomNav"
import {
  Scale, ExternalLink, Search, Filter, AlertTriangle,
  FileText, Building2, MapPin, Calendar, ChevronDown,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "Labour" | "Finance & Taxation" | "EHS" | "Commercial" | "Secretarial" | "General"

interface LegalUpdate {
  id:           number
  title:        string
  date:         string
  category:     Category
  regulator:    string
  state:        string
  impact:       string
  clients:      string[]
  sourceUrl:    string
  notification: "compliance" | "informational"
}

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIES: { value: Category | "all"; label: string; color: string }[] = [
  { value: "all",                 label: "All",               color: "var(--text-2)" },
  { value: "Labour",             label: "Labour",            color: "#8B5CF6" },
  { value: "Finance & Taxation", label: "Finance & Tax",     color: "#F59E0B" },
  { value: "EHS",                label: "EHS",               color: "#EF4444" },
  { value: "Commercial",         label: "Commercial",        color: "#3B82F6" },
  { value: "Secretarial",       label: "Secretarial",       color: "#10B981" },
  { value: "General",           label: "General",           color: "#6B7280" },
]

const STATES = [
  "All States", "Central", "Karnataka", "Maharashtra", "Delhi", "Tamil Nadu",
  "Telangana", "Gujarat", "Uttar Pradesh", "Rajasthan", "Haryana",
  "West Bengal", "Kerala", "Andhra Pradesh", "Madhya Pradesh", "Punjab",
]

// ─── Mock regulatory updates (based on TeamLease RegTech schema) ──────────────

const UPDATES: LegalUpdate[] = [
  {
    id: 54852,
    title: "EPFO Circular: PF Wage Ceiling Revised to ₹21,000 — Effective May 1, 2026",
    date: "Apr 16, 2026",
    category: "Labour",
    regulator: "Employees' Provident Fund Organisation (EPFO)",
    state: "Central",
    impact: "All blue-collar contract workers at ₹15,000 ceiling will see revised PF deductions. Payroll templates need updating before May cycle. Employer contribution increases proportionally.",
    clients: ["Dine-In Brands", "Swiggy", "Zomato", "BigBasket", "Urban Company"],
    sourceUrl: "https://www.teamleaseregtech.com/updates/article/54852/",
    notification: "compliance",
  },
  {
    id: 54848,
    title: "Karnataka Shops & Establishments Act — Amended Overtime Rules for Blue-Collar Workers",
    date: "Apr 15, 2026",
    category: "Labour",
    regulator: "Department of Labour, Govt. of Karnataka",
    state: "Karnataka",
    impact: "OT rate for blue-collar workers in Karnataka increased from 1.5x to 2x for hours beyond 9hrs/day. JARVIS OT validation rules for Bangalore clients require immediate update.",
    clients: ["Dine-In Brands", "Swiggy", "Urban Company", "Infosys BPM"],
    sourceUrl: "https://www.teamleaseregtech.com/updates/article/54848/",
    notification: "compliance",
  },
  {
    id: 54842,
    title: "CBIC: Revised TDS Threshold for Contract Payments Under Section 194C Raised to ₹1 Lakh",
    date: "Apr 15, 2026",
    category: "Finance & Taxation",
    regulator: "Central Board of Indirect Taxes & Customs (CBIC)",
    state: "Central",
    impact: "IT contract workers below ₹1L annual contract value now exempt from TDS. Vendor payment configurations for impacted contractors need updating across payroll systems.",
    clients: ["TechCorp India", "Infosys BPM", "Wipro GE", "Hexaware", "L&T Infotech"],
    sourceUrl: "https://www.teamleaseregtech.com/updates/article/54842/",
    notification: "compliance",
  },
  {
    id: 54838,
    title: "ESIC Circular: Gig Worker Coverage Framework — Mandatory ESI for Platform Workers",
    date: "Apr 14, 2026",
    category: "Labour",
    regulator: "Employees' State Insurance Corporation (ESIC)",
    state: "Central",
    impact: "Draft proposes mandatory ESI for platform gig workers earning ₹21,000+/month. Currently in consultation phase — no immediate action required but monitor for final notification. Could impact all platform-based client engagements.",
    clients: ["Swiggy", "Zomato", "Urban Company", "BigBasket"],
    sourceUrl: "https://www.teamleaseregtech.com/updates/article/54838/",
    notification: "informational",
  },
  {
    id: 54830,
    title: "Maharashtra Minimum Wages Revision — Zone I and Zone II Manufacturing Workers",
    date: "Apr 13, 2026",
    category: "Labour",
    regulator: "Labour Commissioner, Govt. of Maharashtra",
    state: "Maharashtra",
    impact: "Minimum daily wages for unskilled manufacturing workers in Zone I (Mumbai, Thane) increased from ₹570 to ₹620. Zone II (Pune, Nagpur) from ₹520 to ₹570. Effective immediately.",
    clients: ["Dine-In Brands", "MedSure Healthcare", "Capgemini"],
    sourceUrl: "https://www.teamleaseregtech.com/updates/article/54830/",
    notification: "compliance",
  },
  {
    id: 54825,
    title: "CBDT Notification: Updated Form 16A for Contract Worker Tax Deduction Certificates",
    date: "Apr 12, 2026",
    category: "Finance & Taxation",
    regulator: "Central Board of Direct Taxes (CBDT)",
    state: "Central",
    impact: "New Form 16A format mandatory for all contract worker TDS certificates issued from Q1 FY27. Payroll systems must update certificate generation templates before June 30.",
    clients: ["Hexaware", "Infosys BPM", "L&T Infotech", "Mindtree", "Capgemini", "TechCorp India"],
    sourceUrl: "https://www.teamleaseregtech.com/updates/article/54825/",
    notification: "compliance",
  },
  {
    id: 54820,
    title: "Delhi Factories Act Amendment — Fire Safety Compliance for Contract Workers on Site",
    date: "Apr 11, 2026",
    category: "EHS",
    regulator: "Department of Industries, Govt. of Delhi",
    state: "Delhi",
    impact: "All principal employers engaging contract workers must ensure fire safety training within 30 days of deployment. Non-compliance penalty increased from ₹10,000 to ₹50,000 per incident.",
    clients: ["FinanceHub Ltd", "GlobalStaff Solutions"],
    sourceUrl: "https://www.teamleaseregtech.com/updates/article/54820/",
    notification: "compliance",
  },
  {
    id: 54815,
    title: "Tamil Nadu Labour Welfare Board — Revised Contribution Rates for Contract Establishments",
    date: "Apr 10, 2026",
    category: "Labour",
    regulator: "Tamil Nadu Labour Welfare Board",
    state: "Tamil Nadu",
    impact: "Employer contribution to Labour Welfare Fund increased from ₹20 to ₹30 per employee per half-year. Employee contribution unchanged at ₹10. Effective from Apr 2026 half-year.",
    clients: ["Infosys BPM", "Hexaware", "TechCorp India"],
    sourceUrl: "https://www.teamleaseregtech.com/updates/article/54815/",
    notification: "compliance",
  },
  {
    id: 54810,
    title: "MCA Notification: Companies (Appointment and Remuneration) Second Amendment Rules 2026",
    date: "Apr 9, 2026",
    category: "Secretarial",
    regulator: "Ministry of Corporate Affairs (MCA)",
    state: "Central",
    impact: "Revised remuneration disclosure requirements for managerial personnel at contract staffing firms. Annual return filings must now include contractor workforce cost breakdowns.",
    clients: ["Hexaware", "Infosys BPM", "L&T Infotech", "Mindtree", "Capgemini"],
    sourceUrl: "https://www.teamleaseregtech.com/updates/article/54810/",
    notification: "compliance",
  },
  {
    id: 54805,
    title: "Gujarat BOCW Cess — Increased Rate for Building & Construction Contract Workers",
    date: "Apr 8, 2026",
    category: "Labour",
    regulator: "Labour & Employment Department, Govt. of Gujarat",
    state: "Gujarat",
    impact: "BOCW cess rate for construction projects increased from 1% to 1.5% of construction cost. Applies to all principal employers engaging contract construction workers in Gujarat.",
    clients: ["Dine-In Brands"],
    sourceUrl: "https://www.teamleaseregtech.com/updates/article/54805/",
    notification: "compliance",
  },
  {
    id: 54800,
    title: "Telangana Shops & Establishments — Extended Working Hours Notification for IT Sector",
    date: "Apr 7, 2026",
    category: "Commercial",
    regulator: "Commissioner of Labour, Govt. of Telangana",
    state: "Telangana",
    impact: "IT/ITES establishments in Telangana may extend daily working hours to 12 hrs (from 9 hrs) with employee consent and 2x OT rate. Night shift for women permitted with transport. Effective immediately.",
    clients: ["TechCorp India", "Infosys BPM", "Wipro GE"],
    sourceUrl: "https://www.teamleaseregtech.com/updates/article/54800/",
    notification: "informational",
  },
  {
    id: 54795,
    title: "POSH Act — Revised Compliance Guidelines for Contract Staffing Intermediaries",
    date: "Apr 5, 2026",
    category: "Labour",
    regulator: "Ministry of Women and Child Development",
    state: "Central",
    impact: "Contract staffing intermediaries (like Buzzworks) now explicitly required to maintain Internal Complaints Committee and conduct annual POSH training for all deployed contract workers, not just internal employees.",
    clients: ["All clients"],
    sourceUrl: "https://www.teamleaseregtech.com/updates/article/54795/",
    notification: "compliance",
  },
  {
    id: 54790,
    title: "GST Council: Clarification on GST Applicability for Manpower Supply Services",
    date: "Apr 3, 2026",
    category: "Finance & Taxation",
    regulator: "GST Council / CBIC",
    state: "Central",
    impact: "GST Council clarifies 18% GST applies uniformly on manpower supply services regardless of whether workers are skilled or unskilled. No reduced rate for blue-collar staffing. Input tax credit available to principal employer.",
    clients: ["All clients"],
    sourceUrl: "https://www.teamleaseregtech.com/updates/article/54790/",
    notification: "informational",
  },
  {
    id: 54785,
    title: "Haryana Minimum Wages — Revised Rates for Security Guards and Housekeeping Staff",
    date: "Apr 2, 2026",
    category: "Labour",
    regulator: "Labour Department, Govt. of Haryana",
    state: "Haryana",
    impact: "Minimum wages for security guards in Haryana increased to ₹13,500/month (from ₹12,800). Housekeeping staff revised to ₹12,200/month. Effective immediately. Payroll corrections needed for Gurgaon-based clients.",
    clients: ["FinanceHub Ltd", "GlobalStaff Solutions", "Mindtree"],
    sourceUrl: "https://www.teamleaseregtech.com/updates/article/54785/",
    notification: "compliance",
  },
  {
    id: 54780,
    title: "Karnataka Professional Tax — Revised Slab for Contract Workers Earning Above ₹25,000",
    date: "Apr 1, 2026",
    category: "Finance & Taxation",
    regulator: "Commercial Taxes Department, Govt. of Karnataka",
    state: "Karnataka",
    impact: "Professional tax for workers earning ₹25,001–₹50,000 increased from ₹150 to ₹200/month. Workers above ₹50,000 now pay ₹250/month (from ₹200). All Karnataka payroll deductions need updating.",
    clients: ["Infosys BPM", "Wipro GE", "Swiggy", "Urban Company"],
    sourceUrl: "https://www.teamleaseregtech.com/updates/article/54780/",
    notification: "compliance",
  },
]

// ─── Stats ────────────────────────────────────────────────────────────────────

const SOURCE_URL = "https://www.teamleaseregtech.com/legalupdates/"

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const [category, setCategory]   = useState<Category | "all">("all")
  const [state, setState]         = useState("All States")
  const [search, setSearch]       = useState("")
  const [notiType, setNotiType]   = useState<"all" | "compliance" | "informational">("all")

  const filtered = useMemo(() => {
    let list = [...UPDATES]
    if (category !== "all") list = list.filter(u => u.category === category)
    if (state !== "All States") list = list.filter(u => u.state === state || u.state === "Central")
    if (notiType !== "all") list = list.filter(u => u.notification === notiType)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(u =>
        u.title.toLowerCase().includes(q) ||
        u.regulator.toLowerCase().includes(q) ||
        u.impact.toLowerCase().includes(q) ||
        u.clients.some(c => c.toLowerCase().includes(q))
      )
    }
    return list
  }, [category, state, search, notiType])

  const complianceCount = UPDATES.filter(u => u.notification === "compliance").length
  const uniqueStates    = new Set(UPDATES.map(u => u.state)).size
  const uniqueClients   = new Set(UPDATES.flatMap(u => u.clients).filter(c => c !== "All clients")).size

  return (
    <div className="flex h-screen overflow-hidden app-bg">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="px-5 lg:px-7 py-5 border-b flex-shrink-0"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <Scale size={18} style={{ color: "var(--accent)" }} />
                <h1 className="text-lg font-bold" style={{ color: "var(--text-1)" }}>Compliance Hub</h1>
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
                Regulatory intelligence powered by ORACLE · Sourced from TeamLease RegTech (16,253+ documents)
              </p>
            </div>
            <a
              href={SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all flex-shrink-0"
              style={{ background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}
            >
              <ExternalLink size={12} />
              TeamLease RegTech
            </a>
          </div>
        </header>

        {/* Stats row */}
        <div className="flex border-b flex-shrink-0" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          {[
            { label: "Total Updates",       value: UPDATES.length.toString(), color: "var(--text-1)" },
            { label: "Action Required",     value: complianceCount.toString(), color: "var(--warn)"  },
            { label: "States Covered",      value: uniqueStates.toString(),   color: "var(--accent)" },
            { label: "Clients Impacted",    value: uniqueClients.toString(),  color: "var(--info)"   },
          ].map((s, i) => (
            <div
              key={s.label}
              className="flex-1 px-5 lg:px-7 py-4"
              style={{ borderLeft: i > 0 ? "1px solid var(--border)" : "none" }}
            >
              <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 px-5 lg:px-7 py-3 border-b flex-shrink-0 overflow-x-auto scrollbar-none"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>

          {/* Category pills */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0"
                style={{
                  background: category === c.value ? (c.value === "all" ? "var(--accent-dim)" : `${c.color}15`) : "transparent",
                  color: category === c.value ? (c.value === "all" ? "var(--accent)" : c.color) : "var(--text-3)",
                  border: category === c.value ? `1px solid ${c.value === "all" ? "var(--accent-border)" : c.color + "30"}` : "1px solid transparent",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="w-px h-4 flex-shrink-0" style={{ background: "var(--border)" }} />

          {/* State select */}
          <div className="relative flex-shrink-0">
            <MapPin size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
            <select
              value={state}
              onChange={e => setState(e.target.value)}
              className="glass-input pl-8 pr-7 py-1.5 text-xs appearance-none cursor-pointer"
              style={{ width: 140 }}
            >
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-3)" }} />
          </div>

          {/* Notification type */}
          <div className="relative flex-shrink-0">
            <select
              value={notiType}
              onChange={e => setNotiType(e.target.value as typeof notiType)}
              className="glass-input py-1.5 text-xs appearance-none cursor-pointer pr-7"
              style={{ width: 140 }}
            >
              <option value="all">All types</option>
              <option value="compliance">Action required</option>
              <option value="informational">Informational</option>
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-3)" }} />
          </div>

          {/* Search */}
          <div className="relative flex-shrink-0 ml-auto">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
            <input
              className="glass-input pl-8 py-1.5 text-xs w-52"
              placeholder="Search updates, regulators, clients…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-y-auto p-5 lg:p-7 space-y-4 pb-nav lg:pb-7">

          <div className="text-xs mb-1" style={{ color: "var(--text-3)" }}>
            Showing {filtered.length} of {UPDATES.length} updates
          </div>

          {filtered.map(u => {
            const catConfig = CATEGORIES.find(c => c.value === u.category)
            const catColor  = catConfig?.color ?? "var(--text-2)"

            return (
              <div
                key={u.id}
                className="p-5 rounded-xl"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                {/* Top row: badges + date */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: `${catColor}12`, color: catColor, border: `1px solid ${catColor}25` }}
                  >
                    {u.category}
                  </span>
                  {u.notification === "compliance" && (
                    <span
                      className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: "var(--warn-bg)", color: "var(--warn)", border: "1px solid var(--warn-border)" }}
                    >
                      <AlertTriangle size={9} /> Action required
                    </span>
                  )}
                  <span className="text-[11px] flex items-center gap-1" style={{ color: "var(--text-3)" }}>
                    <MapPin size={10} /> {u.state}
                  </span>
                  <span className="text-[11px] ml-auto" style={{ color: "var(--text-3)" }}>
                    {u.date}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-semibold leading-snug mb-1.5" style={{ color: "var(--text-1)" }}>
                  {u.title}
                </h3>

                {/* Regulator */}
                <div className="text-xs mb-2" style={{ color: "var(--text-2)" }}>
                  {u.regulator}
                </div>

                {/* Impact */}
                <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-2)" }}>
                  {u.impact}
                </p>

                {/* Bottom: affected clients + source link */}
                <div className="flex items-end justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-3)" }}>
                      Clients impacted
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {u.clients.map(c => (
                        <span
                          key={c}
                          className="text-[10px] font-medium px-2 py-0.5 rounded"
                          style={{ background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <a
                    href={u.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] font-medium flex-shrink-0 transition-opacity hover:opacity-70"
                    style={{ color: "var(--accent)" }}
                  >
                    <ExternalLink size={11} />
                    View source
                  </a>
                </div>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-sm" style={{ color: "var(--text-3)" }}>
              No updates match the current filters
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
