/**
 * Unbacked utility book.
 *
 * Positions, quotes and loans live in the connected wallet's browser until a
 * lending program exists. The interface is fully operable. Nothing here is
 * settled on Solana.
 */

export type UnbackedPosition = {
  mint: string
  symbol: string
  name: string
  amount: string
  valueUsd: number
}

export type UnbackedLoan = {
  id: string
  mint: string
  symbol: string
  collateralAmount: string
  principalSol: number
  outstandingSol: number
  feeSol: number
  ltvBps: number
  interestRateBps: number
  status: "active" | "repaid"
  openedAt: number
  closedAt: number | null
}

export type UnbackedActivity = {
  id: string
  kind: "borrow" | "repayment"
  mint: string
  symbol: string
  amount: string
  occurredAt: number
}

export type UnbackedQuote = {
  mint: string
  symbol: string
  collateralAmount: string
  collateralUsd: number
  borrowSol: number
  feeSol: number
  ltvBps: number
  interestRateBps: number
}

export type UnbackedBook = {
  positions: UnbackedPosition[]
  loans: UnbackedLoan[]
  activity: UnbackedActivity[]
}

export const SOL_USD = 148.2
export const MAX_LTV_BPS = 5000
export const FEE_BPS = 30
export const INTEREST_RATE_BPS = 850

const SEED_POSITIONS: UnbackedPosition[] = [
  {
    mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    symbol: "BONK",
    name: "Bonk",
    amount: "12,840,000",
    valueUsd: 1842.5,
  },
  {
    mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    symbol: "WIF",
    name: "dogwifhat",
    amount: "420.50",
    valueUsd: 1261.2,
  },
  {
    mint: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
    symbol: "POPCAT",
    name: "POPCAT",
    amount: "8,900",
    valueUsd: 712,
  },
]

function storageKey(wallet: string) {
  return `liend.unbacked.v1.${wallet}`
}

function quoteKey(wallet: string) {
  return `liend.unbacked.quote.${wallet}`
}

export function emptyBook(): UnbackedBook {
  return { positions: SEED_POSITIONS.map((position) => ({ ...position })), loans: [], activity: [] }
}

export function loadBook(wallet: string | null): UnbackedBook {
  if (!wallet || typeof window === "undefined") return emptyBook()
  try {
    const raw = window.localStorage.getItem(storageKey(wallet))
    if (!raw) return emptyBook()
    const parsed = JSON.parse(raw) as UnbackedBook
    if (!Array.isArray(parsed.positions) || parsed.positions.length === 0) return emptyBook()
    return {
      positions: parsed.positions,
      loans: Array.isArray(parsed.loans) ? parsed.loans : [],
      activity: Array.isArray(parsed.activity) ? parsed.activity : [],
    }
  } catch {
    return emptyBook()
  }
}

export function saveBook(wallet: string, book: UnbackedBook) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(storageKey(wallet), JSON.stringify(book))
}

export function loadQuote(wallet: string | null): UnbackedQuote | null {
  if (!wallet || typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(quoteKey(wallet))
    return raw ? (JSON.parse(raw) as UnbackedQuote) : null
  } catch {
    return null
  }
}

export function saveQuote(wallet: string, quote: UnbackedQuote) {
  window.sessionStorage.setItem(quoteKey(wallet), JSON.stringify(quote))
}

export function clearQuote(wallet: string) {
  window.sessionStorage.removeItem(quoteKey(wallet))
}

export function findPosition(book: UnbackedBook, mint: string) {
  return book.positions.find((position) => position.mint === mint) ?? null
}

export function findLoan(book: UnbackedBook, id: string) {
  return book.loans.find((loan) => loan.id === id) ?? null
}

export function maxBorrowSol(position: UnbackedPosition) {
  return (position.valueUsd * (MAX_LTV_BPS / 10_000)) / SOL_USD
}

export function quoteBorrow(position: UnbackedPosition, borrowSol: number): UnbackedQuote {
  const capped = Math.min(Math.max(borrowSol, 0), maxBorrowSol(position))
  const ltvBps = Math.round(((capped * SOL_USD) / position.valueUsd) * 10_000)
  return {
    mint: position.mint,
    symbol: position.symbol,
    collateralAmount: position.amount,
    collateralUsd: position.valueUsd,
    borrowSol: Number(capped.toFixed(4)),
    feeSol: Number(((capped * FEE_BPS) / 10_000).toFixed(4)),
    ltvBps,
    interestRateBps: INTEREST_RATE_BPS,
  }
}

export function openLoan(book: UnbackedBook, quote: UnbackedQuote): { book: UnbackedBook; loan: UnbackedLoan } {
  const loan: UnbackedLoan = {
    id: `ln_${Date.now().toString(36)}`,
    mint: quote.mint,
    symbol: quote.symbol,
    collateralAmount: quote.collateralAmount,
    principalSol: quote.borrowSol,
    outstandingSol: Number((quote.borrowSol + quote.feeSol).toFixed(4)),
    feeSol: quote.feeSol,
    ltvBps: quote.ltvBps,
    interestRateBps: quote.interestRateBps,
    status: "active",
    openedAt: Date.now(),
    closedAt: null,
  }
  const activity: UnbackedActivity = {
    id: `act_${loan.id}`,
    kind: "borrow",
    mint: quote.mint,
    symbol: quote.symbol,
    amount: `${loan.principalSol.toFixed(3)} SOL`,
    occurredAt: loan.openedAt,
  }
  return {
    loan,
    book: {
      ...book,
      loans: [loan, ...book.loans],
      activity: [activity, ...book.activity],
    },
  }
}

export function repayLoan(book: UnbackedBook, id: string): UnbackedBook {
  const loan = findLoan(book, id)
  if (!loan || loan.status !== "active") return book
  const closed: UnbackedLoan = { ...loan, status: "repaid", outstandingSol: 0, closedAt: Date.now() }
  const activity: UnbackedActivity = {
    id: `act_rp_${id}`,
    kind: "repayment",
    mint: loan.mint,
    symbol: loan.symbol,
    amount: `${loan.outstandingSol.toFixed(3)} SOL`,
    occurredAt: closed.closedAt ?? Date.now(),
  }
  return {
    ...book,
    loans: book.loans.map((item) => (item.id === id ? closed : item)),
    activity: [activity, ...book.activity],
  }
}

export function positionValueUsd(book: UnbackedBook) {
  return book.positions.reduce((sum, position) => sum + position.valueUsd, 0)
}

export function outstandingSol(book: UnbackedBook) {
  return book.loans
    .filter((loan) => loan.status === "active")
    .reduce((sum, loan) => sum + loan.outstandingSol, 0)
}

export function availableSol(book: UnbackedBook) {
  const capacity = (positionValueUsd(book) * (MAX_LTV_BPS / 10_000)) / SOL_USD
  return Math.max(0, capacity - outstandingSol(book))
}

export function usd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
}

export function sol(value: number) {
  return `${value.toFixed(3)} SOL`
}
