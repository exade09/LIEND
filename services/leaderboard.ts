import { demoLeaderboard } from "../data/demoLeaderboard";
import type {
  DataEnvelope,
  LeaderboardMetric,
  LeaderboardQuery,
  LeaderboardRow,
} from "../types";

export interface LeaderboardProvider {
  getLeaderboard: (
    query?: LeaderboardQuery,
  ) => Promise<DataEnvelope<LeaderboardRow[]>>;
}

const metricValue = (
  row: LeaderboardRow,
  metric: LeaderboardMetric,
): number => {
  if (metric === "Positions") {
    return row.positions;
  }

  if (metric === "Activity") {
    return row.transactions;
  }

  return row.borrowedUsd;
};

export const demoLeaderboardAdapter: LeaderboardProvider = {
  async getLeaderboard(query = {}) {
    const period = query.period ?? "7D";
    const metric = query.metric ?? "Borrow Volume";
    const limit = Math.max(query.limit ?? demoLeaderboard.length, 0);
    const rows: LeaderboardRow[] = demoLeaderboard.map((entry) => ({
      id: entry.id,
      rank: entry.rank,
      wallet: entry.wallet,
      period,
      ...entry.periods[period],
      source: "demo",
      isDemo: true,
      dataLabel: "Demo data",
      updatedAt: null,
    }));

    rows.sort((a, b) => metricValue(b, metric) - metricValue(a, metric));

    const ranked = rows.slice(0, limit).map((row, index) => ({
      ...row,
      rank: index + 1,
    }));

    return {
      data: ranked,
      source: "demo",
      isDemo: true,
      dataLabel: "Demo data",
      updatedAt: null,
      notice: "Static leaderboard values for interface testing",
    };
  },
};

export function getLeaderboard(
  query: LeaderboardQuery = {},
  provider: LeaderboardProvider = demoLeaderboardAdapter,
): Promise<DataEnvelope<LeaderboardRow[]>> {
  return provider.getLeaderboard(query);
}
