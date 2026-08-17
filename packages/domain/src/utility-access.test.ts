import { describe, expect, it } from "vitest"
import { canUseUtility, deriveUtilityAccess, isResolving } from "./utility-access"

const WALLET = "6F2Z77uzpB7oSx6pG1b8TRTVjQKDbDgPs35qrNr8BZxq"
const MINT = "So11111111111111111111111111111111111111112"

describe("deriveUtilityAccess", () => {
  it("is disconnected with no wallet, regardless of other inputs", () => {
    const access = deriveUtilityAccess({ wallet: null, mint: MINT, required: 1n, balance: 999n })
    expect(access.state).toBe("disconnected")
  })

  it("reports token-not-launched when no mint is configured", () => {
    const access = deriveUtilityAccess({ wallet: WALLET, mint: null, required: null, balance: null })
    expect(access.state).toBe("token-not-launched")
  })

  it("stays pending when the balance is unknown", () => {
    const access = deriveUtilityAccess({ wallet: WALLET, mint: MINT, required: 10n, balance: null })
    expect(access.state).toBe("holder-check-pending")
    expect(isResolving(access)).toBe(true)
    // A pending check must never read as permission.
    expect(canUseUtility(access)).toBe(false)
  })

  it("withholds utility when the requirement is not published, even with a balance", () => {
    const access = deriveUtilityAccess({
      wallet: WALLET,
      mint: MINT,
      required: null,
      balance: 1_000_000n,
    })
    expect(access.state).toBe("not-eligible")
    expect(canUseUtility(access)).toBe(false)
  })

  it("is eligible only at or above the requirement", () => {
    const below = deriveUtilityAccess({ wallet: WALLET, mint: MINT, required: 100n, balance: 99n })
    const exact = deriveUtilityAccess({ wallet: WALLET, mint: MINT, required: 100n, balance: 100n })
    const above = deriveUtilityAccess({ wallet: WALLET, mint: MINT, required: 100n, balance: 101n })

    expect(below.state).toBe("not-eligible")
    expect(exact.state).toBe("eligible")
    expect(above.state).toBe("eligible")
  })

  it("handles balances beyond Number.MAX_SAFE_INTEGER without precision loss", () => {
    const required = 9_007_199_254_740_993n // 2^53 + 1
    const justBelow = deriveUtilityAccess({
      wallet: WALLET,
      mint: MINT,
      required,
      balance: required - 1n,
    })
    expect(justBelow.state).toBe("not-eligible")
    expect(deriveUtilityAccess({ wallet: WALLET, mint: MINT, required, balance: required }).state)
      .toBe("eligible")
  })

  it("treats a zero balance as not eligible rather than unknown", () => {
    const access = deriveUtilityAccess({ wallet: WALLET, mint: MINT, required: 1n, balance: 0n })
    expect(access.state).toBe("not-eligible")
  })

  it("only ever grants utility in the eligible state", () => {
    const states = [
      deriveUtilityAccess({ wallet: null, mint: null, required: null, balance: null }),
      deriveUtilityAccess({ wallet: WALLET, mint: null, required: null, balance: null }),
      deriveUtilityAccess({ wallet: WALLET, mint: MINT, required: 1n, balance: null }),
      deriveUtilityAccess({ wallet: WALLET, mint: MINT, required: 5n, balance: 1n }),
    ]
    expect(states.some(canUseUtility)).toBe(false)
  })
})
