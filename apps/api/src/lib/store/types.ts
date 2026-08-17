/**
 * Persistence boundary for the LIEND API.
 *
 * Business logic depends on this interface, never on SQL directly, so the
 * Postgres adapter can be swapped or supplemented without touching handlers.
 *
 * Several methods are specified as ATOMIC. Those are the security-critical
 * ones — replay and one-time-use guarantees depend on the state transition
 * happening in a single statement, not a read followed by a write.
 */

export type AuthChallengeRecord = {
  nonce: string
  address: string
  message: string
  expiresAt: number
  consumedAt: number | null
}

export type SessionRecord = {
  sessionId: string
  address: string
  createdAt: number
  expiresAt: number
  revokedAt: number | null
}

export type PairingStatus = "pending" | "approved" | "rejected" | "expired" | "consumed"

export type PairingRecord = {
  requestId: string
  userCode: string
  approvedBy: string | null
  status: PairingStatus
  createdAt: number
  expiresAt: number
  consumedAt: number | null
  deviceId: string | null
}

export type DeviceRecord = {
  deviceId: string
  address: string
  label: string
  extensionVersion: string | null
  createdAt: number
  lastSeenAt: number | null
  revokedAt: number | null
}

export type ExtensionSessionRecord = {
  tokenHash: string
  deviceId: string
  address: string
  expiresAt: number
  revokedAt: number | null
}

export interface LiendStore {
  // --- auth challenges -----------------------------------------------------
  createChallenge(record: AuthChallengeRecord): Promise<void>
  findChallenge(nonce: string): Promise<AuthChallengeRecord | null>
  /**
   * ATOMIC. Marks a challenge consumed and returns true only for the first
   * caller. Must return false if already consumed or expired. This is the
   * replay defence for wallet authentication.
   */
  consumeChallenge(nonce: string, now: number): Promise<boolean>

  // --- app sessions --------------------------------------------------------
  createSession(record: SessionRecord): Promise<void>
  findSession(sessionId: string): Promise<SessionRecord | null>
  revokeSession(sessionId: string): Promise<void>

  // --- pairing -------------------------------------------------------------
  createPairing(record: PairingRecord): Promise<void>
  findPairing(requestId: string): Promise<PairingRecord | null>
  /** ATOMIC. pending -> approved, binding the approving wallet. */
  approvePairing(requestId: string, address: string, now: number): Promise<boolean>
  /** ATOMIC. pending -> rejected. */
  rejectPairing(requestId: string, now: number): Promise<boolean>
  /**
   * ATOMIC. approved -> consumed, exactly once, and issues the device in the
   * same transaction so a partial exchange cannot leave an approved request
   * without a device (or vice versa).
   */
  consumePairingAndCreateDevice(input: {
    requestId: string
    now: number
    device: DeviceRecord
    credentialHash: string
  }): Promise<{ ok: boolean; address: string | null }>

  // --- devices -------------------------------------------------------------
  listDevices(address: string): Promise<DeviceRecord[]>
  findDeviceByCredential(credentialHash: string): Promise<DeviceRecord | null>
  touchDevice(deviceId: string, now: number): Promise<void>
  /**
   * ATOMIC. Revokes a device the caller owns and invalidates every extension
   * session derived from it. Returns false for an unknown or foreign device.
   */
  revokeDevice(address: string, deviceId: string, now: number): Promise<boolean>

  // --- extension sessions --------------------------------------------------
  createExtensionSession(record: Omit<ExtensionSessionRecord, "address">): Promise<void>
  findExtensionSession(tokenHash: string): Promise<ExtensionSessionRecord | null>
}
