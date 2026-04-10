"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import Sidebar from "@/components/Sidebar"
import AIAgentOrb from "@/components/AIAgentOrb"
import { clients, portals } from "@/lib/mock-data"
import type { Industry } from "@/lib/types"
import {
  Search, Building2, Users, Clock, AlertTriangle, ArrowRight,
  ChevronRight, Globe, Mail, Filter, CheckCircle2, TrendingUp,
} from "lucide-react"
import clsx from "clsx"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtINR(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`
  return `₹${n.toLocaleString()}`
}

function fmtNum(n: number) { return n.toLocaleString("en-IN") }

function ComplianceBar({ score }: { score: number }) {
  const color = score >= 90 ? "#00c896" : score >= 75 ? "#c89060" : "#c07070"
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-[10px] font-bold" style={{ color }}>{score}%</span>
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

  return (
    <Link href={`/clients/${client.id}`}>
      <div
        className="glass rounded-2xl p-4 flex flex-col gap-3 cursor-pointer transition-all hover:scale-[1.01]"
        style={{ borderLeft: `3px solid ${client.color}` }}
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-[13px] flex-shrink-0"
            style={{ background: `${client.color}18`, color: client.color }}
          >
            {client.code.slice(0, 3)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[13px] text-white truncate">{client.name}</div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[10px] text-white/35">{client.code}</span>
              <span className="text-white/15">·</span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-2)" }}
              >
                {client.industry}
              </span>
            </div>
          </div>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
            style={{ background: client.status === "active" ? "rgba(0,200,150,0.1)" : "rgba(192,112,112,0.1)", color: client.status === "active" ? "#00c896" : "#c07070" }}
          >
            {client.status}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-white/50">
            <Users size={11} />
            <span>{fmtNum(client.activeEmployeeCount)} active</span>
            <span className="text-white/25">/ {fmtNum(client.employeeCount)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {client.pendingTimesheets > 0 ? (
              <span className="text-amber-400 flex items-center gap-1">
                <Clock size={11} />{client.pendingTimesheets} pending
              </span>
            ) : (
              <span className="text-teal-400 flex items-center gap-1">
                <CheckCircle2 size={11} />All clear
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-white/50">
            <TrendingUp size={11} />
            <span>{fmtINR(client.monthlyPayroll)}/mo</span>
          </div>
          <div className="flex items-center gap-1.5">
            {client.emailOnly ? (
              <span className="text-violet-400 flex items-center gap-1"><Mail size={11} />Email only</span>
            ) : portal ? (
              <span className="text-white/50 flex items-center gap-1" style={{ color: portal.color }}>
                <Globe size={11} />{portal.shortName}
              </span>
            ) : null}
          </div>
        </div>

        {/* Compliance */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-white/25">Compliance score</span>
          </div>
          <ComplianceBar score={client.complianceScore} />
        </div>

        {/* City + policy */}
        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/[0.05]">
          <span className="text-white/30">{client.city} · Policy {client.policyVersion}</span>
          <span className="text-teal-400 flex items-center gap-1 font-medium">
            View <ArrowRight size={11} />
          </span>
        </div>
      </div>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const [search,   setSearch]   = useState("")
  const [industry, setIndustry] = useState<Industry | "all">("all")
  const [portal,   setPortal]   = useState<string>("all")
  const [sortBy,   setSortBy]   = useState<"name" | "employees" | "payroll" | "compliance">("employees")

  const filtered = useMemo(() => {
    let list = [...clients]
    if (search)           list = list.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()) || c.city.toLowerCase().includes(search.toLowerCase()))
    if (industry !== "all") list = list.filter(c => c.industry === industry)
    if (portal !== "all")   list = list.filter(c => portal === "email" ? c.emailOnly : c.portalId === portal)
    list.sort((a, b) =>
      sortBy === "name"       ? a.name.localeCompare(b.name) :
      sortBy === "employees"  ? b.employeeCount - a.employeeCount :
      sortBy === "payroll"    ? b.monthlyPayroll - a.monthlyPayroll :
                                b.complianceScore - a.complianceScore
    )
    return list
  }, [search, industry, portal, sortBy])

  const totalEmployees = clients.reduce((s, c) => s + c.employeeCount, 0)
  const totalPending   = clients.reduce((s, c) => s + c.pendingTimesheets, 0)
  const avgCompliance  = Math.round(clients.reduce((s, c) => s + c.complianceScore, 0) / clients.length)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-4 px-6 py-3.5 border-b border-white/[0.07] flex-shrink-0" style={{ background: "rgba(9,7,20,0.6)", backdropFilter: "blur(20px)" }}>
          <Building2 size={18} className="text-teal-400 flex-shrink-0" />
          <div className="flex-1">
            <h1 className="text-base font-bold text-white">Clients</h1>
            <p className="text-[11px] text-white/35">{clients.length} active clients · {fmtNum(totalEmployees)} total employees</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Clients",     value: clients.length, color: "#00c896", sub: "25 active" },
              { label: "Total Employees",   value: fmtNum(totalEmployees), color: "#8B5CF6", sub: "Across all clients" },
              { label: "Pending Timesheets",value: totalPending,   color: totalPending > 100 ? "#c89060" : "#00c896", sub: "Need ops action" },
              { label: "Avg Compliance",    value: `${avgCompliance}%`, color: avgCompliance > 90 ? "#00c896" : "#c89060", sub: "Across all clients" },
            ].map(s => (
              <div key={s.label} className="glass p-4">
                <div className="text-[11px] text-white/35 mb-1">{s.label}</div>
                <div className="text-[24px] font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[11px] text-white/30 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="glass p-3 flex flex-wrap items-center gap-3">
            <Filter size={13} className="text-white/30 flex-shrink-0" />

            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                className="glass-input w-full pl-8 text-[12px] py-1.5"
                placeholder="Search clients…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Industry filter */}
            <select
              className="glass-input text-[12px] py-1.5 pr-6"
              value={industry}
              onChange={e => setIndustry(e.target.value as Industry | "all")}
            >
              <option value="all">All industries</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>

            {/* Portal filter */}
            <select
              className="glass-input text-[12px] py-1.5 pr-6"
              value={portal}
              onChange={e => setPortal(e.target.value)}
            >
              <option value="all">All sources</option>
              {portals.map(p => <option key={p.id} value={p.id}>{p.shortName}</option>)}
              <option value="email">Email only</option>
            </select>

            {/* Sort */}
            <select
              className="glass-input text-[12px] py-1.5 pr-6"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
            >
              <option value="employees">Sort: Employees</option>
              <option value="payroll">Sort: Payroll</option>
              <option value="compliance">Sort: Compliance</option>
              <option value="name">Sort: Name</option>
            </select>

            <span className="text-[11px] text-white/30 ml-auto">{filtered.length} results</span>
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
