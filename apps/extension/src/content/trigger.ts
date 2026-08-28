/**
 * The LIEND trigger.
 *
 * Constraints this implementation holds to:
 *  - One element, clearly labelled LIEND. It does not imitate pump.fun's own
 *    controls, and does not present itself as part of the host product.
 *  - Fixed to the lower-left, away from the buy/sell controls that live in the
 *    right-hand trade panel. It never reparents, restyles or removes host
 *    content, and never intercepts host events.
 *  - Rendered inside a closed shadow root, so LIEND styles and host styles
 *    cannot leak into each other in either direction.
 *  - The panel opens only from this explicit click. Chrome requires a user
 *    gesture for `sidePanel.open()`, so an automatic reveal is not possible
 *    even if we wanted one.
 */

const HOST_ID = "liend-trigger-root"

export function mountTrigger(onOpen: () => void): () => void {
  // Guard against duplicate mounts across SPA transitions.
  const existing = document.getElementById(HOST_ID)
  if (existing) existing.remove()

  const host = document.createElement("div")
  host.id = HOST_ID
  // The host element itself is inert; only the button inside receives events.
  host.style.cssText = [
    "position:fixed",
    "left:16px",
    "bottom:16px",
    "z-index:2147483000",
    "width:auto",
    "height:auto",
    "pointer-events:none",
  ].join(";")

  const shadow = host.attachShadow({ mode: "closed" })

  const style = document.createElement("style")
  style.textContent = `
    .liend-trigger {
      pointer-events: auto;
      isolation: isolate;
      display: inline-flex;
      overflow: hidden;
      align-items: center;
      gap: 8px;
      height: 36px;
      padding: 0 14px;
      border: 2px solid rgba(196, 255, 188, 0.62);
      border-radius: 3px;
      background:
        linear-gradient(180deg, rgba(186, 255, 178, 0.38) 0%, rgba(77, 255, 90, 0.2) 46%, rgba(12, 48, 24, 0.55) 100%);
      color: #f4fff6;
      font: 400 10px/1 Silkscreen, "Press Start 2P", "IBM Plex Mono", ui-monospace, monospace;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      cursor: pointer;
      box-shadow:
        inset 1px 1px 0 rgba(255, 255, 255, 0.58),
        inset -1px -1px 0 rgba(8, 40, 16, 0.42),
        4px 6px 0 rgba(4, 10, 40, 0.45);
    }
    .liend-trigger::before {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.06) 32%, transparent 58%);
      content: "";
      pointer-events: none;
    }
    .liend-trigger { position: relative; }
    .liend-trigger:hover { border-color: rgba(220, 255, 214, 0.88); }
    .liend-trigger:focus-visible { outline: 2px solid #4dff5a; outline-offset: 2px; }
    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #4dff5a;
      box-shadow: 0 0 8px rgba(77, 255, 90, 0.7);
    }
    @media (prefers-reduced-motion: reduce) { .liend-trigger { transition: none; } }
  `

  const button = document.createElement("button")
  button.type = "button"
  button.className = "liend-trigger"
  button.setAttribute("aria-label", "Open LONS liquidity panel")

  const dot = document.createElement("span")
  dot.className = "dot"
  const label = document.createElement("span")
  label.textContent = "LONS · Check liquidity"

  button.append(dot, label)
  button.addEventListener("click", (event) => {
    // Do not let the click reach host handlers underneath.
    event.preventDefault()
    event.stopPropagation()
    onOpen()
  })

  shadow.append(style, button)
  document.documentElement.append(host)

  return () => {
    host.remove()
  }
}
