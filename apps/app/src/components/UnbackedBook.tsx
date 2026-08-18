"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import {
  clearQuote,
  emptyBook,
  loadBook,
  loadQuote,
  openLoan,
  repayLoan,
  saveBook,
  saveQuote,
  type UnbackedBook,
  type UnbackedQuote,
} from "@/lib/unbacked-book"
import { useSession } from "./SessionProvider"

type BookApi = {
  book: UnbackedBook
  ready: boolean
  setQuote: (quote: UnbackedQuote) => void
  readQuote: () => UnbackedQuote | null
  confirmBorrow: (quote: UnbackedQuote) => string | null
  confirmRepay: (id: string) => void
}

const BookContext = createContext<BookApi | null>(null)

export function UnbackedBookProvider({ children }: { children: React.ReactNode }) {
  const { wallet } = useSession()
  const [book, setBook] = useState<UnbackedBook>(emptyBook)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setBook(loadBook(wallet))
    setReady(true)
  }, [wallet])

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
    (quote: UnbackedQuote) => {
      if (!wallet) return null
      const opened = openLoan(book, quote)
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
    () => ({ book, ready, setQuote, readQuote, confirmBorrow, confirmRepay }),
    [book, ready, setQuote, readQuote, confirmBorrow, confirmRepay],
  )

  return <BookContext.Provider value={value}>{children}</BookContext.Provider>
}

export function useUnbackedBook() {
  const context = useContext(BookContext)
  if (!context) throw new Error("useUnbackedBook must be used inside UnbackedBookProvider")
  return context
}
