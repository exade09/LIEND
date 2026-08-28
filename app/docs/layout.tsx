import Image from "next/image"
import Link from "next/link"

import { ActivityTape } from "@/components/ActivityTape"
import { AddToChromeBadge, LaunchAppLink } from "@/components/ProductLink"
import styles from "./docs.module.css"

const headerLinks = [
  { href: "/#product", label: "Product" },
  { href: "/docs/how-it-works", label: "Route" },
  { href: "/docs/app", label: "App" },
  { href: "/docs/security", label: "Security" },
] as const

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.site}>
      <ActivityTape />

      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="LONS home">
          <Image src="/assets/lons-mark.png" alt="" width={72} height={72} priority />
          <span>LONS</span>
          <small>Docs</small>
        </Link>

        <nav className={styles.headerNav} aria-label="Documentation navigation">
          {headerLinks.map((item) => (
            <Link href={item.href} key={item.href}>{item.label}</Link>
          ))}
        </nav>

        <div className={styles.headerActions}>
          <Link className={styles.homeButton} href="/">Home</Link>
          <LaunchAppLink className={styles.launchButton}>
            Launch app <span aria-hidden="true">↗</span>
          </LaunchAppLink>
        </div>
      </header>

      <main className={styles.frame} id="main-content">
        {children}
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <Image src="/assets/lons-mark.png" alt="" width={128} height={128} />
          <strong>LONS</strong>
          <p>Utility liquidity for supported migrated token positions on Robinhood Chain</p>
        </div>

        <div className={styles.footerLinks}>
          <div>
            <span>Product</span>
            <LaunchAppLink className={`${styles.footerButton} ${styles.footerPrimary}`}>
              Web app <span aria-hidden="true">↗</span>
            </LaunchAppLink>
            <AddToChromeBadge className={`${styles.footerButton} ${styles.footerChrome}`} />
          </div>
          <div>
            <span>Read</span>
            <Link href="/docs">Overview</Link>
            <Link href="/docs/how-it-works">How it works</Link>
            <Link href="/docs/security">Security</Link>
            <Link href="/privacy">Privacy</Link>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <span>LONS / DOCS</span>
          <span>ROBINHOOD CHAIN / 2026</span>
        </div>
      </footer>
    </div>
  )
}
