"use client"

import { useState } from "react"
import Sidebar from "@/components/Sidebar"
import { useTheme } from "@/components/ThemeProvider"
import {
  Sun, Moon, Bell, Shield, Users, Database, Webhook,
  Mail, Smartphone, Clock, Save, ChevronRight, Check,
  Globe, Key, AlertTriangle, Info,
} from "lucide-react"
import clsx from "clsx"

// ─── Section nav ─────────────────────────────────────────────────────────────

const SECTIONS = ["Appearance", "Notifications", "Account", "Integrations", "Security", "System"] as const
type Section = typeof SECTIONS[number]

const SECTION_ICONS: Record<Section, React.FC<{ size?: number; className?: string }>> = {
  Appearance: Sun,
  Notifications: Bell,
  Account: Users,
  Integrations: Webhook,
  Security: Shield,
  System: Database,
}

// ─── Toggle ──────────────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0"
      style={{ background: on ? "var(--accent)" : "var(--border-strong)" }}
    >
      <span
        className="inline-block h-3.5 w-3.5 rounded-full transition-transform"
        style={{ background: "#fff", transform: on ? "translateX(18px)" : "translateX(3px)" }}
      />
    </button>
  )
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium" style={{ color: "var(--text-1)" }}>{label}</div>
        {description && <div className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>{description}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-5">
      <div className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: "var(--text-3)" }}>{title}</div>
      <div className="[&>*:last-child]:border-b-0">{children}</div>
    </div>
  )
}

// ─── Sections ────────────────────────────────────────────────────────────────

function AppearanceSection() {
  const { theme, setTheme } = useTheme()

  const themes = [
    {
      id: "light" as const,
      label: "Light",
      subtitle: "Microsoft Fluent-inspired",
      desc: "Clean white surfaces, blue accent, optimised for daytime use",
      preview: { bg: "#f3f2f1", surface: "#ffffff", accent: "#0078D4", text: "#201f1e" },
    },
    {
      id: "dark" as const,
      label: "Dark",
      subtitle: "Glassmorphism",
      desc: "Dark surfaces with teal accent, optimised for low-light environments",
      preview: { bg: "#09090e", surface: "var(--surface-2)", accent: "var(--accent)", text: "#efefef" },
    },
  ]

  return (
    <div className="space-y-5">
      {/* Theme picker */}
      <SectionCard title="Theme">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 pb-2">
          {themes.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              className="rounded-xl p-4 text-left transition-all relative overflow-hidden"
              style={{
                border: theme === t.id ? "2px solid var(--accent)" : "1px solid var(--border)",
                background: theme === t.id ? "var(--accent-dim)" : "var(--surface)",
              }}
            >
              {theme === t.id && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "var(--accent)" }}>
                  <Check size={11} color="#fff" />
                </span>
              )}
              {/* Mini preview */}
              <div className="rounded-lg mb-3 overflow-hidden" style={{ height: 72, background: t.preview.bg, border: "1px solid rgba(0,0,0,0.08)" }}>
                <div className="flex h-full">
                  <div className="w-8 h-full" style={{ background: t.preview.surface, borderRight: "1px solid rgba(0,0,0,0.06)" }}>
                    {[0,1,2,3].map(i => (
                      <div key={i} className="mx-1.5 my-1.5 rounded" style={{ height: 6, background: i === 0 ? t.preview.accent : "rgba(128,128,128,0.2)" }} />
                    ))}
                  </div>
                  <div className="flex-1 p-2 space-y-1.5">
                    <div className="rounded" style={{ height: 8, width: "60%", background: t.preview.text, opacity: 0.6 }} />
                    <div className="rounded" style={{ height: 6, width: "80%", background: t.preview.text, opacity: 0.2 }} />
                    <div className="rounded" style={{ height: 6, width: "40%", background: t.preview.accent, opacity: 0.6 }} />
                    <div className="rounded mt-2" style={{ height: 14, width: "45%", background: t.preview.accent, opacity: 0.9 }} />
                  </div>
                </div>
              </div>
              <div className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>{t.label}</div>
              <div className="text-[10px] font-medium mt-0.5" style={{ color: "var(--accent)" }}>{t.subtitle}</div>
              <div className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>{t.desc}</div>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Display">
        <SettingRow label="Compact table rows" description="Reduces row height in timesheet and employee tables for higher information density">
          <Toggle on={false} onChange={() => {}} />
        </SettingRow>
        <SettingRow label="Animate transitions" description="Page transitions and micro-interactions">
          <Toggle on={true} onChange={() => {}} />
        </SettingRow>
        <SettingRow label="Show AI confidence scores" description="Display JARVIS confidence percentages in timesheet rows">
          <Toggle on={true} onChange={() => {}} />
        </SettingRow>
      </SectionCard>
    </div>
  )
}

function NotificationsSection() {
  const [notifs, setNotifs] = useState({
    email_flagged: true,
    email_payroll: true,
    email_digest: false,
    push_urgent: true,
    push_approvals: false,
    sla_breach: true,
  })
  type NotifKey = keyof typeof notifs

  return (
    <div className="space-y-5">
      <SectionCard title="Email Alerts">
        <SettingRow label="Flagged timesheets" description="Receive an email when a timesheet is flagged for manual review">
          <Toggle on={notifs.email_flagged} onChange={v => setNotifs(n => ({ ...n, email_flagged: v }))} />
        </SettingRow>
        <SettingRow label="Payroll approvals" description="Notifications when payroll batches require your approval">
          <Toggle on={notifs.email_payroll} onChange={v => setNotifs(n => ({ ...n, email_payroll: v }))} />
        </SettingRow>
        <SettingRow label="Daily digest" description="End-of-day summary of all pending actions across clients">
          <Toggle on={notifs.email_digest} onChange={v => setNotifs(n => ({ ...n, email_digest: v }))} />
        </SettingRow>
      </SectionCard>

      <SectionCard title="In-app Notifications">
        <SettingRow label="Urgent escalations" description="Popups for SLA breaches and policy violations">
          <Toggle on={notifs.push_urgent} onChange={v => setNotifs(n => ({ ...n, push_urgent: v }))} />
        </SettingRow>
        <SettingRow label="Approval confirmations" description="Notify when JARVIS auto-approves in bulk">
          <Toggle on={notifs.push_approvals} onChange={v => setNotifs(n => ({ ...n, push_approvals: v }))} />
        </SettingRow>
      </SectionCard>

      <SectionCard title="SLA Monitoring">
        <SettingRow label="SLA breach alerts" description="Alert when a client's SLA turnaround time is at risk">
          <Toggle on={notifs.sla_breach} onChange={v => setNotifs(n => ({ ...n, sla_breach: v }))} />
        </SettingRow>
        <SettingRow label="Alert threshold" description="Send alert when SLA time remaining drops below this threshold">
          <select className="glass-input text-[12px] py-1.5" style={{ width: 120 }}>
            <option>4 hours</option>
            <option>8 hours</option>
            <option>24 hours</option>
          </select>
        </SettingRow>
        <SettingRow label="Notification email" description="Override for SLA alerts (leave blank to use account email)">
          <input className="glass-input text-[12px] py-1.5" placeholder="ops@buzzworks.com" style={{ width: 200 }} />
        </SettingRow>
      </SectionCard>
    </div>
  )
}

function AccountSection() {
  return (
    <div className="space-y-5">
      <SectionCard title="Profile">
        <SettingRow label="Full name">
          <input className="glass-input text-[12px] py-1.5" defaultValue="Siddharth Kirtikar" style={{ width: 200 }} />
        </SettingRow>
        <SettingRow label="Email">
          <input className="glass-input text-[12px] py-1.5" defaultValue="siddharth.k@buzzworks.in" style={{ width: 220 }} />
        </SettingRow>
        <SettingRow label="Role" description="Your role in the Buzzworks ops team">
          <select className="glass-input text-[12px] py-1.5" style={{ width: 160 }} defaultValue="Ops Agent">
            <option>Ops Agent</option>
            <option>Ops Manager</option>
            <option>Payroll Lead</option>
            <option>Analyst</option>
          </select>
        </SettingRow>
        <SettingRow label="Timezone">
          <select className="glass-input text-[12px] py-1.5" style={{ width: 180 }}>
            <option>Asia/Kolkata (IST)</option>
            <option>UTC</option>
            <option>America/New_York</option>
          </select>
        </SettingRow>
        <div className="pt-3 pb-1">
          <button className="btn-teal text-[12px] flex items-center gap-1.5">
            <Save size={13} /> Save profile
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Password">
        <SettingRow label="Current password">
          <input type="password" className="glass-input text-[12px] py-1.5" placeholder="••••••••" style={{ width: 200 }} />
        </SettingRow>
        <SettingRow label="New password">
          <input type="password" className="glass-input text-[12px] py-1.5" placeholder="••••••••" style={{ width: 200 }} />
        </SettingRow>
        <SettingRow label="Confirm new password">
          <input type="password" className="glass-input text-[12px] py-1.5" placeholder="••••••••" style={{ width: 200 }} />
        </SettingRow>
        <div className="pt-3 pb-1">
          <button className="btn-ghost text-[12px]">Update password</button>
        </div>
      </SectionCard>
    </div>
  )
}

function IntegrationsSection() {
  const portals = [
    { name: "Veltrix HCM",   status: "connected", clients: 3, lastSync: "2 min ago",   color: "#2563EB" },
    { name: "OrbitHCM",      status: "connected", clients: 3, lastSync: "8 min ago",   color: "#3B82F6" },
    { name: "PeopleHive",    status: "connected", clients: 3, lastSync: "4 min ago",   color: "#10B981" },
    { name: "CloudSpire",    status: "connected", clients: 2, lastSync: "12 min ago",  color: "#F59E0B" },
    { name: "HRLoop",        status: "connected", clients: 3, lastSync: "1 min ago",   color: "#EC4899" },
    { name: "TalentWeave",   status: "warning",   clients: 2, lastSync: "3 hr ago",    color: "#EF4444" },
    { name: "StaffPulse",    status: "connected", clients: 3, lastSync: "6 min ago",   color: "#06B6D4" },
    { name: "LeafHR",        status: "connected", clients: 2, lastSync: "15 min ago",  color: "#84CC16" },
    { name: "PayAxis",       status: "connected", clients: 1, lastSync: "9 min ago",   color: "#A78BFA" },
    { name: "HumanEdge",     status: "connected", clients: 2, lastSync: "5 min ago",   color: "#FB923C" },
  ]

  return (
    <div className="space-y-5">
      <SectionCard title="Portal Connections">
        <div className="space-y-2 pt-1 pb-2">
          {portals.map(p => (
            <div key={p.name} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors" style={{ background: "var(--surface)" }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.status === "connected" ? "var(--accent)" : "var(--warn)" }} />
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ background: `${p.color}18`, color: p.color }}>
                {p.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium" style={{ color: "var(--text-1)" }}>{p.name}</div>
                <div className="text-[10px]" style={{ color: "var(--text-3)" }}>{p.clients} client{p.clients !== 1 ? "s" : ""} · last sync {p.lastSync}</div>
              </div>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: p.status === "connected" ? "var(--accent-dim)" : "var(--warn-bg)",
                  color: p.status === "connected" ? "var(--accent)" : "var(--warn)",
                }}
              >
                {p.status}
              </span>
              <button className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: "var(--text-3)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <ChevronRight size={13} />
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Email Parser">
        <SettingRow label="Inbound address" description="Timesheets sent to this address are auto-parsed by the AI pipeline">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-mono" style={{ color: "var(--accent)" }}>candidatemanager@buzzworks.com</span>
            <Mail size={13} style={{ color: "var(--text-3)" }} />
          </div>
        </SettingRow>
        <SettingRow label="Parser model" description="NLP model version used for email extraction">
          <span className="text-[12px] font-mono" style={{ color: "var(--text-2)" }}>v3.4 (GPT-4o)</span>
        </SettingRow>
        <SettingRow label="Confidence threshold" description="Emails below this confidence score are flagged for manual review">
          <select className="glass-input text-[12px] py-1.5" style={{ width: 120 }}>
            <option>80%</option>
            <option selected>85%</option>
            <option>90%</option>
            <option>95%</option>
          </select>
        </SettingRow>
      </SectionCard>
    </div>
  )
}

function SecuritySection() {
  return (
    <div className="space-y-5">
      <SectionCard title="Two-Factor Authentication">
        <SettingRow label="Authenticator app" description="Use Google Authenticator or Authy for 2FA">
          <div className="flex items-center gap-2">
            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>Enabled</span>
            <button className="btn-ghost text-[11px] py-1 px-3">Reconfigure</button>
          </div>
        </SettingRow>
        <SettingRow label="Backup codes" description="One-time use recovery codes">
          <button className="btn-ghost text-[12px] flex items-center gap-1.5"><Key size={12} /> View codes</button>
        </SettingRow>
      </SectionCard>

      <SectionCard title="Sessions">
        <div className="space-y-2 pt-1 pb-2">
          {[
            { device: "Chrome · MacBook Pro", location: "Bangalore, India", time: "Active now",    current: true },
            { device: "Safari · iPhone 15",   location: "Bangalore, India", time: "2 hours ago",   current: false },
            { device: "Chrome · Windows PC",  location: "Mumbai, India",    time: "Yesterday",     current: false },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: "var(--surface)" }}>
              <Smartphone size={16} style={{ color: "var(--text-3)" }} />
              <div className="flex-1">
                <div className="text-[12px] font-medium" style={{ color: "var(--text-1)" }}>
                  {s.device}
                  {s.current && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>Current</span>}
                </div>
                <div className="text-[10px]" style={{ color: "var(--text-3)" }}>{s.location} · {s.time}</div>
              </div>
              {!s.current && (
                <button className="text-[11px]" style={{ color: "var(--danger)" }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "0.7")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="pt-2 pb-1">
          <button className="btn-coral text-[12px]">Revoke all other sessions</button>
        </div>
      </SectionCard>

      <SectionCard title="API Access">
        <SettingRow label="API key" description="Used for webhook integrations and external tools">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono" style={{ color: "var(--text-3)" }}>bw_sk_••••••••••••••</span>
            <button className="btn-ghost text-[11px] py-1 px-3 flex items-center gap-1"><Key size={11} /> Regenerate</button>
          </div>
        </SettingRow>
      </SectionCard>
    </div>
  )
}

function SystemSection() {
  return (
    <div className="space-y-5">
      <SectionCard title="JARVIS Settings">
        <SettingRow label="Auto-approval enabled" description="Allow JARVIS to approve timesheets that pass all checks with confidence ≥ threshold">
          <Toggle on={true} onChange={() => {}} />
        </SettingRow>
        <SettingRow label="Confidence threshold" description="Minimum AI confidence for auto-approval. Lower = more auto-approvals, higher = safer.">
          <select className="glass-input text-[12px] py-1.5" style={{ width: 120 }}>
            <option>90%</option>
            <option selected>95%</option>
            <option>98%</option>
            <option>100%</option>
          </select>
        </SettingRow>
        <SettingRow label="Max batch size" description="Maximum timesheets JARVIS can auto-approve in a single batch run">
          <select className="glass-input text-[12px] py-1.5" style={{ width: 120 }}>
            <option>25</option>
            <option selected>50</option>
            <option>100</option>
            <option>Unlimited</option>
          </select>
        </SettingRow>
        <SettingRow label="Human-in-loop for OT" description="Always escalate timesheets with overtime for human review, regardless of confidence">
          <Toggle on={false} onChange={() => {}} />
        </SettingRow>
      </SectionCard>

      <SectionCard title="Data & Retention">
        <SettingRow label="Timesheet history" description="How long timesheet data is retained in the system">
          <select className="glass-input text-[12px] py-1.5" style={{ width: 150 }}>
            <option>1 year</option>
            <option selected>3 years</option>
            <option>7 years</option>
            <option>Indefinite</option>
          </select>
        </SettingRow>
        <SettingRow label="Audit log retention">
          <select className="glass-input text-[12px] py-1.5" style={{ width: 150 }}>
            <option>6 months</option>
            <option>1 year</option>
            <option selected>3 years</option>
          </select>
        </SettingRow>
        <SettingRow label="Auto-archive processed batches" description="Move processed payroll batches to archive after 30 days">
          <Toggle on={true} onChange={() => {}} />
        </SettingRow>
      </SectionCard>

    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const SECTION_COMPONENTS: Record<Section, React.FC> = {
  Appearance: AppearanceSection,
  Notifications: NotificationsSection,
  Account: AccountSection,
  Integrations: IntegrationsSection,
  Security: SecuritySection,
  System: SystemSection,
}

export default function SettingsPage() {
  const [section, setSection] = useState<Section>("Appearance")
  const SectionContent = SECTION_COMPONENTS[section]

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-3 px-6 py-3.5 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)", background: "var(--glass-bg)" }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-dim)" }}>
            <Globe size={16} style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h1 className="text-[15px] font-bold" style={{ color: "var(--text-1)" }}>Settings</h1>
            <p className="text-[11px]" style={{ color: "var(--text-3)" }}>Manage preferences, integrations, and system configuration</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-3)" }}>
              <Info size={12} />
              Agent Dashboard v2.1.0 · JARVIS v2.1
            </div>
          </div>
        </header>

        {/* Mobile section tabs */}
        <div className="flex sm:hidden items-center gap-1 px-3 py-2 overflow-x-auto flex-shrink-0 scrollbar-none"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          {SECTIONS.map(s => {
            const Icon = SECTION_ICONS[s]
            return (
              <button key={s} onClick={() => setSection(s)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0 text-[11px] font-semibold transition-all whitespace-nowrap"
                style={{
                  background: s === section ? "var(--accent-dim)" : "var(--surface-hover)",
                  border: `1px solid ${s === section ? "var(--accent-border)" : "var(--border)"}`,
                  color: s === section ? "var(--accent)" : "var(--text-2)",
                }}>
                <Icon size={11} />{s}
              </button>
            )
          })}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Section nav sidebar */}
          <nav className="hidden sm:block w-44 flex-shrink-0 overflow-y-auto p-3 space-y-0.5" style={{ borderRight: "1px solid var(--border)" }}>
            {SECTIONS.map(s => {
              const Icon = SECTION_ICONS[s]
              const active = s === section
              return (
                <button
                  key={s}
                  onClick={() => setSection(s)}
                  className={clsx("w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-[12px] font-medium transition-all")}
                  style={{
                    background: active ? "var(--accent-dim)" : "transparent",
                    color: active ? "var(--accent)" : "var(--text-2)",
                    border: active ? "1px solid var(--accent-border)" : "1px solid transparent",
                  }}
                >
                  <Icon size={14} />
                  {s}
                </button>
              )
            })}
          </nav>

          {/* Section content */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-nav lg:pb-6">
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="text-[16px] font-bold mb-1" style={{ color: "var(--text-1)" }}>{section}</div>
              <SectionContent />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
