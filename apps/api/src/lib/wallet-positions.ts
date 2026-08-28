/** ERC-20 positions for the authenticated Robinhood Chain account. */

import { parseMint } from "@liend/config"
import type { WalletPositionsResponse } from "@liend/domain"
import { ApiFailure } from "./http"
import { readWalletTokenAccounts, type ParsedTokenAccount } from "./evm-rpc"
import { loadTokenMarkets } from "./token-markets"

const MAX_POSITIONS = 48

export function formatTokenAmount(amountRaw: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals)
  const whole = amountRaw / base
  const fraction = amountRaw % base
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  if (fraction === 0n) return grouped
  const frac = fraction.toString().padStart(decimals, "0").replace(/0+$/, "").slice(0, 6)
  return frac ? `${grouped}.${frac}` : grouped
}

export function uiAmount(amountRaw: bigint, decimals: number): number {
  const value = Number(amountRaw) / 10 ** decimals
  return Number.isFinite(value) ? value : 0
}

export function toWalletPositions(
  wallet: string,
  accounts: ParsedTokenAccount[],
  markets: Map<string, { symbol: string; name: string; priceUsd: number | null }>,
  ethUsd: number | null,
  asOf = Date.now(),
): WalletPositionsResponse {
  const positions = accounts
    .map((account) => {
      const contract = parseMint(account.mint)
      if (!contract) return null
      const market = markets.get(contract)
      const quantity = uiAmount(account.amountRaw, account.decimals)
      const priceUsd = market?.priceUsd ?? null
      const valueUsd = priceUsd === null ? null : Math.max(0, quantity * priceUsd)
      return {
        mint: contract,
        symbol: account.symbol ?? market?.symbol ?? `${contract.slice(0, 6)}…${contract.slice(-4)}`,
        name: account.name ?? market?.name ?? contract,
        decimals: account.decimals,
        amount: formatTokenAmount(account.amountRaw, account.decimals),
        amountRaw: account.amountRaw.toString(),
        valueUsd: valueUsd !== null && Number.isFinite(valueUsd) ? valueUsd : null,
        rank: valueUsd ?? quantity,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, MAX_POSITIONS)
    .map(({ rank: _rank, ...position }) => position)

  return { wallet, asOf, ethUsd, positions }
}

export async function readSessionPositions(wallet: string): Promise<WalletPositionsResponse> {
  try {
    const accounts = await readWalletTokenAccounts(wallet)
    const { markets, ethUsd } = await loadTokenMarkets(accounts.map((account) => account.mint))
    return toWalletPositions(wallet, accounts, markets, ethUsd)
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Robinhood Chain positions could not be read"
    throw new ApiFailure("adapter_unavailable", message)
  }
}
