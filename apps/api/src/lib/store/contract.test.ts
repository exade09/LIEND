/**
 * Store contract suite.
 *
 * The same assertions run against BOTH adapters:
 *   - the in-memory development store, and
 *   - the Postgres store, backed by PGlite (a real Postgres engine compiled to
 *     WASM) running the real migration files.
 *
 * That means the production SQL and the migrations are genuinely executed and
 * verified here, not mocked — and any behavioural drift between the two
 * adapters fails the build.
 */

import path from "node:path"
import { PGlite } from "@electric-sql/pglite"
import { beforeAll, describe, expect, it } from "vitest"
import type { SqlClient } from "../db/client"
import { migrate } from "../db/migrate"
import { createMemoryStore } from "./memory"
import { createPostgresStore } from "./postgres"
import type { LiendStore } from "./types"

const MIGRATIONS = path.resolve(__dirname, "../../../migrations")

function pgliteClient(db: PGlite): SqlClient {
  return {
    async query<T>(text: string, params: readonly unknown[] = []): Promise<T[]> {
      // PGlite cannot run multiple statements through the parameterized path,
      // so migration files (no params) go through exec().
      if (params.length === 0 && /;\s*\S/.test(text.trim().replace(/;\s*$/, ""))) {
        await db.exec(text)
        return [] as T[]
      }
      const result = await db.query<T>(text, params as unknown[])
      return result.rows
    },
  }
}

async function makePostgresStore(): Promise<LiendStore> {
  const db = new PGlite()
  const client = pgliteClient(db)
  const result = await migrate(client, MIGRATIONS)
  // Prove the migration actually ran rather than silently no-opping.
  expect(result.applied).toContain("001_initial.sql")
  return createPostgresStore(client)
}

const NOW = Date.now()
const WALLET_A = "6F2Z77uzpB7oSx6pG1b8TRTVjQKDbDgPs35qrNr8BZxq"
const WALLET_B = "So11111111111111111111111111111111111111112"

const adapters: { name: string; make: () => Promise<LiendStore> }[] = [
  { name: "memory", make: async () => createMemoryStore() },
  { name: "postgres (pglite)", make: makePostgresStore },
]

describe.each(adapters)("LiendStore contract — $name", ({ make }) => {
  let store: LiendStore

  beforeAll(async () => {
    store = await make()
  })

  // --- auth challenges -------------------------------------------------
  describe("auth challenges", () => {
    it("consumes a challenge exactly once (replay rejected)", async () => {
      await store.createChallenge({
        nonce: "n-replay",
        address: WALLET_A,
        message: "m",
        expiresAt: NOW + 60_000,
        consumedAt: null,
      })
      expect(await store.consumeChallenge("n-replay", NOW)).toBe(true)
      expect(await store.consumeChallenge("n-replay", NOW)).toBe(false)
    })

    it("rejects an expired challenge", async () => {
      await store.createChallenge({
        nonce: "n-expired",
        address: WALLET_A,
        message: "m",
        expiresAt: NOW - 1,
        consumedAt: null,
      })
      expect(await store.consumeChallenge("n-expired", NOW)).toBe(false)
    })

    it("rejects a nonce that was never issued", async () => {
      expect(await store.consumeChallenge("n-never", NOW)).toBe(false)
    })

    it("round-trips the address binding", async () => {
      await store.createChallenge({
        nonce: "n-bind",
        address: WALLET_B,
        message: "hello",
        expiresAt: NOW + 60_000,
        consumedAt: null,
      })
      const found = await store.findChallenge("n-bind")
      expect(found?.address).toBe(WALLET_B)
      expect(found?.message).toBe("hello")
    })
  })

  // --- sessions --------------------------------------------------------
  describe("sessions", () => {
    it("creates, finds and revokes", async () => {
      await store.createSession({
        sessionId: "s1",
        address: WALLET_A,
        createdAt: NOW,
        expiresAt: NOW + 60_000,
        revokedAt: null,
      })
      expect((await store.findSession("s1"))?.address).toBe(WALLET_A)

      await store.revokeSession("s1")
      expect((await store.findSession("s1"))?.revokedAt).not.toBeNull()
    })

    it("returns null for an unknown session", async () => {
      expect(await store.findSession("nope")).toBeNull()
    })
  })

  // --- pairing lifecycle -----------------------------------------------
  describe("pairing lifecycle", () => {
    async function seedPairing(id: string, expiresAt = NOW + 60_000) {
      await store.createPairing({
        requestId: id,
        userCode: "ABC-DEF",
        approvedBy: null,
        status: "pending",
        createdAt: NOW,
        expiresAt,
        consumedAt: null,
        deviceId: null,
      })
    }

    function device(deviceId: string) {
      return {
        deviceId,
        address: "",
        label: "Chrome",
        extensionVersion: "0.1.0",
        createdAt: NOW,
        lastSeenAt: null,
        revokedAt: null,
      }
    }

    it("cannot be exchanged before approval", async () => {
      await seedPairing("p-early")
      const result = await store.consumePairingAndCreateDevice({
        requestId: "p-early",
        now: NOW,
        device: device("d-early"),
        credentialHash: "h-early",
      })
      expect(result.ok).toBe(false)
    })

    it("binds the approving wallet and exchanges exactly once", async () => {
      await seedPairing("p-ok")
      expect(await store.approvePairing("p-ok", WALLET_A, NOW)).toBe(true)
      expect((await store.findPairing("p-ok"))?.approvedBy).toBe(WALLET_A)

      const first = await store.consumePairingAndCreateDevice({
        requestId: "p-ok",
        now: NOW,
        device: device("d-ok"),
        credentialHash: "h-ok",
      })
      expect(first).toEqual({ ok: true, address: WALLET_A })

      // Replaying the exchange must not issue a second device.
      const second = await store.consumePairingAndCreateDevice({
        requestId: "p-ok",
        now: NOW,
        device: device("d-ok-2"),
        credentialHash: "h-ok-2",
      })
      expect(second.ok).toBe(false)
      expect(await store.findDeviceByCredential("h-ok-2")).toBeNull()
    })

    it("cannot approve an expired request", async () => {
      await seedPairing("p-exp", NOW - 1)
      expect(await store.approvePairing("p-exp", WALLET_A, NOW)).toBe(false)
    })

    it("cannot approve after rejection", async () => {
      await seedPairing("p-rej")
      expect(await store.rejectPairing("p-rej", NOW)).toBe(true)
      expect(await store.approvePairing("p-rej", WALLET_A, NOW)).toBe(false)
    })

    it("cannot reject twice", async () => {
      await seedPairing("p-rej2")
      expect(await store.rejectPairing("p-rej2", NOW)).toBe(true)
      expect(await store.rejectPairing("p-rej2", NOW)).toBe(false)
    })
  })

  // --- devices and extension sessions -----------------------------------
  describe("devices and extension sessions", () => {
    async function pairDevice(id: string, wallet: string, credentialHash: string) {
      await store.createPairing({
        requestId: `req-${id}`,
        userCode: "AAA-BBB",
        approvedBy: null,
        status: "pending",
        createdAt: NOW,
        expiresAt: NOW + 60_000,
        consumedAt: null,
        deviceId: null,
      })
      await store.approvePairing(`req-${id}`, wallet, NOW)
      await store.consumePairingAndCreateDevice({
        requestId: `req-${id}`,
        now: NOW,
        credentialHash,
        device: {
          deviceId: id,
          address: "",
          label: "Chrome",
          extensionVersion: "0.1.0",
          createdAt: NOW,
          lastSeenAt: null,
          revokedAt: null,
        },
      })
    }

    it("finds a device by credential hash and never exposes the hash", async () => {
      await pairDevice("dev-1", WALLET_A, "hash-1")
      const found = await store.findDeviceByCredential("hash-1")
      expect(found?.deviceId).toBe("dev-1")
      expect(found?.address).toBe(WALLET_A)
      expect(JSON.stringify(await store.listDevices(WALLET_A))).not.toContain("hash-1")
    })

    it("scopes device listing to the owner", async () => {
      await pairDevice("dev-2", WALLET_B, "hash-2")
      const forA = await store.listDevices(WALLET_A)
      expect(forA.some((d) => d.deviceId === "dev-2")).toBe(false)
    })

    it("refuses cross-wallet revocation", async () => {
      await pairDevice("dev-3", WALLET_A, "hash-3")
      expect(await store.revokeDevice(WALLET_B, "dev-3", NOW)).toBe(false)
      expect((await store.findDeviceByCredential("hash-3"))?.revokedAt).toBeNull()
    })

    it("revokes a device and invalidates its extension sessions", async () => {
      await pairDevice("dev-4", WALLET_A, "hash-4")
      await store.createExtensionSession({
        tokenHash: "tok-4",
        deviceId: "dev-4",
        expiresAt: NOW + 60_000,
        revokedAt: null,
      })
      expect((await store.findExtensionSession("tok-4"))?.revokedAt).toBeNull()

      expect(await store.revokeDevice(WALLET_A, "dev-4", NOW)).toBe(true)

      // Both the device credential and any derived session are now dead.
      expect((await store.findDeviceByCredential("hash-4"))?.revokedAt).not.toBeNull()
      expect((await store.findExtensionSession("tok-4"))?.revokedAt).not.toBeNull()
    })

    it("cannot revoke the same device twice", async () => {
      await pairDevice("dev-5", WALLET_A, "hash-5")
      expect(await store.revokeDevice(WALLET_A, "dev-5", NOW)).toBe(true)
      expect(await store.revokeDevice(WALLET_A, "dev-5", NOW)).toBe(false)
    })

    it("records last-seen without storing browsing data", async () => {
      await pairDevice("dev-6", WALLET_A, "hash-6")
      await store.touchDevice("dev-6", NOW + 5)
      const [device] = (await store.listDevices(WALLET_A)).filter((d) => d.deviceId === "dev-6")
      expect(device.lastSeenAt).toBe(NOW + 5)
      // Only these fields exist — no URLs, no history, no fingerprint.
      expect(Object.keys(device).sort()).toEqual(
        ["address", "createdAt", "deviceId", "extensionVersion", "label", "lastSeenAt", "revokedAt"],
      )
    })
  })
})
