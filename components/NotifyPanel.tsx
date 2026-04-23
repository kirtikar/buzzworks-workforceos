"use client"

import { useState, useEffect } from "react"
import { Mail, X, Send, Sparkles, ExternalLink } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotifyKind =
  | "compliance"
  | "timesheet-flag"
  | "timesheet-reject"
  | "timesheet-approve"
  | "document-request"

export interface NotifyContext {
  kind:        NotifyKind
  to:          string
  cc?:         string
  subject:     string
  body:        string
  sourceUrl?:  string
  sourceLabel?: string
}

// ─── Builder: generate canned messages from context ───────────────────────────
// Each builder returns a NotifyContext pre-filled by the Communication Agent
// (RIPLEY). Kept short so ops team can read before sending.

export function buildComplianceNotify(input: {
  title: string
  authority: string
  region: string
  effectiveDate: string
  deadline: string
  penalty: string
  impact?: string
  sourceUrl?: string
  sourceName?: string
  clients: string[]
}): NotifyContext {
  const clientList = input.clients.length > 3
    ? input.clients.slice(0, 3).join(", ") + ` +${input.clients.length - 3} more`
    : input.clients.join(", ")

  const body = `Team,

New ${input.authority} notification needs attention:

"${input.title}"
Region: ${input.region} · Effective ${input.effectiveDate} · Deadline ${input.deadline}
Penalty exposure if not actioned: ${input.penalty}

Impacted clients: ${clientList || "All clients"}
${input.impact ? `\nImpact: ${input.impact}\n` : ""}
Please review and confirm action plan by EOD.

— RIPLEY on behalf of Ops`

  return {
    kind:        "compliance",
    to:          "ops-lead@buzzworks.com",
    cc:          "compliance@buzzworks.com",
    subject:     `Action required: ${input.title.slice(0, 60)}${input.title.length > 60 ? "…" : ""}`,
    body,
    sourceUrl:   input.sourceUrl,
    sourceLabel: input.sourceName,
  }
}

export function buildTimesheetFlag(input: {
  employeeName: string
  employeeEmail: string
  period: string
  reason: string
  managerEmail?: string
}): NotifyContext {
  const body = `Hi ${input.employeeName.split(" ")[0]},

Your timesheet for ${input.period} has been flagged for review:

• ${input.reason}

Please clarify or resubmit within 2 business days. Reply to this email if you need support.

Thanks,
Buzzworks Ops
— Drafted by RIPLEY`

  return {
    kind:    "timesheet-flag",
    to:      input.employeeEmail,
    cc:      input.managerEmail,
    subject: `Timesheet review needed — ${input.period}`,
    body,
  }
}

export function buildTimesheetReject(input: {
  employeeName: string
  employeeEmail: string
  period: string
  reason: string
  managerEmail?: string
}): NotifyContext {
  const body = `Hi ${input.employeeName.split(" ")[0]},

Your timesheet for ${input.period} has been rejected:

• ${input.reason}

Please correct the issue and resubmit via the employee portal. Reach out if you have questions.

Thanks,
Buzzworks Ops
— Drafted by RIPLEY`

  return {
    kind:    "timesheet-reject",
    to:      input.employeeEmail,
    cc:      input.managerEmail,
    subject: `Timesheet rejected — ${input.period}`,
    body,
  }
}

export function buildTimesheetApprove(input: {
  employeeName: string
  employeeEmail: string
  period: string
  totalHours: number
  totalPayable: number
}): NotifyContext {
  const body = `Hi ${input.employeeName.split(" ")[0]},

Your timesheet for ${input.period} has been approved.

• Total hours: ${input.totalHours}h
• Payable amount: ₹${input.totalPayable.toLocaleString("en-IN")}

The amount will be included in the next payroll cycle.

Thanks,
Buzzworks Ops
— Drafted by RIPLEY`

  return {
    kind:    "timesheet-approve",
    to:      input.employeeEmail,
    subject: `Timesheet approved — ${input.period}`,
    body,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotifyPanel({
  context,
  onClose,
  onSend,
}: {
  context: NotifyContext | null
  onClose: () => void
  onSend?: (final: NotifyContext) => void
}) {
  const [to, setTo]         = useState("")
  const [cc, setCc]         = useState("")
  const [subject, setSub]   = useState("")
  const [body, setBody]     = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)

  // Hydrate fields whenever context changes
  useEffect(() => {
    if (context) {
      setTo(context.to)
      setCc(context.cc ?? "")
      setSub(context.subject)
      setBody(context.body)
      setSent(false)
    }
  }, [context])

  if (!context) return null

  function handleSend() {
    setSending(true)
    setTimeout(() => {
      setSending(false)
      setSent(true)
      onSend?.({ ...context!, to, cc, subject, body })
      setTimeout(() => onClose(), 900)
    }, 500)
  }

  const kindLabel = ({
    compliance:            "Compliance alert",
    "timesheet-flag":      "Timesheet flag",
    "timesheet-reject":    "Timesheet rejection",
    "timesheet-approve":   "Approval confirmation",
    "document-request":    "Document request",
  } as const)[context.kind]

  return (
    <div className="fixed bottom-4 right-4 z-[200] w-[440px] max-w-[calc(100vw-2rem)]
      rounded-2xl overflow-hidden animate-slide-in-right"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 8px 20px rgba(0,0,0,0.12)",
      }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3"
        style={{ background: "var(--pink-50)", borderBottom: "1px solid var(--pink-100)" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--pink-700)" }}>
          <Mail size={15} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold" style={{ color: "var(--pink-700)" }}>
            {kindLabel}
          </div>
          <div className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-3)" }}>
            <Sparkles size={9} /> Pre-filled by RIPLEY · review before sending
          </div>
        </div>
        <button onClick={onClose}
          className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
          style={{ color: "var(--text-3)" }}>
          <X size={16} />
        </button>
      </div>

      {/* Form */}
      <div className="p-4 space-y-3">
        {/* To */}
        <div>
          <label className="block text-[10px] font-medium uppercase tracking-wider mb-1"
            style={{ color: "var(--text-3)" }}>To</label>
          <input
            type="email"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="glass-input w-full text-xs"
            style={{ padding: "7px 10px" }}
          />
        </div>

        {/* CC */}
        <div>
          <label className="block text-[10px] font-medium uppercase tracking-wider mb-1"
            style={{ color: "var(--text-3)" }}>CC</label>
          <input
            type="email"
            value={cc}
            onChange={e => setCc(e.target.value)}
            placeholder="Optional"
            className="glass-input w-full text-xs"
            style={{ padding: "7px 10px" }}
          />
        </div>

        {/* Subject */}
        <div>
          <label className="block text-[10px] font-medium uppercase tracking-wider mb-1"
            style={{ color: "var(--text-3)" }}>Subject</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSub(e.target.value)}
            className="glass-input w-full text-xs font-medium"
            style={{ padding: "7px 10px" }}
          />
        </div>

        {/* Body */}
        <div>
          <label className="block text-[10px] font-medium uppercase tracking-wider mb-1"
            style={{ color: "var(--text-3)" }}>Message</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={8}
            className="glass-input w-full text-xs leading-relaxed"
            style={{ padding: "10px 12px", fontFamily: "inherit", resize: "vertical" }}
          />
        </div>

        {/* Source reference */}
        {context.sourceUrl && (
          <a href={context.sourceUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-medium"
            style={{ color: "var(--pink-700)" }}>
            <ExternalLink size={11} />
            Official source: {context.sourceLabel ?? "View"}
          </a>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 px-4 py-3"
        style={{ borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}>
        <button onClick={onClose}
          disabled={sending}
          className="btn-ghost text-xs"
          style={{ padding: "7px 14px" }}>
          Cancel
        </button>
        <button onClick={handleSend}
          disabled={sending || sent || !to || !subject}
          className="btn-primary flex items-center gap-1.5 text-xs ml-auto"
          style={{ padding: "7px 16px" }}>
          {sent ? (
            <>✓ Sent</>
          ) : sending ? (
            <>Sending…</>
          ) : (
            <><Send size={12} /> Send</>
          )}
        </button>
      </div>
    </div>
  )
}
