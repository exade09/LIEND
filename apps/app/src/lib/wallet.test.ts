import { afterEach, describe, expect, it } from "vitest"
import { generateKeyPairSync, sign, verify } from "node:crypto"
import { base58Encode, discoverWallets, signWithSessionWallet } from "./wallet"

/**
 * Wallet discovery and signing, against stubs shaped like the real providers.
 *
 * Each supported wallet injects itself somewhere slightly different - Phantom
 * and OKX behind a namespace, Solflare and Backpack on the bare window - and
 * the only way to be sure the discovery reads all four is to present them the
 * way they present themselves.
 */

const DER_PREFIX = Buffer.from("302a300506032b6570032100", "hex")

function keypair() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519")
  const spki = publicKey.export({ type: "spki", format: "der" })
  return { raw: Buffer.from(spki.subarray(spki.length - 32)), privateKey }
}

function provider(flags: Record<string, boolean>, key: ReturnType<typeof keypair>) {
  const address = base58Encode(key.raw)
  return {
    ...flags,
    publicKey: { toString: () => address },
    connect: async () => ({ publicKey: { toString: () => address } }),
    signMessage: async (message: Uint8Array) => ({
      signature: new Uint8Array(sign(null, Buffer.from(message), key.privateKey)),
    }),
    address,
  }
}

afterEach(() => {
  for (const key of ["phantom", "solana", "solflare", "backpack", "okxwallet", "magicEden"]) {
    delete (globalThis as Record<string, unknown>)[key]
    delete (globalThis.window as unknown as Record<string, unknown>)?.[key]
  }
})

function stubWindow(shape: Record<string, unknown>) {
  const win = { ...shape } as unknown as Window
  Object.assign(globalThis, { window: win })
  return win
}

describe("discoverWallets", () => {
  it("finds each supported wallet where it actually injects itself", () => {
    const phantom = provider({ isPhantom: true }, keypair())
    const solflare = provider({ isSolflare: true }, keypair())
    const backpack = provider({ isBackpack: true }, keypair())
    const okx = provider({ isOkxWallet: true }, keypair())

    stubWindow({
      phantom: { solana: phantom },
      solflare,
      backpack,
      okxwallet: { solana: okx },
    })

    expect(discoverWallets().map((wallet) => wallet.name)).toEqual([
      "Phantom",
      "Solflare",
      "Backpack",
      "OKX Wallet",
    ])
  })

  it("ignores a wallet that is not installed, and one that cannot connect", () => {
    stubWindow({ solflare: { isSolflare: true }, backpack: provider({ isBackpack: true }, keypair()) })
    expect(discoverWallets().map((wallet) => wallet.name)).toEqual(["Backpack"])
  })

  it("does not mistake one wallet claiming window.solana for another", () => {
    // Whichever wallet wins the race for window.solana sets its own flag. A
    // Phantom button that actually opened OKX would be worse than no button.
    stubWindow({ solana: provider({ isOkxWallet: true }, keypair()) })
    expect(discoverWallets().map((wallet) => wallet.name)).toEqual(["OKX Wallet"])
  })
})

describe("signing", () => {
  it("returns a base58 signature the ed25519 public key verifies", async () => {
    const key = keypair()
    const okx = provider({ isOkxWallet: true }, key)
    stubWindow({ okxwallet: { solana: okx } })

    const message = "LONS authentication\n\nNonce: test"
    const signature = await signWithSessionWallet(okx.address, message)

    // Exactly what the API does: base58 in, DER-wrapped raw key, ed25519 out.
    const decoded = base58Decode(signature)
    expect(decoded).toHaveLength(64)
    const spki = Buffer.concat([DER_PREFIX, key.raw])
    const publicKey = { key: spki, format: "der" as const, type: "spki" as const }
    expect(verify(null, Buffer.from(message, "utf8"), publicKey, decoded)).toBe(true)
  })

  it("refuses to sign with a wallet that is not the session wallet", async () => {
    stubWindow({ solflare: provider({ isSolflare: true }, keypair()) })
    await expect(signWithSessionWallet("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P", "x"))
      .rejects.toThrow(/same wallet/)
  })
})

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

function base58Decode(value: string): Buffer {
  let carry = 0n
  for (const character of value) {
    const index = ALPHABET.indexOf(character)
    if (index < 0) throw new Error("not base58")
    carry = carry * 58n + BigInt(index)
  }
  const bytes: number[] = []
  while (carry > 0n) {
    bytes.unshift(Number(carry & 0xffn))
    carry >>= 8n
  }
  for (const character of value) {
    if (character !== "1") break
    bytes.unshift(0)
  }
  return Buffer.from(bytes)
}
