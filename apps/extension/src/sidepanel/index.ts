/**
 * Side panel entry.
 *
 * Renders purely from the worker snapshot — it never calls the API and never
 * talks to a content script. Plain DOM, no UI framework: the panel is one
 * view, and avoiding a runtime keeps first paint immediate, which is the
 * whole point of a utility surface.
 */

import type { PanelSnapshot } from "@/shared/messages"
import { copyFor, deriveView, toneFor, type PanelAction } from "./state"

const root = document.getElementById("root")!

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function shortMint(mint: string): string {
  return `${mint.slice(0, 5)}…${mint.slice(-5)}`
}

function send(action: PanelAction): void {
  chrome.runtime.sendMessage({ type: action }, (response?: PanelSnapshot) => {
    void chrome.runtime.lastError
    if (response && typeof response === "object" && "connection" in response) render(response)
  })
}

function button(label: string, action: PanelAction, variant: "primary" | "ghost" | "quiet"): HTMLElement {
  const node = el("button", `btn btn--${variant}`, label)
  node.type = "button"
  node.addEventListener("click", () => send(action))
  return node
}

function renderHeader(snapshot: PanelSnapshot): HTMLElement {
  const head = el("header", "head")
  head.append(el("span", "brand", "LIEND"))

  const connected = snapshot.connection === "connected"
  const pairing = snapshot.connection === "pairing"
  const pill = el(
    "span",
    `pill${connected ? " pill--ok" : pairing ? " pill--busy" : ""}`,
    connected ? "Connected" : pairing ? "Pairing" : "Not connected",
  )
  head.append(pill)

  const controls = el("span", "window-controls")
  controls.setAttribute("aria-hidden", "true")
  controls.append(el("i"), el("i"), el("i"))
  head.append(controls)
  return head
}

function renderContext(snapshot: PanelSnapshot): HTMLElement | null {
  if (!snapshot.context) return null

  const row = el("div", "context")
  const left = el("div")
  left.append(el("div", "context__label", "Token"))
  const mint = el("div", "context__mint", shortMint(snapshot.context.mint))
  mint.title = snapshot.context.mint
  left.append(mint)
  row.append(left, el("span", "context__source", "pump.fun"))
  return row
}

function renderState(snapshot: PanelSnapshot): HTMLElement {
  const view = deriveView(snapshot)
  const copy = copyFor(view, snapshot)

  const block = el("section", "state")
  block.dataset.tone = toneFor(view)
  block.append(el("h1", "state__title", copy.title))
  block.append(el("p", "state__body", copy.body))

  if (view === "detecting" || view === "token-loading") {
    const wrap = el("div")
    wrap.style.marginTop = "12px"
    wrap.append(el("div", "skeleton"), el("div", "skeleton skeleton--short"))
    block.append(wrap)
  }

  if (view === "pairing" && snapshot.pairing) {
    block.append(el("div", "code", snapshot.pairing.userCode))
  }

  return block
}

function render(snapshot: PanelSnapshot): void {
  const view = deriveView(snapshot)
  const copy = copyFor(view, snapshot)

  root.replaceChildren()

  const body = el("div", "body")
  const context = renderContext(snapshot)
  if (context) body.append(context)
  body.append(renderState(snapshot))

  const actions = el("div", "actions")
  if (copy.primary) actions.append(button(copy.primary.label, copy.primary.action, "primary"))
  if (copy.secondary) actions.append(button(copy.secondary.label, copy.secondary.action, "ghost"))
  if (actions.childElementCount > 0) body.append(actions)

  const foot = el("footer", "foot")
  foot.append(
    el(
      "p",
      "muted",
      "LIEND reads only the token address on supported pages. It never accesses wallet keys or your browsing history.",
    ),
  )
  if (snapshot.connection === "connected") {
    foot.append(button("Disconnect this browser", "DISCONNECT", "quiet"))
  }
  const meta = el("div", "meta")
  meta.append(el("span", undefined, `v${snapshot.version}`), el("span", undefined, "liend.app"))
  foot.append(meta)

  root.append(renderHeader(snapshot), body, foot)
}

// Worker pushes a fresh snapshot whenever tab or context state changes.
chrome.runtime.onMessage.addListener((message) => {
  if (message && typeof message === "object" && message.type === "SNAPSHOT") {
    render(message.snapshot as PanelSnapshot)
  }
  return false
})

send("GET_STATE")
