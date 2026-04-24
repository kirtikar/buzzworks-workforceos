"use client"

import { useState, useMemo } from "react"
import Sidebar from "@/components/Sidebar"
import AIAgentOrb from "@/components/AIAgentOrb"
import { payrollBatches, clients, getClient } from "@/lib/mock-data"
import type { PayrollBatch, PayrollStatus } from "@/lib/types"
import {
  CreditCard, CheckCircle2, Clock, AlertTriangle, Download,
  ChevronRight, ArrowUpRight, Filter, TrendingUp, TrendingDown,
  DollarSign, Users, FileCheck, Loader2, Check, X,
} from "lucide-react"
import { AreaChart, Area, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, Cell } from "recharts"
import clsx from "clsx"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtINR(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)}L`
  return `₹${n.toLocaleString()}`
}
function fmtNum(n: number) { return n.toLocaleString("en-IN") }

const STATUS_CFG: Record<PayrollStatus, { label: string; color: string; bg: string; border: string }> = {
  draft:            { label: "Draft",            color: "var(--text-2)",   bg: "var(--surface-2)", border: "var(--border)" },
  pending_approval: { label: "Needs Approval",   color: "#c89060",          bg: "rgba(200,144,96,0.08)", border: "rgba(200,144,96,0.18)" },
  approved:         { label: "Approved",         color: "#2563EB",          bg: "rgba(37,99,235,0.1)",  border: "rgba(37,99,235,0.2)" },
  processed:        { label: "Processed",        color: "var(--accent)",          bg: "rgba(75,143,255,0.08)",  border: "rgba(75,143,255,0.18)" },
  on_hold:          { label: "On Hold",          color: "#c07070",          bg: "rgba(192,112,112,0.08)",border: "rgba(192,112,112,0.18)" },
}

// Mock payroll trend data (12 months)
const payrollTrend = [
  { month:"May",   total:186000000 },
  { month:"Jun",   total:198000000 },
  { month:"Jul",   total:204000000 },
  { month:"Aug",   total:197000000 },
  { month:"Sep",   total:212000000 },
  { month:"Oct",   total:225000000 },
  { month:"Nov",   total:231000000 },
  { month:"Dec",   total:244000000 },
  { month:"Jan",   total:252000000 },
  { month:"Feb",   total:248000000 },
  { month:"Mar",   total:261000000 },
  { month:"Apr",   total:91000000,  current: true },
]

const clientPayrollData = clients.slice(0, 8).map(c => ({
  name: c.code,
  amount: c.monthlyPayroll / 1000000,
  color: c.color,
})).sort((a, b) => b.amount - a.amount)

// ─── Batch Card ───────────────────────────────────────────────────────────────

function BatchCard({ batch, onApprove, onHold }: { batch: PayrollBatch; onApprove: (id: string) => void; onHold: (id: string) => void }) {
  const client    = getClient(batch.clientId)
  const cfg       = STATUS_CFG[batch.status]
  const coverage  = Math.round((batch.approvedTimesheets / batch.totalTimesheets) * 100)

  return (
    <div className="glass rounded-2xl p-4 hover:bg-white/[0.04] transition-all">
      <div className="flex items-start gap-3 mb-3">
        {/* Client logo */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-[12px] flex-shrink-0"
          style={{ background: client ? `${client.color}18` : "var(--surface-2)", color: client?.color ?? "var(--text-2)" }}
        >
          {client?.code.slice(0, 3) ?? "?"}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-[14px] text-white truncate">{client?.name ?? batch.clientId}</span>
            <span
              className="text-[11px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
              style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
            >
              {cfg.label}
            </span>
          </div>
          <div className="text-[11px] text-white/35">{batch.period}</div>
        </div>

        {batch.onHoldCount > 0 && (
          <div className="flex items-center gap-1 text-[11px]" style={{ color: "#c89060" }}>
            <AlertTriangle size={10} /> {batch.onHoldCount} hold
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        {[
          { label: "Timesheets", value: `${batch.approvedTimesheets}/${batch.totalTimesheets}`, color: coverage === 100 ? "var(--accent)" : "#c89060" },
          { label: "Hours",      value: fmtNum(batch.totalHours) + "h", color: "var(--text-1)" },
          { label: "Amount",     value: fmtINR(batch.totalAmount), color: "var(--accent)" },
        ].map(s => (
          <div key={s.label} className="rounded-lg py-2" style={{ background: "var(--surface-2)" }}>
            <div className="text-[14px] font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[11px] text-white/25 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Coverage bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-white/25">Timesheet coverage</span>
          <span style={{ color: coverage === 100 ? "var(--accent)" : "#c89060" }}>{coverage}%</span>
        </div>
        <div className="h-1 rounded-full" style={{ background: "var(--surface-2)" }}>
          <div className="h-full rounded-full" style={{ width: `${coverage}%`, background: coverage === 100 ? "var(--accent)" : "#c89060" }} />
        </div>
      </div>

      {/* OT breakdown */}
      {batch.overtimeHours > 0 && (
        <div className="flex items-center justify-between text-[11px] mb-3">
          <span className="text-white/30">Regular + OT</span>
          <span className="text-white/60">{fmtNum(batch.regularHours)}h + <span className="text-amber-400">{fmtNum(batch.overtimeHours)}h OT</span></span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-white/[0.05]">
        {batch.status === "pending_approval" && (
          <>
            <button onClick={() => onApprove(batch.id)} className="btn-teal flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[12px]">
              <Check size={12} /> Approve
            </button>
            <button onClick={() => onHold(batch.id)} className="btn-coral flex items-center gap-1.5 py-1.5 px-3 text-[12px]">
              <AlertTriangle size={11} /> Hold
            </button>
          </>
        )}
        {batch.status === "draft" && (
          <button className="btn-ghost flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[12px]">
            Review & Submit
          </button>
        )}
        {batch.status === "approved" && (
          <button className="btn-teal flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[12px]">
            <Download size={12} /> Send to Finance
          </button>
        )}
        {batch.status === "processed" && (
          <button className="btn-ghost flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[12px]">
            <Download size={12} /> Download Payslips
          </button>
        )}
        <button className="w-8 h-8 btn-ghost flex items-center justify-center flex-shrink-0">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type TabKey = "overview" | "batches" | "history"

export default function PayrollPage() {
  const [tab,     setTab]     = useState<TabKey>("overview")
  const [batches, setBatches] = useState(payrollBatches)
  const [filter,  setFilter]  = useState<PayrollStatus | "all">("all")

  function approveBatch(id: string) {
    setBatches(prev => prev.map(b => b.id === id ? { ...b, status: "approved" as PayrollStatus, approvedBy: "Siddharth Kirtikar", approvedAt: new Date().toISOString() } : b))
  }

  function holdBatch(id: string) {
    setBatches(prev => prev.map(b => b.id === id ? { ...b, status: "on_hold" as PayrollStatus } : b))
  }

  const filtered = filter === "all" ? batches : batches.filter(b => b.status === filter)

  // Summary numbers
  const totalPayroll     = batches.reduce((s, b) => s + b.totalAmount, 0)
  const pendingApproval  = batches.filter(b => b.status === "pending_approval").reduce((s, b) => s + b.totalAmount, 0)
  const processed        = batches.filter(b => b.status === "processed").reduce((s, b) => s + b.totalAmount, 0)
  const onHold           = batches.filter(b => b.status === "on_hold").reduce((s, b) => s + b.totalAmount, 0)
  const pendingCount     = batches.filter(b => b.status === "pending_approval").length
  const totalHours       = batches.reduce((s, b) => s + b.totalHours, 0)

  const TABS: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "batches",  label: `Payroll Batches (${batches.length})` },
    { key: "history",  label: "History" },
  ]

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 lg:px-6 py-3 lg:py-3.5 border-b border-white/[0.07] flex-shrink-0" style={{ background: "var(--surface)", backdropFilter: "blur(20px)" }}>
          <CreditCard size={18} className="text-blue-400 flex-shrink-0" />
          <div className="flex-1">
            <h1 className="text-base font-bold text-white">Payroll</h1>
            <p className="text-[11px] text-white/35">Apr 2026 · {pendingCount} batch{pendingCount !== 1 ? "es" : ""} need approval</p>
          </div>
          <button className="btn-ghost flex items-center gap-1.5 text-[12px] py-2 px-3">
            <Download size={12} /> Export
          </button>
        </header>

        {/* Tab nav */}
        <div className="flex items-center gap-1 px-4 lg:px-6 pt-3 border-b border-white/[0.07] flex-shrink-0" style={{ background: "var(--surface)" }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx("px-4 py-2 text-[12px] font-medium rounded-t-lg transition-all border-b-2", tab === t.key ? "text-blue-400 border-teal-400 bg-white/[0.04]" : "text-white/35 border-transparent hover:text-white/60")}
            >
              {t.label}
            </button>
          ))}
        </div>

        <main className="flex-1 overflow-y-auto p-4 lg:p-5 space-y-4 lg:space-y-5 pb-nav lg:pb-5">
          {/* KPI row — always visible */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Payroll (Apr)", value: fmtINR(totalPayroll),    sub: "All batches",         color: "var(--accent)",  icon: DollarSign   },
              { label: "Pending Approval",    value: fmtINR(pendingApproval), sub: `${pendingCount} batches`,  color: "#c89060",  icon: Clock        },
              { label: "Processed",           value: fmtINR(processed),       sub: "Sent to finance",     color: "#2563EB",  icon: FileCheck    },
              { label: "Total Hours",         value: fmtNum(totalHours) + "h",sub: "Across all batches",  color: "var(--text-1)", icon: Users   },
            ].map(s => (
              <div key={s.label} className="glass p-4 flex gap-3 items-start">
                <s.icon size={16} style={{ color: s.color }} className="mt-1 flex-shrink-0" />
                <div>
                  <div className="text-[11px] text-white/35 mb-0.5">{s.label}</div>
                  <div className="text-[20px] font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[11px] text-white/25 mt-0.5">{s.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Overview tab */}
          {tab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Trend chart */}
              <div className="lg:col-span-3 glass p-4">
                <div className="text-[14px] font-semibold text-white mb-0.5">Monthly Payroll Trend</div>
                <div className="text-[11px] text-white/35 mb-4">May 2025 – Apr 2026</div>
                <div style={{ height: 140 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={payrollTrend}>
                      <defs>
                        <linearGradient id="payGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(v: number) => fmtINR(v)}
                        contentStyle={{ background: "rgba(12,9,24,0.95)", border: "1px solid var(--border-strong)", borderRadius: 8, fontSize: 11, color: "#f8fafc" }}
                      />
                      <Area type="monotone" dataKey="total" stroke="var(--accent)" strokeWidth={1.5} fill="url(#payGrad)" dot={(props) => {
                        const { cx, cy, payload } = props as { cx: number; cy: number; payload: { current?: boolean } }
                        if (!payload.current) return <circle key={cx} cx={cx} cy={cy} r={0} />
                        return <circle key={cx} cx={cx} cy={cy} r={4} fill="var(--accent)" stroke="#09090e" strokeWidth={2} />
                      }} name="Payroll" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Client breakdown */}
              <div className="lg:col-span-2 glass p-4">
                <div className="text-[14px] font-semibold text-white mb-0.5">Top Clients by Payroll</div>
                <div className="text-[11px] text-white/35 mb-4">Monthly (₹ Lakhs)</div>
                <div style={{ height: 140 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={clientPayrollData} barSize={14}>
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(v: number) => `₹${v.toFixed(1)}L`}
                        contentStyle={{ background: "rgba(12,9,24,0.95)", border: "1px solid var(--border-strong)", borderRadius: 8, fontSize: 11, color: "#f8fafc" }}
                      />
                      <Bar dataKey="amount" radius={[3, 3, 0, 0]}>
                        {clientPayrollData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Status breakdown */}
              <div className="lg:col-span-5 grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(STATUS_CFG).map(([status, cfg]) => {
                  const batchList = batches.filter(b => b.status === status)
                  const amt = batchList.reduce((s, b) => s + b.totalAmount, 0)
                  return (
                    <div key={status} className="glass p-3 rounded-xl" style={{ borderLeft: `2px solid ${cfg.color}` }}>
                      <div className="text-[11px] font-semibold mb-1" style={{ color: cfg.color }}>{cfg.label}</div>
                      <div className="text-[16px] font-black text-white">{batchList.length}</div>
                      <div className="text-[11px] text-white/30">{amt > 0 ? fmtINR(amt) : "—"}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Batches tab */}
          {tab === "batches" && (
            <>
              {/* Filter row */}
              <div className="flex items-center gap-2 flex-wrap">
                {(["all", ...Object.keys(STATUS_CFG)] as (PayrollStatus | "all")[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={clsx("px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all capitalize", filter === f ? "bg-white/10 text-white" : "text-white/35 hover:text-white/60")}
                    style={filter === f && f !== "all" ? { color: STATUS_CFG[f as PayrollStatus].color } : {}}
                  >
                    {f === "all" ? `All (${batches.length})` : STATUS_CFG[f as PayrollStatus].label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(batch => (
                  <BatchCard key={batch.id} batch={batch} onApprove={approveBatch} onHold={holdBatch} />
                ))}
              </div>
            </>
          )}

          {/* History tab */}
          {tab === "history" && (
            <div className="glass overflow-hidden rounded-2xl overflow-x-auto">
              <div className="px-5 py-4 border-b border-white/[0.07]">
                <div className="text-[14px] font-semibold text-white">Payroll History</div>
                <div className="text-[11px] text-white/35">All processed and approved batches</div>
              </div>
              <table className="w-full min-w-[600px] text-[12px]">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    {["Client", "Period", "Timesheets", "Hours", "Amount", "Status", "Approved by", "Processed"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[11px] text-white/30 font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {batches.map(b => {
                    const client = getClient(b.clientId)
                    const cfg = STATUS_CFG[b.status]
                    return (
                      <tr key={b.id} className="ts-row">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: client?.color ?? "#888" }} />
                            <span className="font-medium text-white/85">{client?.name ?? b.clientId}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-white/55">{b.period}</td>
                        <td className="px-5 py-3 text-white/65">{b.approvedTimesheets}/{b.totalTimesheets}</td>
                        <td className="px-5 py-3 text-white/65">{fmtNum(b.totalHours)}h</td>
                        <td className="px-5 py-3 font-semibold text-white/85">{fmtINR(b.totalAmount)}</td>
                        <td className="px-5 py-3">
                          <span className="text-[11px] font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                        </td>
                        <td className="px-5 py-3 text-white/40">{b.approvedBy ?? "—"}</td>
                        <td className="px-5 py-3 text-white/35">{b.processedAt ? new Date(b.processedAt).toLocaleDateString("en-IN") : "—"}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
      <AIAgentOrb />
    </div>
  )
}
