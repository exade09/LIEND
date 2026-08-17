/**
 * Production Postgres connection.
 *
 * Uses node-postgres over the standard wire protocol, so LIEND is coupled to
 * Postgres — not to any provider's proprietary API. Neon is the initial host
 * simply because it speaks standard Postgres; swapping providers is a
 * connection-string change.
 *
 * Serverless note: point DATABASE_URL at the provider's POOLED endpoint.
 * Each serverless instance keeps a small local pool; the provider's pooler is
 * what prevents connection exhaustion across many concurrent instances.
 */

import { Pool } from "pg"
import { assertServerOnly, type SqlClient } from "./client"

let pool: Pool | null = null

export function getPool(databaseUrl: string): Pool {
  assertServerOnly()
  if (pool) return pool

  pool = new Pool({
    connectionString: databaseUrl,
    // Small per-instance pool: the provider's pooler does the heavy lifting.
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    // Managed Postgres requires TLS. `rejectUnauthorized` stays true so a
    // man-in-the-middle cannot present its own certificate.
    ssl: databaseUrl.includes("sslmode=disable") ? false : { rejectUnauthorized: true },
  })

  pool.on("error", (error) => {
    // Never log the connection string or query parameters.
    console.error("[liend-api] postgres pool error", error.message)
  })

  return pool
}

export function createPostgresClient(databaseUrl: string): SqlClient {
  const active = getPool(databaseUrl)
  return {
    async query<T>(text: string, params: readonly unknown[] = []): Promise<T[]> {
      const result = await active.query(text, params as unknown[])
      return result.rows as T[]
    },
  }
}

/** Test helper. */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}
