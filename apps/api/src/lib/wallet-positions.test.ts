import { describe, expect, it } from "vitest"
import { parseBlockscoutBalances } from "./evm-rpc"
import { clipLabel, pickDexPair } from "./token-markets"
import { formatTokenAmount, toWalletPositions, uiAmount } from "./wallet-positions"

const PONS = "0x39dBED3a2bd333467115dE45665cC57F813C4571"
const WETH = "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73"
const WALLET = "0x1111111111111111111111111111111111111111"

describe("parseBlockscoutBalances", () => {
  it("keeps positive ERC-20 balances and drops malformed rows", () => {
    const parsed = parseBlockscoutBalances([
      {
        value: "1500000000000000000",
        token: { address_hash: PONS, decimals: "18", symbol: "PONS", name: "Pons" },
      },
      { value: "0", token: { address_hash: WETH, decimals: "18" } },
      { value: "10", token: { address_hash: "not-an-address", decimals: "18" } },
    ])

    expect(parsed).toEqual([
      {
        mint: PONS,
        amountRaw: 1_500_000_000_000_000_000n,
        decimals: 18,
        symbol: "PONS",
        name: "Pons",
      },
    ])
  })

  it("accepts the wrapped Blockscout items shape", () => {
    expect(parseBlockscoutBalances({
      items: [{ value: "1", token: { address: WETH, decimals: 18 } }],
    })).toHaveLength(1)
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
        { baseToken: { address: PONS, symbol: "PONS" }, liquidity: { usd: 100 }, priceUsd: "1" },
        { baseToken: { address: PONS, symbol: "PONS" }, liquidity: { usd: 9_000 }, priceUsd: "0.02" },
        { baseToken: { address: WETH, symbol: "WETH" }, liquidity: { usd: 50_000 }, priceUsd: "4000" },
      ],
      PONS,
    )
    expect(chosen?.priceUsd).toBe("0.02")
    expect(clipLabel("  pons family  ", 8)).toBe("pons fam")
  })
})

describe("toWalletPositions", () => {
  it("values indexed ERC-20 positions and skips invalid contracts", () => {
    const response = toWalletPositions(
      WALLET,
      [
        { mint: PONS, amountRaw: 1_000_000n, decimals: 5, symbol: "PONS", name: "Pons" },
        { mint: "not-a-contract", amountRaw: 1n, decimals: 6 },
      ],
      new Map([[PONS, { symbol: "PONS", name: "Pons", priceUsd: 0.02 }]]),
      4_000,
      1,
    )

    expect(response.positions).toHaveLength(1)
    expect(response.positions[0]).toMatchObject({
      mint: PONS,
      symbol: "PONS",
      amount: "10",
      valueUsd: 0.2,
    })
    expect(response.ethUsd).toBe(4_000)
  })

  it("keeps a null valuation when no market price exists", () => {
    const response = toWalletPositions(
      WALLET,
      [{ mint: WETH, amountRaw: 1_000_000_000_000_000_000n, decimals: 18 }],
      new Map([[WETH, { symbol: "WETH", name: "Wrapped Ether", priceUsd: null }]]),
      null,
    )
    expect(response.positions[0]?.valueUsd).toBeNull()
  })
})
