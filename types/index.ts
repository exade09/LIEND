export type DataSource = "demo" | "live";

export interface DataProvenance {
  source: DataSource;
  isDemo: boolean;
  dataLabel: "Demo data" | "Live data";
  updatedAt: string | null;
}

export interface DataEnvelope<T> extends DataProvenance {
  data: T;
  notice?: string;
}

export type RobinhoodChainId = 4663;

export type WalletStatus =
  | "Disconnected"
  | "Connecting"
  | "Connected"
  | "Wrong Network"
  | "Checking Eligibility";

export interface WalletConnection {
  status: WalletStatus;
  address: string | null;
  providerName: string | null;
  chainId: RobinhoodChainId;
  error?: string;
}

export interface WalletProvider {
  name: string;
  connect: () => Promise<{
    address: string;
    chainId?: RobinhoodChainId;
  }>;
  disconnect?: () => Promise<void>;
}

export interface WalletBalance {
  mintAddress: string;
  symbol: string;
  amount: string;
  decimals: number;
  uiAmount: number;
}

export interface WalletTokenPosition extends WalletBalance {
  marketId: string | null;
  priceUsd: number | null;
  valueUsd: number | null;
  supported: boolean;
}

export type EligibilityState =
  | "NOT CONNECTED"
  | "CHECKING"
  | "ELIGIBLE"
  | "NOT ELIGIBLE";

export interface EligibilityResult extends DataProvenance {
  state: EligibilityState;
  eligible: boolean | null;
  lonsBalance: number | null;
  minimumBalance: number | null;
  walletAddress: string | null;
  reason: string;
}

export type MigrationStatus = "Migrated" | "Verifying";
export type MarketStatus = "Eligible" | "Liquid" | "Monitoring" | "Limited";

export interface Market extends DataProvenance {
  id: string;
  name: string;
  ticker: string;
  mintAddress: string;
  iconLabel: string;
  accent: string;
  migrationStatus: MigrationStatus;
  priceUsd: number;
  marketCapUsd: number;
  liquidityUsd: number;
  volume24hUsd: number;
  holderPosition: null;
  estimatedBorrowableUsd: number;
  status: MarketStatus;
  eligible: boolean;
  liquid: boolean;
  sparkline: number[];
}

export type MarketFilter = "All" | "Eligible" | "Migrated" | "Liquid";

export interface MarketQuery {
  search?: string;
  filter?: MarketFilter;
}

export interface TokenLiquidity extends DataProvenance {
  marketId: string;
  mintAddress: string;
  liquidityUsd: number;
  volume24hUsd: number;
  borrowableUsd: number;
  routeAvailable: boolean;
}

export type HealthState = "Healthy" | "Watch" | "High risk" | "Unavailable";

export interface CalculatorInput {
  tokenValueUsd: number;
  collateralPercent: number;
  borrowPercent: number;
  ethPriceUsd: number;
}

export interface CalculatorResult {
  positionValueUsd: number;
  collateralValueUsd: number;
  estimatedEth: number;
  remainingExposureUsd: number;
  exampleLtvPercent: number;
  healthState: HealthState;
}

export interface RouteInstruction {
  program: string;
  instruction: string;
  description: string;
}

export interface BorrowQuoteRequest {
  marketId: string;
  walletAddress?: string;
  collateralAmount: number;
  borrowAmountEth: number;
}

export interface BorrowQuote extends DataProvenance {
  quoteId: string;
  marketId: string;
  collateralTicker: string;
  collateralAmount: number;
  collateralValueUsd: number;
  borrowAsset: "ETH";
  borrowAmountEth: number;
  borrowValueUsd: number;
  remainingPositionUsd: number | null;
  estimatedLtvPercent: number;
  estimatedHealth: HealthState;
  protocolFeeEth: number;
  estimatedNetworkCostEth: number;
  route: RouteInstruction[];
  expiresAt: string | null;
  executable: boolean;
  notice: string;
}

export interface BuildBorrowTransactionRequest {
  quote: BorrowQuote;
  walletAddress: string;
}

export interface PreparedTransaction extends DataProvenance {
  kind: "borrow" | "swap";
  executable: boolean;
  serializedTransaction: string | null;
  instructions: RouteInstruction[];
  requiresWalletApproval: true;
  notice: string;
}

export interface SwapQuoteRequest {
  inputMint: string;
  outputMint: string;
  inputSymbol: string;
  outputSymbol: string;
  amount: number;
  slippageBps?: number;
}

export interface SwapRoute extends DataProvenance {
  id: string;
  label: string;
  programs: string[];
  estimatedOutput: number;
  priceImpactPercent: number;
  estimatedNetworkFeeEth: number;
  steps: RouteInstruction[];
}

export interface SwapQuote extends DataProvenance {
  quoteId: string;
  request: SwapQuoteRequest;
  estimatedOutput: number;
  minimumOutput: number;
  priceImpactPercent: number;
  estimatedNetworkFeeEth: number;
  routes: SwapRoute[];
  expiresAt: string | null;
  executable: boolean;
  notice: string;
}

export interface BuildSwapTransactionRequest {
  quote: SwapQuote;
  routeId: string;
  walletAddress: string;
}

export type TraceStepStatus = "DEMO" | "READY" | "PENDING" | "CONFIRMED" | "FAILED";

export interface TransactionTraceStep {
  id: string;
  label: string;
  program: string;
  instruction: string;
  signature: string | null;
  slot: number | null;
  status: TraceStepStatus;
  value: string;
  details: string[];
}

export interface TokenChange {
  owner: string;
  ticker: string;
  amount: number;
}

export interface EthChange {
  owner: string;
  amountEth: number;
}

export interface DemoTransaction extends DataProvenance {
  id: string;
  wallet: string;
  asset: string;
  collateralValueUsd: number;
  borrowValueUsd: number;
  ethReceived: number;
  instructionCount: number;
  status: "DEMO";
  signature: string;
  slot: number;
  blockTime: string;
  programs: string[];
  trace: TransactionTraceStep[];
  tokenChanges: TokenChange[];
  ethChanges: EthChange[];
}

export type ProtocolAction =
  | "Borrow opened"
  | "ETH received"
  | "Position repaid"
  | "Collateral unlocked"
  | "Market added"
  | "Swap routed";

export interface ProtocolActivity extends DataProvenance {
  id: string;
  timestamp: string;
  wallet: string;
  action: ProtocolAction;
  asset: string;
  value: string;
}

export type LeaderboardMetric = "Borrow Volume" | "Positions" | "Activity";
export type LeaderboardPeriod = "24H" | "7D" | "30D" | "ALL";

export interface LeaderboardStats {
  borrowedUsd: number;
  activeCollateralUsd: number;
  positions: number;
  transactions: number;
}

export interface LeaderboardEntry extends DataProvenance {
  id: string;
  rank: number;
  wallet: string;
  periods: Record<LeaderboardPeriod, LeaderboardStats>;
}

export interface LeaderboardQuery {
  metric?: LeaderboardMetric;
  period?: LeaderboardPeriod;
  limit?: number;
}

export interface LeaderboardRow extends LeaderboardStats, DataProvenance {
  id: string;
  rank: number;
  wallet: string;
  period: LeaderboardPeriod;
}
