# Migrating to a custom domain

LIEND launches on Vercel-generated URLs. Moving to a real domain later is a
**configuration change only** — no source file needs editing.

This works because every origin in the product resolves through
`packages/config`, and no component, route, auth path, deep-link builder or API
client contains a literal hostname. The invariant is verified by tests in
`packages/config/src/config.test.ts`.

## Procedure

Assume the future domain is `<domain>`, with the App on `app.<domain>` and the
API on `api.<domain>`. Nothing below assumes those exact names.

**1. Attach domains in Vercel**

| Project | Domain |
|---|---|
| `liend-landing` | `<domain>` (+ `www` redirect) |
| `liend-app` | `app.<domain>` |
| `liend-api` | `api.<domain>` |

Keep the old `*.vercel.app` URLs working during the transition.

**2. Update public origins**

Landing:
```
NEXT_PUBLIC_SITE_URL=https://<domain>
NEXT_PUBLIC_APP_URL=https://app.<domain>
```

App:
```
NEXT_PUBLIC_APP_URL=https://app.<domain>
NEXT_PUBLIC_API_URL=https://api.<domain>
NEXT_PUBLIC_LANDING_URL=https://<domain>
```

**3. Update trusted origins (API)**

```
LIEND_ALLOWED_ORIGINS=https://app.<domain>
```

Keep the old App origin in the list until the App deployment is live on the new
domain, then remove it. This is the only cutover-ordering constraint.

**4. Auth and return origins**

No action. Sessions are opaque ids in host-only cookies with no domain
attribute and no embedded origin, so they are unaffected by the change. The
`returnTo` mechanism only ever stores relative paths.

**5. Future extension configuration**

Update the extension's configured API origin, and add its
`chrome-extension://<id>` origin to `LIEND_ALLOWED_ORIGINS`. The extension ID
is independent of the web domain, so pairing is unaffected.

**6. Redeploy**

Redeploy all three projects. `NEXT_PUBLIC_*` values are inlined at build time,
so a redeploy — not just an env save — is required.

## Verification after cutover

```bash
curl https://api.<domain>/api/health
curl https://api.<domain>/api/status

# Allowed origin is echoed:
curl -sD- -o/dev/null -H "Origin: https://app.<domain>" https://api.<domain>/api/health \
  | grep -i access-control-allow-origin

# An unlisted origin is NOT echoed:
curl -sD- -o/dev/null -H "Origin: https://not-liend.example" https://api.<domain>/api/health \
  | grep -i access-control-allow-origin
```

Then in a browser: connect a wallet on `app.<domain>`, confirm the session
survives a reload, and confirm `/settings/devices` loads.

## Why no code changes are needed

| Concern | Mechanism |
|---|---|
| Landing / App / API origins | `readPublicConfig()` reads env only |
| Deep links | `positionUrl()`, `pairUrl()`, `authUrl()` take a base from config |
| API client | `createLiendApiClient({ baseUrl })` — throws if no base is supplied |
| CORS | `LIEND_ALLOWED_ORIGINS`, exact-match |
| Sessions | Opaque id, host-only cookie, no domain binding |
| `returnTo` | Relative paths only |
| Token mint / threshold | `LIEND_TOKEN_MINT`, `LIEND_MIN_HOLDER_BALANCE` |
| Extension distribution | `NEXT_PUBLIC_EXTENSION_MODE` (`download` → `webstore`) |
