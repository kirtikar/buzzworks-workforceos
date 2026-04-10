/**
 * Mock API — Portal Timesheet Sync
 *
 * POST /api/portals/:portalId/sync
 * Simulates what a real portal integration would return when polled:
 *   - A list of new/updated timesheet entries from the portal
 *   - Sync metadata (next cursor, errors, rate limit info)
 *
 * In production: this route would call the actual portal's API,
 * transform the response into our internal Timesheet format,
 * and queue new entries for AI validation.
 */

import { NextRequest, NextResponse } from "next/server"

// ─── Portal-specific response shapes (what each portal actually returns) ──────

const PORTAL_SCHEMAS: Record<string, { vendor: string; apiStyle: string; dateFormat: string }> = {
  veltrix:      { vendor: "Veltrix HCM",   apiStyle: "REST/JSON",   dateFormat: "YYYY-MM-DD" },
  hrloop:       { vendor: "HRLoop",        apiStyle: "REST/JSON",   dateFormat: "DD-MM-YYYY" },
  peoplehive:   { vendor: "PeopleHive",    apiStyle: "REST/JSON",   dateFormat: "YYYY-MM-DD" },
  orbithcm:     { vendor: "OrbitHCM",      apiStyle: "OData/XML",   dateFormat: "ISO8601" },
  cloudspire:   { vendor: "CloudSpire",    apiStyle: "SOAP/XML",    dateFormat: "YYYY-MM-DDThh:mm:ssZ" },
  leafhr:       { vendor: "LeafHR",        apiStyle: "REST/JSON",   dateFormat: "YYYY-MM-DD" },
  humanedge:    { vendor: "HumanEdge",     apiStyle: "REST/JSON",   dateFormat: "MM/DD/YYYY" },
  payaxis:      { vendor: "PayAxis",       apiStyle: "REST/JSON",   dateFormat: "YYYY-MM-DD" },
  talentweave:  { vendor: "TalentWeave",   apiStyle: "REST/JSON",   dateFormat: "YYYY-MM-DD" },
  staffpulse:   { vendor: "StaffPulse",    apiStyle: "REST/JSON",   dateFormat: "YYYY-MM-DD" },
}

// ─── Deterministic mock timesheet generator ───────────────────────────────────

function hashCode(str: string): number {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

function generatePortalTimesheets(portalId: string, clientId: string, count: number, fromDate: string) {
  const entries = []
  for (let i = 0; i < count; i++) {
    const seed = hashCode(`${portalId}::${clientId}::${fromDate}::${i}`)
    const baseHours = [36, 38, 40, 40, 40, 42, 45, 45, 48][seed % 9]
    const otHours   = [0, 0, 0, 2, 4, 6, 8, 0, 0][seed % 9]
    const score     = 65 + (seed % 35)
    const statuses  = ["pending", "pending", "pending", "reviewing", "flagged"]
    const empCode   = `${clientId.toUpperCase().slice(0, 3)}${String(seed % 9000 + 1000).padStart(4, "0")}`

    entries.push({
      portalRecordId:     `${portalId.toUpperCase()}-${seed % 999999}`,
      employeeCode:       empCode,
      employeeName:       `Employee ${empCode}`,
      period:             fromDate,
      regularHours:       baseHours,
      overtimeHours:      otHours,
      totalHours:         baseHours + otHours,
      leaveHours:         0,
      submittedAt:        new Date(Date.now() - (i * 3600000)).toISOString(),
      managerApproved:    seed % 3 !== 0,
      attachmentUrl:      `https://portal.${portalId}.com/timesheets/${seed % 999999}.pdf`,
      rawStatus:          statuses[seed % statuses.length],
      validationScore:    score,
      flagged:            score < 75,
      flagReason:         score < 75 ? (otHours > 0 && !(seed % 3 !== 0) ? "OT without manager approval" : "Hours deviation") : null,
    })
  }
  return entries
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ portalId: string }> }
) {
  const { portalId } = await context.params

  const schema = PORTAL_SCHEMAS[portalId]
  if (!schema) {
    return NextResponse.json(
      { success: false, error: `Unknown portal: ${portalId}. Supported: ${Object.keys(PORTAL_SCHEMAS).join(", ")}` },
      { status: 404 }
    )
  }

  let body: { clientId?: string; fromDate?: string; toDate?: string; limit?: number } = {}
  try {
    body = await request.json()
  } catch {
    // empty body is fine
  }

  const clientId  = body.clientId  ?? "unknown"
  const fromDate  = body.fromDate  ?? new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]
  const toDate    = body.toDate    ?? new Date().toISOString().split("T")[0]
  const limit     = Math.min(body.limit ?? 25, 100)

  // Simulate network latency for different portal types
  const latencyMs: Record<string, number> = {
    veltrix: 320, hrloop: 480, peoplehive: 410, orbithcm: 1240,
    cloudspire: 1820, leafhr: 280, humanedge: 390, payaxis: 950,
    talentweave: 560, staffpulse: 310,
  }
  await new Promise(r => setTimeout(r, latencyMs[portalId] ?? 500))

  // Simulate occasional errors
  const errRate = portalId === "orbithcm" ? 0.05 : portalId === "humanedge" ? 0.08 : 0.01
  if (Math.random() < errRate) {
    return NextResponse.json(
      {
        success:   false,
        error:     "Portal rate limit exceeded",
        retryAfterMs: 60000,
        vendor:    schema.vendor,
        portalId,
      },
      { status: 429 }
    )
  }

  const timesheets = generatePortalTimesheets(portalId, clientId, limit, fromDate)
  const flagged    = timesheets.filter(t => t.flagged).length
  const clean      = timesheets.length - flagged

  return NextResponse.json({
    success:     true,
    portalId,
    vendor:      schema.vendor,
    apiStyle:    schema.apiStyle,
    clientId,
    syncedAt:    new Date().toISOString(),
    fromDate,
    toDate,
    // Pagination cursor for next sync
    nextCursor:  `cursor_${Date.now()}_${timesheets.length}`,
    hasMore:     timesheets.length === limit,
    // Summary
    summary: {
      total:    timesheets.length,
      clean,
      flagged,
      autoApprovable: Math.floor(clean * 0.8),
    },
    // AI parsing note
    parsing: {
      model:          "claude-3-5-sonnet",
      avgConfidence:  87,
      policyVersion:  "v3.2",
      checksApplied:  ["hours", "overtime", "leave", "employment", "holiday"],
    },
    timesheets,
    // Webhook note
    webhookEnabled: ["veltrix", "peoplehive", "leafhr", "hrloop", "staffpulse", "talentweave"].includes(portalId),
    nextPollRecommendedAt: new Date(Date.now() + (portalId === "veltrix" ? 900000 : 3600000)).toISOString(),
  })
}

// GET — check portal connection status
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ portalId: string }> }
) {
  const { portalId } = await context.params
  const schema = PORTAL_SCHEMAS[portalId]
  if (!schema) {
    return NextResponse.json({ connected: false, error: "Unknown portal" }, { status: 404 })
  }

  return NextResponse.json({
    portalId,
    vendor:      schema.vendor,
    connected:   true,
    status:      "operational",
    latencyMs:   Math.floor(Math.random() * 800 + 100),
    apiVersion:  { veltrix: "v3.1", hrloop: "v2.4", peoplehive: "v1.9", orbithcm: "v4.0", cloudspire: "v38.2", leafhr: "v1.0", humanedge: "v2", payaxis: "v2.0", talentweave: "v3.5", staffpulse: "v1.3" }[portalId],
    checkedAt:   new Date().toISOString(),
  })
}
