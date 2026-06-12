import { NextResponse } from "next/server"
import { getSqlChecked } from "@/lib/db/client"

// Runs the exact sql.unsafe pattern that /api/inbox uses, with route-
// level timeouts. Tells us if sql.unsafe + positional params is the
// thing hanging on the transaction-mode pooler.

export const maxDuration = 25

async function withTimeout<T>(label: string, p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label}-timeout`)), ms),
    ),
  ]) as Promise<T>
}

export async function GET() {
  const out: Record<string, unknown> = { commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "unknown" }
  try {
    const t0 = Date.now()
    const sql = await getSqlChecked()
    out.ms_get_sql = Date.now() - t0

    // 1) Tagged template (db-test pattern) — known to work
    const t1 = Date.now()
    const r1 = await withTimeout("tagged-tt", sql<{ n: string }[]>`SELECT COUNT(*)::text AS n FROM timesheets WHERE client_id = ${"cap"}`, 8_000)
    out.ms_tagged = Date.now() - t1
    out.tagged_n  = r1[0]?.n

    // 2) sql.unsafe with same query — does sql.unsafe hang?
    const t2 = Date.now()
    const r2 = await withTimeout("unsafe-simple", sql.unsafe<{ n: string }[]>(
      "SELECT COUNT(*)::text AS n FROM timesheets WHERE client_id = $1",
      ["cap"] as never[],
    ), 8_000)
    out.ms_unsafe_simple = Date.now() - t2
    out.unsafe_n         = r2[0]?.n

    // 3) sql.unsafe with array param via ANY (closer to inbox)
    const t3 = Date.now()
    const r3 = await withTimeout("unsafe-any", sql.unsafe<{ n: string }[]>(
      "SELECT COUNT(*)::text AS n FROM timesheets WHERE client_id = ANY($1::text[])",
      [["cap"]] as never[],
    ), 8_000)
    out.ms_unsafe_any = Date.now() - t3
    out.unsafe_any_n  = r3[0]?.n

    // 4) sql.unsafe joining employees — closest to inbox
    const t4 = Date.now()
    const r4 = await withTimeout("unsafe-join", sql.unsafe<{ id: string; name: string }[]>(
      `SELECT t.id, e.name FROM timesheets t JOIN employees e ON e.id = t.employee_id
       WHERE t.client_id = ANY($1::text[]) ORDER BY t.period_start DESC LIMIT $2`,
      [["cap"], 2] as never[],
    ), 12_000)
    out.ms_unsafe_join = Date.now() - t4
    out.unsafe_join_rows = r4.length

    out.ok = true
    return NextResponse.json(out)
  } catch (e) {
    out.ok = false
    out.error = (e as Error).message
    return NextResponse.json(out, { status: 500 })
  }
}
