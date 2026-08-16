"use client"

import { useEffect, useState } from "react"
import { BorrowPanel } from "@/components/BorrowPanel"
import { Icon } from "@/components/Icon"
import { MarketExplorer } from "@/components/MarketExplorer"
import { SectionHeading } from "@/components/SectionHeading"
import { SwapPanel } from "@/components/SwapPanel"
import { TokenDetail } from "@/components/TokenDetail"
import { TransactionTrace } from "@/components/TransactionTrace"
import { project } from "@/config/project"
import { getMigratedTokens } from "@/services/markets"
import { getTransactionTrace } from "@/services/solana"
import type { Market, TransactionTraceStep } from "@/types"

export type AppView = "markets" | "borrow" | "swap" | "trace"

type ApplicationProps = {
  initialView?: AppView
}

const appTabs: Array<{ id: AppView; label: string; icon: "token" | "borrow" | "swap" | "transaction" }> = [
  { id: "markets", label: "Markets", icon: "token" },
  { id: "borrow", label: "Borrow", icon: "borrow" },
  { id: "swap", label: "Swap", icon: "swap" },
  { id: "trace", label: "Trace", icon: "transaction" },
]

export function Application({ initialView }: ApplicationProps = {}) {
  const [view, setView] = useState<AppView>(initialView ?? "markets")
  const [markets, setMarkets] = useState<Market[]>([])
  const [selected, setSelected] = useState<Market | null>(null)
  const [trace, setTrace] = useState<TransactionTraceStep[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([getMigratedTokens(), getTransactionTrace("demo-tx-001")])
      .then(([marketEnvelope, traceEnvelope]) => {
        if (!active) return
        setMarkets(marketEnvelope.data)
        setSelected(marketEnvelope.data[0] ?? null)
        setTrace(traceEnvelope.data)
      })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  const openView = (nextView: AppView) => {
    setView(nextView)
    window.requestAnimationFrame(() => document.querySelector(".application-shell")?.scrollIntoView({ behavior: "smooth", block: "start" }))
  }

  return (
    <section className="section application-section" id="markets">
      <div className="page-shell">
        <SectionHeading
          index="04"
          eyebrow="MIGRATED MARKETS"
          title={<>Read the position <span className="accent-text">review the route</span></>}
          copy={<><p>Explore supported migrated tokens, configure collateral and inspect each step before a wallet request is built</p><span className="estimate-note"><Icon name="status" size={15} /> Testing interface with clearly separated demo adapters</span></>}
        />

        <div className="application-shell" id="app">
          <header className="application-bar">
            <div className="application-brand">
              <span>LIEND</span>
              <i />
              <small>APP PREVIEW</small>
            </div>
            <div className="application-status">
              <span><i /> {project.status.toUpperCase()}</span>
              <span>{project.network.toUpperCase()} · {project.cluster.toUpperCase()}</span>
              <button className="wallet-pill" type="button" disabled><Icon name="wallet" size={15} /> Wallet not connected</button>
            </div>
          </header>

          <nav className="application-nav" aria-label="Application navigation">
            <div>
              {appTabs.map((tab) => (
                <button key={tab.id} type="button" className={view === tab.id ? "is-active" : ""} onClick={() => setView(tab.id)}>
                  <Icon name={tab.icon} size={17} /> {tab.label}
                </button>
              ))}
            </div>
            <a href={project.docsUrl} target="_blank" rel="noreferrer"><Icon name="docs" size={17} /> Docs <Icon name="external-link" size={12} /></a>
          </nav>

          <div className="application-view">
            {view === "markets" ? (
              <>
                <div className="application-view__heading">
                  <div><span className="overline">MARKET EXPLORER</span><h3>Migrated markets</h3></div>
                  <p>Select a market to inspect its demonstration data and available actions</p>
                </div>
                <MarketExplorer markets={markets} selectedId={selected?.id ?? null} onSelect={setSelected} loading={loading} />
                {selected ? <TokenDetail market={selected} onBorrow={() => openView("borrow")} onSwap={() => openView("swap")} /> : !loading ? <div className="empty-state"><Icon name="token" /><strong>No supported positions found</strong></div> : null}
              </>
            ) : null}

            {view === "borrow" && selected ? <BorrowPanel market={selected} /> : null}
            {view === "swap" && selected ? <SwapPanel markets={markets} initialMarket={selected} /> : null}
            {view === "trace" ? (
              <div className="app-trace-view">
                <div className="application-view__heading"><div><span className="overline">ROUTE INSPECTOR</span><h3>Transaction Trace</h3></div><p>Switch between the user route and its complete onchain sequence</p></div>
                <TransactionTrace steps={trace} isDemo />
              </div>
            ) : null}
          </div>

          <footer className="application-footer">
            <span><i /> LOCAL MOCK ADAPTER</span>
            <span>No external API calls · No executable transactions</span>
          </footer>
        </div>
      </div>
    </section>
  )
}
