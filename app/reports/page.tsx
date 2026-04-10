"use client"

import { useState } from "react"
import Sidebar from "@/components/Sidebar"
import AIAgentOrb from "@/components/AIAgentOrb"
import { clients, weeklyTrend } from "@/lib/mock-data"
import {
  BarChart3, Download, Calendar, TrendingUp, CheckCircle2,
  AlertTriangle, Clock, Zap, Shield, Users, ArrowUp, ArrowDown,
} from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis,
  ResponsiveContainer, Tooltip, PieChart, Pie, RadarChart,
  PolarGrid, PolarAngleAxis, Radar, Legend,
} from "recharts"
import clsx from "clsx"

// ─── Mock report data ─────────────────────────────────────────────────────────

const statusDistribution = [
  { name: "Auto-Approved", value: 412, color: "#00c896", pct: 51 },
  { name: "Ops Approved",  value: 188, color: "#8B5CF6", pct: 23 },
  { name: "Flagged",       value: 98,  color: "#c89060", pct: 12 },
  { name: "Rejected",      value: 64,  color: "#c07070", pct: 8  },
  { name: "Pending",       value: 47,  color: "rgba(255,255,255,0.2)", pct: 6 },
]

const violationTypes = [
  { name: "OT without approval",       count: 38, color: "#c89060" },
  { name: "Under-hours",               count: 27, color: "#3B82F6" },
  { name: "Sandwich leave",            count: 22, color: "#8B5CF6" },
  { name: "Holiday work",              count: 14, color: "#F59E0B" },
  { name: "No attachment",             count: 12, color: "#c07070" },
  { name: "Forwarded email",           count: 9,  color: "#6366F1" },
  { name: "Inactive employee",         count: 5,  color: "rgba(255,255,255,0.3)" },
]

const sourceBreakdown = [
  { name: "Portal",  value: 68, color: "#3B82F6" },
  { name: "Email",   value: 24, color: "#8B5CF6" },
  { name: "Manual",  value: 8,  color: "rgba(255,255,255,0.2)" },
]

const topClients = clients.slice(0, 8).map(c => ({
  code:        c.code,
  name:        c.name,
  color:       c.color,
  compliance:  c.complianceScore,
  timesheets:  c.pendingTimesheets + Math.floor(Math.random() * 80 + 30),
  autoApprove: Math.floor(c.complianceScore * 0.7 + Math.random() * 15),
})).sort((a, b) => b.compliance - a.compliance)

const radarData = [
  { metric: "Compliance",   value: 91 },
  { metric: "Turnaround",   value: 87 },
  { metric: "Auto-Approve", value: 74 },
  { metric: "SLA",          value: 95 },
  { metric: "Accuracy",     value: 89 },
  { metric: "Coverage",     value: 82 },
]

const turnaroundTrend = [
  { week: "Mar W1", hours: 38, sla: 48 },
  { week: "Mar W2", hours: 42, sla: 48 },
  { week: "Mar W3", hours: 31, sla: 48 },
  { week: "Mar W4", hours: 29, sla: 48 },
  { week: "Apr W1", hours: 24, sla: 48 },
]

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, change, color, icon: Icon }: {
  label: string; value: string; sub?: string; change?: number; color: string; icon: React.ElementType
}) {
  return (
    <div className="glass p-4">
      <div className="flex items-start justify-between mb-2">
        <Icon size={16} style={{ color }} className="mt-0.5" />
        {change !== undefined && (
          <span className={clsx("flex items-center gap-0.5 text-[10px] font-bold", change >= 0 ? "text-teal-400" : "text-rose-400")}>
            {change >= 0 ? <ArrowUp size={9} /> : <ArrowDown size={9} />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <div className="text-[11px] text-white/35 mb-0.5">{label}</div>
      <div className="text-[24px] font-black" style={{ color }}>{value}</div>
      {sub && <div className="text-[10px] text-white/25 mt-0.5">{sub}</div>}
    </div>
  )
}

// ─── Period selector ──────────────────────────────────────────────────────────

const PERIODS = ["This Week", "This Month", "Last Quarter", "Last 6 Months", "This Year"] as const
type Period = typeof PERIODS[number]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>("This Month")

  const totalProcessed = 809
  const autoApproveRate = 51
  const avgTurnaround = 31
  const slaCompliance = 94

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-4 px-6 py-3.5 border-b border-white/[0.07] flex-shrink-0" style={{ background: "rgba(9,7,20,0.6)", backdropFilter: "blur(20px)" }}>
          <BarChart3 size={18} className="text-teal-400 flex-shrink-0" />
          <div className="flex-1">
            <h1 className="text-base font-bold text-white">Reports & Analytics</h1>
            <p className="text-[11px] text-white/35">Operational intelligence across all clients</p>
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={clsx("px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap", period === p ? "bg-teal-400/15 text-teal-400" : "text-white/35 hover:text-white/60")}
              >
                {p}
              </button>
            ))}
          </div>

          <button className="btn-ghost flex items-center gap-1.5 text-[12px] py-2 px-3">
            <Download size={12} /> Export
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard label="Timesheets Processed" value={totalProcessed.toLocaleString()} sub={period}       color="#00c896"        icon={CheckCircle2} change={+8}  />
            <KpiCard label="Auto-Approve Rate"    value={`${autoApproveRate}%`}           sub="of total"     color="#8B5CF6"        icon={Zap}          change={+5}  />
            <KpiCard label="Avg Turnaround"       value={`${avgTurnaround}h`}             sub="SLA: 48h"     color="#00c896"        icon={Clock}        change={-12} />
            <KpiCard label="SLA Compliance"       value={`${slaCompliance}%`}             sub="On-time"      color={slaCompliance >= 90 ? "#00c896" : "#c89060"} icon={Shield} change={+2} />
            <KpiCard label="Violations Caught"    value="127"                             sub="By AI + Ops"  color="#c89060"        icon={AlertTriangle} change={-3} />
            <KpiCard label="Active Clients"       value="25"                              sub="All reporting" color="var(--text-1)" icon={Users}         />
          </div>

          {/* Full-width volume chart */}
          <div className="glass p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[13px] font-semibold text-white">Weekly Timesheet Volume</div>
                <div className="text-[11px] text-white/35">Received · Processed · Auto-Approved</div>
              </div>
              <div className="flex items-center gap-4 text-[10px]">
                {[
                  { color: "rgba(0,200,150,0.35)", label: "Received" },
                  { color: "#00c896",               label: "Processed" },
                  { color: "#8B5CF6",               label: "Auto-Approved" },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5 text-white/40">
                    <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: l.color }} />
                    {l.label}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyTrend}>
                  <defs>
                    <linearGradient id="recvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00c896" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#00c896" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="procGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00c896" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#00c896" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="autoGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "rgba(12,9,24,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11, color: "#f8fafc" }} />
                  <Area type="monotone" dataKey="received"    stroke="rgba(0,200,150,0.35)" strokeWidth={1.5} fill="url(#recvGrad)" dot={false} name="Received" />
                  <Area type="monotone" dataKey="processed"   stroke="#00c896"              strokeWidth={1.5} fill="url(#procGrad)" dot={false} name="Processed" />
                  <Area type="monotone" dataKey="autoApproved"stroke="#8B5CF6"              strokeWidth={1.5} fill="url(#autoGrad)" dot={false} name="Auto-Approved" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3-col middle row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status donut */}
            <div className="glass p-4">
              <div className="text-[13px] font-semibold text-white mb-3">Status Distribution</div>
              <div className="flex items-center gap-3">
                <div style={{ width: 100, height: 100, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={26} outerRadius={44} paddingAngle={2} dataKey="value" strokeWidth={0}>
                        {statusDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 flex-1">
                  {statusDistribution.map(s => (
                    <div key={s.name} className="flex items-center gap-2 text-[11px]">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                      <span className="flex-1 text-white/55">{s.name}</span>
                      <span className="font-bold text-white/75">{s.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Source breakdown */}
            <div className="glass p-4">
              <div className="text-[13px] font-semibold text-white mb-3">Submission Sources</div>
              <div className="space-y-3 mt-2">
                {sourceBreakdown.map(s => (
                  <div key={s.name}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-white/55">{s.name}</span>
                      <span className="font-bold" style={{ color: s.color }}>{s.value}%</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full" style={{ width: `${s.value}%`, background: s.color }} />
                    </div>
                  </div>
                ))}
                <div className="text-[11px] text-white/25 pt-1">
                  Portal automation handling 68% of volume — target 80% by Q3.
                </div>
              </div>
            </div>

            {/* Ops health radar */}
            <div className="glass p-4">
              <div className="text-[13px] font-semibold text-white mb-2">Ops Health Score</div>
              <div style={{ height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.07)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} />
                    <Radar dataKey="value" stroke="#00c896" strokeWidth={1.5} fill="#00c896" fillOpacity={0.12} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 2-col bottom row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Violation types */}
            <div className="glass p-4">
              <div className="text-[13px] font-semibold text-white mb-1">Top Violation Types</div>
              <div className="text-[11px] text-white/35 mb-4">{period} · {violationTypes.reduce((s, v) => s + v.count, 0)} total violations caught</div>
              <div className="space-y-2.5">
                {violationTypes.map(v => {
                  const max = violationTypes[0].count
                  return (
                    <div key={v.name}>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-white/60">{v.name}</span>
                        <span className="font-bold" style={{ color: v.color }}>{v.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <div className="h-full rounded-full" style={{ width: `${(v.count / max) * 100}%`, background: v.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Client compliance leaderboard */}
            <div className="glass p-4">
              <div className="text-[13px] font-semibold text-white mb-1">Client Compliance Leaderboard</div>
              <div className="text-[11px] text-white/35 mb-3">Sorted by compliance score</div>
              <div className="space-y-2">
                {topClients.map((c, i) => (
                  <div key={c.code} className="flex items-center gap-3">
                    <span className="text-[11px] font-bold w-4 text-white/25">{i + 1}</span>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                    <span className="text-[12px] text-white/70 flex-1 truncate">{c.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full" style={{ width: `${c.compliance}%`, background: c.compliance >= 90 ? "#00c896" : c.compliance >= 75 ? "#c89060" : "#c07070" }} />
                      </div>
                      <span className="text-[11px] font-bold w-8 text-right" style={{ color: c.compliance >= 90 ? "#00c896" : "#c89060" }}>{c.compliance}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Turnaround trend */}
          <div className="glass p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[13px] font-semibold text-white">Avg Turnaround Time</div>
                <div className="text-[11px] text-white/35">Hours from submission to decision · SLA: 48h</div>
              </div>
              <div
                className="text-[11px] px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5"
                style={{ background: "rgba(0,200,150,0.1)", color: "#00c896" }}
              >
                <TrendingUp size={11} /> Improving
              </div>
            </div>
            <div style={{ height: 100 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={turnaroundTrend} barSize={20}>
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: number) => `${v}h`}
                    contentStyle={{ background: "rgba(12,9,24,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11, color: "#f8fafc" }}
                  />
                  <Bar dataKey="hours" name="Avg hours" radius={[4, 4, 0, 0]}>
                    {turnaroundTrend.map((entry, i) => (
                      <Cell key={i} fill={entry.hours <= 36 ? "#00c896" : entry.hours <= 48 ? "#c89060" : "#c07070"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </main>
      </div>
      <AIAgentOrb />
    </div>
  )
}
