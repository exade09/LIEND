import { demoMarkets } from "../data/demoMarkets";
import { getHealthState } from "../lib/calculations";
import type {
  BorrowQuote,
  BorrowQuoteRequest,
  BuildBorrowTransactionRequest,
  PreparedTransaction,
  RouteInstruction,
} from "../types";

const DEMO_SOL_PRICE_USD = 150;
const DEMO_PROTOCOL_FEE_RATE = 0.003;
const DEMO_NETWORK_COST_SOL = 0.00002;

export interface BorrowingProvider {
  getBorrowQuote: (request: BorrowQuoteRequest) => Promise<BorrowQuote>;
  buildBorrowTransaction: (
    request: BuildBorrowTransactionRequest,
  ) => Promise<PreparedTransaction>;
}

const demoRoute = (ticker: string): RouteInstruction[] => [
  {
    program: "SPL Token Program",
    instruction: "Verify token account",
    description: `Read the ${ticker} position`,
  },
  {
    program: "LONS Market Registry",
    instruction: "Verify market",
    description: "Check migration, liquidity and active parameters",
  },
  {
    program: "LONS Vault",
    instruction: "Stage collateral",
    description: "Prepare the collateral position",
  },
  {
    program: "LONS Program",
    instruction: "Request borrow",
    description: "Evaluate the SOL borrow request",
  },
  {
    program: "System Program",
    instruction: "Prepare settlement",
    description: "Prepare the SOL destination instruction",
  },
];

export const demoBorrowingAdapter: BorrowingProvider = {
  async getBorrowQuote(request) {
    const market = demoMarkets.find((item) => item.id === request.marketId);

    if (!market) {
      throw new Error("No matching demo market");
    }

    const collateralAmount = Math.max(request.collateralAmount, 0);
    const borrowAmountSol = Math.max(request.borrowAmountSol, 0);
    const collateralValueUsd = collateralAmount * market.priceUsd;
    const borrowValueUsd = borrowAmountSol * DEMO_SOL_PRICE_USD;
    const estimatedLtvPercent =
      collateralValueUsd > 0
        ? (borrowValueUsd / collateralValueUsd) * 100
        : 0;
    const hasRoute =
      market.eligible &&
      market.liquid &&
      collateralAmount > 0 &&
      borrowAmountSol > 0;

    return {
      quoteId: `demo-borrow-${market.id}`,
      marketId: market.id,
      collateralTicker: market.ticker,
      collateralAmount,
      collateralValueUsd,
      borrowAsset: "SOL",
      borrowAmountSol,
      borrowValueUsd,
      remainingPositionUsd: null,
      estimatedLtvPercent,
      estimatedHealth: hasRoute
        ? getHealthState(estimatedLtvPercent)
        : "Unavailable",
      protocolFeeSol: borrowAmountSol * DEMO_PROTOCOL_FEE_RATE,
      estimatedNetworkCostSol: DEMO_NETWORK_COST_SOL,
      route: hasRoute ? demoRoute(market.ticker) : [],
      expiresAt: null,
      executable: false,
      notice: hasRoute
        ? "Estimated demo quote with no executable transaction"
        : "No demo borrow route available for these parameters",
      source: "demo",
      isDemo: true,
      dataLabel: "Demo data",
      updatedAt: null,
    };
  },

  async buildBorrowTransaction(request) {
    return {
      kind: "borrow",
      executable: false,
      serializedTransaction: null,
      instructions: request.quote.route.map((instruction) => ({ ...instruction })),
      requiresWalletApproval: true,
      notice: "Borrow transaction building requires a production LONS provider",
      source: "demo",
      isDemo: true,
      dataLabel: "Demo data",
      updatedAt: null,
    };
  },
};

export function getBorrowQuote(
  request: BorrowQuoteRequest,
  provider: BorrowingProvider = demoBorrowingAdapter,
): Promise<BorrowQuote> {
  return provider.getBorrowQuote(request);
}

export function buildBorrowTransaction(
  request: BuildBorrowTransactionRequest,
  provider: BorrowingProvider = demoBorrowingAdapter,
): Promise<PreparedTransaction> {
  return provider.buildBorrowTransaction(request);
}
