"use client"

import { useState } from "react"
import Sidebar from "@/components/Sidebar"
import BottomNav from "@/components/BottomNav"
import {
  ClipboardList, Scale, Mail, Send, Database,
  ExternalLink, ArrowRight,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentCategory = "inspector" | "compliance" | "communication" | "data"
type AgentStatus   = "active" | "idle" | "paused"
type LogOutcome    = "success" | "flagged" | "escalated" | "hold"

interface AgentLog {
  timestamp: string
  action:    string
  outcome:   LogOutcome
  detail:    string
}

interface EmailTemplate {
  trigger:    string
  recipient:  string
  subject:    string
  preview:    string
}

interface PolicyUpdate {
  date:             string
  source:           string
  category:         string
  title:            string
  impact:           string
  url:              string
  clientsAffected:  string[]
}

interface Agent {
  id:           string
  name:         string
  initials:     string
  codename:     string
  version:      string
  category:     AgentCategory
  tagline:      string
  description:  string
  color:        string
  bgColor:      string
  icon:         React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>
  status:       AgentStatus
  tags:         string[]
  capabilities: string[]
  outputs:      string[]
  metrics:      Record<string, number>
  metricsLabels: { key: string; label: string; format?: "pct" | "ms" | "count" }[]
  lastAction:   string
  lastActionAt: string
  recentLogs:   AgentLog[]
  emailTemplates?: EmailTemplate[]
  policyFeed?:    PolicyUpdate[]
}

// ─── Category Config ──────────────────────────────────────────────────────────

const CATEGORY_META: Record<AgentCategory, { label: string; color: string; bg: string }> = {
  inspector:     { label: "Inspector",     color: "#4B8FFF", bg: "rgba(75,143,255,0.1)"  },
  compliance:    { label: "Compliance",    color: "#34D399", bg: "rgba(52,211,153,0.1)"  },
  communication: { label: "Communication", color: "#C084FC", bg: "rgba(192,132,252,0.1)" },
  data:          { label: "Data",          color: "#38BDF8", bg: "rgba(56,189,248,0.1)"  },
}

// ─── Agent Definitions ────────────────────────────────────────────────────────

const AGENTS: Agent[] = [
  // ── Mark Sharma — Inspector ──────────────────────────────────────────────
  {
    id:       "mark",
    name:     "MARK",
    initials: "M",
    codename: "MARK",
    version:  "v2.1",
    category: "inspector",
    tagline:  "Every timesheet — portal or email — validated in under 2 seconds",
    description:
      "Mark validates all timesheet submissions regardless of channel — portal syncs, email attachments, or manual entries. Runs a 7-check policy suite against each client's active rule set. Clean submissions are auto-approved and queued for payroll. Violations are escalated with a structured flag report and clear actionables.",
    color:   "#4B8FFF",
    bgColor: "rgba(75,143,255,0.08)",
    icon:    ClipboardList,
    status:  "active",
    tags:    ["Timesheet", "Auto-Approve", "Portal Sync", "Email Parse", "Anomaly Detection"],
    capabilities: [
      "Ingests portal syncs across 10 HRMS platforms",
      "Parses email timesheets via NLP (GPT-4o backed)",
      "Runs 7-check policy validation per submission",
      "Cross-checks OT pre-approvals from portal audit logs",
      "Detects sandwich leave, consecutive OT, daily cap violations",
      "Auto-approves at confidence ≥ 95%, all checks green",
      "Generates structured flag report with policy rule reference",
      "Triggers payroll eligibility pre-check on approval",
    ],
    outputs: [
      "Auto-approved timesheet → payroll queue",
      "Flag report → ops inbox with recommended action",
      "SLA risk alert → Rohan for immediate notification",
      "Anomaly signal → Neha for pattern tracking",
    ],
    metrics: {
      processedToday:   48,
      autoApproved:    266,
      flagged:          24,
      avgProcessingMs: 1420,
    },
    metricsLabels: [
      { key: "processedToday",   label: "Processed Today",  format: "count" },
      { key: "autoApproved",     label: "Auto-Approved",    format: "count" },
      { key: "flagged",          label: "Flagged",          format: "count" },
      { key: "avgProcessingMs",  label: "Avg. Processing",  format: "ms"    },
    ],
    lastAction:   "Auto-approved 3 timesheets from DIN portal sync",
    lastActionAt: "2 min ago",
    recentLogs: [
      { timestamp: "09:42", action: "Auto-approved",  outcome: "success",   detail: "Dinesh Kumar · Dine-In Brands · 44h standard" },
      { timestamp: "09:40", action: "Flagged",        outcome: "flagged",   detail: "Rahul Verma · OT cap exceeded (12h → 14h)" },
      { timestamp: "09:35", action: "Auto-approved",  outcome: "success",   detail: "Sneha Rao · TechCorp India · 40h standard" },
      { timestamp: "09:28", action: "Escalated",      outcome: "escalated", detail: "Ankit Mehta · Missing work order ref #WO-2204" },
      { timestamp: "09:15", action: "Auto-approved",  outcome: "success",   detail: "Priya Das · Swiggy · 38h standard" },
    ],
  },

  // ── Asha Menon — Compliance ───────────────────────────────────────────────
  {
    id:       "asha",
    name:     "ASHA",
    initials: "A",
    codename: "ASHA",
    version:  "v1.3",
    category: "compliance",
    tagline:  "Real-time regulatory intelligence for IT and blue-collar contract workforce",
    description:
      "Asha monitors regulatory changes from EPFO, Labour Ministry, ESIC, Income Tax Department, and state labour boards that affect contract workers. She distinguishes between IT and blue-collar workforce rules, maps changes to affected clients, and surfaces a compliance feed on each client page with deep links to authoritative government sources.",
    color:   "#34D399",
    bgColor: "rgba(52,211,153,0.08)",
    icon:    Scale,
    status:  "active",
    tags:    ["Regulatory", "EPFO", "Labour Law", "ESIC", "IT Compliance", "Blue-Collar"],
    capabilities: [
      "Monitors EPFO, Labour Ministry, ESIC, Income Tax portals daily",
      "Tracks state labour board notifications (18 states covered)",
      "Classifies updates by worker category: IT vs. blue-collar",
      "Maps policy changes to affected clients by worker type and region",
      "Generates plain-English impact summaries with deep links",
      "Stores structured updates in compliance vector DB for semantic search",
      "Alerts clients via feed on their dashboard page",
    ],
    outputs: [
      "Compliance feed per client page (filtered by worker type)",
      "Weekly regulatory digest → Rohan for AM distribution",
      "Vector DB update → Neha for cross-validation enrichment",
      "Critical alert → ops inbox for immediate review",
    ],
    metrics: {
      updatesThisMonth:  14,
      clientsAlerted:    31,
      sourcesMonitored:  22,
      avgAlertDelay:     4,
    },
    metricsLabels: [
      { key: "updatesThisMonth", label: "Policy Updates",    format: "count" },
      { key: "clientsAlerted",  label: "Clients Alerted",   format: "count" },
      { key: "sourcesMonitored",label: "Sources Monitored", format: "count" },
      { key: "avgAlertDelay",   label: "Avg. Alert Delay",  format: "ms"    },
    ],
    lastAction:   "Indexed EPFO circular on increased PF wage ceiling",
    lastActionAt: "3 hrs ago",
    recentLogs: [
      { timestamp: "06:30", action: "Indexed",  outcome: "success",  detail: "EPFO Circular 2025/04 · PF wage ceiling ₹21,000" },
      { timestamp: "Yesterday", action: "Alerted", outcome: "success", detail: "Karnataka Shops Act amendment — 16 clients affected" },
      { timestamp: "Apr 12", action: "Indexed",  outcome: "success",  detail: "Income Tax TDS Section 194C — contract payment threshold" },
      { timestamp: "Apr 10", action: "Flagged",  outcome: "flagged",  detail: "ESIC coverage ambiguity for gig workers — pending clarification" },
    ],
    policyFeed: [
      {
        date:            "Apr 15, 2026",
        source:          "EPFO",
        category:        "Provident Fund",
        title:           "PF Wage Ceiling Revised to ₹21,000 (Effective May 1)",
        impact:          "All blue-collar contract workers currently at ₹15,000 ceiling will see revised PF deductions. Payroll templates need updating before the May cycle.",
        url:             "https://www.epfindia.gov.in",
        clientsAffected: ["Dine-In Brands", "Swiggy", "Zomato", "BigBasket"],
      },
      {
        date:            "Apr 12, 2026",
        source:          "Income Tax Dept.",
        category:        "TDS",
        title:           "TDS Threshold for Contract Payments Raised to ₹1 Lakh/Year",
        impact:          "IT contract workers below ₹1L annual contract value now exempt from TDS Section 194C. Update vendor payment configurations for impacted contractors.",
        url:             "https://incometaxindia.gov.in",
        clientsAffected: ["TechCorp India", "Infosys BPO", "Wipro GE"],
      },
      {
        date:            "Apr 10, 2026",
        source:          "Karnataka Govt.",
        category:        "Labour Law",
        title:           "Karnataka Shops & Establishments Act — Amended Overtime Rules",
        impact:          "OT rate for blue-collar workers in Karnataka increased from 1.5x to 2x for hours beyond 9hrs/day. Mark's OT validation rule set for Bangalore clients requires update.",
        url:             "https://labour.karnataka.gov.in",
        clientsAffected: ["Dine-In Brands", "Swiggy", "Urban Company"],
      },
      {
        date:            "Apr 8, 2026",
        source:          "ESIC",
        category:        "ESI",
        title:           "ESIC Circular: Gig Worker Coverage Framework (Consultation Draft)",
        impact:          "Draft proposes mandatory ESI for platform gig workers earning ₹21,000+/month. Currently in consultation; no action required but monitor for final notification.",
        url:             "https://www.esic.in",
        clientsAffected: ["Swiggy", "Zomato", "Urban Company", "BigBasket"],
      },
    ],
  },

  // ── Priya Nair — Communication ────────────────────────────────────────────
  {
    id:       "priya",
    name:     "PRIYA",
    initials: "P",
    codename: "PRIYA",
    version:  "v1.8",
    category: "communication",
    tagline:  "Canned, context-aware emails for every ops workflow — one click to send",
    description:
      "Priya composes pre-filled, context-aware emails triggered by workflow events: OT flag, missing document, SLA breach, approval confirmation. Each template pulls live data (employee name, hours, rule reference) and presents a ready-to-send email requiring only one click from the ops team. Reduces email drafting from 8–12 min to under 10 seconds.",
    color:   "#C084FC",
    bgColor: "rgba(192,132,252,0.08)",
    icon:    Mail,
    status:  "active",
    tags:    ["Email", "HR Outreach", "OT Flag", "SLA Breach", "Document Request"],
    capabilities: [
      "Composes emails for 12 standard ops workflow triggers",
      "Pulls live employee and timesheet data into templates",
      "CC/BCC routing logic for manager, HR, client AM",
      "Tracks send history and open status per email",
      "Escalation re-send if no response within SLA window",
      "Supports custom per-client email tone and signature",
    ],
    outputs: [
      "Ready-to-send email → ops team review queue",
      "Send confirmation + tracking log → Rohan for digest",
      "Escalation trigger if no response in SLA window",
    ],
    metrics: {
      sentThisMonth: 148,
      avgDraftTime:  8,
      openRate:      74,
      pendingApproval: 5,
    },
    metricsLabels: [
      { key: "sentThisMonth",    label: "Sent This Month",  format: "count" },
      { key: "openRate",         label: "Open Rate",        format: "pct"   },
      { key: "pendingApproval",  label: "Pending Send",     format: "count" },
      { key: "avgDraftTime",     label: "Avg. Draft (sec)", format: "ms"    },
    ],
    lastAction:   "Drafted OT excess notification for Rahul Verma",
    lastActionAt: "9 min ago",
    recentLogs: [
      { timestamp: "09:41", action: "Drafted",  outcome: "success",  detail: "OT flag — Rahul Verma · Dine-In Brands · ready to send" },
      { timestamp: "09:15", action: "Sent",     outcome: "success",  detail: "Document request — Ankit Mehta · WO ref missing" },
      { timestamp: "Yesterday", action: "Sent", outcome: "success",  detail: "SLA breach alert — TechCorp India · 3 timesheets pending 5d" },
      { timestamp: "Apr 13", action: "Escalated", outcome: "escalated", detail: "No response from Swiggy HR after 48h — re-sent" },
    ],
    emailTemplates: [
      {
        trigger:   "OT Cap Exceeded",
        recipient: "Employee + HR Manager",
        subject:   "Action Required: Overtime Approval Needed — [Employee Name]",
        preview:   "Hi [Manager Name], Timesheet for [Employee] on [Date] shows [X] hours OT exceeding the approved [Y]h cap for [Client]. Please review and approve or adjust before [SLA Date].",
      },
      {
        trigger:   "Missing Document",
        recipient: "Employee + Recruiter",
        subject:   "Document Pending: Work Order Reference Missing — [Employee Name]",
        preview:   "Hi [Employee Name], We noticed your timesheet submission for [Period] is missing a work order reference. Please submit WO# to candidatemanager@buzzworks.com by [Date].",
      },
      {
        trigger:   "SLA Breach Warning",
        recipient: "Client AM + Internal Ops",
        subject:   "SLA Alert: [X] Timesheets Pending Approval — [Client Name]",
        preview:   "Hi [AM Name], There are [X] timesheets for [Client] that have been pending approval for [N] days, approaching the [SLA] SLA. Please action or escalate.",
      },
      {
        trigger:   "Auto-Approval Confirmation",
        recipient: "Employee (CC: Manager)",
        subject:   "Timesheet Approved: [Period] — [Employee Name]",
        preview:   "Hi [Employee Name], Your timesheet for [Period] ([X] hours) has been reviewed and approved. It has been queued for payroll processing. No further action needed.",
      },
    ],
  },

  // ── Rohan Kapoor — Communication ─────────────────────────────────────────
  {
    id:       "rohan",
    name:     "ROHAN",
    initials: "R",
    codename: "RELAY",
    version:  "v1.5",
    category: "communication",
    tagline:  "Payroll digests, alerts, and AM routing — nothing gets missed",
    description:
      "Rohan handles outbound payroll communications: weekly digests for account managers, payment alerts for employees, and critical routing when anomalies require human escalation. He ensures every stakeholder gets the right information at the right time without ops team manually composing status updates.",
    color:   "#FBBF24",
    bgColor: "rgba(251,191,36,0.08)",
    icon:    Send,
    status:  "active",
    tags:    ["Payroll Alerts", "Digest", "AM Routing", "Notifications"],
    capabilities: [
      "Weekly payroll digest for each account manager",
      "Real-time payment confirmation notifications to employees",
      "Anomaly escalation routing to relevant AM or ops lead",
      "Compliance digest distribution (sourced from Asha)",
      "SLA breach alerts from Mark escalated immediately",
      "Holiday / pay cycle calendar reminders to clients",
    ],
    outputs: [
      "Weekly AM digest → email + in-app",
      "Payment confirmation → employee SMS / email",
      "Anomaly escalation → designated ops lead",
      "Compliance digest → AMs weekly",
    ],
    metrics: {
      digestsSentThisMonth: 62,
      alertsRouted:         19,
      escalations:           4,
      avgDeliveryMs:       320,
    },
    metricsLabels: [
      { key: "digestsSentThisMonth", label: "Digests Sent",    format: "count" },
      { key: "alertsRouted",         label: "Alerts Routed",   format: "count" },
      { key: "escalations",          label: "Escalations",     format: "count" },
      { key: "avgDeliveryMs",        label: "Avg. Delivery",   format: "ms"    },
    ],
    lastAction:   "Sent weekly payroll digest to 8 account managers",
    lastActionAt: "1 hr ago",
    recentLogs: [
      { timestamp: "08:00", action: "Sent digest",    outcome: "success",  detail: "Weekly payroll digest — 8 AMs, 34 clients covered" },
      { timestamp: "Yesterday", action: "Escalated",  outcome: "escalated", detail: "Anomaly: duplicate bank account detected — routed to Riya Shah" },
      { timestamp: "Apr 14", action: "Alerted",       outcome: "success",  detail: "Payment confirmations — 212 employees notified" },
      { timestamp: "Apr 13", action: "Sent digest",   outcome: "success",  detail: "Compliance digest (Asha) — forwarded to all AMs" },
    ],
  },

  // ── Neha Iyer — Data ─────────────────────────────────────────────────────
  {
    id:       "neha",
    name:     "NEHA",
    initials: "N",
    codename: "NEXUS",
    version:  "v1.9",
    category: "data",
    tagline:  "PAN, bank, and work order integrity — fraud patterns caught before payroll",
    description:
      "Neha validates the integrity of employee master data: PAN cross-checks against IT dept records, bank account uniqueness, work order references. She surfaces duplicate records, mismatched PAN–name pairs, and anomalous work patterns that may indicate time fraud. Flags are raised before payroll is processed.",
    color:   "#38BDF8",
    bgColor: "rgba(56,189,248,0.08)",
    icon:    Database,
    status:  "idle",
    tags:    ["PAN Validation", "Bank Verification", "Fraud Detection", "Data Integrity"],
    capabilities: [
      "PAN verification against Income Tax department API",
      "Bank account uniqueness check across employee pool",
      "Work order reference integrity validation",
      "Duplicate employee detection across clients",
      "Anomalous billing pattern detection (hours vs. project scope)",
      "Regular master data quality scoring per client",
    ],
    outputs: [
      "Data flag → ops inbox with exact mismatch detail",
      "Integrity score per client → Reports dashboard",
      "Fraud pattern alert → Rohan for immediate escalation",
      "Clean record confirmation → payroll clearance",
    ],
    metrics: {
      checksRunThisMonth: 1840,
      flagsRaised:          12,
      fraudPatterns:         2,
      dataScore:            96,
    },
    metricsLabels: [
      { key: "checksRunThisMonth", label: "Checks This Month", format: "count" },
      { key: "flagsRaised",        label: "Flags Raised",      format: "count" },
      { key: "fraudPatterns",      label: "Fraud Patterns",    format: "count" },
      { key: "dataScore",          label: "Data Score",        format: "pct"   },
    ],
    lastAction:   "Completed monthly PAN sweep — 1,840 records clean",
    lastActionAt: "4 hrs ago",
    recentLogs: [
      { timestamp: "05:00", action: "Completed sweep", outcome: "success",  detail: "Monthly PAN + bank verification — 1,840 records" },
      { timestamp: "Apr 14", action: "Flagged",        outcome: "flagged",  detail: "Duplicate bank account: Suresh K and Suresh Kumar (Swiggy)" },
      { timestamp: "Apr 13", action: "Flagged",        outcome: "flagged",  detail: "PAN name mismatch: Anita R vs ANITA ROY in IT records" },
      { timestamp: "Apr 12", action: "Alerted",        outcome: "escalated", detail: "Suspicious OT pattern — same 4 employees every Friday for 6 weeks" },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMetric(val: number, format?: string) {
  if (format === "pct") return `${val}%`
  if (format === "ms")  return val >= 1000 ? `${(val / 1000).toFixed(1)}s` : `${val}ms`
  return val.toLocaleString()
}

const OUTCOME_STYLE: Record<LogOutcome, { dot: string; label: string }> = {
  success:   { dot: "#34D399", label: "Approved"  },
  flagged:   { dot: "#FBBF24", label: "Flagged"   },
  escalated: { dot: "#F87171", label: "Escalated" },
  hold:      { dot: "#94A3B8", label: "Hold"      },
}

const CATEGORY_ORDER: AgentCategory[] = ["inspector", "compliance", "communication", "data"]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [selectedId, setSelectedId] = useState<string>("mark")

  const agent = AGENTS.find(a => a.id === selectedId)!
  const catMeta = CATEGORY_META[agent.category]

  return (
    <div className="flex h-screen overflow-hidden app-bg">
      <Sidebar />

      <div className="flex flex-1 min-w-0 overflow-hidden">

        {/* ── Left panel ──────────────────────────────────────────────────── */}
        <div
          className="hidden lg:flex flex-col flex-shrink-0 overflow-y-auto"
          style={{
            width: 240,
            background: "var(--surface)",
            borderRight: "1px solid var(--border)",
          }}
        >
          {/* Header */}
          <div className="px-4 pt-5 pb-3 flex-shrink-0">
            <div className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>AI Agents</div>
            <div className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>
              {AGENTS.filter(a => a.status === "active").length} active · {AGENTS.length} total
            </div>
          </div>

          {/* Categories */}
          <div className="px-3 pb-4 space-y-5">
            {CATEGORY_ORDER.map(cat => {
              const meta    = CATEGORY_META[cat]
              const members = AGENTS.filter(a => a.category === cat)
              if (!members.length) return null
              return (
                <div key={cat}>
                  {/* Category label */}
                  <div
                    className="flex items-center gap-1.5 px-1 mb-1.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: meta.color }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: meta.color }}
                    />
                    {meta.label}
                  </div>

                  {/* Agent rows */}
                  <div className="space-y-0.5">
                    {members.map(a => {
                      const isSelected = a.id === selectedId
                      const aMeta      = CATEGORY_META[a.category]
                      return (
                        <button
                          key={a.id}
                          onClick={() => setSelectedId(a.id)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
                          style={{
                            background: isSelected ? aMeta.bg : "transparent",
                            border:     isSelected ? `1px solid ${aMeta.color}22` : "1px solid transparent",
                          }}
                        >
                          {/* Avatar */}
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                            style={{ background: aMeta.bg, color: aMeta.color }}
                          >
                            {a.initials}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div
                              className="text-[12px] font-medium truncate"
                              style={{ color: isSelected ? "var(--text-1)" : "var(--text-2)" }}
                            >
                              {a.name}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{
                                  background: a.status === "active" ? "#34D399"
                                            : a.status === "idle"   ? "var(--text-3)"
                                            : "#F87171",
                                }}
                              />
                              <span className="text-[10px] truncate" style={{ color: "var(--text-3)" }}>
                                {a.status === "active" ? "Active" : a.status === "idle" ? "Idle" : "Paused"} · {a.codename}
                              </span>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Mobile chip picker ──────────────────────────────────────────── */}
        <div
          className="lg:hidden flex gap-2 px-4 py-2.5 border-b overflow-x-auto scrollbar-none flex-shrink-0 absolute top-0 left-0 right-0 z-10"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          {AGENTS.map(a => {
            const meta = CATEGORY_META[a.category]
            return (
              <button
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0 text-[11px] font-medium transition-all"
                style={{
                  background: selectedId === a.id ? meta.bg : "var(--surface-2)",
                  color:      selectedId === a.id ? meta.color : "var(--text-2)",
                  border:     selectedId === a.id ? `1px solid ${meta.color}33` : "1px solid var(--border)",
                }}
              >
                {a.name.split(" ")[0]}
              </button>
            )
          })}
        </div>

        {/* ── Detail panel ────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 overflow-y-auto">

          {/* Agent header */}
          <div
            className="px-6 py-5 border-b flex-shrink-0"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-start gap-4">
              {/* Icon circle */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: catMeta.bg }}
              >
                <agent.icon size={22} style={{ color: catMeta.color }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-[18px] font-bold" style={{ color: "var(--text-1)" }}>
                    {agent.name}
                  </span>
                  {/* Category badge */}
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider"
                    style={{ background: catMeta.bg, color: catMeta.color }}
                  >
                    {catMeta.label}
                  </span>
                  {/* Status */}
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-3)" }}>
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: agent.status === "active" ? "#34D399"
                                  : agent.status === "idle"   ? "var(--text-3)"
                                  : "#F87171",
                      }}
                    />
                    {agent.status === "active" ? "Active" : agent.status === "idle" ? "Idle" : "Paused"}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--surface-2)", color: "var(--text-3)" }}>
                    {agent.codename} · {agent.version}
                  </span>
                </div>

                <p className="text-[12px] mt-1 leading-relaxed" style={{ color: "var(--text-2)" }}>
                  {agent.tagline}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {agent.tags.map(tag => (
                    <span
                      key={tag}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{ background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Metrics row */}
          <div className="flex border-b" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            {agent.metricsLabels.map((ml, i) => (
              <div
                key={ml.key}
                className="flex-1 px-5 py-4"
                style={{ borderLeft: i > 0 ? "1px solid var(--border)" : "none" }}
              >
                <div className="text-[22px] font-bold" style={{ color: catMeta.color }}>
                  {fmtMetric(agent.metrics[ml.key] ?? 0, ml.format)}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>{ml.label}</div>
              </div>
            ))}
          </div>

          {/* Body */}
          <div className="p-5 lg:p-6 space-y-5">

            {/* Description */}
            <div
              className="p-4 rounded-xl"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-3)" }}>
                About
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                {agent.description}
              </p>
            </div>

            {/* Capabilities + Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Capabilities */}
              <div
                className="p-4 rounded-xl"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-3)" }}>
                  Capabilities
                </div>
                <ul className="space-y-2">
                  {agent.capabilities.map((c, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: catMeta.color }} />
                      <span className="text-[12px] leading-relaxed" style={{ color: "var(--text-2)" }}>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recent Logs */}
              <div
                className="p-4 rounded-xl"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
                    Recent Activity
                  </div>
                  <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
                    Last: {agent.lastActionAt}
                  </span>
                </div>
                <ul className="space-y-2.5">
                  {agent.recentLogs.map((log, i) => {
                    const os = OUTCOME_STYLE[log.outcome]
                    return (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: os.dot }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium" style={{ color: "var(--text-1)" }}>
                              {log.action}
                            </span>
                            <span className="text-[10px]" style={{ color: "var(--text-3)" }}>· {log.timestamp}</span>
                          </div>
                          <div className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-3)" }}>
                            {log.detail}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>

            {/* Outputs */}
            <div
              className="p-4 rounded-xl"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-3)" }}>
                Outputs
              </div>
              <div className="flex flex-wrap gap-2">
                {agent.outputs.map((o, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg"
                    style={{ background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}
                  >
                    <ArrowRight size={11} style={{ color: catMeta.color }} />
                    {o}
                  </span>
                ))}
              </div>
            </div>

            {/* ── Asha: Policy Feed ─────────────────────────────────────── */}
            {agent.policyFeed && (
              <div
                className="p-4 rounded-xl"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
                    Compliance Feed
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: "rgba(52,211,153,0.1)", color: "#34D399" }}>
                    {agent.policyFeed.length} updates
                  </span>
                </div>
                <div className="space-y-3">
                  {agent.policyFeed.map((p, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-lg"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: "rgba(52,211,153,0.1)", color: "#34D399", border: "1px solid rgba(52,211,153,0.2)" }}
                            >
                              {p.source}
                            </span>
                            <span className="text-[10px] font-medium" style={{ color: "var(--text-3)" }}>
                              {p.category}
                            </span>
                            <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
                              · {p.date}
                            </span>
                          </div>
                          <div className="text-[13px] font-semibold leading-snug mb-1.5" style={{ color: "var(--text-1)" }}>
                            {p.title}
                          </div>
                          <p className="text-[12px] leading-relaxed mb-2" style={{ color: "var(--text-2)" }}>
                            {p.impact}
                          </p>
                          {/* Affected clients */}
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {p.clientsAffected.map(c => (
                              <span
                                key={c}
                                className="text-[10px] px-1.5 py-0.5 rounded"
                                style={{ background: "var(--surface)", color: "var(--text-3)", border: "1px solid var(--border)" }}
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      {/* Source link */}
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium mt-1 transition-opacity hover:opacity-80"
                        style={{ color: "#34D399" }}
                      >
                        <ExternalLink size={11} />
                        View on {p.source} official website
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Priya: Email Templates ────────────────────────────────── */}
            {agent.emailTemplates && (
              <div
                className="p-4 rounded-xl"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
                    Email Templates
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: "rgba(192,132,252,0.1)", color: "#C084FC" }}>
                    {agent.emailTemplates.length} templates
                  </span>
                </div>
                <div className="space-y-3">
                  {agent.emailTemplates.map((t, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-lg"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: "rgba(192,132,252,0.1)", color: "#C084FC", border: "1px solid rgba(192,132,252,0.2)" }}
                            >
                              {t.trigger}
                            </span>
                            <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
                              → {t.recipient}
                            </span>
                          </div>
                          <div className="text-[12px] font-semibold mb-1.5" style={{ color: "var(--text-1)" }}>
                            {t.subject}
                          </div>
                          <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                            {t.preview}
                          </p>
                        </div>
                        {/* Send button */}
                        <button
                          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-opacity hover:opacity-80"
                          style={{ background: "rgba(192,132,252,0.12)", color: "#C084FC", border: "1px solid rgba(192,132,252,0.25)" }}
                        >
                          <Send size={11} />
                          Send
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
