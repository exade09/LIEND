import { describe, expect, it } from "vitest"
import { aggregateTokenAccounts, parseTokenAccounts } from "./solana-rpc"
import { clipLabel, pickDexPair } from "./token-markets"
import { applyRecordingFixture, formatTokenAmount, toWalletPositions, uiAmount } from "./wallet-positions"

const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
const WIF = "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm"

describe("parseTokenAccounts", () => {
  it("keeps parsed SPL accounts and drops empty or nft rows after aggregate", () => {
    const parsed = parseTokenAccounts({
      value: [
        {
          account: {
            data: {
              parsed: {
                info: {
                  mint: BONK,
                  tokenAmount: { amount: "1000000", decimals: 5, uiAmount: 10 },
                },
              },
            },
          },
        },
        {
          account: {
            data: {
              parsed: {
                info: {
                  mint: BONK,
                  tokenAmount: { amount: "500000", decimals: 5, uiAmount: 5 },
                },
              },
            },
          },
        },
        {
          account: {
            data: {
              parsed: {
                info: {
                  mint: WIF,
                  tokenAmount: { amount: "0", decimals: 6, uiAmount: 0 },
                },
              },
            },
          },
        },
        {
          account: {
            data: {
              parsed: {
                info: {
                  mint: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
                  tokenAmount: { amount: "1", decimals: 0, uiAmount: 1 },
                },
              },
            },
          },
        },
      ],
    })

    const aggregated = aggregateTokenAccounts(parsed)
    expect(aggregated).toEqual([{ mint: BONK, amountRaw: 1_500_000n, decimals: 5 }])
  })
})

describe("token amount formatting", () => {
  it("groups whole tokens and trims fractional zeros", () => {
    expect(formatTokenAmount(12_840_000_000_000n, 5)).toBe("128,400,000")
    expect(formatTokenAmount(420_500_000n, 6)).toBe("420.5")
    expect(uiAmount(1_500_000n, 5)).toBe(15)
  })
})

describe("market pair selection", () => {
  it("prefers the deepest pair where the mint is the base token", () => {
    const chosen = pickDexPair(
      [
        { baseToken: { address: BONK, symbol: "BONK" }, liquidity: { usd: 100 }, priceUsd: "1" },
        { baseToken: { address: BONK, symbol: "BONK" }, liquidity: { usd: 9_000 }, priceUsd: "0.00002" },
        { baseToken: { address: WIF, symbol: "WIF" }, liquidity: { usd: 50_000 }, priceUsd: "2" },
      ],
      BONK,
    )
    expect(chosen?.priceUsd).toBe("0.00002")
    expect(clipLabel("  dogwifhat  ", 8)).toBe("dogwifha")
  })
})

describe("toWalletPositions", () => {
  it("values a position from ui amount times price and skips unknown mints", () => {
    const response = toWalletPositions(
      "6F2Z77uzpB7oSx6pG1b8TRTVjQKDbDgPs35qrNr8BZxq",
      [
        { mint: BONK, amountRaw: 1_000_000n, decimals: 5 },
        { mint: "not-a-mint", amountRaw: 1n, decimals: 6 },
      ],
      new Map([[BONK, { symbol: "BONK", name: "Bonk", priceUsd: 0.00002 }]]),
      148,
      1,
    )

    expect(response.positions).toHaveLength(1)
    expect(response.positions[0]).toMatchObject({
      mint: BONK,
      symbol: "BONK",
      amount: "10",
      valueUsd: 0.0002,
    })
    expect(response.solUsd).toBe(148)
  })

  it("keeps a null valuation when no price exists", () => {
    const response = toWalletPositions(
      "6F2Z77uzpB7oSx6pG1b8TRTVjQKDbDgPs35qrNr8BZxq",
      [{ mint: WIF, amountRaw: 1_000_000n, decimals: 6 }],
      new Map([[WIF, { symbol: "WIF", name: "dogwifhat", priceUsd: null }]]),
      null,
    )
    expect(response.positions[0]?.valueUsd).toBeNull()
  })
})

describe("recording fixture", () => {
  it("seats PUMP at $110 only for the recording wallet", () => {
    const other = applyRecordingFixture({
      wallet: "6F2Z77uzpB7oSx6pG1b8TRTVjQKDbDgPs35qrNr8BZxq",
      asOf: 1,
      solUsd: 148,
      positions: [],
    })
    expect(other.positions).toEqual([])

    const seated = applyRecordingFixture({
      wallet: "Bpp1AphBxPNjXf3eB6cEVoXyythAPwuBNSVyfdgw9Ze9",
      asOf: 1,
      solUsd: 148,
      positions: [],
    })
    expect(seated.positions[0]).toMatchObject({
      mint: "pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn",
      symbol: "PUMP",
      valueUsd: 110,
    })
  })
})
