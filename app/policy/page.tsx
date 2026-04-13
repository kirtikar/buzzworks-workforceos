"use client"

import { useState, useMemo } from "react"
import Sidebar from "@/components/Sidebar"
import AIAgentOrb from "@/components/AIAgentOrb"
import { clients, policyRules as initialRules } from "@/lib/mock-data"
import type { PolicyRule, PolicyRuleCategory, PolicySeverity } from "@/lib/types"
import {
  FileText, Zap, Plus, Edit2, ToggleLeft, ToggleRight, AlertTriangle,
  Info, ShieldAlert, Clock, CheckCircle2, Sparkles, Loader2, X,
  ChevronDown, ChevronRight, Shield, DollarSign, Users, CalendarCheck,
} from "lucide-react"
import clsx from "clsx"

// ─── Constants ────────────────────────────────────────────────────────────────

const CAT_CONFIG: Record<PolicyRuleCategory, { label: string; icon: React.ElementType; color: string }> = {
  hours:      { label: "Working Hours",   icon: Clock,         color: "#00c896" },
  overtime:   { label: "Overtime",        icon: TrendingUp,    color: "#c89060" },
  leave:      { label: "Leave & Absences",icon: CalendarCheck, color: "#8B5CF6" },
  attendance: { label: "Attendance",      icon: Users,         color: "#3B82F6" },
  payroll:    { label: "Payroll",         icon: DollarSign,    color: "#10B981" },
  compliance: { label: "Compliance",      icon: Shield,        color: "#F59E0B" },
}

const SEV_CONFIG: Record<PolicySeverity, { label: string; color: string; bg: string }> = {
  info:      { label: "Info",      color: "var(--text-2)",   bg: "rgba(255,255,255,0.05)" },
  warning:   { label: "Warning",   color: "#c89060",          bg: "rgba(200,144,96,0.08)" },
  violation: { label: "Violation", color: "#c07070",          bg: "rgba(192,112,112,0.08)" },
}

// AI-suggested rule templates for the creator
const AI_SUGGESTIONS = [
  "Employees cannot log more than 3 hours of overtime per day",
  "Sandwich leave requires manager approval 48 hours in advance",
  "Monthly hours must be between 160 and 200",
  "Medical certificate required for sick leave longer than 2 consecutive days",
  "Overtime on weekends requires director-level approval",
  "New joiners (< 90 days) cannot claim overtime",
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function TrendingUp(props: { size?: number; className?: string }) {
  return <svg width={props.size ?? 16} height={props.size ?? 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={props.className}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
}

function parseAIRule(input: string, clientId: string): Partial<PolicyRule> {
  const lower = input.toLowerCase()
  let category: PolicyRuleCategory = "compliance"
  let severity: PolicySeverity = "warning"

  if (lower.includes("overtime") || lower.includes("ot"))          category = "overtime"
  else if (lower.includes("leave") || lower.includes("absence"))   category = "leave"
  else if (lower.includes("hour") || lower.includes("hours"))      category = "hours"
  else if (lower.includes("attendance") || lower.includes("present")) category = "attendance"
  else if (lower.includes("payroll") || lower.includes("salary"))  category = "payroll"

  if (lower.includes("cannot") || lower.includes("prohibited") || lower.includes("must not")) severity = "violation"
  else if (lower.includes("require") || lower.includes("must"))    severity = "warning"
  else                                                              severity = "info"

  // Extract a trigger condition guess
  let trigger = "custom_condition"
  const numMatch = input.match(/\d+/)
  if (numMatch) {
    const num = numMatch[0]
    if (category === "overtime") trigger = `dailyOT > ${num}`
    else if (category === "hours") trigger = `monthlyHours < ${num} || monthlyHours > ${num}`
    else if (category === "leave") trigger = `sickLeaveDays > ${num}`
  }

  return {
    clientId,
    category,
    severity,
    name: input.length > 50 ? input.slice(0, 50) + "…" : input,
    description: input,
    triggerCondition: trigger,
    actionOnTrigger: severity === "violation" ? "Reject timesheet and notify employee" : "Flag for ops review",
    enabled: true,
    createdBy: "ai",
    aiGenerated: true,
    appliedCount: 0,
    triggerCount: 0,
  }
}

// ─── AI Policy Creator Modal ──────────────────────────────────────────────────

function AIPolicyCreator({
  clientId,
  onSave,
  onClose,
}: {
  clientId: string
  onSave: (rule: PolicyRule) => void
  onClose: () => void
}) {
  const [input,     setInput]     = useState("")
  const [stage,     setStage]     = useState<"input" | "thinking" | "preview" | "saved">("input")
  const [preview,   setPreview]   = useState<Partial<PolicyRule> | null>(null)

  function handleGenerate() {
    if (!input.trim()) return
    setStage("thinking")
    setTimeout(() => {
      setPreview(parseAIRule(input, clientId))
      setStage("preview")
    }, 1800)
  }

  function handleSave() {
    if (!preview) return
    const rule: PolicyRule = {
      id: `pol${Date.now()}`,
      clientId,
      category:         preview.category ?? "compliance",
      name:             preview.name ?? input,
      description:      preview.description ?? input,
      triggerCondition: preview.triggerCondition ?? "custom",
      actionOnTrigger:  preview.actionOnTrigger ?? "Flag for review",
      severity:         preview.severity ?? "warning",
      enabled:          true,
      createdAt:        new Date().toISOString(),
      updatedAt:        new Date().toISOString(),
      createdBy:        "ai",
      aiGenerated:      true,
      appliedCount:     0,
      triggerCount:     0,
    }
    onSave(rule)
    setStage("saved")
    setTimeout(onClose, 1000)
  }

  const catCfg = preview?.category ? CAT_CONFIG[preview.category] : null
  const sevCfg = preview?.severity ? SEV_CONFIG[preview.severity] : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <div className="glass rounded-2xl w-full max-w-lg mx-4 overflow-hidden animate-fade-in">
        {/* Modal header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.08]">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #8B5CF6, #00D4A5)" }}>
            <Sparkles size={14} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-[14px] text-white">AI Policy Creator</div>
            <div className="text-[11px] text-white/35">Describe your rule in plain English</div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          {stage === "saved" ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle2 size={40} style={{ color: "#00c896" }} />
              <div className="text-[14px] font-semibold text-white">Rule saved!</div>
            </div>
          ) : (
            <>
              {/* Input */}
              <div>
                <label className="text-[11px] text-white/40 mb-2 block">Describe the policy rule</label>
                <textarea
                  className="glass-input w-full text-[13px] leading-relaxed resize-none"
                  rows={3}
                  placeholder="e.g. Employees cannot log more than 3 hours of overtime per day…"
                  value={input}
                  onChange={e => { setInput(e.target.value); setStage("input") }}
                  disabled={stage === "thinking"}
                />
              </div>

              {/* Suggestions */}
              {stage === "input" && (
                <div>
                  <div className="text-[10px] text-white/25 mb-2">Quick suggestions</div>
                  <div className="flex flex-wrap gap-1.5">
                    {AI_SUGGESTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => setInput(s)}
                        className="text-[11px] px-2.5 py-1 rounded-full transition-all"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-2)" }}
                      >
                        {s.length > 45 ? s.slice(0, 45) + "…" : s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Thinking state */}
              {stage === "thinking" && (
                <div className="flex items-center gap-3 py-4 justify-center">
                  <Loader2 size={18} className="animate-spin" style={{ color: "#8B5CF6" }} />
                  <span className="text-[13px] text-white/50">Analysing policy intent…</span>
                </div>
              )}

              {/* Preview */}
              {stage === "preview" && preview && (
                <div className="space-y-3">
                  <div className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">AI-Generated Rule Preview</div>
                  <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      {catCfg && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase" style={{ background: `${catCfg.color}18`, color: catCfg.color }}>
                          {catCfg.label}
                        </span>
                      )}
                      {sevCfg && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase" style={{ background: sevCfg.bg, color: sevCfg.color }}>
                          {sevCfg.label}
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(139,92,246,0.15)", color: "#8B5CF6" }}>AI Generated</span>
                    </div>

                    <div>
                      <div className="text-[10px] text-white/30 mb-1">Rule name</div>
                      <input
                        className="glass-input w-full text-[13px] py-1.5"
                        value={preview.name ?? ""}
                        onChange={e => setPreview(p => p ? { ...p, name: e.target.value } : p)}
                      />
                    </div>

                    <div>
                      <div className="text-[10px] text-white/30 mb-1">Trigger condition</div>
                      <div className="font-mono text-[11px] px-3 py-1.5 rounded-lg text-white/60" style={{ background: "rgba(255,255,255,0.04)" }}>
                        if ({preview.triggerCondition}) → {preview.actionOnTrigger}
                      </div>
                    </div>
                  </div>

                  <div
                    className="text-[11px] text-white/40 px-3 py-2 rounded-lg flex items-start gap-2"
                    style={{ background: "rgba(200,144,96,0.06)", border: "1px solid rgba(200,144,96,0.12)" }}
                  >
                    <Info size={12} className="mt-0.5 flex-shrink-0" style={{ color: "#c89060" }} />
                    Review the rule above before saving. The trigger condition will be finalised by your ops team.
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                {stage === "input" && (
                  <button onClick={handleGenerate} disabled={!input.trim()} className="btn-teal flex-1 flex items-center justify-center gap-2 py-2">
                    <Sparkles size={14} /> Generate Rule
                  </button>
                )}
                {stage === "preview" && (
                  <>
                    <button onClick={() => setStage("input")} className="btn-ghost flex-1 py-2 text-[13px]">Edit prompt</button>
                    <button onClick={handleSave} className="btn-teal flex-1 flex items-center justify-center gap-2 py-2">
                      <CheckCircle2 size={14} /> Save Rule
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Rule Card ────────────────────────────────────────────────────────────────

function RuleCard({ rule, onToggle }: { rule: PolicyRule; onToggle: (id: string) => void }) {
  const catCfg = CAT_CONFIG[rule.category]
  const sevCfg = SEV_CONFIG[rule.severity]
  const CatIcon = catCfg.icon

  return (
    <div
      className={clsx("rounded-xl p-4 flex items-start gap-4 transition-all", !rule.enabled && "opacity-50")}
      style={{ background: "rgba(255,255,255,0.025)", border: `1px solid rgba(255,255,255,0.07)`, borderLeft: `3px solid ${rule.enabled ? catCfg.color : "rgba(255,255,255,0.1)"}` }}
    >
      {/* Category icon */}
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${catCfg.color}12` }}>
        <CatIcon size={14} style={{ color: catCfg.color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-semibold text-[13px] text-white">{rule.name}</span>
          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase" style={{ background: sevCfg.bg, color: sevCfg.color }}>{sevCfg.label}</span>
          {rule.aiGenerated && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5" style={{ background: "rgba(139,92,246,0.12)", color: "#8B5CF6" }}>
              <Sparkles size={8} /> AI
            </span>
          )}
        </div>
        <div className="text-[12px] text-white/50 mb-2 leading-relaxed">{rule.description}</div>
        <div className="font-mono text-[10px] px-2.5 py-1.5 rounded-lg text-white/35 mb-2" style={{ background: "rgba(255,255,255,0.04)" }}>
          if ({rule.triggerCondition}) → {rule.actionOnTrigger}
        </div>
        <div className="flex items-center gap-4 text-[10px] text-white/25">
          <span>Applied {rule.appliedCount}× this month</span>
          <span className={rule.triggerCount > 0 ? "text-amber-500/70" : ""}>Triggered {rule.triggerCount}×</span>
          <span>by {rule.createdBy}</span>
          <span className="ml-auto text-white/15">{rule.updatedAt.split("T")[0]}</span>
        </div>
      </div>

      {/* Toggle */}
      <button
        onClick={() => onToggle(rule.id)}
        className="flex-shrink-0 mt-1 transition-colors"
        style={{ color: rule.enabled ? catCfg.color : "rgba(255,255,255,0.2)" }}
        title={rule.enabled ? "Disable rule" : "Enable rule"}
      >
        {rule.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PolicyPage() {
  const [selClientId, setSelClientId] = useState(clients[7].id) // TCI default
  const [rules,       setRules]       = useState<PolicyRule[]>(initialRules)
  const [showCreator, setShowCreator] = useState(false)
  const [openCats,    setOpenCats]    = useState<Set<PolicyRuleCategory>>(new Set(["hours","overtime","leave","compliance"]))

  const selClient    = clients.find(c => c.id === selClientId)!
  const clientRules  = rules.filter(r => r.clientId === selClientId)

  const byCategory = useMemo(() => {
    const map: Partial<Record<PolicyRuleCategory, PolicyRule[]>> = {}
    for (const rule of clientRules) {
      if (!map[rule.category]) map[rule.category] = []
      map[rule.category]!.push(rule)
    }
    return map
  }, [clientRules])

  function toggleRule(id: string) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r))
  }

  function toggleCat(cat: PolicyRuleCategory) {
    setOpenCats(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  function addRule(rule: PolicyRule) {
    setRules(prev => [...prev, rule])
  }

  const enabledCount  = clientRules.filter(r => r.enabled).length
  const totalApplied  = clientRules.reduce((s, r) => s + r.appliedCount, 0)
  const totalTriggered= clientRules.reduce((s, r) => s + r.triggerCount, 0)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile client picker — horizontal chip scroll */}
        <div className="flex sm:hidden items-center gap-2 px-3 py-2 overflow-x-auto flex-shrink-0 scrollbar-none"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(9,7,20,0.6)" }}>
          {clients.map(c => (
            <button key={c.id} onClick={() => setSelClientId(c.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0 text-[11px] font-semibold transition-all whitespace-nowrap"
              style={{
                background: selClientId === c.id ? `${c.color}22` : "rgba(255,255,255,0.05)",
                border: `1px solid ${selClientId === c.id ? c.color + "50" : "rgba(255,255,255,0.08)"}`,
                color: selClientId === c.id ? c.color : "rgba(255,255,255,0.4)",
              }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
              {c.name}
            </button>
          ))}
        </div>

        <div className="flex flex-1 overflow-hidden">
        {/* Client selector panel — desktop */}
        <div className="hidden sm:flex w-56 flex-shrink-0 border-r border-white/[0.07] flex-col overflow-hidden" style={{ background: "rgba(9,7,20,0.6)" }}>
          <div className="px-4 py-4 border-b border-white/[0.07]">
            <div className="text-[12px] font-semibold text-white/50 uppercase tracking-wider">Select Client</div>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {clients.map(c => {
              const ruleCount = rules.filter(r => r.clientId === c.id).length
              return (
                <button
                  key={c.id}
                  onClick={() => setSelClientId(c.id)}
                  className={clsx("w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-all", selClientId === c.id ? "bg-white/[0.07]" : "hover:bg-white/[0.03]")}
                >
                  {selClientId === c.id && <span className="nav-active-dot" />}
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                  <span className="flex-1 min-w-0">
                    <span className="text-[12px] font-medium truncate block" style={{ color: selClientId === c.id ? "#fff" : "rgba(255,255,255,0.5)" }}>{c.name}</span>
                  </span>
                  <span className="text-[10px] text-white/25">{ruleCount || "–"}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Policy rules area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="flex items-center gap-3 px-4 lg:px-6 py-3 lg:py-3.5 border-b border-white/[0.07] flex-shrink-0" style={{ background: "rgba(9,7,20,0.6)", backdropFilter: "blur(20px)" }}>
            <FileText size={18} className="text-teal-400" />
            <div className="flex-1">
              <h1 className="text-base font-bold text-white">{selClient.name} — Policy Engine</h1>
              <p className="text-[11px] text-white/35">v{selClient.policyVersion.replace("v", "")} · {enabledCount} active rules</p>
            </div>
            {/* Stats pills */}
            <div className="hidden md:flex items-center gap-2">
              {[
                { label: "Rules",    value: clientRules.length, color: "var(--text-2)" },
                { label: "Applied",  value: totalApplied,        color: "#00c896" },
                { label: "Triggers", value: totalTriggered,      color: "#c89060" },
              ].map(s => (
                <div key={s.label} className="glass px-3 py-1.5 rounded-xl text-center">
                  <div className="text-[14px] font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[9px] text-white/25">{s.label}</div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowCreator(true)}
              className="btn-teal flex items-center gap-1.5 text-[12px] py-2 px-4"
            >
              <Plus size={13} /> Add Policy Rule
            </button>
          </header>

          {/* Rules content */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-5 space-y-4 pb-nav lg:pb-5">
            {clientRules.length === 0 ? (
              <div className="glass p-12 rounded-2xl text-center">
                <FileText size={40} className="text-white/15 mx-auto mb-4" />
                <div className="text-[15px] font-semibold text-white/30 mb-2">No policy rules configured</div>
                <div className="text-[12px] text-white/20 mb-5">Click "Add Policy Rule" to create your first rule using AI or manual input.</div>
                <button onClick={() => setShowCreator(true)} className="btn-teal flex items-center gap-2 mx-auto text-[13px]">
                  <Sparkles size={14} /> Create with AI
                </button>
              </div>
            ) : (
              Object.entries(CAT_CONFIG).map(([cat, cfg]) => {
                const catRules = byCategory[cat as PolicyRuleCategory] ?? []
                if (catRules.length === 0) return null
                const isOpen = openCats.has(cat as PolicyRuleCategory)
                const CatIcon = cfg.icon
                return (
                  <div key={cat}>
                    <button
                      onClick={() => toggleCat(cat as PolicyRuleCategory)}
                      className="flex items-center gap-2.5 mb-3 w-full text-left group"
                    >
                      <CatIcon size={14} style={{ color: cfg.color }} />
                      <span className="text-[13px] font-semibold text-white">{cfg.label}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${cfg.color}12`, color: cfg.color }}>{catRules.length}</span>
                      <ChevronDown size={13} className={clsx("text-white/30 ml-auto transition-transform", isOpen ? "rotate-0" : "-rotate-90")} />
                    </button>
                    {isOpen && (
                      <div className="space-y-2.5 ml-1">
                        {catRules.map(rule => <RuleCard key={rule.id} rule={rule} onToggle={toggleRule} />)}
                      </div>
                    )}
                  </div>
                )
              })
            )}

            {/* AI capabilities teaser */}
            <div
              className="rounded-2xl p-5 flex items-center gap-5 mt-2"
              style={{ background: "rgba(139,92,246,0.04)", border: "1px dashed rgba(139,92,246,0.2)" }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #8B5CF6, #00D4A5)" }}>
                <Sparkles size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-white mb-0.5">Agentic Policy Engine — coming in v2</div>
                <div className="text-[11px] text-white/40 leading-relaxed">AI will monitor policy trigger patterns and proactively suggest new rules or adjustments based on recurring violations and timesheet anomalies.</div>
              </div>
              <button className="btn-ghost text-[11px] py-1.5 px-3 flex-shrink-0">Learn more</button>
            </div>
          </main>
        </div>
        </div>{/* flex flex-1 overflow-hidden */}
      </div>

      {showCreator && (
        <AIPolicyCreator
          clientId={selClientId}
          onSave={addRule}
          onClose={() => setShowCreator(false)}
        />
      )}

      <AIAgentOrb />
    </div>
  )
}
