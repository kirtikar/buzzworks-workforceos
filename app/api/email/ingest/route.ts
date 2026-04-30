/**
 * Mock API — Email Timesheet Ingestion
 *
 * POST /api/email/ingest
 * Simulates the AI parsing pipeline for email-submitted timesheets:
 *   1. Parse email metadata (from, subject, cc, has-attachment)
 *   2. Extract timesheet fields from body + attachment OCR
 *   3. Run policy validation checks
 *   4. Return structured result with AI confidence
 *
 * In production: workorder.agentic@buzzworks.com is polled via IMAP,
 * each new email is POSTed here, Claude parses it, and the result
 * is written to the Output Results sheet + Timesheet Submission Log.
 */

import { NextRequest, NextResponse } from "next/server"

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmailIngestBody {
  from:          string
  to:            string
  cc?:           string[]
  subject:       string
  bodyText?:     string
  bodyHtml?:     string
  hasAttachment: boolean
  attachmentName?: string
  attachmentType?: "image/png" | "image/jpeg" | "application/pdf" | "application/vnd.ms-excel"
  receivedAt?:   string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractField<T>(
  text: string,
  patterns: RegExp[],
  transform: (match: string) => T,
  fallback: T,
): T {
  for (const pattern of patterns) {
    const m = text.match(pattern)
    if (m && m[1]) {
      try { return transform(m[1].trim()) } catch { /* skip */ }
    }
  }
  return fallback
}

function runPolicyChecks(data: ReturnType<typeof parseEmail>) {
  const checks = []

  // 1. Sender known employee check (mock — real would query Employees sheet)
  const knownDomains = [
    "techcorp.in","globalstaff.com","financehub.co","medsure.health",
    "hexaware.com","infosysbpm.com","capgemini.com","wipro.com",
    "cognizant.com","ltimindtree.com","nucleussoftware.com",
  ]
  const senderDomain = data.senderEmail.split("@")[1] ?? ""
  const senderKnown  = knownDomains.some(d => senderDomain.endsWith(d))
  checks.push({
    id:          "c1",
    category:    "employment",
    rule:        "Sender is a registered employee",
    result:      senderKnown ? "pass" : "fail",
    detail:      senderKnown ? `Domain @${senderDomain} is a registered client domain` : `Domain @${senderDomain} not found in employee register`,
    autoChecked: true,
  })

  // 2. Attachment present
  checks.push({
    id:          "c2",
    category:    "policy",
    rule:        "Timesheet attachment required",
    result:      data.hasAttachment ? "pass" : "fail",
    detail:      data.hasAttachment ? `Attachment detected: ${data.attachmentName ?? "timesheet"}` : "No attachment found — email body only",
    autoChecked: true,
  })

  // 3. Manager CC'd
  const managerCCd = data.ccEmails.length > 0
  checks.push({
    id:          "c3",
    category:    "policy",
    rule:        "Manager CC required on email submission",
    result:      managerCCd ? "pass" : "warning",
    detail:      managerCCd ? `Manager CC detected: ${data.ccEmails[0]}` : "No CC found — manager notification may be missing",
    autoChecked: true,
  })

  // 4. Hours within bounds
  if (data.totalHours !== null) {
    const hoursOk = data.totalHours >= 30 && data.totalHours <= 50
    checks.push({
      id:          "c4",
      category:    "hours",
      rule:        "Weekly hours within acceptable range (30–50h)",
      result:      hoursOk ? "pass" : data.totalHours < 30 ? "fail" : "warning",
      detail:      hoursOk
        ? `${data.totalHours}h — within standard range`
        : data.totalHours < 30
          ? `${data.totalHours}h — significantly below minimum, possible under-reporting`
          : `${data.totalHours}h — above 50h threshold, OT pre-approval check needed`,
      autoChecked: true,
    })
  }

  // 5. Forwarded email check
  const isForward = data.subject.toLowerCase().startsWith("fwd:") || data.subject.toLowerCase().startsWith("fw:")
  if (isForward) {
    checks.push({
      id:          "c5",
      category:    "policy",
      rule:        "Original submission required (not a forward)",
      result:      "fail",
      detail:      "Email subject begins with 'Fwd:' — some clients require original submission only",
      autoChecked: true,
    })
  }

  return checks
}

function parseEmail(body: EmailIngestBody) {
  const text = [body.bodyText ?? "", body.subject].join(" ").toLowerCase()

  // Extract hours
  const totalHours = extractField<number | null>(
    text,
    [/total[\s_-]*hours?[:\s]+(\d+\.?\d*)/i, /(\d+\.?\d*)\s*h(?:ours?)?[\s,]+total/i, /(\d+)\s*hours?\s+(?:this|for|in)\s+(?:week|month)/i],
    parseFloat, null,
  )

  // Extract period
  const period = extractField<string>(
    body.subject + " " + (body.bodyText ?? ""),
    [/(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}/i, /\d{4}-(?:0[1-9]|1[0-2])/, /week\s+of\s+[\w\s,]+/i],
    m => m, "Unknown period",
  )

  // Extract employee name from subject (pattern: "... - FirstName LastName - ...")
  const nameParts = body.subject.match(/[-–|]\s*([A-Z][a-z]+ [A-Z][a-z]+)\s*[-–|]/i)
  const employeeName = nameParts?.[1] ?? body.from.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase())

  // Extract days present
  const daysPresent = extractField<number | null>(
    text,
    [/days?\s+present[:\s]+(\d+)/i, /(\d+)\s+working\s+days/i, /present\s*:\s*(\d+)/i],
    parseInt, null,
  )

  // Extract LOP
  const lopDays = extractField<number | null>(
    text,
    [/lop[:\s]+(\d+)/i, /loss\s+of\s+pay[:\s]+(\d+)/i],
    parseInt, 0,
  )

  return {
    senderEmail:    body.from,
    employeeName,
    period,
    totalHours,
    daysPresent,
    lopDays,
    hasAttachment:  body.hasAttachment,
    attachmentName: body.attachmentName,
    ccEmails:       body.cc ?? [],
    subject:        body.subject,
  }
}

function computeConfidence(parsed: ReturnType<typeof parseEmail>, checks: ReturnType<typeof runPolicyChecks>): number {
  let score = 50
  if (parsed.totalHours !== null) score += 20
  if (parsed.daysPresent !== null) score += 10
  if (parsed.hasAttachment) score += 15
  if (parsed.ccEmails.length > 0) score += 5
  const failures = checks.filter(c => c.result === "fail").length
  score -= failures * 15
  const warnings = checks.filter(c => c.result === "warning").length
  score -= warnings * 5
  return Math.max(0, Math.min(100, score))
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: EmailIngestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.from || !body.subject) {
    return NextResponse.json({ success: false, error: "Required fields: from, subject" }, { status: 422 })
  }

  // Simulate AI parsing time
  await new Promise(r => setTimeout(r, 600 + Math.random() * 400))

  const parsed     = parseEmail(body)
  const checks     = runPolicyChecks(parsed)
  const confidence = computeConfidence(parsed, checks)
  const hasFailures= checks.some(c => c.result === "fail")
  const hasWarnings= checks.some(c => c.result === "warning")

  const outcome =
    hasFailures   ? "flagged" :
    hasWarnings   ? "reviewing" :
    confidence >= 80 ? "auto_approvable" : "reviewing"

  const validationScore = Math.round(
    checks.reduce((s, c) => s + (c.result === "pass" ? 100 : c.result === "warning" ? 60 : 0), 0) / checks.length
  )

  return NextResponse.json({
    success:     true,
    receivedAt:  body.receivedAt ?? new Date().toISOString(),
    processedAt: new Date().toISOString(),

    // Extracted data
    extracted: {
      senderEmail:    parsed.senderEmail,
      employeeName:   parsed.employeeName,
      period:         parsed.period,
      totalHours:     parsed.totalHours,
      daysPresent:    parsed.daysPresent,
      lopDays:        parsed.lopDays,
      managerCCed:    parsed.ccEmails.length > 0,
      ccEmails:       parsed.ccEmails,
      hasAttachment:  parsed.hasAttachment,
      attachmentName: parsed.attachmentName,
    },

    // AI validation
    ai: {
      model:           "claude-3-5-sonnet",
      confidence,
      validationScore,
      outcome,
      checksRun:       checks.length,
      passCount:       checks.filter(c => c.result === "pass").length,
      warnCount:       checks.filter(c => c.result === "warning").length,
      failCount:       checks.filter(c => c.result === "fail").length,
    },

    // Structured checks
    validationChecks: checks,

    // Recommended next action for the ops system
    recommendation: {
      action: outcome === "auto_approvable"
        ? "Auto-approve and notify employee"
        : outcome === "reviewing"
          ? "Queue for ops review — soft issues detected"
          : "Flag for manual review — policy violations found",
      urgency: hasFailures ? "high" : hasWarnings ? "medium" : "low",
      slaDeadlineHours: 48,
    },

    // Audit trail
    audit: {
      inboxMonitored: "workorder.agentic@buzzworks.com",
      parsingPipeline: ["imap-fetch", "attachment-ocr", "ai-extraction", "policy-validation", "ops-queue"],
      loggedToSheet:  true,
    },
  })
}

// GET — health check for the email ingestion pipeline
export async function GET() {
  return NextResponse.json({
    status:       "operational",
    inbox:        "workorder.agentic@buzzworks.com",
    pollInterval: "5 minutes",
    aiModel:      "claude-3-5-sonnet",
    queueDepth:   Math.floor(Math.random() * 5),
    lastChecked:  new Date().toISOString(),
    parsedToday:  14,
    parsedThisMonth: 312,
    errorRate:    "0.6%",
  })
}
