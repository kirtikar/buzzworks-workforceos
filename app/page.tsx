"use client"

import Sidebar from "@/components/Sidebar"
import AIAgentOrb from "@/components/AIAgentOrb"
import { timesheets, clients, aiInsights, getEmployee, getClient, weeklyTrend, clientDistribution } from "@/lib/mock-data"
import {
  Bell,
  Search,
  Clock,
  AlertTriangle,
  Banknote,
  TrendingUp,
  TrendingDown,
  Mail,
  Globe,
  Edit3,
  ArrowRight,
  ChevronRight,
  Eye,
  Check,
  Flag,
  Zap,
  RefreshCw,
} from "lucide-react"
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import Link from "next/link"
import type { TimesheetStatus, TimesheetSource } from "@/lib/types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
}

function statusLabel(s: TimesheetStatus) {
  const map: Record<TimesheetStatus, string> = {
    pending: "Pending",
    reviewing: "Reviewing",
    flagged: "Flagged",
    approved: "Approved",
    processed: "Processed",
    rejected: "Rejected",
  }
  return map[s]
}

function sourceIcon(s: TimesheetSource) {
  if (s === "portal") return <Globe size={11} className="text-blue-400" />
  if (s === "email") return <Mail size={11} className="text-violet-400" />
  return <Edit3 size={11} className="text-slate-400" />
}

function sourceLabel(s: TimesheetSource) {
  if (s === "portal") return "Portal"
  if (s === "email") return "Email"
  return "Manual"
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 85 ? "#10B981" : score >= 60 ? "#F59E0B" : "#FF6B6B"
  const r = 14
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div className="relative w-9 h-9 flex-shrink-0">
      <svg width="36" height="36" viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
        <circle
          cx="18" cy="18" r={r} fill="none"
          stroke={color} strokeWidth="2.5"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color }}>
        {score}
      </span>
    </div>
  )
}

// ─── Stats cards data ─────────────────────────────────────────────────────────
const stats = [
  {
    label: "Pending Review",
    value: 23,
    sub: "+3 since yesterday",
    trend: "up" as const,
    icon: Clock,
    valueColor: "#efefef",
    iconColor: "rgba(255,255,255,0.25)",
  },
  {
    label: "Under Review",
    value: 8,
    sub: "−2 since yesterday",
    trend: "down" as const,
    icon: Eye,
    valueColor: "#efefef",
    iconColor: "rgba(255,255,255,0.25)",
  },
  {
    label: "Flagged",
    value: 5,
    sub: "+1 flagged by AI",
    trend: "up" as const,
    icon: AlertTriangle,
    valueColor: "#c89060",
    iconColor: "rgba(200,144,96,0.4)",
  },
  {
    label: "Payroll Ready",
    value: 12,
    sub: "₹2.4L total",
    trend: "up" as const,
    icon: Banknote,
    valueColor: "#00c896",
    iconColor: "rgba(0,200,150,0.4)",
  },
]

// ─── Pipeline stages — single accent, opacity fades toward end ────────────────
const pipeline = [
  { label: "Email\nReceived", count: 18, pct: 40, done: true },
  { label: "Portal\nDownloads", count: 27, pct: 60, done: true },
  { label: "Parsed &\nQueued", count: 40, pct: 89, done: true },
  { label: "Under\nReview", count: 23, pct: 51, done: false, active: true },
  { label: "Approved", count: 12, pct: 27, done: false },
  { label: "Payroll\nDone", count: 8, pct: 18, done: false },
]

// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const recentTs = timesheets.slice(0, 7)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header
          className="flex items-center gap-4 px-6 py-3.5 border-b border-white/[0.07] flex-shrink-0"
          style={{ background: "rgba(9,7,20,0.6)", backdropFilter: "blur(20px)" }}
        >
          {/* Search */}
          <div className="flex-1 max-w-xs relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              className="glass-input w-full pl-8 text-sm"
              placeholder="Search employees, clients, timesheet IDs…"
            />
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {/* Monitored email badge */}
            <div
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium"
              style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "#A78BFA" }}
            >
              <Mail size={11} />
              candidatemanager@buzzworks.com
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-dot-blink" />
            </div>

            {/* Refresh */}
            <button className="btn-ghost flex items-center gap-1.5 py-1.5 px-3 text-xs">
              <RefreshCw size={12} />
              <span className="hidden md:inline">Sync portals</span>
            </button>

            {/* Notifications */}
            <button className="relative w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/[0.06] transition-colors">
              <Bell size={16} className="text-white/50" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-coral-500" />
            </button>

            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #00D4A5)" }}
            >
              RS
            </div>
          </div>
        </header>

        {/* Scrollable body */}
        <main className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Welcome */}
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">
                Good morning, Riya —{" "}
                <span className="text-white/40 font-normal text-base">Apr 9, 2026</span>
              </h1>
              <p className="text-[13px] text-white/40 mt-0.5">
                5 flagged timesheets need your attention · Payroll cycle closes Friday
              </p>
            </div>
            <Link href="/timesheets" className="btn-teal flex items-center gap-1.5 text-[13px]">
              Open Inbox <ArrowRight size={13} />
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="glass p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[11px] font-medium" style={{ color: "var(--text-3)" }}>{s.label}</div>
                    <div className="text-[28px] font-black mt-1 tracking-tight" style={{ color: s.valueColor }}>
                      {s.value}
                    </div>
                  </div>
                  <s.icon size={16} className="mt-1" style={{ color: s.iconColor }} />
                </div>
                <div className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-3)" }}>
                  {s.trend === "up" ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {s.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Pipeline */}
          <div className="glass p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[13px] font-semibold text-white">Timesheet Pipeline</div>
                <div className="text-[11px] text-white/35">Apr Week 1 · 45 timesheets ingested</div>
              </div>
              <div
                className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg font-medium"
                style={{ background: "rgba(0,212,165,0.1)", color: "#00D4A5" }}
              >
                <Zap size={11} />
                Live
              </div>
            </div>
            <div className="flex items-end gap-2">
              {pipeline.map((stage, i) => {
                const barColor = stage.done ? "#00c896" : stage.active ? "#00c896" : "rgba(255,255,255,0.12)"
                const textColor = stage.done ? "#00c896" : stage.active ? "#efefef" : "rgba(255,255,255,0.25)"
                const labelColor = stage.done || stage.active ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.2)"
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col items-center gap-1">
                      <span className="text-[13px] font-bold" style={{ color: textColor }}>
                        {stage.count}
                      </span>
                      <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: "rgba(255,255,255,0.05)" }}>
                        <div className="h-full rounded-full" style={{ width: `${stage.pct}%`, background: barColor }} />
                      </div>
                    </div>
                    {i < pipeline.length - 1 && (
                      <ChevronRight size={11} style={{ color: "rgba(255,255,255,0.12)", position: "relative" }} />
                    )}
                    <div className="text-[10px] text-center leading-tight whitespace-pre-line" style={{ color: labelColor }}>
                      {stage.label}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Main 3-col grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Recent timesheets – 3 cols */}
            <div className="lg:col-span-3 glass overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
                <div className="text-[13px] font-semibold text-white">Recent Timesheets</div>
                <Link href="/timesheets" className="text-[12px] text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors">
                  View all <ChevronRight size={12} />
                </Link>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-white/[0.05]">
                      {["Employee · Client", "Period", "Hours", "Source", "Score", "Status", ""].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-2.5 text-[11px] text-white/30 font-semibold uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentTs.map((ts) => {
                      const emp = getEmployee(ts.employeeId)!
                      const client = getClient(ts.clientId)!
                      return (
                        <tr key={ts.id} className="ts-row">
                          {/* Employee + Client */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                                style={{ background: `${client.color}22`, color: client.color }}
                              >
                                {getInitials(emp.name)}
                              </div>
                              <div>
                                <div className="font-semibold text-white/90 text-[12px]">{emp.name}</div>
                                <div className="text-white/40 text-[11px]">{client.code}</div>
                              </div>
                            </div>
                          </td>
                          {/* Period */}
                          <td className="px-4 py-3 text-white/55 text-[11px] whitespace-nowrap">{ts.period}</td>
                          {/* Hours */}
                          <td className="px-4 py-3">
                            <div className="font-semibold text-white/90">{ts.totalHours}h</div>
                            {ts.overtimeHours > 0 && (
                              <div className="text-[10px] text-amber-400">+{ts.overtimeHours}h OT</div>
                            )}
                            {ts.leaveHours > 0 && (
                              <div className="text-[10px] text-violet-400">{ts.leaveHours}h leave</div>
                            )}
                          </td>
                          {/* Source */}
                          <td className="px-4 py-3">
                            <span className={`badge badge-${ts.source} flex items-center gap-1`}>
                              {sourceIcon(ts.source)}
                              {sourceLabel(ts.source)}
                            </span>
                          </td>
                          {/* Score */}
                          <td className="px-4 py-3">
                            <ScoreRing score={ts.validationScore} />
                          </td>
                          {/* Status */}
                          <td className="px-4 py-3">
                            <span className={`badge badge-${ts.status}`}>{statusLabel(ts.status)}</span>
                          </td>
                          {/* Actions */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {ts.status === "pending" && (
                                <button
                                  className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors hover:bg-mint-500/20"
                                  title="Quick approve"
                                >
                                  <Check size={12} className="text-mint-400" />
                                </button>
                              )}
                              {(ts.status === "pending" || ts.status === "reviewing") && (
                                <button
                                  className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors hover:bg-coral-500/20"
                                  title="Flag for review"
                                >
                                  <Flag size={12} className="text-coral-500" />
                                </button>
                              )}
                              <Link href={`/timesheets`}>
                                <button
                                  className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                                  title="View details"
                                >
                                  <Eye size={12} className="text-white/50" />
                                </button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right column – 2 cols */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {/* AI insights summary */}
              <div className="glass p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #8B5CF6, #00D4A5)" }}
                  >
                    <Zap size={12} className="text-white" />
                  </div>
                  <div className="text-[13px] font-semibold text-white">AI Insights</div>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-auto"
                    style={{ background: "rgba(255,107,107,0.15)", color: "#FF6B6B" }}
                  >
                    3 urgent
                  </span>
                </div>

                <div className="space-y-2">
                  {aiInsights.slice(0, 3).map((insight) => {
                    const c = insight.priority === "high" ? "var(--danger)" : insight.priority === "medium" ? "var(--warn)" : "var(--accent)"
                    return (
                      <div
                        key={insight.id}
                        className="p-2.5 rounded-xl text-[11px]"
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid var(--border)",
                          borderLeft: `2px solid ${c}`,
                        }}
                      >
                        <div className="font-semibold text-white/85 leading-tight">{insight.title}</div>
                        <div className="text-white/45 mt-0.5 leading-snug line-clamp-2">
                          {insight.description}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div
                  className="mt-3 text-center text-[11px] text-white/30 py-2 rounded-lg"
                  style={{ background: "rgba(139,92,246,0.06)", border: "1px dashed rgba(139,92,246,0.2)" }}
                >
                  <Zap size={11} className="inline mr-1 text-violet-400" />
                  <span className="text-violet-400">AI auto-approve</span> arriving in v2
                </div>
              </div>

              {/* Client distribution */}
              <div className="glass p-4 flex-1">
                <div className="text-[13px] font-semibold text-white mb-1">Client Distribution</div>
                <div className="text-[11px] text-white/35 mb-3">Apr Week 1 · 8 timesheets</div>

                <div className="flex items-center gap-4">
                  <div style={{ width: 80, height: 80 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={clientDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={24}
                          outerRadius={36}
                          paddingAngle={2}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {clientDistribution.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex-1 space-y-1.5">
                    {clientDistribution.map((item) => {
                      const c = clients.find((cl) => cl.code === item.name)!
                      return (
                        <div key={item.name} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                          <span className="text-[11px] text-white/60 flex-1">{c?.name}</span>
                          <span className="text-[11px] font-semibold text-white/80">{item.value}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Weekly trend chart */}
              <div className="glass p-4">
                <div className="text-[13px] font-semibold text-white mb-0.5">Weekly Volume</div>
                <div className="text-[11px] text-white/35 mb-3">Received vs Processed</div>
                <div style={{ height: 70 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyTrend} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00c896" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#00c896" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="violetGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00c896" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#00c896" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Tooltip
                        contentStyle={{
                          background: "rgba(12,9,24,0.95)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 8,
                          fontSize: 11,
                          color: "#f8fafc",
                        }}
                      />
                      <Area type="monotone" dataKey="received" stroke="rgba(0,200,150,0.35)" strokeWidth={1.5} fill="url(#violetGrad)" dot={false} />
                      <Area type="monotone" dataKey="processed" stroke="#00c896" strokeWidth={1.5} fill="url(#tealGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-3 mt-1.5">
                  <div className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-3)" }}>
                    <span className="w-2 h-0.5 rounded-full inline-block" style={{ background: "rgba(0,200,150,0.35)" }} />
                    Received
                  </div>
                  <div className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-3)" }}>
                    <span className="w-2 h-0.5 rounded-full inline-block" style={{ background: "#00c896" }} />
                    Processed
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <AIAgentOrb />
    </div>
  )
}
