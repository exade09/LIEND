import { project } from "../config/project";
import {
  demoProtocolActivity,
  demoTransactions,
} from "../data/demoTransactions";
import type {
  DataEnvelope,
  EligibilityResult,
  ProtocolActivity,
  TransactionTraceStep,
  WalletBalance,
  WalletConnection,
  WalletProvider,
  WalletTokenPosition,
} from "../types";

export interface SolanaDataProvider {
  getWalletBalances: (
    walletAddress: string,
  ) => Promise<DataEnvelope<WalletBalance[]>>;
  getWalletTokenPositions: (
    walletAddress: string,
  ) => Promise<DataEnvelope<WalletTokenPosition[]>>;
  checkLiendEligibility: (
    walletAddress: string | null,
  ) => Promise<EligibilityResult>;
  getTransactionTrace: (
    identifier: string,
  ) => Promise<DataEnvelope<TransactionTraceStep[]>>;
  getProtocolActivity: () => Promise<DataEnvelope<ProtocolActivity[]>>;
}

// This default adapter never invents balances or approvals. A production provider
// must be passed to read wallet-owned data from Solana.
export const demoSolanaAdapter: SolanaDataProvider = {
  async getWalletBalances() {
    return {
      data: [],
      source: "demo",
      isDemo: true,
      dataLabel: "Demo data",
      updatedAt: null,
      notice: "Wallet balances are unavailable until a Solana data provider is connected",
    };
  },

  async getWalletTokenPositions() {
    return {
      data: [],
      source: "demo",
      isDemo: true,
      dataLabel: "Demo data",
      updatedAt: null,
      notice: "Wallet positions are unavailable until a Solana data provider is connected",
    };
  },

  async checkLiendEligibility(walletAddress) {
    return {
      state: walletAddress ? "CHECKING" : "NOT CONNECTED",
      eligible: null,
      liendBalance: null,
      minimumBalance: project.access.minimumBalance,
      walletAddress,
      reason: walletAddress
        ? "Eligibility requires a connected Solana balance provider"
        : "Connect a Solana wallet to begin the eligibility check",
      source: "demo",
      isDemo: true,
      dataLabel: "Demo data",
      updatedAt: null,
    };
  },

  async getTransactionTrace(identifier) {
    const transaction = demoTransactions.find(
      (item) => item.id === identifier || item.signature === identifier,
    );

    return {
      data: transaction?.trace.map((step) => ({
        ...step,
        details: [...step.details],
      })) ?? [],
      source: "demo",
      isDemo: true,
      dataLabel: "Demo data",
      updatedAt: null,
      notice: transaction
        ? "Demonstration trace with no onchain execution"
        : "No matching demonstration trace",
    };
  },

  async getProtocolActivity() {
    return {
      data: demoProtocolActivity.map((item) => ({ ...item })),
      source: "demo",
      isDemo: true,
      dataLabel: "Demo data",
      updatedAt: null,
      notice: "Static protocol activity for interface testing",
    };
  },
};

export async function connectWallet(
  provider?: WalletProvider | null,
): Promise<WalletConnection> {
  if (!provider) {
    return {
      status: "Disconnected",
      address: null,
      providerName: null,
      cluster: project.cluster,
      error: "No wallet provider selected",
    };
  }

  try {
    const connection = await provider.connect();
    const address =
      typeof connection.publicKey === "string"
        ? connection.publicKey
        : connection.publicKey.toString();

    if (!address) {
      return {
        status: "Disconnected",
        address: null,
        providerName: provider.name,
        cluster: project.cluster,
        error: "The wallet provider returned no public key",
      };
    }

    if (connection.cluster && connection.cluster !== project.cluster) {
      return {
        status: "Wrong Network",
        address,
        providerName: provider.name,
        cluster: connection.cluster,
        error: `Switch to Solana ${project.cluster}`,
      };
    }

    return {
      status: "Connected",
      address,
      providerName: provider.name,
      cluster: connection.cluster ?? project.cluster,
    };
  } catch (error) {
    return {
      status: "Disconnected",
      address: null,
      providerName: provider.name,
      cluster: project.cluster,
      error: error instanceof Error ? error.message : "Wallet connection failed",
    };
  }
}

export function getWalletBalances(
  walletAddress: string,
  provider: SolanaDataProvider = demoSolanaAdapter,
): Promise<DataEnvelope<WalletBalance[]>> {
  return provider.getWalletBalances(walletAddress);
}

export function getWalletTokenPositions(
  walletAddress: string,
  provider: SolanaDataProvider = demoSolanaAdapter,
): Promise<DataEnvelope<WalletTokenPosition[]>> {
  return provider.getWalletTokenPositions(walletAddress);
}

export function checkLiendEligibility(
  walletAddress: string | null,
  provider: SolanaDataProvider = demoSolanaAdapter,
): Promise<EligibilityResult> {
  return provider.checkLiendEligibility(walletAddress);
}

export function getTransactionTrace(
  identifier: string,
  provider: SolanaDataProvider = demoSolanaAdapter,
): Promise<DataEnvelope<TransactionTraceStep[]>> {
  return provider.getTransactionTrace(identifier);
}

export function getProtocolActivity(
  provider: SolanaDataProvider = demoSolanaAdapter,
): Promise<DataEnvelope<ProtocolActivity[]>> {
  return provider.getProtocolActivity();
}
