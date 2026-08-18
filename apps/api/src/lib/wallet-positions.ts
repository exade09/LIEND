/**
 * Wallet token positions from chain.
 *
 * The session wallet is the only owner that may be queried. Clients cannot
 * pass an address; the API re-reads token accounts from Solana and attaches
 * public market metadata before returning them.
 */

import { parseMint } from "@liend/config"
import type { WalletPositionsResponse } from "@liend/domain"
import { ApiFailure } from "./http"
import { readWalletTokenAccounts, type ParsedTokenAccount } from "./solana-rpc"
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
  solUsd: number | null,
  asOf = Date.now(),
): WalletPositionsResponse {
  const ranked = accounts
    .map((account) => {
      const mint = parseMint(account.mint)
      if (!mint) return null
      const market = markets.get(mint)
      const quantity = uiAmount(account.amountRaw, account.decimals)
      const priceUsd = market?.priceUsd ?? null
      const rawValue = priceUsd === null ? null : quantity * priceUsd
      const valueUsd = rawValue === null || !Number.isFinite(rawValue) ? null : Math.max(0, rawValue)
      return {
        mint,
        symbol: market?.symbol ?? `${mint.slice(0, 4)}…${mint.slice(-4)}`,
        name: market?.name ?? mint,
        decimals: account.decimals,
        amount: formatTokenAmount(account.amountRaw, account.decimals),
        amountRaw: account.amountRaw.toString(),
        valueUsd,
        rank: valueUsd ?? quantity,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, MAX_POSITIONS)
    .map(({ rank: _rank, ...position }) => position)

  return { wallet, asOf, solUsd, positions: ranked }
}

export async function readSessionPositions(wallet: string): Promise<WalletPositionsResponse> {
  try {
    const accounts = await readWalletTokenAccounts(wallet)
    const { markets, solUsd } = await loadTokenMarkets(accounts.map((account) => account.mint))
    return toWalletPositions(wallet, accounts, markets, solUsd)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Wallet positions could not be read"
    throw new ApiFailure("adapter_unavailable", message)
  }
}
