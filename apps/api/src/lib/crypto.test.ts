import { describe, expect, it } from "vitest"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { randomUserCode, safeEqual, verifyWalletSignature } from "./crypto"

function makeWallet() {
  return privateKeyToAccount(generatePrivateKey())
}

describe("verifyWalletSignature", () => {
  it("accepts a genuine MetaMask-compatible signature", async () => {
    const account = makeWallet()
    const message = "LONS authentication\\nNetwork: Robinhood Chain (4663)"
    const signature = await account.signMessage({ message })
    await expect(verifyWalletSignature(account.address, message, signature)).resolves.toBe(true)
  })

  it("rejects a signature over a different message", async () => {
    const account = makeWallet()
    const signature = await account.signMessage({ message: "original" })
    await expect(verifyWalletSignature(account.address, "tampered", signature)).resolves.toBe(false)
  })

  it("rejects a signature from a different account", async () => {
    const alice = makeWallet()
    const bob = makeWallet()
    const message = "LONS authentication"
    const signature = await alice.signMessage({ message })
    await expect(verifyWalletSignature(bob.address, message, signature)).resolves.toBe(false)
  })

  it("rejects malformed input without throwing", async () => {
    await expect(verifyWalletSignature("not-an-address", "m", "0x00")).resolves.toBe(false)
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
