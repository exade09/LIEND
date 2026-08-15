import { demoMarkets } from "../data/demoMarkets";
import type {
  DataEnvelope,
  Market,
  MarketQuery,
  TokenLiquidity,
} from "../types";

export interface MarketsProvider {
  getMigratedTokens: (query?: MarketQuery) => Promise<DataEnvelope<Market[]>>;
  getTokenMarketData: (
    identifier: string,
  ) => Promise<DataEnvelope<Market | null>>;
  getTokenLiquidity: (
    identifier: string,
  ) => Promise<DataEnvelope<TokenLiquidity | null>>;
}

const cloneMarket = (market: Market): Market => ({
  ...market,
  sparkline: [...market.sparkline],
});

const findDemoMarket = (identifier: string): Market | null => {
  const normalized = identifier.trim().toLowerCase();

  return (
    demoMarkets.find(
      (market) =>
        market.id.toLowerCase() === normalized ||
        market.ticker.toLowerCase() === normalized ||
        market.mintAddress.toLowerCase() === normalized,
    ) ?? null
  );
};

export const demoMarketsAdapter: MarketsProvider = {
  async getMigratedTokens(query = {}) {
    const search = query.search?.trim().toLowerCase() ?? "";
    const filter = query.filter ?? "All";

    const markets = demoMarkets.filter((market) => {
      const matchesSearch =
        !search ||
        market.name.toLowerCase().includes(search) ||
        market.ticker.toLowerCase().includes(search) ||
        market.mintAddress.toLowerCase().includes(search);
      const matchesFilter =
        filter === "All" ||
        (filter === "Eligible" && market.eligible) ||
        (filter === "Migrated" && market.migrationStatus === "Migrated") ||
        (filter === "Liquid" && market.liquid);

      return matchesSearch && matchesFilter;
    });

    return {
      data: markets.map(cloneMarket),
      source: "demo",
      isDemo: true,
      dataLabel: "Demo data",
      updatedAt: null,
      notice: "Static market fixtures for interface testing",
    };
  },

  async getTokenMarketData(identifier) {
    const market = findDemoMarket(identifier);

    return {
      data: market ? cloneMarket(market) : null,
      source: "demo",
      isDemo: true,
      dataLabel: "Demo data",
      updatedAt: null,
      notice: market
        ? "Static market fixture for interface testing"
        : "No matching demo market",
    };
  },

  async getTokenLiquidity(identifier) {
    const market = findDemoMarket(identifier);

    return {
      data: market
        ? {
            marketId: market.id,
            mintAddress: market.mintAddress,
            liquidityUsd: market.liquidityUsd,
            volume24hUsd: market.volume24hUsd,
            borrowableUsd: market.estimatedBorrowableUsd,
            routeAvailable: market.eligible && market.liquid,
            source: "demo",
            isDemo: true,
            dataLabel: "Demo data",
            updatedAt: null,
          }
        : null,
      source: "demo",
      isDemo: true,
      dataLabel: "Demo data",
      updatedAt: null,
      notice: market
        ? "Estimated demo liquidity only"
        : "No matching demo market",
    };
  },
};

export function getMigratedTokens(
  query: MarketQuery = {},
  provider: MarketsProvider = demoMarketsAdapter,
): Promise<DataEnvelope<Market[]>> {
  return provider.getMigratedTokens(query);
}

export function getTokenMarketData(
  identifier: string,
  provider: MarketsProvider = demoMarketsAdapter,
): Promise<DataEnvelope<Market | null>> {
  return provider.getTokenMarketData(identifier);
}

export function getTokenLiquidity(
  identifier: string,
  provider: MarketsProvider = demoMarketsAdapter,
): Promise<DataEnvelope<TokenLiquidity | null>> {
  return provider.getTokenLiquidity(identifier);
}
