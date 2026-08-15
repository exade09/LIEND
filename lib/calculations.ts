import type { CalculatorInput, CalculatorResult, HealthState } from "../types";

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(Number.isFinite(value) ? value : minimum, minimum), maximum);
}

export function calculateCollateralValue(
  positionValueUsd: number,
  collateralPercent: number,
): number {
  return Math.max(positionValueUsd, 0) * (clamp(collateralPercent, 0, 100) / 100);
}

export function calculateLtv(
  borrowValueUsd: number,
  collateralValueUsd: number,
): number {
  if (collateralValueUsd <= 0) {
    return 0;
  }

  return (Math.max(borrowValueUsd, 0) / collateralValueUsd) * 100;
}

export function getHealthState(ltvPercent: number): HealthState {
  if (!Number.isFinite(ltvPercent)) {
    return "Unavailable";
  }

  if (ltvPercent <= 40) {
    return "Healthy";
  }

  if (ltvPercent <= 55) {
    return "Watch";
  }

  return "High risk";
}

export function calculateLoanEstimate(input: CalculatorInput): CalculatorResult {
  const positionValueUsd = Math.max(input.tokenValueUsd, 0);
  const collateralValueUsd = calculateCollateralValue(
    positionValueUsd,
    input.collateralPercent,
  );
  const borrowValueUsd =
    collateralValueUsd * (clamp(input.borrowPercent, 0, 100) / 100);
  const exampleLtvPercent = calculateLtv(borrowValueUsd, collateralValueUsd);
  const estimatedSol =
    input.solPriceUsd > 0 ? borrowValueUsd / input.solPriceUsd : 0;

  return {
    positionValueUsd,
    collateralValueUsd,
    estimatedSol,
    remainingExposureUsd: Math.max(positionValueUsd - collateralValueUsd, 0),
    exampleLtvPercent,
    healthState: getHealthState(exampleLtvPercent),
  };
}
