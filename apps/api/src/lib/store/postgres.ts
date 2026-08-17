/**
 * Postgres implementation of LiendStore.
 *
 * Every statement is parameterized — there is no string interpolation of any
 * caller-supplied value anywhere in this file.
 *
 * The methods marked ATOMIC in the interface are implemented as single
 * conditional UPDATE ... RETURNING statements. That is what makes replay and
 * one-time-use guarantees hold under concurrency: two racing callers both
 * issue the UPDATE, Postgres serialises them, and only the first sees a row
 * returned. A read-then-write version of the same logic would be exploitable.
 */

import type { SqlClient } from "../db/client"
import type {
  AuthChallengeRecord,
  DeviceRecord,
  ExtensionSessionRecord,
  LiendStore,
  PairingRecord,
  PairingStatus,
  SessionRecord,
} from "./types"

const ms = (value: Date | string | null): number | null =>
  value === null ? null : new Date(value).getTime()

const at = (value: number) => new Date(value).toISOString()

export function createPostgresStore(sql: SqlClient): LiendStore {
  return {
    // --- auth challenges ---------------------------------------------------
    async createChallenge(record: AuthChallengeRecord) {
      await sql.query(
        `INSERT INTO auth_challenges (nonce, address, message, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [record.nonce, record.address, record.message, at(record.expiresAt)],
      )
    },

    async findChallenge(nonce) {
      const rows = await sql.query<{
        nonce: string
        address: string
        message: string
        expires_at: Date
        consumed_at: Date | null
      }>(
        `SELECT nonce, address, message, expires_at, consumed_at
         FROM auth_challenges WHERE nonce = $1`,
        [nonce],
      )
      const row = rows[0]
      if (!row) return null
      return {
        nonce: row.nonce,
        address: row.address,
        message: row.message,
        expiresAt: ms(row.expires_at)!,
        consumedAt: ms(row.consumed_at),
      }
    },

    async consumeChallenge(nonce, now) {
      // Single statement: only the first caller matches `consumed_at IS NULL`.
      const rows = await sql.query<{ nonce: string }>(
        `UPDATE auth_challenges
            SET consumed_at = $2
          WHERE nonce = $1
            AND consumed_at IS NULL
            AND expires_at > $2
        RETURNING nonce`,
        [nonce, at(now)],
      )
      return rows.length === 1
    },

    // --- app sessions ------------------------------------------------------
    async createSession(record: SessionRecord) {
      await sql.query(
        `INSERT INTO sessions (session_id, address, expires_at) VALUES ($1, $2, $3)`,
        [record.sessionId, record.address, at(record.expiresAt)],
      )
    },

    async findSession(sessionId) {
      const rows = await sql.query<{
        session_id: string
        address: string
        created_at: Date
        expires_at: Date
        revoked_at: Date | null
      }>(
        `SELECT session_id, address, created_at, expires_at, revoked_at
         FROM sessions WHERE session_id = $1`,
        [sessionId],
      )
      const row = rows[0]
      if (!row) return null
      return {
        sessionId: row.session_id,
        address: row.address,
        createdAt: ms(row.created_at)!,
        expiresAt: ms(row.expires_at)!,
        revokedAt: ms(row.revoked_at),
      }
    },

    async revokeSession(sessionId) {
      await sql.query(
        `UPDATE sessions SET revoked_at = now() WHERE session_id = $1 AND revoked_at IS NULL`,
        [sessionId],
      )
    },

    // --- pairing -----------------------------------------------------------
    async createPairing(record: PairingRecord) {
      await sql.query(
        `INSERT INTO pairing_requests (request_id, user_code, status, expires_at)
         VALUES ($1, $2, 'pending', $3)`,
        [record.requestId, record.userCode, at(record.expiresAt)],
      )
    },

    async findPairing(requestId) {
      const rows = await sql.query<{
        request_id: string
        user_code: string
        status: PairingStatus
        approved_by: string | null
        created_at: Date
        expires_at: Date
        consumed_at: Date | null
        device_id: string | null
      }>(
        `SELECT request_id, user_code, status, approved_by, created_at,
                expires_at, consumed_at, device_id
         FROM pairing_requests WHERE request_id = $1`,
        [requestId],
      )
      const row = rows[0]
      if (!row) return null
      return {
        requestId: row.request_id,
        userCode: row.user_code,
        status: row.status,
        approvedBy: row.approved_by,
        createdAt: ms(row.created_at)!,
        expiresAt: ms(row.expires_at)!,
        consumedAt: ms(row.consumed_at),
        deviceId: row.device_id,
      }
    },

    async approvePairing(requestId, address, now) {
      const rows = await sql.query<{ request_id: string }>(
        `UPDATE pairing_requests
            SET status = 'approved', approved_by = $2, approved_at = $3
          WHERE request_id = $1
            AND status = 'pending'
            AND expires_at > $3
        RETURNING request_id`,
        [requestId, address, at(now)],
      )
      return rows.length === 1
    },

    async rejectPairing(requestId, now) {
      const rows = await sql.query<{ request_id: string }>(
        `UPDATE pairing_requests
            SET status = 'rejected'
          WHERE request_id = $1
            AND status = 'pending'
            AND expires_at > $2
        RETURNING request_id`,
        [requestId, at(now)],
      )
      return rows.length === 1
    },

    async consumePairingAndCreateDevice({ requestId, now, device, credentialHash }) {
      // Consume first. If this returns no row the request was already
      // exchanged, rejected or expired, and no device is created.
      const consumed = await sql.query<{ approved_by: string }>(
        `UPDATE pairing_requests
            SET status = 'consumed', consumed_at = $2, device_id = $3
          WHERE request_id = $1
            AND status = 'approved'
            AND expires_at > $2
        RETURNING approved_by`,
        [requestId, at(now), device.deviceId],
      )
      if (consumed.length !== 1) return { ok: false, address: null }

      const address = consumed[0].approved_by
      await sql.query(
        `INSERT INTO devices (device_id, address, label, extension_version, credential_hash)
         VALUES ($1, $2, $3, $4, $5)`,
        [device.deviceId, address, device.label, device.extensionVersion, credentialHash],
      )
      return { ok: true, address }
    },

    // --- devices -----------------------------------------------------------
    async listDevices(address) {
      const rows = await sql.query<{
        device_id: string
        address: string
        label: string
        extension_version: string | null
        created_at: Date
        last_seen_at: Date | null
        revoked_at: Date | null
      }>(
        `SELECT device_id, address, label, extension_version, created_at,
                last_seen_at, revoked_at
         FROM devices WHERE address = $1 ORDER BY created_at DESC`,
        [address],
      )
      return rows.map((row) => ({
        deviceId: row.device_id,
        address: row.address,
        label: row.label,
        extensionVersion: row.extension_version,
        createdAt: ms(row.created_at)!,
        lastSeenAt: ms(row.last_seen_at),
        revokedAt: ms(row.revoked_at),
      }))
    },

    async findDeviceByCredential(credentialHash) {
      const rows = await sql.query<{
        device_id: string
        address: string
        label: string
        extension_version: string | null
        created_at: Date
        last_seen_at: Date | null
        revoked_at: Date | null
      }>(
        `SELECT device_id, address, label, extension_version, created_at,
                last_seen_at, revoked_at
         FROM devices WHERE credential_hash = $1`,
        [credentialHash],
      )
      const row = rows[0]
      if (!row) return null
      return {
        deviceId: row.device_id,
        address: row.address,
        label: row.label,
        extensionVersion: row.extension_version,
        createdAt: ms(row.created_at)!,
        lastSeenAt: ms(row.last_seen_at),
        revokedAt: ms(row.revoked_at),
      }
    },

    async touchDevice(deviceId, now) {
      await sql.query(`UPDATE devices SET last_seen_at = $2 WHERE device_id = $1`, [
        deviceId,
        at(now),
      ])
    },

    async revokeDevice(address, deviceId, now) {
      // Ownership is part of the WHERE clause, so a user can never revoke
      // another wallet's device even with a valid session.
      const rows = await sql.query<{ device_id: string }>(
        `UPDATE devices
            SET revoked_at = $3
          WHERE device_id = $1
            AND address = $2
            AND revoked_at IS NULL
        RETURNING device_id`,
        [deviceId, address, at(now)],
      )
      if (rows.length !== 1) return false

      // Cascade: every extension session derived from this device dies now.
      await sql.query(
        `UPDATE extension_sessions
            SET revoked_at = $2
          WHERE device_id = $1 AND revoked_at IS NULL`,
        [deviceId, at(now)],
      )
      return true
    },

    // --- extension sessions ------------------------------------------------
    async createExtensionSession(record) {
      await sql.query(
        `INSERT INTO extension_sessions (token_hash, device_id, expires_at)
         VALUES ($1, $2, $3)`,
        [record.tokenHash, record.deviceId, at(record.expiresAt)],
      )
    },

    async findExtensionSession(tokenHash): Promise<ExtensionSessionRecord | null> {
      // Joined so a revoked device invalidates its sessions even if the
      // cascade above was interrupted — defence in depth.
      const rows = await sql.query<{
        token_hash: string
        device_id: string
        address: string
        expires_at: Date
        revoked_at: Date | null
        device_revoked_at: Date | null
      }>(
        `SELECT s.token_hash, s.device_id, d.address, s.expires_at, s.revoked_at,
                d.revoked_at AS device_revoked_at
         FROM extension_sessions s
         JOIN devices d ON d.device_id = s.device_id
         WHERE s.token_hash = $1`,
        [tokenHash],
      )
      const row = rows[0]
      if (!row) return null
      return {
        tokenHash: row.token_hash,
        deviceId: row.device_id,
        address: row.address,
        expiresAt: ms(row.expires_at)!,
        revokedAt: ms(row.revoked_at) ?? ms(row.device_revoked_at),
      }
    },
  }
}
