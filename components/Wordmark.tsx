"use client"

import { useRef } from "react"
import Image from "next/image"

import { useLetterField } from "@/lib/useLetterField"
import { LETTER_BOXES, WORDMARK_ASPECT_RATIO } from "@/lib/wordmark"

import styles from "./Wordmark.module.css"

export function Wordmark() {
  const containerRef = useRef<HTMLDivElement>(null)
  useLetterField(containerRef)

  return (
    <div
      ref={containerRef}
      className={styles.wordmark}
      role="img"
      aria-label="LIEND"
      style={{ aspectRatio: WORDMARK_ASPECT_RATIO }}
    >
      {LETTER_BOXES.map((box) => (
        <span
          key={box.letter}
          data-letter={box.letter}
          className={styles.letter}
          aria-hidden="true"
          style={{
            left: `${box.left}%`,
            top: `${box.top}%`,
            width: `${box.width}%`,
            height: `${box.height}%`,
          }}
        >
          <Image
            src={`/assets/wordmark/liend-${box.letter}.webp`}
            alt=""
            fill
            sizes="(max-width: 780px) 45vw, 25vw"
            priority
            draggable={false}
          />
        </span>
      ))}
    </div>
  )
}
