"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AccessSummary } from "./AccessSummary"

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/positions", label: "Positions" },
  { href: "/loans", label: "Loans" },
  { href: "/activity", label: "Activity" },
  { href: "/settings", label: "Settings" },
] as const

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppHeader() {
  const pathname = usePathname()

  return (
    <header className="app-bar">
      <Link className="wordmark" href="/" aria-label="Liend App home">
        <Image
          src="/assets/logo/pixel/liend-mark.png"
          alt=""
          width={64}
          height={64}
          unoptimized
          priority
        />
        Liend App
      </Link>

      <nav className="nav-pill" aria-label="Liend App">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} aria-current={isCurrent(pathname, item.href) ? "page" : undefined}>
            {item.label}
          </Link>
        ))}
      </nav>

      <AccessSummary />
    </header>
  )
}
