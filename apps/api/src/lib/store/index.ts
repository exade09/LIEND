/**
 * Store factory.
 *
 * Selection rules, in order:
 *   1. DATABASE_URL configured  -> real Postgres store (any environment).
 *   2. Production, no DATABASE_URL -> throw. Never fall back.
 *   3. Non-production, no DATABASE_URL -> in-memory development store.
 *
 * Rule 2 is the one that matters. A production API without durable storage
 * fails loudly rather than authenticating users against state that vanishes
 * between serverless invocations and is not shared across instances.
 */

import { readServerEnv } from "../env"
import { createPostgresClient } from "../db/pool"
import { createMemoryStore } from "./memory"
import { createPostgresStore } from "./postgres"
import type { LiendStore } from "./types"

export * from "./types"
export { createPostgresStore } from "./postgres"
export { createMemoryStore } from "./memory"

let instance: LiendStore | null = null

export class PersistenceUnavailableError extends Error {
  constructor() {
    super(
      "No durable persistence is configured. Set DATABASE_URL to a Postgres " +
        "connection string before running the LONS API in production.",
    )
    this.name = "PersistenceUnavailableError"
  }
}

export function getStore(): LiendStore {
  if (instance) return instance

  const env = readServerEnv()

  if (env.databaseUrl) {
    instance = createPostgresStore(createPostgresClient(env.databaseUrl))
    return instance
  }

  if (env.isProduction) {
    throw new PersistenceUnavailableError()
  }

  instance = createMemoryStore()
  return instance
}

/** Test helper. */
export function resetStore(): void {
  instance = null
}

/** Test helper — inject a store built over an arbitrary SqlClient. */
export function setStore(next: LiendStore | null): void {
  instance = next
}
