export type TapeKind = "borrow" | "repay"

export type TapeEvent = {
  id: string
  kind: TapeKind
  wallet: string
  signature: string
  asset: string
  title: string
  route: string
  amount: string
  description: string
  tokenDelta: string
  nativeDelta: string
  occurredAt: number
}

export const kindLabel: Record<TapeKind, string> = {
  borrow: "BORROW",
  repay: "REPAY",
}
