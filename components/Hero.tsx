import { BrandWordmark } from "@/components/BrandWordmark"
import { Icon } from "@/components/Icon"
import { project } from "@/config/project"

export function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero__edge-surface" aria-hidden="true" />
      <div className="hero__grid" aria-hidden="true" />
      <div className="hero__inner page-shell">
        <div className="eyebrow hero__eyebrow">
          <span className="status-light" />
          Utility liquidity for migrated tokens
          <span className="network-chip">Solana</span>
        </div>

        <BrandWordmark sourceLockup className="hero__source-wordmark" />

        <div className="hero__copy">
          <h1>
            Keep the position
            <span>Access the liquidity</span>
          </h1>
          <p>
            Borrow against supported migrated token positions without making a market sale your first move
          </p>
          <div className="hero__actions">
            <a className="button button--primary" href="#app">
              Launch App
              <Icon name="arrow" size={18} />
            </a>
            <a className="button button--ghost" href="#how-it-works">
              How It Works
            </a>
          </div>
          <div className="hero__secondary">
            <span className="brand-line">LEND <b>•</b> BORROW <b>•</b> BUILD</span>
            <a href={project.pumpUrl} target="_blank" rel="noreferrer">
              <Icon name="pump-fun" size={17} />
              Get LIEND on Pump.fun
              <Icon name="external-link" size={14} />
            </a>
          </div>
        </div>

        <div className="hero__proof" aria-label="Product route">
          <div>
            <span>01</span>
            <strong>POSITION</strong>
          </div>
          <i />
          <div>
            <span>02</span>
            <strong>BORROW</strong>
          </div>
          <i />
          <div>
            <span>03</span>
            <strong>SOL</strong>
          </div>
        </div>
      </div>
      <a className="scroll-cue" href="#product" aria-label="Scroll to product">
        <span>SCROLL TO EXPLORE</span>
        <Icon name="chevron" size={14} />
      </a>
    </section>
  )
}
