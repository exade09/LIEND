"use client"

import { useMemo, useState } from "react"
import { Icon } from "@/components/Icon"
import { formatCompactCurrency, formatCurrency } from "@/lib/formatting"
import type { Market, MarketFilter } from "@/types"

type MarketExplorerProps = {
  markets: Market[]
  selectedId: string | null
  onSelect: (market: Market) => void
  loading?: boolean
}

const filters: MarketFilter[] = ["All", "Eligible", "Migrated", "Liquid"]

export function MarketExplorer({ markets, selectedId, onSelect, loading = false }: MarketExplorerProps) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<MarketFilter>("All")

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return markets.filter((market) => {
      const matchesSearch =
        !query ||
        market.name.toLowerCase().includes(query) ||
        market.ticker.toLowerCase().includes(query) ||
        market.mintAddress.toLowerCase().includes(query)
      const matchesFilter =
        filter === "All" ||
        (filter === "Eligible" && market.eligible) ||
        (filter === "Migrated" && market.migrationStatus === "Migrated") ||
        (filter === "Liquid" && market.liquid)
      return matchesSearch && matchesFilter
    })
  }, [filter, markets, search])

  return (
    <div className="market-explorer">
      <div className="market-tools">
        <label className="search-field">
          <Icon name="search" size={17} />
          <span className="sr-only">Search token or contract</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search token or contract"
          />
          {search ? (
            <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
              <Icon name="close" size={14} />
            </button>
          ) : null}
        </label>
        <div className="filter-tabs" role="tablist" aria-label="Market filters">
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={filter === item}
              className={filter === item ? "is-active" : ""}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="data-provenance">
        <span className="demo-badge">NOT LIVE</span>
        <span>Live market data is not connected</span>
        <span className="data-provenance__count">{filtered.length.toString().padStart(2, "0")} MARKETS</span>
      </div>

      <div className="market-table-wrap">
        <table className="market-table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Ticker</th>
              <th>Price</th>
              <th>Market Cap</th>
              <th>Liquidity</th>
              <th>24H Volume</th>
              <th>Position</th>
              <th>Borrowable</th>
              <th>Status</th>
              <th aria-label="Open market" />
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }, (_, index) => (
                  <tr key={`skeleton-${index}`} className="skeleton-row" aria-hidden="true">
                    {Array.from({ length: 10 }, (__, cell) => (
                      <td key={cell}><span /></td>
                    ))}
                  </tr>
                ))
              : filtered.map((market) => (
                  <tr key={market.id} className={selectedId === market.id ? "is-selected" : ""}>
                    <td>
                      <button className="asset-cell" type="button" onClick={() => onSelect(market)}>
                        <span className="token-avatar" style={{ "--token-accent": market.accent } as React.CSSProperties}>
                          {market.iconLabel}
                        </span>
                        <span>
                          <strong>{market.name}</strong>
                          <small>{market.migrationStatus}</small>
                        </span>
                      </button>
                    </td>
                    <td>{market.ticker}</td>
                    <td className="number-cell">{formatCurrency(market.priceUsd)}</td>
                    <td className="number-cell">{formatCompactCurrency(market.marketCapUsd)}</td>
                    <td className="number-cell">{formatCompactCurrency(market.liquidityUsd)}</td>
                    <td className="number-cell">{formatCompactCurrency(market.volume24hUsd)}</td>
                    <td className="muted-cell">Connect wallet</td>
                    <td className="number-cell">
                      {market.estimatedBorrowableUsd > 0
                        ? formatCompactCurrency(market.estimatedBorrowableUsd)
                        : "No route"}
                    </td>
                    <td>
                      <span className={`status-tag status-tag--${market.status.toLowerCase()}`}>
                        <i /> {market.status}
                      </span>
                    </td>
                    <td>
                      <button className="row-open" type="button" onClick={() => onSelect(market)} aria-label={`Open ${market.name}`}>
                        <Icon name="chevron" size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {!loading && filtered.length === 0 ? (
          <div className="empty-state">
            <Icon name="search" size={22} />
            <strong>No supported positions found</strong>
            <span>Try another token, ticker or contract</span>
            <button type="button" className="text-button" onClick={() => { setSearch(""); setFilter("All") }}>
              Reset filters
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
