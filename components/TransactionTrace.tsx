"use client"

import { useId, useMemo, useState } from "react"
import { CopyButton } from "@/components/CopyButton"
import { Icon } from "@/components/Icon"
import { shortenAddress } from "@/lib/addresses"
import type { TransactionTraceStep } from "@/types"

export type TransactionTraceView = "simple" | "full"

type TransactionTraceProps = {
  steps: TransactionTraceStep[]
  isDemo?: boolean
  defaultView?: TransactionTraceView
  title?: string
  compact?: boolean
  loading?: boolean
  className?: string
}

const simpleRoute = [
  { label: "POSITION", icon: "collateral" as const },
  { label: "BORROW", icon: "borrow" as const },
  { label: "ETH", icon: "eth" as const },
] as const

export function TransactionTrace({
  steps,
  defaultView = "simple",
  title = "Transaction Trace",
  compact = false,
  loading = false,
  className = "",
}: TransactionTraceProps) {
  const traceId = useId()
  const [view, setView] = useState<TransactionTraceView>(defaultView)
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(() => new Set())

  const traceDescription = useMemo(() => {
    if (loading) return "Loading transaction route"
    if (!steps.length) return "No transaction trace available"
    return view === "simple"
      ? "Simple route from token position to borrowed ETH"
      : `${steps.length} inspectable transaction stages`
  }, [loading, steps.length, view])

  const toggleStep = (stepId: string) => {
    setExpandedSteps((current) => {
      const next = new Set(current)
      if (next.has(stepId)) next.delete(stepId)
      else next.add(stepId)
      return next
    })
  }

  return (
    <section
      className={`transaction-trace ${compact ? "transaction-trace--compact" : ""} ${className}`.trim()}
      aria-labelledby={`${traceId}-title`}
    >
      <header className="transaction-trace__header">
        <div className="transaction-trace__heading">
          <span className="transaction-trace__icon" aria-hidden="true">
            <Icon name="transaction" size={18} />
          </span>
          <div>
            <h3 id={`${traceId}-title`}>{title}</h3>
            <p>{traceDescription}</p>
          </div>
        </div>

        <div className="transaction-trace__controls">
          <div className="trace-view-toggle" role="group" aria-label="Transaction trace detail">
            <button
              className={view === "simple" ? "is-active" : ""}
              type="button"
              aria-pressed={view === "simple"}
              onClick={() => setView("simple")}
            >
              SIMPLE
            </button>
            <button
              className={view === "full" ? "is-active" : ""}
              type="button"
              aria-pressed={view === "full"}
              onClick={() => setView("full")}
            >
              FULL
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="transaction-trace__loading" role="status" aria-live="polite">
          <span className="trace-loading-line" />
          <span className="trace-loading-line" />
          <span className="trace-loading-line" />
          <span className="sr-only">Loading transaction trace</span>
        </div>
      ) : !steps.length ? (
        <div className="transaction-trace__empty">
          <Icon name="transaction" size={22} />
          <strong>No transaction trace available</strong>
          <span>A route will appear after transaction parameters are prepared</span>
        </div>
      ) : view === "simple" ? (
        <ol className="trace-simple" aria-label="Simple transaction route">
          {simpleRoute.map((stage, index) => (
            <li className="trace-simple__stage" key={stage.label}>
              <span className="trace-simple__node">
                <Icon name={stage.icon} size={20} />
              </span>
              <strong>{stage.label}</strong>
              {index < simpleRoute.length - 1 ? (
                <Icon className="trace-simple__arrow" name="arrow" size={18} aria-hidden="true" />
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <ol className="trace-full" aria-label="Full transaction route">
          {steps.map((step, index) => {
            const stepKey = `${step.id}-${index}`
            const expanded = expandedSteps.has(stepKey)
            const detailsId = `${traceId}-step-${index}`

            return (
              <li
                className={`trace-step trace-step--${step.status.toLowerCase()} ${expanded ? "is-expanded" : ""}`}
                key={stepKey}
              >
                <div className="trace-step__rail" aria-hidden="true">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>
                <button
                  className="trace-step__summary"
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={detailsId}
                  onClick={() => toggleStep(stepKey)}
                >
                  <span className="trace-step__identity">
                    <strong>{step.label}</strong>
                    <small>{step.program}</small>
                  </span>
                  <span className="trace-step__value">{step.value}</span>
                  {step.status !== "DEMO" ? (
                    <span className={`trace-status trace-status--${step.status.toLowerCase()}`}>
                      <i aria-hidden="true" />
                      {step.status}
                    </span>
                  ) : null}
                  <Icon className="trace-step__chevron" name="chevron" size={16} aria-hidden="true" />
                </button>

                <div className="trace-step__details" id={detailsId} hidden={!expanded}>
                  <dl className="trace-step__metadata">
                    <div>
                      <dt>Program</dt>
                      <dd>{step.program}</dd>
                    </div>
                    <div>
                      <dt>Instruction</dt>
                      <dd>{step.instruction}</dd>
                    </div>
                    <div>
                      <dt>Value</dt>
                      <dd>{step.value}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{step.status === "DEMO" ? "—" : step.status}</dd>
                    </div>
                    <div>
                      <dt>Slot</dt>
                      <dd>{step.slot === null ? "Awaiting execution" : step.slot.toLocaleString("en-US")}</dd>
                    </div>
                    <div className="trace-step__signature">
                      <dt>Signature</dt>
                      <dd>
                        {step.signature ? (
                          <>
                            <code title={step.signature}>{shortenAddress(step.signature, 8, 8)}</code>
                            <CopyButton value={step.signature} label="Copy signature" />
                          </>
                        ) : (
                          "Awaiting execution"
                        )}
                      </dd>
                    </div>
                  </dl>

                  {step.details.filter((detail) => !/demo/i.test(detail)).length ? (
                    <ul className="trace-step__notes" aria-label={`${step.label} details`}>
                      {step.details.filter((detail) => !/demo/i.test(detail)).map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
