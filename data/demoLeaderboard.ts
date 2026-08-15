import type { LeaderboardEntry, LeaderboardPeriod, LeaderboardStats } from "../types";

const stats = (
  borrowedUsd: number,
  activeCollateralUsd: number,
  positions: number,
  transactions: number,
): LeaderboardStats => ({
  borrowedUsd,
  activeCollateralUsd,
  positions,
  transactions,
});

const periods = (
  day: LeaderboardStats,
  week: LeaderboardStats,
  month: LeaderboardStats,
  all: LeaderboardStats,
): Record<LeaderboardPeriod, LeaderboardStats> => ({
  "24H": day,
  "7D": week,
  "30D": month,
  ALL: all,
});

// Static analytics fixtures. Values are deliberately labeled as demo data.
export const demoLeaderboard: LeaderboardEntry[] = [
  {
    id: "demo-wallet-001",
    rank: 1,
    wallet: "7YmaK5wR9cT2xN6vB3dH8qP4sE7jF2uG5zM9nC3kW8a",
    periods: periods(
      stats(18_420, 46_900, 4, 12),
      stats(72_880, 142_600, 11, 48),
      stats(241_300, 486_900, 26, 162),
      stats(612_450, 1_208_000, 61, 404),
    ),
    source: "demo",
    isDemo: true,
    dataLabel: "Demo data",
    updatedAt: null,
  },
  {
    id: "demo-wallet-002",
    rank: 2,
    wallet: "3QvN8cR5wT2yK7sM4aH9xP6dE3jF8uG5zB2nW7kC4qV",
    periods: periods(
      stats(14_960, 39_100, 3, 9),
      stats(68_240, 130_200, 9, 41),
      stats(208_770, 421_500, 22, 137),
      stats(558_120, 998_400, 53, 351),
    ),
    source: "demo",
    isDemo: true,
    dataLabel: "Demo data",
    updatedAt: null,
  },
  {
    id: "demo-wallet-003",
    rank: 3,
    wallet: "9mC4qV7wR2yK5sN8aH3xP6dE9jF4uG7zB2nW5kT8cM3",
    periods: periods(
      stats(11_270, 31_800, 3, 8),
      stats(55_910, 111_700, 8, 36),
      stats(176_620, 349_800, 18, 116),
      stats(476_900, 887_200, 44, 296),
    ),
    source: "demo",
    isDemo: true,
    dataLabel: "Demo data",
    updatedAt: null,
  },
  {
    id: "demo-wallet-004",
    rank: 4,
    wallet: "5sV8aH3xP6dE9jF4uG7zB2nW5kT8cM3qR6yK2mN9vC4",
    periods: periods(
      stats(8_940, 26_500, 2, 7),
      stats(42_330, 98_400, 7, 29),
      stats(143_810, 287_100, 16, 94),
      stats(381_550, 744_600, 39, 241),
    ),
    source: "demo",
    isDemo: true,
    dataLabel: "Demo data",
    updatedAt: null,
  },
  {
    id: "demo-wallet-005",
    rank: 5,
    wallet: "8cM3qR6yK2mN9vC4sV7aH5xP8dE3jF6uG2zB4nW7kT5",
    periods: periods(
      stats(7_610, 21_900, 2, 6),
      stats(37_880, 82_600, 6, 25),
      stats(119_460, 246_300, 14, 81),
      stats(329_700, 638_900, 34, 211),
    ),
    source: "demo",
    isDemo: true,
    dataLabel: "Demo data",
    updatedAt: null,
  },
  {
    id: "demo-wallet-006",
    rank: 6,
    wallet: "2nW7kT5cM3qR8yK4mN9vC6sV2aH7xP5dE8jF3uG9zB4",
    periods: periods(
      stats(5_840, 17_400, 1, 4),
      stats(28_620, 68_100, 5, 19),
      stats(96_350, 197_800, 12, 66),
      stats(275_440, 521_300, 29, 174),
    ),
    source: "demo",
    isDemo: true,
    dataLabel: "Demo data",
    updatedAt: null,
  },
];
