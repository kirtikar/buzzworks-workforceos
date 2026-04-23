"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import Sidebar from "@/components/Sidebar"
import BottomNav from "@/components/BottomNav"
import ComplianceInbox from "@/components/ComplianceInbox"
import NotifyPanel, {
  buildTimesheetFlag, buildTimesheetReject, buildTimesheetApprove,
  type NotifyContext,
} from "@/components/NotifyPanel"
import {
  timesheets as seedTimesheets,
  getEmployee as seedGetEmployee,
  getClient,
  clients,
  employees as seedEmployees,
} from "@/lib/mock-data"
import { generateEmployeesForClient, generateTimesheets } from "@/lib/mock-generator"
import { REGULATIONS } from "@/lib/compliance-data"
import type { TimesheetStatus, Timesheet, Employee } from "@/lib/types"
import clsx from "clsx"
import {
  Search, Check, Flag, X, CheckCircle2, XCircle,
  AlertTriangle, Clock, Mail, Globe, Edit3,
  ChevronDown, ChevronRight, Sparkles, Building2, Activity, Tag,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionCategory = "all" | "timesheets" | "compliance" | "documents" | "payroll"

interface BulkRule {
  label: string
  description: string
  match: (ts: Timesheet) => boolean
  count: number
}

// ─── Build pool: 500+ timesheets across all clients & employees ───────────────

const TIMESHEET_POOL: Timesheet[] = (() => {
  // Build a wider employee pool across all clients (mirror of /employees page logic)
  const empPool: Employee[] = [...seedEmployees]
  for (const client of clients) {
    const seedCount = seedEmployees.filter(e => e.clientId === client.id).length
    const need = Math.min(80, client.employeeCount) - seedCount
    if (need > 0) empPool.push(...generateEmployeesForClient(client.id, need, seedCount))
  }
  // Generate ~600 timesheets distributed across the employee pool over 4 weeks
  const generated = generateTimesheets(empPool, 600)
  return [...seedTimesheets, ...generated]
})()

// Pool-aware getEmployee that falls back to generated employee
function getEmployeeFromPool(employeeId: string): Employee | undefined {
  const seeded = seedGetEmployee(employeeId)
  if (seeded) return seeded
  // Generated id format: ${clientId}-emp-${index}
  const m = employeeId.match(/^([a-z]+)-emp-(\d+)$/)
  if (!m) return undefined
  const [, clientId, idxStr] = m
  return generateEmployeesForClient(clientId, 1, parseInt(idxStr))[0]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}

// ─── FilterDropdown (multi-select) ────────────────────────────────────────────

function FilterDropdown({
  label, icon: Icon, options, selected, onToggle, onClear,
}: {
  label: string
  icon?: React.ComponentType<{ size?: number }>
  options: { value: string; label: string; color?: string }[]
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
            style={{ background: "var(--accent)", color: "#fff" }}>{selected.length}</span>
        )}
        <ChevronDown size={11} className={clsx("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-[100] rounded-xl border shadow-xl min-w-[200px] py-1.5"
          style={{ background: "var(--surface)", borderColor: "var(--border-strong)", boxShadow: "0 12px 32px rgba(0,0,0,0.15)" }}>
          {selected.length > 0 && (
            <button onClick={() => { onClear(); setOpen(false) }}
              className="w-full text-left px-3 py-1.5 text-xs font-semibold mb-1"
              style={{ color: "var(--accent)" }}>Clear all</button>
          )}
          <div className="max-h-64 overflow-y-auto">
            {options.map(opt => (
              <button key={opt.value} onClick={() => onToggle(opt.value)}
                className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs"
                style={{
                  color: selected.includes(opt.value) ? "var(--text-1)" : "var(--text-2)",
                  background: selected.includes(opt.value) ? "var(--pink-50)" : "transparent",
                }}>
                <span className={clsx("w-3.5 h-3.5 rounded flex-shrink-0 border flex items-center justify-center",
                  selected.includes(opt.value) ? "border-[color:var(--accent)]" : "border-[color:var(--border-strong)]")}
                  style={{ background: selected.includes(opt.value) ? "var(--accent)" : "transparent" }}>
                  {selected.includes(opt.value) && <span className="text-white text-[8px] font-bold">✓</span>}
                </span>
                {opt.color && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: opt.color }} />}
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const [localTs, setLocalTs]     = useState(TIMESHEET_POOL)
  const [search, setSearch]       = useState("")
  const [category, setCategory]   = useState<ActionCategory>("timesheets")

  // Multi-select filters
  const [selStatuses, setSelStatuses]       = useState<TimesheetStatus[]>([])
  const [selClients,  setSelClients]        = useState<string[]>([])
  const [selSources,  setSelSources]        = useState<string[]>([])
  const [selScoreBands, setSelScoreBands]   = useState<string[]>([])  // "high" "med" "low"
  const [selOTOnly, setSelOTOnly]           = useState<boolean>(false)
  const [actionableOnly, setActionableOnly] = useState<boolean>(true)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId]   = useState<string | null>(null)
  const [sortBy, setSortBy]           = useState<"date" | "score-asc" | "score-desc" | "client" | "hours">("date")
  const [page, setPage]               = useState<number>(1)
  const [notifyCtx, setNotifyCtx]     = useState<NotifyContext | null>(null)
  const PAGE_SIZE = 50

  function openNotifyFor(ts: Timesheet, kind: "flag" | "reject" | "approve") {
    const emp = getEmployeeFromPool(ts.employeeId)
    if (!emp) return
    const common = {
      employeeName:  emp.name,
      employeeEmail: emp.email,
      period:        ts.period,
      managerEmail:  emp.managerEmail,
    }
    if (kind === "flag") {
      setNotifyCtx(buildTimesheetFlag({
        ...common,
        reason: ts.flagReason ?? "Review required — validation score below threshold",
      }))
    } else if (kind === "reject") {
      setNotifyCtx(buildTimesheetReject({
        ...common,
        reason: ts.flagReason ?? "Submission does not meet policy criteria",
      }))
    } else {
      setNotifyCtx(buildTimesheetApprove({
        ...common,
        totalHours:   ts.totalHours,
        totalPayable: ts.totalPayable,
      }))
    }
  }

  function toggle<T>(arr: T[], set: (v: T[]) => void, val: T) {
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
    setPage(1)
  }

  // Counts
  const actionableCount = localTs.filter(t => ["pending", "reviewing", "flagged"].includes(t.status)).length
  const flaggedCount    = localTs.filter(t => t.status === "flagged").length
  const otCount         = localTs.filter(t => t.overtimeHours > 0 && ["pending", "reviewing", "flagged"].includes(t.status)).length

  function scoreBand(score: number): "high" | "med" | "low" {
    if (score >= 85) return "high"
    if (score >= 60) return "med"
    return "low"
  }

  // Filtered list
  const filtered = useMemo(() => {
    return localTs.filter(ts => {
      const emp    = getEmployeeFromPool(ts.employeeId)
      const client = getClient(ts.clientId)
      if (actionableOnly && !["pending", "reviewing", "flagged"].includes(ts.status)) return false
      if (selStatuses.length && !selStatuses.includes(ts.status)) return false
      if (selClients.length && !selClients.includes(ts.clientId)) return false
      if (selSources.length && !selSources.includes(ts.source)) return false
      if (selScoreBands.length && !selScoreBands.includes(scoreBand(ts.validationScore))) return false
      if (selOTOnly && ts.overtimeHours === 0) return false
      if (search) {
        const q = search.toLowerCase()
        if (!emp?.name.toLowerCase().includes(q) && !client?.name.toLowerCase().includes(q) && !ts.period.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [localTs, search, selStatuses, selClients, selSources, selScoreBands, selOTOnly, actionableOnly])

  const sorted = useMemo(() => {
    const list = [...filtered]
    if (sortBy === "score-asc")  list.sort((a, b) => a.validationScore - b.validationScore)
    if (sortBy === "score-desc") list.sort((a, b) => b.validationScore - a.validationScore)
    if (sortBy === "client")     list.sort((a, b) => a.clientId.localeCompare(b.clientId))
    if (sortBy === "hours")      list.sort((a, b) => b.totalHours - a.totalHours)
    if (sortBy === "date")       list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    return list
  }, [filtered, sortBy])

  const paginated = useMemo(
    () => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sorted, page]
  )
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))

  const activeFilterCount =
    selStatuses.length + selClients.length + selSources.length +
    selScoreBands.length + (selOTOnly ? 1 : 0)

  const statusOptions = [
    { value: "pending",    label: "Pending" },
    { value: "reviewing",  label: "Reviewing" },
    { value: "flagged",    label: "Flagged" },
    { value: "approved",   label: "Approved" },
    { value: "processed",  label: "Processed" },
    { value: "rejected",   label: "Rejected" },
  ]
  const sourceOptions = [
    { value: "portal", label: "Portal sync" },
    { value: "email",  label: "Email" },
    { value: "manual", label: "Manual entry" },
  ]
  const scoreOptions = [
    { value: "high", label: "High score (≥85)",  color: "#059669" },
    { value: "med",  label: "Medium (60–84)",    color: "var(--warn)" },
    { value: "low",  label: "Low (<60)",         color: "var(--danger)" },
  ]
  const clientOptions = clients.map(c => ({ value: c.id, label: c.name }))

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

  // (detail variables removed — inline expand uses row-local emp/client)

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
          <div>
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-1)" }}>Inbox</h1>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--text-3)" }}>
              {actionableCount} items need your attention
            </p>
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

            {/* Filter bar — multi-select dropdowns */}
            <div className="px-6 lg:px-8 py-3 flex-shrink-0" style={{ background: "var(--surface)", boxShadow: "0 1px 0 var(--border)" }}>
              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative flex-shrink-0">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
                  <input
                    className="glass-input pl-9 py-2 text-[13px] w-52"
                    placeholder="Search employee, client…"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1) }}
                  />
                </div>

                {/* Actionable toggle */}
                <button
                  onClick={() => { setActionableOnly(!actionableOnly); setPage(1) }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all whitespace-nowrap"
                  style={{
                    background: actionableOnly ? "var(--pink-100)" : "var(--surface)",
                    color: actionableOnly ? "var(--pink-700)" : "var(--text-2)",
                    borderColor: actionableOnly ? "var(--accent)" : "var(--border)",
                  }}
                >
                  <Activity size={12} />
                  Needs action ({actionableCount})
                </button>

                <FilterDropdown label="Status" icon={Tag} options={statusOptions}
                  selected={selStatuses as string[]}
                  onToggle={v => toggle(selStatuses, setSelStatuses, v as TimesheetStatus)}
                  onClear={() => { setSelStatuses([]); setPage(1) }} />

                <FilterDropdown label="Client" icon={Building2} options={clientOptions}
                  selected={selClients}
                  onToggle={v => toggle(selClients, setSelClients, v)}
                  onClear={() => { setSelClients([]); setPage(1) }} />

                <FilterDropdown label="Source" options={sourceOptions}
                  selected={selSources}
                  onToggle={v => toggle(selSources, setSelSources, v)}
                  onClear={() => { setSelSources([]); setPage(1) }} />

                <FilterDropdown label="Score" options={scoreOptions}
                  selected={selScoreBands}
                  onToggle={v => toggle(selScoreBands, setSelScoreBands, v)}
                  onClear={() => { setSelScoreBands([]); setPage(1) }} />

                <button
                  onClick={() => { setSelOTOnly(!selOTOnly); setPage(1) }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all whitespace-nowrap"
                  style={{
                    background: selOTOnly ? "var(--warn-bg)" : "var(--surface)",
                    color: selOTOnly ? "var(--warn)" : "var(--text-2)",
                    borderColor: selOTOnly ? "var(--warn-border)" : "var(--border)",
                  }}
                >
                  <AlertTriangle size={12} />
                  Has overtime ({otCount})
                </button>

                {activeFilterCount > 0 && (
                  <button onClick={() => {
                    setSelStatuses([]); setSelClients([]); setSelSources([]);
                    setSelScoreBands([]); setSelOTOnly(false); setSearch(""); setPage(1)
                  }}
                    className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-semibold"
                    style={{ color: "var(--danger)", background: "var(--danger-bg)", border: "1px solid var(--danger-border)" }}>
                    <X size={11} /> Clear ({activeFilterCount})
                  </button>
                )}

                {/* Sort dropdown — matches Compliance Inbox */}
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-3)" }}>Sort by</span>
                  <div className="relative">
                    <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                      className="glass-input py-2 pr-7 text-xs appearance-none cursor-pointer"
                      style={{ width: 160, fontSize: 12 }}>
                      <option value="date">Most recent</option>
                      <option value="score-asc">Lowest score first</option>
                      <option value="score-desc">Highest score first</option>
                      <option value="hours">Highest hours</option>
                      <option value="client">Client name</option>
                    </select>
                    <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-3)" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Stats strip — matches Compliance Inbox */}
            <div className="flex items-center gap-6 px-6 lg:px-8 py-2.5 flex-shrink-0 text-xs"
              style={{ background: "var(--bg)", color: "var(--text-3)" }}>
              <span>
                <span style={{ color: "var(--text-1)", fontWeight: 600 }}>{sorted.length.toLocaleString()}</span> items
              </span>
              <span>
                <span style={{ color: "var(--warn)", fontWeight: 600 }}>{flaggedCount}</span> flagged
              </span>
              <span>
                <span style={{ color: "var(--text-1)", fontWeight: 600 }}>{otCount}</span> with overtime
              </span>
              <span className="ml-auto">
                Page {page} of {totalPages}
              </span>
            </div>

            {/* Bulk action bar — appears when items selected (Compliance-style) */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 px-6 lg:px-8 py-2.5 flex-shrink-0"
                style={{ background: "var(--pink-50)", boxShadow: "0 1px 0 var(--border)" }}>
                <span className="text-xs font-medium" style={{ color: "var(--pink-700)" }}>
                  {selectedIds.size} selected
                </span>
                <button onClick={approveSelected}
                  className="btn-primary flex items-center gap-1.5 text-xs"
                  style={{ padding: "6px 12px" }}>
                  <Check size={12} /> Approve selected
                </button>
                <button
                  onClick={() => {
                    const firstId = Array.from(selectedIds)[0]
                    const ts = localTs.find(t => t.id === firstId)
                    if (ts) openNotifyFor(ts, "flag")
                  }}
                  className="btn-ghost flex items-center gap-1.5 text-xs"
                  style={{ padding: "6px 12px", color: "var(--warn)", borderColor: "var(--warn-border)" }}>
                  <Flag size={12} /> Flag
                </button>
                <button
                  onClick={() => {
                    const firstId = Array.from(selectedIds)[0]
                    const ts = localTs.find(t => t.id === firstId)
                    if (ts) openNotifyFor(ts, "reject")
                  }}
                  className="btn-ghost flex items-center gap-1.5 text-xs"
                  style={{ padding: "6px 12px", color: "var(--danger)", borderColor: "var(--danger-border)" }}>
                  <XCircle size={12} /> Reject
                </button>
                <button onClick={() => setSelectedIds(new Set())}
                  className="btn-ghost flex items-center gap-1.5 text-xs ml-auto"
                  style={{ padding: "6px 12px" }}>
                  Clear
                </button>
              </div>
            )}

            {/* Bulk rules bar */}
            {actionableOnly && bulkRules.some(r => r.count > 0) && (
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

              {paginated.map(ts => {
                const emp    = getEmployeeFromPool(ts.employeeId)
                const client = getClient(ts.clientId)
                if (!emp || !client) return null
                const isActionable = ["pending", "reviewing", "flagged"].includes(ts.status)
                const isSelected = selectedIds.has(ts.id)
                const isExpanded = expandedId === ts.id
                const fails    = ts.validationChecks.filter(c => c.result === "fail").length
                const warnings = ts.validationChecks.filter(c => c.result === "warning").length

                const scoreColor = ts.validationScore >= 85 ? "#059669" : ts.validationScore >= 60 ? "var(--warn)" : "var(--danger)"

                // AI suggestion chip
                const aiRec = ts.validationScore >= 95 && fails === 0
                  ? { label: "Auto-approve", color: "#059669" }
                  : ts.status === "flagged"
                    ? { label: "Notify HR", color: "var(--warn)" }
                    : ts.overtimeHours > 0
                      ? { label: "Verify OT pre-approval", color: "var(--warn)" }
                      : { label: "Manual review", color: "var(--text-2)" }

                return (
                  <div key={ts.id}
                    className="group transition-colors"
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: isExpanded ? "var(--pink-50)"
                                : isSelected ? "var(--surface-hover)"
                                : "var(--surface)",
                    }}>

                    {/* Row */}
                    <div
                      className="flex items-center gap-3 px-6 lg:px-8 py-3 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : ts.id)}
                    >
                      {/* Checkbox */}
                      {isActionable ? (
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
                      ) : <div className="w-4 flex-shrink-0" />}

                      {/* Status indicator */}
                      <div className="flex-shrink-0">
                        {ts.status === "pending" && <Clock size={14} style={{ color: "var(--text-3)" }} />}
                        {ts.status === "reviewing" && <Sparkles size={14} style={{ color: "var(--accent)" }} />}
                        {ts.status === "flagged" && <AlertTriangle size={14} style={{ color: "var(--warn)" }} />}
                        {ts.status === "approved" && <CheckCircle2 size={14} style={{ color: "#059669" }} />}
                        {ts.status === "processed" && <CheckCircle2 size={14} style={{ color: "var(--accent)" }} />}
                        {ts.status === "rejected" && <XCircle size={14} style={{ color: "var(--danger)" }} />}
                      </div>

                      {/* Client chip */}
                      <span className="text-xs font-medium flex-shrink-0 px-2 py-0.5 rounded-md max-w-[140px] truncate"
                        style={{ background: `${client.color}12`, color: client.color }}>
                        {client.code}
                      </span>

                      {/* Employee + period + source */}
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className="text-[13px] font-medium truncate" style={{ color: "var(--text-1)" }}>
                          {emp.name}
                        </span>
                        <span className="hidden lg:inline text-[11px] flex-shrink-0" style={{ color: "var(--text-3)" }}>
                          · {ts.period} · {ts.totalHours}h
                          {ts.overtimeHours > 0 && <span style={{ color: "var(--warn)" }}> (+{ts.overtimeHours} OT)</span>}
                        </span>
                        {ts.source === "email" && <Mail size={11} style={{ color: "var(--text-3)" }} className="flex-shrink-0" />}
                        {ts.source === "portal" && <Globe size={11} style={{ color: "var(--text-3)" }} className="flex-shrink-0" />}
                        {ts.source === "manual" && <Edit3 size={11} style={{ color: "var(--text-3)" }} className="flex-shrink-0" />}
                      </div>

                      {/* AI suggestion chip */}
                      <span className="hidden md:flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded flex-shrink-0"
                        style={{ background: `${aiRec.color}12`, color: aiRec.color }}>
                        <Sparkles size={10} /> {aiRec.label}
                      </span>

                      {/* Score */}
                      <span className="text-[11px] font-semibold tabular-nums flex-shrink-0 w-14 text-right"
                        style={{ color: scoreColor }}>
                        {ts.validationScore} <span className="font-normal" style={{ color: "var(--text-3)" }}>
                          {fails > 0 ? `· ${fails}F` : warnings > 0 ? `· ${warnings}W` : ""}
                        </span>
                      </span>

                      {/* Quick approve */}
                      {isActionable && ts.status !== "flagged" && (
                        <button
                          onClick={e => { e.stopPropagation(); approveTs(ts.id) }}
                          className="flex-shrink-0 px-2.5 py-1 rounded text-[11px] font-medium transition-all"
                          style={{ background: "rgba(5,150,105,0.08)", color: "#059669" }}
                        >
                          Approve
                        </button>
                      )}

                      {/* Expand arrow */}
                      <ChevronRight size={14} className="flex-shrink-0 transition-transform"
                        style={{
                          color: "var(--text-3)",
                          transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                        }} />
                    </div>

                    {/* Inline expand */}
                    {isExpanded && (
                      <div className="px-6 lg:px-8 pb-5 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                          {/* Hours + summary */}
                          <div className="md:col-span-2 rounded-lg p-4"
                            style={{ background: "var(--surface)" }}>
                            <div className="flex items-center gap-2 flex-wrap mb-3">
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded uppercase tracking-wider"
                                style={{ background: `${client.color}12`, color: client.color }}>
                                {client.name}
                              </span>
                              <span className="text-[11px]" style={{ color: "var(--text-2)" }}>
                                {emp.role} · {emp.department}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mb-4">
                              <div className="rounded-md p-2.5" style={{ background: "var(--surface-2)" }}>
                                <div className="text-[10px]" style={{ color: "var(--text-3)" }}>Regular</div>
                                <div className="text-base font-semibold mt-0.5" style={{ color: "var(--accent)" }}>
                                  {ts.regularHours}h
                                </div>
                              </div>
                              <div className="rounded-md p-2.5" style={{ background: "var(--surface-2)" }}>
                                <div className="text-[10px]" style={{ color: "var(--text-3)" }}>Overtime</div>
                                <div className="text-base font-semibold mt-0.5" style={{ color: "var(--warn)" }}>
                                  {ts.overtimeHours}h
                                </div>
                              </div>
                              <div className="rounded-md p-2.5" style={{ background: "var(--surface-2)" }}>
                                <div className="text-[10px]" style={{ color: "var(--text-3)" }}>Leave</div>
                                <div className="text-base font-semibold mt-0.5" style={{ color: "var(--info)" }}>
                                  {ts.leaveHours}h
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between py-2 px-3 rounded"
                              style={{ background: "var(--surface-2)" }}>
                              <span className="text-xs" style={{ color: "var(--text-2)" }}>Total payable</span>
                              <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text-1)" }}>
                                ₹{ts.totalPayable.toLocaleString("en-IN")}
                              </span>
                            </div>

                            {ts.flagReason && (
                              <div className="mt-3 p-3 rounded" style={{ background: "var(--warn-bg)" }}>
                                <div className="flex items-center gap-1 text-[11px] font-medium" style={{ color: "var(--warn)" }}>
                                  <Flag size={11} /> Flagged
                                </div>
                                <div className="text-xs mt-1" style={{ color: "var(--text-2)" }}>{ts.flagReason}</div>
                              </div>
                            )}
                          </div>

                          {/* Validation summary + AI rec */}
                          <div className="space-y-3">
                            <div className="rounded-lg p-3" style={{ background: "var(--surface)" }}>
                              <div className="text-[10px] uppercase tracking-wider font-semibold mb-2"
                                style={{ color: "var(--text-3)" }}>
                                Validation
                              </div>
                              <div className="text-2xl font-semibold tabular-nums" style={{ color: scoreColor }}>
                                {ts.validationScore}
                              </div>
                              <div className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>
                                {ts.validationChecks.filter(c => c.result === "pass").length} pass
                                {fails > 0 && <span style={{ color: "var(--danger)" }}> · {fails} fail</span>}
                                {warnings > 0 && <span style={{ color: "var(--warn)" }}> · {warnings} warn</span>}
                              </div>
                            </div>
                            <div className="rounded-lg p-3"
                              style={{ background: "var(--pink-50)", border: "1px solid var(--pink-100)" }}>
                              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold"
                                style={{ color: "var(--pink-700)" }}>
                                <Sparkles size={10} /> AI recommends
                              </div>
                              <div className="text-[13px] font-semibold mt-1" style={{ color: "var(--pink-700)" }}>
                                {aiRec.label}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        {isActionable && (
                          <div className="flex items-center gap-2 mt-4">
                            <button onClick={e => { e.stopPropagation(); approveTs(ts.id) }}
                              className="btn-primary flex items-center gap-1.5 text-xs"
                              style={{ padding: "8px 14px" }}>
                              <CheckCircle2 size={13} /> Approve
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); openNotifyFor(ts, "flag") }}
                              className="btn-ghost flex items-center gap-1.5 text-xs"
                              style={{ padding: "8px 14px", color: "var(--warn)" }}>
                              <Flag size={13} /> Flag
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); openNotifyFor(ts, "reject") }}
                              className="btn-ghost flex items-center gap-1.5 text-xs"
                              style={{ padding: "8px 14px", color: "var(--danger)" }}>
                              <XCircle size={13} /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {filtered.length === 0 && (
                <div className="text-center py-20 text-sm" style={{ color: "var(--text-3)" }}>
                  No items match current filters
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1 px-6 lg:px-8 py-4">
                  <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                    className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 transition-all"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
                    ‹
                  </button>
                  {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                    const p = totalPages <= 7 ? i + 1
                      : page <= 4 ? i + 1
                      : page >= totalPages - 3 ? totalPages - 6 + i
                      : page - 3 + i
                    return (
                      <button key={p} onClick={() => setPage(p)}
                        className="w-8 h-8 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: p === page ? "var(--accent)" : "var(--surface)",
                          color: p === page ? "#fff" : "var(--text-2)",
                          border: p === page ? "none" : "1px solid var(--border)",
                        }}>
                        {p}
                      </button>
                    )
                  })}
                  <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                    className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 transition-all"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
                    ›
                  </button>
                </div>
              )}
            </div>
          </div>

          </>
          )}
        </div>
      </div>

      <NotifyPanel
        context={notifyCtx}
        onClose={() => setNotifyCtx(null)}
      />

      <BottomNav />
    </div>
  )
}
