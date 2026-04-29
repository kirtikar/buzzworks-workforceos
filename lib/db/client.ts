// Singleton postgres connection used by all API routes.
//
// Reads from any of: DATABASE_URL (standard PG convention),
// POSTGRES_URL (Vercel marketplace Supabase / Neon convention),
// or POSTGRES_PRISMA_URL (also injected by Vercel). First one wins.
// When all are unset, every call throws — Settings card surfaces
// this clearly so ops sees the setup gap.

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
      idle_timeout: 20,
    })
  }
  return globalThis.__sqlClient
}

export function isDbConfigured(): boolean {
  return Boolean(resolveDbUrl())
}
