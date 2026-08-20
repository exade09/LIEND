import styles from "./StageBackdrop.module.css"

/** Full-viewport pixel sky — decorative only, never intercepts input. */
export function StageBackdrop() {
  return (
    <div className={styles.stage} aria-hidden="true">
      <div className={styles.loop}>
        <img className={styles.tile} src="/assets/stage/pixel-sky.png" alt="" />
        <img className={styles.tile} src="/assets/stage/pixel-sky.png" alt="" />
      </div>
      <div className={styles.grid} />
      <div className={styles.scan} />
      <div className={styles.wash} />
    </div>
  )
}
