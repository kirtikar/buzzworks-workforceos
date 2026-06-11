import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { getSqlChecked } from "@/lib/db/client"

// One-shot migration runner. Visit GET /api/admin/migrate after the
// first deploy with DATABASE_URL set. Idempotent (CREATE TABLE IF NOT
// EXISTS). Re-run is safe.

export async function GET() {
  try {
    const sql = await getSqlChecked()
    const schemaPath = path.join(process.cwd(), "lib", "db", "schema.sql")
    const schema = await fs.readFile(schemaPath, "utf-8")
    // postgres-library sql.unsafe() runs one statement per call; split
    // on semicolons so the full schema (CREATE TABLEs + ALTER TABLEs +
    // CREATE INDEXes) all apply on each migrate.
    // Split on `;` then strip leading comment-only lines so a statement
    // preceded by a `-- …` block still runs (the previous `!^--` filter
    // dropped any statement with leading comments).
    const statements = schema
      .split(/;\s*$/m)
      .map(s => s
        .split("\n")
        .filter(line => !line.trim().startsWith("--"))
        .join("\n")
        .trim())
      .filter(s => s.length > 0)
    for (const stmt of statements) {
      await sql.unsafe(stmt)
    }
    const tables = await sql<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `
    return NextResponse.json({ ok: true, tables: tables.map(t => t.table_name) })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
