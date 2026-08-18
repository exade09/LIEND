"use client"

import { useEffect, useMemo, useState } from "react"
import { CopyButton } from "@/components/CopyButton"
import { Icon } from "@/components/Icon"
import { Modal } from "@/components/Modal"
import { shortenAddress } from "@/lib/addresses"
import { formatCompactCurrency, formatTimestamp } from "@/lib/formatting"
import { getLeaderboard } from "@/services/leaderboard"
import { getProtocolActivity } from "@/services/solana"
import type {
  DataEnvelope,
  LeaderboardMetric,
  LeaderboardPeriod,
  LeaderboardRow,
  ProtocolActivity,
} from "@/types"

const metrics: LeaderboardMetric[] = ["Borrow Volume", "Positions", "Activity"]
const periods: LeaderboardPeriod[] = ["24H", "7D", "30D", "ALL"]

export function Leaderboard() {
  const [metric, setMetric] = useState<LeaderboardMetric>("Borrow Volume")
  const [period, setPeriod] = useState<LeaderboardPeriod>("7D")
  const [leaderboard, setLeaderboard] = useState<DataEnvelope<LeaderboardRow[]> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)
  const [selectedWallet, setSelectedWallet] = useState<LeaderboardRow | null>(null)
  const [walletActivity, setWalletActivity] = useState<DataEnvelope<ProtocolActivity[]> | null>(null)
  const [walletActivityLoading, setWalletActivityLoading] = useState(false)
  const [walletActivityError, setWalletActivityError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void getLeaderboard({ metric, period, limit: 10 })
      .then((response) => {
        if (!cancelled) setLeaderboard(response)
      })
      .catch(() => {
        if (!cancelled) setError("Leaderboard analytics are unavailable")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [metric, period, requestVersion])

  useEffect(() => {
    if (!selectedWallet) return

    let cancelled = false

    void getProtocolActivity()
      .then((response) => {
        if (!cancelled) setWalletActivity(response)
      })
      .catch(() => {
        if (!cancelled) setWalletActivityError("Wallet activity is unavailable")
      })
      .finally(() => {
        if (!cancelled) setWalletActivityLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedWallet])

  const selectedActivity = useMemo(() => {
    if (!selectedWallet || !walletActivity) return []
    return walletActivity.data.filter((item) => item.wallet === selectedWallet.wallet)
  }, [selectedWallet, walletActivity])

  const selectMetric = (nextMetric: LeaderboardMetric) => {
    if (nextMetric === metric) return
    setLeaderboard(null)
    setError(null)
    setLoading(true)
    setMetric(nextMetric)
  }

  const selectPeriod = (nextPeriod: LeaderboardPeriod) => {
    if (nextPeriod === period) return
    setLeaderboard(null)
    setError(null)
    setLoading(true)
    setPeriod(nextPeriod)
  }

  const retryLeaderboard = () => {
    setLeaderboard(null)
    setError(null)
    setLoading(true)
    setRequestVersion((current) => current + 1)
  }

  const openWalletActivity = (row: LeaderboardRow) => {
    setWalletActivity(null)
    setWalletActivityError(null)
    setWalletActivityLoading(true)
    setSelectedWallet(row)
  }

  const closeWalletActivity = () => {
    setSelectedWallet(null)
    setWalletActivity(null)
    setWalletActivityError(null)
    setWalletActivityLoading(false)
  }

  return (
    <section
      className="leaderboard section-shell"
      id="leaderboard"
      aria-labelledby="leaderboard-title"
    >
      <header className="leaderboard__intro section-header">
        <p className="eyebrow section-eyebrow">PROTOCOL ANALYTICS</p>
        <h2 className="section-title" id="leaderboard-title">LIEND activity</h2>
        <p className="section-description">
          Compare public wallet activity across the selected analytics window
        </p>
      </header>

      <div className="leaderboard__panel">
        <div className="leaderboard__controls">
          <div className="leaderboard__metric-tabs" role="tablist" aria-label="Leaderboard metric">
            {metrics.map((item) => (
              <button
                className={metric === item ? "is-active" : ""}
                type="button"
                role="tab"
                aria-selected={metric === item}
                key={item}
                onClick={() => selectMetric(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="leaderboard__period-tabs" role="tablist" aria-label="Analytics period">
            {periods.map((item) => (
              <button
                className={period === item ? "is-active" : ""}
                type="button"
                role="tab"
                aria-selected={period === item}
                key={item}
                onClick={() => selectPeriod(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {leaderboard && !loading ? (
          <div className="data-provenance leaderboard__provenance">
            <span className="data-provenance__count">
              {period} WINDOW
            </span>
          </div>
        ) : null}

        <div className="leaderboard-table-wrap" aria-live="polite" aria-busy={loading}>
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Wallet</th>
                <th>Borrowed</th>
                <th>Active Collateral</th>
                <th>Positions</th>
                <th>Transactions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }, (_, index) => (
                    <tr className="skeleton-row" key={index} aria-hidden="true">
                      {Array.from({ length: 6 }, (__, cell) => <td key={cell}><span /></td>)}
                    </tr>
                  ))
                : leaderboard?.data.map((row) => (
                    <tr key={row.id}>
                      <td className="leaderboard-table__rank">
                        {row.rank.toString().padStart(2, "0")}
                      </td>
                      <td>
                        <div className="leaderboard-wallet">
                          <button
                            className="leaderboard-wallet__open"
                            type="button"
                            onClick={() => openWalletActivity(row)}
                            aria-label={`Open activity for ${row.wallet}`}
                          >
                            <span>{shortenAddress(row.wallet)}</span>
                            <Icon name="chevron" size={14} />
                          </button>
                          <CopyButton
                            value={row.wallet}
                            label="Copy wallet"
                            className="leaderboard-wallet__copy"
                          />
                        </div>
                      </td>
                      <td className="number-cell">{formatCompactCurrency(row.borrowedUsd)}</td>
                      <td className="number-cell">{formatCompactCurrency(row.activeCollateralUsd)}</td>
                      <td className="number-cell">{row.positions}</td>
                      <td className="number-cell">{row.transactions}</td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {!loading && error ? (
            <div className="empty-state leaderboard__empty" role="status">
              <Icon name="status" size={22} />
              <strong>Analytics unavailable</strong>
              <span>{error}</span>
              <button type="button" className="text-button" onClick={retryLeaderboard}>Retry</button>
            </div>
          ) : null}

          {!loading && !error && leaderboard?.data.length === 0 ? (
            <div className="empty-state leaderboard__empty" role="status">
              <Icon name="leaderboard" size={22} />
              <strong>No leaderboard activity</strong>
              <span>No wallet analytics are available for this period</span>
            </div>
          ) : null}
        </div>
      </div>

      <Modal
        open={Boolean(selectedWallet)}
        onClose={closeWalletActivity}
        eyebrow="PUBLIC WALLET ACTIVITY"
        title={selectedWallet ? shortenAddress(selectedWallet.wallet, 6, 6) : "Wallet activity"}
        size="wide"
      >
        {selectedWallet ? (
          <div className="wallet-activity-panel">
            <div className="wallet-activity-panel__identity">
              <div>
                <span className="wallet-activity-panel__label">WALLET</span>
                <code>{shortenAddress(selectedWallet.wallet, 8, 8)}</code>
              </div>
              <CopyButton value={selectedWallet.wallet} label="Copy wallet" />
            </div>

            <dl className="wallet-activity-panel__stats">
              <div>
                <dt>Borrowed</dt>
                <dd>{formatCompactCurrency(selectedWallet.borrowedUsd)}</dd>
              </div>
              <div>
                <dt>Active Collateral</dt>
                <dd>{formatCompactCurrency(selectedWallet.activeCollateralUsd)}</dd>
              </div>
              <div>
                <dt>Positions</dt>
                <dd>{selectedWallet.positions}</dd>
              </div>
              <div>
                <dt>Transactions</dt>
                <dd>{selectedWallet.transactions}</dd>
              </div>
            </dl>

            <div className="wallet-activity-panel__context">
              <span>{selectedWallet.period} ANALYTICS</span>
            </div>

            <div className="wallet-activity-panel__events" aria-live="polite" aria-busy={walletActivityLoading}>
              <h3>Public activity</h3>

              {walletActivityLoading ? (
                <div className="wallet-activity-panel__loading" role="status">
                  <span className="loading-spinner" aria-hidden="true" />
                  <span>Loading wallet activity</span>
                </div>
              ) : walletActivityError ? (
                <div className="empty-state wallet-activity-panel__empty" role="status">
                  <Icon name="status" size={20} />
                  <strong>Activity unavailable</strong>
                  <span>{walletActivityError}</span>
                </div>
              ) : selectedActivity.length > 0 ? (
                <ol>
                  {selectedActivity.map((item) => (
                    <li key={item.id}>
                      <span className="wallet-activity-panel__event-icon" aria-hidden="true">
                        <Icon name="transaction" size={16} />
                      </span>
                      <div>
                        <strong>{item.action}</strong>
                        <span>{item.asset}</span>
                      </div>
                      <time dateTime={item.timestamp}>{formatTimestamp(item.timestamp)}</time>
                      <strong>{item.value}</strong>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="empty-state wallet-activity-panel__empty" role="status">
                  <Icon name="transaction" size={20} />
                  <strong>No recent activity</strong>
                  <span>No matching events were returned for this wallet</span>
                </div>
              )}

              {walletActivity && !walletActivityLoading ? (
                <p className="wallet-activity-panel__notice">
                  {walletActivity.notice ?? "Activity supplied by the configured Solana provider"}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  )
}
