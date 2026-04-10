"use client"

import { useState } from "react"
import {
  Bot, Zap, Shield, Mail, CreditCard, FileText, Activity,
  CheckCircle2, Clock, TrendingUp, AlertTriangle, Sparkles,
  ChevronRight, Play, Pause, RefreshCw, BarChart3, Eye,
} from "lucide-react"
import clsx from "clsx"

// ─── Agent definitions ────────────────────────────────────────────────────────

interface AgentLog {
  timestamp: string
  action: string
  outcome: "success" | "flagged" | "escalated"
  detail: string
}

interface Agent {
  id: string
  name: string
  codename: string
  version: string
  domain: string
  tagline: string
  description: string
  color: string
  bgColor: string
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>
  status: "active" | "idle" | "paused"
  capabilities: string[]
  metrics: {
    processedToday: number
    processedThisMonth: number
    successRate: number
    avgProcessingMs: number
    autoApproved?: number
    flagged?: number
    escalated?: number
  }
  lastAction: string
  lastActionAt: string
  model: string
  recentLogs: AgentLog[]
}

const AGENTS: Agent[] = [
  {
    id: "mark",
    name: "Agent Mark",
    codename: "MARK",
    version: "v2.1",
    domain: "Timesheet Validation & Auto-Approval",
    tagline: "The first line of defence for every submitted timesheet",
    description:
      "Agent Mark ingests every timesheet submitted via portal or email and runs a full policy validation suite against the client's active rule set. For clean submissions — all checks green, confidence ≥ 95% — Mark auto-approves without human intervention, stamping the record with its reasoning. Ambiguous or policy-violating timesheets are escalated to the ops queue with a detailed flag report.",
    color: "#00C896",
    bgColor: "rgba(0,200,150,0.08)",
    icon: Zap,
    status: "active",
    capabilities: [
      "5-check policy validation per timesheet",
      "Auto-approve when confidence ≥ 95%",
      "OT pre-approval cross-check",
      "SLA breach detection",
      "Sandwich leave pattern detection",
      "Escalation to ops with structured flag report",
    ],
    metrics: {
      processedToday: 48,
      processedThisMonth: 1284,
      successRate: 99.2,
      avgProcessingMs: 1420,
      autoApproved: 1089,
      flagged: 163,
      escalated: 32,
    },
    lastAction: "Auto-approved ts010 (IBP / Rajesh Pillai) — 5/5 checks passed, confidence 99%",
    lastActionAt: "2026-04-10T09:01:18Z",
    model: "claude-3-5-sonnet",
    recentLogs: [
      { timestamp: "09:01:18", action: "Auto-approve", outcome: "success",   detail: "ts010 — IBP / Rajesh Pillai — 40h clean, confidence 99%" },
      { timestamp: "08:58:44", action: "Escalate",     outcome: "escalated", detail: "ts001 — TCI / Rahul Sharma — 12h OT without pre-approval" },
      { timestamp: "08:46:55", action: "Auto-approve", outcome: "success",   detail: "ts011 — TCI / Deepa Rao — 40h clean, confidence 97%" },
      { timestamp: "08:11:42", action: "Auto-approve", outcome: "success",   detail: "ts009 — HEX / Suresh Nair — 40h clean, confidence 98%" },
      { timestamp: "07:52:10", action: "Flag",         outcome: "flagged",   detail: "ts004 — IBP / Anita Joshi — leave balance deficit detected" },
    ],
  },
  {
    id: "nova",
    name: "Agent Nova",
    codename: "NOVA",
    version: "v1.4",
    domain: "Anomaly Detection & Pattern Analysis",
    tagline: "Sees the patterns humans miss across thousands of timesheets",
    description:
      "Agent Nova runs nightly and intra-day sweeps across all submitted timesheets, comparing against historical baselines per employee, client, and job category. It surfaces statistically significant deviations — sudden hour spikes, recurring Friday under-reporting, suspicious leave clustering before holidays — and pushes structured anomaly reports to the ops dashboard. Nova does not approve or reject; it advises.",
    color: "#8B5CF6",
    bgColor: "rgba(139,92,246,0.08)",
    icon: Activity,
    status: "active",
    capabilities: [
      "Cross-employee hour deviation analysis",
      "Recurring pattern detection (weekly, monthly)",
      "Leave clustering & sandwich leave profiling",
      "Client-level compliance trend scoring",
      "Anomaly severity scoring (info / warning / critical)",
      "Structured anomaly report generation",
    ],
    metrics: {
      processedToday: 12,
      processedThisMonth: 318,
      successRate: 96.8,
      avgProcessingMs: 4800,
      flagged: 87,
      escalated: 21,
    },
    lastAction: "Detected consecutive OT pattern — TCI / Rahul Sharma (3 weeks, avg 10.2h OT/week)",
    lastActionAt: "2026-04-10T06:00:00Z",
    model: "claude-3-5-sonnet",
    recentLogs: [
      { timestamp: "06:00:00", action: "Anomaly sweep", outcome: "flagged",   detail: "TCI — 3 employees with consecutive OT pattern, escalated to ops" },
      { timestamp: "06:00:00", action: "Anomaly sweep", outcome: "success",   detail: "IBP — compliance trend stable, 97% clean this month" },
      { timestamp: "06:00:00", action: "Anomaly sweep", outcome: "flagged",   detail: "MSH — 2 employees: rest-day deficit in Apr W1" },
      { timestamp: "00:01:00", action: "Nightly sweep", outcome: "success",   detail: "Processed 312 timesheets — 8 anomalies surfaced, 0 critical" },
    ],
  },
  {
    id: "iris",
    name: "Agent Iris",
    codename: "IRIS",
    version: "v1.2",
    domain: "Email Parsing & Ingestion",
    tagline: "Every email becomes a structured timesheet in under 2 seconds",
    description:
      "Agent Iris monitors the candidatemanager@buzzworks.com inbox via IMAP (polled every 5 minutes). On detecting a new submission email, Iris extracts the sender, period, total hours, days present, LOP, and attachment metadata through a multi-stage extraction pipeline (OCR → field extraction → normalization). The structured output is handed off to Agent Mark for validation. Iris also handles malformed or ambiguous emails by requesting clarification.",
    color: "#FF6B6B",
    bgColor: "rgba(255,107,107,0.08)",
    icon: Mail,
    status: "active",
    capabilities: [
      "IMAP inbox monitoring (5-min poll interval)",
      "Email subject + body field extraction",
      "PDF/image attachment OCR",
      "Forwarded email detection & rejection",
      "Structured handoff to Agent Mark",
      "Ambiguous email clarification requests",
    ],
    metrics: {
      processedToday: 7,
      processedThisMonth: 186,
      successRate: 98.4,
      avgProcessingMs: 890,
      flagged: 14,
      escalated: 3,
    },
    lastAction: "Parsed email from mohan.tripathi@nucleussoftware.com — extracted 40h, Apr W1, no attachment detected",
    lastActionAt: "2026-04-09T09:00:00Z",
    model: "claude-3-5-sonnet",
    recentLogs: [
      { timestamp: "09:00:00", action: "Parse email",   outcome: "success",   detail: "NCS / Mohan Tripathi — 40h extracted, handed to Mark" },
      { timestamp: "08:32:17", action: "Parse email",   outcome: "flagged",   detail: "FHL — forward detected (Fwd:), rejected per FHL policy" },
      { timestamp: "07:15:44", action: "Parse email",   outcome: "success",   detail: "MSH / Vikram Singh — 60h extracted, 7-day period, handed to Mark" },
      { timestamp: "06:48:00", action: "Parse email",   outcome: "escalated", detail: "Unknown sender domain — not in employee register, quarantined" },
    ],
  },
  {
    id: "vault",
    name: "Agent Vault",
    codename: "VAULT",
    version: "v1.0",
    domain: "Payroll Compliance & Calculation Checker",
    tagline: "Every rupee calculated correctly before it leaves",
    description:
      "Agent Vault runs pre-payroll audits across approved timesheet batches. It verifies hour-to-amount calculations, applies client-specific OT multipliers, cross-checks LOP deductions against leave records, and flags any discrepancy before the batch is sent to finance. Vault maintains an immutable audit trail of every calculation it validates.",
    color: "#F5A623",
    bgColor: "rgba(245,166,35,0.08)",
    icon: CreditCard,
    status: "active",
    capabilities: [
      "Hour × rate calculation verification",
      "Client-specific OT multiplier application",
      "LOP deduction cross-check",
      "Leave balance reconciliation",
      "Payroll batch pre-audit report",
      "Immutable calculation audit trail",
    ],
    metrics: {
      processedToday: 3,
      processedThisMonth: 62,
      successRate: 100,
      avgProcessingMs: 2100,
      flagged: 9,
      escalated: 2,
    },
    lastAction: "Pre-audit complete — IBP Apr W1 batch (₹48L) — 0 discrepancies, cleared for finance",
    lastActionAt: "2026-04-10T08:30:00Z",
    model: "claude-3-5-sonnet",
    recentLogs: [
      { timestamp: "08:30:00", action: "Batch audit",   outcome: "success",   detail: "IBP Apr W1 — ₹48L, 0 discrepancies — cleared" },
      { timestamp: "08:15:00", action: "Batch audit",   outcome: "flagged",   detail: "MSH Mar W4 — OT multiplier mismatch (2x vs 1.5x), held" },
      { timestamp: "07:45:00", action: "Batch audit",   outcome: "success",   detail: "HEX Mar W4 — ₹31.2L, 0 discrepancies — cleared" },
    ],
  },
  {
    id: "lumen",
    name: "Agent Lumen",
    codename: "LUMEN",
    version: "v0.9",
    domain: "Policy Recommendation Engine",
    tagline: "Turns ops pain points into structured policy rules",
    description:
      "Agent Lumen analyses historical flag and escalation data to identify recurring policy gaps — rules that don't exist but should. It drafts new policy rule suggestions (structured as PolicyRule objects) with supporting rationale drawn from actual incident data. Ops reviewers can accept, modify, or reject each suggestion before it goes live. Lumen is also the engine behind the natural-language policy creator in the Policy Engine screen.",
    color: "#00A8FF",
    bgColor: "rgba(0,168,255,0.08)",
    icon: FileText,
    status: "idle",
    capabilities: [
      "Flag & escalation data analysis",
      "Gap detection in active policy sets",
      "Natural-language → structured rule conversion",
      "Policy suggestion with incident-based rationale",
      "A/B impact simulation before rule activation",
      "Policy version diff and changelog",
    ],
    metrics: {
      processedToday: 0,
      processedThisMonth: 24,
      successRate: 91.7,
      avgProcessingMs: 3200,
      flagged: 0,
      escalated: 2,
    },
    lastAction: "Suggested 'Consecutive OT Pattern Alert' rule for TCI — accepted by ops (now pol004)",
    lastActionAt: "2026-04-08T14:22:00Z",
    model: "claude-3-5-sonnet",
    recentLogs: [
      { timestamp: "Apr 08 14:22", action: "Rule suggest", outcome: "success",   detail: "TCI — 'Consecutive OT Pattern' — accepted, now pol004" },
      { timestamp: "Apr 07 11:05", action: "Rule suggest", outcome: "success",   detail: "FHL — 'Original Email Required' — accepted, now pol008" },
      { timestamp: "Apr 05 09:30", action: "Rule suggest", outcome: "escalated", detail: "MSH — 'Mandatory Biometric Sync' — rejected by client" },
    ],
  },
  {
    id: "trace",
    name: "Agent Trace",
    codename: "TRACE",
    version: "v1.1",
    domain: "Audit Trail & Risk Scoring",
    tagline: "Every action logged, every risk quantified",
    description:
      "Agent Trace maintains the complete audit log for every timesheet, payroll batch, policy change, and ops action within OpsDesk. It computes rolling risk scores per employee (based on historical flags, LOP patterns, OT frequency, and submission punctuality) and per client (based on compliance rate, error trends, portal sync health). Risk scores inform ops prioritisation and are surfaced on the dashboard and client profiles.",
    color: "#EC4899",
    bgColor: "rgba(236,72,153,0.08)",
    icon: Shield,
    status: "active",
    capabilities: [
      "Immutable action audit log",
      "Employee risk score computation",
      "Client compliance score computation",
      "Submission punctuality tracking",
      "Risk trend analysis (30/60/90d)",
      "Audit export for client compliance reporting",
    ],
    metrics: {
      processedToday: 184,
      processedThisMonth: 4820,
      successRate: 99.9,
      avgProcessingMs: 80,
      flagged: 0,
      escalated: 0,
    },
    lastAction: "Logged auto-approval event — ts010 by Agent Mark, updated IBP compliance score → 97.4%",
    lastActionAt: "2026-04-10T09:01:19Z",
    model: "claude-3-5-sonnet",
    recentLogs: [
      { timestamp: "09:01:19", action: "Log event",    outcome: "success", detail: "ts010 auto-approval — IBP compliance score updated" },
      { timestamp: "09:01:18", action: "Log event",    outcome: "success", detail: "Agent Mark action logged — auto-approve ts010" },
      { timestamp: "08:58:45", action: "Log event",    outcome: "success", detail: "ts001 escalation — TCI risk score updated (Rahul Sharma +2pts)" },
      { timestamp: "08:46:56", action: "Log event",    outcome: "success", detail: "ts011 auto-approval — TCI compliance score updated" },
    ],
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Agent["status"] }) {
  const cfg = {
    active: { label: "Active", color: "#00C896", bg: "rgba(0,200,150,0.12)" },
    idle:   { label: "Idle",   color: "#8B9CC7", bg: "rgba(139,156,199,0.12)" },
    paused: { label: "Paused", color: "#FF6B6B", bg: "rgba(255,107,107,0.12)" },
  }[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: cfg.color, boxShadow: status === "active" ? `0 0 6px ${cfg.color}` : "none" }}
      />
      {cfg.label}
    </span>
  )
}

function OutcomeDot({ outcome }: { outcome: AgentLog["outcome"] }) {
  const cfg = {
    success:   { color: "#00C896" },
    flagged:   { color: "#FF6B6B" },
    escalated: { color: "#F5A623" },
  }[outcome]
  return <span className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ background: cfg.color }} />
}

function MetricPill({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="glass-card rounded-xl px-3 py-2.5 flex flex-col gap-0.5">
      <div className="text-[11px] text-white/40 font-medium">{label}</div>
      <div className="text-[18px] font-bold text-white leading-none">{value}</div>
      {sub && <div className="text-[10px] text-white/30">{sub}</div>}
    </div>
  )
}

function AgentCard({ agent, onClick, selected }: { agent: Agent; onClick: () => void; selected: boolean }) {
  const Icon = agent.icon
  return (
    <div
      onClick={onClick}
      className={clsx(
        "glass-card rounded-2xl p-5 cursor-pointer transition-all duration-200 border",
        selected ? "border-white/20 shadow-lg" : "border-white/[0.06] hover:border-white/12"
      )}
      style={selected ? { borderColor: agent.color + "55", boxShadow: `0 0 32px ${agent.color}18` } : {}}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: agent.bgColor, border: `1px solid ${agent.color}30` }}
        >
          <Icon size={22} style={{ color: agent.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-white text-[15px]">{agent.name}</span>
            <span className="text-[10px] font-mono text-white/30 bg-white/[0.06] px-1.5 py-0.5 rounded">{agent.version}</span>
          </div>
          <div className="text-[11px] text-white/40 font-medium">{agent.domain}</div>
        </div>
        <StatusBadge status={agent.status} />
      </div>

      {/* Tagline */}
      <p className="text-[12px] text-white/55 leading-relaxed mb-4">{agent.tagline}</p>

      {/* Key metrics row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center">
          <div className="text-[18px] font-bold text-white">{agent.metrics.processedToday}</div>
          <div className="text-[10px] text-white/35">Today</div>
        </div>
        <div className="text-center border-x border-white/[0.06]">
          <div className="text-[18px] font-bold" style={{ color: agent.color }}>{agent.metrics.successRate}%</div>
          <div className="text-[10px] text-white/35">Success</div>
        </div>
        <div className="text-center">
          <div className="text-[18px] font-bold text-white">{agent.metrics.processedThisMonth}</div>
          <div className="text-[10px] text-white/35">This month</div>
        </div>
      </div>

      {/* Last action */}
      <div
        className="rounded-xl px-3 py-2.5 text-[11px]"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="text-white/30 mb-1 flex items-center gap-1.5">
          <Clock size={10} />
          {new Date(agent.lastActionAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="text-white/60 line-clamp-2 leading-relaxed">{agent.lastAction}</div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1.5 text-[10px] text-white/30">
          <Sparkles size={10} />
          {agent.model}
        </div>
        <ChevronRight size={13} className={clsx("transition-transform", selected ? "text-white/60 rotate-90" : "text-white/25")} />
      </div>
    </div>
  )
}

function AgentDetail({ agent }: { agent: Agent }) {
  const Icon = agent.icon
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6" style={{ border: `1px solid ${agent.color}30` }}>
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: agent.bgColor, border: `1px solid ${agent.color}40` }}
          >
            <Icon size={30} style={{ color: agent.color }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-white">{agent.name}</h2>
              <span className="text-[11px] font-mono text-white/30 bg-white/[0.06] px-2 py-0.5 rounded">{agent.version}</span>
              <StatusBadge status={agent.status} />
            </div>
            <div className="text-[12px] font-semibold" style={{ color: agent.color }}>{agent.domain}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
            >
              <RefreshCw size={11} /> Restart
            </button>
            {agent.status === "active"
              ? <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: "rgba(255,107,107,0.12)", color: "#FF6B6B" }}><Pause size={11} /> Pause</button>
              : <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: "rgba(0,200,150,0.12)", color: "#00C896" }}><Play size={11} /> Resume</button>
            }
          </div>
        </div>

        <p className="text-[13px] text-white/55 leading-relaxed mb-5">{agent.description}</p>

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          <MetricPill label="Processed today"   value={agent.metrics.processedToday}   sub="timesheets / events" />
          <MetricPill label="This month"         value={agent.metrics.processedThisMonth} sub="total processed" />
          <MetricPill label="Success rate"       value={`${agent.metrics.successRate}%`}  sub="all-time" />
          <MetricPill label="Avg latency"        value={`${agent.metrics.avgProcessingMs}ms`} sub="per operation" />
        </div>

        {agent.metrics.autoApproved !== undefined && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl px-4 py-3" style={{ background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.15)" }}>
              <div className="text-[22px] font-bold" style={{ color: "#00C896" }}>{agent.metrics.autoApproved}</div>
              <div className="text-[11px] text-white/40">Auto-approved</div>
            </div>
            <div className="rounded-xl px-4 py-3" style={{ background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.15)" }}>
              <div className="text-[22px] font-bold" style={{ color: "#F5A623" }}>{agent.metrics.flagged}</div>
              <div className="text-[11px] text-white/40">Flagged</div>
            </div>
            <div className="rounded-xl px-4 py-3" style={{ background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.15)" }}>
              <div className="text-[22px] font-bold" style={{ color: "#FF6B6B" }}>{agent.metrics.escalated}</div>
              <div className="text-[11px] text-white/40">Escalated to ops</div>
            </div>
          </div>
        )}
      </div>

      {/* Capabilities */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Eye size={14} style={{ color: agent.color }} />
          <span className="text-[13px] font-semibold text-white">Capabilities</span>
        </div>
        <div className="space-y-2">
          {agent.capabilities.map((cap, i) => (
            <div key={i} className="flex items-center gap-3">
              <CheckCircle2 size={13} style={{ color: agent.color }} className="flex-shrink-0" />
              <span className="text-[12px] text-white/60">{cap}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Activity log */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={14} style={{ color: agent.color }} />
            <span className="text-[13px] font-semibold text-white">Recent Activity</span>
          </div>
          <span className="text-[11px] text-white/30">Last {agent.recentLogs.length} events</span>
        </div>
        <div className="space-y-3">
          {agent.recentLogs.map((log, i) => (
            <div key={i} className="flex items-start gap-3">
              <OutcomeDot outcome={log.outcome} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      background: log.outcome === "success" ? "rgba(0,200,150,0.12)" : log.outcome === "flagged" ? "rgba(255,107,107,0.12)" : "rgba(245,166,35,0.12)",
                      color: log.outcome === "success" ? "#00C896" : log.outcome === "flagged" ? "#FF6B6B" : "#F5A623",
                    }}
                  >
                    {log.action}
                  </span>
                  <span className="text-[10px] text-white/25 font-mono">{log.timestamp}</span>
                </div>
                <div className="text-[11px] text-white/50 leading-relaxed">{log.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Model info */}
      <div
        className="rounded-xl px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}
      >
        <Sparkles size={14} className="text-violet-400 flex-shrink-0" />
        <div>
          <div className="text-[11px] font-semibold text-violet-300">Powered by {agent.model}</div>
          <div className="text-[10px] text-white/30">Anthropic · Production model · Buzzworks OpsDesk deployment</div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [selectedId, setSelectedId] = useState<string>("mark")
  const selected = AGENTS.find(a => a.id === selectedId) ?? AGENTS[0]

  const totalProcessedToday  = AGENTS.reduce((s, a) => s + a.metrics.processedToday, 0)
  const totalThisMonth       = AGENTS.reduce((s, a) => s + a.metrics.processedThisMonth, 0)
  const avgSuccess           = (AGENTS.reduce((s, a) => s + a.metrics.successRate, 0) / AGENTS.length).toFixed(1)
  const activeCount          = AGENTS.filter(a => a.status === "active").length

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-white/30 mb-2">
            <Bot size={11} /> AI Agents
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Agent Fleet</h1>
          <p className="text-[13px] text-white/40">Six specialised AI agents powering OpsDesk automation</p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold"
            style={{ background: "rgba(0,200,150,0.1)", color: "#00C896", border: "1px solid rgba(0,200,150,0.2)" }}
          >
            <span className="w-2 h-2 rounded-full animate-dot-blink" style={{ background: "#00C896" }} />
            {activeCount} agents active
          </div>
        </div>
      </div>

      {/* Fleet KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Processed today",  value: totalProcessedToday,  icon: TrendingUp,    color: "#00C896" },
          { label: "This month",       value: totalThisMonth,        icon: BarChart3,     color: "#8B5CF6" },
          { label: "Fleet success rate", value: `${avgSuccess}%`,   icon: CheckCircle2,  color: "#00C896" },
          { label: "Agents active",    value: `${activeCount} / ${AGENTS.length}`, icon: Bot, color: "#F5A623" },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: kpi.color + "18" }}>
              <kpi.icon size={18} style={{ color: kpi.color }} />
            </div>
            <div>
              <div className="text-[20px] font-bold text-white">{kpi.value}</div>
              <div className="text-[11px] text-white/35">{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Agent grid + detail panel */}
      <div className="grid grid-cols-[1fr_420px] gap-5">
        {/* Left: cards */}
        <div className="grid grid-cols-2 gap-4 content-start">
          {AGENTS.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onClick={() => setSelectedId(agent.id)}
              selected={selectedId === agent.id}
            />
          ))}
        </div>

        {/* Right: detail */}
        <div className="sticky top-6 self-start max-h-[calc(100vh-96px)] overflow-y-auto pr-1">
          <AgentDetail agent={selected} />
        </div>
      </div>

      {/* Agent Mark spotlight */}
      <div
        className="glass-card rounded-2xl p-6"
        style={{ border: "1px solid rgba(0,200,150,0.2)", background: "rgba(0,200,150,0.04)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,200,150,0.12)" }}>
            <Zap size={18} style={{ color: "#00C896" }} />
          </div>
          <div>
            <div className="font-bold text-white">Agent Mark — Recent Auto-Approvals</div>
            <div className="text-[11px] text-white/40">Timesheets approved autonomously today without ops intervention</div>
          </div>
          <div className="ml-auto text-[11px] text-white/30 flex items-center gap-1.5">
            <AlertTriangle size={11} className="text-amber-400" />
            Ops can override any auto-approval within 48h
          </div>
        </div>
        <div className="space-y-2">
          {[
            { ts: "ts011", emp: "Deepa Rao",    client: "TCI", hours: 40, confidence: 97, time: "08:46:55", period: "Mar 24–28" },
            { ts: "ts009", emp: "Suresh Nair",  client: "HEX", hours: 40, confidence: 98, time: "08:11:42", period: "Mar 31–Apr 4" },
            { ts: "ts010", emp: "Rajesh Pillai",client: "IBP", hours: 40, confidence: 99, time: "09:01:18", period: "Mar 31–Apr 4" },
          ].map(item => (
            <div
              key={item.ts}
              className="flex items-center gap-4 px-4 py-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,200,150,0.12)" }}>
                <CheckCircle2 size={15} style={{ color: "#00C896" }} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-white text-[13px]">{item.emp}</span>
                <span className="text-white/40 text-[12px] ml-2">·</span>
                <span className="text-white/50 text-[12px] ml-2">{item.client}</span>
                <span className="text-white/30 text-[11px] ml-2">{item.period}</span>
              </div>
              <div className="text-[12px] text-white/50">{item.hours}h</div>
              <div
                className="text-[11px] font-bold px-2 py-1 rounded-lg"
                style={{ background: "rgba(0,200,150,0.12)", color: "#00C896" }}
              >
                {item.confidence}% confidence
              </div>
              <div className="text-[11px] font-mono text-white/25">{item.time}</div>
              <div className="text-[10px] font-semibold px-2 py-1 rounded" style={{ background: "rgba(0,200,150,0.08)", color: "#00C896" }}>
                AUTO-APPROVED
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
