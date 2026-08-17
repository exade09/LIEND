/**
 * Cryptographic helpers.
 *
 * No primitive is invented here. Signature verification uses Node's built-in
 * ed25519 support (`crypto.verify`), which is the same audited implementation
 * used elsewhere in the platform. This file only does encoding work: base58
 * decoding and wrapping a raw 32-byte key in the DER envelope Node expects.
 */

import { createHmac, createPublicKey, randomBytes, timingSafeEqual, verify } from "node:crypto"

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

/** Decodes a base58 string. Returns null on any invalid character. */
export function base58Decode(input: string): Uint8Array | null {
  if (!input) return null

  const bytes: number[] = [0]
  for (const char of input) {
    const value = BASE58_ALPHABET.indexOf(char)
    if (value === -1) return null

    let carry = value
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58
      bytes[i] = carry & 0xff
      carry >>= 8
    }
    while (carry > 0) {
      bytes.push(carry & 0xff)
      carry >>= 8
    }
  }

  // Leading '1's in base58 encode leading zero bytes.
  for (const char of input) {
    if (char !== "1") break
    bytes.push(0)
  }

  return Uint8Array.from(bytes.reverse())
}

/**
 * SPKI DER prefix for an Ed25519 public key (RFC 8410).
 * Followed by the raw 32-byte key it forms a structure `createPublicKey`
 * accepts, letting us use Node's verifier with a Solana address.
 */
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex")

/**
 * Verifies a detached Ed25519 signature over `message`.
 *
 * @param address base58 Solana address (the public key)
 * @param message exact bytes that were signed
 * @param signatureBase64 detached signature as returned by the wallet
 */
export function verifyWalletSignature(
  address: string,
  message: string,
  signatureBase64: string,
): boolean {
  const publicKeyBytes = base58Decode(address)
  if (!publicKeyBytes || publicKeyBytes.length !== 32) return false

  let signature: Buffer
  try {
    signature = Buffer.from(signatureBase64, "base64")
  } catch {
    return false
  }
  if (signature.length !== 64) return false

  try {
    const keyObject = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyBytes)]),
      format: "der",
      type: "spki",
    })
    // Ed25519 verification passes a null algorithm.
    return verify(null, Buffer.from(message, "utf8"), keyObject, signature)
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
