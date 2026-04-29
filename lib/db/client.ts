// Singleton postgres connection used by all API routes.
//
// Reads DATABASE_URL from env (Vercel Postgres / Neon both inject it
// natively). When unset, every call throws — Settings card surfaces
// this clearly so ops sees the setup gap.

import postgres from "postgres"

declare global {
  // eslint-disable-next-line no-var
  var __sqlClient: ReturnType<typeof postgres> | undefined
}

export function getSql() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Provision Vercel Postgres (Storage tab) " +
      "and redeploy, then visit /api/admin/migrate once."
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
  return Boolean(process.env.DATABASE_URL)
}
