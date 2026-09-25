/**
 * Cryptographic helpers.
 *
 * No primitive is invented here. Signature verification uses Node's built-in
 * ed25519 support (`crypto.verify`), which is the same audited implementation
 * used everywhere else. This file only decodes the address and wraps the raw
 * 32-byte key in the DER envelope Node expects.
 *
 * On Solana a wallet address IS an ed25519 public key, which makes this
 * simpler than the EVM equivalent: there is no recovery step and no address
 * derivation to check afterwards. The key is the address, so verifying the
 * signature against it is the whole proof.
 */

import { createHmac, createPublicKey, randomBytes, timingSafeEqual, verify } from "node:crypto"

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

/** Base58 decode. Leading ones are leading zero bytes, which is the part a
 *  naive implementation drops and the reason some valid keys would be
 *  rejected without it. */
export function base58Decode(value: string): Uint8Array | null {
  if (!value || /[^1-9A-HJ-NP-Za-km-z]/.test(value)) return null
  let number = 0n
  for (const char of value) {
    const index = BASE58.indexOf(char)
    if (index < 0) return null
    number = number * 58n + BigInt(index)
  }
  const digits: number[] = []
  while (number > 0n) {
    digits.unshift(Number(number % 256n))
    number /= 256n
  }
  let leading = 0
  while (leading < value.length && value[leading] === "1") leading += 1
  return Uint8Array.from([...new Array<number>(leading).fill(0), ...digits])
}

/**
 * The DER prefix for an Ed25519 SubjectPublicKeyInfo. Node will not take a
 * bare 32-byte key, and this is the twelve bytes that turn one into a key
 * object: sequence, algorithm identifier 1.3.101.112, bit string.
 */
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex")

function publicKeyFromAddress(address: string) {
  const raw = base58Decode(address.trim())
  if (!raw || raw.length !== 32) return null
  return createPublicKey({
    key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(raw)]),
    format: "der",
    type: "spki",
  })
}

/** Wallets hand the signature back base58 or base64 depending on the adapter. */
function decodeSignature(signature: string): Buffer | null {
  const trimmed = signature.trim()
  const asBase58 = base58Decode(trimmed)
  if (asBase58 && asBase58.length === 64) return Buffer.from(asBase58)
  try {
    const asBase64 = Buffer.from(trimmed, "base64")
    if (asBase64.length === 64) return asBase64
  } catch {
    return null
  }
  return null
}

/**
 * Verifies the ed25519 signature a Solana wallet returns from signMessage.
 *
 * Returns a promise so every caller keeps the shape it already had; the
 * verification itself is synchronous.
 */
export async function verifyWalletSignature(
  address: string,
  message: string,
  signature: string,
): Promise<boolean> {
  try {
    const key = publicKeyFromAddress(address)
    const bytes = decodeSignature(signature)
    if (!key || !bytes) return false
    return verify(null, Buffer.from(message, "utf8"), key, bytes)
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
