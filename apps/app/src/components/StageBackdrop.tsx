import styles from "./StageBackdrop.module.css"

/** Full-viewport looping pixel sky — decorative only, never intercepts input. */
export function StageBackdrop() {
  return (
    <div className={styles.stage} aria-hidden="true">
      <div className={styles.ribbon} />
      <div className={styles.orbit}><i /><i /><i /></div>
      <div className={styles.grid} />
      <div className={styles.wash} />
    </div>
  )
}
