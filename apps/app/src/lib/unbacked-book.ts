/**
 * Utility book for a connected wallet.
 *
 * Positions come from on-chain token accounts. Quotes, loans and activity
 * stay in the browser until a lending program exists — nothing here is
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
  solUsd: number
}

export const DEFAULT_SOL_USD = 148.2
export const MAX_LTV_BPS = 5000
export const FEE_BPS = 30
export const INTEREST_RATE_BPS = 850

function storageKey(wallet: string) {
  return `liend.book.v2.${wallet}`
}

function quoteKey(wallet: string) {
  return `liend.book.quote.${wallet}`
}

export function emptyBook(): UnbackedBook {
  return { positions: [], loans: [], activity: [], solUsd: DEFAULT_SOL_USD }
}

export function loadBook(wallet: string | null): UnbackedBook {
  if (!wallet || typeof window === "undefined") return emptyBook()
  try {
    const raw = window.localStorage.getItem(storageKey(wallet))
    if (!raw) return emptyBook()
    const parsed = JSON.parse(raw) as Partial<UnbackedBook>
    return {
      positions: Array.isArray(parsed.positions) ? parsed.positions : [],
      loans: Array.isArray(parsed.loans) ? parsed.loans : [],
      activity: Array.isArray(parsed.activity) ? parsed.activity : [],
      solUsd: typeof parsed.solUsd === "number" && parsed.solUsd > 0 ? parsed.solUsd : DEFAULT_SOL_USD,
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

function solPrice(bookOrUsd?: UnbackedBook | number) {
  if (typeof bookOrUsd === "number") return bookOrUsd > 0 ? bookOrUsd : DEFAULT_SOL_USD
  if (bookOrUsd && bookOrUsd.solUsd > 0) return bookOrUsd.solUsd
  return DEFAULT_SOL_USD
}

export function maxBorrowSol(position: UnbackedPosition, solUsd = DEFAULT_SOL_USD) {
  if (position.valueUsd <= 0) return 0
  return (position.valueUsd * (MAX_LTV_BPS / 10_000)) / solPrice(solUsd)
}

export function quoteBorrow(
  position: UnbackedPosition,
  borrowSol: number,
  solUsd = DEFAULT_SOL_USD,
): UnbackedQuote {
  const price = solPrice(solUsd)
  const capped = Math.min(Math.max(borrowSol, 0), maxBorrowSol(position, price))
  const ltvBps =
    position.valueUsd > 0 ? Math.round(((capped * price) / position.valueUsd) * 10_000) : 0
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
  const capacity = (positionValueUsd(book) * (MAX_LTV_BPS / 10_000)) / solPrice(book)
  return Math.max(0, capacity - outstandingSol(book))
}

export function usd(value: number) {
  if (value > 0 && value < 0.01) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 6,
    }).format(value)
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
}

export function sol(value: number) {
  return `${value.toFixed(3)} SOL`
}
