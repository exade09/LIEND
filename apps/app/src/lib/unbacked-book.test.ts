import { describe, expect, it } from "vitest"
import {
  emptyBook,
  openLoan,
  reservedLoan,
  type UnbackedBook,
  type UnbackedQuote,
} from "./unbacked-book"

const quote: UnbackedQuote = {
  mint: "Mint111111111111111111111111111111111111111",
  symbol: "TEST",
  collateralAmount: "1000",
  collateralUsd: 80,
  borrowSol: 0.2,
  feeSol: 0.0006,
  ltvBps: 3700,
  interestRateBps: 850,
}

function bookWith(positions: UnbackedBook["positions"] = []): UnbackedBook {
  return { ...emptyBook(), positions }
}

describe("borrow review reservation", () => {
  it("opens a signed request on review and blocks a second borrow on that mint", () => {
    const first = openLoan(bookWith(), quote, "sig-one")
    expect(first).not.toBeNull()
    expect(first?.loan.status).toBe("review")
    expect(first?.loan.signature).toBe("sig-one")
    expect(reservedLoan(first!.book, quote.mint)?.id).toBe(first!.loan.id)
    expect(openLoan(first!.book, quote, "sig-two")).toBeNull()
  })

  it("allows a borrow on a different mint", () => {
    const first = openLoan(bookWith(), quote, "sig-one")
    const second = openLoan(first!.book, { ...quote, mint: "Mint222222222222222222222222222222222222222" }, "sig-two")
    expect(second?.loan.status).toBe("review")
    expect(second?.book.loans).toHaveLength(2)
  })
})
