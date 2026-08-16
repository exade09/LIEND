import Image from "next/image"
import { Icon } from "@/components/Icon"
import { project } from "@/config/project"
import styles from "./FinalCTA.module.css"

export function FinalCTA() {
  const pumpDestination = project.pumpUrl || "#holder-access"

  return (
    <section
      className={styles.section}
      id="launch"
      aria-labelledby="final-cta-title"
    >
      <div className={styles.scene} aria-hidden="true">
        <div className={styles.coordinateField} />
        <picture className={styles.material}>
          <source
            media="(max-width: 640px)"
            srcSet="/assets/liend-final-material-mobile-v2.png"
          />
          <Image
            src="/assets/liend-final-material-v2.png"
            alt=""
            fill
            sizes="100vw"
          />
        </picture>
        <div className={styles.refraction} />
      </div>

      <div className={styles.frame} aria-hidden="true">
        <span>LIEND / SOLANA</span>
        <span>POSITION LIQUIDITY</span>
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
          <a className="button button--primary" href="#product-stage">
            Launch App
            <Icon name="arrow" size={18} />
          </a>
          <a
            className="button button--secondary"
            href={pumpDestination}
            target={project.pumpUrl ? "_blank" : undefined}
            rel={project.pumpUrl ? "noreferrer" : undefined}
          >
            <Icon name="pump-fun" size={18} />
            Get LIEND
          </a>
        </div>

        <nav className={styles.links} aria-label="LIEND external links">
          <a
            href={project.pumpUrl || "#"}
            target={project.pumpUrl ? "_blank" : undefined}
            rel={project.pumpUrl ? "noreferrer" : undefined}
            aria-disabled={!project.pumpUrl || undefined}
          >
            <Icon name="pump-fun" size={17} />
            Pump.fun
          </a>
          <a
            href={project.xUrl || "#"}
            target={project.xUrl ? "_blank" : undefined}
            rel={project.xUrl ? "noreferrer" : undefined}
            aria-disabled={!project.xUrl || undefined}
          >
            <Icon name="x" size={16} />
            X
          </a>
          <a
            href={project.docsUrl || "#"}
            target={project.docsUrl ? "_blank" : undefined}
            rel={project.docsUrl ? "noreferrer" : undefined}
            aria-disabled={!project.docsUrl || undefined}
          >
            <Icon name="docs" size={17} />
            Docs
          </a>
        </nav>
      </div>
    </section>
  )
}
