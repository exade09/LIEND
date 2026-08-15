"use client"

import { useRef, useState } from "react"
import { Icon } from "@/components/Icon"

type CopyButtonProps = {
  value: string
  label?: string
  className?: string
}

export function CopyButton({ value, label = "Copy", className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      className={`copy-button ${copied ? "is-copied" : ""} ${className}`}
      type="button"
      onClick={copy}
      aria-label={`${label}: ${value}`}
    >
      <Icon name={copied ? "check" : "copy"} size={14} />
      <span>{copied ? "Copied" : label}</span>
    </button>
  )
}
