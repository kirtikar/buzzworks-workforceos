"use client"

import Sidebar from "@/components/Sidebar"
import BottomNav from "@/components/BottomNav"
import { clients } from "@/lib/mock-data"
import {
  TrendingUp, TrendingDown, Zap, Target, IndianRupee, FileCheck,
} from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  ResponsiveContainer, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtINR(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`
  return `₹${n.toLocaleString("en-IN")}`
}

// ─── Data ─────────────────────────────────────────────────────────────────────

// 4 CEO-level KPIs
const kpis = [
  {
    label: "Monthly Ops Cost",
    value: "₹18L",
    delta: "-22% vs without AI",
    trend: "down" as const,
    icon: IndianRupee,
    color: "var(--accent)",
  },
  {
    label: "Timesheets / team member",
    value: "636",
    delta: "+31% vs Mar (478)",
    trend: "up" as const,
    icon: FileCheck,
    color: "var(--accent)",
  },
  {
    label: "Auto-Approval Rate",
    value: "62%",
    delta: "+4.2pp vs last month",
    trend: "up" as const,
    icon: Zap,
    color: "var(--accent)",
  },
  {
    label: "SLA Adherence",
    value: "94.1%",
    delta: "Target: 95%",
    trend: "up" as const,
    icon: Target,
    color: "var(--info)",
  },
]

// Ops cost as % of revenue — projected (without AI) vs reality (with AI)
// Apr 2026 actual: ₹18L cost on ₹85L revenue = 21.2% with AI
// Without AI projection assumes manual ops scales linearly with revenue
const opsCostTrend = [
  { month: "Nov",  withoutAI: 28.0, withAI: 27.4 },
  { month: "Dec",  withoutAI: 28.5, withAI: 26.8 },
  { month: "Jan",  withoutAI: 29.2, withAI: 25.5 },
  { month: "Feb",  withoutAI: 29.8, withAI: 24.2 },
  { month: "Mar",  withoutAI: 30.5, withAI: 22.6 },
  { month: "Apr",  withoutAI: 31.2, withAI: 21.2 },
]

// Ops cost per client + revenue (for efficiency metric)
// efficiency = ops cost / client revenue (lower is better)
const clientCost = [
  { name: "Infosys BPM",  cost: 350000, revenue: 1850000, timesheets: 124 },
  { name: "Hexaware",     cost: 290000, revenue: 1420000, timesheets: 87  },
  { name: "L&T Infotech", cost: 265000, revenue: 1280000, timesheets: 78  },
  { name: "Mindtree",     cost: 230000, revenue: 1050000, timesheets: 71  },
  { name: "Capgemini",    cost: 205000, revenue: 980000,  timesheets: 52  },
  { name: "FinanceHub",   cost: 165000, revenue: 620000,  timesheets: 29  },
  { name: "MedSure",      cost: 95000,  revenue: 390000,  timesheets: 20  },
  { name: "GlobalStaff",  cost: 60000,  revenue: 220000,  timesheets: 16  },
].map(c => ({ ...c, efficiency: Math.round((c.cost / c.revenue) * 100 * 10) / 10 }))

// Agent performance trend
const agentPerformance = [
  { month: "Nov",  autoRate: 57,  manualRate: 43,  errorRate: 5.2 },
  { month: "Dec",  autoRate: 58,  manualRate: 42,  errorRate: 4.8 },
  { month: "Jan",  autoRate: 59,  manualRate: 41,  errorRate: 4.5 },
  { month: "Feb",  autoRate: 60,  manualRate: 40,  errorRate: 4.1 },
  { month: "Mar",  autoRate: 62,  manualRate: 38,  errorRate: 3.6 },
  { month: "Apr",  autoRate: 62,  manualRate: 38,  errorRate: 3.1 },
]

// Resource utilization — timesheets per ops person
const resourceUtil = [
  { month: "Nov",  perPerson: 260,  headcount: 7 },
  { month: "Dec",  perPerson: 280,  headcount: 6 },
  { month: "Jan",  perPerson: 340,  headcount: 6 },
  { month: "Feb",  perPerson: 363,  headcount: 6 },
  { month: "Mar",  perPerson: 478,  headcount: 5 },
  { month: "Apr",  perPerson: 636,  headcount: 4 },
]

// Ops cost breakup — sub-functions typical for Indian managed HRMS ops
// service. Total monthly ops cost ₹18L distributed across functions.
const OPS_TOTAL = 1800000
const opsBreakdown = [
  { fn: "Onboarding (PAN, bank, PF, ESI)",  pct: 26, color: "#FFB4A2" },
  { fn: "Timesheet approval & validation",  pct: 18, color: "#FF3D7F" },
  { fn: "Payroll processing & reconciliation", pct: 15, color: "#A78BFA" },
  { fn: "Compliance & regulation checks",   pct: 10, color: "#2DD4BF" },
  { fn: "Employee queries & grievances",    pct:  8, color: "#FACC15" },
  { fn: "Leave & attendance reconciliation", pct:  7, color: "#F59E0B" },
  { fn: "Client reporting & AM coordination", pct: 6, color: "#3B82F6" },
  { fn: "HRMS portal sync & issue resolution", pct: 5, color: "#10B981" },
  { fn: "Offboarding & F&F settlement",     pct:  5, color: "#C88A5C" },
].map(x => ({ ...x, cost: Math.round(OPS_TOTAL * x.pct / 100) }))

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="flex h-screen overflow-hidden app-bg">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Body */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 pb-nav lg:pb-8">

          {/* Page title */}
          <div>
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-1)" }}>
              Good morning, Riya
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
              April 2026 · {clients.length} clients · 636 timesheets processed
            </p>
          </div>

          {/* ── 4 KPI cards ──────────────────────────────────────── */}
          {/* KPI row — StatCard pattern: primary-50 bg + primary-200 border + primary-600 value */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {kpis.map(k => (
              <div key={k.label} className="stat-card">
                <div className="flex items-center justify-between mb-3">
                  <k.icon size={18} strokeWidth={1.5} style={{ color: "var(--primary-600)" }} />
                  <div className="flex items-center gap-1 text-xs"
                    style={{ color: "var(--primary-700)" }}>
                    {k.trend === "up" ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  </div>
                </div>
                <div className="text-2xl font-semibold tracking-tight" style={{ color: "var(--primary-700)" }}>
                  {k.value}
                </div>
                <div className="text-[13px] mt-1" style={{ color: "var(--neutral-600)" }}>
                  {k.label}
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--neutral-500)" }}>
                  {k.delta}
                </div>
              </div>
            ))}
          </div>

          {/* ── Charts grid ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* 1. Ops Cost as % of Revenue — without AI vs with AI */}
            <div className="glass p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <div className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>
                    Ops Cost as % of Revenue
                  </div>
                  <div className="text-[13px] mt-0.5" style={{ color: "var(--text-3)" }}>
                    AI savings: 10pp lower than projected without AI
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs" style={{ color: "var(--text-3)" }}>Apr 2026</div>
                  <div className="text-[15px] font-semibold" style={{ color: "#059669" }}>
                    21.2%
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 mb-3 text-xs" style={{ color: "var(--text-3)" }}>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded" style={{ background: "var(--lavender)" }} /> Without AI (projected)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded" style={{ background: "var(--accent)" }} /> With AI (actual)
                </span>
              </div>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={opsCostTrend}>
                    <defs>
                      <linearGradient id="withoutAIGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="var(--lavender)" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="var(--lavender)" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="withAIGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--text-3)" }}
                      axisLine={false} tickLine={false} width={40}
                      tickFormatter={v => `${v}%`}
                      domain={[15, 35]}
                    />
                    <Tooltip
                      contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, color: "var(--text-1)" }}
                      formatter={(v: number) => `${v}%`}
                    />
                    <Area type="monotone" dataKey="withoutAI" stroke="var(--lavender)" strokeWidth={1.5} strokeDasharray="4 4" fill="url(#withoutAIGrad)" name="Without AI (projected)" />
                    <Area type="monotone" dataKey="withAI"    stroke="var(--accent)"   strokeWidth={2.5} fill="url(#withAIGrad)"   name="With AI (actual)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Ops Cost Breakup (moved up from bottom, half-width) */}
            <div className="glass p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <div className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>
                    Ops cost breakup
                  </div>
                  <div className="text-[13px] mt-0.5" style={{ color: "var(--text-3)" }}>
                    {fmtINR(OPS_TOTAL)}/mo across sub-functions
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div style={{ width: 160, height: 160, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={opsBreakdown}
                        dataKey="pct"
                        nameKey="fn"
                        cx="50%" cy="50%"
                        innerRadius={48}
                        outerRadius={78}
                        paddingAngle={2}
                        strokeWidth={0}
                      >
                        {opsBreakdown.map((s, i) => <Cell key={i} fill={s.color} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--surface)", border: "1px solid var(--border)",
                          borderRadius: 8, fontSize: 11, color: "var(--text-1)",
                        }}
                        formatter={(v: number, _n, payload) => {
                          const p = payload as unknown as { payload: { cost: number } }
                          return [`${v}% · ${fmtINR(p.payload.cost)}`, "Share"]
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 min-w-0 space-y-1.5 max-h-[200px] overflow-y-auto">
                  {opsBreakdown.map(s => (
                    <div key={s.fn} className="flex items-center gap-2 text-[12px]">
                      <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: s.color }} />
                      <span className="flex-1 truncate" style={{ color: "var(--text-1)" }}>{s.fn}</span>
                      <span className="tabular-nums font-semibold w-9 text-right" style={{ color: "var(--text-1)" }}>
                        {s.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Ops Cost by Client — custom list with cost bar + efficiency % */}
            <div className="glass p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <div className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>Ops Cost by Client</div>
                  <div className="text-[13px] mt-0.5" style={{ color: "var(--text-3)" }}>
                    Cost · efficiency (cost ÷ client revenue) — April 2026
                  </div>
                </div>
              </div>

              {(() => {
                const maxCost = Math.max(...clientCost.map(c => c.cost))
                return (
                  <div className="space-y-2.5">
                    {clientCost.map(c => {
                      const effColor = c.efficiency < 22 ? "#059669"
                                    : c.efficiency < 28 ? "var(--warn)"
                                    : "var(--danger)"
                      return (
                        <div key={c.name} className="flex items-center gap-3 text-[12px]">
                          <span className="w-[110px] truncate flex-shrink-0" style={{ color: "var(--text-1)" }}>
                            {c.name}
                          </span>
                          <div className="flex-1 h-5 rounded-md relative overflow-hidden" style={{ background: "var(--surface-2)" }}>
                            <div className="h-full rounded-md" style={{ width: `${(c.cost / maxCost) * 100}%`, background: "var(--accent)", opacity: 0.85 }} />
                          </div>
                          <span className="w-14 text-right tabular-nums font-medium" style={{ color: "var(--text-1)" }}>
                            ₹{(c.cost/100000).toFixed(1)}L
                          </span>
                          <span className="w-12 text-right tabular-nums font-semibold" style={{ color: effColor }}>
                            {c.efficiency}%
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}

              <div className="flex items-center gap-4 mt-4 pt-3 text-[11px]" style={{ color: "var(--text-3)", borderTop: "1px solid var(--border)" }}>
                <span>Efficiency thresholds:</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: "#059669" }} />&lt;22% healthy</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--warn)" }} />22–28% watch</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--danger)" }} />&gt;28% risk</span>
              </div>
            </div>

            {/* 3. JARVIS Performance — inspector agent, on-theme colors */}
            <div className="glass p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--pink-100)" }}>
                    <span className="text-[13px] font-bold" style={{ color: "var(--pink-700)" }}>J</span>
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold flex items-center gap-1.5" style={{ color: "var(--text-1)" }}>
                      JARVIS
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{ background: "var(--pink-50)", color: "var(--pink-700)" }}>Inspector Agent</span>
                    </div>
                    <div className="text-[13px] mt-0.5" style={{ color: "var(--text-3)" }}>
                      Auto-approval rate — 6 month trend
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 mb-3 text-xs" style={{ color: "var(--text-3)" }}>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded" style={{ background: "var(--accent)" }} /> Auto-approved
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded" style={{ background: "var(--lavender)" }} /> Manual
                </span>
              </div>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agentPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--text-3)" }} axisLine={false} tickLine={false} width={30}
                      tickFormatter={v => `${v}%`} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, color: "var(--text-1)" }}
                      formatter={(v: number) => `${v}%`}
                    />
                    <Bar dataKey="autoRate"   stackId="a" fill="var(--accent)"   radius={[0,0,0,0]} barSize={24} name="Auto-approved" />
                    <Bar dataKey="manualRate" stackId="a" fill="var(--lavender)" radius={[4,4,0,0]} barSize={24} name="Manual" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 4. Resource Utilization — single metric, equal bar widths */}
            <div className="glass p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <div className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>Resource Utilization</div>
                  <div className="text-[13px] mt-0.5" style={{ color: "var(--text-3)" }}>
                    Timesheets per ops team member — headcount reducing as AI scales
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs" style={{ color: "var(--text-3)" }}>Apr headcount</div>
                  <div className="text-[15px] font-semibold" style={{ color: "var(--lavender)" }}>4 people</div>
                </div>
              </div>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={resourceUtil} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--text-3)" }} axisLine={false} tickLine={false} width={36} />
                    <Tooltip
                      contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, color: "var(--text-1)" }}
                      formatter={(v: number, name: string) => [v, name]}
                    />
                    <Bar dataKey="perPerson" fill="var(--accent)" radius={[4,4,0,0]} barSize={28} name="Timesheets / person" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-6 gap-1 mt-2 text-[10px] text-center" style={{ color: "var(--text-3)" }}>
                {resourceUtil.map(r => (
                  <div key={r.month}>
                    <div className="tabular-nums" style={{ color: "var(--lavender)" }}>{r.headcount} HC</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </main>
      </div>

      <BottomNav />
    </div>
  )
}
