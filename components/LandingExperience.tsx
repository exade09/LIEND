"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

import { ActivityTape } from "@/components/ActivityTape"
import { CaPlaque } from "@/components/CaPlaque"
import { AddToChromeBadge, LaunchAppLink, ProductLink } from "@/components/ProductLink"
import { PhoneShowcase } from "@/components/PhoneShowcase"
import { PumpFunLink } from "@/components/PumpFunLink"
import { project } from "@/config/project"

import styles from "./LandingExperience.module.css"

const navigation = [
  { label: "Product", href: "#product" },
  { label: "Route", href: "#route" },
  { label: "Surfaces", href: "#surfaces" },
  { label: "FAQ", href: "#faq" },
] as const

const heroLetters = [
  { letter: "L", src: "/assets/wordmark/pixel/liend-l.png", width: 71, height: 87 },
  { letter: "I", src: "/assets/wordmark/pixel/liend-i.png", width: 30, height: 89 },
  { letter: "E", src: "/assets/wordmark/pixel/liend-e.png", width: 67, height: 89 },
  { letter: "N", src: "/assets/wordmark/pixel/liend-n.png", width: 79, height: 87 },
  { letter: "D", src: "/assets/wordmark/pixel/liend-d.png", width: 70, height: 87 },
] as const

const routeSteps = [
  { number: "01", title: "Read the position", body: "LIEND reads supported migrated token balances from the connected Solana wallet", badge: "Wallet context" },
  { number: "02", title: "Review the route", body: "The interface shows available liquidity, collateral context and the terms before anything is submitted", badge: "Clear terms" },
  { number: "03", title: "Borrow SOL", body: "Approve the prepared transaction and keep the underlying position while accessing SOL liquidity", badge: "Direct execution" },
] as const

const faqs = [
  { question: "What is LIEND", answer: "LIEND is a utility interface for borrowing against supported migrated token positions on Solana" },
  { question: "Why borrow instead of sell", answer: "Borrowing can provide liquidity while maintaining exposure to the underlying position, subject to collateral and liquidation risk" },
  { question: "What does the Chrome extension do", answer: "The extension adds a compact LIEND surface to the browser and pairs with the web app for supported account actions" },
  { question: "Where can I review a transaction", answer: "LIEND presents the route and terms before wallet approval, and published transactions can be inspected on Solscan" },
] as const

function PixelSprite({ kind, className = "" }: { kind: "key" | "coin" | "wallet"; className?: string }) {
  const name = `sprite${kind[0].toUpperCase()}${kind.slice(1)}`
  return <span className={`${styles.sprite} ${styles[name]} ${className}`} aria-hidden="true" />
}

function DropletMark({ className = "" }: { className?: string }) {
  return (
    <span className={`${styles.mark} ${className}`} aria-hidden="true">
      <Image src="/assets/logo/pixel/liend-mark.png" alt="" width={256} height={256} unoptimized />
    </span>
  )
}

export function LandingExperience() {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-liend-reveal]"))
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) entry.target.setAttribute("data-visible", "true")
        }
      },
      { rootMargin: "-6% 0px -10%", threshold: 0.12 },
    )
    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuOpen)
    return () => document.body.classList.remove("menu-open")
  }, [menuOpen])

  const moveHero = (event: React.PointerEvent<HTMLElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - box.left) / box.width - 0.5
    const y = (event.clientY - box.top) / box.height - 0.5
    event.currentTarget.style.setProperty("--pointer-x", x.toFixed(3))
    event.currentTarget.style.setProperty("--pointer-y", y.toFixed(3))
  }

  return (
    <div className={styles.site}>
      <ActivityTape />

      <header className={styles.header}>
        <a className={styles.brand} href="#top" aria-label="LIEND home">
          <DropletMark />
          <span>LIEND</span>
        </a>
        <nav className={styles.nav} aria-label="Primary navigation">
          {navigation.map((item) => <a href={item.href} key={item.href}>{item.label}</a>)}
        </nav>
        <div className={styles.headerActions}>
          <div className={styles.headerCa}><CaPlaque variant="header" /></div>
          <span className={styles.headerPlus} aria-hidden="true">+</span>
          <LaunchAppLink className={styles.headerLaunch}>Launch app</LaunchAppLink>
        </div>
        <div className={styles.mobileMenu} data-open={menuOpen ? "true" : "false"}>
          {navigation.map((item, index) => (
            <a href={item.href} key={item.href} onClick={() => setMenuOpen(false)}>
              <span>0{index + 1}</span>{item.label}
            </a>
          ))}
          <LaunchAppLink className={styles.mobileLaunch} onClick={() => setMenuOpen(false)}>Enter LIEND</LaunchAppLink>
        </div>
      </header>
      <button className={styles.menuButton} type="button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
        <span>{menuOpen ? "Close" : "Menu"}</span>
      </button>

      <main id="main-content">
        <section className={styles.hero} id="top" onPointerMove={moveHero} aria-labelledby="hero-title">
          <div className={styles.heroFluid} aria-hidden="true">
            <Image src="/assets/liend-hero-material-v2.png" alt="" fill sizes="100vw" priority />
          </div>
          <div className={styles.heroGrid} aria-hidden="true" />
          <PixelSprite kind="key" className={styles.heroKey} />
          <PixelSprite kind="coin" className={styles.heroCoin} />
          <PixelSprite kind="wallet" className={styles.heroWallet} />
          <div className={styles.heroCopy}>
            <h1 className={styles.heroWordmark} id="hero-title" aria-label="LIEND">
              <span className={styles.srOnly}>LIEND</span>
              {heroLetters.map((item, index) => (
                <Image
                  aria-hidden="true"
                  alt=""
                  className={styles.heroLetter}
                  data-letter={item.letter}
                  height={item.height}
                  key={item.letter}
                  src={item.src}
                  style={{ "--letter-index": index } as React.CSSProperties}
                  unoptimized
                  width={item.width}
                />
              ))}
            </h1>
            <p className={styles.eyebrow}>Liquidity for migrated positions on Solana</p>
            <p className={styles.heroLine}>Your position. Unstuck.</p>
            <p className={styles.heroSubline}>Borrow SOL without making a sale the first move</p>
            <div className={styles.heroButtons}>
              <LaunchAppLink className={styles.primaryButton}>Launch web app</LaunchAppLink>
              <AddToChromeBadge className={styles.secondaryButton} />
            </div>
          </div>
          <div className={styles.heroFoot}>
            <span>One route</span><span>Three surfaces</span><span>Wallet approved</span>
          </div>
        </section>

        <div className={styles.marquee} aria-label="LIEND product summary">
          <div>
            <span>KEEP THE POSITION</span><i /><span>ACCESS LIQUIDITY</span><i /><span>REVIEW EVERY ROUTE</span><i />
            <span>KEEP THE POSITION</span><i /><span>ACCESS LIQUIDITY</span><i /><span>REVIEW EVERY ROUTE</span>
          </div>
        </div>

        <section className={styles.allIn} id="product">
          <div className={styles.sectionIntro} data-liend-reveal>
            <p className={styles.eyebrow}>A focused utility layer</p>
            <h2>Your position<br />stays in view</h2>
            <p>Wallet context, borrow terms and transaction review live in one continuous LIEND route</p>
          </div>
          <div className={styles.orbitScene} data-liend-reveal>
            <div className={styles.orbit} aria-hidden="true"><span /><span /><span /></div>
            <PixelSprite kind="coin" className={styles.orbitCoin} />
            <div className={styles.routeWindow}>
              <header><span>LIEND / POSITION ROUTE</span><i>LIVE</i></header>
              <div className={styles.routeBalance}>
                <small>Available liquidity</small><strong>Ready when connected</strong><span>Calculated from supported wallet positions</span>
              </div>
              <div className={styles.routeRail}>
                <span data-active="true">Position</span><i /><span>Review</span><i /><span>SOL</span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.routeSection} id="route">
          <div className={styles.routeSticky}>
            <div className={styles.routeHeading} data-liend-reveal>
              <p className={styles.eyebrow}>The LIEND route</p>
              <h2>Liquidity without making a sale the first move</h2>
              <p>A legible path from a supported wallet position to a reviewed SOL borrow</p>
            </div>
            <div className={styles.routeIllustration} aria-hidden="true"><PixelSprite kind="key" /><DropletMark /></div>
          </div>
          <div className={styles.routeCards}>
            {routeSteps.map((step, index) => (
              <article className={styles.routeCard} key={step.number} data-liend-reveal style={{ "--card-index": index } as React.CSSProperties}>
                <div><span>{step.number}</span><small>{step.badge}</small></div>
                <h3>{step.title}</h3><p>{step.body}</p>
                <div className={styles.cardSignal} aria-hidden="true"><i /><i /><i /></div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.productDemo}>
          <div className={styles.demoHeader} data-liend-reveal>
            <p className={styles.eyebrow}>One clear interface</p><h2>Know the route before you enter</h2>
          </div>
          <div data-liend-reveal>
            <PhoneShowcase />
          </div>
          <div className={styles.demoStage} data-liend-reveal>
            <div className={styles.demoToolbar}>
              <span><DropletMark /> LIEND APP</span>
              <nav><i data-active="true">Overview</i><i>Positions</i><i>Loans</i></nav>
              <b>Connect wallet</b>
            </div>
            <div className={styles.demoBody}>
              <aside>
                <small>POSITION</small><strong>Supported token</strong><span>Wallet balance</span>
                <div className={styles.tokenGlyph}><DropletMark /></div>
              </aside>
              <div className={styles.demoQuote}>
                <p>Borrow route</p><h3>Position → SOL</h3>
                <dl>
                  <div><dt>Collateral</dt><dd>Read from wallet</dd></div>
                  <div><dt>Liquidity</dt><dd>Calculated in app</dd></div>
                  <div><dt>Approval</dt><dd>Wallet signature</dd></div>
                </dl>
                <LaunchAppLink className={styles.demoButton}>Review in app</LaunchAppLink>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.surfaces} id="surfaces">
          <div className={styles.surfacesTitle} data-liend-reveal>
            <p className={styles.eyebrow}>LIEND where you need it</p><h2>One utility<br />Three surfaces</h2>
          </div>
          <div className={styles.surfaceGrid}>
            <article className={styles.surfaceCard} data-tone="blue" data-liend-reveal>
              <div className={styles.surfaceArt}><PixelSprite kind="wallet" /></div>
              <span>01 / WEB APP</span><h3>The complete route</h3>
              <p>Positions, borrow review, active loans and repayments in one place</p>
              <LaunchAppLink className={styles.textLink}>Open app ↗</LaunchAppLink>
            </article>
            <article className={styles.surfaceCard} data-tone="lime" data-liend-reveal>
              <div className={styles.extensionMock}>
                <header><DropletMark /> LIEND</header>
                <div><span>Position</span><strong>Ready</strong></div><button type="button">Open LIEND</button>
              </div>
              <span>02 / CHROME</span><h3>Utility in the browser</h3>
              <p>Pair the extension with LIEND and keep the route close to the page</p>
              <AddToChromeBadge className={styles.textLink} />
            </article>
            <article className={styles.surfaceCard} data-tone="violet" data-liend-reveal>
              <div className={styles.docsArt} aria-hidden="true"><span>LIEND</span><span>ROUTES</span><span>RISK</span></div>
              <span>03 / DOCS</span><h3>Read before routing</h3>
              <p>Understand the product flow, collateral context and interface states</p>
              <ProductLink className={styles.textLink} href={project.docsUrl}>Read docs ↗</ProductLink>
            </article>
          </div>
        </section>

        <section className={styles.controlSection}>
          <div className={styles.controlCopy} data-liend-reveal>
            <p className={styles.eyebrow}>Designed for control</p><h2>Nothing moves until you approve it</h2>
            <p>LIEND keeps route context, terms and wallet approval in the same visual flow</p>
            <LaunchAppLink className={styles.lightButton}>Enter LIEND</LaunchAppLink>
          </div>
          <div className={styles.controlVisual} data-liend-reveal>
            <div className={styles.approvalCard}>
              <header><span>TRANSACTION REVIEW</span><i>READY</i></header>
              <div><small>Route</small><strong>Position → SOL</strong></div>
              <div><small>Network</small><strong>Solana</strong></div>
              <div><small>Status</small><strong>Waiting for wallet</strong></div>
              <span className={styles.approvalButton}>Approve in wallet</span>
            </div>
            <PixelSprite kind="key" className={styles.controlKey} />
          </div>
        </section>

        <section className={styles.faq} id="faq">
          <div className={styles.faqHeading} data-liend-reveal>
            <p className={styles.eyebrow}>Product questions</p><h2>Know the route before you enter</h2>
          </div>
          <div className={styles.faqList} data-liend-reveal>
            {faqs.map((item, index) => (
              <details key={item.question} open={index === 0}>
                <summary><span>0{index + 1}</span>{item.question}<i>+</i></summary><p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.finalCta}>
          <div className={styles.finalFluid} aria-hidden="true"><Image src="/assets/liend-final-material-v2.png" alt="" fill sizes="100vw" /></div>
          <PixelSprite kind="coin" className={styles.finalCoin} />
          <p className={styles.eyebrow}>Your position has another route</p>
          <h2>Put your liquidity<br />back in motion</h2>
          <div><LaunchAppLink className={styles.primaryButton}>Launch web app</LaunchAppLink><AddToChromeBadge className={styles.secondaryButton} /></div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <DropletMark /><strong>LIEND</strong><p>Utility liquidity for supported migrated token positions on Solana</p>
        </div>
        <div className={styles.footerLinks}>
          <div><span>Product</span><LaunchAppLink>Web app</LaunchAppLink><AddToChromeBadge /><ProductLink href={project.docsUrl}>Docs</ProductLink></div>
          <div><span>Network</span><PumpFunLink>Pump.fun</PumpFunLink><ProductLink href={project.xUrl}>X / Twitter</ProductLink><a href="#faq">FAQ</a></div>
        </div>
        <div className={styles.footerBottom}><CaPlaque variant="footer" /><span>LIEND / SOLANA / 2026</span></div>
      </footer>
    </div>
  )
}
