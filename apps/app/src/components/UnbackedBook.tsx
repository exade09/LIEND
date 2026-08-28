"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { WalletPosition } from "@liend/domain"
import { getApiClient } from "@/lib/api"
import {
  clearQuote,
  DEFAULT_ETH_USD,
  emptyBook,
  loadBook,
  loadQuote,
  openLoan,
  repayLoan,
  saveBook,
  saveQuote,
  type UnbackedBook,
  type UnbackedPosition,
  type UnbackedQuote,
} from "@/lib/unbacked-book"
import { useSession } from "./SessionProvider"

type BookApi = {
  book: UnbackedBook
  ready: boolean
  loadingPositions: boolean
  positionsError: string | null
  setQuote: (quote: UnbackedQuote) => void
  readQuote: () => UnbackedQuote | null
  confirmBorrow: (quote: UnbackedQuote, signature: string) => string | null
  confirmRepay: (id: string) => void
}

const BookContext = createContext<BookApi | null>(null)

function toPosition(row: WalletPosition): UnbackedPosition {
  return {
    mint: row.mint,
    symbol: row.symbol,
    name: row.name,
    amount: row.amount,
    valueUsd: row.valueUsd ?? 0,
  }
}

export function UnbackedBookProvider({ children }: { children: React.ReactNode }) {
  const { wallet, authenticated, loading } = useSession()
  const [book, setBook] = useState<UnbackedBook>(emptyBook)
  const [ready, setReady] = useState(false)
  const [loadingPositions, setLoadingPositions] = useState(false)
  const [positionsError, setPositionsError] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return

    let cancelled = false
    const hydrate = async () => {
      await Promise.resolve()
      if (cancelled) return

      const local = loadBook(wallet)
      setBook(local)
      setPositionsError(null)

      if (!authenticated || !wallet) {
        setLoadingPositions(false)
        setReady(true)
        return
      }

      const client = getApiClient()
      if (!client) {
        setLoadingPositions(false)
        setReady(true)
        return
      }

      setLoadingPositions(true)
      setReady(true)

      try {
        const response = await client.walletPositions()
        if (cancelled) return
        setBook((current) => {
          const next: UnbackedBook = {
            ...current,
            positions: response.positions.map(toPosition),
            ethUsd: response.ethUsd ?? current.ethUsd ?? DEFAULT_ETH_USD,
          }
          saveBook(wallet, next)
          return next
        })
        setPositionsError(null)
      } catch (caught: unknown) {
        if (cancelled) return
        setBook((current) => {
          const next = { ...current }
          saveBook(wallet, next)
          return next
        })
        setPositionsError(caught instanceof Error ? caught.message : "Wallet positions could not be read")
      } finally {
        if (!cancelled) setLoadingPositions(false)
      }
    }

    void hydrate()

    return () => {
      cancelled = true
    }
  }, [authenticated, loading, wallet])

  const persist = useCallback(
    (next: UnbackedBook) => {
      setBook(next)
      if (wallet) saveBook(wallet, next)
    },
    [wallet],
  )

  const setQuote = useCallback(
    (quote: UnbackedQuote) => {
      if (wallet) saveQuote(wallet, quote)
    },
    [wallet],
  )

  const readQuote = useCallback(() => loadQuote(wallet), [wallet])

  const confirmBorrow = useCallback(
    (quote: UnbackedQuote, signature: string) => {
      if (!wallet || !signature) return null
      const opened = openLoan(book, quote, signature)
      if (!opened) return null
      persist(opened.book)
      clearQuote(wallet)
      return opened.loan.id
    },
    [book, persist, wallet],
  )

  const confirmRepay = useCallback(
    (id: string) => {
      persist(repayLoan(book, id))
    },
    [book, persist],
  )

  const value = useMemo<BookApi>(
    () => ({ book, ready, loadingPositions, positionsError, setQuote, readQuote, confirmBorrow, confirmRepay }),
    [book, ready, loadingPositions, positionsError, setQuote, readQuote, confirmBorrow, confirmRepay],
  )

  return <BookContext.Provider value={value}>{children}</BookContext.Provider>
}

export function useUnbackedBook() {
  const context = useContext(BookContext)
  if (!context) throw new Error("useUnbackedBook must be used inside UnbackedBookProvider")
  return context
}
