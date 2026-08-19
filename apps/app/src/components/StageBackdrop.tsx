import Image from "next/image"
import styles from "./StageBackdrop.module.css"

/** Full-viewport station sky — decorative only, never intercepts input. */
export function StageBackdrop() {
  return (
    <div className={styles.stage} aria-hidden="true">
      <div className={styles.drift}>
        <Image
          src="/assets/stage/ascent.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className={styles.image}
        />
      </div>
      <div className={styles.haze} />
      <div className={styles.flare} />
      <div className={styles.motes} />
      <div className={styles.wash} />
    </div>
  )
}
