"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import Sidebar from "@/components/Sidebar"
import BottomNav from "@/components/BottomNav"
import AIAgentOrb from "@/components/AIAgentOrb"
import { clients, policyRules as initialRules, WORKFLOW_META, deriveWorkflow } from "@/lib/mock-data"
import type { PolicyRule, PolicyRuleCategory, PolicySeverity, PolicyWorkflow } from "@/lib/types"
import {
  Plus, ToggleLeft, ToggleRight, CheckCircle2, Sparkles, Loader2, X,
  ChevronDown, Clock, CalendarCheck, DollarSign, Shield, Users,
  Search, Tag, Building2, Workflow as WorkflowIcon, ShieldAlert, Info,
} from "lucide-react"
import clsx from "clsx"

// ─── Constants ────────────────────────────────────────────────────────────────

const CAT_CONFIG: Record<PolicyRuleCategory, { label: string; icon: React.ElementType; color: string }> = {
  hours:      { label: "Working Hours",    icon: Clock,         color: "var(--accent)" },
  overtime:   { label: "Overtime",         icon: TrendingUpMini, color: "#c89060" },
  leave:      { label: "Leave & Absences", icon: CalendarCheck, color: "#2563EB" },
  attendance: { label: "Attendance",       icon: Users,         color: "#3B82F6" },
  payroll:    { label: "Payroll",          icon: DollarSign,    color: "#10B981" },
  compliance: { label: "Compliance",       icon: Shield,        color: "#F59E0B" },
}

const SEV_CONFIG: Record<PolicySeverity, { label: string; color: string; bg: string }> = {
  info:      { label: "Info",      color: "var(--text-2)", bg: "var(--surface-2)" },
  warning:   { label: "Warning",   color: "var(--warn)",   bg: "var(--warn-bg)" },
  violation: { label: "Violation", color: "var(--danger)", bg: "var(--danger-bg)" },
}

const WORKFLOWS: PolicyWorkflow[] = [
  "timesheet-validation", "onboarding", "leave-attendance", "payroll",
  "compliance", "exit", "fnf",
]
const CATEGORIES: PolicyRuleCategory[] = ["hours","overtime","leave","attendance","payroll","compliance"]
const SEVERITIES: PolicySeverity[] = ["info","warning","violation"]

const AI_SUGGESTIONS = [
  "Employees cannot log more than 3 hours of overtime per day",
  "Sandwich leave requires manager approval 48 hours in advance",
  "Monthly hours must be between 160 and 200",
  "Medical certificate required for sick leave longer than 2 consecutive days",
  "Overtime on weekends requires director-level approval",
  "New joiners (< 90 days) cannot claim overtime",
]

function TrendingUpMini(props: { size?: number; className?: string }) {
  return (
    <svg width={props.size ?? 16} height={props.size ?? 16} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={props.className}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  )
}

function parseAIRule(input: string, clientId: string): Partial<PolicyRule> {
  const lower = input.toLowerCase()
  let category: PolicyRuleCategory = "compliance"
  let severity: PolicySeverity = "warning"

  if (lower.includes("overtime") || lower.includes("ot"))             category = "overtime"
  else if (lower.includes("leave") || lower.includes("absence"))      category = "leave"
  else if (lower.includes("hour"))                                    category = "hours"
  else if (lower.includes("attendance") || lower.includes("present")) category = "attendance"
  else if (lower.includes("payroll") || lower.includes("salary"))     category = "payroll"

  if (lower.includes("cannot") || lower.includes("prohibited") || lower.includes("must not")) severity = "violation"
  else if (lower.includes("require") || lower.includes("must"))                                 severity = "warning"
  else                                                                                          severity = "info"

  let trigger = "custom_condition"
  const numMatch = input.match(/\d+/)
  if (numMatch) {
    const num = numMatch[0]
    if (category === "overtime")  trigger = `dailyOT > ${num}`
    else if (category === "hours")trigger = `monthlyHours < ${num} || monthlyHours > ${num}`
    else if (category === "leave")trigger = `sickLeaveDays > ${num}`
  }

  return {
    clientId, category, severity,
    name:             input.length > 50 ? input.slice(0, 50) + "…" : input,
    description:      input,
    triggerCondition: trigger,
    actionOnTrigger:  severity === "violation" ? "Reject timesheet and notify employee" : "Flag for ops review",
    enabled:          true,
    createdBy:        "ai",
    aiGenerated:      true,
    appliedCount:     0,
    triggerCount:     0,
  }
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

// ─── Rule card ────────────────────────────────────────────────────────────────

function RuleCard({ rule, clientName, onToggle }: { rule: PolicyRule; clientName?: string; onToggle: (id: string) => void }) {
  const catCfg = CAT_CONFIG[rule.category]
  const sevCfg = SEV_CONFIG[rule.severity]
  const CatIcon = catCfg.icon

  return (
    <div
      className={clsx("rounded-xl p-4 flex items-start gap-3 transition-all", !rule.enabled && "opacity-60")}
      style={{ background: "var(--surface)", border: "1px solid var(--border)", borderLeft: `3px solid ${rule.enabled ? catCfg.color : "var(--border-strong)"}` }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${catCfg.color}12` }}>
        <CatIcon size={14} style={{ color: catCfg.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-semibold text-[13px]" style={{ color: "var(--text-1)" }}>{rule.name}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider"
            style={{ background: sevCfg.bg, color: sevCfg.color }}>{sevCfg.label}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: `${catCfg.color}14`, color: catCfg.color }}>{catCfg.label}</span>
          {clientName && (
            <span className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
              {clientName}
            </span>
          )}
          {rule.aiGenerated && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5"
              style={{ background: "var(--pink-50)", color: "var(--pink-700)" }}>
              <Sparkles size={8} /> AI
            </span>
          )}
        </div>
        <div className="text-[12px] mb-2 leading-relaxed" style={{ color: "var(--text-2)" }}>{rule.description}</div>
        <div className="font-mono text-[10px] px-2.5 py-1.5 rounded-lg mb-2"
          style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
          if ({rule.triggerCondition}) → {rule.actionOnTrigger}
        </div>
        <div className="flex items-center gap-4 text-[10px]" style={{ color: "var(--text-3)" }}>
          <span>Applied {rule.appliedCount}× this month</span>
          <span style={{ color: rule.triggerCount > 0 ? "var(--warn)" : "var(--text-3)" }}>
            Triggered {rule.triggerCount}×
          </span>
          <span>by {rule.createdBy}</span>
          <span className="ml-auto">{rule.updatedAt.split("T")[0]}</span>
        </div>
      </div>

      <button
        onClick={() => onToggle(rule.id)}
        className="flex-shrink-0 mt-1 transition-colors"
        style={{ color: rule.enabled ? catCfg.color : "var(--text-3)" }}
        title={rule.enabled ? "Disable rule" : "Enable rule"}
      >
        {rule.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
      </button>
    </div>
  )
}

// ─── AI Policy Creator Modal ──────────────────────────────────────────────────

function AIPolicyCreator({
  clientId, onSave, onClose,
}: {
  clientId: string
  onSave: (rule: PolicyRule) => void
  onClose: () => void
}) {
  const [input,    setInput]    = useState("")
  const [stage,    setStage]    = useState<"input" | "thinking" | "preview" | "saved">("input")
  const [preview,  setPreview]  = useState<Partial<PolicyRule> | null>(null)

  function handleGenerate() {
    if (!input.trim()) return
    setStage("thinking")
    setTimeout(() => {
      setPreview(parseAIRule(input, clientId))
      setStage("preview")
    }, 1200)
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
    rule.workflow = deriveWorkflow(rule)
    onSave(rule)
    setStage("saved")
    setTimeout(onClose, 800)
  }

  const catCfg = preview?.category ? CAT_CONFIG[preview.category] : null
  const sevCfg = preview?.severity ? SEV_CONFIG[preview.severity] : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}>
      <div className="rounded-2xl w-full max-w-lg mx-4 overflow-hidden animate-fade-in"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 px-5 py-4"
          style={{ background: "var(--pink-50)", borderBottom: "1px solid var(--pink-100)" }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "var(--pink-700)" }}>
            <Sparkles size={14} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-[14px]" style={{ color: "var(--pink-700)" }}>AI Policy Creator</div>
            <div className="text-[11px]" style={{ color: "var(--text-3)" }}>Describe your rule in plain English · RIPLEY parses into a trigger</div>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-3)" }}><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          {stage === "saved" ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle2 size={40} style={{ color: "var(--accent)" }} />
              <div className="text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>Rule saved</div>
            </div>
          ) : (
            <>
              <div>
                <label className="text-[11px] mb-2 block" style={{ color: "var(--text-3)" }}>Describe the policy rule</label>
                <textarea
                  className="glass-input w-full text-[13px] leading-relaxed resize-none"
                  rows={3}
                  placeholder="e.g. Employees cannot log more than 3 hours of overtime per day…"
                  value={input}
                  onChange={e => { setInput(e.target.value); setStage("input") }}
                  disabled={stage === "thinking"}
                />
              </div>

              {stage === "input" && (
                <div>
                  <div className="text-[10px] mb-2" style={{ color: "var(--text-3)" }}>Quick suggestions</div>
                  <div className="flex flex-wrap gap-1.5">
                    {AI_SUGGESTIONS.map(s => (
                      <button key={s} onClick={() => setInput(s)}
                        className="text-[11px] px-2.5 py-1 rounded-full transition-all"
                        style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
                        {s.length > 45 ? s.slice(0, 45) + "…" : s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {stage === "thinking" && (
                <div className="flex items-center gap-3 py-4 justify-center">
                  <Loader2 size={18} className="animate-spin" style={{ color: "var(--accent)" }} />
                  <span className="text-[13px]" style={{ color: "var(--text-2)" }}>Analysing policy intent…</span>
                </div>
              )}

              {stage === "preview" && preview && (
                <div className="space-y-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
                    AI-Generated Rule Preview
                  </div>
                  <div className="rounded-xl p-4 space-y-3"
                    style={{ background: "var(--pink-50)", border: "1px solid var(--pink-100)" }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      {catCfg && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
                          style={{ background: `${catCfg.color}18`, color: catCfg.color }}>{catCfg.label}</span>
                      )}
                      {sevCfg && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
                          style={{ background: sevCfg.bg, color: sevCfg.color }}>{sevCfg.label}</span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: "var(--pink-100)", color: "var(--pink-700)" }}>AI</span>
                    </div>
                    <div>
                      <div className="text-[10px] mb-1" style={{ color: "var(--text-3)" }}>Rule name</div>
                      <input
                        className="glass-input w-full text-[13px] py-1.5"
                        value={preview.name ?? ""}
                        onChange={e => setPreview(p => p ? { ...p, name: e.target.value } : p)}
                      />
                    </div>
                    <div>
                      <div className="text-[10px] mb-1" style={{ color: "var(--text-3)" }}>Trigger condition</div>
                      <div className="font-mono text-[11px] px-3 py-1.5 rounded-lg"
                        style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
                        if ({preview.triggerCondition}) → {preview.actionOnTrigger}
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] px-3 py-2 rounded-lg flex items-start gap-2"
                    style={{ color: "var(--text-2)", background: "var(--warn-bg)", border: "1px solid var(--warn-border)" }}>
                    <Info size={12} className="mt-0.5 flex-shrink-0" style={{ color: "var(--warn)" }} />
                    Review before saving. Ops can refine the trigger after save.
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                {stage === "input" && (
                  <button onClick={handleGenerate} disabled={!input.trim()}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 py-2">
                    <Sparkles size={14} /> Generate rule
                  </button>
                )}
                {stage === "preview" && (
                  <>
                    <button onClick={() => setStage("input")} className="btn-ghost flex-1 py-2 text-[13px]">Edit prompt</button>
                    <button onClick={handleSave}
                      className="btn-primary flex-1 flex items-center justify-center gap-2 py-2">
                      <CheckCircle2 size={14} /> Save rule
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

// ─── Page ─────────────────────────────────────────────────────────────────────

type Mode = "all" | "client"

export default function PolicyPage() {
  const [rules, setRules]         = useState<PolicyRule[]>(initialRules)
  const [mode, setMode]           = useState<Mode>("all")
  const [selClientId, setSelCli]  = useState<string>(clients[7]?.id ?? clients[0].id)
  const [showCreator, setShow]    = useState(false)

  const [selWorkflows,   setSelW] = useState<PolicyWorkflow[]>([])
  const [selCategories,  setSelC] = useState<PolicyRuleCategory[]>([])
  const [selSeverities,  setSelS] = useState<PolicySeverity[]>([])
  const [selClients,     setSelP] = useState<string[]>([])
  const [onlyEnabled,    setOnlyE] = useState<boolean>(false)
  const [search,         setSearch] = useState("")

  function toggle<T>(arr: T[], set: (v: T[]) => void, val: T) {
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  function toggleRule(id: string) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r))
  }
  function addRule(rule: PolicyRule) { setRules(prev => [...prev, rule]) }

  const pool = useMemo(
    () => mode === "client" ? rules.filter(r => r.clientId === selClientId) : rules,
    [rules, mode, selClientId]
  )

  const filtered = useMemo(() => {
    let list = [...pool]
    if (selWorkflows.length)  list = list.filter(r => selWorkflows.includes((r.workflow ?? deriveWorkflow(r))))
    if (selCategories.length) list = list.filter(r => selCategories.includes(r.category))
    if (selSeverities.length) list = list.filter(r => selSeverities.includes(r.severity))
    if (selClients.length)    list = list.filter(r => selClients.includes(r.clientId))
    if (onlyEnabled)          list = list.filter(r => r.enabled)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.triggerCondition.toLowerCase().includes(q)
      )
    }
    return list
  }, [pool, selWorkflows, selCategories, selSeverities, selClients, onlyEnabled, search])

  // Group by workflow always — that's the user-requested structure
  const byWorkflow = useMemo(() => {
    const m: Partial<Record<PolicyWorkflow, PolicyRule[]>> = {}
    for (const r of filtered) {
      const w = (r.workflow ?? deriveWorkflow(r))
      if (!m[w]) m[w] = []
      m[w]!.push(r)
    }
    return m
  }, [filtered])

  const enabledCount  = filtered.filter(r => r.enabled).length
  const appliedCount  = filtered.reduce((s, r) => s + r.appliedCount, 0)
  const triggerCount  = filtered.reduce((s, r) => s + r.triggerCount, 0)
  const activeFilters = selWorkflows.length + selCategories.length + selSeverities.length + selClients.length + (onlyEnabled ? 1 : 0)

  const workflowOptions = WORKFLOWS.map(w => ({ value: w, label: WORKFLOW_META[w].label, color: WORKFLOW_META[w].color }))
  const categoryOptions = CATEGORIES.map(c => ({ value: c, label: CAT_CONFIG[c].label,  color: CAT_CONFIG[c].color }))
  const severityOptions = SEVERITIES.map(s => ({ value: s, label: SEV_CONFIG[s].label,  color: SEV_CONFIG[s].color }))
  const clientOptions   = clients.map(c => ({ value: c.id, label: c.name }))

  const clientNameById = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c.name])), [])
  const selClient      = clients.find(c => c.id === selClientId)!

  return (
    <div className="flex h-screen overflow-hidden app-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header — matches Inbox/Compliance pattern */}
        <header className="px-6 lg:px-8 py-5 flex-shrink-0 flex items-start gap-4"
          style={{ background: "var(--surface)", boxShadow: "0 1px 0 var(--border)" }}>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-1)" }}>Policies</h1>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--text-3)" }}>
              {rules.length} rules across 7 workflows · {rules.filter(r => r.enabled).length} active
            </p>
            <div className="flex items-center gap-1 mt-4">
              {([
                { value: "all",    label: "All policies" },
                { value: "client", label: "By client" },
              ] as { value: Mode; label: string }[]).map(t => (
                <button
                  key={t.value}
                  onClick={() => setMode(t.value)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
                  style={{
                    background: mode === t.value ? "var(--accent-dim)" : "transparent",
                    color:      mode === t.value ? "var(--accent)" : "var(--text-3)",
                  }}>
                  {t.label}
                  <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                    style={{
                      background: mode === t.value ? "var(--accent)" : "var(--surface-2)",
                      color:      mode === t.value ? "#fff" : "var(--text-3)",
                    }}>
                    {t.value === "all" ? rules.length : rules.filter(r => r.clientId === selClientId).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => setShow(true)}
            className="btn-primary flex items-center gap-1.5 text-[13px] flex-shrink-0"
            style={{ padding: "8px 14px" }}>
            <Plus size={14} /> Add policy rule
          </button>
        </header>

        {/* Client picker (only in By Client mode) */}
        {mode === "client" && (
          <div className="px-6 lg:px-8 py-2.5 flex-shrink-0 flex items-center gap-2 overflow-x-auto scrollbar-none"
            style={{ background: "var(--bg)", boxShadow: "0 1px 0 var(--border)" }}>
            <span className="text-[11px] font-semibold uppercase tracking-wider flex-shrink-0"
              style={{ color: "var(--text-3)" }}>Client:</span>
            {clients.map(c => {
              const count = rules.filter(r => r.clientId === c.id).length
              const active = selClientId === c.id
              return (
                <button key={c.id} onClick={() => setSelCli(c.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0 text-[11px] font-medium transition-all whitespace-nowrap"
                  style={{
                    background: active ? `${c.color}1a` : "var(--surface)",
                    border: active ? `1px solid ${c.color}55` : "1px solid var(--border)",
                    color: active ? c.color : "var(--text-2)",
                  }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
                  {c.name}
                  <span className="text-[10px]" style={{ opacity: 0.7 }}>· {count}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Filters */}
        <div className="px-6 lg:px-8 py-3 flex-shrink-0"
          style={{ background: "var(--surface)", boxShadow: "0 1px 0 var(--border)" }}>
          <div className="flex flex-wrap items-center gap-2">

            <FilterDropdown label="Workflow" icon={WorkflowIcon} options={workflowOptions}
              selected={selWorkflows as string[]}
              onToggle={v => toggle(selWorkflows, setSelW, v as PolicyWorkflow)}
              onClear={() => setSelW([])} />

            <FilterDropdown label="Category" icon={Tag} options={categoryOptions}
              selected={selCategories as string[]}
              onToggle={v => toggle(selCategories, setSelC, v as PolicyRuleCategory)}
              onClear={() => setSelC([])} />

            <FilterDropdown label="Severity" icon={ShieldAlert} options={severityOptions}
              selected={selSeverities as string[]}
              onToggle={v => toggle(selSeverities, setSelS, v as PolicySeverity)}
              onClear={() => setSelS([])} />

            {mode === "all" && (
              <FilterDropdown label="Client" icon={Building2} options={clientOptions}
                selected={selClients}
                onToggle={v => toggle(selClients, setSelP, v)}
                onClear={() => setSelP([])} />
            )}

            <button
              onClick={() => setOnlyE(!onlyEnabled)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all whitespace-nowrap"
              style={{
                background: onlyEnabled ? "var(--pink-100)" : "var(--surface)",
                color:      onlyEnabled ? "var(--pink-700)" : "var(--text-2)",
                borderColor: onlyEnabled ? "var(--accent)" : "var(--border)",
              }}
            >
              <CheckCircle2 size={12} />
              Enabled only
            </button>

            <div className="relative ml-auto">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
              <input
                className="glass-input pl-8 py-2 text-xs w-56"
                placeholder="Search rule name, trigger…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {activeFilters > 0 && (
              <button onClick={() => {
                setSelW([]); setSelC([]); setSelS([]); setSelP([]); setOnlyE(false); setSearch("")
              }}
                className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-semibold"
                style={{ color: "var(--danger)", background: "var(--danger-bg)", border: "1px solid var(--danger-border)" }}>
                <X size={11} /> Clear ({activeFilters})
              </button>
            )}
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex items-center gap-6 px-6 lg:px-8 py-2.5 flex-shrink-0 text-xs"
          style={{ background: "var(--bg)", color: "var(--text-3)" }}>
          <span>
            <span style={{ color: "var(--text-1)", fontWeight: 600 }}>{filtered.length.toLocaleString()}</span> rules
          </span>
          <span>
            <span style={{ color: "var(--accent)", fontWeight: 600 }}>{enabledCount}</span> active
          </span>
          <span>
            <span style={{ color: "var(--text-1)", fontWeight: 600 }}>{appliedCount.toLocaleString()}</span> applications
          </span>
          <span>
            <span style={{ color: "var(--warn)", fontWeight: 600 }}>{triggerCount.toLocaleString()}</span> triggers
          </span>
          {mode === "client" && (
            <span className="ml-auto" style={{ color: "var(--text-2)" }}>
              Client: <span style={{ color: selClient.color, fontWeight: 600 }}>{selClient.name}</span> · Policy {selClient.policyVersion}
            </span>
          )}
        </div>

        {/* Workflow sections */}
        <main className="flex-1 overflow-y-auto pb-nav lg:pb-0">
          <div className="max-w-5xl mx-auto px-6 lg:px-8 py-6 space-y-6">

            {filtered.length === 0 && (
              <div className="text-center py-20 text-sm" style={{ color: "var(--text-3)" }}>
                No policy rules match the current filters
              </div>
            )}

            {WORKFLOWS.map(w => {
              const list = byWorkflow[w]
              if (!list || list.length === 0) return null
              const meta = WORKFLOW_META[w]
              return (
                <section key={w}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: meta.bg }}>
                      <WorkflowIcon size={16} style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>
                          {meta.label}
                        </h2>
                        <span className="text-[11px] px-2 py-0.5 rounded-full"
                          style={{ background: meta.bg, color: meta.color }}>
                          {list.length} {list.length === 1 ? "rule" : "rules"}
                        </span>
                      </div>
                      <p className="text-[12px] mt-0.5" style={{ color: "var(--text-3)" }}>
                        {meta.description}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {list.map(r => (
                      <RuleCard key={r.id} rule={r}
                        clientName={mode === "all" ? clientNameById[r.clientId] : undefined}
                        onToggle={toggleRule} />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </main>
      </div>

      {showCreator && (
        <AIPolicyCreator
          clientId={mode === "client" ? selClientId : (selClients[0] ?? clients[0].id)}
          onSave={addRule}
          onClose={() => setShow(false)}
        />
      )}

      <AIAgentOrb />
      <BottomNav />
    </div>
  )
}
