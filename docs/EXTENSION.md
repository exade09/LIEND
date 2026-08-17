# LIEND Extension

Chrome Manifest V3 extension providing liquidity context on supported Solana
token pages.

## Installing (unpacked)

There is **no Chrome Web Store listing yet**. This is a manual developer-mode
install, not a Web Store installation.

1. Download `liend-extension.zip`.
2. Extract the archive. You should get a folder containing `manifest.json`
   directly — there is no extra nested directory.
3. Open `chrome://extensions` in Chrome.
4. Turn on **Developer mode** (top right).
5. Click **Load unpacked**.
6. Select the extracted folder (the one containing `manifest.json`).
7. Optionally pin LIEND via the puzzle-piece icon so it stays in the toolbar.
8. Open a token page on pump.fun, e.g. `https://pump.fun/coin/<mint>`.
9. Click the **LIEND · Check liquidity** button at the lower left, or the
   toolbar icon, to open the side panel.
10. Choose **Connect LIEND** and approve this browser in the LIEND app.

Chrome will show "Loaded unpacked extension" — that is expected for this
distribution method. Unpacked extensions are removed when Chrome is fully
restarted in some managed environments; reload via **Load unpacked** if so.

## Building

```bash
# From the repository root
LIEND_APP_URL=https://<app-origin> \
LIEND_API_URL=https://<api-origin> \
npm run package -w @liend/extension
```

| Output | Path |
|---|---|
| Unpacked build (point "Load unpacked" here) | `apps/extension/dist/` |
| Distributable archive | `apps/extension/release/liend-extension.zip` |

`npm run build -w @liend/extension` produces `dist/` without the archive.

Origins are injected at build time. **They are not read at runtime**, so
changing the app or API address requires a rebuild and a new release — this is
the extension half of the custom-domain migration in
`docs/CUSTOM-DOMAIN-MIGRATION.md`. Building without them succeeds but the panel
renders an explicit "Not configured" state rather than guessing an origin.

The API origin is also added to `host_permissions` automatically, so the
generated manifest always matches the build's configuration.

## Manifest permissions

| Permission | Why it is needed |
|---|---|
| `sidePanel` | Required by the Side Panel API — the primary UI surface. |
| `storage` | Device credential (`storage.local`, must survive restart) and short-lived session + per-tab context (`storage.session`). |
| `tabs` | Read the active tab's URL to decide whether the page is supported, and clear per-tab context on close. |
| `https://pump.fun/*`, `https://www.pump.fun/*` | The only verified supported platform. |
| `<API origin>/*` | Lets the service worker call the LIEND API. |

**Deliberately not requested:** `<all_urls>`, `webRequest`, `cookies`,
`history`, `bookmarks`, `scripting` (the content script is declared statically),
`activeTab` (host permissions already cover the supported sites), and any Axiom
host.

`content_security_policy` is `script-src 'self'; object-src 'self'` — no
remotely hosted code, which MV3 forbids and this makes explicit.

## Why Axiom is not included

Phase 1 research could not verify Axiom's production page behaviour: the site
returned HTTP 403 to inspection and much of the product sits behind
authentication. The adapter contract in `src/adapters/types.ts` is ready for it,
but shipping a guessed detector onto a live trading surface risks silent
mis-detection — the worst failure mode this product has. Axiom is added, with
its host permission, only once real page evidence exists.

## Privacy

The extension observes:

- that the active tab is on pump.fun,
- the token mint parsed from that page's URL,
- its own version and a device identifier.

It does **not** observe browsing history, page content beyond the URL-derived
mint, wallet balances or addresses, keystrokes, form input, cookies, or any
activity on non-supported sites. The content script is declared only for
pump.fun, so it is never injected anywhere else — enforced by the manifest, not
by convention.

It never requests or stores a seed phrase or private key, and never signs a
transaction. Signing stays in the LIEND app with the user's own wallet.

## Security model

| Boundary | Trust | Rule |
|---|---|---|
| Host page → content script | Untrusted | Only URL-derived identifiers are read. |
| Content script → service worker | Untrusted | Every message is schema-validated and the sender's host verified. |
| Side panel → service worker | Semi | Extension origin, still schema-validated. |
| Service worker → LIEND API | Trusted | The only source of financial truth. |

The content script holds no credentials, makes no network requests, and cannot
reach the API. There is no generic `fetchUrl`/`openUrl` message — a compromised
content script can at worst assert a wrong mint, which the app re-verifies
independently.

Two secrets, neither stored in plaintext server-side:

| Secret | Storage | Lifetime |
|---|---|---|
| Device credential | `chrome.storage.local` | Long-lived; mints sessions, grants no data itself |
| Access token | `chrome.storage.session` | 1 hour |

`chrome.storage.session` is not exposed to content scripts by default and that
is never widened. Revoking a browser in the app's **Settings → Browser
connections** invalidates the credential and every session derived from it; the
extension then clears local state and returns to disconnected.

## Detection timing

One page identity == one generation == one T0 == one deadline.

| Constant | Value | Meaning |
|---|---|---|
| Attempt offsets | 0, 250, 600, 1000 ms | when detection is retried |
| Grace period | 900 ms | corroboration insisted upon before URL-only |
| Hard deadline | 1500 ms | absolute ceiling, armed once at T0 |

The deadline timer is armed once per generation and never rescheduled, so
repeated navigation signals cannot extend it. Duplicate signals for the
identity already in flight are ignored outright. Every generation ends in
exactly one of TOKEN_CONTEXT, NO_TOKEN or DETECTION_FAILED.

Set `LIEND_DEBUG=1` at build time to log generation, identity, attempt,
elapsed-from-T0, decision and reason to the page console. Compiled out
otherwise; never logs tokens or auth data.

## Reload workflow

After any rebuild:

1. `chrome://extensions` -> **Reload** on LIEND
2. **Hard-refresh** the pump.fun tab (Ctrl+Shift+R)

The hard refresh matters: the previously injected content script keeps
running in already-open tabs until they reload, so without it you are still
testing the old build.

## Manual verification checklist

Automated browser verification was not performed (no browser automation is
available in the build environment). Use this checklist after loading unpacked:

- [ ] Extension loads with no errors on `chrome://extensions`
- [ ] Service worker shows as active; console has no errors
- [ ] On `https://pump.fun/` (no token) the panel shows "No token detected"
- [ ] On a token page the LIEND trigger appears lower-left and does not overlap
      the buy/sell controls
- [ ] Clicking the trigger opens the side panel
- [ ] The panel shows the correct shortened mint for the token
- [ ] Navigating to a different token updates the mint without a reload, and
      only one trigger is ever present
- [ ] Navigating away from a coin route clears the token state
- [ ] **Connect LIEND** opens the app `/pair` page with a `request` parameter
- [ ] The code in the panel matches the code in the app
- [ ] Approving in the app flips the panel to Connected
- [ ] Rejecting, or letting it expire, returns the panel to disconnected
- [ ] After a full Chrome restart the panel is still Connected (no re-pairing)
- [ ] Revoking the browser in the app returns the panel to disconnected
- [ ] **Open in LIEND** opens `/positions/<mint>?src=pumpfun`
- [ ] With the app logged out, that link routes through auth and returns to the
      same position — no need to paste the mint again
- [ ] The panel never displays a balance, price or liquidity figure
- [ ] On a non-supported site the panel shows "No supported page"
