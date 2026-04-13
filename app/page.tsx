"use client"

import { useState, useMemo } from "react"
import Sidebar from "@/components/Sidebar"
import AIAgentOrb from "@/components/AIAgentOrb"
import { clients, weeklyTrend, payrollBatches } from "@/lib/mock-data"
import {
  Bell, Search, RefreshCw, Mail, TrendingUp, TrendingDown,
  Zap, Clock, Shield, CheckCircle2, AlertTriangle, Banknote,
  Users, BarChart3, ArrowRight, ChevronRight, Target, ChevronDown,
} from "lucide-react"
import {
  AreaChart, Area, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, ComposedChart, Line,
  PieChart, Pie, Cell,
} from "recharts"
import Link from "next/link"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtINR(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`
  return `₹${n.toLocaleString("en-IN")}`
}

// ─── Business KPI Data ────────────────────────────────────────────────────────

const processKRAs = [
  {
    label: "Mark Auto-Approved",
    value: "266",
    sub: "+18% vs last month (225)",
    trend: "up" as const,
    icon: CheckCircle2,
    color: "var(--accent)",
    detail: "Apr 2026 · month",
  },
  {
    label: "Auto-Approval Rate",
    value: "62%",
    sub: "+4.2pp vs last month",
    trend: "up" as const,
    icon: Zap,
    color: "var(--accent)",
    detail: "Agent Mark",
  },
  {
    label: "SLA Adherence",
    value: "94.1%",
    sub: "Target: 95%",
    trend: "up" as const,
    icon: Target,
    color: "var(--info)",
    detail: "48h window",
  },
  {
    label: "Avg Turnaround",
    value: "4.2h",
    sub: "−0.8h vs last month",
    trend: "down" as const,
    icon: Clock,
    color: "var(--accent)",
    detail: "End-to-end",
  },
  {
    label: "Validation Error Rate",
    value: "3.1%",
    sub: "−1.4pp vs last month",
    trend: "down" as const,
    icon: Shield,
    color: "var(--warn)",
    detail: "Policy violations",
  },
  {
    label: "Payroll On-Time",
    value: "89%",
    sub: "3 batches delayed",
    trend: "up" as const,
    icon: Banknote,
    color: "var(--accent)",
    detail: "Released in cycle",
  },
  {
    label: "Active Holds",
    value: "9",
    sub: "4 contract, 3 banking, 2 data",
    trend: "up" as const,
    icon: AlertTriangle,
    color: "var(--warn)",
    detail: "Payroll blocked",
  },
]

// Monthly submission trend (6 months)
const monthlyTrend = [
  { month: "Nov", submitted: 1820, approved: 1710, autoApproved: 1040, flagged: 72 },
  { month: "Dec", submitted: 1680, approved: 1590, autoApproved: 980,  flagged: 58 },
  { month: "Jan", submitted: 2040, approved: 1920, autoApproved: 1210, flagged: 91 },
  { month: "Feb", submitted: 2180, approved: 2050, autoApproved: 1310, flagged: 88 },
  { month: "Mar", submitted: 2390, approved: 2280, autoApproved: 1480, flagged: 76 },
  { month: "Apr", submitted: 636,  approved: 412,  autoApproved: 266,  flagged: 24 }, // partial
]

// Per-client KPI table data
const clientKPIs = [
  { id:"hex", name:"Hexaware",        code:"HEX", color:"#FF6B35", submitted:87,  autoApproved:61,  manual:23, flagged:3,  onHold:3,  payroll:78400000,  sla:94, complianceScore:94 },
  { id:"ibp", name:"Infosys BPM",     code:"IBP", color:"#0070F3", submitted:124, autoApproved:92,  manual:28, flagged:4,  onHold:0,  payroll:95800000,  sla:98, complianceScore:97 },
  { id:"cgi", name:"Capgemini",        code:"CGI", color:"#003189", submitted:52,  autoApproved:35,  manual:14, flagged:3,  onHold:1,  payroll:68000000,  sla:91, complianceScore:92 },
  { id:"lti", name:"L&T Infotech",    code:"LTI", color:"#009A44", submitted:78,  autoApproved:55,  manual:19, flagged:4,  onHold:4,  payroll:89000000,  sla:89, complianceScore:96 },
  { id:"mnd", name:"Mindtree",         code:"MND", color:"#E94F37", submitted:71,  autoApproved:49,  manual:18, flagged:4,  onHold:2,  payroll:72000000,  sla:92, complianceScore:93 },
  { id:"gss", name:"GlobalStaff",      code:"GSS", color:"#8B5CF6", submitted:16,  autoApproved:11,  manual:4,  flagged:1,  onHold:0,  payroll:20200000,  sla:100,complianceScore:90 },
  { id:"fhl", name:"FinanceHub",       code:"FHL", color:"#F59E0B", submitted:29,  autoApproved:14,  manual:10, flagged:5,  onHold:0,  payroll:42000000,  sla:86, complianceScore:82 },
  { id:"msh", name:"MedSure",          code:"MSH", color:"#FF6B6B", submitted:20,  autoApproved:11,  manual:7,  flagged:2,  onHold:2,  payroll:6800000,   sla:90, complianceScore:84 },
]

// Payroll status donut (current month)
const payrollDonut = [
  { name: "Processed",  value: 2, color: "var(--accent)" },
  { name: "Approved",   value: 1, color: "var(--info)" },
  { name: "Pending",    value: 3, color: "var(--warn)" },
  { name: "On Hold",    value: 2, color: "var(--danger)" },
]

// Agent efficiency trend
const agentEfficiency = [
  { month: "Nov", autoRate: 57, sla: 91, errorRate: 5.2 },
  { month: "Dec", autoRate: 58, sla: 92, errorRate: 4.8 },
  { month: "Jan", autoRate: 59, sla: 93, errorRate: 4.5 },
  { month: "Feb", autoRate: 60, sla: 93, errorRate: 4.1 },
  { month: "Mar", autoRate: 61, sla: 94, errorRate: 3.6 },
  { month: "Apr", autoRate: 62, sla: 94, errorRate: 3.1 },
]

// ─── Component ────────────────────────────────────────────────────────────────

// ─── Inline select ───────────────────────────────────────────────────────────

function InlineSelect({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: { label: string; value: string }[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="glass-input text-[11px] py-1.5 pr-7 appearance-none cursor-pointer"
        style={{ paddingRight: 28 }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-3)" }} />
    </div>
  )
}

export default function DashboardPage() {
  const [slaFilter, setSlaFilter]   = useState("all")
  const [holdFilter, setHoldFilter] = useState("all")
  const [sortBy, setSortBy]         = useState("payroll")

  const totalSubmitted    = clientKPIs.reduce((s, c) => s + c.submitted, 0)
  const totalAutoApproved = clientKPIs.reduce((s, c) => s + c.autoApproved, 0)
  const totalFlagged      = clientKPIs.reduce((s, c) => s + c.flagged, 0)
  const totalPayroll      = clientKPIs.reduce((s, c) => s + c.payroll, 0)
  const totalOnHold       = clientKPIs.reduce((s, c) => s + c.onHold, 0)

  const filteredClients = useMemo(() => {
    let rows = [...clientKPIs]
    if (slaFilter === "risk")    rows = rows.filter(c => c.sla < 90)
    if (slaFilter === "healthy") rows = rows.filter(c => c.sla >= 95)
    if (holdFilter === "holds")  rows = rows.filter(c => c.onHold > 0)
    if (holdFilter === "clean")  rows = rows.filter(c => c.onHold === 0)
    if (sortBy === "payroll")    rows.sort((a, b) => b.payroll - a.payroll)
    if (sortBy === "submitted")  rows.sort((a, b) => b.submitted - a.submitted)
    if (sortBy === "sla")        rows.sort((a, b) => a.sla - b.sla)
    if (sortBy === "flagged")    rows.sort((a, b) => b.flagged - a.flagged)
    return rows
  }, [slaFilter, holdFilter, sortBy])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 lg:px-6 py-3 lg:py-3.5 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--glass-bg)", backdropFilter: "blur(20px)" }}>
          <div className="hidden sm:flex flex-1 max-w-xs relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
            <input className="glass-input w-full pl-8 text-sm" placeholder="Search clients, timesheets, employees…" />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium"
              style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "#A78BFA" }}>
              <Mail size={11} />
              candidatemanager@buzzworks.com
              <span className="w-1.5 h-1.5 rounded-full animate-dot-blink" style={{ background: "var(--accent)" }} />
            </div>
            <button className="btn-ghost flex items-center gap-1.5 py-1.5 px-3 text-xs min-h-[36px]">
              <RefreshCw size={12} /><span className="hidden sm:inline">Sync portals</span>
            </button>
            <button className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: "var(--text-2)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: "var(--danger)" }} />
            </button>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #00D4A5)" }}>RS</div>
          </div>
        </header>

        {/* Scrollable body */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-5 space-y-4 lg:space-y-5 pb-nav lg:pb-5">

          {/* Welcome + month summary */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-0 sm:justify-between">
            <div>
              <h1 className="text-lg lg:text-xl font-bold" style={{ color: "var(--text-1)" }}>
                Operations Overview{" "}
                <span className="font-normal text-base" style={{ color: "var(--text-3)" }}>Apr 2026 · Week 1</span>
              </h1>
              <p className="text-[12px] lg:text-[13px] mt-0.5" style={{ color: "var(--text-3)" }}>
                {totalSubmitted} timesheets · {totalFlagged} flagged · {totalOnHold} holds · Closes Friday
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/timesheets">
                <button className="btn-ghost flex items-center gap-1.5 text-[13px] min-h-[40px]">Open Inbox <ArrowRight size={13} /></button>
              </Link>
              <Link href="/payroll">
                <button className="btn-teal flex items-center gap-1.5 text-[13px] min-h-[40px]">Run Payroll <Banknote size={13} /></button>
              </Link>
            </div>
          </div>

          {/* Process Efficiency KRA row */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={13} style={{ color: "var(--accent)" }} />
              <div className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Process Efficiency KRAs</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {processKRAs.map(k => (
                <div key={k.label} className="glass p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <k.icon size={14} style={{ color: k.color }} />
                    <div className="flex items-center gap-0.5 text-[10px]" style={{ color: "var(--text-3)" }}>
                      {k.trend === "up"
                        ? <TrendingUp size={10} style={{ color: k.color === "var(--warn)" ? "var(--warn)" : "var(--accent)" }} />
                        : <TrendingDown size={10} style={{ color: "var(--accent)" }} />
                      }
                    </div>
                  </div>
                  <div className="text-[22px] font-black leading-none" style={{ color: k.color }}>{k.value}</div>
                  <div>
                    <div className="text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>{k.label}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>{k.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

            {/* Client-wise KPI table — 3 cols */}
            <div className="lg:col-span-3 glass overflow-hidden">
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>Client-wise Summary</div>
                    <div className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>Apr 2026 Week 1 · {filteredClients.length} of {clients.length} clients shown</div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]" style={{ color: "var(--text-3)" }}>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: "var(--accent)" }} /> Auto-✓</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: "var(--warn)" }} /> Flagged</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: "var(--danger)" }} /> Hold</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <InlineSelect
                    value={slaFilter}
                    onChange={setSlaFilter}
                    options={[
                      { label: "All SLA levels", value: "all" },
                      { label: "At risk (SLA < 90%)", value: "risk" },
                      { label: "Healthy (SLA ≥ 95%)", value: "healthy" },
                    ]}
                  />
                  <InlineSelect
                    value={holdFilter}
                    onChange={setHoldFilter}
                    options={[
                      { label: "All holds", value: "all" },
                      { label: "With holds", value: "holds" },
                      { label: "No holds", value: "clean" },
                    ]}
                  />
                  <InlineSelect
                    value={sortBy}
                    onChange={setSortBy}
                    options={[
                      { label: "Sort: Payroll ↓", value: "payroll" },
                      { label: "Sort: Submitted ↓", value: "submitted" },
                      { label: "Sort: SLA ↑ (worst first)", value: "sla" },
                      { label: "Sort: Flagged ↓", value: "flagged" },
                    ]}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Client", "Submitted", "Auto-✓", "Manual", "Flagged", "On Hold", "Payroll", "SLA"].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map(c => {
                      const autoRate = Math.round((c.autoApproved / c.submitted) * 100)
                      return (
                        <tr key={c.id} className="ts-row">
                          <td className="px-3 py-2.5">
                            <Link href={`/clients/${c.id}`}>
                              <div className="flex items-center gap-2 cursor-pointer">
                                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                                  style={{ background: `${c.color}22`, color: c.color }}>{c.code.slice(0,3)}</div>
                                <div>
                                  <div className="font-semibold text-[11px]" style={{ color: "var(--text-1)" }}>{c.name}</div>
                                  <div className="text-[10px]" style={{ color: "var(--text-3)" }}>{c.code}</div>
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td className="px-3 py-2.5 font-semibold" style={{ color: "var(--text-1)" }}>{c.submitted}</td>
                          <td className="px-3 py-2.5">
                            <div className="font-semibold" style={{ color: "var(--accent)" }}>{c.autoApproved}</div>
                            <div className="text-[10px]" style={{ color: "var(--text-3)" }}>{autoRate}%</div>
                          </td>
                          <td className="px-3 py-2.5" style={{ color: "var(--text-2)" }}>{c.manual}</td>
                          <td className="px-3 py-2.5">
                            {c.flagged > 0
                              ? <span className="font-semibold" style={{ color: "var(--warn)" }}>{c.flagged}</span>
                              : <span style={{ color: "var(--text-3)" }}>—</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            {c.onHold > 0
                              ? <span className="font-semibold" style={{ color: "var(--danger)" }}>{c.onHold}</span>
                              : <span style={{ color: "var(--accent)" }}>✓</span>}
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-[11px]" style={{ color: "var(--text-1)" }}>{fmtINR(c.payroll)}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 h-1 rounded-full" style={{ background: "var(--surface-hover)", minWidth: 32 }}>
                                <div className="h-1 rounded-full" style={{ width: `${c.sla}%`, background: c.sla >= 95 ? "var(--accent)" : c.sla >= 85 ? "var(--warn)" : "var(--danger)" }} />
                              </div>
                              <span className="text-[10px]" style={{ color: c.sla >= 95 ? "var(--accent)" : c.sla >= 85 ? "var(--warn)" : "var(--danger)" }}>{c.sla}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
                      <td className="px-3 py-2.5 text-[11px] font-bold" style={{ color: "var(--text-2)" }}>TOTAL</td>
                      <td className="px-3 py-2.5 font-black" style={{ color: "var(--text-1)" }}>{totalSubmitted}</td>
                      <td className="px-3 py-2.5 font-black" style={{ color: "var(--accent)" }}>{totalAutoApproved}</td>
                      <td className="px-3 py-2.5 font-semibold" style={{ color: "var(--text-2)" }}>{clientKPIs.reduce((s,c) => s+c.manual, 0)}</td>
                      <td className="px-3 py-2.5 font-black" style={{ color: "var(--warn)" }}>{totalFlagged}</td>
                      <td className="px-3 py-2.5 font-black" style={{ color: totalOnHold > 0 ? "var(--danger)" : "var(--accent)" }}>{totalOnHold}</td>
                      <td className="px-3 py-2.5 font-black text-[11px]" style={{ color: "var(--accent)" }}>{fmtINR(totalPayroll)}</td>
                      <td className="px-3 py-2.5" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Right column — 2 cols */}
            <div className="lg:col-span-2 flex flex-col gap-4">

              {/* Payroll status donut */}
              <div className="glass p-4">
                <div className="text-[13px] font-semibold mb-1" style={{ color: "var(--text-1)" }}>Payroll Batches</div>
                <div className="text-[11px] mb-3" style={{ color: "var(--text-3)" }}>Apr 2026 · {payrollBatches.length} batches · {fmtINR(totalPayroll)} total</div>
                <div className="flex items-center gap-4">
                  <div style={{ width: 90, height: 90 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={payrollDonut} cx="50%" cy="50%" innerRadius={26} outerRadius={40} paddingAngle={2} dataKey="value" strokeWidth={0}>
                          {payrollDonut.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 flex-1">
                    {payrollDonut.map(d => (
                      <div key={d.name} className="flex items-center gap-2 text-[11px]">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                        <span className="flex-1" style={{ color: "var(--text-2)" }}>{d.name}</span>
                        <span className="font-bold" style={{ color: "var(--text-1)" }}>{d.value}</span>
                      </div>
                    ))}
                    <Link href="/payroll" className="flex items-center gap-1 text-[10px] mt-1 pt-1" style={{ color: "var(--accent)", borderTop: "1px solid var(--border)" }}>
                      View all batches <ChevronRight size={10} />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Agent efficiency trend */}
              <div className="glass p-4">
                <div className="text-[13px] font-semibold mb-0.5" style={{ color: "var(--text-1)" }}>Agent Mark Efficiency</div>
                <div className="text-[11px] mb-3" style={{ color: "var(--text-3)" }}>Auto-approval rate trend (6 months)</div>
                <div style={{ height: 80 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={agentEfficiency}>
                      <defs>
                        <linearGradient id="arGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00c896" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#00c896" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" tick={{ fontSize: 9, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
                      <YAxis hide domain={[50, 70]} />
                      <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 10, color: "var(--text-1)" }} formatter={(v: number) => `${v}%`} />
                      <Area type="monotone" dataKey="autoRate" stroke="var(--accent)" strokeWidth={2} fill="url(#arGrad)" dot={false} name="Auto-approval %" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-between text-[10px] mt-1" style={{ color: "var(--text-3)" }}>
                  <span>Nov 2025: 57%</span>
                  <span style={{ color: "var(--accent)", fontWeight: 700 }}>Apr 2026: 62% ↑</span>
                </div>
              </div>

              {/* Policy hold alerts */}
              <div className="glass p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={13} style={{ color: "var(--warn)" }} />
                  <div className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>Active Holds</div>
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>{totalOnHold}</span>
                </div>
                <div className="space-y-2">
                  {[
                    { reason: "Contract expired", count: 4, color: "var(--danger)", policy: "CEE-001" },
                    { reason: "Bank details missing", count: 3, color: "var(--warn)", policy: "PRP-002" },
                    { reason: "Work order null", count: 2, color: "var(--warn)", policy: "WOV-003" },
                  ].map(h => (
                    <div key={h.reason} className="flex items-center gap-2 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: h.color }} />
                      <span className="flex-1" style={{ color: "var(--text-2)" }}>{h.reason}</span>
                      <span className="text-[10px] font-mono" style={{ color: "var(--text-3)" }}>{h.policy}</span>
                      <span className="font-bold" style={{ color: h.color }}>{h.count}</span>
                    </div>
                  ))}
                </div>
                <Link href="/policy" className="flex items-center gap-1 text-[10px] mt-3 pt-2" style={{ color: "var(--accent)", borderTop: "1px solid var(--border)" }}>
                  Manage policy holds <ChevronRight size={10} />
                </Link>
              </div>
            </div>
          </div>

          {/* Monthly submission trend — full width */}
          <div className="glass p-5">
            <div className="flex items-center justify-between mb-1">
              <div>
                <div className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>Monthly Submission Trends</div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>Nov 2025 – Apr 2026 · All clients combined</div>
              </div>
              <div className="flex items-center gap-4 text-[10px]" style={{ color: "var(--text-3)" }}>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full inline-block" style={{ background: "var(--accent)", opacity: 0.4 }} /> Submitted</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full inline-block" style={{ background: "var(--accent)" }} /> Approved</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full inline-block" style={{ background: "var(--warn)" }} /> Flagged</span>
              </div>
            </div>
            <div style={{ height: 130 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyTrend} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00c896" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#00c896" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="apGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00c896" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00c896" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "var(--text-3)" }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, color: "var(--text-1)" }} />
                  <Area type="monotone" dataKey="submitted"   stroke="rgba(0,200,150,0.35)" strokeWidth={1.5} fill="url(#subGrad)" dot={false} name="Submitted" />
                  <Area type="monotone" dataKey="approved"    stroke="var(--accent)"        strokeWidth={2}   fill="url(#apGrad)"  dot={false} name="Approved" />
                  <Bar  dataKey="flagged" fill="var(--warn)" opacity={0.5} radius={[2,2,0,0]} barSize={12} name="Flagged" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom row: 3-column agent stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                label: "Agent Mark",
                sub: "Timesheet Validation",
                color: "var(--accent)",
                metrics: [
                  { k: "Processed today", v: "48" },
                  { k: "Auto-approved (month)", v: "266" },
                  { k: "Avg processing", v: "1.4s" },
                  { k: "Success rate", v: "99.2%" },
                ],
              },
              {
                label: "Agent ECHO",
                sub: "Exit Lifecycle",
                color: "var(--warn)",
                metrics: [
                  { k: "Exits tracked", v: "3" },
                  { k: "FnF pending", v: "2" },
                  { k: "Assets on hold", v: "₹4.2L" },
                  { k: "Salary holds", v: "3" },
                ],
              },
              {
                label: "Agent NEXUS",
                sub: "Data & Fraud Detection",
                color: "var(--info)",
                metrics: [
                  { k: "PAN missing", v: "0" },
                  { k: "Bank holds", v: "3" },
                  { k: "Duplicate accounts", v: "1" },
                  { k: "Work order gaps", v: "2" },
                ],
              },
            ].map(agent => (
              <div key={agent.label} className="glass p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full animate-dot-blink" style={{ background: agent.color }} />
                  <div className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>{agent.label}</div>
                  <span className="text-[10px] ml-auto" style={{ color: "var(--text-3)" }}>{agent.sub}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {agent.metrics.map(m => (
                    <div key={m.k} className="rounded-lg p-2.5" style={{ background: "var(--surface)" }}>
                      <div className="text-[16px] font-black" style={{ color: agent.color }}>{m.v}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>{m.k}</div>
                    </div>
                  ))}
                </div>
                <Link href="/agents">
                  <button className="w-full mt-3 text-[11px] py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1"
                    style={{ background: "var(--surface)", color: "var(--text-2)", border: "1px solid var(--border)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "var(--surface)")}>
                    View agent <ChevronRight size={11} />
                  </button>
                </Link>
              </div>
            ))}
          </div>

        </main>
      </div>

      <AIAgentOrb />
    </div>
  )
}
