import { generateKeyPairSync, sign as nodeSign } from "node:crypto"
import { describe, expect, it } from "vitest"
import { base58Decode, randomUserCode, safeEqual, verifyWalletSignature } from "./crypto"

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

function base58Encode(bytes: Uint8Array): string {
  const digits = [0]
  for (const byte of bytes) {
    let carry = byte
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8
      digits[i] = carry % 58
      carry = (carry / 58) | 0
    }
    while (carry > 0) {
      digits.push(carry % 58)
      carry = (carry / 58) | 0
    }
  }
  let prefix = ""
  for (const byte of bytes) {
    if (byte === 0) prefix += "1"
    else break
  }
  return prefix + digits.reverse().map((d) => BASE58[d]).join("")
}

function makeWallet() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519")
  const raw = publicKey.export({ format: "der", type: "spki" }).subarray(12)
  return { address: base58Encode(new Uint8Array(raw)), privateKey }
}

describe("base58Decode", () => {
  it("round-trips arbitrary bytes", () => {
    const bytes = new Uint8Array([0, 0, 1, 2, 3, 250, 255])
    expect(Array.from(base58Decode(base58Encode(bytes))!)).toEqual(Array.from(bytes))
  })

  it("rejects characters outside the alphabet", () => {
    expect(base58Decode("0OIl")).toBeNull()
    expect(base58Decode("hello world")).toBeNull()
  })
})

describe("verifyWalletSignature", () => {
  it("accepts a genuine signature over the exact message", () => {
    const { address, privateKey } = makeWallet()
    const message = "STAYFI authentication\nNonce: abc"
    const signature = nodeSign(null, Buffer.from(message, "utf8"), privateKey).toString("base64")
    expect(verifyWalletSignature(address, message, signature)).toBe(true)
  })

  it("rejects a signature over a different message", () => {
    const { address, privateKey } = makeWallet()
    const signature = nodeSign(null, Buffer.from("original", "utf8"), privateKey).toString("base64")
    expect(verifyWalletSignature(address, "tampered", signature)).toBe(false)
  })

  it("rejects a signature from a different wallet", () => {
    const alice = makeWallet()
    const bob = makeWallet()
    const message = "STAYFI authentication"
    const signature = nodeSign(null, Buffer.from(message, "utf8"), alice.privateKey).toString("base64")
    expect(verifyWalletSignature(bob.address, message, signature)).toBe(false)
  })

  it("rejects malformed input without throwing", () => {
    const { address } = makeWallet()
    expect(verifyWalletSignature(address, "m", "not-base64!!")).toBe(false)
    expect(verifyWalletSignature("not-an-address", "m", "AAAA")).toBe(false)
    expect(verifyWalletSignature(address, "m", "")).toBe(false)
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
