/**
 * Minimal SQL client abstraction.
 *
 * Deliberately tiny: one parameterized `query` method. That is enough for
 * everything LIEND persists, keeps the schema portable across any standard
 * Postgres (Neon today, anything else later), and lets tests run the exact
 * same SQL against an embedded Postgres engine.
 *
 * No ORM and no query builder. Every statement in this codebase is plain
 * parameterized SQL, so there is no layer that could silently interpolate an
 * untrusted value.
 */

export interface SqlClient {
  query<T = Record<string, unknown>>(text: string, params?: readonly unknown[]): Promise<T[]>
}

/** Server-only guard. Never let a database handle reach a browser bundle. */
export function assertServerOnly(): void {
  if (typeof window !== "undefined") {
    throw new Error("Database access attempted in a browser context")
  }
}
