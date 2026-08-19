"use client"

import { useEffect, useState } from "react"

import styles from "./DeskClock.module.css"

const SEGMENTS: Record<string, string> = {
  "0": "abcdef",
  "1": "bc",
  "2": "abdeg",
  "3": "abcdg",
  "4": "bcfg",
  "5": "acdfg",
  "6": "acdefg",
  "7": "abc",
  "8": "abcdefg",
  "9": "abcdfg",
}

function pad(value: number) {
  return value.toString().padStart(2, "0")
}

function Digit({ value }: { value: string }) {
  const segs = SEGMENTS[value] ?? ""
  return (
    <span className={styles.digit} data-segs={segs} aria-hidden="true">
      <i data-seg="a" />
      <i data-seg="b" />
      <i data-seg="c" />
      <i data-seg="d" />
      <i data-seg="e" />
      <i data-seg="f" />
      <i data-seg="g" />
    </span>
  )
}

export function DeskClock() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    const tick = () => setNow(new Date())
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  const hours = now ? pad(now.getHours()) : "88"
  const minutes = now ? pad(now.getMinutes()) : "88"
  const colonOn = !now || now.getSeconds() % 2 === 0

  return (
    <div className={styles.clock} aria-hidden="true">
      <div className={styles.face}>
        <Digit value={hours[0] ?? "8"} />
        <Digit value={hours[1] ?? "8"} />
        <span className={`${styles.colon} ${colonOn ? styles.colonOn : ""}`}>
          <i />
          <i />
        </span>
        <Digit value={minutes[0] ?? "8"} />
        <Digit value={minutes[1] ?? "8"} />
      </div>
    </div>
  )
}
