import { demoMarkets } from "../data/demoMarkets";
import type {
  BuildSwapTransactionRequest,
  PreparedTransaction,
  SwapQuote,
  SwapQuoteRequest,
  SwapRoute,
} from "../types";

const DEMO_SOL_PRICE_USD = 150;
const DEMO_PRICE_IMPACT_PERCENT = 0.18;
const DEMO_NETWORK_FEE_SOL = 0.00002;

export interface SwapProvider {
  getSwapQuote: (request: SwapQuoteRequest) => Promise<SwapQuote>;
  getSwapRoutes: (request: SwapQuoteRequest) => Promise<SwapRoute[]>;
  buildSwapTransaction: (
    request: BuildSwapTransactionRequest,
  ) => Promise<PreparedTransaction>;
}

const demoTokenPrice = (mint: string, symbol: string): number | null => {
  if (symbol.toUpperCase() === "SOL" || mint.toUpperCase() === "SOL") {
    return DEMO_SOL_PRICE_USD;
  }

  return (
    demoMarkets.find(
      (market) =>
        market.mintAddress === mint ||
        market.ticker.toUpperCase() === symbol.toUpperCase(),
    )?.priceUsd ?? null
  );
};

const buildDemoRoutes = (request: SwapQuoteRequest): SwapRoute[] => {
  const inputPrice = demoTokenPrice(request.inputMint, request.inputSymbol);
  const outputPrice = demoTokenPrice(request.outputMint, request.outputSymbol);

  if (!inputPrice || !outputPrice || request.amount <= 0) {
    return [];
  }

  const grossOutput = (request.amount * inputPrice) / outputPrice;
  const estimatedOutput = grossOutput * (1 - DEMO_PRICE_IMPACT_PERCENT / 100);
  const provenance = {
    source: "demo" as const,
    isDemo: true,
    dataLabel: "Demo data" as const,
    updatedAt: null,
  };

  return [
    {
      id: "demo-direct-route",
      label: "Direct route",
      programs: ["LIEND Swap Adapter", "SPL Token Program"],
      estimatedOutput,
      priceImpactPercent: DEMO_PRICE_IMPACT_PERCENT,
      estimatedNetworkFeeSol: DEMO_NETWORK_FEE_SOL,
      steps: [
        {
          program: "LIEND Swap Adapter",
          instruction: "Request quote",
          description: "Use the demonstration direct route",
        },
        {
          program: "SPL Token Program",
          instruction: "Prepare token changes",
          description: "Preview input and output account changes",
        },
      ],
      ...provenance,
    },
    {
      id: "demo-split-route",
      label: "Split route",
      programs: ["LIEND Swap Adapter", "Demo Liquidity Route", "SPL Token Program"],
      estimatedOutput: estimatedOutput * 0.998,
      priceImpactPercent: DEMO_PRICE_IMPACT_PERCENT + 0.08,
      estimatedNetworkFeeSol: DEMO_NETWORK_FEE_SOL * 1.6,
      steps: [
        {
          program: "LIEND Swap Adapter",
          instruction: "Split route",
          description: "Preview a two-source liquidity path",
        },
        {
          program: "Demo Liquidity Route",
          instruction: "Aggregate output",
          description: "Combine demonstration route outputs",
        },
      ],
      ...provenance,
    },
  ];
};

export const demoSwapAdapter: SwapProvider = {
  async getSwapRoutes(request) {
    return buildDemoRoutes(request);
  },

  async getSwapQuote(request) {
    const routes = buildDemoRoutes(request);
    const bestRoute = routes[0];
    const slippageBps = request.slippageBps ?? 50;
    const estimatedOutput = bestRoute?.estimatedOutput ?? 0;

    return {
      quoteId: "demo-swap-quote",
      request: { ...request, slippageBps },
      estimatedOutput,
      minimumOutput: estimatedOutput * (1 - slippageBps / 10_000),
      priceImpactPercent: bestRoute?.priceImpactPercent ?? 0,
      estimatedNetworkFeeSol:
        bestRoute?.estimatedNetworkFeeSol ?? DEMO_NETWORK_FEE_SOL,
      routes,
      expiresAt: null,
      executable: false,
      notice: bestRoute
        ? "Estimated demo quote with no executable transaction"
        : "No demo swap route available for this pair",
      source: "demo",
      isDemo: true,
      dataLabel: "Demo data",
      updatedAt: null,
    };
  },

  async buildSwapTransaction(request) {
    const route = request.quote.routes.find(
      (candidate) => candidate.id === request.routeId,
    );

    return {
      kind: "swap",
      executable: false,
      serializedTransaction: null,
      instructions: route?.steps.map((step) => ({ ...step })) ?? [],
      requiresWalletApproval: true,
      notice: "Swap transaction building requires a production swap provider",
      source: "demo",
      isDemo: true,
      dataLabel: "Demo data",
      updatedAt: null,
    };
  },
};

export function getSwapQuote(
  request: SwapQuoteRequest,
  provider: SwapProvider = demoSwapAdapter,
): Promise<SwapQuote> {
  return provider.getSwapQuote(request);
}

export function getSwapRoutes(
  request: SwapQuoteRequest,
  provider: SwapProvider = demoSwapAdapter,
): Promise<SwapRoute[]> {
  return provider.getSwapRoutes(request);
}

export function buildSwapTransaction(
  request: BuildSwapTransactionRequest,
  provider: SwapProvider = demoSwapAdapter,
): Promise<PreparedTransaction> {
  return provider.buildSwapTransaction(request);
}
