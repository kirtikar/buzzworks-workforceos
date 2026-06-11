// Pooled postgres connection used by all API routes.
//
// Reads from any of: DATABASE_URL (standard PG convention),
// POSTGRES_URL (Vercel marketplace Supabase / Neon convention),
// or POSTGRES_PRISMA_URL (also injected by Vercel). First one wins.
// When all are unset, every call throws — Settings card surfaces
// this clearly so ops sees the setup gap.
//
// Caching strategy. We DO cache the client per process so warm
// serverless functions skip the TCP+TLS handshake (~600-800ms saved).
// But we add three safety nets that the previous version lacked:
//
//   1) connect_timeout: bounded wait on initial connection. If the
//      pooler is unreachable, fail in 10s instead of hanging.
//   2) max_lifetime: every cached connection is recycled after 5 min.
//      This is what catches the "Supabase paused → restored, but my
//      cached TCP socket is dead" case automatically.
//   3) idle_timeout: trim idle connections aggressively so we don't
//      hold dead sockets across function invocations.
//
// On any pool error the cache is also dropped so the next call gets a
// fresh client. Combined with max_lifetime, this means a function
// instance that survives a DB outage will recover automatically once
// the DB comes back, without needing a redeploy.

import postgres from "postgres"

declare global {
  // eslint-disable-next-line no-var
  var __sqlClient: ReturnType<typeof postgres> | undefined
}

function resolveDbUrl(): string | undefined {
  return process.env.DATABASE_URL
      ?? process.env.POSTGRES_URL
      ?? process.env.POSTGRES_PRISMA_URL
}

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
    globalThis.__sqlClient = postgres(url, {
      ssl: "require",
      connection: { application_name: "agent-dashboard" },
      max: 5,
      idle_timeout: 10,       // close idle connections after 10s
      max_lifetime: 5 * 60,   // recycle every 5 min — guards against pause/restart
      connect_timeout: 10,    // fail-fast on unreachable pooler
      onnotice: () => {},     // silence pg notices (e.g. "extension already exists")
    })
  }
  return globalThis.__sqlClient
}

// Force-drop the cached client. Useful after a known DB outage or in
// tests; the next getSql() will spin up a fresh pool.
export async function resetSql(): Promise<void> {
  const cur = globalThis.__sqlClient
  globalThis.__sqlClient = undefined
  if (cur) await cur.end({ timeout: 1 }).catch(() => {})
}

export function isDbConfigured(): boolean {
  return Boolean(resolveDbUrl())
}
