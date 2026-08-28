import Image from "next/image"
import Link from "next/link"

import { AtmosphereBackdrop } from "@/components/AtmosphereBackdrop"
import { LaunchAppLink } from "@/components/ProductLink"
import { docsNeighbors, docsPageBySlug, docsPages } from "@/lib/gitbook"
import styles from "@/app/docs/docs.module.css"

export function DocsArticle({ slug }: { slug: string }) {
  const page = docsPageBySlug(slug)
  if (!page) return null
  const { previous, next } = docsNeighbors(slug)
  const pageIndex = docsPages.findIndex((item) => item.slug === page.slug) + 1

  return (
    <div className={styles.shell}>
      <section className={styles.hero} aria-labelledby="docs-title">
        <AtmosphereBackdrop className={styles.atmosphere} tone={0.3} />
        <div className={styles.heroGrid} aria-hidden="true" />

        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>LONS / PRODUCT DOCUMENTATION</p>
          <h1 id="docs-title">{page.title}</h1>
          <p className={styles.lede}>{page.summary}</p>
          <div className={styles.heroActions}>
            <LaunchAppLink className={styles.heroPrimary}>
              Open LONS <span aria-hidden="true">↗</span>
            </LaunchAppLink>
            <Link className={styles.heroSecondary} href="/docs/security">
              Read security
            </Link>
          </div>
        </div>

        <div className={styles.heroMark} aria-hidden="true">
          <span className={styles.orbitOne} />
          <span className={styles.orbitTwo} />
          <Image src="/assets/lons-mark.png" alt="" width={1254} height={1254} priority />
          <small>0{pageIndex} / 0{docsPages.length}</small>
        </div>
      </section>

      <div className={styles.workspace}>
        <aside className={styles.navPanel}>
          <div className={styles.navHeading}>
            <span>Documentation</span>
            <b>{String(docsPages.length).padStart(2, "0")}</b>
          </div>
          <nav className={styles.nav} aria-label="Docs pages">
            {docsPages.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.slug === page.slug ? "page" : undefined}
              >
                <small>{String(index + 1).padStart(2, "0")}</small>
                <span>
                  <b>{item.title}</b>
                  <em>{item.kicker}</em>
                </span>
                <i aria-hidden="true">↗</i>
              </Link>
            ))}
          </nav>
          <div className={styles.navNote}>
            <span>Before you route</span>
            <p>Review product flow, wallet approval and security assumptions in one place</p>
          </div>
        </aside>

        <article className={styles.article}>
          <header className={styles.articleHeader}>
            <div>
              <p className={styles.kicker}>{page.kicker}</p>
              <h2>{page.title}</h2>
            </div>
            <span>LAST REVIEW / 2026</span>
          </header>

          <p className={styles.articleLede}>{page.summary}</p>

          <div className={styles.sections}>
            {page.sections.map((section, index) => (
              <section className={styles.section} data-tone={index % 3} key={section.heading}>
                <div className={styles.sectionNumber}>0{index + 1}</div>
                <div>
                  <h3>{section.heading}</h3>
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className={styles.pager}>
            {previous ? (
              <Link href={previous.href}>
                <small>Previous</small>
                <span>← {previous.title}</span>
              </Link>
            ) : <span />}
            {next ? (
              <Link href={next.href}>
                <small>Next</small>
                <span>{next.title} →</span>
              </Link>
            ) : <span />}
          </div>
        </article>
      </div>
    </div>
  )
}
