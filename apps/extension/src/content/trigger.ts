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
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 36px;
      padding: 0 14px;
      border: 1px solid rgba(181,197,231,0.24);
      border-radius: 10px;
      background: rgba(3,4,13,0.92);
      color: #f4f6fb;
      font: 600 12px/1 Inter, "Segoe UI", system-ui, sans-serif;
      letter-spacing: 0.06em;
      cursor: pointer;
      box-shadow: 0 8px 28px rgba(0,0,0,0.42);
      transition: border-color 150ms ease-in, color 150ms ease-in;
    }
    .liend-trigger:hover { border-color: #26d8e8; color: #26d8e8; }
    .liend-trigger:focus-visible { outline: 2px solid #26d8e8; outline-offset: 2px; }
    .dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: linear-gradient(135deg, #7957ff, #26d8e8);
    }
    @media (prefers-reduced-motion: reduce) { .liend-trigger { transition: none; } }
  `

  const button = document.createElement("button")
  button.type = "button"
  button.className = "liend-trigger"
  button.setAttribute("aria-label", "Open LIEND liquidity panel")

  const dot = document.createElement("span")
  dot.className = "dot"
  const label = document.createElement("span")
  label.textContent = "LIEND · Check liquidity"

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
