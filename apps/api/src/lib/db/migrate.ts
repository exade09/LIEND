/**
 * Migration runner.
 *
 * Migrations are plain, version-controlled .sql files applied in filename
 * order and recorded in `schema_migrations`. The application never creates
 * tables at request time — migrations run as an explicit deploy step, so the
 * schema is reproducible and identical across local, test, preview and
 * production.
 */

import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import type { SqlClient } from "./client"

const MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name       TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`

export function migrationsDir(): string {
  // apps/api/src/lib/db -> apps/api/migrations
  return path.resolve(process.cwd(), "migrations")
}

export async function readMigrations(dir = migrationsDir()): Promise<{ name: string; sql: string }[]> {
  const entries = await readdir(dir)
  const files = entries.filter((entry) => entry.endsWith(".sql")).sort()
  return Promise.all(
    files.map(async (name) => ({ name, sql: await readFile(path.join(dir, name), "utf8") })),
  )
}

/**
 * Applies any migration not yet recorded. Idempotent: running twice is a
 * no-op, which is what makes it safe to run on every deploy.
 */
export async function migrate(
  client: SqlClient,
  dir = migrationsDir(),
): Promise<{ applied: string[]; skipped: string[] }> {
  await client.query(MIGRATIONS_TABLE)

  const done = await client.query<{ name: string }>("SELECT name FROM schema_migrations")
  const already = new Set(done.map((row) => row.name))

  const applied: string[] = []
  const skipped: string[] = []

  for (const migration of await readMigrations(dir)) {
    if (already.has(migration.name)) {
      skipped.push(migration.name)
      continue
    }
    await client.query(migration.sql)
    // Recorded only after the SQL succeeds, so a failed migration is retried.
    await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [migration.name])
    applied.push(migration.name)
  }

  return { applied, skipped }
}
