"use client"

import { useState, useMemo } from "react"
import Sidebar from "@/components/Sidebar"
import AIAgentOrb from "@/components/AIAgentOrb"
import {
  timesheets as allTimesheets,
  getEmployee,
  getClient,
  clients,
} from "@/lib/mock-data"
import type { Timesheet, TimesheetStatus, TimesheetSource, ValidationResult } from "@/lib/types"
import {
  Search,
  X,
  Check,
  Flag,
  ThumbsDown,
  Mail,
  Globe,
  Edit3,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowUpDown,
  Download,
  Filter,
  Sparkles,
  RefreshCw,
  Bell,
} from "lucide-react"
import clsx from "clsx"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
}

const statusConfig: Record<TimesheetStatus, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "badge-pending" },
  reviewing: { label: "Reviewing", cls: "badge-reviewing" },
  flagged: { label: "Flagged", cls: "badge-flagged" },
  approved: { label: "Approved", cls: "badge-approved" },
  processed: { label: "Processed", cls: "badge-processed" },
  rejected: { label: "Rejected", cls: "badge-rejected" },
}

const sourceConfig: Record<TimesheetSource, { label: string; cls: string; icon: React.ReactNode }> = {
  portal: { label: "Portal", cls: "badge-portal", icon: <Globe size={11} className="text-blue-400" /> },
  email: { label: "Email", cls: "badge-email", icon: <Mail size={11} className="text-violet-400" /> },
  manual: { label: "Manual", cls: "badge-manual", icon: <Edit3 size={11} className="text-slate-400" /> },
}

const validationIcon: Record<ValidationResult, React.ReactNode> = {
  pass: <CheckCircle2 size={13} className="check-pass flex-shrink-0" />,
  fail: <XCircle size={13} className="check-fail flex-shrink-0" />,
  warning: <AlertTriangle size={13} className="check-warning flex-shrink-0" />,
  pending: <Clock size={13} className="check-pending flex-shrink-0" />,
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TimesheetsPage() {
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterClient, setFilterClient] = useState<string>("all")
  const [filterSource, setFilterSource] = useState<string>("all")
  const [selected, setSelected] = useState<Timesheet | null>(null)
  const [localTs, setLocalTs] = useState(allTimesheets)
  const [flagging, setFlagging] = useState<string | null>(null)
  const [flagReason, setFlagReason] = useState("")

  const filtered = useMemo(() => {
    return localTs.filter((ts) => {
      const emp = getEmployee(ts.employeeId)
      const client = getClient(ts.clientId)
      const matchSearch =
        !search ||
        emp?.name.toLowerCase().includes(search.toLowerCase()) ||
        client?.name.toLowerCase().includes(search.toLowerCase()) ||
        ts.id.toLowerCase().includes(search.toLowerCase()) ||
        ts.period.toLowerCase().includes(search.toLowerCase())
      const matchStatus = filterStatus === "all" || ts.status === filterStatus
      const matchClient = filterClient === "all" || ts.clientId === filterClient
      const matchSource = filterSource === "all" || ts.source === filterSource
      return matchSearch && matchStatus && matchClient && matchSource
    })
  }, [localTs, search, filterStatus, filterClient, filterSource])

  function approveTs(id: string) {
    setLocalTs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "approved" as TimesheetStatus, approvedBy: "Riya Shah (Ops)", approvedAt: new Date().toISOString() } : t))
    )
    if (selected?.id === id) setSelected((s) => s ? { ...s, status: "approved" } : s)
  }

  function rejectTs(id: string) {
    setLocalTs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "rejected" as TimesheetStatus } : t))
    )
    if (selected?.id === id) setSelected((s) => s ? { ...s, status: "rejected" } : s)
  }

  function flagTs(id: string, reason: string) {
    setLocalTs((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: "flagged" as TimesheetStatus, flagReason: reason, flaggedBy: "ops" as const } : t
      )
    )
    if (selected?.id === id)
      setSelected((s) => s ? { ...s, status: "flagged", flagReason: reason, flaggedBy: "ops" } : s)
    setFlagging(null)
    setFlagReason("")
  }

  const selectedEmp = selected ? getEmployee(selected.employeeId) : null
  const selectedClient = selected ? getClient(selected.clientId) : null

  const pendingCount = localTs.filter((t) => t.status === "pending").length
  const flaggedCount = localTs.filter((t) => t.status === "flagged").length

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header
          className="flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.07] flex-shrink-0"
          style={{ background: "rgba(9,7,20,0.6)", backdropFilter: "blur(20px)" }}
        >
          <div>
            <h1 className="text-base font-bold text-white">Timesheet Inbox</h1>
            <p className="text-[11px] text-white/35">
              {filtered.length} timesheets · {pendingCount} pending · {flaggedCount} flagged
            </p>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Monitored email */}
            <div
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium"
              style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "#A78BFA" }}
            >
              <Mail size={11} />
              candidatemanager@buzzworks.com
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-dot-blink" />
            </div>

            <button className="btn-ghost flex items-center gap-1.5 py-1.5 px-3 text-xs">
              <RefreshCw size={12} />
              Sync portals
            </button>
            <button className="btn-ghost flex items-center gap-1.5 py-1.5 px-3 text-xs">
              <Download size={12} />
              Export
            </button>
            <button className="relative w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/[0.06] transition-colors">
              <Bell size={16} className="text-white/50" />
            </button>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #00D4A5)" }}
            >
              RS
            </div>
          </div>
        </header>

        {/* Filters bar */}
        <div
          className="flex items-center gap-2.5 px-5 py-2.5 border-b border-white/[0.06] flex-shrink-0 flex-wrap"
          style={{ background: "rgba(255,255,255,0.015)" }}
        >
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              className="glass-input w-full pl-8 text-[12px] py-1.5"
              placeholder="Search employee, client, period…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="glass-input text-[12px] py-1.5 pr-8 appearance-none cursor-pointer"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="reviewing">Reviewing</option>
            <option value="flagged">Flagged</option>
            <option value="approved">Approved</option>
            <option value="processed">Processed</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            className="glass-input text-[12px] py-1.5 pr-8 appearance-none cursor-pointer"
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
          >
            <option value="all">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            className="glass-input text-[12px] py-1.5 pr-8 appearance-none cursor-pointer"
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
          >
            <option value="all">All Sources</option>
            <option value="portal">Portal</option>
            <option value="email">Email</option>
            <option value="manual">Manual</option>
          </select>

          {(search || filterStatus !== "all" || filterClient !== "all" || filterSource !== "all") && (
            <button
              className="btn-ghost py-1.5 px-3 text-[12px] flex items-center gap-1.5"
              onClick={() => { setSearch(""); setFilterStatus("all"); setFilterClient("all"); setFilterSource("all") }}
            >
              <X size={11} /> Clear
            </button>
          )}

          <div className="ml-auto text-[11px] text-white/30">
            {filtered.length} of {localTs.length}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Table */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 z-10" style={{ background: "rgba(9,7,20,0.92)", backdropFilter: "blur(12px)" }}>
                <tr className="border-b border-white/[0.07]">
                  {["Employee", "Client", "Period", "Hours Breakdown", "Source", "Validation", "Status", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-[10px] text-white/30 font-semibold uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-white/25 text-[13px]">
                      No timesheets match current filters.
                    </td>
                  </tr>
                )}
                {filtered.map((ts) => {
                  const emp = getEmployee(ts.employeeId)!
                  const client = getClient(ts.clientId)!
                  const isSelected = selected?.id === ts.id
                  const src = sourceConfig[ts.source]
                  const st = statusConfig[ts.status]
                  const fails = ts.validationChecks.filter((v) => v.result === "fail").length
                  const warnings = ts.validationChecks.filter((v) => v.result === "warning").length
                  const pendingChecks = ts.validationChecks.filter((v) => v.result === "pending").length

                  return (
                    <tr
                      key={ts.id}
                      className={clsx("ts-row", isSelected && "selected")}
                      onClick={() => setSelected(isSelected ? null : ts)}
                    >
                      {/* Employee */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                            style={{ background: `${client.color}20`, color: client.color }}
                          >
                            {getInitials(emp.name)}
                          </div>
                          <div>
                            <div className="font-semibold text-white/90">{emp.name}</div>
                            <div className="text-white/35 text-[10px]">{emp.role}</div>
                          </div>
                        </div>
                      </td>

                      {/* Client */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: client.color }} />
                          <span className="text-white/70">{client.code}</span>
                        </div>
                        <div className="text-[10px] text-white/30 mt-0.5">{client.policyVersion}</div>
                      </td>

                      {/* Period */}
                      <td className="px-4 py-3 text-white/55 whitespace-nowrap text-[11px]">
                        {ts.period}
                        <div className="text-[10px] text-white/25 mt-0.5">
                          {new Date(ts.submittedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        </div>
                      </td>

                      {/* Hours */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-bold text-white/90 text-[13px]">{ts.totalHours}h</div>
                            <div className="text-[10px] text-white/35">total</div>
                          </div>
                          {ts.overtimeHours > 0 && (
                            <div>
                              <div className="font-semibold text-amber-400 text-[12px]">+{ts.overtimeHours}h</div>
                              <div className="text-[10px] text-white/35">OT</div>
                            </div>
                          )}
                          {ts.leaveHours > 0 && (
                            <div>
                              <div className="font-semibold text-violet-400 text-[12px]">{ts.leaveHours}h</div>
                              <div className="text-[10px] text-white/35">leave</div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3">
                        <span className={`badge ${src.cls} flex items-center gap-1 w-fit`}>
                          {src.icon}
                          {src.label}
                        </span>
                        {ts.source === "email" && ts.emailFrom && (
                          <div className="text-[10px] text-white/30 mt-1 max-w-[120px] truncate">
                            {ts.emailFrom}
                          </div>
                        )}
                      </td>

                      {/* Validation */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ScoreRing score={ts.validationScore} />
                          <div className="text-[10px] space-y-0.5">
                            {fails > 0 && <div className="text-coral-500">{fails} fail{fails > 1 ? "s" : ""}</div>}
                            {warnings > 0 && <div className="text-amber-400">{warnings} warn</div>}
                            {pendingChecks > 0 && <div className="text-white/35">{pendingChecks} pending</div>}
                            {fails === 0 && warnings === 0 && pendingChecks === 0 && (
                              <div className="text-mint-400">All clear</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`badge ${st.cls}`}>{st.label}</span>
                        {ts.flagReason && (
                          <div className="text-[10px] text-coral-500 mt-1 max-w-[110px] truncate" title={ts.flagReason}>
                            {ts.flagReason}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(ts.status === "pending" || ts.status === "reviewing") && (
                            <button
                              onClick={() => approveTs(ts.id)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors hover:bg-mint-500/25"
                              style={{ background: "rgba(16,185,129,0.12)", color: "#34D399", border: "1px solid rgba(16,185,129,0.25)" }}
                              title="Approve"
                            >
                              <Check size={11} />
                              Approve
                            </button>
                          )}
                          {(ts.status === "pending" || ts.status === "reviewing" || ts.status === "flagged") && (
                            <button
                              onClick={() => setFlagging(flagging === ts.id ? null : ts.id)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors"
                              style={{ background: "rgba(245,158,11,0.12)", color: "#FBB64A", border: "1px solid rgba(245,158,11,0.25)" }}
                              title="Flag"
                            >
                              <Flag size={11} />
                              Flag
                            </button>
                          )}
                        </div>
                        {/* Inline flag reason input */}
                        {flagging === ts.id && (
                          <div className="mt-1.5 flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              className="glass-input text-[11px] py-1 px-2 flex-1 min-w-0"
                              placeholder="Flag reason…"
                              value={flagReason}
                              onChange={(e) => setFlagReason(e.target.value)}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && flagReason) flagTs(ts.id, flagReason)
                                if (e.key === "Escape") setFlagging(null)
                              }}
                            />
                            <button
                              className="px-2 py-1 rounded-lg text-[11px] font-semibold"
                              style={{ background: "rgba(245,158,11,0.2)", color: "#FBB64A" }}
                              onClick={() => flagReason && flagTs(ts.id, flagReason)}
                            >
                              OK
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Detail panel */}
          {selected && selectedEmp && selectedClient && (
            <div
              className="w-[380px] flex-shrink-0 border-l border-white/[0.07] overflow-y-auto animate-slide-in-right"
              style={{ background: "rgba(10,7,22,0.97)", backdropFilter: "blur(20px)" }}
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.08] sticky top-0 z-10"
                style={{ background: "rgba(10,7,22,0.97)", backdropFilter: "blur(10px)" }}>
                <div>
                  <div className="text-[13px] font-bold text-white">{selectedEmp.name}</div>
                  <div className="text-[11px] text-white/40">{selected.period}</div>
                </div>
                <button onClick={() => setSelected(null)} className="text-white/35 hover:text-white/70 transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Employee info */}
                <div className="glass-sm p-3 flex gap-3 items-center">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-bold flex-shrink-0"
                    style={{ background: `${selectedClient.color}22`, color: selectedClient.color }}
                  >
                    {getInitials(selectedEmp.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-white">{selectedEmp.name}</div>
                    <div className="text-[11px] text-white/50">{selectedEmp.role} · {selectedEmp.department}</div>
                    <div className="text-[10px] text-white/30 mt-0.5">{selectedEmp.email}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[11px] font-semibold" style={{ color: selectedClient.color }}>
                      {selectedClient.code}
                    </div>
                    <div className="text-[10px] text-white/30">{selectedClient.policyVersion}</div>
                  </div>
                </div>

                {/* Source info */}
                {selected.source === "email" && (
                  <div
                    className="glass-sm p-3 space-y-1"
                    style={{ border: "1px solid rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.06)" }}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-violet-300 font-semibold">
                      <Mail size={12} /> Email Submission
                    </div>
                    <div className="text-[11px] text-white/50">
                      <span className="text-white/30">From:</span> {selected.emailFrom}
                    </div>
                    {selected.emailSubject && (
                      <div className="text-[11px] text-white/50">
                        <span className="text-white/30">Subject:</span> {selected.emailSubject}
                      </div>
                    )}
                    <div className="text-[11px] text-white/50">
                      <span className="text-white/30">Received at:</span> candidatemanager@buzzworks.com
                    </div>
                  </div>
                )}

                {/* Hours summary */}
                <div>
                  <div className="text-[11px] font-semibold text-white/50 mb-2 uppercase tracking-wider">
                    Hours Breakdown
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Regular", value: selected.regularHours, color: "#00D4A5" },
                      { label: "Overtime", value: selected.overtimeHours, color: "#F59E0B" },
                      { label: "Leave", value: selected.leaveHours, color: "#8B5CF6" },
                    ].map((item) => (
                      <div key={item.label} className="glass-sm p-2.5 text-center">
                        <div className="text-[16px] font-black" style={{ color: item.color }}>
                          {item.value}h
                        </div>
                        <div className="text-[10px] text-white/40 mt-0.5">{item.label}</div>
                      </div>
                    ))}
                  </div>
                  <div
                    className="mt-2 glass-sm p-2.5 flex items-center justify-between"
                    style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    <span className="text-[12px] text-white/60">Total payable</span>
                    <span className="text-[14px] font-black text-white">
                      ₹{selected.totalPayable.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Daily entries */}
                {selected.dailyEntries.length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold text-white/50 mb-2 uppercase tracking-wider">
                      Daily Entries
                    </div>
                    <div className="space-y-1">
                      {selected.dailyEntries.map((day, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px]"
                          style={{ background: "rgba(255,255,255,0.03)" }}
                        >
                          <span className="w-7 text-white/35 font-medium">{day.dayOfWeek}</span>
                          <span className="text-white/25 text-[10px]">
                            {new Date(day.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          </span>
                          <div className="flex-1 flex gap-2 justify-end">
                            {day.leaveType ? (
                              <span className="badge badge-reviewing">{day.leaveType}</span>
                            ) : (
                              <>
                                <span className="text-white/70 font-semibold">{day.regularHours}h</span>
                                {day.overtimeHours > 0 && (
                                  <span className="text-amber-400 font-semibold">+{day.overtimeHours}h OT</span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Validation checks */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                      Policy Validation
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-white/30">
                      <Sparkles size={10} className="text-violet-400" />
                      AI · {selected.aiConfidence}% confidence
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {selected.validationChecks.map((check) => (
                      <div
                        key={check.id}
                        className="p-2.5 rounded-xl text-[11px] flex gap-2"
                        style={{
                          background:
                            check.result === "pass"
                              ? "rgba(16,185,129,0.06)"
                              : check.result === "fail"
                              ? "rgba(255,107,107,0.08)"
                              : check.result === "warning"
                              ? "rgba(245,158,11,0.07)"
                              : "rgba(255,255,255,0.04)",
                          border:
                            check.result === "pass"
                              ? "1px solid rgba(16,185,129,0.15)"
                              : check.result === "fail"
                              ? "1px solid rgba(255,107,107,0.2)"
                              : check.result === "warning"
                              ? "1px solid rgba(245,158,11,0.18)"
                              : "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        {validationIcon[check.result]}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white/80 leading-tight">{check.rule}</div>
                          <div className="text-white/45 mt-0.5 leading-snug">{check.detail}</div>
                          {!check.autoChecked && (
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-white/25">
                              <Clock size={9} /> Manual check required
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Flag reason */}
                {selected.flagReason && (
                  <div
                    className="p-3 rounded-xl text-[11px]"
                    style={{ background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)" }}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-coral-500 mb-1">
                      <Flag size={11} />
                      Flagged{selected.flaggedBy === "ai" ? " by AI" : selected.flaggedBy === "ops" ? " by Ops" : " by System"}
                    </div>
                    <div className="text-white/60">{selected.flagReason}</div>
                  </div>
                )}

                {/* Leave balance */}
                <div>
                  <div className="text-[11px] font-semibold text-white/50 mb-2 uppercase tracking-wider">
                    Leave Balance · {selectedClient.code}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        label: "Annual",
                        total: selectedEmp.leaveBalance.annual,
                        used: selectedEmp.leaveBalance.usedAnnual,
                        color: "#00D4A5",
                      },
                      {
                        label: "Sick",
                        total: selectedEmp.leaveBalance.sick,
                        used: selectedEmp.leaveBalance.usedSick,
                        color: "#FF6B6B",
                      },
                      {
                        label: "Casual",
                        total: selectedEmp.leaveBalance.casual,
                        used: selectedEmp.leaveBalance.usedCasual,
                        color: "#8B5CF6",
                      },
                    ].map((lb) => (
                      <div key={lb.label} className="glass-sm p-2 text-center">
                        <div className="text-[11px] font-bold text-white/80">
                          {lb.total - lb.used}
                          <span className="text-[9px] text-white/30 font-normal">/{lb.total}</span>
                        </div>
                        <div className="text-[9px] text-white/35 mt-0.5">{lb.label}</div>
                        <div
                          className="w-full rounded-full mt-1.5 overflow-hidden"
                          style={{ height: 3, background: "rgba(255,255,255,0.08)" }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(lb.used / lb.total) * 100}%`,
                              background: lb.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                {(selected.status === "pending" || selected.status === "reviewing" || selected.status === "flagged") && (
                  <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                    <div className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-3">
                      Actions
                    </div>
                    <button
                      onClick={() => approveTs(selected.id)}
                      className="w-full btn-teal flex items-center justify-center gap-2 py-2.5"
                    >
                      <CheckCircle2 size={15} />
                      Approve Timesheet
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setFlagging(flagging === selected.id ? null : selected.id)}
                        className="btn-ghost flex items-center justify-center gap-1.5 py-2"
                        style={{ color: "#FBB64A", borderColor: "rgba(245,158,11,0.3)" }}
                      >
                        <Flag size={13} />
                        Flag
                      </button>
                      <button
                        onClick={() => rejectTs(selected.id)}
                        className="btn-coral flex items-center justify-center gap-1.5 py-2"
                      >
                        <ThumbsDown size={13} />
                        Reject
                      </button>
                    </div>
                    {flagging === selected.id && (
                      <div className="space-y-2">
                        <textarea
                          className="glass-input w-full text-[12px] resize-none"
                          rows={2}
                          placeholder="Describe the issue to flag…"
                          value={flagReason}
                          onChange={(e) => setFlagReason(e.target.value)}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            className="flex-1 btn-ghost text-[12px] py-2"
                            onClick={() => setFlagging(null)}
                          >
                            Cancel
                          </button>
                          <button
                            className="flex-1 text-[12px] py-2 rounded-xl font-semibold transition-colors"
                            style={{ background: "rgba(245,158,11,0.2)", color: "#FBB64A", border: "1px solid rgba(245,158,11,0.3)" }}
                            onClick={() => flagReason && flagTs(selected.id, flagReason)}
                          >
                            Confirm Flag
                          </button>
                        </div>
                      </div>
                    )}
                    <div
                      className="text-[10px] text-white/25 text-center py-1 px-2 rounded-lg"
                      style={{ background: "rgba(139,92,246,0.06)", border: "1px dashed rgba(139,92,246,0.15)" }}
                    >
                      <Sparkles size={9} className="inline text-violet-400 mr-1" />
                      AI auto-approve for score ≥ 90 — coming in v2
                    </div>
                  </div>
                )}

                {selected.status === "approved" && (
                  <div
                    className="p-3 rounded-xl text-[12px] text-center"
                    style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)" }}
                  >
                    <CheckCircle2 size={18} className="text-mint-400 mx-auto mb-1" />
                    <div className="font-semibold text-mint-400">Approved</div>
                    {selected.approvedBy && (
                      <div className="text-white/40 text-[11px] mt-0.5">by {selected.approvedBy}</div>
                    )}
                    <button className="mt-2 btn-teal text-[11px] py-1.5 w-full">
                      Send to Payroll
                    </button>
                  </div>
                )}

                {selected.status === "processed" && (
                  <div
                    className="p-3 rounded-xl text-[12px] text-center"
                    style={{ background: "rgba(0,212,165,0.08)", border: "1px solid rgba(0,212,165,0.2)" }}
                  >
                    <CheckCircle2 size={18} className="text-teal-400 mx-auto mb-1" />
                    <div className="font-semibold text-teal-400">Processed & Paid</div>
                    <div className="text-white/40 text-[11px] mt-0.5">
                      ₹{selected.totalPayable.toLocaleString("en-IN")}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <AIAgentOrb />
    </div>
  )
}
