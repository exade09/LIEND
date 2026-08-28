"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"

import { ActivityTape } from "@/components/ActivityTape"
import { AtmosphereBackdrop } from "@/components/AtmosphereBackdrop"
import { CaPlaque } from "@/components/CaPlaque"
import { AddToChromeBadge, LaunchAppLink, ProductLink } from "@/components/ProductLink"
import { PhoneShowcase } from "@/components/PhoneShowcase"
import { PumpFunLink } from "@/components/PumpFunLink"
import { project } from "@/config/project"

import styles from "./LandingExperience.module.css"

const navigation = [
  { label: "Product", href: "#product", tone: "yellow" },
  { label: "Route", href: "#route", tone: "orange" },
  { label: "Surfaces", href: "#surfaces", tone: "green" },
  { label: "FAQ", href: "#faq", tone: "violet" },
] as const

type TransitionScene = {
  href: string
  tone: string
  snapshotHtml: string
  snapshotWidth: number
  snapshotScale: number
}

const heroLetters = ["S", "T", "A", "Y", "F", "I"] as const

const routeSteps = [
  { number: "01", title: "Read the position", body: "STAYFI reads supported migrated token balances from the connected Solana wallet", badge: "Wallet context" },
  { number: "02", title: "Review the route", body: "The interface shows available liquidity, collateral context and the terms before anything is submitted", badge: "Clear terms" },
  { number: "03", title: "Borrow SOL", body: "Approve the prepared transaction and keep the underlying position while accessing SOL liquidity", badge: "Direct execution" },
] as const

const faqs = [
  { question: "What is STAYFI", answer: "STAYFI is a utility interface for borrowing against supported migrated token positions on Solana" },
  { question: "Why borrow instead of sell", answer: "Borrowing can provide liquidity while maintaining exposure to the underlying position, subject to collateral and liquidation risk" },
  { question: "What does the Chrome extension do", answer: "The extension adds a compact STAYFI surface to the browser and pairs with the web app for supported account actions" },
  { question: "Where can I review a transaction", answer: "STAYFI presents the route and terms before wallet approval, and published transactions can be inspected on Solscan" },
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

function LiquidRibbon({ className, gradientId }: { className: string; gradientId: string }) {
  return (
    <svg className={`${styles.liquidRibbon} ${className}`} viewBox="0 0 360 360" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6ef6ff" />
          <stop offset="0.42" stopColor="#3387ff" />
          <stop offset="1" stopColor="#7651f5" />
        </linearGradient>
      </defs>
      <path
        className={styles.ribbonDepth}
        d="M-28 236C40 99 160 70 245 118c85 48 91 141 166 185"
      />
      <path
        className={styles.ribbonBody}
        d="M-28 218C40 81 160 52 245 100c85 48 91 141 166 185"
        stroke={`url(#${gradientId})`}
      />
      <path
        className={styles.ribbonHighlight}
        d="M-17 193C52 83 157 66 232 108c70 39 85 112 139 155"
      />
    </svg>
  )
}

function HeroArtifacts() {
  return (
    <div className={styles.heroArtifacts} aria-hidden="true">
      <LiquidRibbon className={styles.ribbonTop} gradientId="liend-ribbon-top" />
      <LiquidRibbon className={styles.ribbonBottom} gradientId="liend-ribbon-bottom" />

      <span className={`${styles.heroArtifact} ${styles.vectorKey}`}>
        <svg viewBox="0 0 160 160">
          <defs>
            <linearGradient id="liend-key-face" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.38" stopColor="#63f2ff" />
              <stop offset="0.72" stopColor="#3f7cff" />
              <stop offset="1" stopColor="#7950ef" />
            </linearGradient>
          </defs>
          <path
            className={styles.keyDepth}
            d="M94 18c-25 0-45 20-45 45 0 8 2 16 6 23l-40 40 17 17 12-12 11 11 17-17-11-11 13-13c6 4 13 6 20 6 25 0 45-20 45-45S119 18 94 18Zm0 27a18 18 0 1 1 0 36 18 18 0 0 1 0-36Z"
          />
          <path
            className={styles.keyFace}
            d="M94 12c-25 0-45 20-45 45 0 8 2 16 6 23l-40 40 17 17 12-12 11 11 17-17-11-11 13-13c6 4 13 6 20 6 25 0 45-20 45-45S119 12 94 12Zm0 27a18 18 0 1 1 0 36 18 18 0 0 1 0-36Z"
            fill="url(#liend-key-face)"
          />
          <path className={styles.keyShine} d="M78 25c23-14 49 1 52 23" />
        </svg>
      </span>

      <span className={`${styles.heroArtifact} ${styles.vectorCoin}`}>
        <i className={styles.coinRim} />
        <b>S</b>
        <i className={styles.coinGlint} />
      </span>

      <span className={`${styles.heroArtifact} ${styles.vectorWallet}`}>
        <i className={styles.walletCardBack} />
        <i className={styles.walletCardMid} />
        <span className={styles.walletFace}>
          <i className={styles.walletSignal} />
          <b>STAYFI</b>
          <i className={styles.walletClasp}><span /></i>
        </span>
      </span>
    </div>
  )
}

function MotionLabel({ children, hover = children }: { children: string; hover?: string }) {
  return (
    <>
      <span className={styles.motionLabel} aria-hidden="true">
        <span>{children}</span>
        <span>{hover}</span>
      </span>
      <span className={styles.srOnly}>{children}</span>
    </>
  )
}

function RevealHeadline({ lines }: { lines: readonly string[] }) {
  const accessibleLabel = lines.join(" ")

  return (
    <h2 aria-label={accessibleLabel} data-liend-headline data-liend-reveal>
      {lines.map((line, lineIndex) => {
        const words = line.split(" ")
        const middle = (words.length - 1) / 2

        return (
          <span className={styles.revealLine} aria-hidden="true" key={line}>
            {words.map((word, wordIndex) => (
              <span
                className={styles.revealWord}
                key={`${line}-${word}`}
                style={{
                  "--word-delay": `${90 + lineIndex * 85 + Math.abs(wordIndex - middle) * 90}ms`,
                } as React.CSSProperties}
              >
                <span>{word}</span>
              </span>
            ))}
          </span>
        )
      })}
    </h2>
  )
}

export function LandingExperience() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [introReady, setIntroReady] = useState(false)
  const [transition, setTransition] = useState<null | {
    href: string
    tone: string
    direction: "forward" | "backward"
    focusOffset: string
    targetIndex: number
    scenes: TransitionScene[]
  }>(null)
  const transitionTimers = useRef<number[]>([])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setIntroReady(true))
    })

    return () => {
      window.cancelAnimationFrame(frame)
      transitionTimers.current.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

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

  useEffect(() => {
    document.body.classList.toggle("liend-transition-open", Boolean(transition))
    return () => document.body.classList.remove("liend-transition-open")
  }, [transition])

  const moveHero = (event: React.PointerEvent<HTMLElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - box.left) / box.width - 0.5
    const y = (event.clientY - box.top) / box.height - 0.5
    event.currentTarget.style.setProperty("--pointer-x", x.toFixed(3))
    event.currentTarget.style.setProperty("--pointer-y", y.toFixed(3))
  }

  const routeToSection = (
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string,
    tone: string,
  ) => {
    if (
      event.defaultPrevented
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
      || event.button !== 0
    ) {
      return
    }

    const target = document.querySelector<HTMLElement>(href)
    if (!target) return
    event.preventDefault()
    setMenuOpen(false)
    const revealNodes = [
      ...(target.matches("[data-liend-reveal]") ? [target] : []),
      ...Array.from(target.querySelectorAll<HTMLElement>("[data-liend-reveal]")),
    ]

    const jump = () => {
      const root = document.documentElement
      const previousBehavior = root.style.scrollBehavior
      root.style.scrollBehavior = "auto"
      target.scrollIntoView({ block: "start" })
      root.style.scrollBehavior = previousBehavior
      window.history.pushState(null, "", href)
      window.dispatchEvent(new CustomEvent("liend:scene-enter", { detail: { href } }))
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      jump()
      return
    }

    if (transition) return
    transitionTimers.current.forEach((timer) => window.clearTimeout(timer))
    revealNodes.forEach((node) => node.removeAttribute("data-visible"))

    const compact = window.innerWidth <= 720
    const paneWidth = compact ? window.innerWidth * 0.65 : window.innerWidth * 0.33
    const sceneOrder = href === "#top"
      ? [{ label: "Home", href: "#top", tone: "blue" }, ...navigation.slice(0, 3)]
      : [...navigation]
    const targetIndex = Math.max(0, sceneOrder.findIndex((item) => item.href === href))
    const scenes = sceneOrder.flatMap<TransitionScene>((item) => {
      const sceneTarget = document.querySelector<HTMLElement>(item.href)
      if (!sceneTarget) return []

      const snapshot = sceneTarget.cloneNode(true) as HTMLElement
      snapshot.removeAttribute("id")
      if (snapshot.matches("[data-liend-reveal]")) snapshot.setAttribute("data-visible", "true")
      snapshot.querySelectorAll<HTMLElement>("[id]").forEach((node) => node.removeAttribute("id"))
      snapshot
        .querySelectorAll<HTMLElement>("[data-liend-reveal]")
        .forEach((node) => node.setAttribute("data-visible", "true"))
      snapshot
        .querySelectorAll<HTMLElement>("[data-visible=\"false\"]")
        .forEach((node) => node.setAttribute("data-visible", "true"))
      snapshot
        .querySelectorAll<HTMLElement>("a, button, input, select, textarea, summary, [tabindex]")
        .forEach((node) => node.setAttribute("tabindex", "-1"))

      const snapshotWidth = Math.max(sceneTarget.offsetWidth, 1)
      return [{
        href: item.href,
        tone: item.tone,
        snapshotHtml: snapshot.outerHTML,
        snapshotWidth,
        snapshotScale: paneWidth / snapshotWidth,
      }]
    })

    setTransition({
      href,
      tone,
      direction: target.getBoundingClientRect().top >= 0 ? "forward" : "backward",
      focusOffset: `-${(targetIndex + 0.5) * 25}%`,
      targetIndex,
      scenes,
    })
    transitionTimers.current = [
      window.setTimeout(jump, 940),
      window.setTimeout(() => {
        revealNodes.forEach((node) => node.setAttribute("data-visible", "true"))
      }, 1320),
      window.setTimeout(() => setTransition(null), 1680),
    ]
  }

  return (
    <div
      className={styles.site}
      data-intro-ready={introReady ? "true" : "false"}
      data-transitioning={transition ? "true" : "false"}
    >
      <ActivityTape />

      {transition && (
        <div
          className={styles.pageTransition}
          data-tone={transition.tone}
          data-direction={transition.direction}
          aria-hidden="true"
        >
          <div
            className={styles.transitionTrack}
            style={{ "--focus-offset": transition.focusOffset } as React.CSSProperties}
          >
            {transition.scenes.map((scene, index) => (
              <div
                className={styles.transitionPane}
                data-active={index === transition.targetIndex ? "true" : "false"}
                data-tone={scene.tone}
                key={`${scene.href}-${index}`}
              >
                <div className={styles.transitionSnapshot}>
                  <div
                    className={styles.transitionSnapshotCanvas}
                    style={{
                      width: scene.snapshotWidth,
                      transform: `scale(${scene.snapshotScale})`,
                    }}
                    dangerouslySetInnerHTML={{ __html: scene.snapshotHtml }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <header className={styles.header}>
        <a className={styles.brand} href="#top" aria-label="STAYFI home" onClick={(event) => routeToSection(event, "#top", "blue")}>
          <DropletMark />
          <span>STAYFI</span>
        </a>
        <nav className={styles.nav} aria-label="Primary navigation">
          {navigation.map((item) => (
            <a
              data-tone={item.tone}
              href={item.href}
              key={item.href}
              onClick={(event) => routeToSection(event, item.href, item.tone)}
            >
              <span className={styles.navLabel} aria-hidden="true">
                <span>{item.label}</span><span>{item.label}</span>
              </span>
              <span className={styles.srOnly}>{item.label}</span>
            </a>
          ))}
        </nav>
        <div className={styles.headerActions}>
          <div className={styles.headerCa}><CaPlaque variant="header" /></div>
          <span className={styles.headerPlus} aria-hidden="true">+</span>
          <LaunchAppLink className={styles.headerLaunch}><MotionLabel>Launch app</MotionLabel></LaunchAppLink>
        </div>
        <div className={styles.mobileMenu} data-open={menuOpen ? "true" : "false"}>
          {navigation.map((item, index) => (
            <a href={item.href} key={item.href} onClick={(event) => routeToSection(event, item.href, item.tone)}>
              <span>0{index + 1}</span>{item.label}
            </a>
          ))}
          <LaunchAppLink className={styles.mobileLaunch} onClick={() => setMenuOpen(false)}><MotionLabel>Enter STAYFI</MotionLabel></LaunchAppLink>
        </div>
      </header>
      <button className={styles.menuButton} type="button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
        <span>{menuOpen ? "Close" : "Menu"}</span>
      </button>

      <main id="main-content">
        <section className={`${styles.hero} ${styles.sceneWindow}`} id="top" onPointerMove={moveHero} aria-labelledby="hero-title">
          <div className={styles.heroGrid} aria-hidden="true" />
          <HeroArtifacts />
          <div className={styles.heroCopy}>
            <h1 className={styles.heroWordmark} id="hero-title" aria-label="STAYFI" data-intro="wordmark">
              <span className={styles.srOnly}>STAYFI</span>
              {heroLetters.map((letter, index) => (
                <span
                  className={styles.heroLetterSlot}
                  data-letter={letter.toUpperCase()}
                  key={`${letter}-${index}`}
                  style={{ "--letter-index": index } as React.CSSProperties}
                >
                  <span aria-hidden="true" className={styles.heroLetter} data-letter={letter}>{letter}</span>
                </span>
              ))}
            </h1>
            <p className={styles.eyebrow} data-intro="eyebrow">Liquidity for migrated positions on Solana</p>
            <p className={styles.heroSubline} data-intro="subline">Borrow SOL without making a sale the first move</p>
            <div className={styles.heroButtons} data-intro="actions">
              <LaunchAppLink className={styles.primaryButton}><MotionLabel>Launch web app</MotionLabel></LaunchAppLink>
              <AddToChromeBadge className={styles.secondaryButton} />
            </div>
          </div>
          <div className={styles.heroFoot}>
            <span>One route</span><span>Three surfaces</span><span>Wallet approved</span>
          </div>
        </section>

        <div className={styles.marquee} aria-label="STAYFI product summary">
          <div>
            <span>KEEP THE POSITION</span><i /><span>ACCESS LIQUIDITY</span><i /><span>REVIEW EVERY ROUTE</span><i />
            <span>KEEP THE POSITION</span><i /><span>ACCESS LIQUIDITY</span><i /><span>REVIEW EVERY ROUTE</span>
          </div>
        </div>

        <section className={`${styles.allIn} ${styles.sceneWindow}`} id="product">
          <AtmosphereBackdrop className={styles.atmosphereBackdrop} tone={0} />
          <div className={styles.sectionIntro} data-liend-reveal>
            <p className={styles.eyebrow}>A focused utility layer</p>
            <RevealHeadline lines={["Your position", "stays in view"]} />
            <p>Wallet context, borrow terms and transaction review live in one continuous STAYFI route</p>
          </div>
          <div className={styles.orbitScene} data-liend-reveal>
            <div className={styles.orbit} aria-hidden="true"><span /><span /><span /></div>
            <PixelSprite kind="coin" className={styles.orbitCoin} />
            <div className={styles.routeWindow}>
              <header><span>STAYFI / POSITION ROUTE</span><i>LIVE</i></header>
              <div className={styles.routeBalance}>
                <small>Available liquidity</small><strong>Ready when connected</strong><span>Calculated from supported wallet positions</span>
              </div>
              <div className={styles.routeRail}>
                <span data-active="true">Position</span><i /><span>Review</span><i /><span>SOL</span>
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.routeSection} ${styles.sceneWindow}`} id="route">
          <div className={styles.routeSticky}>
            <div className={styles.routeHeading} data-liend-reveal>
              <p className={styles.eyebrow}>The STAYFI route</p>
              <RevealHeadline lines={["Liquidity without", "making a sale", "the first move"]} />
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

        <section className={`${styles.productDemo} ${styles.sceneWindow}`} id="surfaces">
          <div className={styles.demoHeader} data-liend-reveal>
            <p className={styles.eyebrow}>One clear interface</p><RevealHeadline lines={["Know the route", "before you enter"]} />
          </div>
          <div data-liend-reveal>
            <PhoneShowcase />
          </div>
          <div className={styles.demoStage} data-liend-reveal>
            <div className={styles.demoToolbar}>
              <span><DropletMark /> STAYFI APP</span>
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
                <LaunchAppLink className={styles.demoButton}><MotionLabel>Review in app</MotionLabel></LaunchAppLink>
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.surfaces} ${styles.sceneWindow}`} id="surfaces-grid">
          <div className={styles.surfacesTitle} data-liend-reveal>
            <p className={styles.eyebrow}>STAYFI where you need it</p><RevealHeadline lines={["One utility", "Three surfaces"]} />
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
                <header><DropletMark /> STAYFI</header>
                <div><span>Position</span><strong>Ready</strong></div><button type="button">Open STAYFI</button>
              </div>
              <span>02 / CHROME</span><h3>Utility in the browser</h3>
              <p>Pair the extension with STAYFI and keep the route close to the page</p>
              <AddToChromeBadge className={styles.textLink} />
            </article>
            <article className={styles.surfaceCard} data-tone="violet" data-liend-reveal>
              <div className={styles.docsArt} aria-hidden="true"><span>STAYFI</span><span>ROUTES</span><span>RISK</span></div>
              <span>03 / DOCS</span><h3>Read before routing</h3>
              <p>Understand the product flow, collateral context and interface states</p>
              <ProductLink className={styles.textLink} href={project.docsUrl}>Read docs ↗</ProductLink>
            </article>
          </div>
        </section>

        <section className={`${styles.controlSection} ${styles.sceneWindow}`}>
          <AtmosphereBackdrop className={styles.atmosphereBackdrop} tone={0.45} />
          <div className={styles.controlCopy} data-liend-reveal>
            <p className={styles.eyebrow}>Designed for control</p><RevealHeadline lines={["Nothing moves", "until you approve it"]} />
            <p>STAYFI keeps route context, terms and wallet approval in the same visual flow</p>
            <LaunchAppLink className={styles.lightButton}><MotionLabel>Enter STAYFI</MotionLabel></LaunchAppLink>
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

        <section className={`${styles.faq} ${styles.sceneWindow}`} id="faq">
          <div className={styles.faqHeading} data-liend-reveal>
            <p className={styles.eyebrow}>Product questions</p><RevealHeadline lines={["Know the route", "before you enter"]} />
          </div>
          <div className={styles.faqList} data-liend-reveal>
            {faqs.map((item, index) => (
              <details key={item.question} open={index === 0}>
                <summary><span>0{index + 1}</span>{item.question}<i>+</i></summary><p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={`${styles.finalCta} ${styles.sceneWindow}`}>
          <AtmosphereBackdrop className={styles.atmosphereBackdrop} tone={1} />
          <div className={styles.finalFluid} aria-hidden="true"><Image src="/assets/liend-final-material-v2.png" alt="" fill sizes="100vw" /></div>
          <PixelSprite kind="coin" className={styles.finalCoin} />
          <p className={styles.eyebrow}>Your position has another route</p>
          <RevealHeadline lines={["Put your liquidity", "back in motion"]} />
          <div><LaunchAppLink className={styles.primaryButton}><MotionLabel>Launch web app</MotionLabel></LaunchAppLink><AddToChromeBadge className={styles.secondaryButton} /></div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <DropletMark /><strong>STAYFI</strong><p>Utility liquidity for supported migrated token positions on Solana</p>
        </div>
        <div className={styles.footerLinks}>
          <div>
            <span>Product</span>
            <LaunchAppLink className={`${styles.footerCta} ${styles.footerCtaPrimary}`}>Web app <span aria-hidden="true">{"\u2197"}</span></LaunchAppLink>
            <AddToChromeBadge className={`${styles.footerCta} ${styles.footerCtaChrome}`} />
            <ProductLink className={styles.footerCta} href={project.docsUrl}>Docs <span aria-hidden="true">{"\u2197"}</span></ProductLink>
          </div>
          <div>
            <span>Network</span>
            <PumpFunLink className={styles.footerNavLink}>Pump.fun</PumpFunLink>
            <ProductLink className={styles.footerNavLink} href={project.xUrl}>X / Twitter</ProductLink>
            <a className={styles.footerNavLink} href="#faq">FAQ</a>
          </div>
        </div>
        <div className={styles.footerBottom}><CaPlaque variant="footer" /><span>STAYFI / SOLANA / 2026</span></div>
      </footer>
    </div>
  )
}
