/**
 * Applies pending migrations. Run as an explicit deploy step:
 *   npm run migrate -w @liend/api
 *
 * Never invoked at request time — the application does not create tables.
 */
import path from "node:path"
import { readdir, readFile } from "node:fs/promises"
import pg from "pg"

const databaseUrl = process.env.DATABASE_URL ?? process.env.LIEND_DATABASE_URL
if (!databaseUrl) {
  console.error("DATABASE_URL is required to run migrations")
  process.exit(1)
}

const dir = path.resolve(process.cwd(), "migrations")
const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes("sslmode=disable") ? false : { rejectUnauthorized: true },
})

try {
  await pool.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
  )
  const { rows } = await pool.query("SELECT name FROM schema_migrations")
  const done = new Set(rows.map((row) => row.name))

  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort()
  for (const name of files) {
    if (done.has(name)) {
      console.log(`skip  ${name}`)
      continue
    }
    const sql = await readFile(path.join(dir, name), "utf8")
    await pool.query(sql)
    await pool.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name])
    console.log(`apply ${name}`)
  }
  console.log("migrations up to date")
} finally {
  await pool.end()
}
