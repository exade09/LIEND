import type { Metadata } from "next"

import { CaPlaque } from "@/components/CaPlaque"
import { Icon } from "@/components/Icon"
import { project } from "@/config/project"

import styles from "./soon.module.css"

/**
 * The holding page.
 *
 * Shown in place of every route while SITE_MODE is "soon", so the site can be
 * closed without tearing anything down: the landing, its API and the admin
 * console are all still there, and removing the variable brings them back.
 *
 * It carries the contract address because that is the one thing a visitor
 * arriving early actually needs from us, and it stays copyable here for the
 * same reason it is copyable in the header.
 */
export const metadata: Metadata = {
  title: "LONS",
  description: "Liquidity for migrated positions on Solana",
  robots: { index: false, follow: false },
}

export default function SoonPage() {
  return (
    <main className={styles.screen} id="main-content">
      <div className={styles.grid} aria-hidden="true" />

      <section className={styles.panel}>
        <h1 className={styles.wordmark}>LONS</h1>
        <p className={styles.soon}>SOON</p>
        <p className={styles.line}>Liquidity for migrated positions on Solana</p>

        <div className={styles.ca}>
          <CaPlaque variant="footer" />
        </div>

        {project.xUrl ? (
          <a
            className={styles.follow}
            href={project.xUrl}
            rel="noreferrer"
            target="_blank"
          >
            <Icon name="x" size={14} />
            <span>Follow on X</span>
          </a>
        ) : null}
      </section>

      <footer className={styles.footer}>LONS / SOLANA / 2026</footer>
    </main>
  )
}
