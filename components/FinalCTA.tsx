import { Icon } from "@/components/Icon"
import { ExtensionCta, LaunchAppLink, ProductLink } from "@/components/ProductLink"
import { project } from "@/config/project"
import styles from "./FinalCTA.module.css"

export function FinalCTA() {

  return (
    <section
      className={styles.section}
      id="launch"
      aria-labelledby="final-cta-title"
    >
      <div className={styles.scene} aria-hidden="true">
        <div className={styles.refraction} />
      </div>

      <div className={styles.content}>
        <p className={styles.eyebrow}>
          LEND {"\u2022"} BORROW {"\u2022"} BUILD
        </p>
        <h2 className={styles.title} id="final-cta-title">
          <span className={styles.titleLine}>KEEP THE POSITION</span>
          {" "}
          <span className={styles.titleLine}>ACCESS THE LIQUIDITY</span>
        </h2>
        <p className={styles.copy}>
          A second route for supported migrated token positions on Solana
        </p>

        <div className={styles.actions}>
          <LaunchAppLink />
          <ExtensionCta className="button button--secondary" />
        </div>

        <nav className={styles.links} aria-label="LIEND external links">
          <ProductLink href={project.pumpUrl}>
            <Icon name="pump-fun" size={17} />
            Pump.fun
          </ProductLink>
          <ProductLink href={project.xUrl}>
            <Icon name="x" size={16} />
            X
          </ProductLink>
          <ProductLink href={project.docsUrl}>
            <Icon name="docs" size={17} />
            Docs
          </ProductLink>
        </nav>
      </div>
    </section>
  )
}
