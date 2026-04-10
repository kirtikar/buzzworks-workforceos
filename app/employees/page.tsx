"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { clients, employees as seedEmployees } from "@/lib/mock-data"
import { generateEmployeesForClient } from "@/lib/mock-generator"
import type { Employee, JobCategory, EmploymentStatus } from "@/lib/types"
import {
  Search, Users, Download, ChevronDown, X, ChevronLeft, ChevronRight,
  ArrowUpDown, MapPin, Briefcase, Calendar,
} from "lucide-react"
import clsx from "clsx"

const JOB_CATEGORIES: JobCategory[] = [
  "Engineering","Design","Finance","Operations","Sales","HR","Marketing",
  "Analytics","Healthcare","Legal","Consulting","PMO","Security","DevOps","QA","Admin",
]
const CITIES = ["Mumbai","Bangalore","Hyderabad","Chennai","Pune","Gurgaon","Noida","Delhi","Kolkata","Ahmedabad","Coimbatore","Kochi","Chandigarh","Jaipur","Bhubaneswar"]
const STATUSES: { value: EmploymentStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "notice", label: "On Notice" },
  { value: "ended", label: "Ended" },
  { value: "on_hold", label: "On Hold" },
]

function buildEmployeePool(): Employee[] {
  const pool: Employee[] = [...seedEmployees]
  for (const client of clients) {
    const seedCount = seedEmployees.filter(e => e.clientId === client.id).length
    const need = Math.min(80, client.employeeCount) - seedCount
    if (need > 0) pool.push(...generateEmployeesForClient(client.id, need, seedCount))
  }
  return pool
}

function initials(name: string) { return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() }

function LeaveBar({ bal }: { bal: Employee["leaveBalance"] }) {
  const rem = bal.annual - bal.usedAnnual
  const pct = Math.round((rem / bal.annual) * 100)
  const color = pct > 60 ? "#00c896" : pct > 25 ? "#d97706" : "#dc2626"
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-1.5 rounded-full" style={{ background: "var(--border)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[11px] font-medium tabular-nums" style={{ color }}>{rem}d</span>
    </div>
  )
}

function StatusDot({ status }: { status: EmploymentStatus }) {
  const map: Record<EmploymentStatus, [string, string]> = {
    active:  ["#00c896", "Active"],
    notice:  ["#d97706", "On Notice"],
    ended:   ["#dc2626", "Ended"],
    on_hold: ["#9ca3af", "On Hold"],
  }
  const [color, label] = map[status]
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      {label}
    </span>
  )
}

// ─── Dropdown filter ──────────────────────────────────────────────────────────

function FilterDropdown({
  label, icon: Icon, options, selected, onToggle, onClear,
}: {
  label: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
  options: { value: string; label: string }[]
  selected: string[]
  onToggle: (v: string) => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])
  const active = selected.length > 0
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={clsx(
          "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium border transition-all whitespace-nowrap",
          active
            ? "border-[var(--accent)] text-[var(--accent)]"
            : "border-[var(--border)] text-[var(--text-2)] hover:border-[var(--border-strong)]"
        )}
        style={{ background: active ? "var(--accent-dim)" : "var(--surface)" }}
      >
        {Icon && <Icon size={13} />}
        {label}
        {active && (
          <span className="ml-0.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
            style={{ background: "var(--accent)", color: "#fff" }}>
            {selected.length}
          </span>
        )}
        <ChevronDown size={12} className={clsx("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-50 rounded-xl border shadow-xl min-w-[180px] py-1.5 overflow-hidden"
          style={{ background: "var(--surface)", borderColor: "var(--border-strong)", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
          {selected.length > 0 && (
            <button onClick={() => { onClear(); setOpen(false) }}
              className="w-full text-left px-3 py-1.5 text-[11px] font-semibold mb-1 transition-colors"
              style={{ color: "var(--accent)" }}>
              Clear all
            </button>
          )}
          <div className="max-h-52 overflow-y-auto">
            {options.map(opt => (
              <button key={opt.value} onClick={() => onToggle(opt.value)}
                className="w-full text-left flex items-center gap-2.5 px-3 py-1.5 text-[12px] transition-colors"
                style={{ color: selected.includes(opt.value) ? "var(--text-1)" : "var(--text-2)",
                  background: selected.includes(opt.value) ? "var(--accent-dim)" : "transparent" }}>
                <span className={clsx("w-3.5 h-3.5 rounded flex-shrink-0 border flex items-center justify-center",
                  selected.includes(opt.value) ? "border-[var(--accent)]" : "border-[var(--border-strong)]")}
                  style={{ background: selected.includes(opt.value) ? "var(--accent)" : "transparent" }}>
                  {selected.includes(opt.value) && <span className="text-white text-[8px] font-bold">✓</span>}
                </span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DateRangeFilter({ fromDate, toDate, onChange }: {
  fromDate: string; toDate: string; onChange: (from: string, to: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])
  const active = fromDate || toDate
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={clsx(
          "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium border transition-all whitespace-nowrap",
          active ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--text-2)] hover:border-[var(--border-strong)]"
        )}
        style={{ background: active ? "var(--accent-dim)" : "var(--surface)" }}>
        <Calendar size={13} />
        Joined
        {active && <span className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />}
        <ChevronDown size={12} className={clsx("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-50 rounded-xl border shadow-xl p-4 min-w-[240px]"
          style={{ background: "var(--surface)", borderColor: "var(--border-strong)", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
          <div className="text-[11px] font-semibold mb-3" style={{ color: "var(--text-2)" }}>Date of Joining</div>
          <div className="space-y-2.5">
            <div>
              <label className="text-[10px] mb-1 block" style={{ color: "var(--text-3)" }}>From</label>
              <input type="date" value={fromDate}
                onChange={e => onChange(e.target.value, toDate)}
                className="glass-input w-full text-[12px] py-1.5" />
            </div>
            <div>
              <label className="text-[10px] mb-1 block" style={{ color: "var(--text-3)" }}>To</label>
              <input type="date" value={toDate}
                onChange={e => onChange(fromDate, e.target.value)}
                className="glass-input w-full text-[12px] py-1.5" />
            </div>
          </div>
          {(fromDate || toDate) && (
            <button onClick={() => { onChange("", ""); setOpen(false) }}
              className="mt-3 text-[11px] font-semibold" style={{ color: "var(--accent)" }}>
              Clear dates
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const router = useRouter()
  const allEmployees = useMemo(() => buildEmployeePool(), [])

  const [search,        setSearch]        = useState("")
  const [selClients,    setSelClients]    = useState<string[]>([])
  const [selCategories, setSelCategories] = useState<JobCategory[]>([])
  const [selCities,     setSelCities]     = useState<string[]>([])
  const [selStatuses,   setSelStatuses]   = useState<EmploymentStatus[]>([])
  const [fromDate,      setFromDate]      = useState("")
  const [toDate,        setToDate]        = useState("")
  const [sortBy,        setSortBy]        = useState<"name"|"rate"|"startDate"|"leave">("name")
  const [page,          setPage]          = useState(1)
  const PAGE_SIZE = 50

  function toggle<T>(arr: T[], set: (v: T[]) => void, val: T) {
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
    setPage(1)
  }

  const filtered = useMemo(() => {
    let list = [...allEmployees]
    if (search)              list = list.filter(e => [e.name,e.email,e.role,e.employeeCode].some(f => f.toLowerCase().includes(search.toLowerCase())))
    if (selClients.length)   list = list.filter(e => selClients.includes(e.clientId))
    if (selCategories.length)list = list.filter(e => selCategories.includes(e.jobCategory))
    if (selCities.length)    list = list.filter(e => selCities.includes(e.city))
    if (selStatuses.length)  list = list.filter(e => selStatuses.includes(e.employmentStatus))
    if (fromDate)            list = list.filter(e => e.startDate >= fromDate)
    if (toDate)              list = list.filter(e => e.startDate <= toDate)
    list.sort((a,b) =>
      sortBy==="name"      ? a.name.localeCompare(b.name) :
      sortBy==="rate"      ? b.ratePerHour-a.ratePerHour :
      sortBy==="startDate" ? new Date(b.startDate).getTime()-new Date(a.startDate).getTime() :
                             (b.leaveBalance.annual-b.leaveBalance.usedAnnual)-(a.leaveBalance.annual-a.leaveBalance.usedAnnual)
    )
    return list
  }, [allEmployees,search,selClients,selCategories,selCities,selStatuses,fromDate,toDate,sortBy])

  const paginated  = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length/PAGE_SIZE)
  const activeFilterCount = selClients.length+selCategories.length+selCities.length+selStatuses.length+(fromDate?1:0)+(toDate?1:0)

  const clientOptions = clients.map(c => ({ value: c.id, label: c.name }))
  const categoryOptions = JOB_CATEGORIES.map(c => ({ value: c, label: c }))
  const cityOptions = CITIES.map(c => ({ value: c, label: c }))
  const statusOptions = STATUSES.map(s => ({ value: s.value, label: s.label }))

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="flex items-center gap-4 px-6 py-3.5 border-b flex-shrink-0"
          style={{ background: "rgba(9,7,20,0.6)", backdropFilter:"blur(20px)", borderColor:"var(--border)" }}>
          <Users size={18} style={{ color:"var(--accent)" }} className="flex-shrink-0" />
          <div className="flex-1">
            <h1 className="text-base font-bold" style={{ color:"var(--text-1)" }}>Employees</h1>
            <p className="text-[11px]" style={{ color:"var(--text-3)" }}>
              {filtered.length.toLocaleString()} of {allEmployees.length.toLocaleString()} employees
            </p>
          </div>
          <button className="btn-ghost flex items-center gap-1.5 text-[12px] py-2 px-3">
            <Download size={12} /> Export
          </button>
        </header>

        {/* ── Horizontal filter bar ── */}
        <div className="flex items-center gap-2 px-6 py-3 border-b flex-shrink-0 overflow-x-auto"
          style={{ borderColor:"var(--border)", background:"var(--surface)" }}>

          {/* Search */}
          <div className="relative flex-shrink-0">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:"var(--text-3)" }} />
            <input
              className="glass-input pl-8 pr-3 py-2 text-[12px] w-52"
              placeholder="Name, code, role…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>

          <div className="w-px h-5 flex-shrink-0" style={{ background:"var(--border)" }} />

          <FilterDropdown label="Client" options={clientOptions}
            selected={selClients} onToggle={v => toggle(selClients, setSelClients, v)} onClear={() => setSelClients([])} />

          <FilterDropdown label="Category" icon={Briefcase} options={categoryOptions}
            selected={selCategories} onToggle={v => toggle(selCategories, setSelCategories, v as JobCategory)} onClear={() => setSelCategories([])} />

          <FilterDropdown label="City" icon={MapPin} options={cityOptions}
            selected={selCities} onToggle={v => toggle(selCities, setSelCities, v)} onClear={() => setSelCities([])} />

          <FilterDropdown label="Status" options={statusOptions}
            selected={selStatuses} onToggle={v => toggle(selStatuses, setSelStatuses, v as EmploymentStatus)} onClear={() => setSelStatuses([])} />

          <DateRangeFilter fromDate={fromDate} toDate={toDate}
            onChange={(f,t) => { setFromDate(f); setToDate(t); setPage(1) }} />

          {/* Sort */}
          <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[12px]"
            style={{ background:"var(--surface)", borderColor:"var(--border)", color:"var(--text-2)" }}>
            <ArrowUpDown size={12} />
            <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="bg-transparent text-[12px] outline-none" style={{ color:"var(--text-2)" }}>
              <option value="name">Name</option>
              <option value="rate">Rate ↓</option>
              <option value="startDate">Newest</option>
              <option value="leave">Leave</option>
            </select>
          </div>

          {/* Clear all */}
          {activeFilterCount > 0 && (
            <button onClick={() => { setSelClients([]); setSelCategories([]); setSelCities([]); setSelStatuses([]); setFromDate(""); setToDate(""); setSearch(""); setPage(1) }}
              className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-[11px] font-semibold flex-shrink-0 transition-all"
              style={{ color:"var(--danger)", background:"var(--danger-bg)", border:"1px solid var(--danger-border)" }}>
              <X size={11} /> Clear ({activeFilterCount})
            </button>
          )}
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10" style={{ background:"var(--surface)" }}>
              <tr className="border-b" style={{ borderColor:"var(--border)" }}>
                {["Employee","Client","Role / Category","City","Joined","Rate / hr","Leave","Status"].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold whitespace-nowrap"
                    style={{ color:"var(--text-3)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(emp => {
                const client = clients.find(c => c.id === emp.clientId)
                return (
                  <tr key={emp.id}
                    onClick={() => router.push(`/employees/${emp.id}`)}
                    className="ts-row border-b transition-all cursor-pointer"
                    style={{ borderColor:"var(--border)" }}>

                    {/* Employee */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                          style={{ background: emp.avatarColor+"22", color: emp.avatarColor }}>
                          {initials(emp.name)}
                        </div>
                        <div>
                          <div className="text-[12px] font-semibold" style={{ color:"var(--text-1)" }}>{emp.name}</div>
                          <div className="text-[10px] font-mono" style={{ color:"var(--text-3)" }}>{emp.employeeCode}</div>
                        </div>
                      </div>
                    </td>

                    {/* Client */}
                    <td className="px-4 py-3">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background:(client?.color||"#888")+"18", color:client?.color||"#888" }}>
                        {client?.code||emp.clientId.toUpperCase()}
                      </span>
                    </td>

                    {/* Role / Category */}
                    <td className="px-4 py-3">
                      <div className="text-[12px]" style={{ color:"var(--text-1)" }}>{emp.role}</div>
                      <div className="text-[10px]" style={{ color:"var(--text-3)" }}>{emp.jobCategory}</div>
                    </td>

                    {/* City */}
                    <td className="px-4 py-3">
                      <span className="text-[12px]" style={{ color:"var(--text-2)" }}>{emp.city}</span>
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3">
                      <span className="text-[12px] tabular-nums" style={{ color:"var(--text-2)" }}>
                        {new Date(emp.startDate).toLocaleDateString("en-IN",{month:"short",year:"numeric"})}
                      </span>
                    </td>

                    {/* Rate */}
                    <td className="px-4 py-3">
                      <span className="text-[12px] font-semibold tabular-nums" style={{ color:"var(--text-1)" }}>
                        ₹{emp.ratePerHour.toLocaleString()}
                      </span>
                    </td>

                    {/* Leave */}
                    <td className="px-4 py-3">
                      <LeaveBar bal={emp.leaveBalance} />
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusDot status={emp.employmentStatus} />
                    </td>
                  </tr>
                )
              })}
              {paginated.length === 0 && (
                <tr><td colSpan={8} className="text-center py-16 text-[13px]" style={{ color:"var(--text-3)" }}>
                  No employees match the current filters
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t flex-shrink-0"
            style={{ borderColor:"var(--border)", background:"var(--surface)" }}>
            <span className="text-[12px]" style={{ color:"var(--text-3)" }}>
              Page {page} of {totalPages} · {filtered.length} employees
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                className="p-1.5 rounded-lg disabled:opacity-30 transition-all btn-ghost">
                <ChevronLeft size={14} />
              </button>
              {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
                const p = totalPages<=5 ? i+1 : page<=3 ? i+1 : page>=totalPages-2 ? totalPages-4+i : page-2+i
                return (
                  <button key={p} onClick={()=>setPage(p)}
                    className="w-7 h-7 rounded-lg text-[12px] font-medium transition-all"
                    style={{ background:p===page?"var(--accent)":"transparent", color:p===page?"#fff":"var(--text-2)" }}>
                    {p}
                  </button>
                )
              })}
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
                className="p-1.5 rounded-lg disabled:opacity-30 transition-all btn-ghost">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
