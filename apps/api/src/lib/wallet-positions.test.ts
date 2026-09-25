import { describe, expect, it } from "vitest"
import { parseTokenAccounts } from "./solana-rpc"
import { clipLabel, pickDexPair } from "./token-markets"
import { formatTokenAmount, qaWalletPositions, toWalletPositions, uiAmount } from "./wallet-positions"

const LONS = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
const WSOL = "So11111111111111111111111111111111111111112"
const WALLET = "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1"
const QA_WALLET = "28QNhhh6F7phFNWDtnuRgZKRQes3zYteSeFhdbzCJCEK"

describe("parseTokenAccounts", () => {
  const account = (mint: string, amount: string, decimals: number) => ({
    account: { data: { parsed: { info: { mint, tokenAmount: { amount, decimals } } } } },
  })

  it("keeps positive balances and drops malformed rows", () => {
    const parsed = parseTokenAccounts({
      value: [
        account(LONS, "1500000000", 9),
        account(WSOL, "0", 9),
        account("not-an-address", "10", 9),
      ],
    })

    expect(parsed).toEqual([{ mint: LONS, amountRaw: 1_500_000_000n, decimals: 9 }])
  })

  it("sums one mint held across several token accounts", () => {
    const parsed = parseTokenAccounts({
      value: [account(LONS, "400", 6), account(LONS, "600", 6)],
    })

    expect(parsed).toEqual([{ mint: LONS, amountRaw: 1_000n, decimals: 6 }])
  })

  it("returns nothing for an empty or absent value", () => {
    expect(parseTokenAccounts({ value: [] })).toEqual([])
    expect(parseTokenAccounts(null)).toEqual([])
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
  it("prefers the deepest pair where the contract is the base token", () => {
    const chosen = pickDexPair(
      [
        { baseToken: { address: LONS, symbol: "LONS" }, liquidity: { usd: 100 }, priceUsd: "1" },
        { baseToken: { address: LONS, symbol: "LONS" }, liquidity: { usd: 9_000 }, priceUsd: "0.02" },
        { baseToken: { address: WSOL, symbol: "WSOL" }, liquidity: { usd: 50_000 }, priceUsd: "4000" },
      ],
      LONS,
    )
    expect(chosen?.priceUsd).toBe("0.02")
    expect(clipLabel("  Lons family  ", 8)).toBe("Lons fam")
  })
})

describe("toWalletPositions", () => {
  it("values indexed SPL positions and skips invalid contracts", () => {
    const response = toWalletPositions(
      WALLET,
      [
        { mint: LONS, amountRaw: 1_000_000n, decimals: 5, symbol: "LONS", name: "Lons" },
        { mint: "not-a-contract", amountRaw: 1n, decimals: 6 },
      ],
      new Map([[LONS, { symbol: "LONS", name: "Lons", priceUsd: 0.02 }]]),
      4_000,
      1,
    )

    expect(response.positions).toHaveLength(1)
    expect(response.positions[0]).toMatchObject({
      mint: LONS,
      symbol: "LONS",
      amount: "10",
      valueUsd: 0.2,
    })
    expect(response.solUsd).toBe(4_000)
  })

  it("keeps a null valuation when no market price exists", () => {
    const response = toWalletPositions(
      WALLET,
      [{ mint: WSOL, amountRaw: 1_000_000_000_000_000_000n, decimals: 18 }],
      new Map([[WSOL, { symbol: "WSOL", name: "Wrapped Ether", priceUsd: null }]]),
      null,
    )
    expect(response.positions[0]?.valueUsd).toBeNull()
  })
})

describe("QA wallet position", () => {
  it("provides exactly $10 of LONS for the allowlisted walkthrough wallet", () => {
    expect(qaWalletPositions(QA_WALLET, 123)).toEqual({
      wallet: QA_WALLET,
      asOf: 123,
      solUsd: 200,
      positions: [
        {
          mint: LONS,
          symbol: "LONS",
          name: "Lons",
          decimals: 9,
          amount: "500",
          amountRaw: "500000000000",
          valueUsd: 10,
        },
      ],
    })
  })

  it("does not inject a position for any other wallet", () => {
    expect(qaWalletPositions(WALLET, 123)).toBeNull()
  })
})
