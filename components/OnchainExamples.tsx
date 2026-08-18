"use client"

import { useState } from "react"
import { CopyButton } from "@/components/CopyButton"
import { Icon } from "@/components/Icon"
import { Modal } from "@/components/Modal"
import { SectionHeading } from "@/components/SectionHeading"
import { TransactionTrace } from "@/components/TransactionTrace"
import { demoTransactions } from "@/data/demoTransactions"
import { getExplorerTransactionUrl, shortenAddress } from "@/lib/addresses"
import { formatCurrency, formatNumber, formatSol, formatTimestamp } from "@/lib/formatting"
import type { DemoTransaction } from "@/types"

function isFixtureWalletOwner(owner: string, transaction: DemoTransaction) {
  return (
    owner.includes("...") &&
    owner.startsWith(transaction.wallet.slice(0, 4)) &&
    owner.endsWith(transaction.wallet.slice(-4))
  )
}

function TransactionIdentity({ transaction }: { transaction: DemoTransaction }) {
  return (
    <div className="onchain-detail__identity">
      <div className="onchain-detail__field">
        <span className="data-label">WALLET</span>
        <div>
          <code title={transaction.wallet}>{shortenAddress(transaction.wallet, 7, 7)}</code>
          <CopyButton value={transaction.wallet} label="Copy wallet" />
        </div>
      </div>
      <div className="onchain-detail__field onchain-detail__field--signature">
        <span className="data-label">TRANSACTION SIGNATURE</span>
        <div>
          <code title={transaction.signature}>{shortenAddress(transaction.signature, 9, 9)}</code>
          <CopyButton value={transaction.signature} label="Copy signature" />
        </div>
      </div>
    </div>
  )
}

function TransactionChanges({ transaction }: { transaction: DemoTransaction }) {
  return (
    <div className="onchain-changes">
      <section className="onchain-changes__group" aria-labelledby="token-changes-title">
        <header>
          <Icon name="token" size={17} />
          <h3 id="token-changes-title">Token changes</h3>
        </header>
        <ul>
          {transaction.tokenChanges.map((change, index) => {
            const walletOwner = isFixtureWalletOwner(change.owner, transaction)
            return (
              <li key={`${change.owner}-${change.ticker}-${index}`}>
                <div className="onchain-change__owner">
                  <span>{walletOwner ? shortenAddress(transaction.wallet) : change.owner}</span>
                  {walletOwner ? (
                    <CopyButton value={transaction.wallet} label="Copy wallet" />
                  ) : null}
                </div>
                <strong className={change.amount >= 0 ? "is-positive" : "is-negative"}>
                  {change.amount >= 0 ? "+" : ""}{formatNumber(change.amount, 4)} {change.ticker}
                </strong>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="onchain-changes__group" aria-labelledby="sol-changes-title">
        <header>
          <Icon name="sol" size={17} />
          <h3 id="sol-changes-title">SOL changes</h3>
        </header>
        <ul>
          {transaction.solChanges.map((change, index) => {
            const walletOwner = isFixtureWalletOwner(change.owner, transaction)
            return (
              <li key={`${change.owner}-${index}`}>
                <div className="onchain-change__owner">
                  <span>{walletOwner ? shortenAddress(transaction.wallet) : change.owner}</span>
                  {walletOwner ? (
                    <CopyButton value={transaction.wallet} label="Copy wallet" />
                  ) : null}
                </div>
                <strong className={change.amountSol >= 0 ? "is-positive" : "is-negative"}>
                  {change.amountSol >= 0 ? "+" : ""}{formatSol(change.amountSol)}
                </strong>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

export function OnchainExamples() {
  const [selectedTransaction, setSelectedTransaction] = useState<DemoTransaction | null>(null)

  return (
    <section
      className="onchain-examples section-shell"
      id="onchain-examples"
      aria-labelledby="onchain-examples-title"
    >
      <SectionHeading
        index="06"
        eyebrow="ONCHAIN EXAMPLES"
        title={<span id="onchain-examples-title">See it onchain</span>}
        copy={
          <p>
            Inspect the complete route from wallet approval to SOL settlement
          </p>
        }
      />

      <div className="onchain-examples__provenance">
        <span>{String(demoTransactions.length).padStart(2, "0")} ROUTES</span>
      </div>

      <div className="onchain-examples__grid">
        {demoTransactions.map((transaction, index) => (
          <article className="onchain-card" key={transaction.id}>
            <header className="onchain-card__header">
              <div className="onchain-card__index">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <span className="data-label">ASSET</span>
                  <h3>{transaction.asset}</h3>
                </div>
              </div>
              <span className="trace-status">
                <i aria-hidden="true" />
                CONFIRMED
              </span>
            </header>

            <div className="onchain-card__wallet">
              <span className="data-label">WALLET</span>
              <div>
                <code title={transaction.wallet}>{shortenAddress(transaction.wallet, 6, 6)}</code>
                <CopyButton value={transaction.wallet} label="Copy wallet" />
              </div>
            </div>

            <dl className="onchain-card__metrics">
              <div>
                <dt>Collateral Value</dt>
                <dd>{formatCurrency(transaction.collateralValueUsd)}</dd>
              </div>
              <div>
                <dt>Borrow Value</dt>
                <dd>{formatCurrency(transaction.borrowValueUsd)}</dd>
              </div>
              <div>
                <dt>SOL Received</dt>
                <dd>{formatSol(transaction.solReceived)}</dd>
              </div>
              <div>
                <dt>Instructions</dt>
                <dd>{formatNumber(transaction.instructionCount, 0)}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>Confirmed</dd>
              </div>
            </dl>

            <button
              className="button button--ghost onchain-card__action"
              type="button"
              onClick={() => setSelectedTransaction(transaction)}
            >
              <Icon name="transaction" size={17} />
              Open Trace
              <Icon name="arrow" size={15} />
            </button>
          </article>
        ))}
      </div>

      <Modal
        open={selectedTransaction !== null}
        onClose={() => setSelectedTransaction(null)}
        eyebrow="ROUTE"
        title={selectedTransaction ? `${selectedTransaction.asset} borrow route` : "Borrow route"}
        size="wide"
      >
        {selectedTransaction ? (
          <div className="onchain-detail">
            <TransactionIdentity transaction={selectedTransaction} />

            <dl className="onchain-detail__metadata">
              <div>
                <dt>Slot</dt>
                <dd>{formatNumber(selectedTransaction.slot, 0)}</dd>
              </div>
              <div>
                <dt>Block time</dt>
                <dd>{formatTimestamp(selectedTransaction.blockTime)}</dd>
              </div>
              <div>
                <dt>Asset</dt>
                <dd>{selectedTransaction.asset}</dd>
              </div>
              <div>
                <dt>Instructions</dt>
                <dd>{formatNumber(selectedTransaction.instructionCount, 0)}</dd>
              </div>
              <div>
                <dt>Collateral</dt>
                <dd>{formatCurrency(selectedTransaction.collateralValueUsd)}</dd>
              </div>
              <div>
                <dt>SOL received</dt>
                <dd>{formatSol(selectedTransaction.solReceived)}</dd>
              </div>
            </dl>

            <section className="onchain-programs" aria-labelledby="onchain-programs-title">
              <header>
                <span className="data-label">PROGRAMS</span>
                <h3 id="onchain-programs-title">Program interactions</h3>
              </header>
              <ul>
                {selectedTransaction.programs.map((program, index) => (
                  <li key={`${program}-${index}`}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {program}
                  </li>
                ))}
              </ul>
            </section>

              <TransactionTrace
                key={selectedTransaction.id}
                steps={selectedTransaction.trace}
                defaultView="full"
                compact
              />

            <TransactionChanges transaction={selectedTransaction} />

            <div className="onchain-detail__footer">
              <a
                className="button button--ghost"
                href={getExplorerTransactionUrl(selectedTransaction.signature)}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="explorer" size={17} />
                View on Solscan
                <Icon name="external-link" size={14} />
              </a>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  )
}
