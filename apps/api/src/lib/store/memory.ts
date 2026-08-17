/**
 * DEVELOPMENT-ONLY in-memory store.
 *
 * NOT production persistence. Process-local, lost on restart, and not shared
 * between serverless instances. `./index.ts` refuses to construct it when
 * VERCEL_ENV is production.
 *
 * It mirrors the Postgres adapter's semantics exactly — including the atomic
 * transitions — so the shared contract test suite runs against both and any
 * behavioural drift between them fails the build.
 */

import type {
  AuthChallengeRecord,
  DeviceRecord,
  ExtensionSessionRecord,
  LiendStore,
  PairingRecord,
  SessionRecord,
} from "./types"

export function createMemoryStore(): LiendStore {
  const challenges = new Map<string, AuthChallengeRecord>()
  const sessions = new Map<string, SessionRecord>()
  const pairings = new Map<string, PairingRecord>()
  const devices = new Map<string, DeviceRecord & { credentialHash: string }>()
  const extensionSessions = new Map<string, Omit<ExtensionSessionRecord, "address">>()

  return {
    async createChallenge(record) {
      challenges.set(record.nonce, record)
    },
    async findChallenge(nonce) {
      return challenges.get(nonce) ?? null
    },
    async consumeChallenge(nonce, now) {
      const found = challenges.get(nonce)
      if (!found || found.consumedAt !== null || found.expiresAt <= now) return false
      challenges.set(nonce, { ...found, consumedAt: now })
      return true
    },

    async createSession(record) {
      sessions.set(record.sessionId, record)
    },
    async findSession(sessionId) {
      return sessions.get(sessionId) ?? null
    },
    async revokeSession(sessionId) {
      const found = sessions.get(sessionId)
      if (found && found.revokedAt === null) {
        sessions.set(sessionId, { ...found, revokedAt: Date.now() })
      }
    },

    async createPairing(record) {
      pairings.set(record.requestId, record)
    },
    async findPairing(requestId) {
      return pairings.get(requestId) ?? null
    },
    async approvePairing(requestId, address, now) {
      const found = pairings.get(requestId)
      if (!found || found.status !== "pending" || found.expiresAt <= now) return false
      pairings.set(requestId, { ...found, status: "approved", approvedBy: address })
      return true
    },
    async rejectPairing(requestId, now) {
      const found = pairings.get(requestId)
      if (!found || found.status !== "pending" || found.expiresAt <= now) return false
      pairings.set(requestId, { ...found, status: "rejected" })
      return true
    },
    async consumePairingAndCreateDevice({ requestId, now, device, credentialHash }) {
      const found = pairings.get(requestId)
      if (!found || found.status !== "approved" || found.expiresAt <= now) {
        return { ok: false, address: null }
      }
      const address = found.approvedBy
      if (!address) return { ok: false, address: null }

      pairings.set(requestId, {
        ...found,
        status: "consumed",
        consumedAt: now,
        deviceId: device.deviceId,
      })
      devices.set(device.deviceId, { ...device, address, credentialHash })
      return { ok: true, address }
    },

    async listDevices(address) {
      return [...devices.values()]
        .filter((device) => device.address === address)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(({ credentialHash: _ignored, ...rest }) => rest)
    },
    async findDeviceByCredential(credentialHash) {
      const found = [...devices.values()].find((device) => device.credentialHash === credentialHash)
      if (!found) return null
      const { credentialHash: _ignored, ...rest } = found
      return rest
    },
    async touchDevice(deviceId, now) {
      const found = devices.get(deviceId)
      if (found) devices.set(deviceId, { ...found, lastSeenAt: now })
    },
    async revokeDevice(address, deviceId, now) {
      const found = devices.get(deviceId)
      if (!found || found.address !== address || found.revokedAt !== null) return false
      devices.set(deviceId, { ...found, revokedAt: now })
      for (const [hash, session] of extensionSessions) {
        if (session.deviceId === deviceId && session.revokedAt === null) {
          extensionSessions.set(hash, { ...session, revokedAt: now })
        }
      }
      return true
    },

    async createExtensionSession(record) {
      extensionSessions.set(record.tokenHash, record)
    },
    async findExtensionSession(tokenHash) {
      const session = extensionSessions.get(tokenHash)
      if (!session) return null
      const device = devices.get(session.deviceId)
      if (!device) return null
      return {
        ...session,
        address: device.address,
        revokedAt: session.revokedAt ?? device.revokedAt,
      }
    },
  }
}
