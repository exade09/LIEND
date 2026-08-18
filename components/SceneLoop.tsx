import styles from "./SceneLoop.module.css"

type SceneLoopProps = {
  src: string
  className?: string
}

export function SceneLoop({ src, className }: SceneLoopProps) {
  return (
    <div className={[styles.loop, className].filter(Boolean).join(" ")} aria-hidden="true">
      <img src={src} alt="" draggable={false} decoding="async" />
    </div>
  )
}
