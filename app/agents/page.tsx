"use client"

import { useState, useMemo, useEffect } from "react"
import Sidebar from "@/components/Sidebar"
import BottomNav from "@/components/BottomNav"
import {
  ClipboardList, Scale, Mail, Send, Database, BookOpen,
  ArrowRight, CheckCircle2, Circle, Activity,
  Sparkles, ChevronRight, Inbox,
  AlertCircle, X,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentStatus = "active" | "idle"

interface Agent {
  id:          string
  name:        string
  initial:     string
  acronym:     string
  role:        string                // the one-line job description
  operational: string                // what this agent actually owns in ops
  works:       string                // where ops sees its output in the app
  color:       string
  icon:        React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties; className?: string }>
  status:      AgentStatus
  todayVolume: number                // items handled today
  metricLabel: string                // e.g. "Accuracy", "Coverage"
  metricValue: string                // e.g. "94.1%"
  capabilities: string[]
  upstream:    string[]              // agents that feed into this one
  downstream:  string[]              // agents that this one hands off to
}

// ─── Agent roster (ordered by where they sit in the pipeline) ─────────────────

const AGENTS: Agent[] = [
  {
    id: "lexi", name: "LEXI", initial: "L",
    acronym: "Language Engine for eXecutable policy Interpretation",
    role: "Policy interpreter",
    operational: "Reads every client's policy doc, SOP and onboarding contract in plain English and compiles them into machine-checkable rules tagged by workflow, category, and severity.",
    works: "Policies → All Policies feed",
    color: "#9333EA",
    icon: BookOpen,
    status: "active",
    todayVolume: 14,
    metricLabel: "Coverage",
    metricValue: "27/27",
    capabilities: [
      "Parses policy docs via GPT-4o",
      "Classifies clauses into 7 workflow subfunctions",
      "Compiles triggers + actions to structured rules",
      "Routes ambiguous clauses to ops for review",
    ],
    upstream: [],
    downstream: ["jarvis"],
  },
  {
    id: "jarvis", name: "JARVIS", initial: "J",
    acronym: "Just-in-time Automated Review & Validation Intelligence System",
    role: "Timesheet validator",
    operational: "Runs every incoming timesheet against LEXI's compiled policy pack, cross-references CASE data integrity, and auto-approves clean submissions. Flags edge cases with a reasoning trail.",
    works: "Inbox → Timesheets",
    color: "#2563EB",
    icon: ClipboardList,
    status: "active",
    todayVolume: 318,
    metricLabel: "Accuracy",
    metricValue: "94.1%",
    capabilities: [
      "Executes LEXI-compiled policy packs",
      "Cross-checks CASE data integrity",
      "Auto-approves at ≥95% confidence",
      "Writes a reasoning trail on every flag",
    ],
    upstream: ["lexi", "case"],
    downstream: ["ripley", "tron"],
  },
  {
    id: "oracle", name: "ORACLE", initial: "O",
    acronym: "Operational Regulatory & Compliance Law Engine",
    role: "Regulation watcher",
    operational: "Scans EPFO, CBDT, ESIC, 18 state labour boards and sector regulators daily. Maps new notifications to affected clients by region, industry and worker type.",
    works: "Compliance → Article feed",
    color: "#059669",
    icon: Scale,
    status: "active",
    todayVolume: 9,
    metricLabel: "Sources",
    metricValue: "24 live",
    capabilities: [
      "Monitors 24 authorities in real-time",
      "Maps each notification to affected clients",
      "Classifies by category, impact area, risk",
      "Links to the official gov portal (no middlemen)",
    ],
    upstream: [],
    downstream: ["ripley"],
  },
  {
    id: "case", name: "CASE", initial: "C",
    acronym: "Comprehensive Audit & Security Engine",
    role: "Data integrity",
    operational: "Validates PAN/Aadhaar/bank/IFSC details, spots duplicate employees, reconciles fields across documents and flags billing anomalies before they reach JARVIS or payroll.",
    works: "Inbox → Onboarding",
    color: "#0EA5E9",
    icon: Database,
    status: "active",
    todayVolume: 52,
    metricLabel: "Clean",
    metricValue: "96%",
    capabilities: [
      "PAN + Aadhaar + IFSC verification",
      "Cross-document field reconciliation",
      "Duplicate employee detection",
      "Anomalous billing pattern detection",
    ],
    upstream: [],
    downstream: ["jarvis"],
  },
  {
    id: "ripley", name: "RIPLEY", initial: "R",
    acronym: "Rapid Intelligent Personnel Liaison & Email Yielder",
    role: "Email drafter",
    operational: "Turns an agent signal into a pre-drafted email in one click — timesheet flags, compliance alerts to AMs, onboarding blockers, payroll issues. Ops reviews and sends.",
    works: "NotifyPanel (bottom-right)",
    color: "#7C3AED",
    icon: Mail,
    status: "active",
    todayVolume: 47,
    metricLabel: "Send rate",
    metricValue: "88%",
    capabilities: [
      "8 workflow-specific templates",
      "Live data injection from ops context",
      "AM + client + CC routing logic",
      "Per-client tone and signature",
    ],
    upstream: ["jarvis", "oracle"],
    downstream: [],
  },
  {
    id: "tron", name: "TRON", initial: "T",
    acronym: "Triggered Relay for Operations & Notifications",
    role: "Ops broadcaster",
    operational: "Runs scheduled digests and live alerts — weekly AM summaries, payroll cycle confirmations, SLA-breach escalations. Makes sure the right stakeholder hears about the right thing.",
    works: "Scheduled · background",
    color: "#D97706",
    icon: Send,
    status: "active",
    todayVolume: 23,
    metricLabel: "SLA hit",
    metricValue: "98%",
    capabilities: [
      "Weekly AM digests",
      "Payroll cycle confirmations",
      "SLA-breach escalations",
      "Holiday + payroll window reminders",
    ],
    upstream: ["jarvis"],
    downstream: [],
  },
]

const AGENT_BY_ID: Record<string, Agent> = Object.fromEntries(AGENTS.map(a => [a.id, a]))

// ─── Pipelines (how agents collaborate in the real product) ──────────────────

interface Pipeline {
  id:       string
  title:    string
  summary:  string
  source:   string
  sink:     string
  steps:    { agent: string; action: string }[]
  volume:   string      // volume tag, e.g. "~320/day"
  outcome:  string      // plain-english outcome line
}

const PIPELINES: Pipeline[] = [
  {
    id: "timesheet",
    title: "Timesheet lifecycle",
    summary: "Policies become checks. Submissions become decisions. Flags become drafted emails.",
    source: "Portal sync · Email · Manual entry",
    sink: "Payroll cycle",
    steps: [
      { agent: "lexi",   action: "compile policy" },
      { agent: "case",   action: "validate data"  },
      { agent: "jarvis", action: "score + decide" },
      { agent: "ripley", action: "draft flag email" },
    ],
    volume: "~320/day",
    outcome: "~94% auto-approved · 6% flagged with a reasoning trail",
  },
  {
    id: "compliance",
    title: "Regulation to client alert",
    summary: "New gov notifications scanned, scoped to affected clients, drafted into client-facing emails.",
    source: "EPFO · CBDT · ESIC · 18 state boards",
    sink: "AM + client contacts",
    steps: [
      { agent: "oracle", action: "scan + classify" },
      { agent: "lexi",   action: "map to policy"   },
      { agent: "ripley", action: "draft client email" },
    ],
    volume: "~9/day",
    outcome: "AM gets a pre-filled email per affected client · 1-click send",
  },
  {
    id: "payroll",
    title: "Payroll cycle & broadcast",
    summary: "Approved timesheets trigger cycle confirmations, digest emails and escalations on SLA misses.",
    source: "JARVIS-approved timesheets",
    sink: "AMs, client leads, ops",
    steps: [
      { agent: "jarvis", action: "approved batch" },
      { agent: "tron",   action: "digest + alerts" },
    ],
    volume: "~23/day",
    outcome: "Weekly AM digests · payment confirmations · on-time SLA 98%",
  },
]

// ─── Synthetic live activity feed (deterministic seed so page doesn't thrash) ─

interface Activity {
  id:        number
  agentId:   string
  summary:   string
  kind:      "success" | "flag" | "info"
  minutesAgo: number
}

const ACTIVITY_SEED: Omit<Activity, "id">[] = [
  { agentId: "jarvis", summary: "Auto-approved TS-4829 · Kavya Reddy · Hexaware · 42.5h",        kind: "success", minutesAgo: 0   },
  { agentId: "lexi",   summary: "Compiled 12 new rules for L&T Infotech (v4.1 → v4.2)",          kind: "info",    minutesAgo: 2   },
  { agentId: "ripley", summary: "Drafted notify to hr-ops · TS-4812 low score (58)",             kind: "info",    minutesAgo: 3   },
  { agentId: "oracle", summary: "New EPFO circular · Karnataka PF ceiling · 14 clients affected",kind: "flag",    minutesAgo: 7   },
  { agentId: "case",   summary: "Caught IFSC mismatch · onb-0187 · Priya Shah · GlobalStaff",    kind: "flag",    minutesAgo: 9   },
  { agentId: "jarvis", summary: "Flagged TS-4811 · Infosys BPM · OT without pre-approval",       kind: "flag",    minutesAgo: 12  },
  { agentId: "tron",   summary: "Weekly digest sent to 23 AMs · payroll Apr-W3",                 kind: "success", minutesAgo: 18  },
  { agentId: "jarvis", summary: "Auto-approved TS-4798 · Rahul Sharma · TechCorp · 40h",         kind: "success", minutesAgo: 21  },
  { agentId: "ripley", summary: "Drafted client alert · Capgemini · KA PF change",                kind: "info",    minutesAgo: 28  },
  { agentId: "case",   summary: "Duplicate employee detected · emp-0841 vs emp-0612 (Mindtree)", kind: "flag",    minutesAgo: 34  },
  { agentId: "lexi",   summary: "Flagged ambiguous clause in Mphasis FnF policy § 4.2",          kind: "info",    minutesAgo: 41  },
  { agentId: "jarvis", summary: "Auto-approved batch of 18 portal-synced timesheets · HEX",      kind: "success", minutesAgo: 46  },
  { agentId: "oracle", summary: "CBDT Notification 42/2026 ingested · tagged Finance & Taxation",kind: "info",    minutesAgo: 53  },
  { agentId: "ripley", summary: "Sent onboarding reminder to 4 candidates · GlobalStaff",         kind: "success", minutesAgo: 61  },
  { agentId: "tron",   summary: "SLA escalation · LTI compliance review ticket >72h",             kind: "flag",    minutesAgo: 74  },
]

function fmtAgo(m: number): string {
  if (m === 0) return "now"
  if (m < 60)  return `${m}m`
  const h = Math.floor(m / 60)
  return `${h}h`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [selectedAgent, setSelected] = useState<string | null>(null)
  const [tick, setTick]              = useState(0)

  // Tick once a minute so "now" → "1m" etc ages gracefully without
  // reshuffling the feed.
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const activity = useMemo<Activity[]>(
    () => ACTIVITY_SEED.map((a, i) => ({ ...a, id: i, minutesAgo: a.minutesAgo + tick })),
    [tick]
  )

  const impactStats = useMemo(() => ([
    { label: "Auto-resolved today",   value: "318",   sub: "Across 4 inboxes",      color: "var(--accent)" },
    { label: "Waiting on your review",value: "47",    sub: "Flagged by JARVIS",     color: "var(--warn)"   },
    { label: "First-pass accuracy",   value: "94.1%", sub: "30-day rolling",        color: "#059669"       },
    { label: "Est. ops cost saved",   value: "₹12L",  sub: "vs manual this month",  color: "var(--pink-700)" },
  ]), [])

  const selected = selectedAgent ? AGENT_BY_ID[selectedAgent] : null

  return (
    <div className="flex h-screen overflow-hidden app-bg">
      <Sidebar />

      <div className="flex-1 overflow-y-auto pb-nav lg:pb-0">

        {/* ── Header ─────────────────────────────────────────── */}
        <header className="px-6 lg:px-10 pt-8 pb-5 flex-shrink-0"
          style={{ background: "var(--surface)", boxShadow: "0 1px 0 var(--border)" }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="max-w-2xl">
              <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text-1)" }}>
                Agents
              </h1>
              <p className="text-[14px] mt-1.5 leading-relaxed" style={{ color: "var(--text-2)" }}>
                Six agents running Buzzworks ops — reading policies, validating timesheets,
                watching regulators, drafting emails, and keeping the payroll cycle on track.
                Here is what each one owns, how they hand off to each other, and what needs your attention.
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium"
              style={{ background: "rgba(5,150,105,0.10)", color: "#059669", border: "1px solid rgba(5,150,105,0.25)" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-dot-blink" style={{ background: "#059669" }} />
              6 agents · all active
            </div>
          </div>

          {/* Impact strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            {impactStats.map(s => (
              <div key={s.label} className="p-4 rounded-xl"
                style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                <div className="text-[11px] uppercase tracking-wider mb-1.5" style={{ color: "var(--text-3)" }}>
                  {s.label}
                </div>
                <div className="text-[22px] font-semibold tabular-nums leading-none" style={{ color: s.color }}>
                  {s.value}
                </div>
                <div className="text-[11px] mt-1.5" style={{ color: "var(--text-3)" }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </header>

        <div className="px-6 lg:px-10 py-8 space-y-10 max-w-[1400px] mx-auto">

          {/* ── Pipelines ─────────────────────────────────────── */}
          <section>
            <div className="mb-4">
              <h2 className="text-[16px] font-semibold" style={{ color: "var(--text-1)" }}>
                How the agents collaborate
              </h2>
              <p className="text-[13px] mt-0.5" style={{ color: "var(--text-3)" }}>
                Three hand-off flows power the product. Each agent only does one thing well; the glue is the pipeline.
              </p>
            </div>

            <div className="space-y-3">
              {PIPELINES.map(p => (
                <div key={p.id} className="rounded-xl overflow-hidden"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div className="px-5 py-3 flex items-center gap-3 flex-wrap"
                    style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
                    <div className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
                      {p.title}
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full"
                      style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
                      {p.volume}
                    </span>
                    <span className="text-[12px] ml-auto" style={{ color: "var(--text-3)" }}>
                      {p.summary}
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-stretch gap-2 overflow-x-auto scrollbar-none">
                      {/* Source */}
                      <div className="flex-shrink-0 flex items-center">
                        <div className="px-3 py-2 rounded-lg text-[11px] font-medium whitespace-nowrap"
                          style={{ background: "var(--bg)", color: "var(--text-2)", border: "1px dashed var(--border-strong)" }}>
                          {p.source}
                        </div>
                        <ArrowRight size={14} className="mx-2 flex-shrink-0" style={{ color: "var(--text-3)" }} />
                      </div>

                      {/* Agent nodes */}
                      {p.steps.map((step, i) => {
                        const a = AGENT_BY_ID[step.agent]
                        return (
                          <div key={i} className="flex items-stretch flex-shrink-0">
                            <button onClick={() => setSelected(a.id)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all hover:scale-[1.02]"
                              style={{ background: `${a.color}10`, border: `1px solid ${a.color}33` }}>
                              <div className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                                style={{ background: a.color, color: "#fff" }}>
                                {a.initial}
                              </div>
                              <div className="text-left">
                                <div className="text-[12px] font-semibold leading-tight" style={{ color: a.color }}>
                                  {a.name}
                                </div>
                                <div className="text-[10px]" style={{ color: "var(--text-3)" }}>
                                  {step.action}
                                </div>
                              </div>
                            </button>
                            {i < p.steps.length - 1 && (
                              <ArrowRight size={14} className="mx-2 self-center flex-shrink-0" style={{ color: "var(--text-3)" }} />
                            )}
                          </div>
                        )
                      })}

                      {/* Sink */}
                      <div className="flex-shrink-0 flex items-center">
                        <ArrowRight size={14} className="mx-2 flex-shrink-0" style={{ color: "var(--text-3)" }} />
                        <div className="px-3 py-2 rounded-lg text-[11px] font-medium whitespace-nowrap"
                          style={{ background: "var(--pink-50)", color: "var(--pink-700)", border: "1px solid var(--pink-100)" }}>
                          {p.sink}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 text-[12px]" style={{ color: "var(--text-2)" }}>
                      <CheckCircle2 size={13} style={{ color: "#059669" }} />
                      {p.outcome}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Roster + Activity (side-by-side on large) ─────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Agent roster */}
            <section className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[16px] font-semibold" style={{ color: "var(--text-1)" }}>Agent roster</h2>
                  <p className="text-[13px] mt-0.5" style={{ color: "var(--text-3)" }}>
                    Click any agent to see what it can do and where in the app you will see it.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {AGENTS.map(agent => {
                  const Icon = agent.icon
                  return (
                    <button
                      key={agent.id}
                      onClick={() => setSelected(agent.id)}
                      className="text-left rounded-xl p-4 transition-all hover:shadow-md"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-[13px]"
                          style={{ background: `${agent.color}15`, color: agent.color }}>
                          {agent.initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>{agent.name}</span>
                            <span className="flex items-center gap-1 text-[10px] font-medium"
                              style={{ color: "#059669" }}>
                              <span className="w-1.5 h-1.5 rounded-full animate-dot-blink" style={{ background: "#059669" }} />
                              Active
                            </span>
                          </div>
                          <div className="text-[12px] mt-0.5 truncate" style={{ color: "var(--text-2)" }}>
                            {agent.role}
                          </div>
                        </div>
                        <Icon size={16} strokeWidth={1.5} style={{ color: agent.color }} className="flex-shrink-0 mt-0.5" />
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div className="p-2 rounded-lg" style={{ background: "var(--bg)" }}>
                          <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Today</div>
                          <div className="text-[15px] font-semibold tabular-nums mt-0.5" style={{ color: "var(--text-1)" }}>
                            {agent.todayVolume.toLocaleString()}
                          </div>
                        </div>
                        <div className="p-2 rounded-lg" style={{ background: "var(--bg)" }}>
                          <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-3)" }}>{agent.metricLabel}</div>
                          <div className="text-[15px] font-semibold tabular-nums mt-0.5" style={{ color: agent.color }}>
                            {agent.metricValue}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 mt-3 flex-wrap text-[10px]" style={{ color: "var(--text-3)" }}>
                        {agent.upstream.length > 0 && (
                          <>
                            <span>in:</span>
                            {agent.upstream.map(u => {
                              const up = AGENT_BY_ID[u]
                              return (
                                <span key={u} className="px-1.5 py-0.5 rounded font-medium"
                                  style={{ background: `${up.color}14`, color: up.color }}>
                                  {up.name}
                                </span>
                              )
                            })}
                          </>
                        )}
                        {agent.downstream.length > 0 && (
                          <>
                            <span className="ml-1">out:</span>
                            {agent.downstream.map(d => {
                              const dn = AGENT_BY_ID[d]
                              return (
                                <span key={d} className="px-1.5 py-0.5 rounded font-medium"
                                  style={{ background: `${dn.color}14`, color: dn.color }}>
                                  {dn.name}
                                </span>
                              )
                            })}
                          </>
                        )}
                        <span className="ml-auto flex items-center gap-1" style={{ color: "var(--text-3)" }}>
                          {agent.works}
                          <ChevronRight size={11} />
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            {/* Live activity feed */}
            <section className="lg:col-span-1">
              <div className="mb-4">
                <h2 className="text-[16px] font-semibold flex items-center gap-2" style={{ color: "var(--text-1)" }}>
                  <Activity size={15} style={{ color: "var(--accent)" }} />
                  Live activity
                </h2>
                <p className="text-[13px] mt-0.5" style={{ color: "var(--text-3)" }}>
                  Last 15 agent actions across the ops pipeline.
                </p>
              </div>

              <div className="rounded-xl overflow-hidden"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="max-h-[620px] overflow-y-auto">
                  {activity.map(a => {
                    const agent = AGENT_BY_ID[a.agentId]
                    const Icon = a.kind === "success" ? CheckCircle2
                              : a.kind === "flag"    ? AlertCircle
                              : Circle
                    const iconColor = a.kind === "success" ? "#059669"
                                    : a.kind === "flag"    ? "var(--warn)"
                                    : "var(--text-3)"
                    return (
                      <button key={a.id}
                        onClick={() => setSelected(agent.id)}
                        className="w-full text-left flex items-start gap-2.5 px-4 py-3 transition-colors hover:bg-[color:var(--bg)]"
                        style={{ borderBottom: "1px solid var(--border)" }}>
                        <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5"
                          style={{ background: agent.color, color: "#fff" }}>
                          {agent.initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] leading-snug" style={{ color: "var(--text-1)" }}>
                            {a.summary}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[10px]" style={{ color: "var(--text-3)" }}>
                            <Icon size={10} style={{ color: iconColor }} />
                            <span>{agent.name}</span>
                            <span>·</span>
                            <span>{fmtAgo(a.minutesAgo)}</span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>
          </div>

          {/* ── Why this is different (one-line principles) ──────────────── */}
          <section className="rounded-2xl p-5 lg:p-6"
            style={{ background: "var(--pink-50)", border: "1px solid var(--pink-100)" }}>
            <div className="flex items-start gap-3">
              <Sparkles size={18} style={{ color: "var(--pink-700)" }} className="flex-shrink-0 mt-1" />
              <div className="flex-1">
                <div className="text-[14px] font-semibold" style={{ color: "var(--pink-700)" }}>
                  The principles behind the roster
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                  {[
                    { title: "One agent, one job.",      body: "Every agent owns exactly one operational surface, so you always know who to trust for what." },
                    { title: "Hand-offs are visible.",   body: "Every signal travels through a named pipeline — no black boxes between submission and decision." },
                    { title: "Humans review, don't do.", body: "Ops reviews the agent's reasoning trail and clicks send. The draft, the data, and the decision come pre-filled." },
                  ].map(p => (
                    <div key={p.title}>
                      <div className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>{p.title}</div>
                      <div className="text-[12px] mt-1 leading-relaxed" style={{ color: "var(--text-2)" }}>{p.body}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Agent detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelected(null)}
          style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-md h-full overflow-y-auto animate-slide-in-right"
            onClick={e => e.stopPropagation()}
            style={{ background: "var(--surface)", boxShadow: "-8px 0 30px rgba(0,0,0,0.12)" }}>
            <div className="px-5 py-4 flex items-center gap-3 sticky top-0"
              style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", zIndex: 10 }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[14px] flex-shrink-0"
                style={{ background: `${selected.color}15`, color: selected.color }}>
                {selected.initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>
                  {selected.name}
                </div>
                <div className="text-[12px]" style={{ color: "var(--text-3)" }}>{selected.role}</div>
              </div>
              <button onClick={() => setSelected(null)}
                className="w-8 h-8 rounded-md flex items-center justify-center" style={{ color: "var(--text-3)" }}>
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
                {selected.acronym}
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-wider mb-1.5" style={{ color: "var(--text-3)" }}>
                  What it does
                </div>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                  {selected.operational}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg" style={{ background: "var(--bg)" }}>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Today</div>
                  <div className="text-[18px] font-semibold tabular-nums mt-1" style={{ color: "var(--text-1)" }}>
                    {selected.todayVolume.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-lg" style={{ background: "var(--bg)" }}>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-3)" }}>{selected.metricLabel}</div>
                  <div className="text-[18px] font-semibold tabular-nums mt-1" style={{ color: selected.color }}>
                    {selected.metricValue}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-wider mb-2" style={{ color: "var(--text-3)" }}>
                  Capabilities
                </div>
                <ul className="space-y-2">
                  {selected.capabilities.map(c => (
                    <li key={c} className="flex items-start gap-2.5 text-[13px]" style={{ color: "var(--text-2)" }}>
                      <CheckCircle2 size={14} style={{ color: selected.color }} className="flex-shrink-0 mt-0.5" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>

              {(selected.upstream.length > 0 || selected.downstream.length > 0) && (
                <div>
                  <div className="text-[11px] uppercase tracking-wider mb-2" style={{ color: "var(--text-3)" }}>
                    Hand-offs
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selected.upstream.map(u => {
                      const a = AGENT_BY_ID[u]
                      return (
                        <button key={u} onClick={() => setSelected(a.id)}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium"
                          style={{ background: `${a.color}14`, color: a.color }}>
                          {a.name}
                          <ArrowRight size={10} />
                          {selected.name}
                        </button>
                      )
                    })}
                    {selected.downstream.map(d => {
                      const a = AGENT_BY_ID[d]
                      return (
                        <button key={d} onClick={() => setSelected(a.id)}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium"
                          style={{ background: `${a.color}14`, color: a.color }}>
                          {selected.name}
                          <ArrowRight size={10} />
                          {a.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="p-3 rounded-lg flex items-center gap-2 text-[12px]"
                style={{ background: "var(--pink-50)", border: "1px solid var(--pink-100)", color: "var(--pink-700)" }}>
                <Inbox size={13} /> Surfaces in: <span className="font-semibold">{selected.works}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
