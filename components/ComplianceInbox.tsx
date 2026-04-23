"use client"

import { useState, useMemo } from "react"
import {
  REGULATIONS, CATEGORY_META, IMPACT_AREA_META,
  type Regulation, type ImpactArea,
} from "@/lib/compliance-data"
import {
  AlertTriangle, ChevronDown, ChevronRight, Calendar, IndianRupee,
  Users, MapPin, Sparkles, Mail, Check, Clock, ExternalLink,
} from "lucide-react"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPenalty(n: number) {
  if (n === 0) return "—"
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000)     return `₹${(n / 1000).toFixed(0)}k`
  return `₹${n.toLocaleString("en-IN")}`
}

function parseEffectiveDate(s: string): Date {
  // Accepts "Apr 1, 2026" / "Apr 1 2026" / "TBD" patterns
  const d = new Date(s)
  return isNaN(d.getTime()) ? new Date("2026-12-31") : d
}

function daysUntil(s: string): number {
  const target = parseEffectiveDate(s)
  const today  = new Date("2026-04-17")
  const diff   = Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

function deadlineColor(days: number): string {
  if (days < 0)  return "var(--danger)"
  if (days < 7)  return "var(--danger)"
  if (days < 30) return "var(--warn)"
  return "var(--text-2)"
}

function deadlineLabel(days: number): string {
  if (days < 0)   return `Overdue by ${Math.abs(days)}d`
  if (days === 0) return "Due today"
  if (days === 1) return "Due tomorrow"
  if (days < 30)  return `${days}d left`
  if (days < 60)  return `~${Math.floor(days / 7)} weeks`
  return `${Math.floor(days / 30)}mo`
}

/**
 * Estimate total cost of non-compliance per regulation.
 * Combines: penalty + business operations loss + legal/litigation cost.
 */
function totalCostOfNonCompliance(reg: Regulation): number {
  const penalty = reg.penaltyAmount
  // Operational impact multiplier (business loss from disruption)
  const opMultiplier = reg.operationalImpact === "high" ? 2.5 : reg.operationalImpact === "medium" ? 1.2 : 0.4
  const opLoss = Math.round(penalty * opMultiplier)
  // Legal cost depends on risk
  const legalCost = reg.legalRisk === "high" ? Math.max(50000, penalty * 0.3)
                  : reg.legalRisk === "medium" ? Math.max(25000, penalty * 0.15)
                  : 10000
  return Math.round(penalty + opLoss + legalCost)
}

/**
 * AI-recommended action text based on regulation category.
 */
function recommendedAction(reg: Regulation): { label: string; detail: string; template: string } {
  const firstImpactArea = reg.impactAreas[0]
  switch (reg.category) {
    case "Labour":
      return {
        label: "Update payroll rules",
        detail: "ORACLE detected payroll impact. JARVIS needs policy update before effective date.",
        template: `Notify HR + update JARVIS validation rules for "${reg.title}"`,
      }
    case "Finance & Taxation":
      return {
        label: "Update tax config",
        detail: "Configure payroll tax deductions and notify finance team.",
        template: `Update TDS/tax config + notify finance lead`,
      }
    case "EHS":
      return {
        label: "Compliance audit",
        detail: "Run site safety audit and document training completion.",
        template: `Schedule site audit + train workers`,
      }
    case "Commercial":
      return {
        label: "Review contracts",
        detail: "Update standard contract templates and vendor agreements.",
        template: `Update contract templates for affected clients`,
      }
    case "Secretarial":
      return {
        label: "Update filings",
        detail: "File required disclosures within deadline.",
        template: `Prepare required filings + set reminders`,
      }
    default:
      return {
        label: "Review & act",
        detail: `Review the ${firstImpactArea ?? "impact"} area and assign to relevant owner.`,
        template: `Review notification + assign owner`,
      }
  }
}

// ─── Scope estimation ────────────────────────────────────────────────────────

interface ClientGroup {
  client:          string
  regulations:     Regulation[]
  totalPenalty:    number
  totalCost:       number
  nearestDeadline: number   // days
  highRiskCount:   number
  actionCount:     number
}

function groupByClient(regs: Regulation[]): ClientGroup[] {
  const map = new Map<string, Regulation[]>()
  for (const r of regs) {
    for (const c of r.clientsAffected) {
      const isWildcard = c.startsWith("All ")
      const key = isWildcard ? "All clients" : c
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
  }
  const groups: ClientGroup[] = []
  for (const [client, regulations] of map) {
    const totalPenalty = regulations.reduce((s, r) => s + r.penaltyAmount, 0)
    const totalCost    = regulations.reduce((s, r) => s + totalCostOfNonCompliance(r), 0)
    const deadlines    = regulations.map(r => daysUntil(r.effectiveDate))
    groups.push({
      client,
      regulations,
      totalPenalty,
      totalCost,
      nearestDeadline: Math.min(...deadlines),
      highRiskCount:   regulations.filter(r => r.legalRisk === "high").length,
      actionCount:     regulations.filter(r => r.actionRequired).length,
    })
  }
  // Sort by nearest deadline ascending (most urgent first)
  return groups.sort((a, b) => a.nearestDeadline - b.nearestDeadline)
}

// ─── Component ────────────────────────────────────────────────────────────────

type SortMode = "deadline" | "cost" | "count"

export default function ComplianceInbox() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [sortBy,   setSortBy]   = useState<SortMode>("deadline")

  // Only action-required regulations
  const actionable = useMemo(
    () => REGULATIONS.filter(r => r.actionRequired),
    []
  )

  const groups = useMemo(() => {
    const g = groupByClient(actionable)
    if (sortBy === "cost")  return [...g].sort((a, b) => b.totalCost - a.totalCost)
    if (sortBy === "count") return [...g].sort((a, b) => b.regulations.length - a.regulations.length)
    return g
  }, [actionable, sortBy])

  function toggleExpanded(client: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(client) ? next.delete(client) : next.add(client)
      return next
    })
  }

  const totalPenalty = actionable.reduce((s, r) => s + r.penaltyAmount, 0)
  const totalCost    = actionable.reduce((s, r) => s + totalCostOfNonCompliance(r), 0)
  const overdueCount = actionable.filter(r => daysUntil(r.effectiveDate) < 0).length
  const urgentCount  = actionable.filter(r => {
    const d = daysUntil(r.effectiveDate)
    return d >= 0 && d < 7
  }).length

  return (
    <div className="flex flex-col h-full">

      {/* Summary bar + sort */}
      <div className="flex items-center gap-4 px-6 lg:px-8 py-4 flex-shrink-0"
        style={{ background: "var(--surface)", boxShadow: "0 1px 0 var(--border)" }}>
        <div className="flex items-center gap-6 text-xs" style={{ color: "var(--text-3)" }}>
          <div>
            <span style={{ color: "var(--danger)", fontWeight: 600 }}>{overdueCount}</span> overdue
          </div>
          <div>
            <span style={{ color: "var(--warn)", fontWeight: 600 }}>{urgentCount}</span> due this week
          </div>
          <div className="flex items-center gap-1">
            <IndianRupee size={11} style={{ color: "var(--danger)" }} />
            <span style={{ color: "var(--danger)", fontWeight: 600 }}>
              {fmtPenalty(totalCost)}
            </span>
            total non-compliance exposure
          </div>
          <div style={{ color: "var(--text-3)" }}>
            (penalty: {fmtPenalty(totalPenalty)})
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--text-3)" }}>Sort by</span>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as SortMode)}
            className="glass-input py-1.5 text-xs" style={{ width: 140 }}>
            <option value="deadline">Nearest deadline</option>
            <option value="cost">Highest cost</option>
            <option value="count">Most regulations</option>
          </select>
        </div>
      </div>

      {/* Client groups */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-6 space-y-3">
          {groups.length === 0 && (
            <div className="text-center py-20 text-sm" style={{ color: "var(--text-3)" }}>
              No action-required regulations at the moment
            </div>
          )}

          {groups.map(g => {
            const isOpen = expanded.has(g.client)
            const deadlineC = deadlineColor(g.nearestDeadline)

            return (
              <div key={g.client} className="glass overflow-hidden">
                {/* Group header (clickable) */}
                <button onClick={() => toggleExpanded(g.client)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors"
                  style={{ background: isOpen ? "var(--surface-hover)" : "var(--surface)" }}>
                  {isOpen
                    ? <ChevronDown size={16} style={{ color: "var(--text-3)" }} />
                    : <ChevronRight size={16} style={{ color: "var(--text-3)" }} />
                  }

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>
                        {g.client}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md font-medium"
                        style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
                        {g.regulations.length} regulations
                      </span>
                      {g.highRiskCount > 0 && (
                        <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium"
                          style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
                          <AlertTriangle size={10} /> {g.highRiskCount} high risk
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs" style={{ color: "var(--text-3)" }}>
                      <span className="flex items-center gap-1" style={{ color: deadlineC, fontWeight: 500 }}>
                        <Clock size={11} /> {deadlineLabel(g.nearestDeadline)}
                      </span>
                      <span>
                        Total exposure:{" "}
                        <span style={{ color: "var(--danger)", fontWeight: 600 }}>
                          {fmtPenalty(g.totalCost)}
                        </span>
                      </span>
                    </div>
                  </div>
                </button>

                {/* Expanded regulations */}
                {isOpen && (
                  <div className="animate-fade-in" style={{ borderTop: "1px solid var(--border)" }}>
                    {g.regulations.map(reg => {
                      const days       = daysUntil(reg.effectiveDate)
                      const dCol       = deadlineColor(days)
                      const catMeta    = CATEGORY_META[reg.category]
                      const rec        = recommendedAction(reg)
                      const cost       = totalCostOfNonCompliance(reg)

                      // Impact scope: figure out who's affected
                      const scope = reg.clientsAffected.includes("All clients")
                        ? "All clients"
                        : reg.clientsAffected.length === 1
                          ? `${reg.clientsAffected[0]} only`
                          : `${reg.clientsAffected.length} clients`

                      return (
                        <div key={reg.id} className="px-5 py-4"
                          style={{ borderBottom: "1px solid var(--border)" }}>

                          {/* Header row */}
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md"
                                  style={{ background: catMeta.bg, color: catMeta.color }}>
                                  {catMeta.label}
                                </span>
                                <span className="text-[11px] px-2 py-0.5 rounded-md flex items-center gap-1"
                                  style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
                                  <MapPin size={9} /> {reg.region}
                                </span>
                                <span className="text-[11px] flex items-center gap-1 ml-auto"
                                  style={{ color: dCol, fontWeight: 600 }}>
                                  <Calendar size={10} />
                                  Effective {reg.effectiveDate} · {deadlineLabel(days)}
                                </span>
                              </div>
                              <h4 className="text-[14px] font-semibold leading-snug" style={{ color: "var(--text-1)" }}>
                                {reg.title}
                              </h4>
                              <div className="text-xs mt-1" style={{ color: "var(--text-2)" }}>
                                {reg.authority}
                              </div>
                            </div>
                          </div>

                          {/* Impact scope + cost of non-compliance (RED) */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                            <div className="rounded-lg p-3"
                              style={{ background: "var(--surface-2)" }}>
                              <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
                                Impact scope
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 text-[13px] font-medium" style={{ color: "var(--text-1)" }}>
                                <Users size={13} style={{ color: "var(--text-2)" }} />
                                {scope}
                              </div>
                              {reg.impactAreas.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap mt-1.5">
                                  {reg.impactAreas.slice(0, 2).map(ia => {
                                    const m = IMPACT_AREA_META[ia as ImpactArea]
                                    return (
                                      <span key={ia} className="text-[10px] px-1.5 py-0.5 rounded"
                                        style={{ background: `${m.color}12`, color: m.color }}>
                                        {m.label}
                                      </span>
                                    )
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Cost of non-compliance — RED */}
                            <div className="rounded-lg p-3"
                              style={{ background: "var(--danger-bg)", border: "1px solid var(--danger-border)" }}>
                              <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--danger)" }}>
                                Cost of non-compliance
                              </div>
                              <div className="flex items-center gap-1 mt-1 text-[15px] font-bold" style={{ color: "var(--danger)" }}>
                                <IndianRupee size={13} />
                                {fmtPenalty(cost)}
                              </div>
                              <div className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>
                                Penalty + ops loss + legal
                              </div>
                            </div>

                            {/* AI Recommendation */}
                            <div className="rounded-lg p-3 md:col-span-1 col-span-2"
                              style={{ background: "var(--pink-50)", border: "1px solid var(--pink-100)" }}>
                              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider"
                                style={{ color: "var(--pink-700)" }}>
                                <Sparkles size={10} />
                                AI recommends
                              </div>
                              <div className="text-[13px] font-semibold mt-1" style={{ color: "var(--pink-700)" }}>
                                {rec.label}
                              </div>
                              <div className="text-[10px] mt-0.5 line-clamp-2" style={{ color: "var(--text-2)" }}>
                                {rec.detail}
                              </div>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-2 mt-3">
                            <button className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3">
                              <Check size={12} /> Mark as done
                            </button>
                            <button className="btn-ghost flex items-center gap-1.5 text-xs py-2 px-3">
                              <Mail size={12} /> Notify team
                            </button>
                            <a href={reg.sourceUrl} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs ml-auto transition-opacity hover:opacity-70"
                              style={{ color: "var(--text-3)" }}>
                              <ExternalLink size={11} />
                              {reg.sourceName}
                            </a>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
