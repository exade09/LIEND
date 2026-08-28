import styles from "./Wordmark.module.css"

export function Wordmark() {
  return (
    <div
      className={styles.wordmark}
      role="img"
      aria-label="STAYFI"
      style={{ aspectRatio: "3 / 1" }}
    >
      <span className={styles.text} aria-hidden="true">STAYFI</span>
    </div>
  )
}
