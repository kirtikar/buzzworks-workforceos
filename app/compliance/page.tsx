"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import Sidebar from "@/components/Sidebar"
import BottomNav from "@/components/BottomNav"
import {
  Scale, ExternalLink, Search, AlertTriangle, ChevronDown,
  Calendar, Building2, X, Tag,
} from "lucide-react"
import {
  REGULATIONS, CATEGORY_META, IMPACT_META,
  getAllAffectedClients,
  type ComplianceCategory, type ImpactLevel,
} from "@/lib/compliance-data"
import clsx from "clsx"

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
          <span className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
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
                  {selected.includes(opt.value) && <span className="text-white text-[8px] font-bold">✓</span>}
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

const CATEGORIES: ComplianceCategory[] = ["Labour", "Finance & Taxation", "EHS", "Commercial", "Secretarial"]
const IMPACTS:    ImpactLevel[]         = ["high", "medium", "low"]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const [selCategories, setSelCategories] = useState<ComplianceCategory[]>([])
  const [selClients,    setSelClients]    = useState<string[]>([])
  const [selImpact,     setSelImpact]     = useState<ImpactLevel[]>([])
  const [search,        setSearch]        = useState("")
  const [actionOnly,    setActionOnly]    = useState(false)

  function toggle<T>(arr: T[], set: (v: T[]) => void, val: T) {
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  const allClients = useMemo(() => getAllAffectedClients(), [])

  const filtered = useMemo(() => {
    let list = [...REGULATIONS]
    if (selCategories.length) list = list.filter(r => selCategories.includes(r.category))
    if (selImpact.length)     list = list.filter(r => selImpact.includes(r.impact))
    if (selClients.length)    list = list.filter(r => r.clientsAffected.some(c => selClients.includes(c)))
    if (actionOnly)           list = list.filter(r => r.actionRequired)
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
  }, [selCategories, selImpact, selClients, search, actionOnly])

  const activeFilterCount = selCategories.length + selImpact.length + selClients.length + (actionOnly ? 1 : 0)
  const highImpactCount = REGULATIONS.filter(r => r.impact === "high").length
  const actionCount     = REGULATIONS.filter(r => r.actionRequired).length

  const categoryOptions = CATEGORIES.map(c => ({ value: c, label: CATEGORY_META[c].label, color: CATEGORY_META[c].color }))
  const impactOptions   = IMPACTS.map(i => ({ value: i, label: IMPACT_META[i].label, color: IMPACT_META[i].color }))
  const clientOptions   = allClients.map(c => ({ value: c, label: c }))

  return (
    <div className="flex h-screen overflow-hidden app-bg">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="px-6 lg:px-8 py-5 flex-shrink-0" style={{ background: "var(--surface)", boxShadow: "0 1px 0 var(--border)" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Scale size={20} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
              <div>
                <h1 className="text-xl font-semibold" style={{ color: "var(--text-1)" }}>Compliance</h1>
                <p className="text-[13px] mt-0.5" style={{ color: "var(--text-3)" }}>
                  {REGULATIONS.length} regulations · {highImpactCount} high impact · {actionCount} need action
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Filters — flex-wrap allows dropdowns to escape without clipping */}
        <div className="px-6 lg:px-8 py-3 flex-shrink-0" style={{ background: "var(--surface)", boxShadow: "0 1px 0 var(--border)" }}>
          <div className="flex flex-wrap items-center gap-2">

            <FilterDropdown label="Category" icon={Tag} options={categoryOptions}
              selected={selCategories as string[]}
              onToggle={v => toggle(selCategories, setSelCategories, v as ComplianceCategory)}
              onClear={() => setSelCategories([])} />

            <FilterDropdown label="Client" icon={Building2} options={clientOptions}
              selected={selClients}
              onToggle={v => toggle(selClients, setSelClients, v)}
              onClear={() => setSelClients([])} />

            <FilterDropdown label="Impact" options={impactOptions}
              selected={selImpact as string[]}
              onToggle={v => toggle(selImpact, setSelImpact, v as ImpactLevel)}
              onClear={() => setSelImpact([])} />

            <button
              onClick={() => setActionOnly(!actionOnly)}
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
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {activeFilterCount > 0 && (
              <button onClick={() => { setSelCategories([]); setSelClients([]); setSelImpact([]); setActionOnly(false); setSearch("") }}
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

            <div className="text-xs mb-4" style={{ color: "var(--text-3)" }}>
              {filtered.length} of {REGULATIONS.length} regulations
            </div>

            <div className="space-y-3">
              {filtered.map(reg => {
                const catMeta    = CATEGORY_META[reg.category]
                const impactMeta = IMPACT_META[reg.impact]

                return (
                  <article key={reg.id} className="glass p-6 transition-shadow hover:shadow-lg">

                    {/* Top meta row */}
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <span className="text-[11px] font-medium px-2.5 py-1 rounded-md flex items-center gap-1.5"
                        style={{ background: catMeta.bg, color: catMeta.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: catMeta.color }} />
                        {catMeta.label}
                      </span>
                      <span className="text-[11px] font-medium px-2.5 py-1 rounded-md"
                        style={{ background: impactMeta.bg, color: impactMeta.color }}>
                        {impactMeta.label}
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
                    <h3 className="text-[15px] font-semibold leading-snug" style={{ color: "var(--text-1)" }}>
                      {reg.title}
                    </h3>

                    {/* Authority · Reference · Effective */}
                    <div className="flex items-center gap-3 mt-2 text-xs flex-wrap" style={{ color: "var(--text-2)" }}>
                      <span>{reg.authority}</span>
                      <span className="flex items-center gap-1" style={{ color: "var(--text-3)" }}>
                        <Calendar size={11} /> Effective {reg.effectiveDate}
                      </span>
                    </div>

                    {/* Summary */}
                    <p className="text-[13px] leading-relaxed mt-3" style={{ color: "var(--text-2)" }}>
                      {reg.summary}
                    </p>

                    {/* Key changes */}
                    {reg.keyChanges.length > 0 && (
                      <ul className="mt-4 space-y-1.5">
                        {reg.keyChanges.slice(0, 3).map((c, i) => (
                          <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: "var(--text-2)" }}>
                            <span className="w-1 h-1 rounded-full mt-2 flex-shrink-0" style={{ background: catMeta.color }} />
                            {c}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Impacted clients as tags */}
                    <div className="flex items-center gap-2 flex-wrap mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                      <span className="text-[11px] font-medium" style={{ color: "var(--text-3)" }}>Impacted:</span>
                      {reg.clientsAffected.map(c => (
                        <span key={c} className="text-[11px] px-2 py-0.5 rounded-md"
                          style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
                          {c}
                        </span>
                      ))}
                      <a href={reg.sourceUrl} target="_blank" rel="noopener noreferrer"
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

            {filtered.length === 0 && (
              <div className="text-center py-20 text-sm" style={{ color: "var(--text-3)" }}>
                No regulations match the current filters
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
