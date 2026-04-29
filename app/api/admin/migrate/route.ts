import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { getSql } from "@/lib/db/client"

// One-shot migration runner. Visit GET /api/admin/migrate after the
// first deploy with DATABASE_URL set. Idempotent (CREATE TABLE IF NOT
// EXISTS). Re-run is safe.

export async function GET() {
  try {
    const sql = getSql()
    const schemaPath = path.join(process.cwd(), "lib", "db", "schema.sql")
    const schema = await fs.readFile(schemaPath, "utf-8")
    await sql.unsafe(schema)
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
