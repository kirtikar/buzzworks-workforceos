"use client"

import { useState, useMemo, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Sidebar from "@/components/Sidebar"
import { employees, clients, timesheets } from "@/lib/mock-data"
import { generateEmployeesForClient } from "@/lib/mock-generator"
import type { Timesheet, DailyEntry } from "@/lib/types"
import {
  ArrowLeft, User, Mail, MapPin, Calendar, Clock, TrendingUp,
  CheckCircle2, AlertTriangle, FileText, Shield, Activity,
  ChevronRight, ChevronLeft, Eye, Briefcase, Star, BarChart3,
  Globe,
} from "lucide-react"
import { AreaChart, Area, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts"
import clsx from "clsx"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  return `₹${n.toLocaleString("en-IN")}`
}
function initials(name: string) { return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

const TABS = ["Overview", "Timesheets", "Leave", "Risk Profile"] as const
type Tab = typeof TABS[number]

// Mock weekly hours trend for the employee
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
  { month: "Apr", amount: 20000 }, // partial
]

// ─── Tab: Overview ───────────────────────────────────────────────────────────

function OverviewTab({ emp }: { emp: NonNullable<typeof employees[0]> }) {
  const empTimesheets = timesheets.filter(t => t.employeeId === emp.id)
  const approved = empTimesheets.filter(t => t.status === "approved").length
  const flagged  = empTimesheets.filter(t => t.status === "flagged").length
  const totalHours = empTimesheets.reduce((s, t) => s + t.totalHours, 0)
  const totalEarned = empTimesheets.reduce((s, t) => s + t.totalPayable, 0)
  const avgScore = empTimesheets.length
    ? Math.round(empTimesheets.reduce((s, t) => s + t.validationScore, 0) / empTimesheets.length)
    : 0

  const scoreColor = avgScore >= 90 ? "var(--accent)" : avgScore >= 70 ? "var(--warn)" : "var(--danger)"

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total timesheets", value: empTimesheets.length, color: "var(--text-1)", icon: FileText },
          { label: "Approved", value: approved, color: "var(--accent)", icon: CheckCircle2 },
          { label: "Flagged", value: flagged, color: "var(--warn)", icon: AlertTriangle },
          { label: "Avg validation score", value: `${avgScore}%`, color: scoreColor, icon: Shield },
        ].map(k => (
          <div key={k.label} className="glass p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <k.icon size={13} style={{ color: k.color }} />
              <div className="text-[11px] text-[color:var(--text-3)] uppercase tracking-wider">{k.label}</div>
            </div>
            <div className="text-[24px] font-black" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Weekly hours trend */}
      <div className="glass p-4">
        <div className="text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>Weekly Hours — Last 7 Weeks</div>
        <div className="text-[11px] mb-4" style={{ color: "var(--text-3)" }}>Regular + overtime breakdown</div>
        <div style={{ height: 110 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyTrend} barSize={14}>
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, color: "var(--text-1)" }}
                cursor={{ fill: "var(--surface-2)" }}
              />
              <Bar dataKey="hours" fill="var(--accent)" opacity={0.7} radius={[3,3,0,0]} name="Regular" />
              <Bar dataKey="ot" fill="var(--warn)" radius={[3,3,0,0]} name="Overtime" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monthly earnings */}
        <div className="glass p-4">
          <div className="text-[14px] font-semibold mb-1" style={{ color: "var(--text-1)" }}>Monthly Earnings (YTD)</div>
          <div className="text-[11px] mb-3" style={{ color: "var(--text-3)" }}>Based on approved timesheets</div>
          <div className="text-[24px] font-black" style={{ color: "var(--accent)" }}>{fmtINR(totalEarned)}</div>
          <div className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>{totalHours}h logged across {empTimesheets.length} periods</div>
          <div style={{ height: 60, marginTop: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyEarnings}>
                <defs>
                  <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, color: "var(--text-1)" }} formatter={(v: number) => fmtINR(v)} />
                <Area type="monotone" dataKey="amount" stroke="var(--accent)" strokeWidth={1.5} fill="url(#earnGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pay grade & compensation */}
        <div className="glass p-4" style={{ background: "var(--pink-50)", border: "1px solid var(--pink-100)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[14px] font-semibold" style={{ color: "var(--pink-700)" }}>
              Pay Grade &amp; Compensation
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded"
              style={{ background: "var(--pink-700)", color: "#fff" }}>{emp.payGrade}</span>
          </div>
          <div className="text-[12px] mb-3" style={{ color: "var(--text-2)" }}>
            9×9 grade lattice · band <span className="font-semibold">{emp.payGrade[0]}</span> ·
            step <span className="font-semibold">{emp.payGrade.slice(1)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-lg" style={{ background: "var(--surface)" }}>
              <div className="uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Pay mode</div>
              <div className="text-[14px] font-semibold mt-0.5 capitalize" style={{ color: "var(--text-1)" }}>
                {emp.payMode}
              </div>
            </div>
            <div className="p-2.5 rounded-lg" style={{ background: "var(--surface)" }}>
              <div className="uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Declared rate</div>
              <div className="text-[14px] font-semibold tabular-nums mt-0.5" style={{ color: "var(--text-1)" }}>
                {emp.payMode === "hourly" ? `₹${emp.ratePerHour.toLocaleString("en-IN")}/hr`
                 : emp.payMode === "daily" ? `₹${emp.payRate.toLocaleString("en-IN")}/day`
                 : `₹${emp.payRate.toLocaleString("en-IN")}/mo`}
              </div>
            </div>
          </div>
        </div>

        {/* Employment snapshot */}
        <div className="glass p-4">
          <div className="text-[14px] font-semibold mb-3" style={{ color: "var(--text-1)" }}>Employment Details</div>
          <div className="space-y-2.5 text-[12px]">
            {[
              { label: "Employee code", value: emp.employeeCode },
              { label: "Department",    value: emp.department },
              { label: "Job category",  value: emp.jobCategory },
              { label: "Start date",    value: fmtDate(emp.startDate) },
              { label: "Manager",       value: emp.managerEmail ?? "Not assigned" },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between">
                <span style={{ color: "var(--text-3)" }}>{row.label}</span>
                <span style={{ color: "var(--text-1)" }} className="font-medium">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Month Calendar ──────────────────────────────────────────────────────────
//
// Builds a Mon-start month grid from a list of timesheet daily-entries.
// Each cell shows the day number and total hours (regular + overtime +
// leave). Color: green if ≥9h, amber if 1-8h, gray if 0h on a weekday,
// muted on weekends. Used in the Timesheets tab to validate at-a-glance
// that a worker filled the expected pattern across a calendar month.

function startOfMonthMonday(year: number, month0: number): Date {
  const first = new Date(Date.UTC(year, month0, 1))
  const dow = first.getUTCDay()             // 0 Sun … 6 Sat
  const offsetToMon = dow === 0 ? 6 : dow - 1
  return new Date(Date.UTC(year, month0, 1 - offsetToMon))
}

function MonthCalendar({ entries, externalUrlByDate }: {
  entries: { date: string; regular: number; overtime: number; leave: number; leaveType?: string | null }[]
  externalUrlByDate: Record<string, string | undefined>
}) {
  const today = new Date()
  const [year,  setYear ] = useState(today.getUTCFullYear())
  const [month, setMonth] = useState(today.getUTCMonth())   // 0-indexed

  // Snap to the most recent month that has data, on first paint.
  useEffect(() => {
    if (entries.length === 0) return
    const latest = entries.map(e => e.date).sort().slice(-1)[0]
    if (latest) {
      const d = new Date(latest)
      setYear(d.getUTCFullYear()); setMonth(d.getUTCMonth())
    }
  }, [entries.length])

  const byDate = useMemo(() => {
    const m = new Map<string, { regular: number; overtime: number; leave: number; leaveType?: string | null }>()
    for (const e of entries) {
      const cur = m.get(e.date)
      if (cur) {
        cur.regular  += e.regular
        cur.overtime += e.overtime
        cur.leave    += e.leave
      } else {
        m.set(e.date, { regular: e.regular, overtime: e.overtime, leave: e.leave, leaveType: e.leaveType })
      }
    }
    return m
  }, [entries])

  const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
  const start = startOfMonthMonday(year, month)
  const cells: { iso: string; inMonth: boolean; weekday: number }[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setUTCDate(start.getUTCDate() + i)
    cells.push({
      iso: d.toISOString().slice(0, 10),
      inMonth: d.getUTCMonth() === month,
      weekday: d.getUTCDay(),
    })
  }

  // Monthly summary — only count days inside the month
  const monthDays   = cells.filter(c => c.inMonth)
  const monthTotal  = monthDays.reduce((s, c) => s + (byDate.get(c.iso)?.regular ?? 0) + (byDate.get(c.iso)?.overtime ?? 0), 0)
  const monthLeave  = monthDays.reduce((s, c) => s + (byDate.get(c.iso)?.leave ?? 0), 0)
  const monthDaysWithHours = monthDays.filter(c => (byDate.get(c.iso)?.regular ?? 0) > 0).length

  function bump(delta: number) {
    let m = month + delta, y = year
    if (m < 0)  { m = 11; y -= 1 }
    if (m > 11) { m = 0;  y += 1 }
    setMonth(m); setYear(y)
  }

  return (
    <div className="glass p-5 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>
            {monthLabel}
          </div>
          <div className="text-[11px]" style={{ color: "var(--text-3)" }}>
            {monthTotal}h worked · {monthDaysWithHours} active days
            {monthLeave > 0 ? ` · ${monthLeave}h leave` : ""}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => bump(-1)} className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ color: "var(--text-2)", background: "var(--surface)" }}>
            <ChevronLeft size={14} />
          </button>
          <button onClick={() => bump(+1)} className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ color: "var(--text-2)", background: "var(--surface)" }}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
          <div key={d} className="text-[10px] font-semibold uppercase tracking-wider text-center py-1"
            style={{ color: "var(--text-3)" }}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map(c => {
          const dat = byDate.get(c.iso)
          const reg = dat?.regular ?? 0
          const ot  = dat?.overtime ?? 0
          const lv  = dat?.leave ?? 0
          const total = reg + ot
          const isWeekend = c.weekday === 0 || c.weekday === 6
          const dayNum = parseInt(c.iso.slice(8, 10), 10)
          const url = externalUrlByDate[c.iso]

          let bg = "var(--surface)"
          let txt = "var(--text-2)"
          if (!c.inMonth) {
            bg = "transparent"; txt = "var(--text-3)"
          } else if (lv > 0) {
            bg = "rgba(244,180,0,0.16)"; txt = "var(--warn)"
          } else if (total >= 9) {
            bg = "rgba(5,150,105,0.16)"; txt = "#059669"
          } else if (total > 0) {
            bg = "rgba(244,180,0,0.10)"; txt = "var(--warn)"
          } else if (isWeekend) {
            bg = "var(--surface-2)"; txt = "var(--text-3)"
          } else {
            bg = "var(--surface)"; txt = "var(--text-3)"
          }

          const cell = (
            <div className="rounded-md p-2 min-h-[58px] flex flex-col" style={{ background: bg, opacity: c.inMonth ? 1 : 0.35 }}
              title={c.inMonth
                ? `${c.iso} — Regular: ${reg}h, OT: ${ot}h${lv > 0 ? `, Leave: ${lv}h${dat?.leaveType ? ` (${dat.leaveType})` : ""}` : ""}`
                : c.iso}>
              <div className="text-[10px] font-semibold" style={{ color: txt }}>{dayNum}</div>
              {c.inMonth && total > 0 && (
                <div className="text-[12px] font-bold tabular-nums mt-1" style={{ color: txt }}>
                  {Number.isInteger(total) ? total : total.toFixed(1)}h
                </div>
              )}
              {c.inMonth && lv > 0 && total === 0 && (
                <div className="text-[11px] font-semibold mt-1" style={{ color: "var(--warn)" }}>L</div>
              )}
              {c.inMonth && ot > 0 && (
                <div className="text-[9px] mt-0.5" style={{ color: "var(--warn)" }}>+{ot}h OT</div>
              )}
            </div>
          )
          return url ? (
            <a key={c.iso} href={url} target="_blank" rel="noreferrer" className="block">{cell}</a>
          ) : <div key={c.iso}>{cell}</div>
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-[10px]" style={{ color: "var(--text-3)" }}>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(5,150,105,0.6)" }} /> Full day (≥9h)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(244,180,0,0.5)" }} /> Partial / leave
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "var(--surface-2)" }} /> Weekend / no entry
        </span>
      </div>
    </div>
  )
}

// ─── Tab: Timesheets ─────────────────────────────────────────────────────────

function TimesheetsTab({ empId, clientId }: { empId: string; clientId: string }) {
  // Try to fetch real timesheets from Postgres for this employee's client.
  // Falls back to the synthetic mock if the API has no data (test clients).
  const [realTs,   setRealTs  ] = useState<Timesheet[] | null>(null)
  const [loading,  setLoading ] = useState(true)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/timesheets/${clientId}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        if (d.configured && Array.isArray(d.timesheets)) {
          setRealTs(d.timesheets.filter((t: Timesheet) => t.employeeId === empId))
        } else {
          setRealTs([])
        }
      })
      .catch(() => { if (!cancelled) setRealTs([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [clientId, empId])

  const ts = realTs && realTs.length > 0
    ? realTs
    : timesheets.filter(t => t.employeeId === empId)

  // Day-wise rollup for the calendar
  const calendarEntries = useMemo(() => {
    const out: { date: string; regular: number; overtime: number; leave: number; leaveType?: string | null }[] = []
    for (const t of ts) {
      for (const d of (t.dailyEntries ?? []) as DailyEntry[]) {
        out.push({
          date: d.date,
          regular: d.regularHours ?? 0,
          overtime: d.overtimeHours ?? 0,
          leave: d.leaveHours ?? 0,
          leaveType: d.leaveType ?? null,
        })
      }
    }
    return out
  }, [ts])

  // Map each date → external_url of the timesheet covering that date, so
  // each calendar cell can deep-link into Fieldglass for the real day-wise
  // breakdown.
  const externalUrlByDate = useMemo(() => {
    const m: Record<string, string | undefined> = {}
    for (const t of ts) {
      const url = (t as { externalUrl?: string }).externalUrl
      if (!url) continue
      for (const d of (t.dailyEntries ?? []) as DailyEntry[]) m[d.date] = url
    }
    return m
  }, [ts])

  const statusColor: Record<string, string> = {
    pending: "var(--text-2)", reviewing: "var(--info)", flagged: "var(--warn)",
    pending_mgr_approval: "var(--pink-700)",
    approved: "var(--accent)", processed: "#00a880", rejected: "var(--danger)",
  }

  return (
    <div className="space-y-4">
      <MonthCalendar entries={calendarEntries} externalUrlByDate={externalUrlByDate} />

      <div className="glass overflow-hidden">
      {loading ? (
        <div className="p-10 text-center text-[14px]" style={{ color: "var(--text-3)" }}>Loading timesheets…</div>
      ) : ts.length === 0 ? (
        <div className="p-10 text-center text-[14px]" style={{ color: "var(--text-3)" }}>No timesheets found for this employee.</div>
      ) : (
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Period", "Hours", "OT", "Source", "Score", "Approved by", "Status", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ts.map(t => (
              <tr key={t.id} className="ts-row">
                <td className="px-4 py-3" style={{ color: "var(--text-2)" }}>{t.period}</td>
                <td className="px-4 py-3 font-semibold" style={{ color: "var(--text-1)" }}>{t.totalHours}h</td>
                <td className="px-4 py-3">
                  {t.overtimeHours > 0
                    ? <span style={{ color: "var(--warn)" }}>+{t.overtimeHours}h</span>
                    : <span style={{ color: "var(--text-3)" }}>—</span>
                  }
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
                  {t.approvedBy === "JARVIS" ? (
                    <span className="text-[11px] flex items-center gap-1" style={{ color: "var(--accent)" }}>
                      <Star size={10} fill="currentColor" /> JARVIS
                    </span>
                  ) : (
                    <span className="text-[11px]" style={{ color: "var(--text-2)" }}>{t.approvedBy ?? "—"}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-[11px] font-medium capitalize" style={{ color: statusColor[t.status] }}>{t.status}</span>
                </td>
                <td className="px-4 py-3">
                  <Link href="/timesheets">
                    <button className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "transparent" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-hover)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <Eye size={12} style={{ color: "var(--text-2)" }} />
                    </button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      </div>
    </div>
  )
}

// ─── Tab: Leave ───────────────────────────────────────────────────────────────

function LeaveTab({ emp }: { emp: NonNullable<typeof employees[0]> }) {
  const lb = emp.leaveBalance
  const leaveTypes = [
    { label: "Annual Leave",  total: lb.annual,  used: lb.usedAnnual,  color: "var(--accent)",  icon: Calendar },
    { label: "Sick Leave",    total: lb.sick,    used: lb.usedSick,    color: "var(--info)",    icon: Activity },
    { label: "Casual Leave",  total: lb.casual,  used: lb.usedCasual,  color: "var(--warn)",   icon: Star },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {leaveTypes.map(lt => {
          const remaining = lt.total - lt.used
          const pct = Math.round((lt.used / lt.total) * 100)
          return (
            <div key={lt.label} className="glass p-5 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <lt.icon size={14} style={{ color: lt.color }} />
                <div className="text-[12px] font-semibold" style={{ color: "var(--text-1)" }}>{lt.label}</div>
              </div>
              <div className="flex items-end gap-2 mb-3">
                <div className="text-[28px] font-black" style={{ color: lt.color }}>{remaining}</div>
                <div className="text-[12px] pb-1" style={{ color: "var(--text-3)" }}>/ {lt.total} days left</div>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: "var(--surface-hover)" }}>
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: lt.color, opacity: 0.7 }} />
              </div>
              <div className="text-[11px] mt-1.5" style={{ color: "var(--text-3)" }}>{lt.used} used · {pct}% consumed</div>
            </div>
          )
        })}
      </div>

      {/* Leave history (mock) */}
      <div className="glass overflow-hidden">
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>Leave History</div>
        </div>
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Type", "From", "To", "Days", "Reason", "Status"].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { type: "Annual", from: "2026-01-13", to: "2026-01-17", days: 5, reason: "Personal travel", status: "approved" },
              { type: "Sick",   from: "2026-02-03", to: "2026-02-04", days: 2, reason: "Fever",           status: "approved" },
              { type: "Casual", from: "2026-03-10", to: "2026-03-10", days: 1, reason: "Personal work",   status: "approved" },
            ].map((l, i) => (
              <tr key={i} className="ts-row">
                <td className="px-4 py-3">
                  <span className="badge badge-portal text-[11px]">{l.type}</span>
                </td>
                <td className="px-4 py-3" style={{ color: "var(--text-2)" }}>{fmtDate(l.from)}</td>
                <td className="px-4 py-3" style={{ color: "var(--text-2)" }}>{fmtDate(l.to)}</td>
                <td className="px-4 py-3 font-semibold" style={{ color: "var(--text-1)" }}>{l.days}d</td>
                <td className="px-4 py-3" style={{ color: "var(--text-2)" }}>{l.reason}</td>
                <td className="px-4 py-3">
                  <span className="badge badge-approved text-[11px]">{l.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Tab: Risk Profile ────────────────────────────────────────────────────────

function RiskProfileTab({ emp }: { emp: NonNullable<typeof employees[0]> }) {
  const empTimesheets = timesheets.filter(t => t.employeeId === emp.id)
  const flaggedCount  = empTimesheets.filter(t => t.status === "flagged").length
  const otCount       = empTimesheets.filter(t => t.overtimeHours > 0).length
  const avgScore      = empTimesheets.length
    ? Math.round(empTimesheets.reduce((s, t) => s + t.validationScore, 0) / empTimesheets.length)
    : 100

  const riskLevel = flaggedCount > 2 || avgScore < 70 ? "High" : flaggedCount > 0 || avgScore < 85 ? "Medium" : "Low"
  const riskColor = riskLevel === "High" ? "var(--danger)" : riskLevel === "Medium" ? "var(--warn)" : "var(--accent)"

  const signals = [
    { label: "Consecutive clean submissions",  value: `${empTimesheets.filter(t => t.validationScore === 100).length} periods`,  status: "pass" },
    { label: "Unapproved overtime incidents",  value: `${otCount} occurrence${otCount !== 1 ? "s" : ""}`,                        status: otCount > 2 ? "fail" : otCount > 0 ? "warn" : "pass" },
    { label: "Flagged timesheets",             value: `${flaggedCount} flagged`,                                                   status: flaggedCount > 2 ? "fail" : flaggedCount > 0 ? "warn" : "pass" },
    { label: "Avg validation score",           value: `${avgScore}%`,                                                             status: avgScore >= 90 ? "pass" : avgScore >= 70 ? "warn" : "fail" },
    { label: "Leave balance health",           value: `${emp.leaveBalance.annual - emp.leaveBalance.usedAnnual}d annual remaining`, status: (emp.leaveBalance.annual - emp.leaveBalance.usedAnnual) > 5 ? "pass" : "warn" },
    { label: "Employment status",              value: emp.employmentStatus,                                                        status: emp.employmentStatus === "active" ? "pass" : emp.employmentStatus === "notice" ? "warn" : "fail" },
  ]

  const statusIcon = { pass: "✓", warn: "⚠", fail: "✕" }
  const statusCls  = { pass: "check-pass", warn: "check-warning", fail: "check-fail" }

  return (
    <div className="space-y-4">
      {/* Overall risk */}
      <div className="glass p-5 rounded-xl flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${riskColor}18`, border: `1px solid ${riskColor}30` }}>
          <Shield size={28} style={{ color: riskColor }} />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-widest mb-1" style={{ color: "var(--text-3)" }}>Overall Risk Level</div>
          <div className="text-[28px] font-black" style={{ color: riskColor }}>{riskLevel}</div>
          <div className="text-[12px] mt-0.5" style={{ color: "var(--text-2)" }}>
            {riskLevel === "Low" ? "Employee shows consistent, compliant behaviour." : riskLevel === "Medium" ? "Minor anomalies detected — monitoring recommended." : "Multiple risk signals — manual review required."}
          </div>
        </div>
        <div className="ml-auto text-right hidden md:block">
          <div className="text-[11px] mb-1" style={{ color: "var(--text-3)" }}>AI Composite Score</div>
          <div className="text-[28px] font-black" style={{ color: riskColor }}>{avgScore}</div>
          <div className="text-[11px]" style={{ color: "var(--text-3)" }}>/ 100</div>
        </div>
      </div>

      {/* Signals */}
      <div className="glass overflow-hidden">
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>Risk Signals</div>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {signals.map(s => (
            <div key={s.label} className="flex items-center gap-3 px-4 py-3">
              <span className={clsx("text-[14px] font-bold w-4 text-center", statusCls[s.status as keyof typeof statusCls])}>
                {statusIcon[s.status as keyof typeof statusIcon]}
              </span>
              <div className="flex-1 text-[12px]" style={{ color: "var(--text-2)" }}>{s.label}</div>
              <div className="text-[12px] font-semibold" style={{ color: "var(--text-1)" }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="glass p-4 rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={13} style={{ color: "var(--accent)" }} />
          <div className="text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>JARVIS Recommendations</div>
        </div>
        <div className="space-y-2 text-[12px]" style={{ color: "var(--text-2)" }}>
          {riskLevel === "Low" && <>
            <p>• Continue auto-approval pathway — employee meets all trust tier criteria.</p>
            <p>• Consider promoting to Trust Tier T2 if 4 more consecutive clean submissions are received.</p>
          </>}
          {riskLevel === "Medium" && <>
            <p>• Retain for human spot-check every 3rd submission cycle.</p>
            <p>• Monitor overtime patterns over next 30 days before re-evaluation.</p>
          </>}
          {riskLevel === "High" && <>
            <p>• Escalate to Account Manager for review.</p>
            <p>• Suspend auto-approval until next 3 submissions are manually reviewed.</p>
            <p>• Consider policy training session with employee&apos;s manager.</p>
          </>}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function buildPool() {
  const pool = [...employees]
  for (const client of clients) {
    const seedCount = employees.filter(e => e.clientId === client.id).length
    const need = Math.min(80, client.employeeCount) - seedCount
    if (need > 0) pool.push(...generateEmployeesForClient(client.id, need, seedCount))
  }
  return pool
}

const allEmployees = buildPool()

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>()
  const emp    = allEmployees.find(e => e.id === params.id)
  const [tab, setTab] = useState<Tab>("Overview")

  if (!emp) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center text-[14px]" style={{ color: "var(--text-3)" }}>
          Employee not found — <Link href="/employees" className="ml-2" style={{ color: "var(--accent)" }}>Back to Employees</Link>
        </div>
      </div>
    )
  }

  const statusColor: Record<string, string> = { active: "var(--accent)", notice: "var(--warn)", ended: "var(--danger)", on_hold: "var(--text-3)" }
  const tenure = Math.floor((Date.now() - new Date(emp.startDate).getTime()) / (1000 * 60 * 60 * 24 * 365))

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-6 py-3.5 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)", background: "var(--glass-bg)", backdropFilter: "blur(20px)" }}>
          <Link href="/employees" className="flex items-center gap-1.5 text-[11px] mb-2 transition-colors" style={{ color: "var(--text-3)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text-2)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
          >
            <ArrowLeft size={11} /> Employees
          </Link>
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-[14px] flex-shrink-0"
              style={{ background: `${emp.avatarColor}22`, color: emp.avatarColor, border: `1px solid ${emp.avatarColor}40` }}
            >
              {initials(emp.name)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-[16px] font-bold" style={{ color: "var(--text-1)" }}>{emp.name}</h1>
                <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "var(--surface-hover)", color: "var(--text-2)" }}>{emp.role}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium capitalize" style={{ background: `${statusColor[emp.employmentStatus]}18`, color: statusColor[emp.employmentStatus] }}>{emp.employmentStatus}</span>
              </div>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap text-[11px]" style={{ color: "var(--text-3)" }}>
                <span className="flex items-center gap-1"><Briefcase size={10} /> {emp.department}</span>
                <span className="flex items-center gap-1"><MapPin size={10} /> {emp.city}</span>
                <span className="flex items-center gap-1"><Mail size={10} /> {emp.email}</span>
                <span className="flex items-center gap-1"><Calendar size={10} /> {tenure}yr tenure</span>
              </div>
            </div>
            {/* KPI pills */}
            <div className="hidden lg:flex items-center gap-3">
              {[
                { icon: User,        value: emp.employeeCode,       label: "Employee code",  color: "var(--text-2)" },
                { icon: Clock,       value: emp.payGrade,           label: "Pay grade",      color: "var(--pink-700)" },
                { icon: TrendingUp,  value: `${emp.leaveBalance.annual - emp.leaveBalance.usedAnnual}d`, label: "Leave left", color: "var(--info)" },
              ].map(k => (
                <div key={k.label} className="glass px-3 py-2 rounded-xl text-center">
                  <div className="text-[14px] font-black" style={{ color: k.color }}>{k.value}</div>
                  <div className="text-[11px]" style={{ color: "var(--text-3)" }}>{k.label}</div>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* Tab nav */}
        <div className="flex items-center gap-1 px-6 pt-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)", background: "var(--glass-bg)" }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                "px-4 py-2 text-[12px] font-medium rounded-t-lg transition-all border-b-2",
                tab === t
                  ? "border-b-[color:var(--accent)]"
                  : "border-transparent"
              )}
              style={{
                color: tab === t ? "var(--accent)" : "var(--text-3)",
                background: tab === t ? "var(--surface)" : "transparent",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-5 pb-nav lg:pb-5">
          {tab === "Overview"      && <OverviewTab emp={emp} />}
          {tab === "Timesheets"    && <TimesheetsTab empId={emp.id} clientId={emp.clientId} />}
          {tab === "Leave"         && <LeaveTab emp={emp} />}
          {tab === "Risk Profile"  && <RiskProfileTab emp={emp} />}
        </main>
      </div>
    </div>
  )
}
