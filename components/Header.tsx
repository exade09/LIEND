"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { project } from "@/config/project"
import { Icon } from "@/components/Icon"

const navigation = [
  { label: "Product", href: "#product" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Markets", href: "#markets" },
  { label: "Onchain", href: "#onchain" },
  { label: "Leaderboard", href: "#leaderboard" },
  { label: "FAQ", href: "#faq" },
]

export function Header() {
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
    <header className="site-header">
      <div className="nav-shell">
        <a className="brand-compact" href="#top" aria-label="LIEND home" onClick={() => setOpen(false)}>
          <span className="brand-compact__avatar">
            <Image src="/assets/liend-avatar.png" alt="" width={32} height={32} priority />
          </span>
          <span>LIEND</span>
        </a>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {navigation.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="nav-actions">
          <div className="nav-utility" aria-label="Project links">
            <a href={project.pumpUrl} target="_blank" rel="noreferrer" aria-label="LIEND on Pump.fun">
              <Icon name="pump-fun" size={17} />
              <span>Pump.fun</span>
            </a>
            <a href={project.xUrl} target="_blank" rel="noreferrer" aria-label="LIEND on X">
              <Icon name="x" size={15} />
              <span className="sr-only">X</span>
            </a>
            <a href={project.docsUrl} target="_blank" rel="noreferrer" aria-label="LIEND Docs">
              <Icon name="docs" size={17} />
              <span className="sr-only">Docs</span>
            </a>
          </div>
          <a className="button button--small button--primary launch-nav" href="#product-stage">
            Launch App
          </a>
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
          <a href={project.pumpUrl} target="_blank" rel="noreferrer">
            <Icon name="pump-fun" /> Pump.fun
          </a>
          <a href={project.xUrl} target="_blank" rel="noreferrer">
            <Icon name="x" /> X
          </a>
          <a href={project.docsUrl} target="_blank" rel="noreferrer">
            <Icon name="docs" /> Docs
          </a>
        </div>
        <a className="button button--primary button--wide" href="#product-stage" onClick={() => setOpen(false)}>
          Launch App
        </a>
      </div>
    </header>
  )
}
