/**
 * Utility book for a connected wallet.
 *
 * Positions come from on-chain token accounts. Quotes, loans and activity
 * stay in the browser until a lending program exists — nothing here is
 * settled on Robinhood Chain.
 */

export type UnbackedPosition = {
  mint: string
  symbol: string
  name: string
  amount: string
  valueUsd: number
}

export type LoanStatus = "review" | "active" | "repaid"

export type UnbackedLoan = {
  id: string
  mint: string
  symbol: string
  collateralAmount: string
  principalEth: number
  outstandingEth: number
  feeEth: number
  ltvBps: number
  interestRateBps: number
  status: LoanStatus
  signature: string | null
  openedAt: number
  closedAt: number | null
}

export type UnbackedActivity = {
  id: string
  kind: "borrow" | "borrow-review" | "repayment"
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
  borrowEth: number
  feeEth: number
  ltvBps: number
  interestRateBps: number
}

export type UnbackedBook = {
  positions: UnbackedPosition[]
  loans: UnbackedLoan[]
  activity: UnbackedActivity[]
  ethUsd: number
}

export const DEFAULT_ETH_USD = 0
export const MAX_LTV_BPS = 5000
export const FEE_BPS = 30
export const INTEREST_RATE_BPS = 850

function storageKey(wallet: string) {
  return `lons.book.v3.${wallet.toLowerCase()}`
}

function quoteKey(wallet: string) {
  return `lons.book.quote.v3.${wallet.toLowerCase()}`
}

export function emptyBook(): UnbackedBook {
  return { positions: [], loans: [], activity: [], ethUsd: DEFAULT_ETH_USD }
}

export function loadBook(wallet: string | null): UnbackedBook {
  if (!wallet || typeof window === "undefined") return emptyBook()
  try {
    const raw = window.localStorage.getItem(storageKey(wallet))
    if (!raw) return emptyBook()
    const parsed = JSON.parse(raw) as Partial<UnbackedBook>
    return {
      positions: Array.isArray(parsed.positions) ? parsed.positions : [],
      loans: Array.isArray(parsed.loans) ? parsed.loans.map(normalizeLoan) : [],
      activity: Array.isArray(parsed.activity) ? parsed.activity : [],
      ethUsd: typeof parsed.ethUsd === "number" && parsed.ethUsd > 0 ? parsed.ethUsd : DEFAULT_ETH_USD,
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

export function reservedLoan(book: UnbackedBook, mint: string) {
  return (
    book.loans.find((loan) => loan.mint === mint && (loan.status === "review" || loan.status === "active")) ?? null
  )
}

export function loanLabel(status: LoanStatus) {
  if (status === "review") return "On review"
  if (status === "repaid") return "Repaid"
  return "Active"
}

function normalizeLoan(loan: UnbackedLoan): UnbackedLoan {
  const status: LoanStatus = loan.status === "review" || loan.status === "repaid" ? loan.status : "active"
  return {
    ...loan,
    status,
    signature: typeof loan.signature === "string" ? loan.signature : null,
  }
}

function ethPrice(bookOrUsd?: UnbackedBook | number) {
  if (typeof bookOrUsd === "number") return Math.max(0, bookOrUsd)
  return Math.max(0, bookOrUsd?.ethUsd ?? DEFAULT_ETH_USD)
}

export function maxBorrowEth(position: UnbackedPosition, ethUsd = DEFAULT_ETH_USD) {
  if (position.valueUsd <= 0 || ethUsd <= 0) return 0
  return (position.valueUsd * (MAX_LTV_BPS / 10_000)) / ethPrice(ethUsd)
}

export function quoteBorrow(
  position: UnbackedPosition,
  borrowEth: number,
  ethUsd = DEFAULT_ETH_USD,
): UnbackedQuote {
  const price = ethPrice(ethUsd)
  const capped = Math.min(Math.max(borrowEth, 0), maxBorrowEth(position, price))
  const ltvBps =
    position.valueUsd > 0 ? Math.round(((capped * price) / position.valueUsd) * 10_000) : 0
  return {
    mint: position.mint,
    symbol: position.symbol,
    collateralAmount: position.amount,
    collateralUsd: position.valueUsd,
    borrowEth: Number(capped.toFixed(4)),
    feeEth: Number(((capped * FEE_BPS) / 10_000).toFixed(4)),
    ltvBps,
    interestRateBps: INTEREST_RATE_BPS,
  }
}

export function openLoan(
  book: UnbackedBook,
  quote: UnbackedQuote,
  signature: string,
): { book: UnbackedBook; loan: UnbackedLoan } | null {
  if (reservedLoan(book, quote.mint)) return null
  const loan: UnbackedLoan = {
    id: `ln_${Date.now().toString(36)}`,
    mint: quote.mint,
    symbol: quote.symbol,
    collateralAmount: quote.collateralAmount,
    principalEth: quote.borrowEth,
    outstandingEth: Number((quote.borrowEth + quote.feeEth).toFixed(4)),
    feeEth: quote.feeEth,
    ltvBps: quote.ltvBps,
    interestRateBps: quote.interestRateBps,
    status: "review",
    signature,
    openedAt: Date.now(),
    closedAt: null,
  }
  const activity: UnbackedActivity = {
    id: `act_${loan.id}`,
    kind: "borrow-review",
    mint: quote.mint,
    symbol: quote.symbol,
    amount: `${loan.principalEth.toFixed(3)} ETH`,
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
  const closed: UnbackedLoan = { ...loan, status: "repaid", outstandingEth: 0, closedAt: Date.now() }
  const activity: UnbackedActivity = {
    id: `act_rp_${id}`,
    kind: "repayment",
    mint: loan.mint,
    symbol: loan.symbol,
    amount: `${loan.outstandingEth.toFixed(3)} ETH`,
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

export function outstandingEth(book: UnbackedBook) {
  return book.loans
    .filter((loan) => loan.status === "review" || loan.status === "active")
    .reduce((sum, loan) => sum + loan.outstandingEth, 0)
}

export function availableEth(book: UnbackedBook) {
  const capacity = (positionValueUsd(book) * (MAX_LTV_BPS / 10_000)) / ethPrice(book)
  return Math.max(0, capacity - outstandingEth(book))
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

export function eth(value: number) {
  return `${value.toFixed(3)} ETH`
}

export function activityLabel(kind: UnbackedActivity["kind"]) {
  if (kind === "borrow-review") return "Borrow on review"
  if (kind === "borrow") return "Borrow"
  return "Repayment"
}

/** Plain-text intent the wallet shows before the user signs. No funds move. */
export function borrowRequestMessage(wallet: string, quote: UnbackedQuote) {
  return [
    "LONS borrow request",
    "",
    `wallet: ${wallet}`,
    `token: ${quote.symbol}`,
    `contract: ${quote.mint}`,
    `borrow: ${quote.borrowEth.toFixed(4)} ETH`,
    `collateral: ${quote.collateralAmount} ${quote.symbol}`,
    "",
    "this request is submitted for review",
    "it does not transfer funds",
  ].join("\n")
}
