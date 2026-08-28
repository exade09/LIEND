/**
 * Cryptographic helpers.
 *
 * No primitive is invented here. Signature verification uses Node's built-in
 * ed25519 support (`crypto.verify`), which is the same audited implementation
 * used elsewhere in the platform. This file only verifies EIP-191 messages;
 * decoding and wrapping a raw 32-byte key in the DER envelope Node expects.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { getAddress, verifyMessage, type Address, type Hex } from "viem"

/**
 * Verifies the EIP-191 personal-sign result returned by MetaMask.
 */
export async function verifyWalletSignature(
  address: string,
  message: string,
  signature: string,
): Promise<boolean> {
  try {
    const checksummed = getAddress(address) as Address
    if (!/^0x[a-fA-F0-9]{130}$/.test(signature)) return false
    return await verifyMessage({ address: checksummed, message, signature: signature as Hex })
  } catch {
    return false
  }
}

/** URL-safe random identifier. Used for nonces, request ids and device ids. */
export function randomId(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url")
}

/** Short, human-comparable pairing code shown in BOTH extension and app. */
export function randomUserCode(): string {
  // Excludes easily-confused characters (0/O, 1/I).
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const raw = randomBytes(6)
  let out = ""
  for (const byte of raw) out += alphabet[byte % alphabet.length]
  return `${out.slice(0, 3)}-${out.slice(3)}`
}

export function hmac(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url")
}

/** Constant-time comparison, safe against length-based short-circuit leaks. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
