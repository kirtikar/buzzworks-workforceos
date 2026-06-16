"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import Sidebar from "@/components/Sidebar"
import BottomNav from "@/components/BottomNav"
import ComplianceInbox from "@/components/ComplianceInbox"
import OnboardingInbox from "@/components/OnboardingInbox"
import PayrollInbox from "@/components/PayrollInbox"
import { ONBOARDING_ISSUES, PAYROLL_ISSUES } from "@/lib/onboarding-data"
import NotifyPanel, {
  buildTimesheetFlag, buildTimesheetReject, buildTimesheetApprove, buildTimesheetNotifyTeam,
  buildTimesheetMgrApproval, type NotifyContext,
} from "@/components/NotifyPanel"
import {
  getClient,
  clients,
} from "@/lib/mock-data"
import { REGULATIONS } from "@/lib/compliance-data"
import type { TimesheetStatus, Timesheet, Employee, ValidationCheck, DailyEntry } from "@/lib/types"
import clsx from "clsx"
import {
  Search, Check, Flag, X, CheckCircle2, XCircle,
  AlertTriangle, Clock, Mail, Globe, Edit3,
  ChevronDown, ChevronRight, Sparkles, Building2, Activity, Tag,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionCategory = "all" | "timesheets" | "compliance" | "onboarding" | "payroll"

interface BulkRule {
  label: string
  description: string
  match: (ts: InboxRow) => boolean
  count: number
}

// ─── Server-paginated inbox data ──────────────────────────────────────────────
//
// /api/inbox returns slim rows (one timesheet + its embedded slim
// employee + validation aggregates) plus client-scoped totals for the
// sidebar. Heavy fields — validationChecks list, dailyEntries — are
// pulled on demand by /api/timesheet/[id] when the drawer opens.
//
// This replaces the old pattern of fetching every client's full
// timesheet payload and doing pagination + filtering in the browser.

interface InboxEmployee {
  id: string
  name: string
  email: string
  employeeCode: string
  role: string
  department: string
  managerEmail: string | null
  managerName:  string | null
  avatarColor:  string
  earnedLeaves:   number
  consumedLeaves: number
}

interface InboxRow {
  id: string
  employeeId: string
  clientId: string
  period: string
  periodStart: string
  periodEnd: string
  submittedAt: string
  source: string
  sourceDetail?: string | null
  portalId?: string | null
  status: TimesheetStatus
  totalHours: number
  regularHours: number
  overtimeHours: number
  leaveHours: number
  totalPayable: number
  validationScore: number
  flagReason?: string
  flaggedBy?: string
  approvedBy?: string
  approvedAt?: string
  aiConfidence?: number
  externalUrl?: string
  checkFail: number
  checkWarn: number
  checkTotal: number
  employee: InboxEmployee
}

interface InboxApiResponse {
  configured: boolean
  rows: InboxRow[]
  total: number
  page: number
  size: number
  totals: {
    actionable: number
    flagged: number
    ot: number
    byStatus: Record<string, number>
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}

// Short label for the tick-mark strip in the validation drawer. Each
// per-client validator (Accenture, Capgemini, …) emits checks with stable
// rule_ids — we render compact, glanceable labels here. Unknown ids fall
// back to the rule_id with hyphens stripped.
function tickLabelFor(ruleId: string): string {
  switch (ruleId) {
    // Capgemini
    case "weekly-target":         return "45h"
    case "holiday-fill":          return "Holiday"
    case "leave-inference":       return "Leave"
    case "leave-balance":         return "Balance"
    case "ot-spillover":          return "OT mgr"
    case "status-recognised":     return "Status"
    // Accenture (BeeLine)
    case "weekly-cap":            return "≤45h"
    case "ot-preapproval":        return "OT pre"
    case "leave-balance-acc":     return "Balance"
    case "daily-cap":             return "Day"
    case "weekend-policy":        return "Weekend"
    case "status-mapping":        return "Status"
    default:
      return ruleId.replace(/-/g, " ")
  }
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
          <span className="w-4 h-4 rounded-full text-[11px] font-bold flex items-center justify-center"
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
                  {selected.includes(opt.value) && <span className="text-white text-[11px] font-bold">✓</span>}
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
  const [category, setCategory]   = useState<ActionCategory>("timesheets")

  // Filters and sort live as page state; on change we refetch from the
  // server. Search is debounced. Pagination is server-side.
  const [search, setSearch]       = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selStatuses, setSelStatuses]       = useState<TimesheetStatus[]>([])
  const [selClients,  setSelClients]        = useState<string[]>([])
  const [selSources,  setSelSources]        = useState<string[]>([])
  const [selScoreBands, setSelScoreBands]   = useState<string[]>([])
  const [selOTOnly, setSelOTOnly]           = useState<boolean>(false)
  const [actionableOnly, setActionableOnly] = useState<boolean>(false)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId]   = useState<string | null>(null)
  const [sortBy, setSortBy]           = useState<"date" | "score-asc" | "score-desc" | "client" | "hours">("date")
  const [page, setPage]               = useState<number>(1)
  const [notifyCtx, setNotifyCtx]     = useState<NotifyContext | null>(null)
  const PAGE_SIZE = 50

  // Debounce search input so we don't fire a fetch on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 250)
    return () => clearTimeout(t)
  }, [search])

  // Server-paginated rows + client-scoped totals.
  const [rows, setRows]       = useState<InboxRow[]>([])
  const [total, setTotal]     = useState<number>(0)
  const [totals, setTotals]   = useState<{ actionable: number; flagged: number; ot: number; byStatus: Record<string, number> }>(
    { actionable: 0, flagged: 0, ot: 0, byStatus: {} }
  )
  const [loading, setLoading] = useState<boolean>(false)
  // Tick increments after a mutation (approve, etc) to force a refetch.
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    const sp = new URLSearchParams()
    if (selClients.length)    sp.set("clients",        selClients.join(","))
    if (selStatuses.length)   sp.set("statuses",       selStatuses.join(","))
    if (selSources.length)    sp.set("sources",        selSources.join(","))
    if (selScoreBands.length) sp.set("scoreBands",     selScoreBands.join(","))
    if (selOTOnly)            sp.set("otOnly",         "1")
    if (actionableOnly)       sp.set("actionableOnly", "1")
    if (debouncedSearch)      sp.set("q",              debouncedSearch)
    sp.set("sort", sortBy)
    sp.set("page", String(page))
    sp.set("size", String(PAGE_SIZE))
    setLoading(true)
    fetch(`/api/inbox?${sp.toString()}`)
      .then(r => r.json() as Promise<InboxApiResponse>)
      .then(d => {
        if (cancelled) return
        setRows(d.rows ?? [])
        setTotal(d.total ?? 0)
        setTotals(d.totals ?? { actionable: 0, flagged: 0, ot: 0, byStatus: {} })
      })
      .catch(() => { /* swallow; UI shows empty state */ })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [selClients, selStatuses, selSources, selScoreBands, selOTOnly, actionableOnly, debouncedSearch, sortBy, page, refreshTick])

  // Refetch when window gains focus (so an upload elsewhere reflects).
  useEffect(() => {
    const onFocus = () => setRefreshTick(t => t + 1)
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [])

  // Drawer detail — fetched on demand when a row is expanded. Carries
  // the heavy fields (validationChecks, dailyEntries) the row doesn't.
  const [detail, setDetail] = useState<{
    timesheet: Timesheet & { validationChecks: ValidationCheck[]; dailyEntries: DailyEntry[] }
    employee: Employee
  } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    if (!expandedId) { setDetail(null); return }
    let cancelled = false
    setDetailLoading(true)
    fetch(`/api/timesheet/${expandedId}?include=daily,validations,employee`)
      .then(r => r.json())
      .then(d => {
        if (cancelled || !d.configured || !d.timesheet) return
        setDetail({ timesheet: d.timesheet, employee: d.employee })
      })
      .catch(() => { /* swallow */ })
      .finally(() => { if (!cancelled) setDetailLoading(false) })
    return () => { cancelled = true }
  }, [expandedId])

  function openNotifyFor(ts: InboxRow, kind: "flag" | "reject" | "approve" | "team" | "mgr-approval") {
    const emp = ts.employee
    const client = getClient(ts.clientId)

    // The slim row only carries aggregate counts; if the drawer's detail
    // is loaded, mine its validations for human-readable issue strings,
    // else fall back to the flag reason alone.
    const checks = detail && detail.timesheet.id === ts.id ? detail.timesheet.validationChecks : []
    const issues = checks
      .filter(c => c.result === "fail" || c.result === "warning")
      .map(c => `${c.rule} — ${c.detail}`)
    if (ts.flagReason && !issues.some(i => i.includes(ts.flagReason!))) {
      issues.unshift(ts.flagReason)
    }

    const common = {
      employeeName:  emp.name,
      employeeCode:  emp.employeeCode,
      employeeEmail: emp.email,
      period:        ts.period,
      managerEmail:  emp.managerEmail ?? undefined,
    }

    if (kind === "flag") {
      setNotifyCtx(buildTimesheetFlag({ ...common, issues }))
    } else if (kind === "reject") {
      setNotifyCtx(buildTimesheetReject({ ...common, issues }))
    } else if (kind === "team") {
      setNotifyCtx(buildTimesheetNotifyTeam({
        employeeName:    emp.name,
        employeeCode:    emp.employeeCode,
        clientName:      client?.name ?? ts.clientId,
        period:          ts.period,
        totalHours:      ts.totalHours,
        overtimeHours:   ts.overtimeHours,
        validationScore: ts.validationScore,
        inconsistencies: issues,
        managerEmail:    emp.managerEmail ?? undefined,
      }))
    } else if (kind === "mgr-approval") {
      // OT > 45h cap → email manager with employee CC'd, asking for
      // approval before next month's payroll release.
      const cap = 45
      const overCap = Math.max(0, ts.totalHours - cap)
      if (!emp.managerEmail) {
        // Without a manager on file, fall back to internal team escalation.
        setNotifyCtx(buildTimesheetNotifyTeam({
          employeeName:    emp.name,
          employeeCode:    emp.employeeCode,
          clientName:      client?.name ?? ts.clientId,
          period:          ts.period,
          totalHours:      ts.totalHours,
          overtimeHours:   ts.overtimeHours,
          validationScore: ts.validationScore,
          inconsistencies: [`${overCap.toFixed(1)}h over 45h cap — no manager on file, escalating internally`, ...issues],
        }))
        return
      }
      setNotifyCtx(buildTimesheetMgrApproval({
        employeeName:   emp.name,
        employeeCode:   emp.employeeCode,
        employeeEmail:  emp.email,
        managerEmail:   emp.managerEmail,
        managerName:    emp.managerName ?? undefined,
        period:         ts.period,
        totalHours:     ts.totalHours,
        regularHours:   ts.regularHours,
        overtimeHours:  ts.overtimeHours,
        cap, overCap,
        clientName:     client?.name ?? ts.clientId,
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

  // Counts come from the server's totals payload (client-scoped, not
  // filter-scoped) so the pills/header always reflect the workload.
  const actionableCount = totals.actionable
  const flaggedCount    = totals.flagged
  const otCount         = totals.ot

  // Server returns the page already filtered + sorted; the UI just renders.
  const paginated  = rows
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const activeFilterCount =
    selStatuses.length + selClients.length + selSources.length +
    selScoreBands.length + (selOTOnly ? 1 : 0)

  const statusOptions = [
    { value: "pending",              label: "Pending" },
    { value: "reviewing",            label: "Reviewing" },
    { value: "flagged",              label: "Flagged" },
    { value: "pending_mgr_approval", label: "Pending OT approval" },
    { value: "approved",             label: "Approved" },
    { value: "processed",            label: "Processed" },
    { value: "rejected",             label: "Rejected" },
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

  // Bulk rules — operate on the loaded page only. Counts shown reflect
  // what would be approved on the current page; ops applies the rule
  // explicitly and pages through if they want broader scope.
  const bulkRules: BulkRule[] = useMemo(() => {
    const isActionable = (s: string) => ["pending", "reviewing"].includes(s)
    const cleanCheck = (r: InboxRow) => r.checkFail === 0 && r.checkWarn === 0
    return [
      {
        label: "Score ≥ 95, all checks pass",
        description: "Auto-approve clean submissions",
        match: (ts: InboxRow) => ts.validationScore >= 95 && cleanCheck(ts) && isActionable(ts.status),
        count: rows.filter(ts => ts.validationScore >= 95 && cleanCheck(ts) && isActionable(ts.status)).length,
      },
      {
        label: "Portal source, no flags",
        description: "Approve portal-synced, zero warnings",
        match: (ts: InboxRow) => ts.source === "portal" && ts.checkFail === 0 && isActionable(ts.status),
        count: rows.filter(ts => ts.source === "portal" && ts.checkFail === 0 && isActionable(ts.status)).length,
      },
      {
        label: "Under 40h, single client",
        description: "Standard week, no overtime",
        match: (ts: InboxRow) => ts.totalHours <= 40 && ts.overtimeHours === 0 && isActionable(ts.status),
        count: rows.filter(ts => ts.totalHours <= 40 && ts.overtimeHours === 0 && isActionable(ts.status)).length,
      },
    ]
  }, [rows])

  // Actions — optimistic local update, then a refetch so totals stay
  // consistent. (A real backend would wire these to a PATCH endpoint;
  // for now the optimistic path gives ops instant feedback.)
  function applyOptimistic(predicate: (r: InboxRow) => boolean, patch: Partial<InboxRow>) {
    setRows(prev => prev.map(r => predicate(r) ? { ...r, ...patch } : r))
    setRefreshTick(t => t + 1)
  }
  function approveTs(id: string) {
    applyOptimistic(r => r.id === id, {
      status: "approved" as TimesheetStatus,
      approvedBy: "Siddharth Kirtikar",
      approvedAt: new Date().toISOString(),
    })
  }
  function bulkApprove(rule: BulkRule) {
    applyOptimistic(rule.match, {
      status: "approved" as TimesheetStatus,
      approvedBy: "Siddharth Kirtikar (Bulk)",
      approvedAt: new Date().toISOString(),
    })
  }
  function approveSelected() {
    applyOptimistic(
      r => selectedIds.has(r.id) && ["pending", "reviewing"].includes(r.status),
      { status: "approved" as TimesheetStatus, approvedBy: "Siddharth Kirtikar", approvedAt: new Date().toISOString() },
    )
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
    const actionable = rows.filter(t => ["pending", "reviewing", "flagged", "pending_mgr_approval"].includes(t.status))
    if (selectedIds.size === actionable.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(actionable.map(t => t.id)))
    }
  }

  // The drawer's `detail` (timesheet + employee with full validations
  // and daily entries) is fetched from /api/timesheet/[id] in an effect
  // above; the slim row sits in `expandedId`.
  const detailTs     = detail?.timesheet ?? null
  const detailEmp    = detail?.employee ?? null
  const detailClient = detailTs ? getClient(detailTs.clientId) : null

  // Compliance count = regulations needing action
  const complianceActionCount = REGULATIONS.filter(r => r.actionRequired).length

  const onboardingCount = ONBOARDING_ISSUES.length
  const payrollCount    = PAYROLL_ISSUES.length

  // Category tabs
  const categories: { value: ActionCategory; label: string; count: number }[] = [
    { value: "timesheets",  label: "Timesheets",  count: actionableCount },
    { value: "compliance",  label: "Compliance",  count: complianceActionCount },
    { value: "onboarding",  label: "Onboarding",  count: onboardingCount },
    { value: "payroll",     label: "Payroll",     count: payrollCount },
  ]

  return (
    <div className="flex h-screen overflow-hidden app-bg">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="px-6 lg:px-8 py-5 flex-shrink-0" style={{ background: "var(--surface)", boxShadow: "0 1px 0 var(--border)" }}>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-1)" }}>Inbox</h1>
            <p className="text-[14px] mt-0.5" style={{ color: "var(--text-3)" }}>
              {actionableCount} items need your attention
            </p>
          </div>

          {/* Category tabs */}
          <div className="flex items-center gap-1 mt-4">
            {categories.map(c => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[14px] font-medium transition-colors"
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
          ) : category === "onboarding" ? (
            <OnboardingInbox />
          ) : category === "payroll" ? (
            <PayrollInbox />
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

                {/* Search — pinned to the right to match Compliance Inbox */}
                <div className="relative ml-auto">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
                  <input
                    className="glass-input pl-9 py-2 text-[14px] w-52"
                    placeholder="Search employee, client…"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1) }}
                  />
                </div>

                {/* Sort dropdown — matches Compliance Inbox */}
                <div className="flex items-center gap-2">
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
                <span style={{ color: "var(--text-1)", fontWeight: 600 }}>{total.toLocaleString()}</span> items{loading && <span className="ml-1.5" style={{ color: "var(--text-3)" }}>· refreshing…</span>}
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
                    const ts = rows.find(t => t.id === firstId)
                    if (ts) openNotifyFor(ts, "flag")
                  }}
                  className="btn-ghost flex items-center gap-1.5 text-xs"
                  style={{ padding: "6px 12px", color: "var(--warn)", borderColor: "var(--warn-border)" }}>
                  <Flag size={12} /> Flag
                </button>
                <button
                  onClick={() => {
                    const firstId = Array.from(selectedIds)[0]
                    const ts = rows.find(t => t.id === firstId)
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
              {rows.some(t => ["pending", "reviewing", "flagged", "pending_mgr_approval"].includes(t.status)) && (
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
                const emp    = ts.employee
                const client = getClient(ts.clientId)
                if (!emp || !client) return null
                const isActionable = ["pending", "reviewing", "flagged", "pending_mgr_approval"].includes(ts.status)
                const isSelected = selectedIds.has(ts.id)
                const isExpanded = expandedId === ts.id
                const fails    = ts.checkFail
                const warnings = ts.checkWarn

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
                        {ts.status === "pending_mgr_approval" && <Mail size={14} style={{ color: "var(--pink-700)" }} />}
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
                        <span className="text-[14px] font-medium truncate" style={{ color: "var(--text-1)" }}>
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

                      {/* Open detail panel */}
                      <ChevronRight size={14} className="flex-shrink-0"
                        style={{ color: "var(--text-3)" }} />
                    </div>
                  </div>
                )
              })}

              {rows.length === 0 && !loading && (
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

          {/* ── Detail side panel (slide in from right) ────────────── */}
          {expandedId && !detailTs && detailLoading && (
            <div className="hidden lg:flex flex-col w-[420px] flex-shrink-0 items-center justify-center text-xs"
              style={{ background: "var(--surface)", color: "var(--text-3)", boxShadow: "-4px 0 16px rgba(0,0,0,0.06)" }}>
              Loading detail…
            </div>
          )}
          {detailTs && detailEmp && detailClient && (
            <div
              className="hidden lg:flex flex-col w-[420px] flex-shrink-0 overflow-y-auto animate-slide-in-right"
              style={{ background: "var(--surface)", boxShadow: "-4px 0 16px rgba(0,0,0,0.06)" }}
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-5 py-4 flex-shrink-0 sticky top-0"
                style={{ background: "var(--surface)", boxShadow: "0 1px 0 var(--border)", zIndex: 10 }}>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold truncate" style={{ color: "var(--text-1)" }}>
                    {detailEmp.name}
                  </div>
                  <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: "var(--text-3)" }}>
                    <span className="px-1.5 py-0.5 rounded font-medium"
                      style={{ background: `${detailClient.color}12`, color: detailClient.color }}>
                      {detailClient.code}
                    </span>
                    <span>{detailTs.period}</span>
                  </div>
                </div>
                <button onClick={() => setExpandedId(null)}
                  className="w-8 h-8 rounded-md flex items-center justify-center"
                  style={{ color: "var(--text-3)" }}>
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4">

                {/* Employee meta */}
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--surface-2)" }}>
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-[14px] font-semibold flex-shrink-0"
                    style={{ background: `${detailClient.color}14`, color: detailClient.color }}>
                    {initials(detailEmp.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium" style={{ color: "var(--text-1)" }}>
                      {detailEmp.role}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-3)" }}>
                      {detailEmp.department} · {detailClient.name}
                    </div>
                  </div>
                </div>

                {/* Hours */}
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider mb-2"
                    style={{ color: "var(--text-3)" }}>
                    Hours
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg p-3 text-center" style={{ background: "var(--surface-2)" }}>
                      <div className="text-base font-semibold tabular-nums" style={{ color: "var(--accent)" }}>
                        {detailTs.regularHours}h
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>Regular</div>
                    </div>
                    <div className="rounded-lg p-3 text-center" style={{ background: "var(--surface-2)" }}>
                      <div className="text-base font-semibold tabular-nums" style={{ color: "var(--warn)" }}>
                        {detailTs.overtimeHours}h
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>Overtime</div>
                    </div>
                    <div className="rounded-lg p-3 text-center" style={{ background: "var(--surface-2)" }}>
                      <div className="text-base font-semibold tabular-nums" style={{ color: "var(--info)" }}>
                        {detailTs.leaveHours}h
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>Leave</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 py-2.5 px-3 rounded-lg"
                    style={{ background: "var(--pink-50)", border: "1px solid var(--pink-100)" }}>
                    <span className="text-xs" style={{ color: "var(--pink-700)" }}>Total payable</span>
                    <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--pink-700)" }}>
                      ₹{detailTs.totalPayable.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Weekly day-by-day breakdown — appears right after the
                    Hours block. Renders the 7 days of the timesheet
                    period with regular / OT / leave per day so ops can
                    spot pattern anomalies (skipped weekday, weekend
                    work, leave clustering) at a glance.            */}
                {detailTs.dailyEntries.length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider mb-2"
                      style={{ color: "var(--text-3)" }}>
                      Weekly breakdown · {detailTs.period}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {detailTs.dailyEntries.map(d => {
                        const reg   = d.regularHours ?? 0
                        const ot    = d.overtimeHours ?? 0
                        const lv    = d.leaveHours ?? 0
                        const total = reg + ot
                        const isWeekend = d.dayOfWeek === "Sat" || d.dayOfWeek === "Sun"
                        // Colour intent — same palette as the Employee
                        // Detail calendar so the two views feel consistent.
                        const tone = lv > 0     ? { bg: "rgba(99,102,241,0.10)", fg: "var(--info)"   }
                                   : total >= 9 ? { bg: "rgba(5,150,105,0.16)",  fg: "#059669"        }
                                   : total > 0  ? { bg: "rgba(244,180,0,0.16)",  fg: "var(--warn)"    }
                                   : isWeekend  ? { bg: "var(--surface-2)",      fg: "var(--text-3)" }
                                   :              { bg: "var(--surface)",        fg: "var(--text-3)" }
                        const dayNum = parseInt(d.date.slice(8, 10), 10)
                        const fmtHrs = (n: number) => Number.isInteger(n) ? `${n}` : n.toFixed(1)
                        return (
                          <div key={d.date} className="rounded-md py-1.5 px-1 flex flex-col items-center"
                            style={{ background: tone.bg }}
                            title={`${d.dayOfWeek} ${d.date}${lv > 0 ? ` · Leave ${lv}h${d.leaveType ? ` (${d.leaveType})` : ""}` : ""}${total > 0 ? ` · Reg ${reg}h${ot > 0 ? ` · OT ${ot}h` : ""}` : ""}`}
                          >
                            <span className="text-[9px] uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
                              {d.dayOfWeek.slice(0, 3)}
                            </span>
                            <span className="text-[10px] font-semibold" style={{ color: tone.fg }}>
                              {dayNum}
                            </span>
                            {total > 0 ? (
                              <span className="text-[11px] font-bold tabular-nums mt-0.5" style={{ color: tone.fg }}>
                                {fmtHrs(total)}h
                              </span>
                            ) : lv > 0 ? (
                              <span className="text-[10px] font-bold mt-0.5" style={{ color: "var(--info)" }}>L</span>
                            ) : (
                              <span className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>—</span>
                            )}
                            {ot > 0 && (
                              <span className="text-[8px] mt-0.5" style={{ color: "var(--warn)" }}>+{fmtHrs(ot)} OT</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {/* Summary footer — totals for the week + leave type if any */}
                    <div className="flex items-center justify-between mt-2 text-[11px]" style={{ color: "var(--text-3)" }}>
                      <span>
                        Worked <span style={{ color: "var(--text-1)", fontWeight: 600 }}>
                          {detailTs.dailyEntries.filter(d => (d.regularHours ?? 0) + (d.overtimeHours ?? 0) > 0).length}
                        </span> / 7 days
                      </span>
                      {detailTs.dailyEntries.some(d => (d.leaveHours ?? 0) > 0) && (
                        <span>
                          <span style={{ color: "var(--info)", fontWeight: 600 }}>
                            {detailTs.dailyEntries.reduce((s, d) => s + (d.leaveHours ?? 0), 0)}h
                          </span> leave
                        </span>
                      )}
                      <span>
                        Avg <span style={{ color: "var(--text-1)", fontWeight: 600 }}>
                          {(() => {
                            const w = detailTs.dailyEntries.filter(d => (d.regularHours ?? 0) + (d.overtimeHours ?? 0) > 0)
                            if (w.length === 0) return "—"
                            const avg = w.reduce((s, d) => s + (d.regularHours ?? 0) + (d.overtimeHours ?? 0), 0) / w.length
                            return `${avg.toFixed(1)}h/day`
                          })()}
                        </span>
                      </span>
                    </div>
                  </div>
                )}

                {/* AI Validation — JARVIS · per-client policy */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-3)" }}>
                      JARVIS · {detailClient.name} policy
                    </div>
                    <span className="text-[11px] flex items-center gap-1" style={{ color: "var(--pink-700)" }}>
                      <Sparkles size={10} />
                      {detailTs.aiConfidence ?? detailTs.validationScore}% confidence
                    </span>
                  </div>

                  {/* Tick-mark strip — one tile per policy check, ordered as the
                      validator emits them. Distinct per client because the
                      check set itself is client-specific. */}
                  <div className="grid gap-1 mb-2"
                    style={{ gridTemplateColumns: `repeat(${Math.max(1, detailTs.validationChecks.length)}, minmax(0, 1fr))` }}>
                    {detailTs.validationChecks.map(check => {
                      const c = check.result === "pass"    ? "#059669"
                              : check.result === "fail"    ? "var(--danger)"
                              : check.result === "warning" ? "var(--warn)"
                              :                              "var(--text-3)"
                      const bg = check.result === "pass"    ? "rgba(5,150,105,0.08)"
                               : check.result === "fail"    ? "var(--danger-bg)"
                               : check.result === "warning" ? "var(--warn-bg)"
                               :                              "var(--surface-2)"
                      return (
                        <div key={`tick-${check.id}`}
                          title={`${check.rule} — ${check.detail}`}
                          className="flex flex-col items-center gap-1 px-1 py-2 rounded-md"
                          style={{ background: bg }}>
                          {check.result === "pass"    && <CheckCircle2  size={14} style={{ color: c }} />}
                          {check.result === "fail"    && <XCircle       size={14} style={{ color: c }} />}
                          {check.result === "warning" && <AlertTriangle size={14} style={{ color: c }} />}
                          {check.result === "pending" && <Clock         size={14} style={{ color: c }} />}
                          <span className="text-[9px] font-medium leading-tight text-center" style={{ color: c }}>
                            {tickLabelFor(check.id)}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Score summary */}
                  <div className="p-3 rounded-lg mb-2" style={{
                    background: detailTs.validationScore >= 85 ? "rgba(5,150,105,0.06)"
                              : detailTs.validationScore >= 60 ? "var(--warn-bg)"
                              : "var(--danger-bg)"
                  }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: "var(--text-2)" }}>Validation score</span>
                      <span className="text-2xl font-bold tabular-nums"
                        style={{ color: detailTs.validationScore >= 85 ? "#059669" : detailTs.validationScore >= 60 ? "var(--warn)" : "var(--danger)" }}>
                        {detailTs.validationScore}
                      </span>
                    </div>
                  </div>

                  {/* Individual checks */}
                  <div className="space-y-1.5">
                    {detailTs.validationChecks.map(check => (
                      <div key={check.id}
                        className="flex items-start gap-2.5 p-2.5 rounded-lg"
                        style={{
                          background: check.result === "pass" ? "rgba(5,150,105,0.04)"
                                    : check.result === "fail" ? "var(--danger-bg)"
                                    : check.result === "warning" ? "var(--warn-bg)"
                                    : "var(--surface-2)",
                        }}>
                        <div className="mt-0.5 flex-shrink-0">
                          {check.result === "pass"    && <CheckCircle2 size={14} style={{ color: "#059669" }} />}
                          {check.result === "fail"    && <XCircle size={14} style={{ color: "var(--danger)" }} />}
                          {check.result === "warning" && <AlertTriangle size={14} style={{ color: "var(--warn)" }} />}
                          {check.result === "pending" && <Clock size={14} style={{ color: "var(--text-3)" }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-medium" style={{ color: "var(--text-1)" }}>
                            {check.rule}
                          </div>
                          <div className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>
                            {check.detail}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Drill into source portal — Fieldglass detail page exposes
                      the real day-wise breakdown that isn't bulk-exportable. */}
                  {detailTs.externalUrl && (
                    <a href={detailTs.externalUrl} target="_blank" rel="noreferrer"
                      className="mt-2 flex items-center justify-center gap-1.5 py-2 px-3 text-[11px] font-medium rounded-lg"
                      style={{ color: "var(--accent)", background: "var(--accent-dim)", border: "1px solid var(--accent-border)" }}>
                      <Globe size={12} /> View day-wise on {detailTs.portalId === "fieldglass" ? "Fieldglass" : detailTs.portalId === "beeline" ? "BeeLine" : "portal"} →
                    </a>
                  )}
                </div>

                {/* Flag reason */}
                {detailTs.flagReason && (
                  <div className="p-3 rounded-lg" style={{ background: "var(--warn-bg)" }}>
                    <div className="flex items-center gap-1.5 text-xs font-medium mb-1" style={{ color: "var(--warn)" }}>
                      <Flag size={12} /> Flagged
                      {detailTs.flaggedBy && <span className="font-normal" style={{ color: "var(--text-3)" }}>
                        by {detailTs.flaggedBy === "ai" ? "JARVIS" : detailTs.flaggedBy === "ops" ? "Ops" : "System"}
                      </span>}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-2)" }}>{detailTs.flagReason}</div>
                  </div>
                )}

                {/* Leave balance */}
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider mb-2"
                    style={{ color: "var(--text-3)" }}>
                    Leave balance
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Annual",  total: detailEmp.leaveBalance.annual,  used: detailEmp.leaveBalance.usedAnnual,  color: "var(--accent)" },
                      { label: "Sick",    total: detailEmp.leaveBalance.sick,    used: detailEmp.leaveBalance.usedSick,    color: "var(--danger)" },
                      { label: "Casual",  total: detailEmp.leaveBalance.casual,  used: detailEmp.leaveBalance.usedCasual,  color: "var(--info)"   },
                    ].map(lb => {
                      const remain = lb.total - lb.used
                      const pct = Math.round((lb.used / lb.total) * 100)
                      return (
                        <div key={lb.label} className="rounded-lg p-2.5" style={{ background: "var(--surface-2)" }}>
                          <div className="text-[14px] font-semibold tabular-nums" style={{ color: lb.color }}>
                            {remain}
                            <span className="text-[11px] font-normal" style={{ color: "var(--text-3)" }}> / {lb.total}</span>
                          </div>
                          <div className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>{lb.label}</div>
                          <div className="w-full h-1 rounded-full mt-1.5" style={{ background: "var(--border)" }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: lb.color, opacity: 0.6 }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Actions */}
                {(() => {
                  // Reconstruct an InboxRow-shaped object so the existing
                  // openNotifyFor signature (which expects `.employee`)
                  // can be reused as-is from the drawer.
                  const detailRow: InboxRow = {
                    id: detailTs.id, employeeId: detailTs.employeeId, clientId: detailTs.clientId,
                    period: detailTs.period, periodStart: detailTs.periodStart, periodEnd: detailTs.periodEnd,
                    submittedAt: detailTs.submittedAt, source: detailTs.source,
                    sourceDetail: detailTs.sourceDetail, portalId: detailTs.portalId,
                    status: detailTs.status,
                    totalHours: detailTs.totalHours, regularHours: detailTs.regularHours,
                    overtimeHours: detailTs.overtimeHours, leaveHours: detailTs.leaveHours,
                    totalPayable: detailTs.totalPayable,
                    validationScore: detailTs.validationScore,
                    flagReason: detailTs.flagReason, flaggedBy: detailTs.flaggedBy,
                    approvedBy: detailTs.approvedBy, approvedAt: detailTs.approvedAt,
                    aiConfidence: detailTs.aiConfidence, externalUrl: detailTs.externalUrl,
                    checkFail: 0, checkWarn: 0, checkTotal: 0,
                    employee: {
                      id: detailEmp.id, name: detailEmp.name, email: detailEmp.email,
                      employeeCode: detailEmp.employeeCode, role: detailEmp.role,
                      department: detailEmp.department,
                      managerEmail: detailEmp.managerEmail ?? null,
                      managerName:  detailEmp.managerName  ?? null,
                      avatarColor:  detailEmp.avatarColor,
                      earnedLeaves:   detailEmp.leaveBalance.annual,
                      consumedLeaves: detailEmp.leaveBalance.usedAnnual,
                    },
                  }
                  return ["pending", "reviewing", "flagged", "pending_mgr_approval"].includes(detailTs.status) ? (
                    <div className="space-y-2 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                      {detailTs.status === "pending_mgr_approval" && (
                        <button
                          onClick={() => openNotifyFor(detailRow, "mgr-approval")}
                          className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 text-[14px]"
                          style={{ background: "var(--pink-700)" }}>
                          <Mail size={14} /> Request OT approval from manager
                        </button>
                      )}
                      <button
                        onClick={() => approveTs(detailTs.id)}
                        className={detailTs.status === "pending_mgr_approval"
                          ? "w-full btn-ghost flex items-center justify-center gap-2 py-2 text-xs"
                          : "w-full btn-primary flex items-center justify-center gap-2 py-2.5 text-[14px]"}>
                        <CheckCircle2 size={detailTs.status === "pending_mgr_approval" ? 12 : 14} />
                        {detailTs.status === "pending_mgr_approval" ? "Approve regular hours only (skip OT)" : "Approve timesheet"}
                      </button>
                      <button
                        onClick={() => openNotifyFor(detailRow, "team")}
                        className="w-full btn-ghost flex items-center justify-center gap-1.5 py-2 text-xs"
                        style={{ color: "var(--accent)", borderColor: "var(--pink-100)", background: "var(--pink-50)" }}>
                        <Mail size={12} /> Notify team — flag inconsistencies
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => openNotifyFor(detailRow, "flag")}
                          className="btn-ghost flex items-center justify-center gap-1.5 py-2 text-xs"
                          style={{ color: "var(--warn)" }}>
                          <Flag size={12} /> Flag
                        </button>
                        <button
                          onClick={() => openNotifyFor(detailRow, "reject")}
                          className="btn-ghost flex items-center justify-center gap-1.5 py-2 text-xs"
                          style={{ color: "var(--danger)" }}>
                          <XCircle size={12} /> Reject
                        </button>
                      </div>
                    </div>
                  ) : null
                })()}

                {/* Status confirmations */}
                {detailTs.status === "approved" && (
                  <div className="text-center py-3 rounded-lg" style={{ background: "rgba(5,150,105,0.06)" }}>
                    <CheckCircle2 size={18} className="mx-auto mb-1" style={{ color: "#059669" }} />
                    <div className="text-[14px] font-medium" style={{ color: "#059669" }}>Approved</div>
                    {detailTs.approvedBy && (
                      <div className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>
                        by {detailTs.approvedBy}
                      </div>
                    )}
                  </div>
                )}
                {detailTs.status === "processed" && (
                  <div className="text-center py-3 rounded-lg" style={{ background: "var(--accent-dim)" }}>
                    <CheckCircle2 size={18} className="mx-auto mb-1" style={{ color: "var(--accent)" }} />
                    <div className="text-[14px] font-medium" style={{ color: "var(--accent)" }}>Processed & Paid</div>
                    <div className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>
                      ₹{detailTs.totalPayable.toLocaleString("en-IN")}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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
