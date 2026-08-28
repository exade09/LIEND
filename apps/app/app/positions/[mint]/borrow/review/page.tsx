"use client"

import { use, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { parseMint } from "@liend/config"
import { UtilityGate } from "@/components/UtilityGate"
import { useSession } from "@/components/SessionProvider"
import { useUnbackedBook } from "@/components/UnbackedBook"
import { borrowRequestMessage, reservedLoan, eth, usd } from "@/lib/unbacked-book"
import { signWithSessionWallet } from "@/lib/wallet"

export default function BorrowReviewPage({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = use(params)
  const valid = parseMint(mint)
  const router = useRouter()
  const { wallet } = useSession()
  const { book, readQuote, confirmBorrow } = useUnbackedBook()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reserved = valid ? reservedLoan(book, valid) : null
  const quote = useMemo(() => {
    const pending = readQuote()
    return pending && pending.mint === valid ? pending : null
  }, [readQuote, valid])

  async function submit() {
    if (!quote || !wallet) return
    setBusy(true)
    setError(null)
    try {
      const signature = await signWithSessionWallet(wallet, borrowRequestMessage(wallet, quote))
      const id = confirmBorrow(quote, signature)
      if (id) router.push(`/loans/${id}`)
      else setError("This token already has a borrow on review")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Wallet did not sign the request")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Review borrow</h1>
          <p className="mono">{valid ?? "Invalid mint"}</p>
        </div>
      </header>
      <UtilityGate>
        {reserved ? (
          <div className="stack" style={{ maxWidth: 560 }}>
            <div className="notice" data-tone="locked">
              <strong>Borrow on review</strong>
              <p>This token is already reserved. A second borrow cannot be opened against it.</p>
            </div>
            <Link className="button button--primary" href={`/loans/${reserved.id}`}>
              View request
            </Link>
          </div>
        ) : quote ? (
          <div className="stack" style={{ maxWidth: 560 }}>
            <div className="notice">
              <strong>Wallet signature required</strong>
              <p>
                MetaMask will show a borrow request. Sign it to reserve this token. The request goes
                to review and does not transfer funds.
              </p>
            </div>
            <div className="panel">
              <h2>Terms</h2>
              <div className="list">
                <div className="list__row">
                  <span>Borrow</span>
                  <span>{eth(quote.borrowEth)}</span>
                </div>
                <div className="list__row">
                  <span>Collateral</span>
                  <span>
                    {quote.collateralAmount} {quote.symbol}
                  </span>
                </div>
                <div className="list__row">
                  <span>Collateral value</span>
                  <span>{usd(quote.collateralUsd)}</span>
                </div>
                <div className="list__row">
                  <span>Fee</span>
                  <span>{eth(quote.feeEth)}</span>
                </div>
                <div className="list__row">
                  <span>LTV</span>
                  <span>{(quote.ltvBps / 100).toFixed(1)}%</span>
                </div>
                <div className="list__row">
                  <span>Interest</span>
                  <span>{(quote.interestRateBps / 100).toFixed(1)}% APR</span>
                </div>
              </div>
            </div>
            {error ? (
              <div className="notice" data-tone="error">
                <strong>Could not submit</strong>
                <p>{error}</p>
              </div>
            ) : null}
            <button className="button button--primary" type="button" disabled={busy} onClick={() => void submit()}>
              {busy ? "Waiting for wallet…" : "Sign and submit"}
            </button>
          </div>
        ) : (
          <div className="empty">No quote to review. Start from a position.</div>
        )}
      </UtilityGate>
    </>
  )
}
