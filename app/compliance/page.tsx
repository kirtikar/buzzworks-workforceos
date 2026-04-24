"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import BottomNav from "@/components/BottomNav"
import {
  ExternalLink, Search, AlertTriangle, ChevronDown,
  Calendar, Building2, X, Tag, MapPin, Briefcase,
  ChevronLeft, ChevronRight, IndianRupee,
} from "lucide-react"
import {
  REGULATIONS, CATEGORY_META, RISK_META, IMPACT_AREA_META, REGIONS,
  getAllAffectedClients,
  type ComplianceCategory, type RiskLevel, type ImpactArea,
} from "@/lib/compliance-data"
import clsx from "clsx"

const PAGE_SIZE = 25

// ─── Filter Dropdown ──────────────────────────────────────────────────────────

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
            style={{ background: "var(--accent)", color: "#fff" }}>
            {selected.length}
          </span>
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
                className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs transition-colors"
                style={{
                  color: selected.includes(opt.value) ? "var(--text-1)" : "var(--text-2)",
                  background: selected.includes(opt.value) ? "var(--pink-50)" : "transparent",
                }}>
                <span className={clsx("w-3.5 h-3.5 rounded flex-shrink-0 border flex items-center justify-center",
                  selected.includes(opt.value) ? "border-[color:var(--accent)]" : "border-[color:var(--border-strong)]")}
                  style={{ background: selected.includes(opt.value) ? "var(--accent)" : "transparent" }}>
                  {selected.includes(opt.value) && <span className="text-white text-[11px] font-bold">✓</span>}
                </span>
                {opt.color && (
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: opt.color }} />
                )}
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Categories & Options ─────────────────────────────────────────────────────

const CATEGORIES: ComplianceCategory[] = [
  "Labour", "Finance & Taxation", "EHS", "Commercial",
  "Secretarial", "Industry Specific", "General",
]
const IMPACT_AREAS: ImpactArea[] = [
  "Payroll", "HR Operations", "Compliance Management", "Worker Onboarding",
  "Employee Welfare", "Tax Filing", "Legal Documentation", "Workplace Safety",
  "Contract Management", "Account Management",
]
const RISK_LEVELS: RiskLevel[] = ["high", "medium", "low"]

function fmtPenalty(n: number) {
  if (n === 0) return "—"
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000)     return `₹${(n / 1000).toFixed(0)}k`
  return `₹${n.toLocaleString("en-IN")}`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const router = useRouter()
  const [selCategories,   setSelCategories]   = useState<ComplianceCategory[]>([])
  const [selClients,      setSelClients]      = useState<string[]>([])
  const [selRegions,      setSelRegions]      = useState<string[]>([])
  const [selImpactAreas,  setSelImpactAreas]  = useState<ImpactArea[]>([])
  const [selRisk,         setSelRisk]         = useState<RiskLevel[]>([])
  const [search,          setSearch]          = useState("")
  const [actionOnly,      setActionOnly]      = useState(false)
  const [page,            setPage]            = useState(1)

  function toggle<T>(arr: T[], set: (v: T[]) => void, val: T) {
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
    setPage(1)
  }

  const allClients = useMemo(() => getAllAffectedClients(), [])

  const filtered = useMemo(() => {
    let list = [...REGULATIONS]
    if (selCategories.length)  list = list.filter(r => selCategories.includes(r.category))
    if (selRegions.length)     list = list.filter(r => selRegions.includes(r.region))
    if (selImpactAreas.length) list = list.filter(r => r.impactAreas.some(ia => selImpactAreas.includes(ia)))
    if (selRisk.length)        list = list.filter(r => selRisk.includes(r.legalRisk))
    if (selClients.length)     list = list.filter(r => r.clientsAffected.some(c => selClients.includes(c)))
    if (actionOnly)            list = list.filter(r => r.actionRequired)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.authority.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        r.reference.toLowerCase().includes(q)
      )
    }
    return list
  }, [selCategories, selRegions, selImpactAreas, selRisk, selClients, search, actionOnly])

  const totalPenaltyExposure = useMemo(
    () => filtered.reduce((s, r) => s + r.penaltyAmount, 0),
    [filtered]
  )

  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  const activeFilterCount =
    selCategories.length + selRisk.length + selClients.length +
    selRegions.length + selImpactAreas.length + (actionOnly ? 1 : 0)
  const actionCount = REGULATIONS.filter(r => r.actionRequired).length

  const categoryOptions    = CATEGORIES.map(c => ({ value: c, label: CATEGORY_META[c].label, color: CATEGORY_META[c].color }))
  const riskOptions        = RISK_LEVELS.map(r => ({ value: r, label: RISK_META[r].label, color: RISK_META[r].color }))
  const clientOptions      = allClients.map(c => ({ value: c, label: c }))
  const regionOptions      = REGIONS.map(r => ({ value: r, label: r }))
  const impactAreaOptions  = IMPACT_AREAS.map(a => ({ value: a, label: IMPACT_AREA_META[a].label, color: IMPACT_AREA_META[a].color }))

  return (
    <div className="flex h-screen overflow-hidden app-bg">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header — matches Inbox pattern (no icon, title + subtitle) */}
        <header className="px-6 lg:px-8 py-5 flex-shrink-0" style={{ background: "var(--surface)", boxShadow: "0 1px 0 var(--border)" }}>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-1)" }}>Compliance</h1>
            <p className="text-[14px] mt-0.5" style={{ color: "var(--text-3)" }}>
              {REGULATIONS.length.toLocaleString()} regulations · {actionCount} need action
            </p>
          </div>
        </header>

        {/* Filters */}
        <div className="px-6 lg:px-8 py-3 flex-shrink-0" style={{ background: "var(--surface)", boxShadow: "0 1px 0 var(--border)" }}>
          <div className="flex flex-wrap items-center gap-2">

            <FilterDropdown label="Category" icon={Tag} options={categoryOptions}
              selected={selCategories as string[]}
              onToggle={v => toggle(selCategories, setSelCategories, v as ComplianceCategory)}
              onClear={() => { setSelCategories([]); setPage(1) }} />

            <FilterDropdown label="Impact area" icon={Briefcase} options={impactAreaOptions}
              selected={selImpactAreas as string[]}
              onToggle={v => toggle(selImpactAreas, setSelImpactAreas, v as ImpactArea)}
              onClear={() => { setSelImpactAreas([]); setPage(1) }} />

            <FilterDropdown label="Region" icon={MapPin} options={regionOptions}
              selected={selRegions}
              onToggle={v => toggle(selRegions, setSelRegions, v)}
              onClear={() => { setSelRegions([]); setPage(1) }} />

            <FilterDropdown label="Client" icon={Building2} options={clientOptions}
              selected={selClients}
              onToggle={v => toggle(selClients, setSelClients, v)}
              onClear={() => { setSelClients([]); setPage(1) }} />

            <FilterDropdown label="Legal risk" options={riskOptions}
              selected={selRisk as string[]}
              onToggle={v => toggle(selRisk, setSelRisk, v as RiskLevel)}
              onClear={() => { setSelRisk([]); setPage(1) }} />

            <button
              onClick={() => { setActionOnly(!actionOnly); setPage(1) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all whitespace-nowrap"
              style={{
                background: actionOnly ? "var(--warn-bg)" : "var(--surface)",
                color: actionOnly ? "var(--warn)" : "var(--text-2)",
                borderColor: actionOnly ? "var(--warn-border)" : "var(--border)",
              }}
            >
              <AlertTriangle size={12} />
              Action required
            </button>

            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-xs ml-auto">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
              <input
                className="glass-input pl-8 text-xs py-2 w-full"
                placeholder="Search regulations, authorities…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
              />
            </div>

            {activeFilterCount > 0 && (
              <button onClick={() => {
                setSelCategories([]); setSelClients([]); setSelRisk([]);
                setSelRegions([]); setSelImpactAreas([]);
                setActionOnly(false); setSearch(""); setPage(1)
              }}
                className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-semibold"
                style={{ color: "var(--danger)", background: "var(--danger-bg)", border: "1px solid var(--danger-border)" }}>
                <X size={11} /> Clear ({activeFilterCount})
              </button>
            )}
          </div>
        </div>

        {/* Newsfeed */}
        <div className="flex-1 overflow-y-auto pb-nav lg:pb-0">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 py-6">

            <div className="flex items-center justify-between mb-4 text-xs" style={{ color: "var(--text-3)" }}>
              <span>
                Showing {paginated.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()} regulations
              </span>
              {totalPenaltyExposure > 0 && (
                <span className="flex items-center gap-1.5">
                  <IndianRupee size={11} style={{ color: "var(--warn)" }} />
                  <span style={{ color: "var(--warn)", fontWeight: 600 }}>
                    {fmtPenalty(totalPenaltyExposure)}
                  </span>
                  potential penalty exposure in current view
                </span>
              )}
            </div>

            <div className="space-y-3">
              {paginated.map(reg => {
                const catMeta    = CATEGORY_META[reg.category]
                const legalMeta  = RISK_META[reg.legalRisk]
                const opMeta     = RISK_META[reg.operationalImpact]

                return (
                  <article key={reg.id}
                    onClick={() => router.push(`/compliance/${reg.id}`)}
                    className="glass p-6 transition-shadow hover:shadow-lg cursor-pointer">

                    {/* Top meta row */}
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <span className="text-[11px] font-medium px-2.5 py-1 rounded-md flex items-center gap-1.5"
                        style={{ background: catMeta.bg, color: catMeta.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: catMeta.color }} />
                        {catMeta.label}
                      </span>
                      <span className="text-[11px] font-medium px-2.5 py-1 rounded-md flex items-center gap-1"
                        style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
                        <MapPin size={10} /> {reg.region}
                      </span>
                      {reg.actionRequired && (
                        <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md"
                          style={{ background: "var(--warn-bg)", color: "var(--warn)" }}>
                          <AlertTriangle size={10} /> Action required
                        </span>
                      )}
                      <span className="text-[11px] ml-auto" style={{ color: "var(--text-3)" }}>
                        {reg.date}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-[14px] font-semibold leading-snug" style={{ color: "var(--text-1)" }}>
                      {reg.title}
                    </h3>

                    {/* Authority · Effective */}
                    <div className="flex items-center gap-3 mt-2 text-xs flex-wrap" style={{ color: "var(--text-2)" }}>
                      <span>{reg.authority}</span>
                      <span className="flex items-center gap-1" style={{ color: "var(--text-3)" }}>
                        <Calendar size={11} /> Effective {reg.effectiveDate}
                      </span>
                    </div>

                    {/* Summary */}
                    <p className="text-[14px] leading-relaxed mt-3" style={{ color: "var(--text-2)" }}>
                      {reg.summary}
                    </p>

                    {/* Impact area chips */}
                    {reg.impactAreas.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-3">
                        <Briefcase size={11} style={{ color: "var(--text-3)" }} />
                        {reg.impactAreas.map(ia => {
                          const m = IMPACT_AREA_META[ia]
                          return (
                            <span key={ia} className="text-[11px] px-2 py-0.5 rounded-md font-medium"
                              style={{ background: `${m.color}12`, color: m.color }}>
                              {m.label}
                            </span>
                          )
                        })}
                      </div>
                    )}

                    {/* Cost of non-compliance row */}
                    <div className="grid grid-cols-3 gap-3 mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                      <div>
                        <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: "var(--text-3)" }}>
                          Penalty exposure
                        </div>
                        <div className="text-[14px] font-semibold tabular-nums"
                          style={{ color: reg.penaltyAmount > 0 ? "var(--warn)" : "var(--text-3)" }}>
                          {fmtPenalty(reg.penaltyAmount)}
                        </div>
                        {reg.penaltyDescription && (
                          <div className="text-[11px] mt-0.5 line-clamp-2" style={{ color: "var(--text-3)" }}>
                            {reg.penaltyDescription}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: "var(--text-3)" }}>
                          Legal risk
                        </div>
                        <div className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md"
                          style={{ background: legalMeta.bg, color: legalMeta.color }}>
                          {legalMeta.label}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: "var(--text-3)" }}>
                          Operational impact
                        </div>
                        <div className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md"
                          style={{ background: opMeta.bg, color: opMeta.color }}>
                          {opMeta.label}
                        </div>
                      </div>
                    </div>

                    {/* Impacted clients + source */}
                    <div className="flex items-center gap-2 flex-wrap mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                      <span className="text-[11px] font-medium" style={{ color: "var(--text-3)" }}>Impacted:</span>
                      {reg.clientsAffected.map(c => (
                        <span key={c} className="text-[11px] px-2 py-0.5 rounded-md"
                          style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
                          {c}
                        </span>
                      ))}
                      <a href={reg.sourceUrl} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="ml-auto flex items-center gap-1 text-[11px] font-medium transition-opacity hover:opacity-70"
                        style={{ color: "var(--accent)" }}>
                        <ExternalLink size={11} />
                        {reg.sourceName}
                      </a>
                    </div>
                  </article>
                )
              })}
            </div>

            {paginated.length === 0 && (
              <div className="text-center py-20 text-sm" style={{ color: "var(--text-3)" }}>
                No regulations match the current filters
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 mt-6">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 transition-all"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
                  <ChevronLeft size={14} />
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
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
