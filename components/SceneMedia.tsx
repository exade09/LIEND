"use client"

import styles from "./SceneMedia.module.css"

type SceneMediaProps = {
  src: string
  poster?: string
  className?: string
  pixelated?: boolean
}

export function SceneMedia({ src, poster, className, pixelated = false }: SceneMediaProps) {
  const isVideo = src.endsWith(".mp4")

  return (
    <div
      className={[styles.media, pixelated ? styles.pixelated : "", className].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
      {isVideo ? (
        <>
          {poster ? <img src={poster} alt="" draggable={false} /> : null}
          <video src={src} poster={poster} autoPlay muted loop playsInline />
        </>
      ) : (
        <img src={src} alt="" draggable={false} decoding="async" />
      )}
    </div>
  )
}
