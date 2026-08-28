import { project } from "../config/project";
import { accessCopy, fetchHolderAccess } from "../lib/holder-access";
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

export interface RobinhoodChainDataProvider {
  getWalletBalances: (
    walletAddress: string,
  ) => Promise<DataEnvelope<WalletBalance[]>>;
  getWalletTokenPositions: (
    walletAddress: string,
  ) => Promise<DataEnvelope<WalletTokenPosition[]>>;
  checkLonsEligibility: (
    walletAddress: string | null,
  ) => Promise<EligibilityResult>;
  getTransactionTrace: (
    identifier: string,
  ) => Promise<DataEnvelope<TransactionTraceStep[]>>;
  getProtocolActivity: () => Promise<DataEnvelope<ProtocolActivity[]>>;
}

// This default adapter never invents balances or approvals. A production provider
// must be passed to read wallet-owned data from Robinhood Chain.
export const demoRobinhoodChainAdapter: RobinhoodChainDataProvider = {
  async getWalletBalances() {
    return {
      data: [],
      source: "demo",
      isDemo: true,
      dataLabel: "Demo data",
      updatedAt: null,
      notice: "Wallet balances are unavailable until a Robinhood Chain data provider is connected",
    };
  },

  async getWalletTokenPositions() {
    return {
      data: [],
      source: "demo",
      isDemo: true,
      dataLabel: "Demo data",
      updatedAt: null,
      notice: "Wallet positions are unavailable until a Robinhood Chain data provider is connected",
    };
  },

  async checkLonsEligibility(walletAddress) {
    if (!walletAddress) {
      return {
        state: "NOT CONNECTED",
        eligible: null,
        lonsBalance: null,
        minimumBalance: project.access.minimumBalance,
        walletAddress,
        reason: "Connect a Robinhood Chain wallet to begin the eligibility check",
        source: "live",
        isDemo: false,
        dataLabel: "Live data",
        updatedAt: null,
      };
    }

    const access = await fetchHolderAccess(walletAddress);
    const eligible =
      access.state === "eligible" || access.state === "token-not-launched"
        ? true
        : access.state === "not-eligible"
          ? false
          : null;
    const lonsBalance =
      access.state === "eligible" || access.state === "not-eligible"
        ? Number(access.balance)
        : null;

    return {
      state:
        access.state === "disconnected"
          ? "NOT CONNECTED"
          : access.state === "not-eligible"
            ? "NOT ELIGIBLE"
            : access.state === "eligible" || access.state === "token-not-launched"
              ? "ELIGIBLE"
              : "CHECKING",
      eligible,
      lonsBalance: Number.isFinite(lonsBalance) ? lonsBalance : null,
      minimumBalance: project.access.minimumBalance,
      walletAddress,
      reason: accessCopy(access),
      source: "live",
      isDemo: false,
      dataLabel: "Live data",
      updatedAt: new Date().toISOString(),
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
      chainId: project.chainId,
      error: "No wallet provider selected",
    };
  }

  try {
    const connection = await provider.connect();
    const address = connection.address;

    if (!address) {
      return {
        status: "Disconnected",
        address: null,
        providerName: provider.name,
        chainId: project.chainId,
        error: "The wallet provider returned no public key",
      };
    }

    if (connection.chainId && connection.chainId !== project.chainId) {
      return {
        status: "Wrong Network",
        address,
        providerName: provider.name,
        chainId: connection.chainId,
        error: `Switch to Robinhood Chain (${project.chainId})`,
      };
    }

    return {
      status: "Connected",
      address,
      providerName: provider.name,
      chainId: connection.chainId ?? project.chainId,
    };
  } catch (error) {
    return {
      status: "Disconnected",
      address: null,
      providerName: provider.name,
      chainId: project.chainId,
      error: error instanceof Error ? error.message : "Wallet connection failed",
    };
  }
}

export function getWalletBalances(
  walletAddress: string,
  provider: RobinhoodChainDataProvider = demoRobinhoodChainAdapter,
): Promise<DataEnvelope<WalletBalance[]>> {
  return provider.getWalletBalances(walletAddress);
}

export function getWalletTokenPositions(
  walletAddress: string,
  provider: RobinhoodChainDataProvider = demoRobinhoodChainAdapter,
): Promise<DataEnvelope<WalletTokenPosition[]>> {
  return provider.getWalletTokenPositions(walletAddress);
}

export function checkLonsEligibility(
  walletAddress: string | null,
  provider: RobinhoodChainDataProvider = demoRobinhoodChainAdapter,
): Promise<EligibilityResult> {
  return provider.checkLonsEligibility(walletAddress);
}

export function getTransactionTrace(
  identifier: string,
  provider: RobinhoodChainDataProvider = demoRobinhoodChainAdapter,
): Promise<DataEnvelope<TransactionTraceStep[]>> {
  return provider.getTransactionTrace(identifier);
}

export function getProtocolActivity(
  provider: RobinhoodChainDataProvider = demoRobinhoodChainAdapter,
): Promise<DataEnvelope<ProtocolActivity[]>> {
  return provider.getProtocolActivity();
}
