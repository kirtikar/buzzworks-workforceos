// Postgres client used by all API routes.
//
// Reads from any of: DATABASE_URL (standard PG convention),
// POSTGRES_URL (Vercel marketplace Supabase / Neon convention),
// or POSTGRES_PRISMA_URL (also injected by Vercel). First one wins.
//
// Caching strategy. We cache the pool per process so warm serverless
// functions skip the TCP+TLS handshake. But we layer a health check
// in front of every getSql() call: a sub-second `SELECT 1` race that
// drops the cache if the cached pool is stuck on a dead socket.
//
// This catches the "Supabase paused → restored, but my cached TCP
// socket is dead" case automatically, without needing a redeploy or
// a function-instance recycle. Dead-pool detection cost is ~5-10ms
// per request on a warm, healthy pool; ~3s on the FIRST request
// after a DB outage (the timeout window) and then back to ~5-10ms.

import postgres from "postgres"

declare global {
  // eslint-disable-next-line no-var
  var __sqlClient:    ReturnType<typeof postgres> | undefined
  // eslint-disable-next-line no-var
  var __sqlCheckedAt: number | undefined
}

const HEALTH_CHECK_TIMEOUT_MS = 3_000
// Re-check the cached pool only once per this many ms to avoid paying
// the SELECT 1 cost on every request. 30s strikes a balance between
// recovery speed and per-request overhead.
const HEALTH_CHECK_INTERVAL_MS = 30_000

function resolveDbUrl(): string | undefined {
  return process.env.DATABASE_URL
      ?? process.env.POSTGRES_URL
      ?? process.env.POSTGRES_PRISMA_URL
}

function buildPool(url: string) {
  return postgres(url, {
    ssl: "require",
    connection: { application_name: "agent-dashboard" },
    max: 5,
    idle_timeout: 10,
    max_lifetime: 60,        // recycle every 60s — second line of defence
    connect_timeout: 10,
    onnotice: () => {},
  })
}

// Synchronous accessor — used by scripts and any caller that doesn't
// need health-checking (e.g. one-shot CLI tools, where a fresh process
// always means a fresh pool).
export function getSql() {
  const url = resolveDbUrl()
  if (!url) {
    throw new Error(
      "No database URL set. Provision a Postgres database from the " +
      "Vercel marketplace (Supabase / Neon) and redeploy, then visit " +
      "/api/admin/migrate once."
    )
  }
  if (!globalThis.__sqlClient) {
    globalThis.__sqlClient = buildPool(url)
  }
  return globalThis.__sqlClient
}

// Async accessor for API routes. Verifies the cached pool can actually
// round-trip a query within HEALTH_CHECK_TIMEOUT_MS. If it can't,
// drops the cache and builds a fresh pool. Skips the check if a
// successful one happened in the recent past (to avoid paying the
// round-trip on every request).
export async function getSqlChecked() {
  const sql = getSql()
  const now = Date.now()
  const lastChecked = globalThis.__sqlCheckedAt ?? 0
  if (now - lastChecked < HEALTH_CHECK_INTERVAL_MS) return sql

  try {
    await Promise.race([
      sql`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("db-health-timeout")), HEALTH_CHECK_TIMEOUT_MS),
      ),
    ])
    globalThis.__sqlCheckedAt = now
    return sql
  } catch {
    // The cached pool is wedged on a dead socket. Drop it and try once
    // more with a fresh pool — if that fails, the route's own error
    // handler surfaces it as a 500.
    const dead = globalThis.__sqlClient
    globalThis.__sqlClient = undefined
    globalThis.__sqlCheckedAt = undefined
    if (dead) dead.end({ timeout: 1 }).catch(() => {})
    return getSql()
  }
}

// Force-drop the cached client. Useful in tests or as a manual reset.
export async function resetSql(): Promise<void> {
  const cur = globalThis.__sqlClient
  globalThis.__sqlClient = undefined
  globalThis.__sqlCheckedAt = undefined
  if (cur) await cur.end({ timeout: 1 }).catch(() => {})
}

export function isDbConfigured(): boolean {
  return Boolean(resolveDbUrl())
}
