"use client"

import { useState } from "react"
import { Icon } from "@/components/Icon"
import {
  extensionCtaLabel,
  extensionInstallHref,
  LIEND_APP_URL,
  project,
  resolveAppUrl,
} from "@/config/project"

/**
 * External product link.
 *
 * Renders nothing when the destination is not configured. Relative paths
 * (the in-product GitBook at `/docs`) stay on this origin. Absolute http(s)
 * links open in a new tab.
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
  const external = /^https?:/i.test(href)
  return (
    <a
      className={className}
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      {...rest}
    >
      {children}
    </a>
  )
}

/**
 * Launch App / Enter App.
 *
 * Uses the configured App origin, or `app.` beside the current landing host.
 * Never falls back to localhost or a Vercel URL.
 */
export function LaunchAppLink({
  className = "button button--primary",
  children,
  onClick,
  ...rest
}: Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  children?: React.ReactNode
}) {
  const href = project.appUrl ?? resolveAppUrl() ?? LIEND_APP_URL
  const content = children ?? (
    <>
      Launch App
      <Icon name="arrow" size={17} />
    </>
  )

  return (
    <a
      className={className}
      href={href}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return
        }
        event.preventDefault()
        window.location.assign(href)
      }}
      {...rest}
    >
      {content}
    </a>
  )
}

/**
 * Extension CTA.
 *
 * `webstore` mode links directly to the published listing. `download` mode
 * remains available for development builds that ship an unpacked archive.
 */
export function ExtensionCta({ className = "button button--ghost" }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const label = extensionCtaLabel()
  const href = extensionInstallHref()

  if (project.extensionMode === "webstore") {
    return (
      <a className={className} href={href} target="_blank" rel="noreferrer">
        {label}
      </a>
    )
  }

  return (
    <>
      <button className={className} type="button" onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && <InstallGuide href={href} onClose={() => setOpen(false)} />}
    </>
  )
}

function ChromeMark() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#EA4335" d="M12 2a10 10 0 0 1 8.66 5H12z" />
      <path fill="#FBBC05" d="M20.66 7A10 10 0 0 1 12 22l-4.33-7.5H12z" />
      <path fill="#34A853" d="M12 22A10 10 0 0 1 3.34 7h8.66L7.67 14.5z" />
      <circle cx="12" cy="12" r="4.35" fill="#fff" />
      <circle cx="12" cy="12" r="2.7" fill="#4285F4" />
    </svg>
  )
}

/**
 * Header plaque: Chrome mark + "Add to Chrome". Production opens the
 * published Chrome Web Store listing in a new tab.
 */
export function AddToChromeBadge({ className }: { className?: string }) {
  const href = extensionInstallHref()
  const isArchive = project.extensionMode !== "webstore"

  return (
    <a
      className={["chrome-badge", className].filter(Boolean).join(" ")}
      href={href}
      {...(isArchive ? { download: "liend-extension.zip" } : { target: "_blank", rel: "noreferrer" })}
      aria-label="Add LONS to Chrome"
    >
      <ChromeMark />
      <span>Add to Chrome</span>
    </a>
  )
}

/**
 * Compact install guide.
 *
 * Kept in a dialog rather than permanently on the page: these are developer-
 * mode steps that only matter at the moment of installing, and the landing
 * should not carry standing technical instructions.
 */
function InstallGuide({ href, onClose }: { href: string; onClose: () => void }) {
  const steps = [
    "Download and extract the archive",
    "Open chrome://extensions",
    "Enable Developer mode",
    "Choose Load unpacked",
    "Select the extracted LONS folder",
  ]

  return (
    <div
      className="install-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Install the LONS extension"
      onClick={onClose}
    >
      <div className="install-panel" onClick={(event) => event.stopPropagation()}>
        <div className="install-panel__head">
          <span>Install LONS</span>
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

        <a className="button button--primary button--wide" href={href} download="liend-extension.zip">
          Download archive
          <Icon name="arrow" size={17} />
        </a>

        <p className="install-note">
          LONS is not yet on the Chrome Web Store, so this installs in developer mode.
        </p>
      </div>
    </div>
  )
}
