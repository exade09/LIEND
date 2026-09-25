import { describe, expect, it } from "vitest"
import { generateKeyPairSync, sign } from "node:crypto"
import { base58Decode, randomUserCode, safeEqual, verifyWalletSignature } from "./crypto"

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

function base58Encode(raw: Buffer): string {
  let number = 0n
  for (const byte of raw) number = number * 256n + BigInt(byte)
  let out = ""
  while (number > 0n) {
    out = BASE58[Number(number % 58n)] + out
    number /= 58n
  }
  let leading = 0
  while (leading < raw.length && raw[leading] === 0) leading += 1
  return "1".repeat(leading) + out
}

/**
 * A real ed25519 keypair, presented the way a Solana wallet presents one: the
 * address IS the 32-byte public key in base58, and the signature is 64 bytes
 * in base58. Nothing here is a stand-in.
 */
function makeWallet() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519")
  const raw = publicKey.export({ format: "der", type: "spki" }).subarray(12)
  return {
    address: base58Encode(Buffer.from(raw)),
    signMessage(message: string) {
      return base58Encode(sign(null, Buffer.from(message, "utf8"), privateKey))
    },
  }
}

describe("verifyWalletSignature", () => {
  it("accepts a genuine wallet signature", async () => {
    const wallet = makeWallet()
    const message = "LONS authentication" + String.fromCharCode(10) + "Network: Solana (mainnet-beta)"
    await expect(verifyWalletSignature(wallet.address, message, wallet.signMessage(message))).resolves.toBe(true)
  })

  it("accepts the same signature encoded base64", async () => {
    const wallet = makeWallet()
    const message = "LONS authentication"
    const base64 = Buffer.from(base58Decode(wallet.signMessage(message))!).toString("base64")
    await expect(verifyWalletSignature(wallet.address, message, base64)).resolves.toBe(true)
  })

  it("rejects a signature over a different message", async () => {
    const wallet = makeWallet()
    const signature = wallet.signMessage("original")
    await expect(verifyWalletSignature(wallet.address, "tampered", signature)).resolves.toBe(false)
  })

  it("rejects a signature from a different account", async () => {
    const alice = makeWallet()
    const bob = makeWallet()
    const message = "LONS authentication"
    await expect(verifyWalletSignature(bob.address, message, alice.signMessage(message))).resolves.toBe(false)
  })

  it("rejects malformed input without throwing", async () => {
    await expect(verifyWalletSignature("not-an-address", "m", "00")).resolves.toBe(false)
    await expect(verifyWalletSignature("1111111111111111111111111111111", "m", "11")).resolves.toBe(false)
  })
})

describe("base58Decode", () => {
  it("keeps leading zero bytes, which leading ones encode", () => {
    expect(Array.from(base58Decode("11")!)).toEqual([0, 0])
  })

  it("refuses characters outside the alphabet", () => {
    expect(base58Decode("0OIl")).toBeNull()
  })
})

describe("safeEqual", () => {
  it("compares without leaking on length mismatch", () => {
    expect(safeEqual("abc", "abc")).toBe(true)
    expect(safeEqual("abc", "abd")).toBe(false)
    expect(safeEqual("abc", "abcd")).toBe(false)
  })
})

describe("randomUserCode", () => {
  it("avoids visually ambiguous characters", () => {
    for (let i = 0; i < 50; i++) {
      expect(randomUserCode()).toMatch(/^[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}$/)
    }
  })
})
