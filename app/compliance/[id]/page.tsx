"use client"

import { useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Sidebar from "@/components/Sidebar"
import BottomNav from "@/components/BottomNav"
import NotifyPanel, { buildComplianceNotify, type NotifyContext } from "@/components/NotifyPanel"
import {
  REGULATIONS, CATEGORY_META, IMPACT_AREA_META, RISK_META,
  getArticleContent, getRelatedRegulations,
} from "@/lib/compliance-data"
import {
  ArrowLeft, Calendar, MapPin, AlertTriangle, ExternalLink, Share2,
  Bookmark, Mail, Check, IndianRupee, Building2, FileText,
  ChevronRight, Clock, Sparkles, Tag,
} from "lucide-react"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPenalty(n: number) {
  if (n === 0) return "—"
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000)     return `₹${(n / 1000).toFixed(0)}k`
  return `₹${n.toLocaleString("en-IN")}`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComplianceArticlePage() {
  const params = useParams<{ id: string }>()
  const [notifyCtx, setNotifyCtx] = useState<NotifyContext | null>(null)
  const [isBookmarked, setIsBookmarked] = useState(false)

  const reg = useMemo(() => {
    const id = parseInt(params.id, 10)
    return REGULATIONS.find(r => r.id === id)
  }, [params.id])

  const article = useMemo(() => reg ? getArticleContent(reg) : null, [reg])
  const related = useMemo(() => reg ? getRelatedRegulations(reg, 5) : [], [reg])

  if (!reg || !article) {
    return (
      <div className="flex h-screen overflow-hidden app-bg">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-base font-semibold mb-2" style={{ color: "var(--text-1)" }}>
              Regulation not found
            </div>
            <Link href="/compliance" className="text-sm" style={{ color: "var(--accent)" }}>
              ← Back to Compliance
            </Link>
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  const catMeta    = CATEGORY_META[reg.category]
  const legalMeta  = RISK_META[reg.legalRisk]
  const opMeta     = RISK_META[reg.operationalImpact]

  function openNotify() {
    setNotifyCtx(buildComplianceNotify({
      title:         reg!.title,
      authority:     reg!.authority,
      region:        reg!.region,
      effectiveDate: reg!.effectiveDate,
      deadline:      reg!.effectiveDate,
      penalty:       fmtPenalty(reg!.penaltyAmount),
      sourceUrl:     reg!.sourceUrl,
      sourceName:    reg!.sourceName,
      clients:       reg!.clientsAffected,
    }))
  }

  return (
    <div className="flex h-screen overflow-hidden app-bg">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top breadcrumb bar */}
        <div className="px-6 lg:px-8 py-3 flex items-center gap-2 flex-shrink-0"
          style={{ background: "var(--surface)", boxShadow: "0 1px 0 var(--border)" }}>
          <Link href="/compliance"
            className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: "var(--text-2)" }}>
            <ArrowLeft size={14} /> Compliance
          </Link>
          <ChevronRight size={14} style={{ color: "var(--text-3)" }} />
          <span className="text-sm truncate" style={{ color: "var(--text-3)" }}>
            {reg.category} · {reg.region}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setIsBookmarked(!isBookmarked)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: isBookmarked ? "var(--pink-50)" : "transparent",
                color: isBookmarked ? "var(--pink-700)" : "var(--text-2)",
                border: "1px solid var(--border)",
              }}>
              <Bookmark size={12} fill={isBookmarked ? "currentColor" : "none"} />
              {isBookmarked ? "Bookmarked" : "Bookmark"}
            </button>
            <button onClick={openNotify}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: "var(--surface)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
              <Share2 size={12} />
              Share
            </button>
            {reg.actionRequired && (
              <button onClick={openNotify}
                className="btn-primary flex items-center gap-1.5 text-xs"
                style={{ padding: "6px 14px" }}>
                <Mail size={12} /> Notify team
              </button>
            )}
          </div>
        </div>

        {/* Article body */}
        <div className="flex-1 overflow-y-auto pb-nav lg:pb-0">
          <div className="max-w-3xl mx-auto px-6 lg:px-8 py-8">

            {/* Meta tags row */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-md flex items-center gap-1.5"
                style={{ background: catMeta.bg, color: catMeta.color }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: catMeta.color }} />
                {catMeta.label}
              </span>
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-md flex items-center gap-1"
                style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
                <MapPin size={11} /> {reg.region}
              </span>
              {reg.actionRequired && (
                <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md"
                  style={{ background: "var(--warn-bg)", color: "var(--warn)" }}>
                  <AlertTriangle size={11} /> Action required
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-[28px] lg:text-[28px] font-bold leading-[1.2] tracking-tight mb-3"
              style={{ color: "var(--text-1)" }}>
              {reg.title}
            </h1>

            {/* Byline */}
            <div className="flex items-center gap-3 flex-wrap mb-6 pb-6"
              style={{ borderBottom: "1px solid var(--border)" }}>
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
                  {reg.authority}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                  {reg.date} · Ref: <span className="font-mono">{reg.reference}</span>
                </div>
              </div>
              <a href={reg.sourceUrl} target="_blank" rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{ background: "var(--pink-50)", color: "var(--pink-700)", border: "1px solid var(--pink-100)" }}>
                <ExternalLink size={12} />
                View on {reg.sourceName}
              </a>
            </div>

            {/* Lead */}
            <p className="text-[16px] leading-relaxed mb-6" style={{ color: "var(--text-1)" }}>
              {article.intro}
            </p>

            {/* Context */}
            <section className="mb-8">
              <h2 className="text-[14px] font-semibold uppercase tracking-wider mb-2"
                style={{ color: "var(--text-3)" }}>
                Background &amp; context
              </h2>
              <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                {article.context}
              </p>
            </section>

            {/* Key changes */}
            <section className="mb-8">
              <h2 className="text-[14px] font-semibold uppercase tracking-wider mb-3"
                style={{ color: "var(--text-3)" }}>
                Key changes
              </h2>
              <ul className="space-y-2.5">
                {reg.keyChanges.map((c, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: catMeta.color }} />
                    <span className="text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>{c}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Requirements */}
            <section className="mb-8">
              <h2 className="text-[14px] font-semibold uppercase tracking-wider mb-3"
                style={{ color: "var(--text-3)" }}>
                Compliance requirements
              </h2>
              <ol className="space-y-3">
                {article.requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
                      style={{ background: "var(--pink-50)", color: "var(--pink-700)" }}>
                      {i + 1}
                    </span>
                    <span className="text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>{req}</span>
                  </li>
                ))}
              </ol>
            </section>

            {/* Effective date */}
            <section className="mb-8 p-4 rounded-xl"
              style={{ background: "var(--surface-2)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={15} style={{ color: "var(--text-2)" }} />
                <h2 className="text-[14px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-2)" }}>
                  Effective date &amp; timeline
                </h2>
              </div>
              <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                {article.deadlines}
              </p>
            </section>

            {/* Penalty & risk */}
            <section className="mb-8 p-4 rounded-xl"
              style={{ background: "var(--warn-bg)", border: "1px solid var(--warn-border)" }}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={15} style={{ color: "var(--warn)" }} />
                <h2 className="text-[14px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--warn)" }}>
                  Penalty &amp; risk
                </h2>
              </div>
              <p className="text-[14px] leading-relaxed mb-4" style={{ color: "var(--text-2)" }}>
                {article.penaltySection}
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg p-3 bg-white dark:bg-transparent"
                  style={{ background: "var(--surface)" }}>
                  <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: "var(--text-3)" }}>
                    Max penalty
                  </div>
                  <div className="flex items-center gap-1 text-[14px] font-semibold tabular-nums"
                    style={{ color: reg.penaltyAmount > 0 ? "var(--warn)" : "var(--text-3)" }}>
                    <IndianRupee size={12} />
                    {fmtPenalty(reg.penaltyAmount)}
                  </div>
                </div>
                <div className="rounded-lg p-3" style={{ background: "var(--surface)" }}>
                  <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: "var(--text-3)" }}>
                    Legal risk
                  </div>
                  <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md"
                    style={{ background: legalMeta.bg, color: legalMeta.color }}>
                    {legalMeta.label}
                  </span>
                </div>
                <div className="rounded-lg p-3" style={{ background: "var(--surface)" }}>
                  <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: "var(--text-3)" }}>
                    Ops impact
                  </div>
                  <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md"
                    style={{ background: opMeta.bg, color: opMeta.color }}>
                    {opMeta.label}
                  </span>
                </div>
              </div>
            </section>

            {/* Action steps */}
            <section className="mb-8">
              <h2 className="text-[14px] font-semibold uppercase tracking-wider mb-3"
                style={{ color: "var(--text-3)" }}>
                Recommended action steps
              </h2>
              <ol className="space-y-3">
                {article.actionSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 p-3 rounded-lg"
                    style={{ background: "var(--surface-2)" }}>
                    <Check size={16} style={{ color: "var(--accent)" }} className="mt-0.5 flex-shrink-0" />
                    <span className="text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>{step}</span>
                  </li>
                ))}
              </ol>
            </section>

            {/* Impact areas */}
            {reg.impactAreas.length > 0 && (
              <section className="mb-8">
                <h2 className="text-[14px] font-semibold uppercase tracking-wider mb-3"
                  style={{ color: "var(--text-3)" }}>
                  Functional impact areas
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  {reg.impactAreas.map(ia => {
                    const m = IMPACT_AREA_META[ia]
                    return (
                      <span key={ia}
                        className="text-[12px] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5"
                        style={{ background: `${m.color}14`, color: m.color }}>
                        <Tag size={11} />
                        {m.label}
                      </span>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Affected scope */}
            <section className="mb-8">
              <h2 className="text-[14px] font-semibold uppercase tracking-wider mb-3"
                style={{ color: "var(--text-3)" }}>
                Impact on your clients
              </h2>
              <p className="text-[14px] leading-relaxed mb-3" style={{ color: "var(--text-2)" }}>
                {article.affectedScope}
              </p>
              {reg.clientsAffected.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {reg.clientsAffected.map(c => (
                    <span key={c}
                      className="text-[12px] px-2.5 py-1 rounded-md flex items-center gap-1.5"
                      style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
                      <Building2 size={11} />
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* AI recommendation */}
            <section className="mb-8 p-4 rounded-xl"
              style={{ background: "var(--pink-50)", border: "1px solid var(--pink-100)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={15} style={{ color: "var(--pink-700)" }} />
                <h2 className="text-[14px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--pink-700)" }}>
                  AI recommendation
                </h2>
              </div>
              <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                Based on your client portfolio, ORACLE recommends prioritising this notification within the next{" "}
                {reg.legalRisk === "high" ? "3 business days" : reg.legalRisk === "medium" ? "7 business days" : "2 weeks"}.
                {reg.clientsAffected.length > 1 && ` Consider a consolidated communication to the ${reg.clientsAffected.length} affected clients rather than individual notifications.`}
                {" "}RIPLEY can draft a ready-to-send email to the ops team.
              </p>
              {reg.actionRequired && (
                <button onClick={openNotify}
                  className="btn-primary flex items-center gap-1.5 text-xs mt-4"
                  style={{ padding: "8px 16px" }}>
                  <Mail size={13} /> Draft notification email
                </button>
              )}
            </section>

            {/* Official source */}
            <section className="mb-8">
              <h2 className="text-[14px] font-semibold uppercase tracking-wider mb-3"
                style={{ color: "var(--text-3)" }}>
                Official source
              </h2>
              <a href={reg.sourceUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl transition-all hover:shadow-md"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--pink-50)" }}>
                  <FileText size={18} style={{ color: "var(--pink-700)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium truncate" style={{ color: "var(--text-1)" }}>
                    {reg.sourceName}
                  </div>
                  <div className="text-[12px] truncate" style={{ color: "var(--text-3)" }}>
                    {reg.sourceUrl}
                  </div>
                </div>
                <ExternalLink size={14} style={{ color: "var(--text-3)" }} className="flex-shrink-0" />
              </a>
            </section>

            {/* Related regulations */}
            {related.length > 0 && (
              <section className="pt-8" style={{ borderTop: "1px solid var(--border)" }}>
                <h2 className="text-[14px] font-semibold uppercase tracking-wider mb-4"
                  style={{ color: "var(--text-3)" }}>
                  Related regulations
                </h2>
                <div className="space-y-2">
                  {related.map(r => {
                    const rCat = CATEGORY_META[r.category]
                    return (
                      <Link key={r.id} href={`/compliance/${r.id}`}
                        className="flex items-start gap-3 p-3 rounded-lg transition-colors"
                        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                        <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: rCat.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-medium line-clamp-1" style={{ color: "var(--text-1)" }}>
                            {r.title}
                          </div>
                          <div className="text-[11px] mt-0.5 flex items-center gap-2" style={{ color: "var(--text-3)" }}>
                            <span>{r.authority}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1"><Clock size={10} /> {r.date}</span>
                          </div>
                        </div>
                        <ChevronRight size={14} style={{ color: "var(--text-3)" }} className="flex-shrink-0 mt-1" />
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      <NotifyPanel context={notifyCtx} onClose={() => setNotifyCtx(null)} />
      <BottomNav />
    </div>
  )
}
