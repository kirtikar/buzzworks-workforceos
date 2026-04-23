"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import {
  REGULATIONS, CATEGORY_META, IMPACT_AREA_META,
  type Regulation, type ImpactArea, type ComplianceCategory,
} from "@/lib/compliance-data"
import {
  AlertTriangle, Calendar, IndianRupee, Sparkles, Mail, Check,
  Clock, ExternalLink, Search, ChevronDown, Building2, Tag, X,
  MapPin, ChevronRight,
} from "lucide-react"
import clsx from "clsx"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPenalty(n: number) {
  if (n === 0) return "—"
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000)     return `₹${(n / 1000).toFixed(0)}k`
  return `₹${n.toLocaleString("en-IN")}`
}

function parseEffectiveDate(s: string): Date {
  const d = new Date(s)
  return isNaN(d.getTime()) ? new Date("2026-12-31") : d
}
function daysUntil(s: string): number {
  const target = parseEffectiveDate(s)
  const today  = new Date("2026-04-17")
  return Math.floor((target.getTime() - today.getTime()) / 86400000)
}
function deadlineLabel(days: number): string {
  if (days < 0)   return `${Math.abs(days)}d overdue`
  if (days === 0) return "Today"
  if (days === 1) return "Tomorrow"
  if (days < 7)   return `${days}d left`
  if (days < 30)  return `${Math.floor(days / 7)}w`
  return `${Math.floor(days / 30)}mo`
}
function deadlineColor(days: number): string {
  if (days < 0)  return "var(--danger)"
  if (days < 7)  return "var(--danger)"
  if (days < 30) return "var(--warn)"
  return "var(--text-2)"
}

function totalCostOfNonCompliance(reg: Regulation): number {
  const penalty = reg.penaltyAmount
  const opMul   = reg.operationalImpact === "high" ? 2.5 : reg.operationalImpact === "medium" ? 1.2 : 0.4
  const legal   = reg.legalRisk === "high" ? Math.max(50000, penalty * 0.3)
                : reg.legalRisk === "medium" ? Math.max(25000, penalty * 0.15)
                : 10000
  return Math.round(penalty + penalty * opMul + legal)
}

function recommendedAction(reg: Regulation): string {
  switch (reg.category) {
    case "Labour":             return "Update payroll rules"
    case "Finance & Taxation": return "Update tax config"
    case "EHS":                return "Compliance audit"
    case "Commercial":         return "Review contracts"
    case "Secretarial":        return "Update filings"
    default:                   return "Review & assign"
  }
}

function clientsLabel(clients: string[]): string {
  if (clients.length === 0) return "—"
  if (clients.some(c => c.startsWith("All "))) return "All clients"
  if (clients.length === 1) return clients[0]
  return `${clients[0]} +${clients.length - 1}`
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
          <span className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
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

// ─── Options ──────────────────────────────────────────────────────────────────

const CATEGORIES: ComplianceCategory[] = [
  "Labour", "Finance & Taxation", "EHS", "Commercial", "Secretarial",
]
const IMPACT_AREAS: ImpactArea[] = [
  "Payroll", "HR Operations", "Compliance Management", "Worker Onboarding",
  "Employee Welfare", "Tax Filing", "Legal Documentation", "Workplace Safety",
  "Contract Management", "Account Management",
]

type SortMode = "deadline" | "cost" | "risk"

// ─── Component ────────────────────────────────────────────────────────────────

export default function ComplianceInbox() {
  const [selCategories,  setSelCategories]  = useState<ComplianceCategory[]>([])
  const [selImpactAreas, setSelImpactAreas] = useState<ImpactArea[]>([])
  const [selClients,     setSelClients]     = useState<string[]>([])
  const [search,         setSearch]         = useState("")
  const [sortBy,         setSortBy]         = useState<SortMode>("deadline")
  const [selectedIds,    setSelectedIds]    = useState<Set<number>>(new Set())
  const [expandedId,     setExpandedId]     = useState<number | null>(null)

  function toggle<T>(arr: T[], set: (v: T[]) => void, val: T) {
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  // Actionable only
  const actionable = useMemo(
    () => REGULATIONS.filter(r => r.actionRequired),
    []
  )

  // Collect client list across actionable regulations
  const allClients = useMemo(() => {
    const set = new Set<string>()
    for (const r of actionable) for (const c of r.clientsAffected)
      if (!c.startsWith("All ")) set.add(c)
    return Array.from(set).sort()
  }, [actionable])

  const filtered = useMemo(() => {
    let list = [...actionable]
    if (selCategories.length)   list = list.filter(r => selCategories.includes(r.category))
    if (selImpactAreas.length)  list = list.filter(r => r.impactAreas.some(ia => selImpactAreas.includes(ia)))
    if (selClients.length)      list = list.filter(r => r.clientsAffected.some(c => selClients.includes(c)))
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.authority.toLowerCase().includes(q) ||
        r.clientsAffected.some(c => c.toLowerCase().includes(q))
      )
    }
    // Sort
    list.sort((a, b) => {
      if (sortBy === "cost") return totalCostOfNonCompliance(b) - totalCostOfNonCompliance(a)
      if (sortBy === "risk") {
        const rank = { high: 0, medium: 1, low: 2 }
        return rank[a.legalRisk] - rank[b.legalRisk]
      }
      return daysUntil(a.effectiveDate) - daysUntil(b.effectiveDate)
    })
    return list
  }, [actionable, selCategories, selImpactAreas, selClients, search, sortBy])

  // Summary stats
  const totalCost    = filtered.reduce((s, r) => s + totalCostOfNonCompliance(r), 0)
  const overdueCount = filtered.filter(r => daysUntil(r.effectiveDate) < 0).length
  const urgentCount  = filtered.filter(r => {
    const d = daysUntil(r.effectiveDate); return d >= 0 && d < 7
  }).length

  const activeFilterCount = selCategories.length + selImpactAreas.length + selClients.length

  const categoryOptions  = CATEGORIES.map(c => ({ value: c, label: CATEGORY_META[c].label, color: CATEGORY_META[c].color }))
  const impactAreaOptions = IMPACT_AREAS.map(a => ({ value: a, label: IMPACT_AREA_META[a].label, color: IMPACT_AREA_META[a].color }))
  const clientOptions    = allClients.map(c => ({ value: c, label: c }))

  const allIds = filtered.map(r => r.id)
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id))
  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(allIds))
  }
  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const selectedCount = Array.from(selectedIds).filter(id => allIds.includes(id)).length

  return (
    <div className="flex flex-col h-full w-full">

      {/* ── Toolbar row 1: category pills + filters + search + sort ── */}
      <div className="px-6 lg:px-8 py-3 flex-shrink-0"
        style={{ background: "var(--surface)", boxShadow: "0 1px 0 var(--border)" }}>
        <div className="flex flex-wrap items-center gap-2">

          {/* Category pills */}
          {CATEGORIES.map(c => {
            const m = CATEGORY_META[c]
            const isActive = selCategories.includes(c)
            return (
              <button key={c}
                onClick={() => toggle(selCategories, setSelCategories, c)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background: isActive ? m.bg : "transparent",
                  color:      isActive ? m.color : "var(--text-2)",
                  border: isActive ? `1px solid ${m.color}40` : "1px solid var(--border)",
                }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />
                {m.label}
              </button>
            )
          })}

          <div className="w-px h-5 mx-1" style={{ background: "var(--border)" }} />

          <FilterDropdown label="Impact area" icon={Tag} options={impactAreaOptions}
            selected={selImpactAreas as string[]}
            onToggle={v => toggle(selImpactAreas, setSelImpactAreas, v as ImpactArea)}
            onClear={() => setSelImpactAreas([])} />

          <FilterDropdown label="Client" icon={Building2} options={clientOptions}
            selected={selClients}
            onToggle={v => toggle(selClients, setSelClients, v)}
            onClear={() => setSelClients([])} />

          {activeFilterCount > 0 && (
            <button onClick={() => { setSelCategories([]); setSelImpactAreas([]); setSelClients([]); setSearch("") }}
              className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-semibold"
              style={{ color: "var(--danger)", background: "var(--danger-bg)" }}>
              <X size={11} /> Clear ({activeFilterCount})
            </button>
          )}

          {/* Search */}
          <div className="relative ml-auto">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
            <input
              className="glass-input pl-8 py-2 text-xs w-48"
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Sort select — label matches input font size */}
          <div className="flex items-center gap-2">
            <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-3)" }}>Sort by</span>
            <div className="relative">
              <select value={sortBy} onChange={e => setSortBy(e.target.value as SortMode)}
                className="glass-input py-2 pr-7 text-xs appearance-none cursor-pointer"
                style={{ width: 160, fontSize: 12 }}>
                <option value="deadline">Nearest deadline</option>
                <option value="cost">Highest cost</option>
                <option value="risk">Highest risk</option>
              </select>
              <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-3)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary stats strip ── */}
      <div className="flex items-center gap-6 px-6 lg:px-8 py-2.5 flex-shrink-0 text-xs"
        style={{ background: "var(--bg)", color: "var(--text-3)" }}>
        <span>
          <span style={{ color: "var(--text-1)", fontWeight: 600 }}>{filtered.length.toLocaleString()}</span> action items
        </span>
        <span>
          <span style={{ color: "var(--danger)", fontWeight: 600 }}>{overdueCount}</span> overdue
        </span>
        <span>
          <span style={{ color: "var(--warn)", fontWeight: 600 }}>{urgentCount}</span> due this week
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <IndianRupee size={11} style={{ color: "var(--danger)" }} />
          <span style={{ color: "var(--danger)", fontWeight: 600 }}>{fmtPenalty(totalCost)}</span>
          non-compliance exposure
        </span>
      </div>

      {/* ── Bulk action bar (when items selected) ── */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 px-6 lg:px-8 py-2.5 flex-shrink-0"
          style={{ background: "var(--pink-50)", boxShadow: "0 1px 0 var(--border)" }}>
          <span className="text-xs font-medium" style={{ color: "var(--pink-700)" }}>
            {selectedCount} selected
          </span>
          <button className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3"
            style={{ padding: "6px 12px" }}>
            <Check size={12} /> Mark done
          </button>
          <button className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-3"
            style={{ padding: "6px 12px" }}>
            <Mail size={12} /> Notify team
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-3 ml-auto"
            style={{ padding: "6px 12px" }}>
            Clear
          </button>
        </div>
      )}

      {/* ── Gmail-style flat list ── */}
      <div className="flex-1 overflow-y-auto" style={{ background: "var(--surface)" }}>

        {/* Select-all header */}
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
            <span className="text-xs" style={{ color: "var(--text-3)" }}>
              Select all
            </span>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-20 text-sm" style={{ color: "var(--text-3)" }}>
            No action-required regulations match the filters
          </div>
        )}

        {filtered.map(reg => {
          const catMeta = CATEGORY_META[reg.category]
          const days    = daysUntil(reg.effectiveDate)
          const dColor  = deadlineColor(days)
          const cost    = totalCostOfNonCompliance(reg)
          const rec     = recommendedAction(reg)
          const isSelected = selectedIds.has(reg.id)
          const isExpanded = expandedId === reg.id

          return (
            <div key={reg.id}
              className="group transition-colors"
              style={{
                borderBottom: "1px solid var(--border)",
                background: isExpanded ? "var(--pink-50)"
                          : isSelected ? "var(--surface-hover)"
                          : "var(--surface)",
              }}>

              {/* Row (always visible) */}
              <div className="flex items-center gap-3 px-6 lg:px-8 py-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : reg.id)}>

                {/* Checkbox */}
                <button onClick={e => { e.stopPropagation(); toggleSelect(reg.id) }}
                  className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{
                    borderColor: isSelected ? "var(--accent)" : "var(--border-strong)",
                    background:  isSelected ? "var(--accent)" : "transparent",
                  }}>
                  {isSelected && <Check size={10} className="text-white" />}
                </button>

                {/* Category dot */}
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: catMeta.color }} />

                {/* Client chip */}
                <span className="text-xs font-medium flex-shrink-0 px-2 py-0.5 rounded-md max-w-[140px] truncate"
                  style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
                  {clientsLabel(reg.clientsAffected)}
                </span>

                {/* Title + meta */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-[13px] font-medium truncate" style={{ color: "var(--text-1)" }}>
                    {reg.title}
                  </span>
                  <span className="hidden lg:inline text-[11px] flex-shrink-0" style={{ color: "var(--text-3)" }}>
                    · {reg.authority.replace(/\s*\([^)]*\)\s*/g, " ").trim()}
                  </span>
                </div>

                {/* AI suggestion chip */}
                <span className="hidden md:flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded flex-shrink-0"
                  style={{ background: "var(--pink-50)", color: "var(--pink-700)" }}>
                  <Sparkles size={10} /> {rec}
                </span>

                {/* Deadline */}
                <span className="flex items-center gap-1 text-[11px] flex-shrink-0 w-20 justify-end"
                  style={{ color: dColor, fontWeight: 600 }}>
                  <Clock size={10} /> {deadlineLabel(days)}
                </span>

                {/* Cost */}
                <span className="text-[11px] font-semibold tabular-nums flex-shrink-0 w-16 text-right"
                  style={{ color: "var(--danger)" }}>
                  {fmtPenalty(cost)}
                </span>

                {/* Expand arrow */}
                <ChevronRight size={14} className="flex-shrink-0 transition-transform"
                  style={{
                    color: "var(--text-3)",
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                  }} />
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-6 lg:px-8 pb-5 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                    {/* Regulation info */}
                    <div className="md:col-span-2 rounded-lg p-4"
                      style={{ background: "var(--surface)" }}>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded"
                          style={{ background: catMeta.bg, color: catMeta.color }}>
                          {catMeta.label}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1"
                          style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
                          <MapPin size={9} /> {reg.region}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1"
                          style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
                          <Calendar size={9} /> Effective {reg.effectiveDate}
                        </span>
                      </div>
                      <div className="text-xs mb-2" style={{ color: "var(--text-2)" }}>
                        {reg.authority}
                      </div>
                      <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                        {reg.summary}
                      </p>
                      {reg.impactAreas.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap mt-3">
                          {reg.impactAreas.map(ia => {
                            const m = IMPACT_AREA_META[ia]
                            return (
                              <span key={ia} className="text-[10px] px-2 py-0.5 rounded font-medium"
                                style={{ background: `${m.color}14`, color: m.color }}>
                                {m.label}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Cost + AI rec */}
                    <div className="space-y-3">
                      <div className="rounded-lg p-3"
                        style={{ background: "var(--danger-bg)", border: "1px solid var(--danger-border)" }}>
                        <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--danger)" }}>
                          Cost of non-compliance
                        </div>
                        <div className="text-[16px] font-bold mt-0.5" style={{ color: "var(--danger)" }}>
                          {fmtPenalty(cost)}
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>
                          Penalty {fmtPenalty(reg.penaltyAmount)} + ops + legal
                        </div>
                      </div>
                      <div className="rounded-lg p-3"
                        style={{ background: "var(--pink-50)", border: "1px solid var(--pink-100)" }}>
                        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold"
                          style={{ color: "var(--pink-700)" }}>
                          <Sparkles size={10} /> AI recommends
                        </div>
                        <div className="text-[13px] font-semibold mt-1" style={{ color: "var(--pink-700)" }}>
                          {rec}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4">
                    <button className="btn-primary flex items-center gap-1.5 text-xs"
                      style={{ padding: "8px 14px" }}>
                      <Check size={12} /> Mark done
                    </button>
                    <button className="btn-ghost flex items-center gap-1.5 text-xs"
                      style={{ padding: "8px 14px" }}>
                      <Mail size={12} /> Notify team
                    </button>
                    <a href={reg.sourceUrl} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs ml-auto transition-opacity hover:opacity-70"
                      style={{ color: "var(--text-3)" }}>
                      <ExternalLink size={11} />
                      {reg.sourceName}
                    </a>
                  </div>
                </div>
              )}

              {/* High risk / overdue marker on left edge */}
              {(reg.legalRisk === "high" || days < 0) && (
                <div style={{
                  position: "absolute",
                  // (visual accent not used — kept simple)
                }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
