"use client"

import { useState, useMemo, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Sidebar from "@/components/Sidebar"
import AIAgentOrb from "@/components/AIAgentOrb"
import { getClient, getPortal, getClientPolicyRules, getClientPayrollBatches, getClientContacts, REAL_DATA_CLIENT_IDS } from "@/lib/mock-data"
import NotifyPanel, { buildClientComplianceNotify, type NotifyContext } from "@/components/NotifyPanel"
import type { Employee, Timesheet } from "@/lib/types"
import {
  ArrowLeft, Building2, Globe, Mail, Users, Clock, TrendingUp,
  CheckCircle2, AlertTriangle, FileText, CreditCard, Activity,
  ChevronRight, Eye, Check, Flag, ShieldCheck, Calendar, ChevronDown, Search,
  ExternalLink,
} from "lucide-react"
import { AreaChart, Area, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ComposedChart, Line } from "recharts"
import { getRegulationsForClient, CATEGORY_META, RISK_META } from "@/lib/compliance-data"
import OnboardingInbox from "@/components/OnboardingInbox"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtINR(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`
  return `₹${n.toLocaleString()}`
}
function fmtNum(n: number) { return n.toLocaleString("en-IN") }
function initials(name: string) { return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() }

const TABS = ["Overview", "Timesheets", "Employees", "Onboarding", "Policy", "Compliance", "Payroll"] as const
type Tab = typeof TABS[number]

// ─── Tab: Overview ───────────────────────────────────────────────────────────
//
// CEO-focused metrics: what does this client cost us, what do we earn from
// them, and how much of the work is automated by agents?

function OverviewTab({ client, allTimesheets, allEmployees }: {
  client: NonNullable<ReturnType<typeof getClient>>;
  portal: ReturnType<typeof getPortal>;
  allTimesheets: Timesheet[];
  allEmployees:  Employee[];
}) {
  // March 2026 totals from real Postgres data — overlay on top of the
  // mock metrics so the Overview shows authentic numbers wherever they
  // exist. Falls back to the seeded `client.*` values otherwise.
  const _marchTs = allTimesheets.filter(t => {
    const s = (t.periodStart ?? "").slice(0, 10)
    const e = (t.periodEnd   ?? "").slice(0, 10)
    return s.startsWith("2026-03") || e.startsWith("2026-03")
  })
  void _marchTs   // referenced only to suppress lint for now

  // Revenue estimate: monthly payroll * margin factor (typical staffing margin ~15-25%)
  const monthlyRev   = Math.round(client.monthlyPayroll * 0.20)
  // Ops cost estimate: per-timesheet ops cost * timesheet volume
  const monthlyOps   = Math.round(client.pendingTimesheets * 180 + client.activeEmployeeCount * 80)
  const opsPercent   = Math.round((monthlyOps / monthlyRev) * 100)

  // Month-on-month revenue + ops cost as % of revenue (efficiency metric)
  const revVsCostRaw = [
    { month: "Nov", revenue: Math.round(monthlyRev * 0.82), opsCost: Math.round(monthlyOps * 1.18) },
    { month: "Dec", revenue: Math.round(monthlyRev * 0.86), opsCost: Math.round(monthlyOps * 1.12) },
    { month: "Jan", revenue: Math.round(monthlyRev * 0.92), opsCost: Math.round(monthlyOps * 1.06) },
    { month: "Feb", revenue: Math.round(monthlyRev * 0.95), opsCost: Math.round(monthlyOps * 1.02) },
    { month: "Mar", revenue: Math.round(monthlyRev * 0.98), opsCost: Math.round(monthlyOps * 0.98) },
    { month: "Apr", revenue: monthlyRev,                     opsCost: monthlyOps },
  ]
  const revVsCost = revVsCostRaw.map(r => ({
    ...r,
    opsCostPct: Math.round((r.opsCost / r.revenue) * 1000) / 10,
  }))

  // Agent coverage by work type (% automated vs manual)
  const agentCoverage = [
    { work: "Timesheet validation", automated: 82, manual: 18 },
    { work: "Compliance tracking",  automated: 68, manual: 32 },
    { work: "Policy checks",        automated: 74, manual: 26 },
    { work: "Payroll processing",   automated: 56, manual: 44 },
    { work: "Communications",       automated: 61, manual: 39 },
  ]
  const avgCoverage = Math.round(agentCoverage.reduce((s, w) => s + w.automated, 0) / agentCoverage.length)

  const kpis = [
    { label: "Monthly revenue",    value: fmtINR(monthlyRev),   sub: "+4.2% vs last month",    color: "var(--success)" },
    { label: "Ops cost",           value: fmtINR(monthlyOps),   sub: "−2.8% vs last month",    color: "var(--primary-600)" },
    { label: "Agent coverage",     value: `${avgCoverage}%`,    sub: "Across 5 work streams",   color: "var(--primary-700)" },
    { label: "Ops cost % of rev",  value: `${opsPercent}%`,     sub: opsPercent < 25 ? "Healthy margin" : "Watch margin", color: opsPercent < 25 ? "var(--success)" : "var(--warning)" },
  ]

  return (
    <div className="space-y-5">

      {/* 4 KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="stat-card">
            <div className="text-xs" style={{ color: "var(--neutral-600)" }}>{k.label}</div>
            <div className="text-2xl font-semibold tracking-tight mt-2" style={{ color: k.color }}>
              {k.value}
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--neutral-500)" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Chart 1: Revenue + Ops Cost as % of Revenue (efficiency trend) */}
      <div className="glass p-6">
        <div className="flex items-start justify-between mb-5 gap-3">
          <div>
            <div className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>
              Revenue &amp; Ops Cost Efficiency
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--neutral-500)" }}>
              6-month trend · revenue bars + ops cost as % of revenue
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs" style={{ color: "var(--neutral-600)" }}>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: "var(--success)" }} />
              Revenue (₹)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5" style={{ background: "var(--primary-500)" }} />
              Ops cost % of rev
            </span>
          </div>
        </div>

        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={revVsCost} margin={{ top: 10, right: 40, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "var(--neutral-600)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: "var(--neutral-500)" }}
                axisLine={false} tickLine={false}
                tickFormatter={v => `₹${(v/100000).toFixed(1)}L`}
                width={55}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: "var(--primary-600)" }}
                axisLine={false} tickLine={false}
                tickFormatter={v => `${v}%`}
                width={40}
                domain={[0, 40]}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  fontSize: 12,
                  color: "var(--text-primary)",
                  boxShadow: "var(--shadow-2)",
                }}
                formatter={(v: number, name: string) => {
                  if (name === "Ops cost % of rev") return [`${v}%`, name]
                  return [fmtINR(v), name]
                }}
                labelStyle={{ color: "var(--text-secondary)", fontWeight: 600 }}
              />
              <Bar yAxisId="left" dataKey="revenue" fill="var(--success)" radius={[6, 6, 0, 0]} barSize={32} name="Revenue" opacity={0.85} />
              <Line yAxisId="right" type="monotone" dataKey="opsCostPct"
                stroke="var(--primary-500)" strokeWidth={2.5}
                dot={{ r: 4, fill: "var(--primary-500)", strokeWidth: 2, stroke: "var(--card)" }}
                activeDot={{ r: 6 }}
                name="Ops cost % of rev"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Agent Coverage by work type */}
      <div className="glass p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>
              Agent Coverage by Work Stream
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--neutral-500)" }}>
              What % of each work type is handled by AI agents vs ops team
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs" style={{ color: "var(--neutral-600)" }}>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: "var(--primary-500)" }} />
              Automated
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: "var(--neutral-200)" }} />
              Manual
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {agentCoverage.map(w => (
            <div key={w.work}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{w.work}</span>
                <span style={{ color: "var(--neutral-600)" }}>
                  <span className="font-semibold" style={{ color: "var(--primary-700)" }}>{w.automated}%</span> automated
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden flex" style={{ background: "var(--neutral-200)" }}>
                <div className="h-full rounded-l-full transition-all"
                  style={{ width: `${w.automated}%`, background: "var(--primary-500)" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Compliance ─────────────────────────────────────────────────────────

function ComplianceTab({ client }: { client: NonNullable<ReturnType<typeof getClient>> }) {
  const regulations = getRegulationsForClient(client.name)
  const actionable  = regulations.filter(r => r.actionRequired)
  const contacts    = useMemo(() => getClientContacts(client), [client])

  const [notifyCtx, setNotifyCtx] = useState<NotifyContext | null>(null)

  function fmtPenalty(n: number) {
    if (n === 0) return "—"
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
    if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`
    return `₹${n.toLocaleString("en-IN")}`
  }

  function openNotify(reg: ReturnType<typeof getRegulationsForClient>[number]) {
    setNotifyCtx(buildClientComplianceNotify({
      clientName:    client.name,
      amName:        contacts.amName,
      amEmail:       contacts.amEmail,
      clientContact: contacts.clientContact,
      buzzworksCc:   contacts.buzzworksCc,
      clientCc:      contacts.clientCc,
      regulation: {
        title:         reg.title,
        authority:     reg.authority,
        region:        reg.region,
        effectiveDate: reg.effectiveDate,
        penalty:       fmtPenalty(reg.penaltyAmount),
        reference:     reg.reference,
        sourceUrl:     reg.sourceUrl,
        sourceName:    reg.sourceName,
        summary:       reg.summary,
      },
    }))
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="text-xs" style={{ color: "var(--neutral-600)" }}>Total regulations</div>
          <div className="text-2xl font-semibold mt-2" style={{ color: "var(--primary-700)" }}>
            {regulations.length}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--neutral-500)" }}>Affecting this client</div>
        </div>
        <div className="stat-card">
          <div className="text-xs" style={{ color: "var(--neutral-600)" }}>Action required</div>
          <div className="text-2xl font-semibold mt-2" style={{ color: "var(--warning)" }}>
            {actionable.length}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--neutral-500)" }}>Needs follow-up</div>
        </div>
        <div className="stat-card">
          <div className="text-xs" style={{ color: "var(--neutral-600)" }}>High legal risk</div>
          <div className="text-2xl font-semibold mt-2" style={{ color: "var(--error)" }}>
            {regulations.filter(r => r.legalRisk === "high").length}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--neutral-500)" }}>Review priority</div>
        </div>
      </div>

      {/* Stakeholder strip */}
      <div className="glass p-4 flex items-center gap-3 flex-wrap text-[12px]">
        <span className="uppercase tracking-wider text-[11px] font-semibold"
          style={{ color: "var(--text-3)" }}>Stakeholders</span>
        <span className="px-2 py-1 rounded-md font-medium"
          style={{ background: "var(--pink-50)", color: "var(--pink-700)" }}>
          AM · {contacts.amName}
        </span>
        <span className="px-2 py-1 rounded-md"
          style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
          Client contact · {contacts.clientContact.name}
        </span>
        <span className="text-[11px]" style={{ color: "var(--text-3)" }}>
          + CC: {contacts.buzzworksCc}, {contacts.clientCc}
        </span>
      </div>

      {/* Feed */}
      <div className="space-y-3">
        {regulations.length === 0 ? (
          <div className="glass p-8 text-center text-sm" style={{ color: "var(--neutral-500)" }}>
            No regulations currently affecting this client
          </div>
        ) : regulations.map(reg => {
          const catMeta  = CATEGORY_META[reg.category]
          const riskMeta = RISK_META[reg.legalRisk]
          return (
            <article key={reg.id} className="glass p-5">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-md flex items-center gap-1.5"
                  style={{ background: catMeta.bg, color: catMeta.color }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: catMeta.color }} />
                  {catMeta.label}
                </span>
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-md"
                  style={{ background: riskMeta.bg, color: riskMeta.color }}>
                  {riskMeta.label} legal risk
                </span>
                {reg.actionRequired && (
                  <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md"
                    style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
                    <AlertTriangle size={10} /> Action required
                  </span>
                )}
                <span className="text-[11px] ml-auto" style={{ color: "var(--neutral-500)" }}>
                  {reg.date}
                </span>
              </div>
              <h3 className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>
                {reg.title}
              </h3>
              <div className="text-xs mt-1" style={{ color: "var(--neutral-600)" }}>
                {reg.authority} · Effective {reg.effectiveDate}
              </div>
              <p className="text-[14px] leading-relaxed mt-3" style={{ color: "var(--neutral-600)" }}>
                {reg.summary}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 pt-3 flex-wrap"
                style={{ borderTop: "1px solid var(--border)" }}>
                <button onClick={() => openNotify(reg)}
                  className="btn-primary flex items-center gap-1.5 text-xs"
                  style={{ padding: "6px 12px" }}>
                  <Mail size={12} /> Notify team
                </button>
                <Link href={`/compliance/${reg.id}`}
                  className="btn-ghost flex items-center gap-1.5 text-xs"
                  style={{ padding: "6px 12px" }}>
                  <FileText size={12} /> Full article
                </Link>
                <a href={reg.sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium ml-auto transition-opacity hover:opacity-70"
                  style={{ color: "var(--primary-600)" }}>
                  <ExternalLink size={11} />
                  {reg.sourceName}
                </a>
              </div>
            </article>
          )
        })}
      </div>

      <NotifyPanel context={notifyCtx} onClose={() => setNotifyCtx(null)} />
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

function TimesheetsTab({ clientId, allTimesheets, allEmployees }: { clientId: string; allTimesheets: Timesheet[]; allEmployees: Employee[] }) {
  const [statusFilter, setStatusFilter] = useState("all")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [approverFilter, setApproverFilter] = useState("all")
  const [search, setSearch] = useState("")

  // Single source of truth: timesheets fetched via parent from
  // /api/timesheets/[clientId]. Empty until that data lands.
  const allTs = allTimesheets.filter(t => t.clientId === clientId)

  const filtered = useMemo(() => {
    return allTs.filter(t => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false
      if (sourceFilter !== "all" && t.source !== sourceFilter) return false
      if (approverFilter === "agent" && t.approvedBy !== "JARVIS") return false
      if (approverFilter === "human" && (t.approvedBy === "JARVIS" || !t.approvedBy)) return false
      if (search) {
        const emp = allEmployees.find(e => e.id === t.employeeId)
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
          { label: "JARVIS only", value: "agent" },
          { label: "Human approved", value: "human" },
        ]} />
        <span className="text-[11px] ml-auto" style={{ color: "var(--text-3)" }}>{filtered.length} of {allTs.length}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-[14px]" style={{ color: "var(--text-3)" }}>No timesheets match the current filters.</div>
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
              const emp = allEmployees.find(e => e.id === t.employeeId)
              return (
                <tr key={t.id} className="ts-row">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold" style={{ background: "var(--surface)", color: "var(--text-2)" }}>
                        {emp ? initials(emp.name) : "?"}
                      </div>
                      <div>
                        <div className="font-semibold" style={{ color: "var(--text-1)" }}>{emp?.name ?? t.employeeId}</div>
                        <div className="text-[11px]" style={{ color: "var(--text-3)" }}>{emp?.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[11px]" style={{ color: "var(--text-2)" }}>{t.period}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold" style={{ color: "var(--text-1)" }}>{t.totalHours}h</div>
                    {t.overtimeHours > 0 && <div className="text-[11px]" style={{ color: "var(--warn)" }}>+{t.overtimeHours}h OT</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge badge-portal text-[11px]">{t.source}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-[14px]" style={{ color: t.validationScore >= 85 ? "var(--accent)" : t.validationScore >= 60 ? "var(--warn)" : "var(--danger)" }}>
                      {t.validationScore}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {t.approvedBy === "JARVIS"
                      ? <span className="text-[11px] font-medium" style={{ color: "var(--accent)" }}>⚡ JARVIS</span>
                      : <span className="text-[11px]" style={{ color: "var(--text-2)" }}>{t.approvedBy ?? "—"}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge badge-${t.status} text-[11px]`}>{t.status}</span>
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

function EmployeesTab({ clientId, allEmployees }: { clientId: string; allEmployees: Employee[] }) {
  const [deptFilter, setDeptFilter]     = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch]             = useState("")

  const sample = useMemo(() =>
    allEmployees.filter(e => e.clientId === clientId), [allEmployees, clientId])

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
        <span className="text-[11px] ml-auto" style={{ color: "var(--text-3)" }}>{filtered.length} of {fmtNum(sample.length)}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-white/[0.05]">
              {["Employee", "Role", "Department", "City", "Pay Grade", "Leave Balance", "Status"].map(h => (
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
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: `${emp.avatarColor}22`, color: emp.avatarColor }}>
                        {initials(emp.name)}
                      </div>
                      <div>
                        <div className="font-medium text-white/85">{emp.name}</div>
                        <div className="text-white/30 text-[11px]">{emp.employeeCode}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-white/65">{emp.role}</td>
                  <td className="px-4 py-2.5 text-white/50">{emp.department}</td>
                  <td className="px-4 py-2.5 text-white/50">{emp.city}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-[11px] font-semibold font-mono px-2 py-0.5 rounded"
                      style={{ background: "var(--pink-50)", color: "var(--pink-700)", border: "1px solid var(--pink-100)" }}>
                      {emp.payGrade}
                    </span>
                  </td>
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
        <div className="text-[14px] text-white/30">No policy rules configured for this client.</div>
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
              className="text-[11px] px-2 py-0.5 rounded-full font-bold uppercase"
              style={{ background: `${catColors[rule.category]}18`, color: catColors[rule.category] }}
            >
              {rule.category}
            </span>
            <span
              className="text-[11px] px-2 py-0.5 rounded-full font-bold uppercase"
              style={{ background: "var(--surface-2)", color: sevColors[rule.severity] }}
            >
              {rule.severity}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-[14px] text-white">{rule.name}</span>
              {rule.aiGenerated && (
                <span className="text-[11px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(37,99,235,0.15)", color: "#2563EB" }}>AI</span>
              )}
              <span className={clsx("w-2 h-2 rounded-full ml-auto", rule.enabled ? "bg-blue-400" : "bg-white/20")} />
            </div>
            <div className="text-[12px] text-white/55 mb-2">{rule.description}</div>
            <div className="font-mono text-[11px] px-2 py-1 rounded-lg text-white/40" style={{ background: "var(--surface-2)" }}>
              if ({rule.triggerCondition}) → {rule.actionOnTrigger}
            </div>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-white/25">
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
        <div className="glass p-8 text-center text-white/30 text-[14px]">No payroll batches yet.</div>
      )}
      {batches.map(b => (
        <div key={b.id} className="glass p-4 rounded-xl flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-[14px] text-white">{b.period}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize" style={{ background: "var(--surface-2)", color: statusColors[b.status] ?? "var(--text-2)" }}>
                {b.status.replace("_", " ")}
              </span>
              {b.onHoldCount > 0 && (
                <span className="text-[11px] text-amber-400 flex items-center gap-1"><AlertTriangle size={10} />{b.onHoldCount} on hold</span>
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

// ─── Header KPI pills (real DB metrics where present, mock fallback) ─────
function ClientKpiPills({ client, allEmployees, allTimesheets }: {
  client: NonNullable<ReturnType<typeof getClient>>;
  allEmployees: Employee[];
  allTimesheets: Timesheet[];
}) {
  const realActive  = allEmployees.length || null
  const realPending = allTimesheets.filter(t => t.status === "pending" || t.status === "reviewing").length || null
  const marchPayroll = allTimesheets
    .filter(t => (t.periodStart ?? "").slice(0, 7) === "2026-03"
              || (t.periodEnd   ?? "").slice(0, 7) === "2026-03")
    .reduce((s, t) => s + (t.totalPayable ?? 0), 0)
  const realPayroll = marchPayroll > 0 ? marchPayroll : null
  return (
    <div className="hidden lg:flex items-center gap-3">
      {[
        { icon: Users,       value: realActive  != null ? fmtNum(realActive)  : fmtNum(client.activeEmployeeCount), label: "Active employees", color: "#2563EB" },
        { icon: Clock,       value: realPending != null ? realPending          : client.pendingTimesheets,           label: "Pending",          color: "#c89060" },
        { icon: TrendingUp,  value: realPayroll != null ? fmtINR(realPayroll) : fmtINR(client.monthlyPayroll),      label: realPayroll != null ? "March payroll" : "Monthly payroll", color: "var(--accent)" },
        { icon: ShieldCheck, value: `${client.complianceScore}%`,        label: "Compliance",       color: client.complianceScore > 90 ? "var(--accent)" : "#c89060" },
      ].map(k => (
        <div key={k.label} className="glass px-3 py-2 rounded-xl text-center">
          <div className="text-[14px] font-black" style={{ color: k.color }}>{k.value}</div>
          <div className="text-[11px] text-white/30">{k.label}</div>
        </div>
      ))}
    </div>
  )
}

export default function ClientDetailPage() {
  const params    = useParams<{ id: string }>()
  const client    = getClient(params.id)
  const portal    = client?.portalId ? getPortal(client.portalId) : undefined
  const [tab, setTab] = useState<Tab>("Overview")

  // Two-tier fetch — light roster + summary first (for header KPIs and
  // Employees tab), then heavy timesheets only when the Timesheets tab
  // is opened. Capgemini's full payload is ~3 MB; the lightweight
  // endpoint is ~50 KB.
  const [allEmployees,  setAllEmployees ] = useState<Employee[]>([])
  const [allTimesheets, setAllTimesheets] = useState<Timesheet[]>([])
  const [tsLoaded,      setTsLoaded     ] = useState(false)
  useEffect(() => {
    if (!params.id) return
    fetch(`/api/employees/${params.id}`)
      .then(r => r.json())
      .then(d => setAllEmployees(Array.isArray(d.employees) ? d.employees : []))
      .catch(() => { /* leave empty */ })
  }, [params.id])

  // Lazy-load timesheets when Timesheets or Overview tab needs them.
  useEffect(() => {
    if (tsLoaded || !params.id) return
    if (tab !== "Timesheets" && tab !== "Overview") return
    setTsLoaded(true)
    fetch(`/api/timesheets/${params.id}`)
      .then(r => r.json())
      .then(d => setAllTimesheets(Array.isArray(d.timesheets) ? d.timesheets : []))
      .catch(() => { /* leave empty */ })
  }, [params.id, tab, tsLoaded])

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
                {client.timesheetMethod === "manual" ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "rgba(37,99,235,0.1)", color: "#2563EB" }}><Mail size={10} />Manual</span>
                ) : portal ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: `${portal.color}15`, color: portal.color }}><Globe size={10} />{portal.shortName}</span>
                ) : null}
              </div>
              <div className="text-[11px] text-white/35 mt-0.5">{client.city}, {client.state} · Policy {client.policyVersion} · AM: {client.accountManager}</div>
            </div>

            {/* KPI pills — real where data has landed, fall back to mock */}
            <ClientKpiPills
              client={client}
              allEmployees={allEmployees}
              allTimesheets={allTimesheets}
            />
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
          {tab === "Overview"    && <OverviewTab client={client} portal={portal} allTimesheets={allTimesheets} allEmployees={allEmployees} />}
          {tab === "Timesheets"  && <TimesheetsTab clientId={client.id} allTimesheets={allTimesheets} allEmployees={allEmployees} />}
          {tab === "Employees"   && <EmployeesTab clientId={client.id} allEmployees={allEmployees} />}
          {tab === "Onboarding"  && (
            <div className="glass overflow-hidden" style={{ height: "calc(100vh - 220px)" }}>
              <OnboardingInbox clientId={client.id} />
            </div>
          )}
          {tab === "Policy"      && <PolicyTab clientId={client.id} />}
          {tab === "Compliance"  && <ComplianceTab client={client} />}
          {tab === "Payroll"     && <PayrollTab clientId={client.id} />}
        </main>
      </div>
      <AIAgentOrb />
    </div>
  )
}
