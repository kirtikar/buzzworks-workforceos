"use client"

import { useState } from "react"
import Sidebar from "@/components/Sidebar"
import BottomNav from "@/components/BottomNav"
import {
  ClipboardList, Scale, Mail, Send, Database, BookOpen,
  ArrowRight, Inbox, Brain, Zap, CheckCircle2,
  Monitor, BarChart3, Target, RotateCcw,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentCategory = "inspector" | "compliance" | "communication" | "data" | "policy"

interface Agent {
  id:          string
  name:        string
  initial:     string
  acronym:     string
  category:    AgentCategory
  role:        string
  description: string
  color:       string
  icon:        React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>
  capabilities: string[]
}

// ─── MAPE Workflow Steps ──────────────────────────────────────────────────────

const WORKFLOW_STEPS = [
  {
    label: "Monitor",
    sublabel: "Ingestion",
    description: "Portal syncs, email parse, manual entries — data flows in from 10+ HRMS platforms automatically",
    icon: Monitor,
    color: "#6366F1",
  },
  {
    label: "Analyze",
    sublabel: "Reasoning",
    description: "JARVIS runs 7-check policy validation with NLP-backed anomaly detection and cross-referencing",
    icon: Brain,
    color: "#2563EB",
  },
  {
    label: "Plan",
    sublabel: "Decision",
    description: "Confidence scoring, compliance cross-checks via ORACLE, multi-agent coordination for edge cases",
    icon: Target,
    color: "#059669",
  },
  {
    label: "Execute",
    sublabel: "Action",
    description: "Auto-approve at ≥95% confidence, flag with actionables, escalate to ops, trigger payroll pre-check",
    icon: Zap,
    color: "#D97706",
  },
]

// ─── Agent Definitions ────────────────────────────────────────────────────────

const AGENTS: Agent[] = [
  {
    id:       "lexi",
    name:     "LEXI",
    initial:  "L",
    acronym:  "Language Engine for eXecutable policy Interpretation",
    category: "policy",
    role:     "Reads policies in plain English and hands a machine-checkable spec to JARVIS",
    description: "Ingests client policy docs, SOPs, onboarding contracts and ops SLAs in plain English. Classifies each clause into a workflow subfunction (timesheet validation / onboarding / leave & attendance / payroll / compliance / exit / FnF), infers category + severity, compiles trigger expressions and actions into structured rules, and ships them to JARVIS so every timesheet is checked against the latest policy. Ambiguous or contradictory clauses are routed to ops for review instead of silently guessed.",
    color:    "#9333EA",
    icon:     BookOpen,
    capabilities: [
      "LLM-powered policy parser (GPT-4o)",
      "Workflow subfunction classification (7 types)",
      "Category + severity inference",
      "Trigger expression compilation",
      "Ambiguity detection with human-in-the-loop queue",
      "Zero-touch handoff to JARVIS for execution",
    ],
  },
  {
    id:       "jarvis",
    name:     "JARVIS",
    initial:  "J",
    acronym:  "Just-in-time Automated Review & Validation Intelligence System",
    category: "inspector",
    role:     "Timesheet validation with autonomous reasoning and tool use",
    description: "Validates every submission — portal, email, or manual — against the policy pack LEXI compiles for each client. Reasons through edge cases, cross-checks OT pre-approvals, and auto-approves clean submissions without human intervention.",
    color:    "#2563EB",
    icon:     ClipboardList,
    capabilities: [
      "Ingests across 10 HRMS platforms",
      "NLP email parsing (GPT-4o)",
      "Executes LEXI-compiled policy packs",
      "Anomaly pattern detection",
      "Auto-approve at ≥95% confidence",
    ],
  },
  {
    id:       "oracle",
    name:     "ORACLE",
    initial:  "O",
    acronym:  "Operational Regulatory & Compliance Law Engine",
    category: "compliance",
    role:     "Real-time regulatory intelligence with proactive alerting",
    description: "Monitors EPFO, Labour Ministry, ESIC, Income Tax, and 18 state labour boards daily. Maps policy changes to affected clients by worker type and region, generating impact summaries with authoritative source links.",
    color:    "#059669",
    icon:     Scale,
    capabilities: [
      "Daily regulatory monitoring",
      "18 state labour boards covered",
      "IT vs. blue-collar classification",
      "Client impact mapping",
      "Vector DB for semantic search",
    ],
  },
  {
    id:       "ripley",
    name:     "RIPLEY",
    initial:  "R",
    acronym:  "Rapid Intelligent Personnel Liaison & Email Yielder",
    category: "communication",
    role:     "Context-aware email composition for ops workflows",
    description: "Composes pre-filled emails triggered by workflow events — OT flags, missing documents, SLA breaches. Pulls live employee and timesheet data into templates. One click from the ops team to send.",
    color:    "#7C3AED",
    icon:     Mail,
    capabilities: [
      "12 workflow trigger templates",
      "Live data injection",
      "CC/BCC routing logic",
      "SLA escalation re-sends",
      "Per-client tone & signature",
    ],
  },
  {
    id:       "tron",
    name:     "TRON",
    initial:  "T",
    acronym:  "Triggered Relay for Operations & Notifications",
    category: "communication",
    role:     "Payroll digests, alerts, and stakeholder routing",
    description: "Handles outbound communications: weekly AM digests, payment confirmations, anomaly escalations. Ensures every stakeholder gets the right information at the right time without manual composition.",
    color:    "#D97706",
    icon:     Send,
    capabilities: [
      "Weekly payroll digests",
      "Real-time payment alerts",
      "Anomaly escalation routing",
      "Compliance digest distribution",
      "Holiday & cycle reminders",
    ],
  },
  {
    id:       "case",
    name:     "CASE",
    initial:  "C",
    acronym:  "Comprehensive Audit & Security Engine",
    category: "data",
    role:     "Master data integrity and fraud pattern detection",
    description: "Validates PAN against IT dept records, checks bank account uniqueness, verifies work order references. Surfaces duplicates, mismatches, and anomalous billing patterns before payroll runs.",
    color:    "#0EA5E9",
    icon:     Database,
    capabilities: [
      "PAN verification via IT API",
      "Bank uniqueness checks",
      "Duplicate employee detection",
      "Billing pattern analysis",
      "Per-client data quality score",
    ],
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [hoveredStep, setHoveredStep] = useState<number | null>(null)

  return (
    <div className="flex h-screen overflow-hidden app-bg">
      <Sidebar />

      <div className="flex-1 overflow-y-auto pb-nav lg:pb-0">

        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="px-6 lg:px-12 pt-12 pb-8 lg:pt-16 lg:pb-10" style={{ background: "var(--surface)" }}>
          <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight" style={{ color: "var(--text-1)" }}>
            Agentic AI Workflows
          </h1>
          <p className="text-[15px] mt-3 max-w-2xl leading-relaxed" style={{ color: "var(--text-2)" }}>
            Autonomous agents that reason, plan, act, and collaborate to validate
            every timesheet end-to-end — with minimal human intervention.
          </p>
          <p className="text-[13px] mt-2" style={{ color: "var(--text-3)" }}>
            Built on planning, tool use, multi-agent orchestration, and reflection loops.
          </p>
        </section>

        {/* ── MAPE Workflow ────────────────────────────────────── */}
        <section className="px-6 lg:px-12 py-10">
          <div className="flex flex-col lg:flex-row items-stretch gap-3 lg:gap-0">
            {WORKFLOW_STEPS.map((step, i) => (
              <div key={step.label} className="flex items-stretch flex-1 min-w-0">
                {/* Step card */}
                <div
                  className="flex-1 p-5 lg:p-6 rounded-xl transition-all cursor-default"
                  style={{
                    background: hoveredStep === i ? `${step.color}08` : "var(--surface)",
                    boxShadow: hoveredStep === i ? `0 0 0 1px ${step.color}20, var(--shadow)` : "var(--shadow)",
                  }}
                  onMouseEnter={() => setHoveredStep(i)}
                  onMouseLeave={() => setHoveredStep(null)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${step.color}10` }}
                    >
                      <step.icon size={18} strokeWidth={1.5} style={{ color: step.color }} />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold" style={{ color: step.color }}>
                        {step.label}
                      </div>
                      <div className="text-[11px]" style={{ color: "var(--text-3)" }}>
                        {step.sublabel}
                      </div>
                    </div>
                  </div>
                  <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                    {step.description}
                  </p>
                </div>

                {/* Arrow connector */}
                {i < WORKFLOW_STEPS.length - 1 && (
                  <div className="hidden lg:flex items-center justify-center w-8 flex-shrink-0">
                    <ArrowRight size={16} style={{ color: "var(--border-strong)" }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Reflection loop indicator */}
          <div className="flex items-center justify-center gap-2 mt-5">
            <RotateCcw size={13} style={{ color: "var(--text-3)" }} />
            <span className="text-xs" style={{ color: "var(--text-3)" }}>
              Continuous reflection — logs feed back into reasoning for self-improvement
            </span>
          </div>
        </section>

        {/* ── Agents Grid ─────────────────────────────────────── */}
        <section className="px-6 lg:px-12 pb-12">
          <div className="mb-8">
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-1)" }}>
              Our Agentic System
            </h2>
            <p className="text-[13px] mt-1" style={{ color: "var(--text-3)" }}>
              6 specialized agents collaborating autonomously across the ops pipeline
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {AGENTS.map(agent => {
              const expanded = expandedId === agent.id
              const Icon = agent.icon

              return (
                <div
                  key={agent.id}
                  className="rounded-xl transition-all cursor-pointer"
                  style={{
                    background: "var(--surface)",
                    boxShadow: expanded ? `0 0 0 1px ${agent.color}25, var(--shadow-md)` : "var(--shadow)",
                  }}
                  onClick={() => setExpandedId(expanded ? null : agent.id)}
                >
                  {/* Card header */}
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-[15px] font-bold"
                        style={{ background: `${agent.color}10`, color: agent.color }}
                      >
                        {agent.initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>
                            {agent.name}
                          </span>
                          <span className="flex items-center gap-1 text-[11px]" style={{ color: "#059669" }}>
                            <span className="w-1.5 h-1.5 rounded-full animate-dot-blink" style={{ background: "#059669" }} />
                            Active
                          </span>
                        </div>
                        <div className="text-[13px] mt-1" style={{ color: "var(--text-2)" }}>
                          {agent.role}
                        </div>
                      </div>
                    </div>

                    <p className="text-[13px] leading-relaxed mt-4" style={{ color: "var(--text-2)" }}>
                      {agent.description}
                    </p>
                  </div>

                  {/* Expanded: capabilities */}
                  {expanded && (
                    <div className="px-6 pb-6 animate-fade-in">
                      <div className="pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                        <div className="text-[11px] font-medium mb-3" style={{ color: "var(--text-3)" }}>
                          {agent.acronym}
                        </div>
                        <ul className="space-y-2">
                          {agent.capabilities.map(cap => (
                            <li key={cap} className="flex items-center gap-2.5">
                              <CheckCircle2 size={14} strokeWidth={1.5} style={{ color: agent.color }} className="flex-shrink-0" />
                              <span className="text-[13px]" style={{ color: "var(--text-2)" }}>{cap}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

      </div>

      <BottomNav />
    </div>
  )
}
