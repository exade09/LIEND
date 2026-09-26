import { describe, expect, it } from "vitest"
import { present, readTrade, selectTrades } from "./liveActivity"

/**
 * The tape reads a swap from the fee payer's side, and the tests that matter
 * are the ones about which side that is. An earlier version picked the largest
 * balance movement in the transaction, which on a buy is the pool - it gives
 * up slightly more than the buyer receives, because a fee is taken on the way
 * through - so every buy was published as a sell.
 */

const WSOL = "So11111111111111111111111111111111111111112"
const TRADER = "2aj9fCAeVRJ5jzPZGQeY6NGyiBQYnnWuk5EgUAn8kZ7p"
const POOL = "Hr2VRFgWPuqc2TW7BbHbfHKND7noewjHQbp7Bg78G4Wy"
const MINT = "Hu9t2twQovzs4TsKMrBBEMvzi7JJUr2ebTwwyQNPpump"
const SIGNATURE = "R2cK2XtnVY1scm3hSa1tuR6brVWY57B2JKtcSvxi3Kc6NdgTLnvg6SgSzgtH2tfRCJ2QFbxZpjX7g8kUXKWRNrg"

function swap(transfers: Array<Record<string, unknown>>, extra: Record<string, unknown> = {}) {
  return {
    type: "SWAP",
    source: "PUMP_AMM",
    signature: SIGNATURE,
    timestamp: 1_790_448_806,
    feePayer: TRADER,
    tokenTransfers: transfers,
    nativeTransfers: [],
    ...extra,
  }
}

describe("readTrade", () => {
  it("reads a buy: SOL leaves the wallet and tokens arrive", () => {
    const trade = readTrade(swap([
      { mint: WSOL, tokenAmount: 0.75, fromUserAccount: TRADER, toUserAccount: POOL },
      { mint: MINT, tokenAmount: 1_000, fromUserAccount: POOL, toUserAccount: TRADER },
    ]))

    expect(trade).toMatchObject({ wallet: TRADER, mint: MINT, tokenDelta: 1_000, solDelta: -0.75 })
    expect(present(trade!, "LONS").kind).toBe("repay")
  })

  it("reads a sell: tokens leave the wallet and SOL arrives", () => {
    const trade = readTrade(swap([
      { mint: MINT, tokenAmount: 1_000, fromUserAccount: TRADER, toUserAccount: POOL },
      { mint: WSOL, tokenAmount: 0.75, fromUserAccount: POOL, toUserAccount: TRADER },
    ]))

    expect(trade).toMatchObject({ tokenDelta: -1_000, solDelta: 0.75 })
    expect(present(trade!, "LONS").kind).toBe("borrow")
  })

  it("is not fooled by the pool giving up more than the buyer receives", () => {
    // The pool's leg is larger, and belongs to the pool. Reading it as the
    // trade is what turned every buy into a sell.
    const trade = readTrade(swap([
      { mint: WSOL, tokenAmount: 0.75, fromUserAccount: TRADER, toUserAccount: POOL },
      { mint: MINT, tokenAmount: 1_004, fromUserAccount: POOL, toUserAccount: "FeeVaU1t1111111111111111111111111111111111" },
      { mint: MINT, tokenAmount: 1_000, fromUserAccount: POOL, toUserAccount: TRADER },
    ]))

    expect(trade?.tokenDelta).toBe(1_000)
    expect(present(trade!, "LONS").kind).toBe("repay")
  })

  it("counts a native SOL leg as well as a wrapped one", () => {
    const trade = readTrade(swap(
      [{ mint: MINT, tokenAmount: 500, fromUserAccount: POOL, toUserAccount: TRADER }],
      { nativeTransfers: [{ amount: 1_500_000_000, fromUserAccount: TRADER, toUserAccount: POOL }] },
    ))

    expect(trade?.solDelta).toBe(-1.5)
  })

  it("refuses anything that is not a completed swap", () => {
    expect(readTrade(swap([], { type: "TRANSFER" }))).toBeNull()
    expect(readTrade(swap([
      { mint: WSOL, tokenAmount: 0.75, fromUserAccount: TRADER, toUserAccount: POOL },
      { mint: MINT, tokenAmount: 1_000, fromUserAccount: POOL, toUserAccount: TRADER },
    ], { transactionError: { InstructionError: [3, "Custom"] } }))).toBeNull()
  })

  it("refuses a transaction where both legs point the same way", () => {
    // Tokens and SOL both arriving is a claim or an airdrop, not a trade.
    expect(readTrade(swap([
      { mint: WSOL, tokenAmount: 0.75, fromUserAccount: POOL, toUserAccount: TRADER },
      { mint: MINT, tokenAmount: 1_000, fromUserAccount: POOL, toUserAccount: TRADER },
    ]))).toBeNull()
  })

  it("ignores transfers between other people entirely", () => {
    expect(readTrade(swap([
      { mint: MINT, tokenAmount: 9_999, fromUserAccount: POOL, toUserAccount: "8LngKmpHTFRQ3G3BhqzNaAhsyNqPHYr3yfbHbWuuA5Ez" },
    ]))).toBeNull()
  })
})

describe("selectTrades", () => {
  const sized = (sol: number) => swap([
    { mint: WSOL, tokenAmount: sol, fromUserAccount: TRADER, toUserAccount: POOL },
    { mint: MINT, tokenAmount: 1_000, fromUserAccount: POOL, toUserAccount: TRADER },
  ])

  it("keeps only the 0.1 to 3 SOL band, inclusive at both ends", () => {
    const kept = selectTrades([sized(0.05), sized(0.1), sized(1.4), sized(3), sized(3.01), sized(120)])
    expect(kept.map((trade) => Math.abs(trade.solDelta))).toEqual([0.1, 1.4, 3])
  })
})
