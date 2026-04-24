"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import {
  ONBOARDING_ISSUES, STAGE_META, SEVERITY_META, ONBOARDING_ISSUE_TYPES,
  getOnboardingIssuesForClient,
  type OnboardingIssue, type OnboardingStage, type OnboardingSeverity,
} from "@/lib/onboarding-data"
import NotifyPanel, { buildOnboardingIssue, buildDocumentRequest, type NotifyContext } from "@/components/NotifyPanel"
import {
  AlertTriangle, Sparkles, Mail, Check, Clock, Search, ChevronDown,
  Building2, Tag, X, ChevronRight, FileText, Workflow, ShieldAlert, MapPin,
} from "lucide-react"
import clsx from "clsx"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ageLabel(days: number): string {
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7)   return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}
function ageColor(days: number): string {
  if (days >= 7) return "var(--danger)"
  if (days >= 3) return "var(--warn)"
  return "var(--text-3)"
}

// ─── Filter Dropdown (multi-select) ───────────────────────────────────────────

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
          color:      active ? "var(--pink-700)" : "var(--text-2)",
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
        <div className="absolute top-full mt-1.5 left-0 z-[100] rounded-xl border shadow-xl min-w-[220px] py-1.5"
          style={{ background: "var(--surface)", borderColor: "var(--border-strong)", boxShadow: "0 12px 32px rgba(0,0,0,0.15)" }}>
          {selected.length > 0 && (
            <button onClick={() => { onClear(); setOpen(false) }}
              className="w-full text-left px-3 py-1.5 text-xs font-semibold mb-1"
              style={{ color: "var(--accent)" }}>
              Clear all
            </button>
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

const STAGES: OnboardingStage[] = ["doc-collection","verification","validation","reconciliation","compliance"]
const SEVERITIES: OnboardingSeverity[] = ["high","medium","low"]

type SortMode = "age-desc" | "age-asc" | "severity" | "client"

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingInbox({ clientId }: { clientId?: string }) {
  const [selStages,      setSelStages]      = useState<OnboardingStage[]>([])
  const [selSeverities,  setSelSeverities]  = useState<OnboardingSeverity[]>([])
  const [selIssueTypes,  setSelIssueTypes]  = useState<string[]>([])
  const [selClients,     setSelClients]     = useState<string[]>([])
  const [search,         setSearch]         = useState("")
  const [sortBy,         setSortBy]         = useState<SortMode>("age-desc")
  const [selectedIds,    setSelectedIds]    = useState<Set<string>>(new Set())
  const [expandedId,     setExpandedId]     = useState<string | null>(null)
  const [notifyCtx,      setNotifyCtx]      = useState<NotifyContext | null>(null)

  const base = useMemo(
    () => clientId ? getOnboardingIssuesForClient(clientId) : ONBOARDING_ISSUES,
    [clientId]
  )

  const allClients = useMemo(() => {
    const map = new Map<string, string>()
    for (const i of base) if (!map.has(i.clientId)) map.set(i.clientId, i.clientName)
    return Array.from(map.entries()).map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label))
  }, [base])

  function toggle<T>(arr: T[], set: (v: T[]) => void, val: T) {
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  const filtered = useMemo(() => {
    let list = [...base]
    if (selStages.length)      list = list.filter(i => selStages.includes(i.stage))
    if (selSeverities.length)  list = list.filter(i => selSeverities.includes(i.severity))
    if (selIssueTypes.length)  list = list.filter(i => selIssueTypes.includes(i.issueType))
    if (selClients.length)     list = list.filter(i => selClients.includes(i.clientId))
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(i =>
        i.candidateName.toLowerCase().includes(q) ||
        i.candidateCode.toLowerCase().includes(q) ||
        i.issueType.toLowerCase().includes(q) ||
        i.clientName.toLowerCase().includes(q)
      )
    }
    list.sort((a, b) => {
      if (sortBy === "age-desc") return b.ageDays - a.ageDays
      if (sortBy === "age-asc")  return a.ageDays - b.ageDays
      if (sortBy === "severity") {
        const r = { high: 0, medium: 1, low: 2 }
        return r[a.severity] - r[b.severity]
      }
      return a.clientName.localeCompare(b.clientName)
    })
    return list
  }, [base, selStages, selSeverities, selIssueTypes, selClients, search, sortBy])

  function openNotify(issue: OnboardingIssue) {
    setNotifyCtx(buildOnboardingIssue({
      candidateName:   issue.candidateName,
      clientName:      issue.clientName,
      issueType:       issue.issueType,
      docs:            issue.documents,
      inconsistencies: issue.inconsistencies,
    }))
  }

  function openDocRequest(issue: OnboardingIssue) {
    setNotifyCtx(buildDocumentRequest({
      employeeName:  issue.candidateName,
      employeeEmail: `${issue.candidateCode.toLowerCase()}@candidate.in`,
      clientName:    issue.clientName,
      docType:       issue.documents[0] ?? "Onboarding document",
      reason:        issue.inconsistencies[0] ?? issue.issueType,
    }))
  }

  const highCount   = filtered.filter(i => i.severity === "high").length
  const agingCount  = filtered.filter(i => i.ageDays >= 7).length
  const activeFilterCount = selStages.length + selSeverities.length + selIssueTypes.length + selClients.length

  const stageOptions    = STAGES.map(s => ({ value: s, label: STAGE_META[s].label, color: STAGE_META[s].color }))
  const severityOptions = SEVERITIES.map(s => ({ value: s, label: SEVERITY_META[s].label, color: SEVERITY_META[s].color }))
  const issueOptions    = [...ONBOARDING_ISSUE_TYPES].map(t => ({ value: t, label: t }))

  const allIds = filtered.map(i => i.id)
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id))
  function toggleSelectAll() { setSelectedIds(allSelected ? new Set() : new Set(allIds)) }
  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const selectedCount = Array.from(selectedIds).filter(id => allIds.includes(id)).length

  return (
    <div className="flex flex-col h-full w-full">

      {/* Toolbar */}
      <div className="px-6 lg:px-8 py-3 flex-shrink-0"
        style={{ background: "var(--surface)", boxShadow: "0 1px 0 var(--border)" }}>
        <div className="flex flex-wrap items-center gap-2">

          <FilterDropdown label="Stage" icon={Workflow} options={stageOptions}
            selected={selStages as string[]}
            onToggle={v => toggle(selStages, setSelStages, v as OnboardingStage)}
            onClear={() => setSelStages([])} />

          <FilterDropdown label="Issue type" icon={Tag} options={issueOptions}
            selected={selIssueTypes}
            onToggle={v => toggle(selIssueTypes, setSelIssueTypes, v)}
            onClear={() => setSelIssueTypes([])} />

          <FilterDropdown label="Severity" icon={ShieldAlert} options={severityOptions}
            selected={selSeverities as string[]}
            onToggle={v => toggle(selSeverities, setSelSeverities, v as OnboardingSeverity)}
            onClear={() => setSelSeverities([])} />

          {!clientId && (
            <FilterDropdown label="Client" icon={Building2} options={allClients}
              selected={selClients}
              onToggle={v => toggle(selClients, setSelClients, v)}
              onClear={() => setSelClients([])} />
          )}

          {activeFilterCount > 0 && (
            <button onClick={() => {
              setSelStages([]); setSelSeverities([]); setSelIssueTypes([]); setSelClients([]); setSearch("")
            }}
              className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-semibold"
              style={{ color: "var(--danger)", background: "var(--danger-bg)" }}>
              <X size={11} /> Clear ({activeFilterCount})
            </button>
          )}

          <div className="relative ml-auto">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
            <input
              className="glass-input pl-8 py-2 text-xs w-48"
              placeholder="Search candidate, code…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-3)" }}>Sort by</span>
            <div className="relative">
              <select value={sortBy} onChange={e => setSortBy(e.target.value as SortMode)}
                className="glass-input py-2 pr-7 text-xs appearance-none cursor-pointer"
                style={{ width: 160, fontSize: 12 }}>
                <option value="age-desc">Oldest first</option>
                <option value="age-asc">Newest first</option>
                <option value="severity">Highest severity</option>
                <option value="client">Client name</option>
              </select>
              <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-3)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="flex items-center gap-6 px-6 lg:px-8 py-2.5 flex-shrink-0 text-xs"
        style={{ background: "var(--bg)", color: "var(--text-3)" }}>
        <span>
          <span style={{ color: "var(--text-1)", fontWeight: 600 }}>{filtered.length.toLocaleString()}</span> issues
        </span>
        <span>
          <span style={{ color: "var(--danger)", fontWeight: 600 }}>{highCount}</span> high severity
        </span>
        <span>
          <span style={{ color: "var(--warn)", fontWeight: 600 }}>{agingCount}</span> aging ({">"}= 7d)
        </span>
      </div>

      {/* Bulk bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 px-6 lg:px-8 py-2.5 flex-shrink-0"
          style={{ background: "var(--pink-50)", boxShadow: "0 1px 0 var(--border)" }}>
          <span className="text-xs font-medium" style={{ color: "var(--pink-700)" }}>{selectedCount} selected</span>
          <button className="btn-primary flex items-center gap-1.5 text-xs" style={{ padding: "6px 12px" }}>
            <Check size={12} /> Mark resolved
          </button>
          <button
            onClick={() => {
              const firstId = Array.from(selectedIds)[0]
              const issue = filtered.find(i => i.id === firstId)
              if (issue) openNotify(issue)
            }}
            className="btn-ghost flex items-center gap-1.5 text-xs" style={{ padding: "6px 12px" }}>
            <Mail size={12} /> Notify team
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            className="btn-ghost flex items-center gap-1.5 text-xs ml-auto" style={{ padding: "6px 12px" }}>
            Clear
          </button>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto" style={{ background: "var(--surface)" }}>
        {filtered.length > 0 && (
          <div className="flex items-center gap-3 px-6 lg:px-8 py-2 flex-shrink-0 sticky top-0 z-10"
            style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
            <button onClick={toggleSelectAll}
              className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors"
              style={{
                borderColor: allSelected ? "var(--accent)" : "var(--border-strong)",
                background:  allSelected ? "var(--accent)" : "transparent",
              }}>
              {allSelected && <Check size={10} className="text-white" />}
            </button>
            <span className="text-xs" style={{ color: "var(--text-3)" }}>Select all</span>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-20 text-sm" style={{ color: "var(--text-3)" }}>
            No onboarding issues match the filters
          </div>
        )}

        {filtered.map(issue => {
          const stageMeta = STAGE_META[issue.stage]
          const sevMeta   = SEVERITY_META[issue.severity]
          const isSelected = selectedIds.has(issue.id)
          const isExpanded = expandedId === issue.id
          const ageC       = ageColor(issue.ageDays)

          return (
            <div key={issue.id}
              className="group transition-colors"
              style={{
                borderBottom: "1px solid var(--border)",
                background: isExpanded ? "var(--pink-50)"
                          : isSelected ? "var(--surface-hover)"
                          : "var(--surface)",
              }}>

              <div className="flex items-center gap-3 px-6 lg:px-8 py-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : issue.id)}>

                <button onClick={e => { e.stopPropagation(); toggleSelect(issue.id) }}
                  className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{
                    borderColor: isSelected ? "var(--accent)" : "var(--border-strong)",
                    background:  isSelected ? "var(--accent)" : "transparent",
                  }}>
                  {isSelected && <Check size={10} className="text-white" />}
                </button>

                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: stageMeta.color }} />

                <span className="text-xs font-medium flex-shrink-0 px-2 py-0.5 rounded-md max-w-[140px] truncate"
                  style={{ background: `${issue.clientColor}14`, color: issue.clientColor }}>
                  {issue.clientName.length > 14 ? issue.clientName.slice(0, 14) + "…" : issue.clientName}
                </span>

                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-[14px] font-medium truncate" style={{ color: "var(--text-1)" }}>
                    {issue.candidateName}
                  </span>
                  <span className="hidden lg:inline text-[11px] flex-shrink-0 truncate" style={{ color: "var(--text-3)" }}>
                    · {issue.issueType}
                  </span>
                </div>

                <span className="hidden md:flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded flex-shrink-0"
                  style={{ background: stageMeta.bg, color: stageMeta.color }}>
                  {stageMeta.label}
                </span>

                <span className="hidden md:flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded flex-shrink-0"
                  style={{ background: sevMeta.bg, color: sevMeta.color }}>
                  {sevMeta.label}
                </span>

                <span className="flex items-center gap-1 text-[11px] flex-shrink-0 w-20 justify-end"
                  style={{ color: ageC, fontWeight: 600 }}>
                  <Clock size={10} /> {ageLabel(issue.ageDays)}
                </span>

                <ChevronRight size={14} className="flex-shrink-0 transition-transform"
                  style={{
                    color: "var(--text-3)",
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                  }} />
              </div>

              {isExpanded && (
                <div className="px-6 lg:px-8 pb-5 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                    <div className="md:col-span-2 rounded-lg p-4" style={{ background: "var(--surface)" }}>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded"
                          style={{ background: stageMeta.bg, color: stageMeta.color }}>
                          {stageMeta.label}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded flex items-center gap-1"
                          style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
                          <MapPin size={9} /> {issue.location}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded"
                          style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
                          {issue.role}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded"
                          style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
                          Joining {issue.joiningDate}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded"
                          style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
                          Code {issue.candidateCode}
                        </span>
                      </div>

                      <div className="text-[14px] font-semibold mb-2" style={{ color: "var(--text-1)" }}>
                        {issue.issueType}
                      </div>

                      <ul className="space-y-1.5">
                        {issue.inconsistencies.map((line, i) => (
                          <li key={i} className="flex items-start gap-2 text-[12px]" style={{ color: "var(--text-2)" }}>
                            <AlertTriangle size={11} className="mt-0.5 flex-shrink-0" style={{ color: "var(--warn)" }} />
                            {line}
                          </li>
                        ))}
                      </ul>

                      {issue.documents.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap mt-3">
                          <FileText size={11} style={{ color: "var(--text-3)" }} />
                          {issue.documents.map(d => (
                            <span key={d} className="text-[11px] px-2 py-0.5 rounded font-medium"
                              style={{ background: "var(--pink-50)", color: "var(--pink-700)" }}>
                              {d}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-lg p-3"
                        style={{ background: sevMeta.bg, border: "1px solid var(--border)" }}>
                        <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: sevMeta.color }}>
                          Recommended action
                        </div>
                        <div className="text-[14px] font-semibold mt-1" style={{ color: "var(--text-1)" }}>
                          {issue.recommendedAction}
                        </div>
                      </div>
                      <div className="rounded-lg p-3"
                        style={{ background: "var(--pink-50)", border: "1px solid var(--pink-100)" }}>
                        <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider font-semibold"
                          style={{ color: "var(--pink-700)" }}>
                          <Sparkles size={10} /> AI suggests
                        </div>
                        <div className="text-[14px] font-semibold mt-1" style={{ color: "var(--pink-700)" }}>
                          {issue.aiSuggestion}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <button className="btn-primary flex items-center gap-1.5 text-xs" style={{ padding: "8px 14px" }}>
                      <Check size={12} /> Mark resolved
                    </button>
                    <button onClick={e => { e.stopPropagation(); openNotify(issue) }}
                      className="btn-ghost flex items-center gap-1.5 text-xs" style={{ padding: "8px 14px" }}>
                      <Mail size={12} /> Notify team
                    </button>
                    <button onClick={e => { e.stopPropagation(); openDocRequest(issue) }}
                      className="btn-ghost flex items-center gap-1.5 text-xs" style={{ padding: "8px 14px" }}>
                      <FileText size={12} /> Request document
                    </button>
                    <span className="text-[11px] ml-auto" style={{ color: "var(--text-3)" }}>
                      Raised {ageLabel(issue.ageDays)} · {issue.createdAt}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <NotifyPanel context={notifyCtx} onClose={() => setNotifyCtx(null)} />
    </div>
  )
}
