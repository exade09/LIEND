import { docsNeighbors, docsPageBySlug, docsPages } from "@/lib/gitbook"
import styles from "@/app/docs/docs.module.css"

export function DocsArticle({ slug }: { slug: string }) {
  const page = docsPageBySlug(slug)
  if (!page) return null
  const { previous, next } = docsNeighbors(slug)

  return (
    <div className={styles.shell}>
      <div className={styles.titlebar}>
        <span>STAYFI GitBook</span>
        <span>{page.kicker}</span>
      </div>
      <nav className={styles.nav} aria-label="Docs">
        {docsPages.map((item) => (
          <a
            key={item.href}
            href={item.href}
            aria-current={item.slug === page.slug ? "page" : undefined}
          >
            <small>{item.kicker}</small>
            {item.title}
          </a>
        ))}
      </nav>
      <article className={styles.article}>
        <p className={styles.kicker}>{page.kicker}</p>
        <h1>{page.title}</h1>
        <p className={styles.lede}>{page.summary}</p>
        {page.sections.map((section) => (
          <section className={styles.section} key={section.heading}>
            <h2>{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}
        <div className={styles.pager}>
          {previous ? <a href={previous.href}>Previous: {previous.title}</a> : <span />}
          {next ? <a href={next.href}>Next: {next.title}</a> : <span />}
        </div>
      </article>
    </div>
  )
}
