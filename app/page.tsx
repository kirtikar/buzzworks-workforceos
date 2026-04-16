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
    value: "₹4.2L",
    delta: "-12% vs last month",
    trend: "down" as const,
    icon: IndianRupee,
    color: "var(--accent)",
  },
  {
    label: "Timesheets Processed",
    value: "636",
    delta: "+8% vs last month",
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

// Ops cost trend (6 months) — shows cost declining as automation increases
const opsCostTrend = [
  { month: "Nov",  cost: 680000,  manual: 520000,  automated: 160000 },
  { month: "Dec",  cost: 640000,  manual: 470000,  automated: 170000 },
  { month: "Jan",  cost: 580000,  manual: 400000,  automated: 180000 },
  { month: "Feb",  cost: 530000,  manual: 340000,  automated: 190000 },
  { month: "Mar",  cost: 480000,  manual: 280000,  automated: 200000 },
  { month: "Apr",  cost: 420000,  manual: 220000,  automated: 200000 },
]

// Ops cost per client (horizontal bar)
const clientCost = [
  { name: "Infosys BPM",  cost: 82000,  timesheets: 124 },
  { name: "Hexaware",     cost: 68000,  timesheets: 87  },
  { name: "L&T Infotech", cost: 62000,  timesheets: 78  },
  { name: "Mindtree",     cost: 54000,  timesheets: 71  },
  { name: "Capgemini",    cost: 48000,  timesheets: 52  },
  { name: "FinanceHub",   cost: 38000,  timesheets: 29  },
  { name: "MedSure",      cost: 22000,  timesheets: 20  },
  { name: "GlobalStaff",  cost: 14000,  timesheets: 16  },
]

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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {kpis.map(k => (
              <div key={k.label} className="glass p-6">
                <div className="flex items-center justify-between mb-4">
                  <k.icon size={18} strokeWidth={1.5} style={{ color: "var(--text-3)" }} />
                  <div className="flex items-center gap-1 text-xs"
                    style={{ color: "var(--accent)" }}>
                    {k.trend === "up" ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  </div>
                </div>
                <div className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text-1)" }}>
                  {k.value}
                </div>
                <div className="text-[13px] mt-1" style={{ color: "var(--text-2)" }}>
                  {k.label}
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
                  {k.delta}
                </div>
              </div>
            ))}
          </div>

          {/* ── Charts grid ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* 1. Ops Cost Trend */}
            <div className="glass p-6">
              <div className="mb-5">
                <div className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>Ops Cost Trend</div>
                <div className="text-[13px] mt-0.5" style={{ color: "var(--text-3)" }}>
                  Declining as AI automation increases
                </div>
              </div>
              <div className="flex items-center gap-4 mb-3 text-xs" style={{ color: "var(--text-3)" }}>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded" style={{ background: "var(--accent)", opacity: 0.3 }} /> Manual
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded" style={{ background: "var(--accent)" }} /> Automated
                </span>
              </div>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={opsCostTrend}>
                    <defs>
                      <linearGradient id="manualGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="autoGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--text-3)" }} axisLine={false} tickLine={false} width={45}
                      tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, color: "var(--text-1)" }}
                      formatter={(v: number) => fmtINR(v)}
                    />
                    <Area type="monotone" dataKey="manual"    stackId="1" stroke="none" fill="url(#manualGrad)" name="Manual ops cost" />
                    <Area type="monotone" dataKey="automated" stackId="1" stroke="var(--accent)" strokeWidth={2} fill="url(#autoGrad)" name="AI processing cost" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Cost per Client */}
            <div className="glass p-6">
              <div className="mb-5">
                <div className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>Ops Cost by Client</div>
                <div className="text-[13px] mt-0.5" style={{ color: "var(--text-3)" }}>
                  Processing cost — April 2026
                </div>
              </div>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clientCost} layout="vertical" margin={{ left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "var(--text-3)" }} axisLine={false} tickLine={false}
                      tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--text-2)" }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip
                      contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, color: "var(--text-1)" }}
                      formatter={(v: number) => fmtINR(v)}
                    />
                    <Bar dataKey="cost" fill="var(--accent)" radius={[0, 4, 4, 0]} barSize={14} name="Ops cost" opacity={0.7} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. Agent Performance */}
            <div className="glass p-6">
              <div className="mb-5">
                <div className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>JARVIS Performance</div>
                <div className="text-[13px] mt-0.5" style={{ color: "var(--text-3)" }}>
                  Auto vs manual — 6 month trend
                </div>
              </div>
              <div className="flex items-center gap-4 mb-3 text-xs" style={{ color: "var(--text-3)" }}>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded" style={{ background: "var(--accent)" }} /> Auto-approved
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded" style={{ background: "var(--border-strong)" }} /> Manual
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
                    <Bar dataKey="autoRate"   stackId="a" fill="var(--accent)"       radius={[0,0,0,0]} barSize={20} name="Auto-approved" />
                    <Bar dataKey="manualRate" stackId="a" fill="var(--border-strong)" radius={[4,4,0,0]} barSize={20} name="Manual" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 4. Resource Utilization */}
            <div className="glass p-6">
              <div className="mb-5">
                <div className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>Resource Utilization</div>
                <div className="text-[13px] mt-0.5" style={{ color: "var(--text-3)" }}>
                  Timesheets per ops person — efficiency trend
                </div>
              </div>
              <div className="flex items-center gap-4 mb-3 text-xs" style={{ color: "var(--text-3)" }}>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded" style={{ background: "var(--accent)" }} /> Per person
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded" style={{ background: "var(--info)", opacity: 0.4 }} /> Headcount
                </span>
              </div>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={resourceUtil}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left"  tick={{ fontSize: 10, fill: "var(--text-3)" }} axisLine={false} tickLine={false} width={30} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "var(--text-3)" }} axisLine={false} tickLine={false} width={20} domain={[0, 10]} />
                    <Tooltip
                      contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, color: "var(--text-1)" }}
                    />
                    <Bar yAxisId="left" dataKey="perPerson" fill="var(--accent)" radius={[4,4,0,0]} barSize={20} name="Timesheets / person" opacity={0.7} />
                    <Bar yAxisId="right" dataKey="headcount" fill="var(--info)" radius={[4,4,0,0]} barSize={8} name="Ops headcount" opacity={0.35} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </main>
      </div>

      <BottomNav />
    </div>
  )
}
