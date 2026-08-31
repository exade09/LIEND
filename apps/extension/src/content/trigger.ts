/**
 * The Lons trigger.
 *
 * Constraints this implementation holds to:
 *  - One element, clearly labelled Lons. It does not imitate ponsfamily.com's own
 *    controls, and does not present itself as part of the host product.
 *  - Fixed to the lower-left, away from the buy/sell controls that live in the
 *    right-hand trade panel. It never reparents, restyles or removes host
 *    content, and never intercepts host events.
 *  - Rendered inside a closed shadow root, so Lons styles and host styles
 *    cannot leak into each other in either direction.
 *  - The panel opens only from this explicit click. Chrome requires a user
 *    gesture for `sidePanel.open()`, so an automatic reveal is not possible
 *    even if we wanted one.
 */

const HOST_ID = "lons-trigger-root"

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
    .lons-trigger {
      pointer-events: auto;
      isolation: isolate;
      display: inline-flex;
      overflow: hidden;
      align-items: center;
      gap: 9px;
      min-height: 40px;
      padding: 0 16px 0 10px;
      border: 1px solid rgba(42, 66, 47, 0.32);
      border-radius: 999px;
      background:
        linear-gradient(135deg, rgba(255, 255, 250, 0.96), rgba(231, 240, 220, 0.9));
      color: #263528;
      font: 600 11px/1.1 "IBM Plex Mono", "Cascadia Mono", ui-monospace, monospace;
      letter-spacing: 0.02em;
      cursor: pointer;
      backdrop-filter: blur(18px) saturate(1.12);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.95),
        0 10px 28px rgba(36, 61, 39, 0.2);
      transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
    }
    .lons-trigger::before {
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(180deg, rgba(255,255,255,0.48), transparent 56%);
      content: "";
      pointer-events: none;
    }
    .lons-trigger { position: relative; }
    .lons-trigger:hover {
      border-color: rgba(69, 111, 73, 0.58);
      box-shadow: inset 0 1px 0 #fff, 0 14px 34px rgba(36, 61, 39, 0.25);
      transform: translateY(-2px);
    }
    .lons-trigger:focus-visible { outline: 3px solid rgba(166, 220, 136, 0.75); outline-offset: 3px; }
    .mark {
      position: relative;
      width: 20px;
      height: 20px;
      border: 1px solid rgba(54, 91, 58, 0.35);
      border-radius: 50%;
      background:
        radial-gradient(circle at 34% 28%, #fff 0 12%, transparent 14%),
        conic-gradient(from 28deg, #fafff6, #a9cf9d, #f4fff0, #bdd8b5, #fafff6);
      box-shadow: inset 0 0 0 4px rgba(255,255,255,.48), 0 3px 8px rgba(46, 77, 49, .2);
    }
    .mark::after {
      position: absolute;
      inset: 5px;
      border: 1px solid rgba(41, 72, 44, .45);
      border-radius: 50%;
      content: "";
    }
    @media (prefers-reduced-motion: reduce) { .lons-trigger { transition: none; } }
  `

  const button = document.createElement("button")
  button.type = "button"
  button.className = "lons-trigger"
  button.setAttribute("aria-label", "Open Lons liquidity panel")

  const mark = document.createElement("span")
  mark.className = "mark"
  const label = document.createElement("span")
  label.textContent = "Lons · Check liquidity"

  button.append(mark, label)
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
