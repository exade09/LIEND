import styles from "./StageBackdrop.module.css"

/** Full-viewport looping pixel sky — decorative only, never intercepts input. */
export function StageBackdrop() {
  return (
    <div className={styles.stage} aria-hidden="true">
      <video
        className={styles.sky}
        src="/assets/stage/pixel-sky-loop.mp4"
        poster="/assets/stage/pixel-sky-poster.png"
        autoPlay
        muted
        loop
        playsInline
      />
      <div className={styles.grid} />
      <div className={styles.scan} />
      <div className={styles.wash} />
    </div>
  )
}
