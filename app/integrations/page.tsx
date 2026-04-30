"use client"

import { useState } from "react"
import Sidebar from "@/components/Sidebar"
import AIAgentOrb from "@/components/AIAgentOrb"
import { portals, clients, getClient } from "@/lib/mock-data"
import type { Portal } from "@/lib/types"
import {
  Plug, RefreshCw, CheckCircle2, AlertTriangle, Loader2, PauseCircle,
  Mail, Zap, Clock, Users, ArrowUpRight, Settings2, ChevronRight,
  Webhook, Key, Shield, Activity, Globe, WifiOff,
} from "lucide-react"
import clsx from "clsx"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusConfig(status: Portal["status"]) {
  const map = {
    connected:    { label: "Connected",    color: "var(--accent)", icon: CheckCircle2, bg: "rgba(75,143,255,0.1)",  border: "rgba(75,143,255,0.2)" },
    syncing:      { label: "Syncing…",     color: "#2563EB", icon: Loader2,      bg: "rgba(37,99,235,0.1)", border: "rgba(37,99,235,0.2)" },
    error:        { label: "Error",        color: "#c07070", icon: AlertTriangle, bg: "rgba(192,112,112,0.1)", border: "rgba(192,112,112,0.2)" },
    disconnected: { label: "Disconnected", color: "#46465a", icon: WifiOff,      bg: "rgba(70,70,90,0.1)",   border: "rgba(70,70,90,0.2)" },
    paused:       { label: "Paused",       color: "#c89060", icon: PauseCircle,  bg: "rgba(200,144,96,0.1)", border: "rgba(200,144,96,0.2)" },
  }
  return map[status]
}

function freqLabel(f: Portal["syncFrequency"]) {
  return { "15min": "Every 15 min", "1hr": "Every hour", "4hr": "Every 4 hrs", "24hr": "Daily" }[f]
}

function authLabel(a: Portal["authMethod"]) {
  return { oauth2: "OAuth 2.0", api_key: "API Key", saml: "SAML SSO", basic: "Basic Auth" }[a]
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function fmtNum(n: number) { return n.toLocaleString("en-IN") }

// ─── Portal Card ─────────────────────────────────────────────────────────────

function PortalCard({ portal, onSync }: { portal: Portal; onSync: (id: string) => void }) {
  const sc      = statusConfig(portal.status)
  const StatusI = sc.icon
  const connected = clients.filter(c => portal.connectedClientIds.includes(c.id))

  return (
    <div className="glass rounded-2xl overflow-hidden flex flex-col" style={{ borderColor: "var(--nav-border)" }}>
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        {/* Logo blob */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-base flex-shrink-0"
          style={{ background: portal.bgColor, border: `1px solid ${portal.color}30`, color: portal.color }}
        >
          {portal.shortName.slice(0, 2).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[14px] text-white truncate">{portal.name}</span>
            <span
              className="text-[11px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
              style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
            >
              <StatusI size={10} className={portal.status === "syncing" ? "animate-spin" : ""} />
              {sc.label}
            </span>
          </div>
          <div className="text-[11px] text-white/35 mt-0.5 truncate">{portal.tagline}</div>
        </div>

        {/* Tier badge */}
        <span
          className="text-[11px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider flex-shrink-0"
          style={{ background: "var(--surface-2)", color: "var(--text-3)" }}
        >
          {portal.tier}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-px mx-4 mb-3" style={{ background: "var(--surface-2)" }}>
        {[
          { label: "Clients",    value: portal.connectedClientIds.length },
          { label: "Employees",  value: fmtNum(portal.totalEmployees) },
          { label: "This Month", value: fmtNum(portal.totalSyncedThisMonth) },
        ].map(s => (
          <div key={s.label} className="flex flex-col items-center py-2.5 gap-0.5" style={{ background: "var(--bg)" }}>
            <div className="text-[14px] font-black text-white">{s.value}</div>
            <div className="text-[11px] text-white/30">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Details */}
      <div className="px-4 space-y-2 flex-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-white/35 flex items-center gap-1.5"><Clock size={11} />Last sync</span>
          <span className="text-white/65">{relativeTime(portal.lastSyncAt)}</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-white/35 flex items-center gap-1.5"><RefreshCw size={11} />Frequency</span>
          <span className="text-white/65">{freqLabel(portal.syncFrequency)}</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-white/35 flex items-center gap-1.5"><Key size={11} />Auth</span>
          <span className="text-white/65">{authLabel(portal.authMethod)}</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-white/35 flex items-center gap-1.5"><Activity size={11} />Success rate</span>
          <span style={{ color: portal.successRate > 98 ? "var(--accent)" : portal.successRate > 95 ? "#c89060" : "#c07070" }}>
            {portal.successRate}%
          </span>
        </div>
        {portal.errorCount > 0 && (
          <div
            className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg"
            style={{ background: "rgba(192,112,112,0.08)", color: "#c07070" }}
          >
            <AlertTriangle size={11} />
            {portal.errorCount} error{portal.errorCount > 1 ? "s" : ""} in queue
          </div>
        )}

        {/* Features */}
        <div className="flex flex-wrap gap-1 pt-1">
          {portal.features.slice(0, 3).map(f => (
            <span key={f} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "var(--surface-2)", color: "var(--text-3)" }}>
              {f}
            </span>
          ))}
          {portal.webhookEnabled && (
            <span className="text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "rgba(37,99,235,0.1)", color: "#2563EB" }}>
              <Webhook size={9} /> Webhooks
            </span>
          )}
        </div>

        {/* Connected clients */}
        <div className="pt-1 pb-0.5">
          <div className="text-[11px] text-white/25 mb-1.5">Connected clients</div>
          <div className="flex flex-wrap gap-1">
            {connected.map(c => (
              <span
                key={c.id}
                className="text-[11px] px-2 py-0.5 rounded-md font-semibold"
                style={{ background: `${c.color}18`, color: c.color }}
              >
                {c.code}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 pt-3 flex items-center gap-2 border-t border-white/[0.05] mt-3">
        <button
          onClick={() => onSync(portal.id)}
          className="flex-1 btn-ghost flex items-center justify-center gap-1.5 py-2 text-[12px]"
        >
          <RefreshCw size={12} />
          Sync Now
        </button>
        <button className="flex-1 btn-ghost flex items-center justify-center gap-1.5 py-2 text-[12px]">
          <Settings2 size={12} />
          Configure
        </button>
        <button className="w-8 h-8 btn-ghost flex items-center justify-center">
          <ArrowUpRight size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── Email Integration Card ───────────────────────────────────────────────────

function EmailCard() {
  const [testing, setTesting] = useState(false)
  const [tested, setTested] = useState(false)

  function handleTest() {
    setTesting(true)
    setTimeout(() => { setTesting(false); setTested(true) }, 1800)
  }

  return (
    <div className="glass p-5 rounded-2xl flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.2)" }}
        >
          <Mail size={20} style={{ color: "#2563EB" }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[14px] text-white">Email Inbox Monitor</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(75,143,255,0.1)", color: "var(--accent)", border: "1px solid rgba(75,143,255,0.2)" }}>
              Active
            </span>
          </div>
          <div className="text-[11px] text-white/35 mt-0.5">Monitors workorder.agentic@buzzworks.com for timesheet submissions</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Parsed today",      value: "14",  color: "var(--accent)" },
          { label: "Parsed this month", value: "312", color: "#2563EB" },
          { label: "Parsing errors",    value: "2",   color: "#c07070" },
          { label: "Check frequency",   value: "5 min", color: "var(--text-2)" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <div className="text-[16px] font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[11px] text-white/30 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-2 text-[11px]">
        {[
          { icon: Shield, label: "IMAP protocol",      value: "TLS 1.3 encrypted" },
          { icon: Globe,  label: "Inbox",               value: "workorder.agentic@buzzworks.com" },
          { icon: Zap,    label: "AI parser model",     value: "Claude 3.5 Sonnet" },
          { icon: Clock,  label: "Retention policy",    value: "180 days" },
        ].map(r => (
          <div key={r.label} className="flex items-center justify-between">
            <span className="text-white/35 flex items-center gap-1.5"><r.icon size={11} />{r.label}</span>
            <span className="text-white/65">{r.value}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleTest}
          disabled={testing}
          className="btn-ghost flex items-center gap-2 py-2 px-4 text-[12px] flex-1 justify-center"
        >
          {testing ? <Loader2 size={12} className="animate-spin" /> : tested ? <CheckCircle2 size={12} style={{ color: "var(--accent)" }} /> : <Plug size={12} />}
          {testing ? "Testing…" : tested ? "Connection OK" : "Test Connection"}
        </button>
        <button className="btn-ghost flex items-center gap-1.5 py-2 px-4 text-[12px]">
          <Settings2 size={12} /> Configure
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [synced, setSynced] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<"all" | "connected" | "error">("all")

  function handleSync(id: string) {
    setSyncingId(id)
    setTimeout(() => {
      setSyncingId(null)
      setSynced(prev => new Set([...prev, id]))
    }, 2000)
  }

  const totalEmployees = portals.reduce((s, p) => s + p.totalEmployees, 0)
  const totalSynced    = portals.reduce((s, p) => s + p.totalSyncedThisMonth, 0)
  const errored        = portals.filter(p => p.status === "error" || p.errorCount > 0).length
  const filtered       = portals.filter(p =>
    filter === "all"       ? true :
    filter === "connected" ? p.status === "connected" :
                             (p.status === "error" || p.errorCount > 0)
  )

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header — matches Inbox / Compliance / Policies pattern */}
        <header className="px-6 lg:px-8 py-5 flex-shrink-0 flex items-start gap-4"
          style={{ background: "var(--surface)", boxShadow: "0 1px 0 var(--border)" }}>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-1)" }}>Integrations</h1>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--text-3)" }}>
              Portal connections &amp; email ingestion
            </p>
          </div>
          <button
            onClick={() => portals.forEach(p => handleSync(p.id))}
            className="btn-teal flex items-center gap-1.5 text-xs py-2 px-4 flex-shrink-0"
          >
            <RefreshCw size={12} /> Sync all portals
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-5 space-y-4 lg:space-y-5 pb-nav lg:pb-5">
          {/* Filter tabs */}
          <div className="flex items-center gap-2">
            {(["all", "connected", "error"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx("px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all capitalize", filter === f ? "bg-white/10 text-white" : "text-white/35 hover:text-white/60")}
              >
                {f === "all" ? `All (${portals.length})` : f === "connected" ? `Connected (${portals.filter(p => p.status === "connected").length})` : `Needs attention (${errored})`}
              </button>
            ))}
          </div>

          {/* Portal grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(portal => (
              <div key={portal.id} className="relative">
                {syncingId === portal.id && (
                  <div className="absolute inset-0 rounded-2xl z-10 flex items-center justify-center" style={{ background: "rgba(9,7,20,0.7)", backdropFilter: "blur(4px)" }}>
                    <div className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: "#2563EB" }}>
                      <Loader2 size={16} className="animate-spin" />
                      Syncing {portal.shortName}…
                    </div>
                  </div>
                )}
                {synced.has(portal.id) && syncingId !== portal.id && (
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full" style={{ background: "rgba(75,143,255,0.15)", color: "var(--accent)" }}>
                    <CheckCircle2 size={10} /> Synced
                  </div>
                )}
                <PortalCard portal={portal} onSync={handleSync} />
              </div>
            ))}
          </div>

          {/* Email Integration */}
          <div>
            <h2 className="text-[14px] font-semibold text-white mb-3 flex items-center gap-2">
              <Mail size={14} className="text-violet-400" /> Email Ingestion
            </h2>
            <div className="max-w-md">
              <EmailCard />
            </div>
          </div>

          {/* Add portal CTA */}
          <div
            className="rounded-2xl p-6 flex items-center justify-between"
            style={{ background: "rgba(75,143,255,0.04)", border: "1px dashed rgba(75,143,255,0.2)" }}
          >
            <div>
              <div className="text-[14px] font-semibold text-white mb-0.5">Connect a new portal</div>
              <div className="text-[12px] text-white/35">Supported: HRMS portals with REST/OData/SOAP APIs or webhook capability</div>
            </div>
            <button className="btn-teal flex items-center gap-1.5 text-[12px]">
              <Plug size={13} /> New Integration
            </button>
          </div>
        </main>
      </div>
      <AIAgentOrb />
    </div>
  )
}
