"use client"

import { useState } from "react"
import { Icon } from "@/components/Icon"
import { extensionCtaLabel, project } from "@/config/project"

/**
 * External product link.
 *
 * Renders nothing when the destination is not configured. That is deliberate:
 * the previous behaviour pointed unset links at service roots
 * (`https://pump.fun/`, `https://x.com/`), which reads to a visitor as an
 * official LIEND destination while going somewhere unrelated. A missing
 * affordance is honest; a misleading one is not.
 */
export function ProductLink({
  href,
  children,
  className,
  ...rest
}: Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  /** Null when the destination is not configured — the link is then omitted. */
  href: string | null
  children: React.ReactNode
  className?: string
}) {
  if (!href) return null
  return (
    <a className={className} href={href} target="_blank" rel="noreferrer" {...rest}>
      {children}
    </a>
  )
}

/**
 * Launch App.
 *
 * Uses the configured App origin. When unconfigured the control is rendered
 * disabled rather than navigating somewhere invented — and never falls back
 * to localhost or a Vercel URL.
 */
export function LaunchAppLink({ className = "button button--primary" }: { className?: string }) {
  if (!project.appUrl) {
    return (
      <span className={className} aria-disabled="true" title="LIEND App URL is not configured">
        Launch App
      </span>
    )
  }
  return (
    <a className={className} href={project.appUrl}>
      Launch App
      <Icon name="arrow" size={17} />
    </a>
  )
}

/**
 * Extension CTA.
 *
 * `download` mode (today, since no Web Store listing exists) opens concise
 * install steps alongside the archive download. `webstore` mode links
 * straight out. Switching is configuration only — no markup change here.
 */
export function ExtensionCta({ className = "button button--ghost" }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const label = extensionCtaLabel()

  if (!project.extensionUrl) {
    return (
      <span className={className} aria-disabled="true" title="Extension download is not configured">
        {label}
      </span>
    )
  }

  if (project.extensionMode === "webstore") {
    return (
      <a className={className} href={project.extensionUrl} target="_blank" rel="noreferrer">
        {label}
      </a>
    )
  }

  return (
    <>
      <button className={className} type="button" onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && <InstallGuide onClose={() => setOpen(false)} />}
    </>
  )
}

/**
 * Compact install guide.
 *
 * Kept in a dialog rather than permanently on the page: these are developer-
 * mode steps that only matter at the moment of installing, and the landing
 * should not carry standing technical instructions.
 */
function InstallGuide({ onClose }: { onClose: () => void }) {
  const steps = [
    "Download and extract the archive",
    "Open chrome://extensions",
    "Enable Developer mode",
    "Choose Load unpacked",
    "Select the extracted LIEND folder",
  ]

  return (
    <div
      className="install-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Install the LIEND extension"
      onClick={onClose}
    >
      <div className="install-panel" onClick={(event) => event.stopPropagation()}>
        <div className="install-panel__head">
          <span>Install LIEND</span>
          <button type="button" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>

        <ol className="install-steps">
          {steps.map((step, index) => (
            <li key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {step}
            </li>
          ))}
        </ol>

        <a className="button button--primary button--wide" href={project.extensionUrl ?? "#"} download>
          Download archive
          <Icon name="arrow" size={17} />
        </a>

        <p className="install-note">
          LIEND is not yet on the Chrome Web Store, so this installs in developer mode.
        </p>
      </div>
    </div>
  )
}
