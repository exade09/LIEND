/**
 * Copy text, in the two ways browsers actually allow it.
 *
 * `navigator.clipboard.writeText` is the right API and is refused outright in
 * more places than it looks: the permission is denied in several embedded
 * webviews, which is exactly where someone taps a contract address - a wallet
 * browser, an in-app browser, a preview pane. Measured in one: the permission
 * query answers "denied" and the write throws NotAllowedError before it ever
 * reaches the clipboard.
 *
 * The old `execCommand` path has none of that gating, so it stands behind the
 * modern one rather than instead of it. A CA that silently fails to copy is
 * worse than a CA nobody tried to copy.
 */
export async function copyText(value: string): Promise<boolean> {
  if (!value) return false

  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    // Refused. Fall through rather than reporting a copy that did not happen.
  }

  try {
    const area = document.createElement("textarea")
    area.value = value
    area.setAttribute("readonly", "")
    // Off-screen but focusable: a hidden or display:none field cannot be
    // selected, and selecting is what the copy command acts on.
    area.style.position = "fixed"
    area.style.top = "0"
    area.style.left = "0"
    area.style.opacity = "0"
    area.style.pointerEvents = "none"

    document.body.append(area)
    area.select()
    area.setSelectionRange(0, value.length)
    const copied = document.execCommand("copy")
    area.remove()
    return copied
  } catch {
    return false
  }
}
