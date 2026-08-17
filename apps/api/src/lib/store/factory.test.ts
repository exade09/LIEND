/**
 * Guards that production can never run on non-durable storage.
 *
 * This is the test that makes the "no fake persistence" rule enforceable
 * rather than aspirational.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { resetServerEnvCache } from "../env"
import { getStore, PersistenceUnavailableError, resetStore } from "./index"

const ORIGINAL = { ...process.env }

function setEnv(values: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  resetServerEnvCache()
  resetStore()
}

describe("store factory", () => {
  beforeEach(() => {
    resetServerEnvCache()
    resetStore()
  })

  afterEach(() => {
    process.env = { ...ORIGINAL }
    resetServerEnvCache()
    resetStore()
  })

  it("throws in production when DATABASE_URL is missing", () => {
    setEnv({ VERCEL_ENV: "production", DATABASE_URL: undefined, LIEND_DATABASE_URL: undefined })
    expect(() => getStore()).toThrow(PersistenceUnavailableError)
  })

  it("never silently falls back to in-memory storage in production", () => {
    setEnv({ VERCEL_ENV: "production", DATABASE_URL: undefined, LIEND_DATABASE_URL: undefined })
    let store: unknown = null
    try {
      store = getStore()
    } catch {
      // expected
    }
    // The critical assertion: nothing usable was handed back.
    expect(store).toBeNull()
  })

  it("also refuses on a production preview build with no database", () => {
    setEnv({ VERCEL_ENV: "production", LIEND_DEPLOY_ENV: "production", DATABASE_URL: undefined })
    expect(() => getStore()).toThrow(/DATABASE_URL/)
  })

  it("allows the in-memory store only outside production", () => {
    setEnv({ VERCEL_ENV: "development", DATABASE_URL: undefined, LIEND_DATABASE_URL: undefined })
    expect(() => getStore()).not.toThrow()
  })
})
