"use client"

import Image from "next/image"
import { useState } from "react"
import { Icon } from "@/components/Icon"
import { ProductLink } from "@/components/ProductLink"
import { project } from "@/config/project"
import { connectWallet } from "@/services/solana"

type PreviewState = "NOT CONNECTED" | "CHECKING" | "ELIGIBLE" | "NOT ELIGIBLE" | "WRONG NETWORK"

const previewStates: PreviewState[] = ["NOT CONNECTED", "CHECKING", "ELIGIBLE", "NOT ELIGIBLE", "WRONG NETWORK"]

export function HolderGate() {
  const [state, setState] = useState<PreviewState>("NOT CONNECTED")
  const [message, setMessage] = useState("")
  const [connecting, setConnecting] = useState(false)

  const tryConnect = async () => {
    setConnecting(true)
    setMessage("")
    const result = await connectWallet()
    setMessage(result.error ?? "Wallet provider ready")
    setConnecting(false)
  }

  const stateCopy: Record<PreviewState, string> = {
    "NOT CONNECTED": "Connect a Solana wallet to begin the eligibility check",
    CHECKING: "Checking LIEND balance and active access parameters",
    ELIGIBLE: "This wallet meets the LIEND holding requirement",
    "NOT ELIGIBLE": "This wallet does not meet the LIEND holding requirement",
    "WRONG NETWORK": "Switch the wallet provider to the configured Solana network",
  }

  return (
    <section className="section holder-section" id="access">
      <div className="holder-section__glow" aria-hidden="true" />
      <div className="page-shell holder-layout">
        <div className="holder-copy">
          <div className="section-kicker">HOLDER ACCESS</div>
          <h2>Enter the <span className="accent-text">utility layer</span></h2>
          <p>LIEND utility is available to eligible LIEND holders</p>

          <div className="access-flow" aria-label="Access sequence">
            {[
              ["01", "Obtain LIEND after migration", "Open the official Pump.fun destination"],
              ["02", "Connect a Solana wallet", "Use a standard wallet provider"],
              ["03", "Verify the position", "Read balance through the configured adapter"],
              ["04", "Use LIEND utility", "Available only after an eligible result"],
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
            <span className="demo-badge">ACCESS STATES</span>
          </div>

          <div className="gate-identity">
            <Image src="/assets/liend-avatar.png" alt="LIEND token" width={58} height={58} />
            <div><span>REQUIRED POSITION</span><strong>LIEND</strong></div>
            <span className="network-chip">{project.network}</span>
          </div>

          <div className="state-preview-control">
            <label htmlFor="eligibility-preview">Eligibility state</label>
            <select id="eligibility-preview" value={state} onChange={(event) => { setState(event.target.value as PreviewState); setMessage("") }}>
              {previewStates.map((item) => <option key={item}>{item}</option>)}
            </select>
            <small>Interface states — no wallet data is created</small>
          </div>

          <dl className={`gate-readout ${state === "CHECKING" ? "is-checking" : ""}`}>
            <div><dt><Icon name="liquidity" size={15} /> LIEND Balance</dt><dd>{state === "CHECKING" ? <span className="skeleton-line" /> : "--"}</dd></div>
            <div><dt><Icon name="status" size={15} /> Eligibility</dt><dd><span className={`eligibility eligibility--${state.toLowerCase().replaceAll(" ", "-")}`}>{state === "CHECKING" ? <span className="button-spinner" /> : null}{state}</span></dd></div>
            <div><dt><Icon name="sol" size={15} /> Network</dt><dd>{state === "WRONG NETWORK" ? "Unsupported network" : project.network}</dd></div>
            <div><dt><Icon name="wallet" size={15} /> Wallet</dt><dd>Provider required</dd></div>
          </dl>

          <div className="gate-message"><Icon name="status" size={16} /><span>{message || stateCopy[state]}</span></div>

          {state === "ELIGIBLE" ? (
            <a className="button button--primary button--wide" href="#app">Enter App <Icon name="arrow" size={17} /></a>
          ) : state === "NOT ELIGIBLE" ? (
            <ProductLink className="button button--primary button--wide" href={project.pumpUrl}>Get LIEND <Icon name="external-link" size={15} /></ProductLink>
          ) : state === "WRONG NETWORK" ? (
            <button className="button button--primary button--wide" type="button" disabled>Switch to Solana</button>
          ) : state === "CHECKING" ? (
            <button className="button button--primary button--wide" type="button" disabled><span className="button-spinner" /> Checking LIEND Balance</button>
          ) : (
            <button className="button button--primary button--wide" type="button" onClick={tryConnect} disabled={connecting}>
              {connecting ? <><span className="button-spinner" /> Connecting</> : <><Icon name="wallet" size={17} /> Connect Wallet</>}
            </button>
          )}

          <p className="security-copy">LIEND never requests seed phrases, private keys or wallet passwords</p>
        </div>
      </div>
    </section>
  )
}
