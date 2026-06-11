import { NextResponse } from "next/server"
import postgres from "postgres"

// Diagnostic endpoint that bypasses the cached global pool and tries a
// FRESH connection to Postgres with a tight timeout. Returns the exact
// error (or success metadata) as JSON so we can see what Vercel sees
// without the whole request hanging for 30+ seconds.
//
// Visit /api/admin/db-diagnose

export const maxDuration = 25

function resolveDbUrl(): { url: string | undefined; source: string | null } {
  if (process.env.DATABASE_URL)         return { url: process.env.DATABASE_URL,         source: "DATABASE_URL" }
  if (process.env.POSTGRES_URL)         return { url: process.env.POSTGRES_URL,         source: "POSTGRES_URL" }
  if (process.env.POSTGRES_PRISMA_URL)  return { url: process.env.POSTGRES_PRISMA_URL,  source: "POSTGRES_PRISMA_URL" }
  return { url: undefined, source: null }
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.username}:****@${u.hostname}:${u.port}${u.pathname}${u.search}`
  } catch {
    return "<unparseable>"
  }
}

export async function GET() {
  const t0 = Date.now()
  const { url, source } = resolveDbUrl()
  if (!url) {
    return NextResponse.json({
      ok: false,
      stage: "env",
      error: "No DB URL env var set",
      env_keys_present: Object.keys(process.env).filter(k => k.includes("DATABASE") || k.includes("POSTGRES")),
    }, { status: 500 })
  }

  let hostname = "<unparseable>"
  try { hostname = new URL(url).hostname } catch {}

  // Fresh connection — bypass the cached globalThis.__sqlClient pool.
  const sql = postgres(url, {
    ssl: "require",
    connection: { application_name: "agent-dashboard-diag" },
    max: 1,
    idle_timeout: 5,
    connect_timeout: 15,
  })

  try {
    const rows = await sql<{ ts: string; emp: string }[]>`
      SELECT
        (SELECT COUNT(*) FROM timesheets)::text AS ts,
        (SELECT COUNT(*) FROM employees)::text  AS emp
    `
    const elapsed = Date.now() - t0
    await sql.end()
    return NextResponse.json({
      ok: true,
      source,
      hostname,
      masked: maskUrl(url),
      elapsed_ms: elapsed,
      counts: rows[0],
      runtime: process.env.NEXT_RUNTIME ?? "nodejs",
      region: process.env.VERCEL_REGION ?? "unknown",
    })
  } catch (e) {
    const elapsed = Date.now() - t0
    await sql.end().catch(() => {})
    const err = e as Error & { code?: string }
    return NextResponse.json({
      ok: false,
      stage: "query",
      source,
      hostname,
      masked: maskUrl(url),
      elapsed_ms: elapsed,
      error: err.message,
      error_code: err.code,
      error_name: err.name,
      runtime: process.env.NEXT_RUNTIME ?? "nodejs",
      region: process.env.VERCEL_REGION ?? "unknown",
    }, { status: 500 })
  }
}
