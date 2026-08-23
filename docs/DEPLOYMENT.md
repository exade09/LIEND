# LIEND deployment

Three independently deployable surfaces, all on Vercel, all configuration-driven.
No domain, Vercel URL, token mint or holder threshold is hardcoded anywhere in
source — every one of them is an environment variable.

## Repository layout

```
D:\Larp-Utility
├── app/  components/  lib/  services/     Landing (stays at repo root)
├── apps/
│   ├── api/                               LIEND API      → its own Vercel project
│   └── app/                               LIEND App      → its own Vercel project
├── packages/
│   ├── brand/        design tokens
│   ├── config/       origins, links, token state, deep links
│   ├── domain/       types, zod schemas, UtilityAccess
│   └── api-client/   typed API client
└── docs/
```

npm workspaces are enabled at the root. The Landing remains the root package,
so its existing Vercel project keeps working with no configuration change.

## Local development

```bash
npm install          # once, at the repo root

npm run dev                          # Landing  → http://localhost:3000
npm run dev -w @liend/app            # App      → http://localhost:3001
npm run dev -w @liend/api            # API      → http://localhost:3002
```

For local App↔API work, create `apps/api/.env.local` (see `apps/api/.env.example`):

```
LIEND_ALLOWED_ORIGINS=http://localhost:3001
DATABASE_URL=postgresql://...        # optional locally; omitted = dev in-memory store
```

and `apps/app/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

Never commit `.env.local`. Only `.env.example` is tracked, and it contains no
real values.

## Vercel projects

Create **three separate projects** from the same repository. The only
project-level difference is the root directory.

| Project | Root directory | Build | Output |
|---|---|---|---|
| `liend-landing` | `.` (repo root) | `npm run build` | Next.js |
| `liend-app` | `apps/app` | `npm run build` | Next.js |
| `liend-api` | `apps/api` | `npm run build` | Next.js route handlers |

For `apps/app` and `apps/api`, enable **"Include files outside the root
directory"** so the workspace packages resolve. Vercel runs `npm install` at
the repo root, which is what makes the workspace linking work.

### Environment variables

**Landing** (existing project — unchanged except optional additions)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Existing. Used for `metadataBase`. |
| `NEXT_PUBLIC_APP_URL` | Launch App CTA target (Phase 4). |
| `NEXT_PUBLIC_EXTENSION_URL` | Chrome Web Store listing or archive URL override. |

**App** (`liend-app`)

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | yes | API origin. Without it the App renders an explicit "API not configured" state. |
| `NEXT_PUBLIC_APP_URL` | yes | Own origin, for building absolute deep links. |
| `NEXT_PUBLIC_LANDING_URL` | no | Back-to-landing links. |
| `NEXT_PUBLIC_LIEND_TOKEN_MINT` | no | **Leave unset until launch.** Unset ⇒ `token-not-launched`. |
| `NEXT_PUBLIC_LIEND_MIN_HOLDER_BALANCE` | no | Base units, integer string. Unset ⇒ requirement not published. |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | no | Defaults to `mainnet-beta`. |
| `NEXT_PUBLIC_PUMPFUN_URL` / `_X_URL` / `_DOCS_URL` | no | Leave unset until real destinations exist. |
| `NEXT_PUBLIC_EXTENSION_MODE` | no | `webstore` (default) or `download` for archive builds. |

**API** (`liend-api`)

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | **yes in production** | Postgres connection string. See *Persistence*. |
| `LIEND_ALLOWED_ORIGINS` | **yes** | Comma-separated exact origins. Deny-by-default: empty blocks all cross-origin browser access. |
| `LIEND_SESSION_SECRET` | **yes in production** | HMAC key for session cookies. Generate with `openssl rand -base64 32`. |
| `LIEND_SOLANA_RPC_URL` | no | Solana JSON-RPC. Unset falls back to public mainnet endpoints for wallet token reads. |
| `LIEND_TOKEN_MINT` | no | Server-side copy. Unset ⇒ utility is `token-not-launched`. |
| `LIEND_MIN_HOLDER_BALANCE` | no | Base units, integer string. |
| `LIEND_API_VERSION` | no | Reported by `/api/health`. |

`LIEND_ALLOWED_ORIGINS` must list the App origins explicitly, e.g.
`https://liend-app.vercel.app,https://liend-app-git-main-acme.vercel.app`.
Preview deployments get fresh URLs per branch, so add the ones you actually
need — the API deliberately does **not** trust `*.vercel.app` by suffix.

`DATABASE_URL` is server-only. It has no `NEXT_PUBLIC_` prefix, so it can never
be inlined into a browser bundle.

## Persistence — Postgres (Neon)

Durable storage is **Postgres**, accessed through the standard `pg` client over
the normal wire protocol. Neon is the initial host because it speaks standard
Postgres — no provider-specific API is used, so moving to any other Postgres is
a connection-string change.

### Setup

1. Create a Neon project and copy the **pooled** connection string (important
   for serverless: the pooler is what prevents connection exhaustion).
2. Set it as `DATABASE_URL` in the `liend-api` Vercel project, and locally in
   `apps/api/.env.local`.
3. Apply migrations as an explicit step — the application never creates tables
   at request time:

```bash
DATABASE_URL=postgresql://... npm run migrate -w @liend/api
```

Migrations live in `apps/api/migrations/` as version-controlled `.sql` files,
applied in filename order and recorded in `schema_migrations`. Re-running is a
no-op, so it is safe to run on every deploy.

### Tables

`auth_challenges`, `sessions`, `pairing_requests`, `devices`,
`extension_sessions`.

There are deliberately **no** tables for loans, positions, liquidity or
activity. The LIEND on-chain program does not exist, and empty tables would
imply infrastructure that is not there.

### Production guard

`getStore()` throws when `VERCEL_ENV=production` and `DATABASE_URL` is unset.
Production never falls back to in-memory storage — it fails loudly instead.
This is covered by tests in `apps/api/src/lib/store/factory.test.ts`.

## Extension pairing and device credentials

Two distinct secrets, neither ever stored in plaintext (SHA-256 hashes only):

| Secret | Lifetime | Purpose |
|---|---|---|
| Device credential | Long-lived, issued once at exchange | Mints extension sessions. Grants no data by itself. |
| Extension session | 1 hour | Bearer token for read-oriented API calls. |

This split is why a browser restart does not force re-pairing, while
revocation still takes effect within one session lifetime. Revoking a device
in `/settings/devices` cascades to every extension session derived from it.

## What is deliberately not deployable yet

- **Borrow / repay settlement** — there is no LIEND on-chain program. Quotes
  and loans stay in the App until execution exists.
- **Holder gating** — architecture is complete and enforced server-side, but
  inert until `LIEND_TOKEN_MINT` is published.
- **Distributed rate limiting** — the in-process limiter is per-instance only.
  See `apps/api/src/lib/rate-limit.ts`; a shared store (Redis/Upstash) has not
  been selected.
