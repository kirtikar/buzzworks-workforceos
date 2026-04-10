"use client"

import { useState, useMemo } from "react"
import Sidebar from "@/components/Sidebar"
import AIAgentOrb from "@/components/AIAgentOrb"
import { clients, employees as seedEmployees } from "@/lib/mock-data"
import { generateEmployeesForClient } from "@/lib/mock-generator"
import type { Employee, JobCategory, EmploymentStatus } from "@/lib/types"
import {
  Search, Users, Filter, X, ChevronDown, Download,
  MapPin, Briefcase, Calendar, DollarSign, TrendingUp,
} from "lucide-react"
import clsx from "clsx"

// ─── Constants ────────────────────────────────────────────────────────────────

const JOB_CATEGORIES: JobCategory[] = [
  "Engineering","Design","Finance","Operations","Sales","HR","Marketing",
  "Analytics","Healthcare","Legal","Consulting","PMO","Security","DevOps","QA","Admin",
]

const CITIES = [
  "Mumbai","Bangalore","Hyderabad","Chennai","Pune",
  "Gurgaon","Noida","Delhi","Kolkata","Ahmedabad",
  "Coimbatore","Kochi","Chandigarh","Jaipur","Bhubaneswar",
]

const STATUSES: EmploymentStatus[] = ["active","notice","ended","on_hold"]

// ─── Generate full employee pool (capped for performance) ─────────────────────

function buildEmployeePool(): Employee[] {
  const pool: Employee[] = [...seedEmployees]
  for (const client of clients) {
    const seedCount = seedEmployees.filter(e => e.clientId === client.id).length
    const need = Math.min(80, client.employeeCount) - seedCount
    if (need > 0) {
      pool.push(...generateEmployeesForClient(client.id, need, seedCount))
    }
  }
  return pool
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string) { return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() }

function LeaveIndicator({ bal }: { bal: Employee["leaveBalance"] }) {
  const rem = bal.annual - bal.usedAnnual
  const pct = Math.round((rem / bal.annual) * 100)
  const color = pct > 60 ? "#00c896" : pct > 25 ? "#c89060" : "#c07070"
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px]" style={{ color }}>{rem}d</span>
    </div>
  )
}

function StatusDot({ status }: { status: EmploymentStatus }) {
  const map = { active:["#00c896","Active"], notice:["#c89060","On Notice"], ended:["#c07070","Ended"], on_hold:["rgba(255,255,255,0.3)","On Hold"] }
  const [color, label] = map[status]
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      {label}
    </span>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
      style={{ background: "rgba(0,200,150,0.1)", color: "#00c896", border: "1px solid rgba(0,200,150,0.2)" }}
    >
      {label}
      <button onClick={onRemove} className="ml-0.5 hover:opacity-70"><X size={9} /></button>
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const allEmployees = useMemo(() => buildEmployeePool(), [])

  // Filter state
  const [search,        setSearch]        = useState("")
  const [selClients,    setSelClients]    = useState<string[]>([])
  const [selCategories, setSelCategories] = useState<JobCategory[]>([])
  const [selCities,     setSelCities]     = useState<string[]>([])
  const [selStatuses,   setSelStatuses]   = useState<EmploymentStatus[]>([])
  const [rateMin,       setRateMin]       = useState("")
  const [rateMax,       setRateMax]       = useState("")
  const [sortBy,        setSortBy]        = useState<"name" | "rate" | "startDate" | "leave">("name")

  // Pagination
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50

  const filtered = useMemo(() => {
    let list = [...allEmployees]
    if (search)              list = list.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase()) || e.role.toLowerCase().includes(search.toLowerCase()) || e.employeeCode.toLowerCase().includes(search.toLowerCase()))
    if (selClients.length)   list = list.filter(e => selClients.includes(e.clientId))
    if (selCategories.length)list = list.filter(e => selCategories.includes(e.jobCategory))
    if (selCities.length)    list = list.filter(e => selCities.includes(e.city))
    if (selStatuses.length)  list = list.filter(e => selStatuses.includes(e.employmentStatus))
    if (rateMin)             list = list.filter(e => e.ratePerHour >= Number(rateMin))
    if (rateMax)             list = list.filter(e => e.ratePerHour <= Number(rateMax))

    list.sort((a, b) =>
      sortBy === "name"      ? a.name.localeCompare(b.name) :
      sortBy === "rate"      ? b.ratePerHour - a.ratePerHour :
      sortBy === "startDate" ? new Date(b.startDate).getTime() - new Date(a.startDate).getTime() :
                               (b.leaveBalance.annual - b.leaveBalance.usedAnnual) - (a.leaveBalance.annual - a.leaveBalance.usedAnnual)
    )
    return list
  }, [allEmployees, search, selClients, selCategories, selCities, selStatuses, rateMin, rateMax, sortBy])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  function toggleArr<T>(arr: T[], setArr: (v: T[]) => void, val: T) {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
    setPage(1)
  }

  const activeFilters = selClients.length + selCategories.length + selCities.length + selStatuses.length + (rateMin ? 1 : 0) + (rateMax ? 1 : 0)

  // Summary stats
  const totalActive  = allEmployees.filter(e => e.employmentStatus === "active").length
  const totalNotice  = allEmployees.filter(e => e.employmentStatus === "notice").length
  const avgRate      = Math.round(allEmployees.reduce((s, e) => s + e.ratePerHour, 0) / allEmployees.length)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-4 px-6 py-3.5 border-b border-white/[0.07] flex-shrink-0" style={{ background: "rgba(9,7,20,0.6)", backdropFilter: "blur(20px)" }}>
          <Users size={18} className="text-teal-400 flex-shrink-0" />
          <div className="flex-1">
            <h1 className="text-base font-bold text-white">Employees</h1>
            <p className="text-[11px] text-white/35">{filtered.length.toLocaleString()} of {allEmployees.length.toLocaleString()} shown</p>
          </div>
          <button className="btn-ghost flex items-center gap-1.5 text-[12px] py-2 px-3">
            <Download size={12} /> Export
          </button>
        </header>

        {/* Summary row */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-white/[0.06] flex-shrink-0 overflow-x-auto" style={{ background: "rgba(9,7,20,0.3)" }}>
          {[
            { label: "Total employees (sample)", value: allEmployees.length.toLocaleString(), color: "#00c896" },
            { label: "Active",                  value: totalActive.toLocaleString(),          color: "#00c896" },
            { label: "On notice",               value: totalNotice.toLocaleString(),           color: "#c89060" },
            { label: "Avg rate/hr",             value: `₹${avgRate}`,                          color: "#8B5CF6" },
            { label: "Clients",                 value: clients.length,                         color: "var(--text-2)" },
          ].map(s => (
            <div key={s.label} className="flex items-baseline gap-1.5 whitespace-nowrap text-[11px]">
              <span className="font-bold text-[14px]" style={{ color: s.color }}>{s.value}</span>
              <span className="text-white/30">{s.label}</span>
              <span className="text-white/10 ml-2">|</span>
            </div>
          ))}
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Filter sidebar */}
          <div className="w-56 flex-shrink-0 border-r border-white/[0.07] overflow-y-auto p-4 space-y-5" style={{ background: "rgba(9,7,20,0.5)" }}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider flex items-center gap-1.5"><Filter size={11} />Filters</span>
              {activeFilters > 0 && (
                <button
                  onClick={() => { setSelClients([]); setSelCategories([]); setSelCities([]); setSelStatuses([]); setRateMin(""); setRateMax("") }}
                  className="text-[10px] text-teal-400 hover:text-teal-300"
                >
                  Clear {activeFilters}
                </button>
              )}
            </div>

            {/* Client */}
            <FilterSection label="Client">
              {clients.map(c => (
                <label key={c.id} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selClients.includes(c.id)}
                    onChange={() => toggleArr(selClients, setSelClients, c.id)}
                    className="accent-teal-400 w-3 h-3"
                  />
                  <span className="flex items-center gap-1.5 text-[11px] text-white/55 group-hover:text-white/80 transition-colors min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                    <span className="truncate">{c.name}</span>
                  </span>
                </label>
              ))}
            </FilterSection>

            {/* Job Category */}
            <FilterSection label="Job Category">
              {JOB_CATEGORIES.map(cat => (
                <label key={cat} className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={selCategories.includes(cat)} onChange={() => toggleArr(selCategories, setSelCategories, cat)} className="accent-teal-400 w-3 h-3" />
                  <span className="text-[11px] text-white/55 group-hover:text-white/80 transition-colors">{cat}</span>
                </label>
              ))}
            </FilterSection>

            {/* City */}
            <FilterSection label="Location / City">
              {CITIES.map(city => (
                <label key={city} className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={selCities.includes(city)} onChange={() => toggleArr(selCities, setSelCities, city)} className="accent-teal-400 w-3 h-3" />
                  <span className="text-[11px] text-white/55 group-hover:text-white/80 transition-colors">{city}</span>
                </label>
              ))}
            </FilterSection>

            {/* Status */}
            <FilterSection label="Employment Status">
              {STATUSES.map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={selStatuses.includes(s)} onChange={() => toggleArr(selStatuses, setSelStatuses, s)} className="accent-teal-400 w-3 h-3" />
                  <span className="text-[11px] text-white/55 group-hover:text-white/80 transition-colors capitalize">{s.replace("_", " ")}</span>
                </label>
              ))}
            </FilterSection>

            {/* Rate range */}
            <FilterSection label="Rate / Hour (₹)">
              <div className="flex gap-2">
                <input
                  className="glass-input text-[11px] py-1.5 w-full"
                  placeholder="Min"
                  value={rateMin}
                  onChange={e => { setRateMin(e.target.value); setPage(1) }}
                />
                <input
                  className="glass-input text-[11px] py-1.5 w-full"
                  placeholder="Max"
                  value={rateMax}
                  onChange={e => { setRateMax(e.target.value); setPage(1) }}
                />
              </div>
            </FilterSection>
          </div>

          {/* Main table area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search + sort bar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
              <div className="relative flex-1 max-w-sm">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  className="glass-input w-full pl-8 text-[12px] py-1.5"
                  placeholder="Search by name, email, role, code…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                />
              </div>

              {/* Active filter chips */}
              <div className="flex items-center gap-1.5 flex-wrap flex-1">
                {selClients.map(id => {
                  const c = clients.find(cl => cl.id === id)!
                  return <FilterChip key={id} label={c.code} onRemove={() => toggleArr(selClients, setSelClients, id)} />
                })}
                {selCategories.map(cat => <FilterChip key={cat} label={cat} onRemove={() => toggleArr(selCategories, setSelCategories, cat)} />)}
                {selCities.map(city => <FilterChip key={city} label={city} onRemove={() => toggleArr(selCities, setSelCities, city)} />)}
                {selStatuses.map(s => <FilterChip key={s} label={s} onRemove={() => toggleArr(selStatuses, setSelStatuses, s)} />)}
              </div>

              <select className="glass-input text-[12px] py-1.5 flex-shrink-0" value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
                <option value="name">Sort: Name</option>
                <option value="rate">Sort: Rate ↓</option>
                <option value="startDate">Sort: Newest first</option>
                <option value="leave">Sort: Leave balance</option>
              </select>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 z-10" style={{ background: "rgba(9,7,20,0.95)" }}>
                  <tr className="border-b border-white/[0.07]">
                    {["Employee", "Client", "Role / Category", "City", "Joined", "Rate/hr", "Leave", "Status"].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10px] text-white/30 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-white/25 text-[13px]">No employees match your filters.</td></tr>
                  ) : paginated.map(emp => {
                    const client = clients.find(c => c.id === emp.clientId)
                    const doj = new Date(emp.startDate)
                    const dojStr = doj.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"2-digit" })
                    return (
                      <tr key={emp.id} className="ts-row">
                        {/* Employee */}
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: `${emp.avatarColor}22`, color: emp.avatarColor }}>
                              {initials(emp.name)}
                            </div>
                            <div>
                              <div className="font-semibold text-white/90">{emp.name}</div>
                              <div className="text-white/30 text-[10px]">{emp.employeeCode}</div>
                            </div>
                          </div>
                        </td>
                        {/* Client */}
                        <td className="px-4 py-2.5">
                          {client && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md" style={{ background: `${client.color}18`, color: client.color }}>
                              {client.code}
                            </span>
                          )}
                        </td>
                        {/* Role */}
                        <td className="px-4 py-2.5">
                          <div className="text-white/75">{emp.role}</div>
                          <div className="text-[10px] text-white/30">{emp.jobCategory}</div>
                        </td>
                        {/* City */}
                        <td className="px-4 py-2.5">
                          <span className="text-white/50 flex items-center gap-1"><MapPin size={10} />{emp.city}</span>
                        </td>
                        {/* Joined */}
                        <td className="px-4 py-2.5 text-white/45 whitespace-nowrap">{dojStr}</td>
                        {/* Rate */}
                        <td className="px-4 py-2.5 font-semibold text-white/80">₹{emp.ratePerHour}</td>
                        {/* Leave */}
                        <td className="px-4 py-2.5"><LeaveIndicator bal={emp.leaveBalance} /></td>
                        {/* Status */}
                        <td className="px-4 py-2.5"><StatusDot status={emp.employmentStatus} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06] flex-shrink-0">
                <span className="text-[11px] text-white/30">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost py-1 px-3 text-[11px] disabled:opacity-30">← Prev</button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                    return (
                      <button key={pg} onClick={() => setPage(pg)} className={clsx("w-8 h-7 rounded-lg text-[11px] font-medium transition-all", pg === page ? "bg-teal-400/20 text-teal-400" : "text-white/35 hover:text-white/60 hover:bg-white/[0.04]")}>{pg}</button>
                    )
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost py-1 px-3 text-[11px] disabled:opacity-30">Next →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <AIAgentOrb />
    </div>
  )
}

// ─── Filter Section ───────────────────────────────────────────────────────────

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} className="flex items-center justify-between w-full text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2 hover:text-white/60 transition-colors">
        {label}
        <ChevronDown size={11} className={clsx("transition-transform", open ? "rotate-0" : "-rotate-90")} />
      </button>
      {open && <div className="space-y-1.5">{children}</div>}
    </div>
  )
}
