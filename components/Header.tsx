"use client"

import { ActivityTape } from "@/components/ActivityTape"
import { CaPlaque } from "@/components/CaPlaque"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { project } from "@/config/project"
import { Icon } from "@/components/Icon"
import { LaunchAppLink, ProductLink, AddToChromeBadge } from "@/components/ProductLink"

const navigation = [
  { label: "Product", href: "/#product" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Markets", href: "/#markets" },
  { label: "Onchain", href: "/#onchain" },
  { label: "FAQ", href: "/#faq" },
]

export function Header({ initialMint = null }: { initialMint?: string | null }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.body.classList.toggle("menu-open", open)
    return () => document.body.classList.remove("menu-open")
  }, [open])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [])

  return (
    <div className="chrome-top">
      <ActivityTape />
      <header className="site-header">
      <div className="header-ca-slot">
        <CaPlaque variant="header" initialMint={initialMint} />
      </div>
      <div className="nav-shell">
        <div className="nav-identity">
          <Link className="brand-compact" href="/" aria-label="Liend home" onClick={() => setOpen(false)}>
            <span className="brand-compact__avatar">
              <Image src="/assets/logo/pixel/liend-mark.png" alt="" width={128} height={128} unoptimized priority />
            </span>
            <span>Liend</span>
          </Link>
        </div>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {navigation.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="nav-actions">
          <ProductLink className="header-chip header-chip--pump" href={project.pumpUrl} aria-label="LIEND on Pump.fun">
            <Icon name="pump-fun" size={18} />
            <span>Pump.fun</span>
          </ProductLink>
          <ProductLink className="header-chip header-chip--docs" href={project.docsUrl} aria-label="LIEND Docs">
            <Icon name="docs" size={18} />
            <span>Docs</span>
          </ProductLink>
          <div className="nav-utility" aria-label="Social links">
            <ProductLink href={project.xUrl} aria-label="LIEND on X">
              <Icon name="x" size={15} />
              <span className="sr-only">X</span>
            </ProductLink>
          </div>
          <AddToChromeBadge />
          <LaunchAppLink className="button button--small button--primary launch-nav" />
          <span className="window-controls" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <button
            className="menu-button"
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((value) => !value)}
          >
            <Icon name={open ? "close" : "menu"} size={21} />
          </button>
        </div>
      </div>

      <div id="mobile-menu" className={`mobile-menu ${open ? "is-open" : ""}`} aria-hidden={!open}>
        <nav aria-label="Mobile navigation">
          {navigation.map((item, index) => (
            <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
              <span>0{index + 1}</span>
              {item.label}
              <Icon name="arrow" size={17} />
            </a>
          ))}
        </nav>
        <div className="mobile-menu__utility">
          <CaPlaque variant="menu" initialMint={initialMint} />
          <AddToChromeBadge />
          <ProductLink className="header-chip header-chip--pump" href={project.pumpUrl}>
            <Icon name="pump-fun" /> Pump.fun
          </ProductLink>
          <ProductLink className="header-chip header-chip--docs" href={project.docsUrl}>
            <Icon name="docs" /> Docs
          </ProductLink>
          <ProductLink href={project.xUrl}>
            <Icon name="x" /> X
          </ProductLink>
        </div>
          <LaunchAppLink className="button button--primary button--wide" onClick={() => setOpen(false)} />
        </div>
      </header>
    </div>
  )
}
