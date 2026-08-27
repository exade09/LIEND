"use client"

import { useEffect, type ReactNode } from "react"
import { Icon } from "@/components/Icon"

type ModalProps = {
  open: boolean
  onClose: () => void
  eyebrow?: string
  title: string
  children: ReactNode
  size?: "default" | "wide"
  className?: string
}

export function Modal({ open, onClose, eyebrow, title, children, size = "default", className }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", closeOnEscape)
    document.body.classList.add("modal-open")
    return () => {
      window.removeEventListener("keydown", closeOnEscape)
      document.body.classList.remove("modal-open")
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={["modal-panel", size === "wide" ? "modal-panel--wide" : "", className].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-panel__header">
          <div>
            {eyebrow ? <span className="overline">{eyebrow}</span> : null}
            <h2 id="modal-title">{title}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog" autoFocus>
            <Icon name="close" size={19} />
          </button>
        </header>
        <div className="modal-panel__body">{children}</div>
      </section>
    </div>
  )
}
