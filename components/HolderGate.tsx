"use client"

import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"
import { Icon } from "@/components/Icon"
import { ProductLink } from "@/components/ProductLink"
import { project } from "@/config/project"
import { shortenAddress } from "@/lib/addresses"
import {
  accessBalanceLabel,
  accessCopy,
  fetchHolderAccess,
  type HolderAccessDto,
} from "@/lib/holder-access"
import { discoverWallets, type DiscoveredWallet } from "@/lib/wallet"

type GateState = "NOT CONNECTED" | "CHECKING" | "ELIGIBLE" | "NOT ELIGIBLE" | "WRONG NETWORK"

const gateStates: GateState[] = ["NOT CONNECTED", "CHECKING", "ELIGIBLE", "NOT ELIGIBLE", "WRONG NETWORK"]

function stateFromAccess(access: HolderAccessDto): GateState {
  switch (access.state) {
    case "disconnected":
      return "NOT CONNECTED"
    case "holder-check-pending":
    case "error":
      return "CHECKING"
    case "token-not-launched":
    case "eligible":
      return "ELIGIBLE"
    case "not-eligible":
      return "NOT ELIGIBLE"
  }
}

const idleCopy: Record<GateState, string> = {
  "NOT CONNECTED": "Connect a Solana wallet to begin the eligibility check",
  CHECKING: "Checking LIEND balance and active access parameters",
  ELIGIBLE: "LIEND utility is available for this wallet",
  "NOT ELIGIBLE": "This wallet does not meet the LIEND holding requirement",
  "WRONG NETWORK": "Switch the wallet provider to the configured Solana network",
}

export function HolderGate() {
  const [state, setState] = useState<GateState>("NOT CONNECTED")
  const [message, setMessage] = useState("")
  const [balanceLabel, setBalanceLabel] = useState("--")
  const [walletLabel, setWalletLabel] = useState("Not connected")
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([])
  const [picking, setPicking] = useState(false)
  const [busy, setBusy] = useState<"connect" | "check" | null>(null)
  const [failed, setFailed] = useState(false)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const requestRef = useRef(0)

  const refreshWallets = useCallback(() => {
    const found = discoverWallets()
    setWallets(found)
    return found
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshWallets()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [refreshWallets])

  useEffect(() => {
    return () => unsubscribeRef.current?.()
  }, [])

  const resetGate = useCallback(() => {
    requestRef.current += 1
    unsubscribeRef.current?.()
    unsubscribeRef.current = null
    setPicking(false)
    setBusy(null)
    setFailed(false)
    setState("NOT CONNECTED")
    setMessage("")
    setBalanceLabel("--")
    setWalletLabel("Not connected")
    setWalletAddress(null)
  }, [])

  const resolveAccess = useCallback(async (address: string, cluster?: string) => {
    const requestId = ++requestRef.current
    setBusy("check")
    setFailed(false)
    setState("CHECKING")
    setMessage(idleCopy.CHECKING)
    setBalanceLabel("--")
    setWalletAddress(address)
    setWalletLabel(shortenAddress(address))

    if (cluster && cluster !== project.cluster) {
      if (requestId !== requestRef.current) return
      setState("WRONG NETWORK")
      setMessage(`Switch to Solana ${project.cluster}`)
      setBusy(null)
      return
    }

    const access = await fetchHolderAccess(address)
    if (requestId !== requestRef.current) return

    if (access.state === "error" || access.state === "holder-check-pending") {
      setState("CHECKING")
      setMessage(
        access.state === "holder-check-pending"
          ? "LIEND holdings could not be verified yet"
          : access.reason,
      )
      setFailed(true)
      setBusy(null)
      return
    }

    setState(stateFromAccess(access))
    setMessage(accessCopy(access))
    setBalanceLabel(accessBalanceLabel(access))
    setFailed(false)
    setBusy(null)
  }, [])

  const attachWallet = useCallback(
    (wallet: DiscoveredWallet, address: string, cluster?: string) => {
      unsubscribeRef.current?.()
      unsubscribeRef.current = wallet.onAccountChange
        ? wallet.onAccountChange((next) => {
            if (!next) {
              resetGate()
              return
            }
            void resolveAccess(next)
          })
        : null
      void resolveAccess(address, cluster)
    },
    [resetGate, resolveAccess],
  )

  const connectWallet = useCallback(
    async (wallet: DiscoveredWallet) => {
      setPicking(false)
      setBusy("connect")
      setFailed(false)
      setMessage("")
      try {
        const result = await wallet.connect()
        attachWallet(wallet, result.address, result.cluster)
      } catch (error) {
        setBusy(null)
        setState("NOT CONNECTED")
        setWalletLabel("Not connected")
        setWalletAddress(null)
        setMessage(error instanceof Error ? error.message : "Wallet connection failed")
      }
    },
    [attachWallet],
  )

  const startConnect = useCallback(() => {
    const found = refreshWallets()
    if (found.length === 0) {
      setMessage("No Solana wallet detected in this browser")
      return
    }
    if (found.length === 1 && found[0]) {
      void connectWallet(found[0])
      return
    }
    setPicking(true)
    setMessage("Choose a wallet provider")
  }, [connectWallet, refreshWallets])

  const retryCheck = useCallback(() => {
    if (walletAddress) {
      void resolveAccess(walletAddress)
      return
    }
    startConnect()
  }, [resolveAccess, startConnect, walletAddress])

  return (
    <section className="section holder-section" id="access">
      <div className="holder-section__glow" aria-hidden="true" />
      <div className="page-shell holder-layout">
        <div className="holder-copy">
          <div className="section-kicker">HOLDER ACCESS</div>
          <h2>Enter the <span className="accent-text">utility layer</span></h2>
          <p>LIEND utility is available after a connected wallet is verified</p>

          <div className="access-flow" aria-label="Access sequence">
            {[
              ["01", "Obtain LIEND after migration", "Open the official Pump.fun destination"],
              ["02", "Connect a Solana wallet", "Use a standard wallet provider"],
              ["03", "Verify the position", "Read balance through the configured adapter"],
              ["04", "Use LIEND utility", "Available after wallet verification"],
            ].map(([index, title, copy]) => (
              <div key={index}>
                <span>{index}</span>
                <i />
                <div><strong>{title}</strong><small>{copy}</small></div>
              </div>
            ))}
          </div>

          <ProductLink className="inline-link" href={project.pumpUrl}>
            <Icon name="pump-fun" size={18} />
            Open LIEND on Pump.fun
            <Icon name="external-link" size={14} />
          </ProductLink>
        </div>

        <div className="holder-gate-card">
          <div className="holder-gate-card__topline">
            <span><i /> ACCESS GATE</span>
          </div>

          <div className="gate-identity">
            <Image src="/assets/logo/pixel/liend-mark.png" alt="LIEND token" width={128} height={128} unoptimized />
            <div><span>REQUIRED POSITION</span><strong>LIEND</strong></div>
            <span className="network-chip">{project.network}</span>
          </div>

          <div className="state-preview-control">
            <label htmlFor="eligibility-state">Eligibility state</label>
            <select id="eligibility-state" value={state} disabled aria-readonly="true">
              {gateStates.map((item) => <option key={item}>{item}</option>)}
            </select>
            <small>
              {state === "NOT CONNECTED"
                ? "Resolved from the connected wallet"
                : "Resolved from this wallet and its LIEND holdings"}
            </small>
          </div>

          <dl className={`gate-readout ${state === "CHECKING" && !failed ? "is-checking" : ""}`}>
            <div>
              <dt><Icon name="liquidity" size={15} /> LIEND Balance</dt>
              <dd>{state === "CHECKING" && !failed ? <span className="skeleton-line" /> : balanceLabel}</dd>
            </div>
            <div>
              <dt><Icon name="status" size={15} /> Eligibility</dt>
              <dd>
                <span className={`eligibility eligibility--${state.toLowerCase().replaceAll(" ", "-")}`}>
                  {state === "CHECKING" && !failed ? <span className="button-spinner" /> : null}
                  {state}
                </span>
              </dd>
            </div>
            <div>
              <dt><Icon name="sol" size={15} /> Network</dt>
              <dd>{state === "WRONG NETWORK" ? "Unsupported network" : project.network}</dd>
            </div>
            <div>
              <dt><Icon name="wallet" size={15} /> Wallet</dt>
              <dd>{walletLabel}</dd>
            </div>
          </dl>

          <div className="gate-message">
            <Icon name="status" size={16} />
            <span>{message || idleCopy[state]}</span>
          </div>

          {picking ? (
            <div className="wallet-picker">
              {wallets.map((wallet) => (
                <button
                  className="button button--primary button--wide"
                  key={wallet.name}
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void connectWallet(wallet)}
                >
                  {busy === "connect" ? (
                    <><span className="button-spinner" /> Connecting</>
                  ) : (
                    <><Icon name="wallet" size={17} /> Connect {wallet.name}</>
                  )}
                </button>
              ))}
              <button className="button button--ghost button--wide" type="button" onClick={() => { setPicking(false); setMessage("") }}>
                Cancel
              </button>
            </div>
          ) : state === "ELIGIBLE" ? (
            <a className="button button--primary button--wide" href="#app">Enter App <Icon name="arrow" size={17} /></a>
          ) : state === "NOT ELIGIBLE" ? (
            <ProductLink className="button button--primary button--wide" href={project.pumpUrl}>Get LIEND <Icon name="external-link" size={15} /></ProductLink>
          ) : state === "WRONG NETWORK" ? (
            <button className="button button--primary button--wide" type="button" disabled>Switch to Solana</button>
          ) : state === "CHECKING" && busy === "check" && !failed ? (
            <button className="button button--primary button--wide" type="button" disabled>
              <span className="button-spinner" /> Checking LIEND Balance
            </button>
          ) : failed ? (
            <button className="button button--primary button--wide" type="button" onClick={retryCheck} disabled={busy !== null}>
              {busy ? <><span className="button-spinner" /> Checking</> : <>Retry check</>}
            </button>
          ) : (
            <button className="button button--primary button--wide" type="button" onClick={startConnect} disabled={busy !== null}>
              {busy === "connect" ? <><span className="button-spinner" /> Connecting</> : <><Icon name="wallet" size={17} /> Connect Wallet</>}
            </button>
          )}

          <p className="security-copy">LIEND never requests seed phrases, private keys or wallet passwords</p>
        </div>
      </div>
    </section>
  )
}
