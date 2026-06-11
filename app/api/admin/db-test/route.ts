import { NextResponse } from "next/server"
import { getSqlChecked } from "@/lib/db/client"

// Verify the new getSqlChecked() helper is actually live in this
// deployment AND that it survives the dead-cached-pool scenario.
// Wraps the call in a route-level timeout so this endpoint can't
// hang even if the helper itself is broken.

export const maxDuration = 25

export async function GET() {
  const t0 = Date.now()
  try {
    const sql = await Promise.race([
      getSqlChecked(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("getSqlChecked-overall-timeout")), 10_000),
      ),
    ])
    const ms_checked = Date.now() - t0
    const t1 = Date.now()
    const rows = await Promise.race([
      sql<{ n: string }[]>`SELECT COUNT(*)::text AS n FROM timesheets`,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("query-timeout")), 10_000),
      ),
    ])
    const ms_query = Date.now() - t1
    return NextResponse.json({
      ok: true,
      ms_checked,
      ms_query,
      timesheets: rows[0].n,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "unknown",
      region: process.env.VERCEL_REGION ?? "unknown",
    })
  } catch (e) {
    const err = e as Error & { code?: string }
    return NextResponse.json({
      ok: false,
      elapsed_ms: Date.now() - t0,
      error: err.message,
      error_code: err.code,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "unknown",
      region: process.env.VERCEL_REGION ?? "unknown",
    }, { status: 500 })
  }
}
