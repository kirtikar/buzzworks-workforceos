"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import Sidebar from "@/components/Sidebar"
import BottomNav from "@/components/BottomNav"
import { clients, employees as seedEmployees, timesheets } from "@/lib/mock-data"
import { generateEmployeesForClient } from "@/lib/mock-generator"
import type { Employee, JobCategory, EmploymentStatus } from "@/lib/types"
import {
  Search, Users, Download, ChevronDown, X, ChevronLeft, ChevronRight,
  ArrowUpDown, MapPin, Briefcase, Calendar, Mail, FileText,
  CheckCircle2, AlertTriangle, Shield, Activity, Star,
  BarChart3, Clock,
} from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from "recharts"
import clsx from "clsx"

// ─── Constants ────────────────────────────────────────────────────────────────

const JOB_CATEGORIES: JobCategory[] = [
  "Engineering","Design","Finance","Operations","Sales","HR","Marketing",
  "Analytics","Healthcare","Legal","Consulting","PMO","Security","DevOps","QA","Admin",
]
const CITIES = [
  "Mumbai","Bangalore","Hyderabad","Chennai","Pune","Gurgaon","Noida","Delhi",
  "Kolkata","Ahmedabad","Coimbatore","Kochi","Chandigarh","Jaipur","Bhubaneswar",
]
const STATUSES: { value: EmploymentStatus; label: string }[] = [
  { value: "active",  label: "Active"    },
  { value: "notice",  label: "On Notice" },
  { value: "ended",   label: "Ended"     },
  { value: "on_hold", label: "On Hold"   },
]

const TABS = ["Overview", "Timesheets", "Leave", "Risk"] as const
type Tab = typeof TABS[number]

// ─── Pool builder ─────────────────────────────────────────────────────────────

function buildEmployeePool(): Employee[] {
  const pool: Employee[] = [...seedEmployees]
  for (const client of clients) {
    const seedCount = seedEmployees.filter(e => e.clientId === client.id).length
    const need = Math.min(80, client.employeeCount) - seedCount
    if (need > 0) pool.push(...generateEmployeesForClient(client.id, need, seedCount))
  }
  return pool
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}
function fmtINR(n: number) {
  return n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString("en-IN")}`
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function LeaveBar({ bal }: { bal: Employee["leaveBalance"] }) {
  const rem = bal.annual - bal.usedAnnual
  const pct = Math.round((rem / bal.annual) * 100)
  const color = pct > 60 ? "var(--accent)" : pct > 25 ? "var(--warn)" : "var(--danger)"
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-1.5 rounded-full" style={{ background: "var(--border)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-medium tabular-nums" style={{ color }}>{rem}d</span>
    </div>
  )
}

function StatusDot({ status }: { status: EmploymentStatus }) {
  const map: Record<EmploymentStatus, [string, string]> = {
    active:  ["var(--accent)", "Active"],
    notice:  ["var(--warn)",   "On Notice"],
    ended:   ["var(--danger)", "Ended"],
    on_hold: ["var(--text-3)", "On Hold"],
  }
  const [color, label] = map[status]
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      {label}
    </span>
  )
}

// ─── Filter Dropdown ──────────────────────────────────────────────────────────

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
          <span className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
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
                  {selected.includes(opt.value) && <span className="text-white text-[8px] font-bold">✓</span>}
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

// ─── Date Range Filter ────────────────────────────────────────────────────────

function DateRangeFilter({ fromDate, toDate, onChange }: {
  fromDate: string; toDate: string; onChange: (from: string, to: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])
  const active = fromDate || toDate
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={clsx(
          "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all whitespace-nowrap",
          active ? "border-[color:var(--accent)]" : "border-[color:var(--border)] hover:border-[color:var(--border-strong)]"
        )}
        style={{ background: active ? "var(--pink-100)" : "var(--surface)", color: active ? "var(--pink-700)" : "var(--text-2)" }}>
        <Calendar size={12} />
        Joined
        {active && <span className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />}
        <ChevronDown size={11} className={clsx("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-[100] rounded-xl border shadow-xl p-4 min-w-[240px]"
          style={{ background: "var(--surface)", borderColor: "var(--border-strong)", boxShadow: "0 12px 32px rgba(0,0,0,0.15)" }}>
          <div className="text-xs font-semibold mb-3" style={{ color: "var(--text-2)" }}>Date of Joining</div>
          <div className="space-y-2">
            <div>
              <label className="text-[11px] mb-1 block" style={{ color: "var(--text-3)" }}>From</label>
              <input type="date" value={fromDate}
                onChange={e => onChange(e.target.value, toDate)}
                className="glass-input w-full" />
            </div>
            <div>
              <label className="text-[11px] mb-1 block" style={{ color: "var(--text-3)" }}>To</label>
              <input type="date" value={toDate}
                onChange={e => onChange(fromDate, e.target.value)}
                className="glass-input w-full" />
            </div>
          </div>
          {(fromDate || toDate) && (
            <button onClick={() => { onChange("", ""); setOpen(false) }}
              className="mt-3 text-xs font-semibold" style={{ color: "var(--accent)" }}>
              Clear dates
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Drawer Tab: Overview ─────────────────────────────────────────────────────

const weeklyTrend = [
  { week: "Feb W3", hours: 40, ot: 0 },
  { week: "Feb W4", hours: 40, ot: 2 },
  { week: "Mar W1", hours: 38, ot: 0 },
  { week: "Mar W2", hours: 40, ot: 0 },
  { week: "Mar W3", hours: 40, ot: 0 },
  { week: "Mar W4", hours: 40, ot: 0 },
  { week: "Apr W1", hours: 40, ot: 0 },
]
const monthlyEarnings = [
  { month: "Jan", amount: 85000 },
  { month: "Feb", amount: 87200 },
  { month: "Mar", amount: 88000 },
  { month: "Apr", amount: 20000 },
]

function OverviewTab({ emp }: { emp: Employee }) {
  const empTs      = timesheets.filter(t => t.employeeId === emp.id)
  const approved   = empTs.filter(t => t.status === "approved").length
  const flagged    = empTs.filter(t => t.status === "flagged").length
  const totalHours = empTs.reduce((s, t) => s + t.totalHours, 0)
  const totalEarned = empTs.reduce((s, t) => s + t.totalPayable, 0)
  const avgScore   = empTs.length
    ? Math.round(empTs.reduce((s, t) => s + t.validationScore, 0) / empTs.length)
    : 0
  const scoreColor = avgScore >= 90 ? "var(--accent)" : avgScore >= 70 ? "var(--warn)" : "var(--danger)"

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Timesheets",      value: empTs.length, color: "var(--text-1)", icon: FileText    },
          { label: "Approved",        value: approved,     color: "var(--accent)", icon: CheckCircle2 },
          { label: "Flagged",         value: flagged,      color: "var(--warn)",   icon: AlertTriangle },
          { label: "Avg score",       value: `${avgScore}%`, color: scoreColor,   icon: Shield       },
        ].map(k => (
          <div key={k.label} className="p-3.5 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <k.icon size={12} style={{ color: k.color }} />
              <span className="text-[11px]" style={{ color: "var(--text-3)" }}>{k.label}</span>
            </div>
            <div className="text-xl font-bold tabular-nums" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Earnings */}
      <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="text-[11px]" style={{ color: "var(--text-3)" }}>YTD Earnings</div>
            <div className="text-2xl font-bold mt-0.5" style={{ color: "var(--accent)" }}>{fmtINR(totalEarned)}</div>
            <div className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>{totalHours}h across {empTs.length} periods</div>
          </div>
        </div>
        <div style={{ height: 52 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyEarnings}>
              <defs>
                <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, color: "var(--text-1)" }}
                formatter={(v: number) => fmtINR(v)} />
              <Area type="monotone" dataKey="amount" stroke="var(--accent)" strokeWidth={1.5} fill="url(#eg)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly hours */}
      <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
        <div className="text-[11px] mb-3" style={{ color: "var(--text-3)" }}>Weekly Hours — Last 7 Weeks</div>
        <div style={{ height: 80 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyTrend} barSize={12}>
              <XAxis dataKey="week" tick={{ fontSize: 9, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, color: "var(--text-1)" }}
                cursor={{ fill: "var(--surface-2)" }} />
              <Bar dataKey="hours" fill="var(--accent)" opacity={0.6} radius={[3,3,0,0]} name="Regular" />
              <Bar dataKey="ot" fill="var(--warn)" radius={[3,3,0,0]} name="OT" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Employment details */}
      <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
        <div className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-3)" }}>Employment</div>
        <div className="space-y-2">
          {[
            { label: "Code",       value: emp.employeeCode },
            { label: "Department", value: emp.department   },
            { label: "Category",   value: emp.jobCategory  },
            { label: "Rate",       value: `₹${emp.ratePerHour}/hr` },
            { label: "Joined",     value: fmtDate(emp.startDate) },
            { label: "Manager",    value: emp.managerEmail ?? "Not assigned" },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--text-3)" }}>{row.label}</span>
              <span className="text-xs font-medium" style={{ color: "var(--text-1)" }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Drawer Tab: Timesheets ───────────────────────────────────────────────────

function TimesheetsTab({ empId }: { empId: string }) {
  const ts = timesheets.filter(t => t.employeeId === empId)
  const statusColor: Record<string, string> = {
    pending: "var(--text-2)", reviewing: "var(--info)", flagged: "var(--warn)",
    approved: "var(--accent)", processed: "var(--accent)", rejected: "var(--danger)",
  }
  return ts.length === 0 ? (
    <div className="p-8 text-center text-sm" style={{ color: "var(--text-3)" }}>No timesheets found.</div>
  ) : (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
            {["Period", "Hours", "OT", "Score", "Status"].map(h => (
              <th key={h} className="text-left px-3 py-2.5 font-semibold uppercase tracking-wider text-[10px]"
                style={{ color: "var(--text-3)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ts.map(t => (
            <tr key={t.id} className="ts-row" style={{ borderBottom: "1px solid var(--border)" }}>
              <td className="px-3 py-2.5" style={{ color: "var(--text-2)" }}>{t.period}</td>
              <td className="px-3 py-2.5 font-semibold tabular-nums" style={{ color: "var(--text-1)" }}>{t.totalHours}h</td>
              <td className="px-3 py-2.5 tabular-nums">
                {t.overtimeHours > 0
                  ? <span style={{ color: "var(--warn)" }}>+{t.overtimeHours}h</span>
                  : <span style={{ color: "var(--text-3)" }}>—</span>}
              </td>
              <td className="px-3 py-2.5">
                <span className="font-bold" style={{ color: t.validationScore >= 85 ? "var(--accent)" : t.validationScore >= 60 ? "var(--warn)" : "var(--danger)" }}>
                  {t.validationScore}
                </span>
              </td>
              <td className="px-3 py-2.5">
                <span className="font-medium capitalize" style={{ color: statusColor[t.status] }}>{t.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Drawer Tab: Leave ────────────────────────────────────────────────────────

function LeaveTab({ emp }: { emp: Employee }) {
  const lb = emp.leaveBalance
  const leaveTypes = [
    { label: "Annual",  total: lb.annual, used: lb.usedAnnual,  color: "var(--accent)", icon: Calendar },
    { label: "Sick",    total: lb.sick,   used: lb.usedSick,    color: "var(--info)",   icon: Activity },
    { label: "Casual",  total: lb.casual, used: lb.usedCasual,  color: "var(--warn)",  icon: Star     },
  ]
  return (
    <div className="space-y-3">
      {leaveTypes.map(lt => {
        const remaining = lt.total - lt.used
        const pct = Math.round((lt.used / lt.total) * 100)
        return (
          <div key={lt.label} className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <lt.icon size={12} style={{ color: lt.color }} />
                <span className="text-xs font-medium" style={{ color: "var(--text-1)" }}>{lt.label} Leave</span>
              </div>
              <span className="text-xs" style={{ color: "var(--text-3)" }}>{lt.used} used</span>
            </div>
            <div className="flex items-end gap-1.5 mb-2">
              <span className="text-2xl font-bold" style={{ color: lt.color }}>{remaining}</span>
              <span className="text-xs pb-0.5" style={{ color: "var(--text-3)" }}>/ {lt.total} days left</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: "var(--border)" }}>
              <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: lt.color, opacity: 0.7 }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Drawer Tab: Risk ─────────────────────────────────────────────────────────

function RiskTab({ emp }: { emp: Employee }) {
  const empTs      = timesheets.filter(t => t.employeeId === emp.id)
  const flaggedCount = empTs.filter(t => t.status === "flagged").length
  const otCount    = empTs.filter(t => t.overtimeHours > 0).length
  const avgScore   = empTs.length
    ? Math.round(empTs.reduce((s, t) => s + t.validationScore, 0) / empTs.length)
    : 100
  const riskLevel  = flaggedCount > 2 || avgScore < 70 ? "High" : flaggedCount > 0 || avgScore < 85 ? "Medium" : "Low"
  const riskColor  = riskLevel === "High" ? "var(--danger)" : riskLevel === "Medium" ? "var(--warn)" : "var(--accent)"

  const signals = [
    { label: "Clean submissions",    value: `${empTs.filter(t => t.validationScore === 100).length} periods`,  status: "pass" },
    { label: "Unapproved OT",        value: `${otCount} occurrence${otCount !== 1 ? "s" : ""}`,                status: otCount > 2 ? "fail" : otCount > 0 ? "warn" : "pass" },
    { label: "Flagged timesheets",   value: `${flaggedCount} flagged`,                                          status: flaggedCount > 2 ? "fail" : flaggedCount > 0 ? "warn" : "pass" },
    { label: "Avg validation score", value: `${avgScore}%`,                                                     status: avgScore >= 90 ? "pass" : avgScore >= 70 ? "warn" : "fail" },
    { label: "Leave balance",        value: `${emp.leaveBalance.annual - emp.leaveBalance.usedAnnual}d left`,  status: (emp.leaveBalance.annual - emp.leaveBalance.usedAnnual) > 5 ? "pass" : "warn" },
    { label: "Employment status",    value: emp.employmentStatus,                                               status: emp.employmentStatus === "active" ? "pass" : emp.employmentStatus === "notice" ? "warn" : "fail" },
  ]

  const statusIcon = { pass: "✓", warn: "⚠", fail: "✕" }
  const statusCls  = { pass: "check-pass", warn: "check-warning", fail: "check-fail" }

  return (
    <div className="space-y-3">
      {/* Risk level */}
      <div className="p-4 rounded-xl flex items-center gap-4" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${riskColor}18`, border: `1px solid ${riskColor}30` }}>
          <Shield size={22} style={{ color: riskColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px]" style={{ color: "var(--text-3)" }}>Risk Level</div>
          <div className="text-xl font-bold" style={{ color: riskColor }}>{riskLevel}</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--text-2)" }}>
            {riskLevel === "Low" ? "Consistent, compliant behaviour" : riskLevel === "Medium" ? "Minor anomalies — monitoring recommended" : "Multiple signals — manual review required"}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[11px]" style={{ color: "var(--text-3)" }}>Score</div>
          <div className="text-2xl font-bold" style={{ color: riskColor }}>{avgScore}</div>
        </div>
      </div>

      {/* Signals */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {signals.map((s, i) => (
          <div key={s.label} className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: i < signals.length - 1 ? "1px solid var(--border)" : "none", background: "var(--surface)" }}>
            <span className={clsx("text-sm font-bold w-4 text-center flex-shrink-0", statusCls[s.status as keyof typeof statusCls])}>
              {statusIcon[s.status as keyof typeof statusIcon]}
            </span>
            <span className="flex-1 text-xs" style={{ color: "var(--text-2)" }}>{s.label}</span>
            <span className="text-xs font-semibold" style={{ color: "var(--text-1)" }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 size={12} style={{ color: "var(--accent)" }} />
          <span className="text-xs font-semibold" style={{ color: "var(--text-1)" }}>JARVIS Recommendation</span>
        </div>
        <div className="space-y-1.5 text-xs" style={{ color: "var(--text-2)" }}>
          {riskLevel === "Low" && <>
            <p>• Continue auto-approval pathway — meets all trust tier criteria.</p>
            <p>• Consider Trust Tier T2 after 4 more clean submissions.</p>
          </>}
          {riskLevel === "Medium" && <>
            <p>• Retain for human spot-check every 3rd submission cycle.</p>
            <p>• Monitor overtime patterns over next 30 days.</p>
          </>}
          {riskLevel === "High" && <>
            <p>• Escalate to Account Manager for review.</p>
            <p>• Suspend auto-approval until 3 submissions are manually reviewed.</p>
          </>}
        </div>
      </div>
    </div>
  )
}

// ─── Employee Drawer ──────────────────────────────────────────────────────────

function EmployeeDrawer({ emp, onClose }: { emp: Employee; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("Overview")
  const client = clients.find(c => c.id === emp.clientId)
  const statusColor: Record<EmploymentStatus, string> = {
    active: "var(--accent)", notice: "var(--warn)", ended: "var(--danger)", on_hold: "var(--text-3)",
  }
  const tenure = Math.floor((Date.now() - new Date(emp.startDate).getTime()) / (1000 * 60 * 60 * 24 * 365))

  // Close on Escape
  useEffect(() => {
    function h(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", h)
    return () => document.removeEventListener("keydown", h)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col animate-slide-in-right overflow-hidden"
        style={{
          width: "min(520px, 100vw)",
          background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.1)",
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
              style={{ background: `${emp.avatarColor}18`, color: emp.avatarColor, border: `1px solid ${emp.avatarColor}30` }}
            >
              {initials(emp.name)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold" style={{ color: "var(--text-1)" }}>{emp.name}</span>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                  style={{ background: `${statusColor[emp.employmentStatus]}12`, color: statusColor[emp.employmentStatus] }}
                >
                  {emp.employmentStatus.replace("_", " ")}
                </span>
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-2)" }}>{emp.role} · {emp.department}</div>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap text-[11px]" style={{ color: "var(--text-3)" }}>
                <span className="flex items-center gap-1"><MapPin size={10} /> {emp.city}</span>
                <span className="flex items-center gap-1"><Mail size={10} /> {emp.email}</span>
                <span className="flex items-center gap-1"><Clock size={10} /> {tenure}yr tenure</span>
                {client && (
                  <span
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                    style={{ background: `${client.color}18`, color: client.color }}
                  >
                    {client.code}
                  </span>
                )}
              </div>
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 transition-colors"
              style={{ color: "var(--text-3)", background: "var(--surface-2)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
            >
              <X size={15} />
            </button>
          </div>

          {/* KPI pills */}
          <div className="flex items-center gap-2 mt-3">
            {[
              { label: "Bill rate",  value: `₹${emp.ratePerHour}/h`, color: "var(--accent)" },
              { label: "Leave left", value: `${emp.leaveBalance.annual - emp.leaveBalance.usedAnnual}d`, color: "var(--info)" },
              { label: "Code",       value: emp.employeeCode, color: "var(--text-2)" },
            ].map(k => (
              <div key={k.label} className="px-3 py-1.5 rounded-lg" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <div className="text-sm font-bold tabular-nums" style={{ color: k.color }}>{k.value}</div>
                <div className="text-[10px]" style={{ color: "var(--text-3)" }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center px-5 border-b flex-shrink-0" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-2.5 text-xs font-medium border-b-2 transition-all"
              style={{
                borderColor: tab === t ? "var(--accent)" : "transparent",
                color: tab === t ? "var(--accent)" : "var(--text-3)",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === "Overview"   && <OverviewTab emp={emp} />}
          {tab === "Timesheets" && <TimesheetsTab empId={emp.id} />}
          {tab === "Leave"      && <LeaveTab emp={emp} />}
          {tab === "Risk"       && <RiskTab emp={emp} />}
        </div>
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const allEmployees = useMemo(() => buildEmployeePool(), [])

  const [search,        setSearch]        = useState("")
  const [selClients,    setSelClients]    = useState<string[]>([])
  const [selCategories, setSelCategories] = useState<JobCategory[]>([])
  const [selCities,     setSelCities]     = useState<string[]>([])
  const [selStatuses,   setSelStatuses]   = useState<EmploymentStatus[]>([])
  const [fromDate,      setFromDate]      = useState("")
  const [toDate,        setToDate]        = useState("")
  const [sortBy,        setSortBy]        = useState<"name"|"rate"|"startDate"|"leave">("name")
  const [page,          setPage]          = useState(1)
  const [selectedEmp,   setSelectedEmp]  = useState<Employee | null>(null)
  const PAGE_SIZE = 50

  function toggle<T>(arr: T[], set: (v: T[]) => void, val: T) {
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
    setPage(1)
  }

  const filtered = useMemo(() => {
    let list = [...allEmployees]
    if (search)              list = list.filter(e => [e.name,e.email,e.role,e.employeeCode].some(f => f.toLowerCase().includes(search.toLowerCase())))
    if (selClients.length)   list = list.filter(e => selClients.includes(e.clientId))
    if (selCategories.length)list = list.filter(e => selCategories.includes(e.jobCategory))
    if (selCities.length)    list = list.filter(e => selCities.includes(e.city))
    if (selStatuses.length)  list = list.filter(e => selStatuses.includes(e.employmentStatus))
    if (fromDate)            list = list.filter(e => e.startDate >= fromDate)
    if (toDate)              list = list.filter(e => e.startDate <= toDate)
    list.sort((a, b) =>
      sortBy === "name"      ? a.name.localeCompare(b.name) :
      sortBy === "rate"      ? b.ratePerHour - a.ratePerHour :
      sortBy === "startDate" ? new Date(b.startDate).getTime() - new Date(a.startDate).getTime() :
                               (b.leaveBalance.annual - b.leaveBalance.usedAnnual) - (a.leaveBalance.annual - a.leaveBalance.usedAnnual)
    )
    return list
  }, [allEmployees,search,selClients,selCategories,selCities,selStatuses,fromDate,toDate,sortBy])

  const paginated  = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const activeFilterCount = selClients.length + selCategories.length + selCities.length + selStatuses.length + (fromDate ? 1 : 0) + (toDate ? 1 : 0)

  const clientOptions   = clients.map(c => ({ value: c.id, label: c.name }))
  const categoryOptions = JOB_CATEGORIES.map(c => ({ value: c, label: c }))
  const cityOptions     = CITIES.map(c => ({ value: c, label: c }))
  const statusOptions   = STATUSES.map(s => ({ value: s.value, label: s.label }))

  function clearAll() {
    setSelClients([]); setSelCategories([]); setSelCities([])
    setSelStatuses([]); setFromDate(""); setToDate(""); setSearch(""); setPage(1)
  }

  return (
    <div className="flex h-screen overflow-hidden app-bg">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="flex items-center gap-3 px-4 lg:px-6 py-3.5 border-b flex-shrink-0"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <Users size={16} style={{ color: "var(--accent)" }} className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold" style={{ color: "var(--text-1)" }}>Employees</h1>
            <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
              {filtered.length.toLocaleString()} of {allEmployees.length.toLocaleString()} employees
            </p>
          </div>
          <button className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-3">
            <Download size={12} /><span className="hidden sm:inline">Export</span>
          </button>
        </header>

        {/* Filter bar */}
        <div className="border-b flex-shrink-0"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex flex-wrap items-center gap-2 px-4 lg:px-6 py-2.5">
          <div className="relative flex-shrink-0">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
            <input
              className="glass-input pl-8 pr-3 py-2 text-xs w-48"
              placeholder="Name, code, role…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>

          <div className="w-px h-4 flex-shrink-0" style={{ background: "var(--border)" }} />

          <FilterDropdown label="Client" options={clientOptions}
            selected={selClients} onToggle={v => toggle(selClients, setSelClients, v)} onClear={() => setSelClients([])} />
          <FilterDropdown label="Category" icon={Briefcase} options={categoryOptions}
            selected={selCategories} onToggle={v => toggle(selCategories, setSelCategories, v as JobCategory)} onClear={() => setSelCategories([])} />
          <FilterDropdown label="City" icon={MapPin} options={cityOptions}
            selected={selCities} onToggle={v => toggle(selCities, setSelCities, v)} onClear={() => setSelCities([])} />
          <FilterDropdown label="Status" options={statusOptions}
            selected={selStatuses} onToggle={v => toggle(selStatuses, setSelStatuses, v as EmploymentStatus)} onClear={() => setSelStatuses([])} />
          <DateRangeFilter fromDate={fromDate} toDate={toDate}
            onChange={(f, t) => { setFromDate(f); setToDate(t); setPage(1) }} />

          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs flex-shrink-0"
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-2)" }}>
            <ArrowUpDown size={11} />
            <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="bg-transparent text-xs outline-none" style={{ color: "var(--text-2)" }}>
              <option value="name">Name</option>
              <option value="rate">Rate ↓</option>
              <option value="startDate">Newest</option>
              <option value="leave">Leave</option>
            </select>
          </div>

          {activeFilterCount > 0 && (
            <button onClick={clearAll}
              className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-semibold flex-shrink-0"
              style={{ color: "var(--danger)", background: "var(--danger-bg)", border: "1px solid var(--danger-border)" }}>
              <X size={11} /> Clear ({activeFilterCount})
            </button>
          )}
        </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto overflow-x-auto pb-nav lg:pb-0">
          <table className="w-full min-w-[700px] border-collapse">
            <thead className="sticky top-0 z-10" style={{ background: "var(--surface)" }}>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                {["Employee","Client","Role / Category","City","Joined","Rate / hr","Leave","Status"].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold whitespace-nowrap"
                    style={{ color: "var(--text-3)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(emp => {
                const client = clients.find(c => c.id === emp.clientId)
                return (
                  <tr key={emp.id}
                    onClick={() => setSelectedEmp(emp)}
                    className="ts-row border-b cursor-pointer"
                    style={{ borderColor: "var(--border)" }}>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                          style={{ background: emp.avatarColor + "22", color: emp.avatarColor }}>
                          {initials(emp.name)}
                        </div>
                        <div>
                          <div className="text-xs font-semibold" style={{ color: "var(--text-1)" }}>{emp.name}</div>
                          <div className="text-[10px] font-mono" style={{ color: "var(--text-3)" }}>{emp.employeeCode}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: (client?.color || "#888") + "18", color: client?.color || "#888" }}>
                        {client?.code || emp.clientId.toUpperCase()}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-xs" style={{ color: "var(--text-1)" }}>{emp.role}</div>
                      <div className="text-[10px]" style={{ color: "var(--text-3)" }}>{emp.jobCategory}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: "var(--text-2)" }}>{emp.city}</span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-xs tabular-nums" style={{ color: "var(--text-2)" }}>
                        {new Date(emp.startDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--text-1)" }}>
                        ₹{emp.ratePerHour.toLocaleString()}
                      </span>
                    </td>

                    <td className="px-4 py-3"><LeaveBar bal={emp.leaveBalance} /></td>
                    <td className="px-4 py-3"><StatusDot status={emp.employmentStatus} /></td>
                  </tr>
                )
              })}
              {paginated.length === 0 && (
                <tr><td colSpan={8} className="text-center py-16 text-sm" style={{ color: "var(--text-3)" }}>
                  No employees match the current filters
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t flex-shrink-0"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <span className="text-xs" style={{ color: "var(--text-3)" }}>
              Page {page} of {totalPages} · {filtered.length} employees
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                className="p-1.5 rounded-lg disabled:opacity-30 transition-all btn-ghost">
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = totalPages <= 5 ? i+1 : page <= 3 ? i+1 : page >= totalPages-2 ? totalPages-4+i : page-2+i
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className="w-7 h-7 rounded-lg text-xs font-medium transition-all"
                    style={{ background: p === page ? "var(--accent)" : "transparent", color: p === page ? "#fff" : "var(--text-2)" }}>
                    {p}
                  </button>
                )
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg disabled:opacity-30 transition-all btn-ghost">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Employee Drawer */}
      {selectedEmp && (
        <EmployeeDrawer emp={selectedEmp} onClose={() => setSelectedEmp(null)} />
      )}

      <BottomNav />
    </div>
  )
}
