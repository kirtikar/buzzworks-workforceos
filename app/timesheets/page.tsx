"use client"

import { useState, useMemo } from "react"
import Sidebar from "@/components/Sidebar"
import BottomNav from "@/components/BottomNav"
import ComplianceInbox from "@/components/ComplianceInbox"
import {
  timesheets as allTimesheets,
  getEmployee,
  getClient,
  clients,
} from "@/lib/mock-data"
import { REGULATIONS } from "@/lib/compliance-data"
import type { TimesheetStatus } from "@/lib/types"
import {
  Search, Check, Flag, X, CheckCircle2, XCircle,
  AlertTriangle, Clock, Mail, Globe, Edit3,
  ChevronDown, Sparkles,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionCategory = "all" | "timesheets" | "compliance" | "documents" | "payroll"

interface BulkRule {
  label: string
  description: string
  match: (ts: typeof allTimesheets[0]) => boolean
  count: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const [localTs, setLocalTs]     = useState(allTimesheets)
  const [search, setSearch]       = useState("")
  const [category, setCategory]   = useState<ActionCategory>("timesheets")
  const [statusFilter, setStatusFilter] = useState<string>("actionable")
  const [clientFilter, setClientFilter] = useState<string>("all")
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set())
  const [detailId, setDetailId]         = useState<string | null>(null)

  // Counts
  const actionableCount = localTs.filter(t => ["pending", "reviewing", "flagged"].includes(t.status)).length
  const pendingCount    = localTs.filter(t => t.status === "pending").length
  const flaggedCount    = localTs.filter(t => t.status === "flagged").length

  // Filtered list
  const filtered = useMemo(() => {
    return localTs.filter(ts => {
      const emp    = getEmployee(ts.employeeId)
      const client = getClient(ts.clientId)
      // Status
      if (statusFilter === "actionable" && !["pending", "reviewing", "flagged"].includes(ts.status)) return false
      if (statusFilter !== "actionable" && statusFilter !== "all" && ts.status !== statusFilter) return false
      // Client
      if (clientFilter !== "all" && ts.clientId !== clientFilter) return false
      // Search
      if (search) {
        const q = search.toLowerCase()
        if (!emp?.name.toLowerCase().includes(q) && !client?.name.toLowerCase().includes(q) && !ts.period.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [localTs, search, statusFilter, clientFilter])

  // Bulk rules
  const bulkRules: BulkRule[] = useMemo(() => [
    {
      label: "Score ≥ 95, all checks pass",
      description: "Auto-approve clean submissions",
      match: ts => ts.validationScore >= 95 && ts.validationChecks.every(c => c.result === "pass") && ["pending", "reviewing"].includes(ts.status),
      count: localTs.filter(ts => ts.validationScore >= 95 && ts.validationChecks.every(c => c.result === "pass") && ["pending", "reviewing"].includes(ts.status)).length,
    },
    {
      label: "Portal source, no flags",
      description: "Approve portal-synced, zero warnings",
      match: ts => ts.source === "portal" && ts.validationChecks.every(c => c.result !== "fail") && ["pending", "reviewing"].includes(ts.status),
      count: localTs.filter(ts => ts.source === "portal" && ts.validationChecks.every(c => c.result !== "fail") && ["pending", "reviewing"].includes(ts.status)).length,
    },
    {
      label: "Under 40h, single client",
      description: "Standard week, no overtime",
      match: ts => ts.totalHours <= 40 && ts.overtimeHours === 0 && ["pending", "reviewing"].includes(ts.status),
      count: localTs.filter(ts => ts.totalHours <= 40 && ts.overtimeHours === 0 && ["pending", "reviewing"].includes(ts.status)).length,
    },
  ], [localTs])

  // Actions
  function approveTs(id: string) {
    setLocalTs(prev => prev.map(t => t.id === id ? { ...t, status: "approved" as TimesheetStatus, approvedBy: "Riya Shah", approvedAt: new Date().toISOString() } : t))
  }

  function bulkApprove(rule: BulkRule) {
    setLocalTs(prev => prev.map(t => rule.match(t) ? { ...t, status: "approved" as TimesheetStatus, approvedBy: "Riya Shah (Bulk)", approvedAt: new Date().toISOString() } : t))
  }

  function approveSelected() {
    setLocalTs(prev => prev.map(t => selectedIds.has(t.id) && ["pending", "reviewing"].includes(t.status) ? { ...t, status: "approved" as TimesheetStatus, approvedBy: "Riya Shah", approvedAt: new Date().toISOString() } : t))
    setSelectedIds(new Set())
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    const actionable = filtered.filter(t => ["pending", "reviewing", "flagged"].includes(t.status))
    if (selectedIds.size === actionable.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(actionable.map(t => t.id)))
    }
  }

  const detail = detailId ? localTs.find(t => t.id === detailId) : null
  const detailEmp = detail ? getEmployee(detail.employeeId) : null
  const detailClient = detail ? getClient(detail.clientId) : null

  // Compliance count = regulations needing action
  const complianceActionCount = REGULATIONS.filter(r => r.actionRequired).length

  // Category tabs
  const categories: { value: ActionCategory; label: string; count: number }[] = [
    { value: "timesheets",  label: "Timesheets",  count: actionableCount },
    { value: "compliance",  label: "Compliance",  count: complianceActionCount },
    { value: "documents",   label: "Documents",   count: 5 },
    { value: "payroll",     label: "Payroll",     count: 2 },
  ]

  return (
    <div className="flex h-screen overflow-hidden app-bg">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="px-6 lg:px-8 py-5 flex-shrink-0" style={{ background: "var(--surface)", boxShadow: "0 1px 0 var(--border)" }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold" style={{ color: "var(--text-1)" }}>Inbox</h1>
              <p className="text-[13px] mt-0.5" style={{ color: "var(--text-3)" }}>
                {actionableCount} items need your attention
              </p>
            </div>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-medium" style={{ color: "var(--text-2)" }}>
                  {selectedIds.size} selected
                </span>
                <button onClick={approveSelected} className="btn-primary flex items-center gap-2 py-2 px-4 text-[13px]">
                  <Check size={14} /> Approve selected
                </button>
                <button onClick={() => setSelectedIds(new Set())} className="btn-ghost py-2 px-3 text-[13px]">
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Category tabs */}
          <div className="flex items-center gap-1 mt-4">
            {categories.map(c => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
                style={{
                  background: category === c.value ? "var(--accent-dim)" : "transparent",
                  color: category === c.value ? "var(--accent)" : "var(--text-3)",
                }}
              >
                {c.label}
                <span
                  className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                  style={{
                    background: category === c.value ? "var(--accent)" : "var(--surface-2)",
                    color: category === c.value ? "#fff" : "var(--text-3)",
                  }}
                >
                  {c.count}
                </span>
              </button>
            ))}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">

          {category === "compliance" ? (
            <ComplianceInbox />
          ) : category !== "timesheets" ? (
            <div className="flex-1 flex items-center justify-center text-sm" style={{ color: "var(--text-3)" }}>
              {categories.find(c => c.value === category)?.label ?? "Section"} — coming soon
            </div>
          ) : (
          <>

          {/* Main list */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Filter + bulk bar */}
            <div className="flex items-center gap-3 px-6 lg:px-8 py-3 flex-shrink-0" style={{ background: "var(--surface)", boxShadow: "0 1px 0 var(--border)" }}>

              {/* Search */}
              <div className="relative flex-shrink-0">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
                <input
                  className="glass-input pl-9 py-2 text-[13px] w-52"
                  placeholder="Search…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              {/* Status filter */}
              <div className="relative flex-shrink-0">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="glass-input py-2 text-[13px] pr-8 appearance-none cursor-pointer"
                  style={{ width: 150 }}
                >
                  <option value="actionable">Needs action ({actionableCount})</option>
                  <option value="all">All timesheets</option>
                  <option value="pending">Pending ({pendingCount})</option>
                  <option value="flagged">Flagged ({flaggedCount})</option>
                  <option value="approved">Approved</option>
                  <option value="processed">Processed</option>
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-3)" }} />
              </div>

              {/* Client filter */}
              <div className="relative flex-shrink-0">
                <select
                  value={clientFilter}
                  onChange={e => setClientFilter(e.target.value)}
                  className="glass-input py-2 text-[13px] pr-8 appearance-none cursor-pointer"
                  style={{ width: 150 }}
                >
                  <option value="all">All clients</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-3)" }} />
              </div>

              <span className="text-[13px] ml-auto" style={{ color: "var(--text-3)" }}>
                {filtered.length} items
              </span>
            </div>

            {/* Bulk rules bar */}
            {statusFilter === "actionable" && bulkRules.some(r => r.count > 0) && (
              <div className="flex items-center gap-3 px-6 lg:px-8 py-2.5 flex-shrink-0 overflow-x-auto scrollbar-none"
                style={{ background: "var(--bg)" }}>
                <Sparkles size={14} style={{ color: "var(--accent)" }} className="flex-shrink-0" />
                <span className="text-xs font-medium flex-shrink-0" style={{ color: "var(--text-2)" }}>Quick rules:</span>
                {bulkRules.filter(r => r.count > 0).map(rule => (
                  <button
                    key={rule.label}
                    onClick={() => bulkApprove(rule)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0"
                    style={{ background: "var(--surface)", color: "var(--accent)", boxShadow: "var(--shadow-sm)" }}
                  >
                    <Check size={12} />
                    {rule.label}
                    <span className="text-[11px] font-semibold px-1.5 rounded-full"
                      style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
                      {rule.count}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto pb-nav lg:pb-0">

              {/* Select all */}
              {filtered.some(t => ["pending", "reviewing", "flagged"].includes(t.status)) && (
                <div className="flex items-center gap-3 px-6 lg:px-8 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                  <button
                    onClick={selectAll}
                    className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{
                      borderColor: selectedIds.size > 0 ? "var(--accent)" : "var(--border-strong)",
                      background: selectedIds.size > 0 ? "var(--accent)" : "transparent",
                    }}
                  >
                    {selectedIds.size > 0 && <Check size={10} className="text-white" />}
                  </button>
                  <span className="text-xs" style={{ color: "var(--text-3)" }}>
                    Select all actionable
                  </span>
                </div>
              )}

              {filtered.map(ts => {
                const emp    = getEmployee(ts.employeeId)!
                const client = getClient(ts.clientId)!
                const isActionable = ["pending", "reviewing", "flagged"].includes(ts.status)
                const isSelected = selectedIds.has(ts.id)
                const isDetail = detailId === ts.id
                const fails    = ts.validationChecks.filter(c => c.result === "fail").length
                const warnings = ts.validationChecks.filter(c => c.result === "warning").length

                const scoreColor = ts.validationScore >= 85 ? "#059669" : ts.validationScore >= 60 ? "var(--warn)" : "var(--danger)"

                return (
                  <div
                    key={ts.id}
                    className="flex items-center gap-4 px-6 lg:px-8 py-3.5 transition-colors cursor-pointer"
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: isDetail ? "var(--accent-dim)" : isSelected ? "var(--surface-hover)" : "var(--surface)",
                    }}
                    onClick={() => setDetailId(isDetail ? null : ts.id)}
                  >
                    {/* Checkbox */}
                    {isActionable && (
                      <button
                        onClick={e => { e.stopPropagation(); toggleSelect(ts.id) }}
                        className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors"
                        style={{
                          borderColor: isSelected ? "var(--accent)" : "var(--border-strong)",
                          background: isSelected ? "var(--accent)" : "transparent",
                        }}
                      >
                        {isSelected && <Check size={10} className="text-white" />}
                      </button>
                    )}
                    {!isActionable && <div className="w-4 flex-shrink-0" />}

                    {/* Status indicator */}
                    <div className="flex-shrink-0">
                      {ts.status === "pending" && <Clock size={16} style={{ color: "var(--text-3)" }} />}
                      {ts.status === "reviewing" && <Sparkles size={16} style={{ color: "var(--accent)" }} />}
                      {ts.status === "flagged" && <AlertTriangle size={16} style={{ color: "var(--warn)" }} />}
                      {ts.status === "approved" && <CheckCircle2 size={16} style={{ color: "#059669" }} />}
                      {ts.status === "processed" && <CheckCircle2 size={16} style={{ color: "var(--accent)" }} />}
                      {ts.status === "rejected" && <XCircle size={16} style={{ color: "var(--danger)" }} />}
                    </div>

                    {/* Employee + context */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium truncate" style={{ color: "var(--text-1)" }}>
                          {emp.name}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                          style={{ background: `${client.color}12`, color: client.color }}>
                          {client.code}
                        </span>
                        {ts.source === "email" && <Mail size={12} style={{ color: "var(--text-3)" }} />}
                        {ts.source === "portal" && <Globe size={12} style={{ color: "var(--text-3)" }} />}
                        {ts.source === "manual" && <Edit3 size={12} style={{ color: "var(--text-3)" }} />}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                        {ts.period} · {ts.totalHours}h
                        {ts.overtimeHours > 0 && <span style={{ color: "var(--warn)" }}> (+{ts.overtimeHours}h OT)</span>}
                        {ts.flagReason && <span style={{ color: "var(--warn)" }}> · {ts.flagReason}</span>}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="flex-shrink-0 text-right">
                      <div className="text-sm font-semibold tabular-nums" style={{ color: scoreColor }}>
                        {ts.validationScore}
                      </div>
                      <div className="text-[11px]" style={{ color: "var(--text-3)" }}>
                        {fails > 0 ? `${fails} fail` : warnings > 0 ? `${warnings} warn` : "clean"}
                      </div>
                    </div>

                    {/* Quick action */}
                    {isActionable && ts.status !== "flagged" && (
                      <button
                        onClick={e => { e.stopPropagation(); approveTs(ts.id) }}
                        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{ background: "rgba(5,150,105,0.08)", color: "#059669" }}
                      >
                        Approve
                      </button>
                    )}
                  </div>
                )
              })}

              {filtered.length === 0 && (
                <div className="text-center py-20 text-sm" style={{ color: "var(--text-3)" }}>
                  No items match current filters
                </div>
              )}
            </div>
          </div>

          {/* Detail panel */}
          {detail && detailEmp && detailClient && (
            <div
              className="hidden lg:flex flex-col w-[400px] flex-shrink-0 overflow-y-auto"
              style={{ background: "var(--surface)", boxShadow: "-1px 0 0 var(--border)" }}
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
                style={{ boxShadow: "0 1px 0 var(--border)" }}>
                <div>
                  <div className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>{detailEmp.name}</div>
                  <div className="text-[13px]" style={{ color: "var(--text-3)" }}>{detail.period}</div>
                </div>
                <button onClick={() => setDetailId(null)} style={{ color: "var(--text-3)" }}>
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Employee card */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-semibold flex-shrink-0"
                    style={{ background: `${detailClient.color}12`, color: detailClient.color }}
                  >
                    {initials(detailEmp.name)}
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-medium" style={{ color: "var(--text-1)" }}>{detailEmp.role}</div>
                    <div className="text-xs" style={{ color: "var(--text-3)" }}>{detailEmp.department} · {detailClient.name}</div>
                  </div>
                </div>

                {/* Hours */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Regular", value: `${detail.regularHours}h`, color: "var(--accent)" },
                    { label: "Overtime", value: `${detail.overtimeHours}h`, color: "var(--warn)" },
                    { label: "Leave",   value: `${detail.leaveHours}h`,    color: "var(--info)"  },
                  ].map(h => (
                    <div key={h.label} className="glass-sm p-3 text-center">
                      <div className="text-lg font-semibold" style={{ color: h.color }}>{h.value}</div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>{h.label}</div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between py-3 px-4 rounded-lg" style={{ background: "var(--surface-2)" }}>
                  <span className="text-[13px]" style={{ color: "var(--text-2)" }}>Total payable</span>
                  <span className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>
                    ₹{detail.totalPayable.toLocaleString("en-IN")}
                  </span>
                </div>

                {/* Validation checks */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[13px] font-medium" style={{ color: "var(--text-1)" }}>Validation</span>
                    <span className="text-xs" style={{ color: "var(--text-3)" }}>
                      {detail.aiConfidence}% AI confidence
                    </span>
                  </div>
                  <div className="space-y-2">
                    {detail.validationChecks.map(check => (
                      <div key={check.id} className="flex items-start gap-2.5 py-2">
                        {check.result === "pass" && <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" style={{ color: "#059669" }} />}
                        {check.result === "fail" && <XCircle size={15} className="flex-shrink-0 mt-0.5" style={{ color: "var(--danger)" }} />}
                        {check.result === "warning" && <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" style={{ color: "var(--warn)" }} />}
                        {check.result === "pending" && <Clock size={15} className="flex-shrink-0 mt-0.5" style={{ color: "var(--text-3)" }} />}
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium" style={{ color: "var(--text-1)" }}>{check.rule}</div>
                          <div className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>{check.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Flag info */}
                {detail.flagReason && (
                  <div className="p-4 rounded-lg" style={{ background: "var(--warn-bg)" }}>
                    <div className="flex items-center gap-1.5 text-[13px] font-medium mb-1" style={{ color: "var(--warn)" }}>
                      <Flag size={13} /> Flagged
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-2)" }}>{detail.flagReason}</div>
                  </div>
                )}

                {/* Actions */}
                {["pending", "reviewing", "flagged"].includes(detail.status) && (
                  <div className="space-y-2 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                    <button
                      onClick={() => approveTs(detail.id)}
                      className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 text-[13px]"
                    >
                      <CheckCircle2 size={15} /> Approve
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button className="btn-ghost flex items-center justify-center gap-1.5 py-2 text-[13px]"
                        style={{ color: "var(--warn)" }}>
                        <Flag size={13} /> Flag
                      </button>
                      <button className="btn-ghost flex items-center justify-center gap-1.5 py-2 text-[13px]"
                        style={{ color: "var(--danger)" }}>
                        <XCircle size={13} /> Reject
                      </button>
                    </div>
                  </div>
                )}

                {detail.status === "approved" && (
                  <div className="text-center py-4 rounded-lg" style={{ background: "rgba(5,150,105,0.06)" }}>
                    <CheckCircle2 size={20} className="mx-auto mb-1" style={{ color: "#059669" }} />
                    <div className="text-[13px] font-medium" style={{ color: "#059669" }}>Approved</div>
                    {detail.approvedBy && (
                      <div className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>by {detail.approvedBy}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          </>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
