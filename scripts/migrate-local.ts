import { getSql } from "../lib/db/client"
import { promises as fs } from "node:fs"
import * as path from "node:path"

// Local migration runner — same logic as /api/admin/migrate but bypasses
// Vercel's serverless timeout. Useful when the migration includes
// CREATE INDEX on large tables (pg_trgm GIN can take >60s).

async function main() {
  const sql = getSql()
  const schemaPath = path.join(process.cwd(), "lib", "db", "schema.sql")
  const schema = await fs.readFile(schemaPath, "utf-8")
  const statements = schema
    .split(/;\s*$/m)
    .map(s => s
      .split("\n")
      .filter(line => !line.trim().startsWith("--"))
      .join("\n")
      .trim())
    .filter(s => s.length > 0)

  console.log(`Applying ${statements.length} statements…`)
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    const preview = stmt.slice(0, 80).replace(/\s+/g, " ")
    const t0 = Date.now()
    try {
      await sql.unsafe(stmt)
      const ms = Date.now() - t0
      console.log(`  [${i + 1}/${statements.length}] ${ms}ms  ${preview}…`)
    } catch (e) {
      console.error(`  [${i + 1}/${statements.length}] FAIL  ${preview}…`)
      console.error(`         ${(e as Error).message}`)
    }
  }
  const tables = await sql<{ table_name: string }[]>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name
  `
  console.log(`\nTables: ${tables.map(t => t.table_name).join(", ")}`)
  process.exit(0)
}
main().catch(e => { console.error(e); process.exit(1) })
