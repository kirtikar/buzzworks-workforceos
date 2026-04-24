"use client"

import { useState, useEffect } from "react"
import { Mail, X, Send, Sparkles, ExternalLink } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotifyKind =
  | "compliance"
  | "client-compliance"
  | "timesheet-flag"
  | "timesheet-reject"
  | "timesheet-approve"
  | "timesheet-team"
  | "document-request"
  | "onboarding-issue"
  | "payroll-issue"

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

// Per-client compliance notification — drafted to the client's account
// manager + primary client-side correspondent, with a Buzzworks compliance
// CC and a client-side compliance CC so nothing falls through the cracks.
// Used from the Compliance tab on the client detail page, where there is
// a specific AM and client on the hook (unlike the generic inbox flow which
// goes to ops-lead@buzzworks).
export function buildClientComplianceNotify(input: {
  clientName:    string
  amName:        string
  amEmail:       string
  clientContact: { name: string; email: string }
  buzzworksCc:   string
  clientCc:      string
  regulation: {
    title: string
    authority: string
    region: string
    effectiveDate: string
    penalty: string
    reference: string
    sourceUrl?: string
    sourceName?: string
    summary: string
  }
}): NotifyContext {
  const amFirst     = input.amName.split(" ")[0] ?? input.amName
  const contactFirst = input.clientContact.name.split(" ")[0] ?? "team"

  const body = `Hi ${contactFirst} (cc ${amFirst}),

Flagging a new ${input.regulation.authority} notification that affects ${input.clientName}:

"${input.regulation.title}"
Region: ${input.regulation.region} · Effective ${input.regulation.effectiveDate} · Ref: ${input.regulation.reference}
Penalty exposure if not actioned: ${input.regulation.penalty}

Summary:
${input.regulation.summary}

Please review and confirm the action plan on your side. Happy to set up a call with our compliance team if you need help mapping this to your operational rollout. Copying ${input.amName} (Buzzworks AM), Buzzworks compliance ops, and your compliance lead for awareness.

Thanks,
— RIPLEY on behalf of Buzzworks Ops`

  return {
    kind:        "client-compliance",
    to:          `${input.clientContact.email}, ${input.amEmail}`,
    cc:          `${input.buzzworksCc}, ${input.clientCc}`,
    subject:     `${input.clientName} · action required: ${input.regulation.title.slice(0, 50)}${input.regulation.title.length > 50 ? "…" : ""}`,
    body,
    sourceUrl:   input.regulation.sourceUrl,
    sourceLabel: input.regulation.sourceName,
  }
}

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

// Footnote appended to every timesheet-related email. AI agents are not
// mentioned anywhere else in these bodies — ops sends this straight to
// employees / HR, and the footnote is the only attribution.
const RIPLEY_FOOTNOTE = `— This message was written using RIPLEY.`

// Subject builder: "<prefix> — <employeeCode>: <main issue>[ (N issues)][ · <period>]"
// Keeps the inbox scannable (code + main issue) while signalling the
// overall count when there is more than one thing wrong.
function timesheetSubject(
  prefix: string,
  employeeCode: string,
  issues: string[],
  period?: string
): string {
  const main  = (issues[0] ?? "Review required").trim()
  const count = issues.length > 1 ? ` (${issues.length} issues)` : ""
  const per   = period ? ` · ${period}` : ""
  return `${prefix} — ${employeeCode}: ${main}${count}${per}`
}

export function buildTimesheetFlag(input: {
  employeeName:  string
  employeeCode:  string
  employeeEmail: string
  period:        string
  issues:        string[]
  managerEmail?: string
}): NotifyContext {
  const issueList = input.issues.length > 0
    ? input.issues.map(i => `• ${i}`).join("\n")
    : "• Manual review required — validation score below threshold"

  const body = `Hi ${input.employeeName.split(" ")[0]},

Your timesheet for ${input.period} has been flagged for review. Please look at the following and clarify or resubmit within 2 business days:

${issueList}

Reply to this email if you need help or have questions.

Thanks,
Buzzworks Ops

${RIPLEY_FOOTNOTE}`

  return {
    kind:    "timesheet-flag",
    to:      input.employeeEmail,
    cc:      input.managerEmail,
    subject: timesheetSubject("Timesheet review", input.employeeCode, input.issues, input.period),
    body,
  }
}

export function buildTimesheetReject(input: {
  employeeName:  string
  employeeCode:  string
  employeeEmail: string
  period:        string
  issues:        string[]
  managerEmail?: string
}): NotifyContext {
  const issueList = input.issues.length > 0
    ? input.issues.map(i => `• ${i}`).join("\n")
    : "• Submission does not meet policy criteria"

  const body = `Hi ${input.employeeName.split(" ")[0]},

Your timesheet for ${input.period} has been rejected. Please correct the following and resubmit via the employee portal:

${issueList}

Reach out to your manager or reply here if you have questions.

Thanks,
Buzzworks Ops

${RIPLEY_FOOTNOTE}`

  return {
    kind:    "timesheet-reject",
    to:      input.employeeEmail,
    cc:      input.managerEmail,
    subject: timesheetSubject("Timesheet rejected", input.employeeCode, input.issues, input.period),
    body,
  }
}

export function buildTimesheetApprove(input: {
  employeeName:  string
  employeeCode:  string
  employeeEmail: string
  period:        string
  totalHours:    number
  totalPayable:  number
}): NotifyContext {
  const body = `Hi ${input.employeeName.split(" ")[0]},

Your timesheet for ${input.period} has been approved.

• Total hours: ${input.totalHours}h
• Payable amount: ₹${input.totalPayable.toLocaleString("en-IN")}

The amount will be included in the next payroll cycle.

Thanks,
Buzzworks Ops

${RIPLEY_FOOTNOTE}`

  return {
    kind:    "timesheet-approve",
    to:      input.employeeEmail,
    subject: `Timesheet approved — ${input.employeeCode} · ${input.period}`,
    body,
  }
}

// Internal team alert — highlights inconsistencies found on a timesheet.
// Used when ops wants to raise an issue with the HR/payroll/manager team
// rather than writing directly to the employee.
export function buildTimesheetNotifyTeam(input: {
  employeeName:   string
  employeeCode:   string
  clientName:     string
  period:         string
  totalHours:     number
  overtimeHours:  number
  validationScore: number
  inconsistencies: string[]         // check.rule + check.detail lines
  managerEmail?:  string
  sourceUrl?:     string
}): NotifyContext {
  const issueList = input.inconsistencies.length > 0
    ? input.inconsistencies.map(i => `• ${i}`).join("\n")
    : "• Score below threshold — manual review recommended"

  const body = `Team,

Timesheet inconsistencies detected and require review:

Employee: ${input.employeeName} (${input.employeeCode})
Client: ${input.clientName}
Period: ${input.period}
Hours: ${input.totalHours}h${input.overtimeHours > 0 ? ` (incl. ${input.overtimeHours}h OT)` : ""}
Validation score: ${input.validationScore}

Issues flagged:
${issueList}

Please confirm whether to approve with exceptions, flag the employee, or reject. Ops needs sign-off by EOD to keep payroll on track.

${RIPLEY_FOOTNOTE}`

  return {
    kind:        "timesheet-team",
    to:          "hr-ops@buzzworks.com",
    cc:          input.managerEmail ?? "payroll@buzzworks.com",
    subject:     timesheetSubject("Timesheet review", input.employeeCode, input.inconsistencies, input.period),
    body,
    sourceUrl:   input.sourceUrl,
    sourceLabel: "Timesheet detail",
  }
}

export function buildDocumentRequest(input: {
  employeeName:  string
  employeeEmail: string
  clientName:    string
  docType:       string
  reason:        string
  managerEmail?: string
}): NotifyContext {
  const body = `Hi ${input.employeeName.split(" ")[0]},

We need an updated copy of your ${input.docType} on file for ${input.clientName}.

Reason: ${input.reason}

Please upload a valid copy via the employee portal within 3 business days. Reply to this email if you need support or clarification.

Thanks,
Buzzworks Ops
— Drafted by RIPLEY`

  return {
    kind:    "document-request",
    to:      input.employeeEmail,
    cc:      input.managerEmail,
    subject: `Document update required — ${input.docType}`,
    body,
  }
}

// Internal alert about an onboarding validation/reconciliation issue.
export function buildOnboardingIssue(input: {
  candidateName: string
  clientName:    string
  issueType:     string
  docs?:         string[]
  inconsistencies: string[]
}): NotifyContext {
  const issueList = input.inconsistencies.length > 0
    ? input.inconsistencies.map(i => `• ${i}`).join("\n")
    : "• See candidate file for details"

  const body = `Team,

Onboarding validation issue detected for a new candidate:

Candidate: ${input.candidateName}
Client: ${input.clientName}
Issue type: ${input.issueType}
${input.docs && input.docs.length > 0 ? `Documents: ${input.docs.join(", ")}\n` : ""}
Findings:
${issueList}

Onboarding is blocked until this is resolved. Please reconcile the flagged fields or request updated documents. Target resolution: 48 hours.

— RIPLEY on behalf of Onboarding Ops`

  return {
    kind:        "onboarding-issue",
    to:          "onboarding-ops@buzzworks.com",
    cc:          "hr-ops@buzzworks.com",
    subject:     `Onboarding blocker — ${input.candidateName} · ${input.issueType}`,
    body,
  }
}

// Internal alert about a payroll-run issue that blocks a cycle.
export function buildPayrollIssue(input: {
  clientName:  string
  cycle:       string
  issueType:   string
  affectedCount?: number
  details:     string[]
}): NotifyContext {
  const list = input.details.length > 0
    ? input.details.map(i => `• ${i}`).join("\n")
    : "• See payroll detail for context"

  const body = `Team,

Payroll issue detected that may block the ${input.cycle} cycle for ${input.clientName}:

Issue type: ${input.issueType}
${input.affectedCount ? `Affected employees: ${input.affectedCount}\n` : ""}
Details:
${list}

Please confirm the correct treatment so the cycle can close on schedule.

— RIPLEY on behalf of Payroll Ops`

  return {
    kind:        "payroll-issue",
    to:          "payroll@buzzworks.com",
    cc:          "finance-ops@buzzworks.com",
    subject:     `Payroll review — ${input.clientName} · ${input.cycle}`,
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
    "client-compliance":   "Client compliance alert",
    "timesheet-flag":      "Timesheet flag",
    "timesheet-reject":    "Timesheet rejection",
    "timesheet-approve":   "Approval confirmation",
    "timesheet-team":      "Timesheet team alert",
    "document-request":    "Document request",
    "onboarding-issue":    "Onboarding issue",
    "payroll-issue":       "Payroll issue",
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
          <div className="text-[14px] font-semibold" style={{ color: "var(--pink-700)" }}>
            {kindLabel}
          </div>
          <div className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-3)" }}>
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
          <label className="block text-[11px] font-medium uppercase tracking-wider mb-1"
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
          <label className="block text-[11px] font-medium uppercase tracking-wider mb-1"
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
          <label className="block text-[11px] font-medium uppercase tracking-wider mb-1"
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
          <label className="block text-[11px] font-medium uppercase tracking-wider mb-1"
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
