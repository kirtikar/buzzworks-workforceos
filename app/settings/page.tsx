"use client"

import { useEffect, useState } from "react"
import Sidebar from "@/components/Sidebar"
import { useTheme } from "@/components/ThemeProvider"
import {
  Sun, Moon, Bell, Shield, Users, Database, Webhook,
  Mail, Smartphone, Clock, Save, ChevronRight, Check,
  Key, AlertTriangle, Info, Upload, Download, Trash2, FileText,
} from "lucide-react"
import clsx from "clsx"
import { generateSampleBeelineCsv } from "@/lib/beeline-import"
import { generateSampleFieldglassCsv } from "@/lib/fieldglass-import"

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
        <div className="text-[14px] font-medium" style={{ color: "var(--text-1)" }}>{label}</div>
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
              <div className="text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>{t.label}</div>
              <div className="text-[11px] font-medium mt-0.5" style={{ color: "var(--accent)" }}>{t.subtitle}</div>
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

// ─── BeeLine import card (Accenture POC) ─────────────────────────────────────

interface ImportStatus {
  configured: boolean
  rowCount:   number
  empCount:   number
  importedAt: string | null
  warnings:   string[]
  errors:     string[]
  unmapped:   string[]
  mgrApprovalCount?: number
  leaveExceededCount?: number
  filesProcessed?:  number
  rawRowsSeen?:     number
  uniqueIds?:       number
}

const EMPTY_STATUS: ImportStatus = {
  configured: false, rowCount: 0, empCount: 0, importedAt: null,
  warnings: [], errors: [], unmapped: [],
}

interface PortalImportConfig {
  title:           string   // SectionCard heading
  clientId:        string   // for read endpoint /api/timesheets/[clientId]
  clientName:      string   // for empty-state copy
  importEndpoint:  string   // POST + DELETE, e.g. /api/import/beeline
  sampleGenerator: () => string
  sampleFilename:  string
  portalLabel:     string   // "BeeLine" | "Fieldglass"
  portalIconColor: string   // hex for the file-icon tile
  portalIconBg:    string
  emptyHint:       string
  drawerHint:      string   // text inside drop zone
  multiFile?:      boolean  // accept multiple files in one POST (Fieldglass: weekwise reports overlap)
}

function PortalImportCard({ config }: { config: PortalImportConfig }) {
  const [status,   setStatus]   = useState<ImportStatus>(EMPTY_STATUS)
  const [pending,  setPending]  = useState(false)
  const [dragOver, setDragOver] = useState(false)

  // Hydrate by hitting the read API. Tells us both configuration state
  // (DB present?) and current per-client row counts.
  useEffect(() => {
    fetch(`/api/timesheets/${config.clientId}`)
      .then(r => r.json())
      .then(data => {
        setStatus({
          configured: !!data.configured,
          rowCount:   data.timesheets?.length ?? 0,
          empCount:   data.employees?.length ?? 0,
          importedAt: data.lastImport?.imported_at ?? null,
          warnings: [], errors: [], unmapped: [],
        })
      })
      .catch(() => setStatus(s => ({ ...s, configured: false })))
  }, [])

  async function handleFiles(files: File[] | FileList) {
    const list = Array.from(files)
    if (list.length === 0) return
    setPending(true)
    try {
      const fd = new FormData()
      for (const f of list) fd.append("file", f)
      const res  = await fetch(config.importEndpoint, { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) {
        setStatus(s => ({
          ...s,
          configured: !data.error?.includes("DATABASE_URL"),
          errors:   data.details ?? [data.error ?? "Import failed"],
          unmapped: data.unmappedHeaders ?? [],
        }))
        setPending(false); return
      }
      setStatus({
        configured: true,
        rowCount:   data.summary.rowCount,
        empCount:   data.summary.employeeCount,
        importedAt: new Date().toISOString(),
        warnings:   data.summary.warnings ?? [],
        errors:     data.summary.errors ?? [],
        unmapped:   data.summary.unmappedHeaders ?? [],
        mgrApprovalCount:   data.summary.mgrApprovalCount,
        leaveExceededCount: data.summary.leaveExceededCount,
        filesProcessed:     data.summary.filesProcessed,
        rawRowsSeen:        data.summary.rawRowsSeen,
        uniqueIds:          data.summary.uniqueIds,
      })
    } catch (e) {
      setStatus(s => ({ ...s, errors: [`Upload failed: ${(e as Error).message}`] }))
    } finally {
      setPending(false)
    }
  }

  async function handleClear() {
    setPending(true)
    try {
      const res = await fetch(config.importEndpoint, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        setStatus(s => ({ ...s, errors: [data.error ?? "Clear failed"] }))
      } else {
        setStatus({ ...EMPTY_STATUS, configured: true })
      }
    } catch (e) {
      setStatus(s => ({ ...s, errors: [`Clear failed: ${(e as Error).message}`] }))
    } finally {
      setPending(false)
    }
  }

  function downloadSample() {
    const csv  = config.sampleGenerator()
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href = url; a.download = config.sampleFilename
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const ago = status.importedAt ? new Date(status.importedAt).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }) : null
  const hasImport = status.rowCount > 0
  const dbMissing = !status.configured

  return (
    <SectionCard title={config.title}>
      <div className="pt-1 pb-2 space-y-3">
        {/* DB-not-configured banner */}
        {dbMissing && (
          <div className="rounded-lg p-3 text-[11px] flex items-start gap-2"
            style={{ background: "var(--warn-bg)", border: "1px solid var(--warn-border)", color: "var(--warn)" }}>
            <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold mb-1">Postgres not connected</div>
              <div style={{ color: "var(--text-2)" }}>
                Provision Vercel Postgres in Storage → Create Database, redeploy, then visit
                <span className="font-mono"> /api/admin/migrate </span> once. See docs/v2/SETUP_DB.md.
              </div>
            </div>
          </div>
        )}

        {/* Status strip */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
          style={{ background: hasImport ? "var(--accent-dim)" : "var(--surface)", border: `1px solid ${hasImport ? "var(--accent-border)" : "var(--border)"}` }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: config.portalIconBg, color: config.portalIconColor }}>
            <FileText size={14} />
          </div>
          <div className="flex-1 min-w-0">
            {hasImport ? (
              <>
                <div className="text-[12px] font-medium" style={{ color: "var(--text-1)" }}>
                  {status.rowCount} timesheet{status.rowCount !== 1 ? "s" : ""} in database
                  · {status.empCount} worker{status.empCount !== 1 ? "s" : ""}
                </div>
                <div className="text-[11px]" style={{ color: "var(--text-3)" }}>
                  Last import: {ago ?? "—"}
                  {status.filesProcessed ? ` · ${status.filesProcessed} file${status.filesProcessed !== 1 ? "s" : ""}` : ""}
                  {status.rawRowsSeen && status.uniqueIds && status.rawRowsSeen !== status.uniqueIds
                    ? ` · ${status.rawRowsSeen} rows → ${status.uniqueIds} after dedup` : ""}
                  {status.mgrApprovalCount ? ` · ${status.mgrApprovalCount} OT approval${status.mgrApprovalCount !== 1 ? "s" : ""} pending` : ""}
                  {status.leaveExceededCount ? ` · ${status.leaveExceededCount} leave-balance fail${status.leaveExceededCount !== 1 ? "s" : ""}` : ""}
                </div>
              </>
            ) : (
              <>
                <div className="text-[12px] font-medium" style={{ color: "var(--text-1)" }}>No import yet</div>
                <div className="text-[11px]" style={{ color: "var(--text-3)" }}>
                  {config.emptyHint}
                </div>
              </>
            )}
          </div>
          {hasImport && (
            <button onClick={handleClear} title="Clear all imported Accenture timesheets" disabled={pending}
              className="w-8 h-8 rounded-md flex items-center justify-center transition-colors"
              style={{ color: "var(--text-3)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--danger)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}>
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* Drop zone */}
        <label
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault(); setDragOver(false)
            if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files)
          }}
          className="flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-xl cursor-pointer transition-colors text-center"
          style={{
            border: `1px dashed ${dragOver ? "var(--accent)" : "var(--border-strong)"}`,
            background: dragOver ? "var(--accent-dim)" : "var(--surface)",
          }}>
          <Upload size={20} style={{ color: dragOver ? "var(--accent)" : "var(--text-3)" }} />
          <div className="text-[13px] font-medium" style={{ color: "var(--text-1)" }}>
            {pending ? "Parsing…" : config.multiFile ? "Drop CSV(s) here, or click to browse" : "Drop CSV here, or click to browse"}
          </div>
          <div className="text-[11px]" style={{ color: "var(--text-3)" }}>
            {config.drawerHint}
          </div>
          <input type="file" accept=".csv,text/csv" className="hidden" multiple={config.multiFile}
            onChange={e => { if (e.target.files?.length) handleFiles(e.target.files) }} />
        </label>

        {/* Sample download */}
        <div className="flex items-center justify-between text-[11px]" style={{ color: "var(--text-3)" }}>
          <span>Need a template? Download a sample with the header layout this importer expects.</span>
          <button onClick={downloadSample}
            className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-md"
            style={{ color: "var(--accent)", background: "var(--accent-dim)", border: "1px solid var(--accent-border)" }}>
            <Download size={11} /> Sample CSV
          </button>
        </div>

        {/* Errors / warnings / unmapped */}
        {status.errors.length > 0 && (
          <div className="rounded-lg p-3 text-[11px]"
            style={{ background: "var(--danger-bg)", border: "1px solid var(--danger-border)", color: "var(--danger)" }}>
            <div className="font-semibold mb-1 flex items-center gap-1.5">
              <AlertTriangle size={11} /> {status.errors.length} error{status.errors.length !== 1 ? "s" : ""}
            </div>
            <ul className="space-y-0.5 max-h-32 overflow-y-auto">
              {status.errors.slice(0, 8).map((e: string, i: number) => <li key={i}>· {e}</li>)}
              {status.errors.length > 8 && <li>· +{status.errors.length - 8} more…</li>}
            </ul>
          </div>
        )}
        {status.warnings.length > 0 && (
          <div className="rounded-lg p-3 text-[11px]"
            style={{ background: "var(--warn-bg)", border: "1px solid var(--warn-border)", color: "var(--warn)" }}>
            <div className="font-semibold mb-1">{status.warnings.length} warning{status.warnings.length !== 1 ? "s" : ""}</div>
            <ul className="space-y-0.5 max-h-32 overflow-y-auto">
              {status.warnings.slice(0, 8).map((w: string, i: number) => <li key={i}>· {w}</li>)}
              {status.warnings.length > 8 && <li>· +{status.warnings.length - 8} more…</li>}
            </ul>
          </div>
        )}
        {status.unmapped.length > 0 && (
          <div className="text-[11px]" style={{ color: "var(--text-3)" }}>
            Unmapped columns (ignored): <span className="font-mono">{status.unmapped.join(", ")}</span>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

function IntegrationsSection() {
  // Mirrors the actual portal roster on the dashboard: BeeLine (Accenture
  // + PwC) and SAP Fieldglass (Capgemini). The other 8 clients are on
  // manual ingest (no portal connection).
  const portals = [
    { name: "BeeLine",         status: "connected", clients: 2, lastSync: "live (POC)",  color: "#F4B400" },
    { name: "SAP Fieldglass",  status: "pending",   clients: 1, lastSync: "not connected", color: "#0070AD" },
  ]

  return (
    <div className="space-y-5">
      <PortalImportCard config={{
        title:           "BeeLine · Accenture (POC)",
        clientId:        "acc",
        clientName:      "Accenture",
        importEndpoint:  "/api/import/beeline",
        sampleGenerator: generateSampleBeelineCsv,
        sampleFilename:  "beeline-sample-accenture.csv",
        portalLabel:     "BeeLine",
        portalIconColor: "#F4B400",
        portalIconBg:    "rgba(244,180,0,0.18)",
        emptyHint:       "Upload a CSV exported from BeeLine (Reports → Timesheet, last 6 months) to populate the Accenture inbox.",
        drawerHint:      "Accepts a BeeLine timesheet export. Headers are matched permissively.",
      }} />

      <PortalImportCard config={{
        title:           "Fieldglass · Capgemini (POC)",
        clientId:        "cap",
        clientName:      "Capgemini",
        importEndpoint:  "/api/import/fieldglass",
        sampleGenerator: generateSampleFieldglassCsv,
        sampleFilename:  "fieldglass-sample-capgemini.csv",
        portalLabel:     "Fieldglass",
        portalIconColor: "#0070AD",
        portalIconBg:    "rgba(0,112,173,0.14)",
        emptyHint:       "Upload Fieldglass Supplier-List CSVs (Time Sheet Detail → Export). Multiple weekly files OK — overlap is deduped by (id, max revision).",
        drawerHint:      "Accepts one or more Fieldglass Supplier-List exports. Hierarchical 'Worker :' format expected.",
        multiFile:       true,
      }} />

      <SectionCard title="Portal Connections">
        <div className="space-y-2 pt-1 pb-2">
          {portals.map(p => (
            <div key={p.name} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors" style={{ background: "var(--surface)" }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.status === "connected" ? "var(--accent)" : "var(--warn)" }} />
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                style={{ background: `${p.color}18`, color: p.color }}>
                {p.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium" style={{ color: "var(--text-1)" }}>{p.name}</div>
                <div className="text-[11px]" style={{ color: "var(--text-3)" }}>{p.clients} client{p.clients !== 1 ? "s" : ""} · last sync {p.lastSync}</div>
              </div>
              <span
                className="text-[11px] px-2 py-0.5 rounded-full font-medium"
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
            <span className="text-[12px] font-mono" style={{ color: "var(--accent)" }}>workorder.agentic@buzzworks.com</span>
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
                  {s.current && <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>Current</span>}
                </div>
                <div className="text-[11px]" style={{ color: "var(--text-3)" }}>{s.location} · {s.time}</div>
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
        {/* Header — matches Inbox / Compliance / Policies pattern */}
        <header className="px-6 lg:px-8 py-5 flex-shrink-0 flex items-start gap-4"
          style={{ background: "var(--surface)", boxShadow: "0 1px 0 var(--border)" }}>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-1)" }}>Settings</h1>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--text-3)" }}>
              Manage preferences, integrations, and system configuration
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] flex-shrink-0" style={{ color: "var(--text-3)" }}>
            <Info size={12} />
            Agent Dashboard v2.1.0 · JARVIS v2.1
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
