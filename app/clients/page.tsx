"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import Link from "next/link"
import Sidebar from "@/components/Sidebar"
import AIAgentOrb from "@/components/AIAgentOrb"
import { clients, portals } from "@/lib/mock-data"
import type { Industry } from "@/lib/types"
import { getActionCountForClient } from "@/lib/compliance-data"
import {
  Search, Building2, Users, Clock, ArrowRight, X,
  ChevronDown, Globe, Mail, CheckCircle2, TrendingUp, Bell,
  Briefcase, ArrowUpDown, MapPin,
} from "lucide-react"
import clsx from "clsx"

// ─── Filter Dropdown (matches employees page) ─────────────────────────────────

function FilterDropdown({
  label, icon: Icon, options, selected, onToggle, onClear,
}: {
  label: string
  icon?: React.ComponentType<{ size?: number }>
  options: { value: string; label: string }[]
  selected: string[]
  onToggle: (v: string) => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])
  const active = selected.length > 0
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={clsx(
          "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all whitespace-nowrap",
          active ? "border-[color:var(--accent)]" : "border-[color:var(--border)] hover:border-[color:var(--border-strong)]"
        )}
        style={{
          background: active ? "var(--pink-100)" : "var(--surface)",
          color: active ? "var(--pink-700)" : "var(--text-2)",
        }}
      >
        {Icon && <Icon size={12} />}
        {label}
        {active && (
          <span className="w-4 h-4 rounded-full text-[11px] font-bold flex items-center justify-center"
            style={{ background: "var(--accent)", color: "#fff" }}>
            {selected.length}
          </span>
        )}
        <ChevronDown size={11} className={clsx("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-[100] rounded-xl border shadow-xl min-w-[200px] py-1.5"
          style={{ background: "var(--surface)", borderColor: "var(--border-strong)", boxShadow: "0 12px 32px rgba(0,0,0,0.15)" }}>
          {selected.length > 0 && (
            <button onClick={() => { onClear(); setOpen(false) }}
              className="w-full text-left px-3 py-1.5 text-xs font-semibold mb-1"
              style={{ color: "var(--accent)" }}>
              Clear all
            </button>
          )}
          <div className="max-h-52 overflow-y-auto">
            {options.map(opt => (
              <button key={opt.value} onClick={() => onToggle(opt.value)}
                className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs transition-colors"
                style={{
                  color: selected.includes(opt.value) ? "var(--text-1)" : "var(--text-2)",
                  background: selected.includes(opt.value) ? "var(--accent-dim)" : "transparent",
                }}>
                <span className={clsx("w-3.5 h-3.5 rounded flex-shrink-0 border flex items-center justify-center",
                  selected.includes(opt.value) ? "border-[color:var(--accent)]" : "border-[color:var(--border-strong)]")}
                  style={{ background: selected.includes(opt.value) ? "var(--accent)" : "transparent" }}>
                  {selected.includes(opt.value) && <span className="text-white text-[11px] font-bold">✓</span>}
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtINR(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`
  return `₹${n.toLocaleString()}`
}

function fmtNum(n: number) { return n.toLocaleString("en-IN") }

function ComplianceBar({ score }: { score: number }) {
  const color = score >= 90 ? "var(--accent)" : score >= 75 ? "#c89060" : "#c07070"
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full" style={{ background: "var(--border)" }}>
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-[11px] font-bold" style={{ color }}>{score}%</span>
    </div>
  )
}

const INDUSTRIES: Industry[] = [
  "IT Services","BFSI","Healthcare","Staffing","Fintech",
  "AutoTech","IT Products","IT Design","IT Training","IT Staffing","Engineering",
]

// ─── Client Card ─────────────────────────────────────────────────────────────

function ClientCard({ client }: { client: typeof clients[0] }) {
  const portal = client.portalId ? portals.find(p => p.id === client.portalId) : null
  const actionCount = getActionCountForClient(client.name)

  return (
    <Link href={`/clients/${client.id}`}>
      <div
        className="glass rounded-2xl p-4 flex flex-col gap-3 cursor-pointer transition-all hover:shadow-md"
        style={{ borderLeft: `3px solid ${client.color}` }}
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-[14px] flex-shrink-0"
            style={{ background: `${client.color}18`, color: client.color }}
          >
            {client.code.slice(0, 3)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[14px] truncate" style={{ color: "var(--text-1)" }}>{client.name}</div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[11px]" style={{ color: "var(--text-3)" }}>{client.code}</span>
              <span style={{ color: "var(--text-3)" }}>·</span>
              <span
                className="text-[11px] px-2 py-0.5 rounded-full"
                style={{ background: "var(--surface-2)", color: "var(--text-2)" }}
              >
                {client.industry}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span
              className="text-[11px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{ background: client.status === "active" ? "rgba(75,143,255,0.1)" : "rgba(192,112,112,0.1)", color: client.status === "active" ? "var(--accent)" : "#c07070" }}
            >
              {client.status}
            </span>
            {actionCount > 0 && (
              <span
                onClick={e => { e.preventDefault(); e.stopPropagation(); window.location.href = `/compliance` }}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-semibold transition-opacity hover:opacity-80"
                style={{ background: "var(--warn-bg)", color: "var(--warn)" }}
              >
                <Bell size={10} />
                {actionCount}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-1.5" style={{ color: "var(--text-2)" }}>
            <Users size={11} />
            <span>{fmtNum(client.activeEmployeeCount)} active</span>
            <span style={{ color: "var(--text-3)" }}>/ {fmtNum(client.employeeCount)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {client.pendingTimesheets > 0 ? (
              <span className="flex items-center gap-1" style={{ color: "var(--warn)" }}>
                <Clock size={11} />{client.pendingTimesheets} pending
              </span>
            ) : (
              <span className="flex items-center gap-1" style={{ color: "var(--accent)" }}>
                <CheckCircle2 size={11} />All clear
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5" style={{ color: "var(--text-2)" }}>
            <TrendingUp size={11} />
            <span>{fmtINR(client.monthlyPayroll)}/mo</span>
          </div>
          <div className="flex items-center gap-1.5">
            {client.timesheetMethod === "manual" ? (
              <span className="flex items-center gap-1" style={{ color: "#A78BFA" }}><Mail size={11} />Manual</span>
            ) : portal ? (
              <span className="flex items-center gap-1" style={{ color: portal.color }}>
                <Globe size={11} />{portal.shortName}
              </span>
            ) : null}
          </div>
        </div>

        {/* Compliance */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px]" style={{ color: "var(--text-3)" }}>Compliance score</span>
          </div>
          <ComplianceBar score={client.complianceScore} />
        </div>

        {/* City + policy */}
        <div className="flex items-center justify-between text-[11px] pt-1 border-t" style={{ borderColor: "var(--border)" }}>
          <span style={{ color: "var(--text-3)" }}>{client.city} · Policy {client.policyVersion}</span>
          <span className="flex items-center gap-1 font-medium" style={{ color: "var(--accent)" }}>
            View <ArrowRight size={11} />
          </span>
        </div>
      </div>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const [search,        setSearch]        = useState("")
  const [selIndustries, setSelIndustries] = useState<Industry[]>([])
  const [selPortals,    setSelPortals]    = useState<string[]>([])
  const [selRegions,    setSelRegions]    = useState<string[]>([])
  const [sortBy,        setSortBy]        = useState<"name" | "employees" | "payroll" | "compliance">("employees")

  function toggle<T>(arr: T[], set: (v: T[]) => void, val: T) {
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  const filtered = useMemo(() => {
    let list = [...clients]
    if (search) list = list.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase()) ||
      c.state.toLowerCase().includes(search.toLowerCase())
    )
    if (selIndustries.length) list = list.filter(c => selIndustries.includes(c.industry as Industry))
    if (selRegions.length)    list = list.filter(c => selRegions.includes(c.state))
    if (selPortals.length) list = list.filter(c => {
      if (selPortals.includes("manual") && c.timesheetMethod === "manual") return true
      if (c.portalId && selPortals.includes(c.portalId)) return true
      return false
    })
    list.sort((a, b) =>
      sortBy === "name"       ? a.name.localeCompare(b.name) :
      sortBy === "employees"  ? b.employeeCount - a.employeeCount :
      sortBy === "payroll"    ? b.monthlyPayroll - a.monthlyPayroll :
                                b.complianceScore - a.complianceScore
    )
    return list
  }, [search, selIndustries, selPortals, selRegions, sortBy])

  const activeFilterCount = selIndustries.length + selPortals.length + selRegions.length

  const industryOptions = INDUSTRIES.map(i => ({ value: i, label: i }))
  const portalOptions   = [
    ...portals.map(p => ({ value: p.id, label: p.shortName })),
    { value: "manual", label: "Manual (no portal)" },
  ]
  const regionOptions = useMemo(
    () => Array.from(new Set(clients.map(c => c.state))).sort().map(s => ({ value: s, label: s })),
    []
  )

  const totalEmployees = clients.reduce((s, c) => s + c.employeeCount, 0)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 lg:px-6 py-3 lg:py-3.5 border-b border-white/[0.07] flex-shrink-0" style={{ background: "var(--surface)", backdropFilter: "blur(20px)" }}>
          <Building2 size={18} style={{ color: "var(--accent)" }} className="flex-shrink-0" />
          <div className="flex-1">
            <h1 className="text-base font-bold" style={{ color: "var(--text-1)" }}>Clients</h1>
            <p className="text-[11px]" style={{ color: "var(--text-3)" }}>{clients.length} active clients · {fmtNum(totalEmployees)} total employees</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Filters — flex-wrap allows dropdowns to escape without overflow clip */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <FilterDropdown label="Industry" icon={Briefcase} options={industryOptions}
                selected={selIndustries} onToggle={v => toggle(selIndustries, setSelIndustries, v as Industry)}
                onClear={() => setSelIndustries([])} />

              <FilterDropdown label="Region" icon={MapPin} options={regionOptions}
                selected={selRegions} onToggle={v => toggle(selRegions, setSelRegions, v)}
                onClear={() => setSelRegions([])} />

              <FilterDropdown label="Source" icon={Globe} options={portalOptions}
                selected={selPortals} onToggle={v => toggle(selPortals, setSelPortals, v)}
                onClear={() => setSelPortals([])} />

              {/* Sort */}
              <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs"
                style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-2)" }}>
                <ArrowUpDown size={12} />
                <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                  className="bg-transparent outline-none cursor-pointer" style={{ color: "var(--text-2)" }}>
                  <option value="employees">Employees</option>
                  <option value="payroll">Payroll</option>
                  <option value="compliance">Compliance</option>
                  <option value="name">Name</option>
                </select>
              </div>

              {/* Clear all */}
              {activeFilterCount > 0 && (
                <button onClick={() => { setSelIndustries([]); setSelPortals([]); setSelRegions([]); setSearch("") }}
                  className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-semibold flex-shrink-0"
                  style={{ color: "var(--danger)", background: "var(--danger-bg)", border: "1px solid var(--danger-border)" }}>
                  <X size={11} /> Clear ({activeFilterCount})
                </button>
              )}

              {/* Search — pinned to the right to match Compliance Inbox */}
              <div className="relative ml-auto">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
                <input
                  className="glass-input pl-8 text-xs py-2 w-52"
                  placeholder="Search clients…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              <span className="text-xs flex-shrink-0" style={{ color: "var(--text-3)" }}>
                {filtered.length} of {clients.length}
              </span>
            </div>
          </div>

          {/* Client grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map(client => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        </main>
      </div>
      <AIAgentOrb />
    </div>
  )
}
