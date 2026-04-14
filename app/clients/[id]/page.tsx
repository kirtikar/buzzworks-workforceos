"use client"

import { useState, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Sidebar from "@/components/Sidebar"
import AIAgentOrb from "@/components/AIAgentOrb"
import { getClient, getPortal, timesheets, employees, getClientPolicyRules, getClientPayrollBatches } from "@/lib/mock-data"
import { generateEmployeesForClient } from "@/lib/mock-generator"
import {
  ArrowLeft, Building2, Globe, Mail, Users, Clock, TrendingUp,
  CheckCircle2, AlertTriangle, FileText, CreditCard, Activity,
  ChevronRight, Eye, Check, Flag, ShieldCheck, Calendar, ChevronDown, Search,
} from "lucide-react"
import { AreaChart, Area, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, BarChart, Bar, XAxis } from "recharts"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtINR(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`
  return `₹${n.toLocaleString()}`
}
function fmtNum(n: number) { return n.toLocaleString("en-IN") }
function initials(name: string) { return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() }

const TABS = ["Overview", "Timesheets", "Employees", "Policy", "Payroll"] as const
type Tab = typeof TABS[number]

// Weekly volume (mock for this client)
const weeklyVolume = [
  { week: "Mar W1", submitted: 42, approved: 40, flagged: 2 },
  { week: "Mar W2", submitted: 48, approved: 44, flagged: 4 },
  { week: "Mar W3", submitted: 51, approved: 47, flagged: 4 },
  { week: "Mar W4", submitted: 39, approved: 38, flagged: 1 },
  { week: "Apr W1", submitted: 46, approved: 22, flagged: 5 },
]

const statusBreakdown = [
  { name: "Approved",  value: 22, color: "var(--accent)" },
  { name: "Pending",   value: 14, color: "#c89060" },
  { name: "Flagged",   value: 5,  color: "#c07070" },
  { name: "Reviewed",  value: 5,  color: "#7090c8" },
]

// ─── Tab: Overview ───────────────────────────────────────────────────────────

function OverviewTab({ client, portal }: { client: NonNullable<ReturnType<typeof getClient>>; portal: ReturnType<typeof getPortal> }) {
  return (
    <div className="space-y-4">
      {/* Weekly trend */}
      <div className="glass p-4">
        <div className="text-[13px] font-semibold text-white mb-0.5">Weekly Submission Volume</div>
        <div className="text-[11px] text-white/35 mb-4">Last 5 weeks</div>
        <div style={{ height: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyVolume}>
              <defs>
                <linearGradient id="csubGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "rgba(12,9,24,0.95)", border: "1px solid var(--border-strong)", borderRadius: 8, fontSize: 11, color: "#f8fafc" }} />
              <Area type="monotone" dataKey="submitted" stroke="rgba(75,143,255,0.35)" strokeWidth={1.5} fill="url(#csubGrad)" dot={false} name="Submitted" />
              <Area type="monotone" dataKey="approved"  stroke="var(--accent)" strokeWidth={1.5} fill="none" dot={false} name="Approved" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status donut */}
        <div className="glass p-4">
          <div className="text-[13px] font-semibold text-white mb-3">Status Breakdown — Apr W1</div>
          <div className="flex items-center gap-4">
            <div style={{ width: 100, height: 100 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={28} outerRadius={44} paddingAngle={2} dataKey="value" strokeWidth={0}>
                    {statusBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 flex-1">
              {statusBreakdown.map(s => (
                <div key={s.name} className="flex items-center gap-2 text-[12px]">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="flex-1 text-white/60">{s.name}</span>
                  <span className="font-semibold text-white/80">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Portal sync info */}
        <div className="glass p-4">
          <div className="text-[13px] font-semibold text-white mb-3">Integration Status</div>
          {client.emailOnly ? (
            <div className="flex items-start gap-3">
              <Mail size={18} className="text-violet-400 mt-0.5" />
              <div>
                <div className="text-[13px] font-medium text-white">Email-only client</div>
                <div className="text-[11px] text-white/35 mt-1">Timesheets submitted to candidatemanager@buzzworks.com — manually parsed by AI.</div>
              </div>
            </div>
          ) : portal ? (
            <div className="space-y-2.5 text-[12px]">
              <div className="flex items-center justify-between">
                <span className="text-white/40">Portal</span>
                <span className="font-semibold text-white/80">{portal.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40">Status</span>
                <span className="text-blue-400 flex items-center gap-1"><CheckCircle2 size={11} /> {portal.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40">Sync frequency</span>
                <span className="text-white/70">{{ "15min":"Every 15 min","1hr":"Hourly","4hr":"Every 4 hrs","24hr":"Daily" }[portal.syncFrequency]}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40">Success rate</span>
                <span style={{ color: portal.successRate > 98 ? "var(--accent)" : "#c89060" }}>{portal.successRate}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40">API version</span>
                <span className="text-white/50 font-mono text-[11px]">{portal.apiVersion}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Policy snapshot */}
      <div className="glass p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[13px] font-semibold text-white">Policy Snapshot</div>
          <span className="text-[11px] text-white/35">v{client.policyVersion.replace("v", "")}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
          {[
            { label: "Weekly limit",     value: `${client.weeklyHoursLimit}h` },
            { label: "Daily limit",      value: `${client.dailyHoursLimit}h` },
            { label: "OT multiplier",    value: client.overtimeMultiplier === 0 ? "No OT" : `${client.overtimeMultiplier}×` },
            { label: "SLA turnaround",   value: `${client.slaHours}h` },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <div className="text-[18px] font-black text-white">{s.value}</div>
              <div className="text-[10px] text-white/30 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Shared filter select ─────────────────────────────────────────────────────

function FSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void
  options: { label: string; value: string }[]
}) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="glass-input text-[11px] py-1.5 appearance-none cursor-pointer" style={{ paddingRight: 28 }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-3)" }} />
    </div>
  )
}

// ─── Tab: Timesheets ─────────────────────────────────────────────────────────

function TimesheetsTab({ clientId }: { clientId: string }) {
  const [statusFilter, setStatusFilter] = useState("all")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [approverFilter, setApproverFilter] = useState("all")
  const [search, setSearch] = useState("")

  const allTs = timesheets.filter(t => t.clientId === clientId)

  const filtered = useMemo(() => {
    return allTs.filter(t => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false
      if (sourceFilter !== "all" && t.source !== sourceFilter) return false
      if (approverFilter === "agent" && t.approvedBy !== "Agent Mark") return false
      if (approverFilter === "human" && (t.approvedBy === "Agent Mark" || !t.approvedBy)) return false
      if (search) {
        const emp = employees.find(e => e.id === t.employeeId)
        const q = search.toLowerCase()
        if (!emp?.name.toLowerCase().includes(q) && !t.id.includes(q) && !t.period.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [allTs, statusFilter, sourceFilter, approverFilter, search])

  const statusColor = { pending:"var(--text-2)", reviewing:"var(--info)", flagged:"var(--warn)", approved:"var(--accent)", processed:"#00a880", rejected:"var(--danger)" }

  return (
    <div className="glass overflow-hidden">
      {/* Filter bar */}
      <div className="px-4 py-3 flex items-center gap-2 flex-wrap" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="relative flex-1 min-w-[140px] max-w-[200px]">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-3)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee, period…"
            className="glass-input w-full text-[11px] py-1.5 pl-7" />
        </div>
        <FSelect value={statusFilter} onChange={setStatusFilter} options={[
          { label: "All statuses", value: "all" },
          { label: "Pending", value: "pending" },
          { label: "Reviewing", value: "reviewing" },
          { label: "Flagged", value: "flagged" },
          { label: "Approved", value: "approved" },
          { label: "Processed", value: "processed" },
          { label: "Rejected", value: "rejected" },
        ]} />
        <FSelect value={sourceFilter} onChange={setSourceFilter} options={[
          { label: "All sources", value: "all" },
          { label: "Portal", value: "portal" },
          { label: "Email", value: "email" },
          { label: "Manual", value: "manual" },
        ]} />
        <FSelect value={approverFilter} onChange={setApproverFilter} options={[
          { label: "All approvers", value: "all" },
          { label: "Agent Mark only", value: "agent" },
          { label: "Human approved", value: "human" },
        ]} />
        <span className="text-[10px] ml-auto" style={{ color: "var(--text-3)" }}>{filtered.length} of {allTs.length}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-[13px]" style={{ color: "var(--text-3)" }}>No timesheets match the current filters.</div>
      ) : (
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Employee", "Period", "Hours", "Source", "Score", "Approved by", "Status", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => {
              const emp = employees.find(e => e.id === t.employeeId)
              return (
                <tr key={t.id} className="ts-row">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold" style={{ background: "var(--surface)", color: "var(--text-2)" }}>
                        {emp ? initials(emp.name) : "?"}
                      </div>
                      <div>
                        <div className="font-semibold" style={{ color: "var(--text-1)" }}>{emp?.name ?? t.employeeId}</div>
                        <div className="text-[10px]" style={{ color: "var(--text-3)" }}>{emp?.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[11px]" style={{ color: "var(--text-2)" }}>{t.period}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold" style={{ color: "var(--text-1)" }}>{t.totalHours}h</div>
                    {t.overtimeHours > 0 && <div className="text-[10px]" style={{ color: "var(--warn)" }}>+{t.overtimeHours}h OT</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge badge-portal text-[10px]">{t.source}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-[13px]" style={{ color: t.validationScore >= 85 ? "var(--accent)" : t.validationScore >= 60 ? "var(--warn)" : "var(--danger)" }}>
                      {t.validationScore}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {t.approvedBy === "Agent Mark"
                      ? <span className="text-[11px] font-medium" style={{ color: "var(--accent)" }}>⚡ Agent Mark</span>
                      : <span className="text-[11px]" style={{ color: "var(--text-2)" }}>{t.approvedBy ?? "—"}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge badge-${t.status} text-[10px]`}>{t.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href="/timesheets">
                      <button className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ color: "var(--text-2)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-hover)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <Eye size={12} />
                      </button>
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─── Tab: Employees ───────────────────────────────────────────────────────────

function EmployeesTab({ clientId, employeeCount }: { clientId: string; employeeCount: number }) {
  const [deptFilter, setDeptFilter]     = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch]             = useState("")

  const sample = useMemo(() => {
    const seed = employees.filter(e => e.clientId === clientId)
    const generated = generateEmployeesForClient(clientId, Math.min(50, employeeCount) - seed.length)
    return [...seed, ...generated].slice(0, Math.min(50, employeeCount))
  }, [clientId, employeeCount])

  const depts = useMemo(() => ["all", ...Array.from(new Set(sample.map(e => e.department))).sort()], [sample])

  const filtered = useMemo(() => {
    return sample.filter(e => {
      if (deptFilter !== "all" && e.department !== deptFilter) return false
      if (statusFilter !== "all" && e.employmentStatus !== statusFilter) return false
      if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.employeeCode.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [sample, deptFilter, statusFilter, search])

  return (
    <div className="glass overflow-hidden">
      {/* Filter bar */}
      <div className="px-4 py-3 flex items-center gap-2 flex-wrap" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="relative flex-1 min-w-[140px] max-w-[200px]">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-3)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, code…"
            className="glass-input w-full text-[11px] py-1.5 pl-7" />
        </div>
        <FSelect value={deptFilter} onChange={setDeptFilter}
          options={depts.map(d => ({ label: d === "all" ? "All departments" : d, value: d }))} />
        <FSelect value={statusFilter} onChange={setStatusFilter} options={[
          { label: "All statuses", value: "all" },
          { label: "Active", value: "active" },
          { label: "On notice", value: "notice" },
          { label: "Ended", value: "ended" },
          { label: "On hold", value: "on_hold" },
        ]} />
        <span className="text-[10px] ml-auto" style={{ color: "var(--text-3)" }}>{filtered.length} of {fmtNum(employeeCount)}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-white/[0.05]">
              {["Employee", "Role", "Department", "City", "Rate/hr", "Leave", "Status"].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[11px] text-white/30 font-semibold uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp, i) => {
              const remaining = emp.leaveBalance.annual - emp.leaveBalance.usedAnnual
              const statusColor = { active: "var(--accent)", notice: "#c89060", ended: "#c07070", on_hold: "var(--text-3)" }[emp.employmentStatus]
              return (
                <tr key={emp.id} className="ts-row">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: `${emp.avatarColor}22`, color: emp.avatarColor }}>
                        {initials(emp.name)}
                      </div>
                      <div>
                        <div className="font-medium text-white/85">{emp.name}</div>
                        <div className="text-white/30 text-[10px]">{emp.employeeCode}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-white/65">{emp.role}</td>
                  <td className="px-4 py-2.5 text-white/50">{emp.department}</td>
                  <td className="px-4 py-2.5 text-white/50">{emp.city}</td>
                  <td className="px-4 py-2.5 text-white/80 font-medium">₹{emp.ratePerHour}/h</td>
                  <td className="px-4 py-2.5">
                    <span className="text-[11px]" style={{ color: remaining > 5 ? "var(--accent)" : remaining > 0 ? "#c89060" : "#c07070" }}>{remaining}d left</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-[11px] font-medium capitalize" style={{ color: statusColor }}>{emp.employmentStatus}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Tab: Policy ──────────────────────────────────────────────────────────────

function PolicyTab({ clientId }: { clientId: string }) {
  const rules = getClientPolicyRules(clientId)
  if (rules.length === 0) {
    return (
      <div className="glass p-8 text-center">
        <FileText size={32} className="text-white/15 mx-auto mb-3" />
        <div className="text-[13px] text-white/30">No policy rules configured for this client.</div>
        <Link href="/policy">
          <button className="btn-teal mt-4 text-[12px]">Open Policy Engine</button>
        </Link>
      </div>
    )
  }
  const catColors: Record<string, string> = { hours:"var(--accent)", overtime:"#c89060", leave:"#2563EB", attendance:"#3B82F6", payroll:"#10B981", compliance:"#F59E0B" }
  const sevColors: Record<string, string> = { info:"var(--text-2)", warning:"#c89060", violation:"#c07070" }

  return (
    <div className="space-y-3">
      {rules.map(rule => (
        <div key={rule.id} className="glass p-4 rounded-xl flex items-start gap-4">
          <div className="flex flex-col items-center gap-1.5 mt-0.5 flex-shrink-0">
            <span
              className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase"
              style={{ background: `${catColors[rule.category]}18`, color: catColors[rule.category] }}
            >
              {rule.category}
            </span>
            <span
              className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase"
              style={{ background: "var(--surface-2)", color: sevColors[rule.severity] }}
            >
              {rule.severity}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-[13px] text-white">{rule.name}</span>
              {rule.aiGenerated && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(37,99,235,0.15)", color: "#2563EB" }}>AI</span>
              )}
              <span className={clsx("w-2 h-2 rounded-full ml-auto", rule.enabled ? "bg-blue-400" : "bg-white/20")} />
            </div>
            <div className="text-[12px] text-white/55 mb-2">{rule.description}</div>
            <div className="font-mono text-[10px] px-2 py-1 rounded-lg text-white/40" style={{ background: "var(--surface-2)" }}>
              if ({rule.triggerCondition}) → {rule.actionOnTrigger}
            </div>
            <div className="flex items-center gap-3 mt-2 text-[10px] text-white/25">
              <span>Applied {rule.appliedCount}× this month</span>
              <span>Triggered {rule.triggerCount}×</span>
              <span>by {rule.createdBy}</span>
            </div>
          </div>
        </div>
      ))}
      <div className="text-center pt-2">
        <Link href="/policy">
          <button className="btn-ghost text-[12px] flex items-center gap-1.5 mx-auto">
            Manage all rules in Policy Engine <ChevronRight size={12} />
          </button>
        </Link>
      </div>
    </div>
  )
}

// ─── Tab: Payroll ────────────────────────────────────────────────────────────

function PayrollTab({ clientId }: { clientId: string }) {
  const batches = getClientPayrollBatches(clientId)
  const statusColors = { draft:"var(--text-3)", pending_approval:"#c89060", approved:"#2563EB", processed:"var(--accent)", on_hold:"#c07070" }
  return (
    <div className="space-y-3">
      {batches.length === 0 && (
        <div className="glass p-8 text-center text-white/30 text-[13px]">No payroll batches yet.</div>
      )}
      {batches.map(b => (
        <div key={b.id} className="glass p-4 rounded-xl flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-[13px] text-white">{b.period}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize" style={{ background: "var(--surface-2)", color: statusColors[b.status] ?? "var(--text-2)" }}>
                {b.status.replace("_", " ")}
              </span>
              {b.onHoldCount > 0 && (
                <span className="text-[10px] text-amber-400 flex items-center gap-1"><AlertTriangle size={10} />{b.onHoldCount} on hold</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 text-[11px] mt-2">
              <div><div className="text-white/30">Timesheets</div><div className="font-semibold text-white/80">{b.approvedTimesheets}/{b.totalTimesheets}</div></div>
              <div><div className="text-white/30">Total hours</div><div className="font-semibold text-white/80">{fmtNum(b.totalHours)}h</div></div>
              <div><div className="text-white/30">Amount</div><div className="font-semibold text-white/80">{fmtINR(b.totalAmount)}</div></div>
            </div>
          </div>
          {b.status === "pending_approval" && (
            <button className="btn-teal text-[12px] py-2 px-4 flex-shrink-0">Approve</button>
          )}
          {b.status === "draft" && (
            <button className="btn-ghost text-[12px] py-2 px-4 flex-shrink-0">Review</button>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

import clsx from "clsx"

export default function ClientDetailPage() {
  const params    = useParams<{ id: string }>()
  const client    = getClient(params.id)
  const portal    = client?.portalId ? getPortal(client.portalId) : undefined
  const [tab, setTab] = useState<Tab>("Overview")

  if (!client) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center text-white/30 text-[14px]">
          Client not found — <Link href="/clients" className="text-blue-400 ml-2">Back to Clients</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-6 py-3.5 border-b border-white/[0.07] flex-shrink-0" style={{ background: "var(--surface)", backdropFilter: "blur(20px)" }}>
          <Link href="/clients" className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 mb-2 transition-colors">
            <ArrowLeft size={11} /> Clients
          </Link>
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-[14px] flex-shrink-0"
              style={{ background: `${client.color}18`, color: client.color, border: `1px solid ${client.color}30` }}
            >
              {client.code.slice(0, 3)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-[16px] font-bold text-white">{client.name}</h1>
                <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>{client.industry}</span>
                {client.emailOnly ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "rgba(37,99,235,0.1)", color: "#2563EB" }}><Mail size={10} />Email only</span>
                ) : portal ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: `${portal.color}15`, color: portal.color }}><Globe size={10} />{portal.shortName}</span>
                ) : null}
              </div>
              <div className="text-[11px] text-white/35 mt-0.5">{client.city}, {client.state} · Policy {client.policyVersion} · AM: {client.accountManager}</div>
            </div>

            {/* KPI pills */}
            <div className="hidden lg:flex items-center gap-3">
              {[
                { icon: Users,       value: fmtNum(client.activeEmployeeCount), label: "Active employees", color: "#2563EB" },
                { icon: Clock,       value: client.pendingTimesheets,            label: "Pending",          color: "#c89060" },
                { icon: TrendingUp,  value: fmtINR(client.monthlyPayroll),       label: "Monthly payroll",  color: "var(--accent)" },
                { icon: ShieldCheck, value: `${client.complianceScore}%`,        label: "Compliance",       color: client.complianceScore > 90 ? "var(--accent)" : "#c89060" },
              ].map(k => (
                <div key={k.label} className="glass px-3 py-2 rounded-xl text-center">
                  <div className="text-[15px] font-black" style={{ color: k.color }}>{k.value}</div>
                  <div className="text-[9px] text-white/30">{k.label}</div>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* Tab nav */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-white/[0.07] flex-shrink-0" style={{ background: "var(--surface)" }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx("px-4 py-2 text-[12px] font-medium rounded-t-lg transition-all border-b-2", tab === t ? "text-blue-400 border-teal-400 bg-white/[0.04]" : "text-white/35 border-transparent hover:text-white/60")}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-5 pb-nav lg:pb-5">
          {tab === "Overview"    && <OverviewTab client={client} portal={portal} />}
          {tab === "Timesheets"  && <TimesheetsTab clientId={client.id} />}
          {tab === "Employees"   && <EmployeesTab clientId={client.id} employeeCount={client.employeeCount} />}
          {tab === "Policy"      && <PolicyTab clientId={client.id} />}
          {tab === "Payroll"     && <PayrollTab clientId={client.id} />}
        </main>
      </div>
      <AIAgentOrb />
    </div>
  )
}
