import type { UnbackedPosition } from "./unbacked-book"

/** Temporary recording seat: one wallet, one mint, a fixed USD value. */
export const RECORDING_WALLET = "Bpp1AphBxPNjXf3eB6cEVoXyythAPwuBNSVyfdgw9Ze9"
export const RECORDING_MINT = "pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn"

const RECORDING_POSITION: UnbackedPosition = {
  mint: RECORDING_MINT,
  symbol: "PUMP",
  name: "Pump",
  amount: "48,000",
  valueUsd: 110,
}

export function withRecordingPosition(wallet: string | null, positions: UnbackedPosition[]): UnbackedPosition[] {
  if (wallet !== RECORDING_WALLET) return positions
  return [RECORDING_POSITION, ...positions.filter((position) => position.mint !== RECORDING_MINT)]
}
