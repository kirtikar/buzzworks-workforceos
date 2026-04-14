"use client"

import { useState } from "react"
import Sidebar from "@/components/Sidebar"
import {
  Bot, Zap, Shield, Mail, CreditCard, FileText, Activity,
  CheckCircle2, Clock, TrendingUp, AlertTriangle, Sparkles,
  ChevronRight, Play, Pause, RefreshCw, BarChart3, Eye,
  UserMinus, Brain, Send, Database, Search, Star,
  ArrowRight, Lock, Unlock, Package,
} from "lucide-react"
import clsx from "clsx"

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentLog {
  timestamp: string
  action: string
  outcome: "success" | "flagged" | "escalated" | "hold"
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
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  status: "active" | "idle" | "paused"
  capabilities: string[]
  triggers: string[]
  outputs: string[]
  metrics: {
    processedToday: number
    processedThisMonth: number
    successRate: number
    avgProcessingMs: number
    [key: string]: number
  }
  metricsLabels: { key: string; label: string; format?: "pct" | "ms" | "inr" | "count" }[]
  lastAction: string
  lastActionAt: string
  model: string
  recentLogs: AgentLog[]
}

// ─── Agent Definitions ────────────────────────────────────────────────────────

const AGENTS: Agent[] = [
  {
    id: "mark",
    name: "Agent Mark",
    codename: "MARK",
    version: "v2.1",
    domain: "Timesheet Ingestion · Validation · Auto-Approval",
    tagline: "Every timesheet — portal or email — validated in under 2 seconds",
    description:
      "Agent Mark is the primary ingestion layer for all timesheet submissions. It reads portal syncs (10 portals) and the monitored email inbox, parses content via NLP, and runs a full 7-check policy validation suite against each client's active rule set. Clean submissions — all checks green, confidence ≥ 95%, no anomalous patterns — are auto-approved and immediately queued for payroll eligibility check. Policy violations, missing data, or low-confidence parses are escalated to the ops queue with a structured flag report and recommended action.",
    color: "var(--accent)",
    bgColor: "rgba(75,143,255,0.08)",
    icon: Zap,
    status: "active",
    capabilities: [
      "Ingest portal syncs across 10 HRMS platforms",
      "Parse email timesheets via NLP pipeline v3.4 (GPT-4o)",
      "Run 7-check policy validation per submission",
      "Cross-check OT pre-approvals from portal audit logs",
      "Detect sandwich leave, consecutive OT patterns, daily cap violations",
      "Auto-approve at confidence ≥ 95%, all checks green",
      "Generate structured flag report for every escalation",
      "Trigger payroll eligibility pre-check on approval",
      "SLA breach detection and proactive alert to RELAY",
    ],
    triggers: [
      "Portal sync event (15 min–24 hr per portal config)",
      "Email received at candidatemanager@buzzworks.com",
      "Manual reprocess trigger from ops team",
    ],
    outputs: [
      "Auto-approved timesheet → payroll queue",
      "Flag report → ops inbox (with policy rule ref + recommended action)",
      "SLA risk alert → Agent RELAY for immediate notification",
      "Anomaly signal → Agent SENTINEL for pattern tracking",
    ],
    metrics: {
      processedToday: 48,
      processedThisMonth: 636,
      successRate: 99.2,
      avgProcessingMs: 1420,
      autoApproved: 266,
      flagged: 24,
      escalated: 9,
      emailsParsed: 38,
    },
    metricsLabels: [
      { key: "processedToday",    label: "Processed today",        format: "count" },
      { key: "processedThisMonth",label: "This month",             format: "count" },
      { key: "autoApproved",      label: "Auto-approved",          format: "count" },
      { key: "flagged",           label: "Flagged",                format: "count" },
      { key: "emailsParsed",      label: "Emails parsed",          format: "count" },
      { key: "avgProcessingMs",   label: "Avg processing",         format: "ms" },
      { key: "successRate",       label: "Parse success",          format: "pct" },
      { key: "escalated",         label: "Escalated to ops",       format: "count" },
    ],
    lastAction: "Auto-approved ts015 (LTI / Ravi Menon) — email parsed, 5/5 checks passed, OT pre-auth confirmed in thread #LTI-OT-0407",
    lastActionAt: "2026-04-07T09:22:14Z",
    model: "GPT-4o (NLP parse) + rule engine (validation)",
    recentLogs: [
      { timestamp:"09:22", action:"Auto-approve",   outcome:"success",   detail:"ts015 · LTI / Ravi Menon · email · confidence 95%" },
      { timestamp:"09:01", action:"Auto-approve",   outcome:"success",   detail:"ts010 · IBP / Rajesh Pillai · portal · confidence 99%" },
      { timestamp:"08:50", action:"Flag → escalate",outcome:"flagged",   detail:"ts001 · TCI / Rahul Sharma · OT pre-approval missing" },
      { timestamp:"08:34", action:"Auto-approve",   outcome:"success",   detail:"ts013 · GSS / Arjun Kumar · portal · OT pre-auth confirmed" },
      { timestamp:"08:11", action:"Auto-approve",   outcome:"success",   detail:"ts009 · HEX / Suresh Nair · portal · confidence 98%" },
      { timestamp:"07:58", action:"Auto-approve",   outcome:"success",   detail:"ts012 · TCI / Rahul Sharma · portal · 22nd consecutive clean" },
    ],
  },

  {
    id: "echo",
    name: "Agent ECHO",
    codename: "ECHO",
    version: "v1.3",
    domain: "Exit Lifecycle · Asset Clearance · FnF Processing",
    tagline: "No employee exits without ECHO completing the clearance chain",
    description:
      "Agent ECHO monitors all employment status changes across every client. The moment an employee transitions to 'notice' or 'ended', ECHO activates the exit lifecycle workflow: it queries the client's asset and equipment registry to calculate the total cost of items in the employee's inventory, applies the client's specific exit policy (garden leave, notice period pay-out, asset recovery timeline), places an immediate salary hold, and coordinates with the client's HR team to initiate and track Full & Final settlement. ECHO owns the entire process until FnF is marked complete and the hold is released.",
    color: "#C89060",
    bgColor: "rgba(200,144,96,0.08)",
    icon: UserMinus,
    status: "active",
    capabilities: [
      "Monitor employment_status changes → 'notice' or 'ended' events",
      "Query client asset/equipment registry for employee inventory",
      "Calculate replacement cost and depreciated value of allocated assets",
      "Apply client-specific exit policy (notice period, garden leave, buyout)",
      "Place salary hold with reason code EXT-001 on exit detection",
      "Generate FnF statement draft (salary payable, deductions, gratuity if applicable)",
      "Email HR + payroll + account manager with exit clearance checklist",
      "Track asset return status — release hold only on full clearance",
      "Escalate if FnF is not processed within client SLA (typically 45 days)",
    ],
    triggers: [
      "employment_status field changes to 'notice' or 'ended'",
      "Notice period end date crossed without status update",
      "Manual trigger from ops for retrospective exit processing",
    ],
    outputs: [
      "Salary HOLD placed → payroll system (reason: EXT-001)",
      "Exit clearance checklist → HR + manager + account manager (email)",
      "FnF draft statement → finance team",
      "Asset recovery request → client IT/admin portal",
      "HOLD released → payroll queue once all clearances confirmed",
    ],
    metrics: {
      processedToday: 0,
      processedThisMonth: 3,
      successRate: 100,
      avgProcessingMs: 4200,
      activeExits: 3,
      fnfPending: 2,
      fnfCompleted: 1,
      assetsOnHoldInr: 420000,
      salaryHolds: 3,
    },
    metricsLabels: [
      { key: "activeExits",        label: "Active exits",           format: "count" },
      { key: "fnfPending",         label: "FnF pending",            format: "count" },
      { key: "fnfCompleted",       label: "FnF completed (month)",  format: "count" },
      { key: "salaryHolds",        label: "Salary holds active",    format: "count" },
      { key: "assetsOnHoldInr",    label: "Asset value on hold",    format: "inr" },
      { key: "processedThisMonth", label: "Exits processed (month)",format: "count" },
      { key: "successRate",        label: "Clearance rate",         format: "pct" },
      { key: "avgProcessingMs",    label: "Avg FnF initiation",     format: "ms" },
    ],
    lastAction: "Placed salary HOLD for Sonia Das (FHL0002) — on notice period, FnF checklist emailed to finance@financehub.co",
    lastActionAt: "2026-04-09T09:30:00Z",
    model: "Rule engine + document generation (GPT-4o)",
    recentLogs: [
      { timestamp:"09:30", action:"Salary HOLD placed",   outcome:"hold",    detail:"Sonia Das (FHL0002) · on notice · FnF initiated" },
      { timestamp:"09:28", action:"Asset query",          outcome:"success",  detail:"FHL asset registry queried · 1 laptop, 1 access card · ₹92,000 value" },
      { timestamp:"09:25", action:"Email dispatched",     outcome:"success",  detail:"Exit checklist sent to finance@financehub.co + hr@financehub.co" },
      { timestamp:"Mar 22","action":"FnF released",       outcome:"success",  detail:"Vikram Singh (MSH0001 prev exit) · all assets returned · hold lifted" },
      { timestamp:"Mar 15", action:"Salary HOLD placed",  outcome:"hold",    detail:"Exit detected for emp022 (CGI0088) · query asset registry" },
    ],
  },

  {
    id: "sentinel",
    name: "Agent SENTINEL",
    codename: "SENTINEL",
    version: "v1.0",
    domain: "Manager Intelligence · Sentiment Analysis · Hidden Rating",
    tagline: "Surfacing what managers signal but never say",
    description:
      "Agent SENTINEL operates silently in the background, building a behavioural intelligence layer on top of every manager interaction in the system. It analyses approval/rejection patterns, response latency on flagged timesheets, tone of email communications forwarded through the platform, and the correlation between manager actions and employee attrition signals. SENTINEL produces an internal 'manager reliability score' — invisible to the client — that informs Agent Mark's trust tier calculations. It also detects early attrition risk by tracking sentiment drift in employee-submitted notes and manager-added comments over time.",
    color: "#7090C8",
    bgColor: "rgba(112,144,200,0.08)",
    icon: Brain,
    status: "active",
    capabilities: [
      "Track manager approval/rejection latency per client",
      "Sentiment analysis on manager email responses (GPT-4o)",
      "Detect bias patterns — selective fast-tracking or chronic delays by manager",
      "Build internal manager reliability score (0–100, not exposed to client)",
      "Correlate approval speed with employee tenure and attrition risk",
      "Detect employee distress signals in timesheet submission notes",
      "Flag managers with consistent rejection patterns for ops review",
      "Feed trust tier calculation for Agent Mark auto-approval decisions",
      "Generate quarterly Manager Intelligence Report for Buzzworks leadership",
    ],
    triggers: [
      "Any manager approval, rejection, or delay action",
      "Email received with manager CC containing sentiment-triggering language",
      "Weekly scheduled scan of all manager action history",
      "Employee attrition signal detected (status → notice)",
    ],
    outputs: [
      "Manager reliability score → Agent Mark trust tier engine",
      "Attrition risk flag → ops + account manager alert",
      "Sentiment report → Buzzworks leadership (monthly)",
      "Bias pattern alert → ops inbox (actionable insight)",
    ],
    metrics: {
      processedToday: 12,
      processedThisMonth: 218,
      successRate: 97.4,
      avgProcessingMs: 890,
      managersTracked: 47,
      attritionRisks: 3,
      biasAlertsThisMonth: 2,
      avgManagerScore: 78,
    },
    metricsLabels: [
      { key: "managersTracked",     label: "Managers tracked",        format: "count" },
      { key: "avgManagerScore",     label: "Avg manager reliability", format: "count" },
      { key: "attritionRisks",      label: "Attrition risks flagged", format: "count" },
      { key: "biasAlertsThisMonth", label: "Bias alerts (month)",     format: "count" },
      { key: "processedThisMonth",  label: "Actions analysed (month)",format: "count" },
      { key: "processedToday",      label: "Actions today",           format: "count" },
      { key: "successRate",         label: "Confidence rate",         format: "pct" },
      { key: "avgProcessingMs",     label: "Avg analysis time",       format: "ms" },
    ],
    lastAction: "Attrition risk flag raised — emp007 (FHL / Sonia Das) sentiment drift detected over 6 weeks; now confirmed on notice",
    lastActionAt: "2026-04-09T10:15:00Z",
    model: "GPT-4o (sentiment) + statistical pattern engine",
    recentLogs: [
      { timestamp:"10:15", action:"Attrition risk flagged", outcome:"escalated", detail:"Sonia Das (FHL0002) — 6-week negative sentiment drift confirmed" },
      { timestamp:"09:40", action:"Manager score updated",  outcome:"success",   detail:"mgr@techcorp.in · score 72 → 68 · 3 consecutive delayed approvals" },
      { timestamp:"08:00", action:"Weekly scan",            outcome:"success",   detail:"47 managers scanned · 2 bias patterns identified" },
      { timestamp:"Apr 7", action:"Bias alert raised",      outcome:"flagged",   detail:"MGR-HEX-014 · approving own team 40% faster than cross-team" },
      { timestamp:"Apr 5", action:"Sentiment analysis",     outcome:"success",   detail:"18 manager emails processed · avg sentiment +0.62" },
    ],
  },

  {
    id: "relay",
    name: "Agent RELAY",
    codename: "RELAY",
    version: "v1.1",
    domain: "Payroll Communications · Snapshots · Escalation Alerts",
    tagline: "The right information, to the right person, at the right moment",
    description:
      "Agent RELAY is the communications backbone of OpsDesk. It assembles and dispatches payroll status snapshots to the Buzzworks ops team and client account managers at configurable intervals — daily digest, cycle close alert, and critical escalations. RELAY knows which account manager owns which client and routes notifications accordingly. It tracks email delivery confirmations and re-sends failed deliveries. For urgent events (SLA breach imminent, salary hold placed, FnF overdue), RELAY fires an immediate out-of-cycle alert regardless of the digest schedule.",
    color: "#A78BFA",
    bgColor: "rgba(167,139,250,0.08)",
    icon: Send,
    status: "active",
    capabilities: [
      "Compile payroll snapshot: pending by client, holds with reasons, amounts",
      "Daily end-of-day digest to ops team and per-client account managers",
      "Cycle close alert (48h before payroll deadline) with action checklist",
      "Immediate escalation for SLA breach, salary hold, FnF overdue",
      "Delivery tracking — re-send on failure with ops notification",
      "Customisable DL routing per client account manager",
      "Attach formatted PDF snapshot to digest emails",
      "Integration with Agent ECHO for exit hold notifications",
      "Integration with Agent NEXUS for data completeness alerts",
    ],
    triggers: [
      "Scheduled: daily 18:00 IST for digest",
      "Scheduled: 48h before payroll cycle close",
      "Event-driven: SLA breach imminent (from Agent Mark)",
      "Event-driven: salary hold placed (from Agent ECHO or NEXUS)",
      "Event-driven: FnF overdue > 45 days (from Agent ECHO)",
      "Manual trigger from ops dashboard",
    ],
    outputs: [
      "Daily digest email → ops team + account managers",
      "Cycle close alert email → ops team",
      "Critical alert email → specific account manager + Riya Shah",
      "PDF payroll snapshot attachment",
      "Delivery confirmation log → OpsDesk audit trail",
    ],
    metrics: {
      processedToday: 3,
      processedThisMonth: 94,
      successRate: 99.8,
      avgProcessingMs: 340,
      digestsSent: 28,
      criticalAlerts: 6,
      deliveryFailures: 1,
      uniqueRecipients: 14,
    },
    metricsLabels: [
      { key: "digestsSent",       label: "Digests sent (month)",     format: "count" },
      { key: "criticalAlerts",    label: "Critical alerts (month)",  format: "count" },
      { key: "uniqueRecipients",  label: "Unique recipients",        format: "count" },
      { key: "deliveryFailures",  label: "Delivery failures",        format: "count" },
      { key: "processedThisMonth",label: "Total dispatched (month)", format: "count" },
      { key: "processedToday",    label: "Dispatched today",         format: "count" },
      { key: "successRate",       label: "Delivery success",         format: "pct" },
      { key: "avgProcessingMs",   label: "Avg compile time",         format: "ms" },
    ],
    lastAction: "Dispatched daily digest to ops@buzzworks.com + 6 account managers — 636 timesheets, 9 holds, 8 batches summary",
    lastActionAt: "2026-04-09T18:00:00Z",
    model: "Template engine + GPT-4o (narrative summary)",
    recentLogs: [
      { timestamp:"18:00", action:"Daily digest sent",      outcome:"success",   detail:"8 account managers · 636 timesheets · 9 holds · ₹4.03Cr payroll" },
      { timestamp:"14:30", action:"Critical alert",         outcome:"escalated", detail:"LTI batch — 4 on-hold employees · SLA breach risk in 6h" },
      { timestamp:"09:31", action:"Hold notification",      outcome:"success",   detail:"FHL payroll hold (Sonia Das FnF) → finance@financehub.co" },
      { timestamp:"Apr 8", action:"Cycle close alert",      outcome:"success",   detail:"Payroll cycle closes Apr 11 · 23 timesheets pending approval" },
      { timestamp:"Apr 7", action:"Daily digest sent",      outcome:"success",   detail:"7 account managers · 598 timesheets · 12 holds" },
    ],
  },

  {
    id: "nexus",
    name: "Agent NEXUS",
    codename: "NEXUS",
    version: "v1.0",
    domain: "Data Completeness · Payroll Eligibility · Fraud Detection",
    tagline: "No incomplete or fraudulent record reaches payroll",
    description:
      "Agent NEXUS is the last line of defence before any employee enters the payroll queue. It validates data completeness — PAN, bank account, IFSC, work order number — and blocks payroll silently if any critical field is missing. It runs a cross-employee banking fraud check, flagging cases where the same account number is claimed by multiple employees. It also validates work order numbers against the client's active work order registry and detects identity mismatches between Buzzworks' employee_id and the client's client_employee_id. NEXUS updates the eligibility flag in real-time and triggers Agent RELAY to notify the affected employee's HR contact.",
    color: "#10B981",
    bgColor: "rgba(16,185,129,0.08)",
    icon: Database,
    status: "active",
    capabilities: [
      "Validate PAN presence and basic checksum format for all employees",
      "Validate bank account + IFSC code before every payroll run",
      "Cross-employee banking fraud detection — duplicate account flagging",
      "Work order number validation against client's active WO registry",
      "Identity consistency check: employee_id ↔ client_employee_id",
      "Payroll eligibility gate: is_active + contract + WO + no violations + manager approved",
      "Real-time hold placement with reason code (PRP-002, WOV-003, DCM-007, etc.)",
      "Trigger RELAY to notify HR contact for each data hold",
      "Daily sweep — re-check all held employees for data completion",
    ],
    triggers: [
      "Pre-payroll run eligibility check (each batch)",
      "New employee onboarded (immediate completeness check)",
      "Daily 06:00 IST sweep of all active employees",
      "Manual trigger from ops for specific employee or batch",
    ],
    outputs: [
      "Payroll eligibility flag (eligible / blocked) per employee",
      "Salary HOLD with reason code → payroll system",
      "Data completeness alert → HR contact via Agent RELAY",
      "Banking fraud alert → ops + compliance team (urgent)",
      "Identity mismatch report → account manager",
    ],
    metrics: {
      processedToday: 186,
      processedThisMonth: 4820,
      successRate: 99.6,
      avgProcessingMs: 210,
      bankHolds: 3,
      workOrderGaps: 2,
      duplicateAccounts: 1,
      panMissing: 0,
      eligibilityBlocked: 9,
    },
    metricsLabels: [
      { key: "eligibilityBlocked", label: "Payroll blocked",         format: "count" },
      { key: "bankHolds",          label: "Bank detail holds",       format: "count" },
      { key: "workOrderGaps",      label: "Work order gaps",         format: "count" },
      { key: "duplicateAccounts",  label: "Duplicate accounts",      format: "count" },
      { key: "panMissing",         label: "PAN missing",             format: "count" },
      { key: "processedToday",     label: "Checks today",            format: "count" },
      { key: "successRate",        label: "Check pass rate",         format: "pct" },
      { key: "avgProcessingMs",    label: "Avg check time",          format: "ms" },
    ],
    lastAction: "Duplicate bank account detected — emp031 and emp044 (both GSS) share account ••••5521 — banking fraud alert dispatched to compliance",
    lastActionAt: "2026-04-09T06:18:00Z",
    model: "Deterministic rule engine + fuzzy match (account dedup)",
    recentLogs: [
      { timestamp:"06:18", action:"Fraud flag raised",      outcome:"escalated", detail:"Duplicate bank ••••5521 · emp031 + emp044 (GSS) · compliance notified" },
      { timestamp:"06:02", action:"Daily sweep complete",   outcome:"success",   detail:"4,820 employees checked · 9 blocked · 3 bank holds · 2 WO gaps" },
      { timestamp:"Apr 8", action:"Work order hold",        outcome:"hold",      detail:"emp028 (LTI0044) · WO-2603 expired · salary blocked" },
      { timestamp:"Apr 8", action:"Data hold lifted",       outcome:"success",   detail:"emp019 (HEX0821) · IFSC updated by HR · payroll eligibility restored" },
      { timestamp:"Apr 7", action:"PAN validation",         outcome:"success",   detail:"186 employees validated · 0 missing PAN · all format checks pass" },
    ],
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtMetric(value: number, format?: string): string {
  if (format === "pct") return `${value}%`
  if (format === "ms") {
    if (value < 1000) return `${value}ms`
    return `${(value / 1000).toFixed(1)}s`
  }
  if (format === "inr") {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
    return `₹${value.toLocaleString("en-IN")}`
  }
  return value.toLocaleString("en-IN")
}

const outcomeStyle: Record<AgentLog["outcome"], { color: string; label: string }> = {
  success:   { color: "var(--accent)", label: "✓" },
  flagged:   { color: "var(--warn)",   label: "⚑" },
  escalated: { color: "var(--danger)", label: "↑" },
  hold:      { color: "#A78BFA",       label: "⏸" },
}

// ─── Fleet status bar ─────────────────────────────────────────────────────────

const totalToday = AGENTS.reduce((s, a) => s + a.metrics.processedToday, 0)
const activeCount = AGENTS.filter(a => a.status === "active").length

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [selected, setSelected] = useState<string>(AGENTS[0].id)
  const agent = AGENTS.find(a => a.id === selected)!

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="flex items-center gap-3 px-4 lg:px-6 py-3 lg:py-3.5 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--glass-bg)", backdropFilter: "blur(20px)" }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.3), rgba(75,143,255,0.3))", border: "1px solid rgba(37,99,235,0.2)" }}>
            <Bot size={16} style={{ color: "var(--accent)" }} />
          </div>
          <div className="flex-1">
            <h1 className="text-[15px] font-bold" style={{ color: "var(--text-1)" }}>AI Agent Fleet</h1>
            <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
              5 specialised agents · {activeCount} active · {totalToday} actions today
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-lg font-medium"
            style={{ background: "var(--accent-dim)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-dot-blink" style={{ background: "var(--accent)" }} />
            All systems operational
          </div>
        </header>

        {/* Mobile agent picker — horizontal chip scroll */}
        <div className="flex sm:hidden items-center gap-2 px-4 py-2 overflow-x-auto flex-shrink-0 scrollbar-none"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          {AGENTS.map(a => (
            <button key={a.id} onClick={() => setSelected(a.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0 text-[11px] font-semibold transition-all"
              style={{
                background: selected === a.id ? `${a.color}22` : "var(--surface-hover)",
                border: `1px solid ${selected === a.id ? a.color + "40" : "var(--border)"}`,
                color: selected === a.id ? a.color : "var(--text-2)",
              }}>
              <a.icon size={11} />
              {a.name}
            </button>
          ))}
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* Agent list — left panel */}
          <div className="hidden sm:block w-44 lg:w-56 flex-shrink-0 overflow-y-auto p-3 space-y-1.5"
            style={{ borderRight: "1px solid var(--border)" }}>
            {AGENTS.map(a => (
              <button
                key={a.id}
                onClick={() => setSelected(a.id)}
                className={clsx("w-full text-left rounded-xl p-3 transition-all")}
                style={{
                  background: selected === a.id ? `${a.color}14` : "transparent",
                  border: selected === a.id ? `1px solid ${a.color}30` : "1px solid transparent",
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${a.color}18`, border: `1px solid ${a.color}25` }}>
                    <a.icon size={14} style={{ color: a.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold truncate" style={{ color: selected === a.id ? a.color : "var(--text-1)" }}>{a.name}</div>
                    <div className="text-[9px]" style={{ color: "var(--text-3)" }}>{a.codename} {a.version}</div>
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: a.status === "active" ? "var(--accent)" : a.status === "paused" ? "var(--warn)" : "var(--text-3)" }} />
                </div>
                <div className="text-[10px] leading-tight line-clamp-2" style={{ color: "var(--text-3)" }}>{a.domain.split(" · ")[0]}</div>
              </button>
            ))}
          </div>

          {/* Agent detail — right panel */}
          <div className="flex-1 overflow-y-auto pb-nav lg:pb-0">

            {/* Agent header */}
            <div className="px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)", background: `${agent.color}06` }}>
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${agent.color}18`, border: `1px solid ${agent.color}35` }}>
                  <agent.icon size={26} style={{ color: agent.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-[18px] font-black" style={{ color: "var(--text-1)" }}>{agent.name}</h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold font-mono"
                      style={{ background: `${agent.color}18`, color: agent.color }}>{agent.version}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize"
                      style={{ background: agent.status === "active" ? "var(--accent-dim)" : "var(--surface)", color: agent.status === "active" ? "var(--accent)" : "var(--text-2)", border: "1px solid var(--border)" }}>
                      {agent.status}
                    </span>
                  </div>
                  <div className="text-[12px] font-semibold mt-0.5" style={{ color: agent.color }}>{agent.tagline}</div>
                  <div className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>{agent.domain}</div>
                </div>
                <div className="hidden lg:flex items-center gap-2">
                  <button className="btn-ghost text-[12px] flex items-center gap-1.5">
                    <Pause size={12} /> Pause
                  </button>
                  <button className="btn-ghost text-[12px] flex items-center gap-1.5">
                    <RefreshCw size={12} /> Force run
                  </button>
                </div>
              </div>
              <p className="text-[12px] mt-3 leading-relaxed" style={{ color: "var(--text-2)" }}>{agent.description}</p>
            </div>

            {/* Metrics grid */}
            <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>Live Metrics</div>
              <div className="grid grid-cols-4 gap-3">
                {agent.metricsLabels.map(ml => (
                  <div key={ml.key} className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div className="text-[18px] font-black" style={{ color: agent.color }}>
                      {fmtMetric(agent.metrics[ml.key] ?? 0, ml.format)}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>{ml.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-6">

              {/* Capabilities */}
              <div className="space-y-4">
                <div className="glass p-4">
                  <div className="text-[12px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>Capabilities</div>
                  <div className="space-y-2">
                    {agent.capabilities.map((c, i) => (
                      <div key={i} className="flex items-start gap-2 text-[12px]">
                        <CheckCircle2 size={12} className="flex-shrink-0 mt-0.5" style={{ color: agent.color }} />
                        <span style={{ color: "var(--text-2)" }}>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Triggers */}
                <div className="glass p-4">
                  <div className="text-[12px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>Triggers</div>
                  <div className="space-y-2">
                    {agent.triggers.map((t, i) => (
                      <div key={i} className="flex items-start gap-2 text-[12px]">
                        <Zap size={11} className="flex-shrink-0 mt-0.5" style={{ color: "var(--warn)" }} />
                        <span style={{ color: "var(--text-2)" }}>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Outputs */}
                <div className="glass p-4">
                  <div className="text-[12px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>Outputs</div>
                  <div className="space-y-2">
                    {agent.outputs.map((o, i) => (
                      <div key={i} className="flex items-start gap-2 text-[12px]">
                        <ArrowRight size={11} className="flex-shrink-0 mt-0.5" style={{ color: agent.color }} />
                        <span style={{ color: "var(--text-2)" }}>{o}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent logs + model info */}
              <div className="space-y-4">
                <div className="glass overflow-hidden">
                  <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
                    <Activity size={13} style={{ color: agent.color }} />
                    <div className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Recent Activity</div>
                  </div>
                  <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                    {agent.recentLogs.map((log, i) => {
                      const os = outcomeStyle[log.outcome]
                      return (
                        <div key={i} className="px-4 py-3 flex items-start gap-3">
                          <span className="text-[13px] font-bold flex-shrink-0 mt-0.5 w-4 text-center" style={{ color: os.color }}>{os.label}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-[12px] font-semibold" style={{ color: "var(--text-1)" }}>{log.action}</div>
                            <div className="text-[11px] mt-0.5 line-clamp-2" style={{ color: "var(--text-2)" }}>{log.detail}</div>
                          </div>
                          <div className="text-[10px] flex-shrink-0 mt-0.5" style={{ color: "var(--text-3)" }}>{log.timestamp}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Model info */}
                <div className="glass p-4">
                  <div className="text-[12px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>Model & Runtime</div>
                  <div className="space-y-2 text-[12px]">
                    {[
                      { label: "Model",            value: agent.model },
                      { label: "Last action",       value: agent.lastActionAt.replace("T", " ").slice(0, 16) + " IST" },
                      { label: "Last action detail",value: agent.lastAction },
                    ].map(r => (
                      <div key={r.label}>
                        <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-3)" }}>{r.label}</div>
                        <div className="leading-snug" style={{ color: "var(--text-2)" }}>{r.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fleet cross-agent note */}
                <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.06), rgba(75,143,255,0.06))", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={12} style={{ color: "#A78BFA" }} />
                    <div className="text-[11px] font-semibold" style={{ color: "#A78BFA" }}>Fleet coordination</div>
                  </div>
                  <div className="text-[11px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                    {agent.id === "mark" && "Mark feeds approval signals to SENTINEL and eligibility gates to NEXUS. SLA risk events trigger RELAY for immediate dispatch."}
                    {agent.id === "echo" && "ECHO fires hold events to NEXUS (payroll eligibility block) and to RELAY (stakeholder notification). SENTINEL receives attrition signals from ECHO."}
                    {agent.id === "sentinel" && "SENTINEL feeds manager reliability scores to Mark's trust tier engine. Attrition risk flags route to RELAY for account manager alerts."}
                    {agent.id === "relay" && "RELAY receives triggers from all 4 agents. It is the only agent that produces external communications — all others are internal-only."}
                    {agent.id === "nexus" && "NEXUS places the final eligibility gate before payroll. Fraud flags are escalated directly to compliance via RELAY, bypassing normal digest scheduling."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
