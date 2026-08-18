export type DocsSection = {
  heading: string
  body: string[]
}

export type DocsPage = {
  slug: string
  href: string
  title: string
  kicker: string
  summary: string
  sections: DocsSection[]
}

export const docsPages: DocsPage[] = [
  {
    slug: "",
    href: "/docs",
    title: "LIEND Docs",
    kicker: "GitBook",
    summary: "Product documentation for the LIEND utility layer on Solana.",
    sections: [
      {
        heading: "What LIEND is",
        body: [
          "LIEND is a utility layer for borrowing against supported migrated token positions on Solana.",
          "The product is built so a holder can access liquidity without making a market sale the first move. Collateral stays in the position. Borrowed value is requested as SOL.",
          "The landing, the LIEND App, the API and the Chrome extension are four surfaces of the same product. They share configuration, not hardcoded domains.",
        ],
      },
      {
        heading: "What is live today",
        body: [
          "The marketing site, the App, the API and the extension install path are deployed.",
          "Wallet connect, sessions, extension pairing and the utility interface are in place.",
          "After a wallet is connected and verified, positions, quotes, borrowing and repayment are available in the App.",
        ],
      },
      {
        heading: "Who it is for",
        body: [
          "LIEND is for holders of supported migrated tokens who want a second route besides selling.",
          "A verified wallet can use LIEND utility. When a mint and minimum balance are published, the App and API apply that holder check.",
        ],
      },
    ],
  },
  {
    slug: "token",
    href: "/docs/token",
    title: "LIEND token",
    kicker: "Access",
    summary: "How the token, Pump.fun and holder access fit together.",
    sections: [
      {
        heading: "Token status",
        body: [
          "The LIEND token is not launched yet. There is no mint in product config and no published holder threshold.",
          "The header Pump.fun button currently opens the public Pump.fun board. When the coin exists, that same button will point at the official token page through NEXT_PUBLIC_PUMPFUN_URL.",
        ],
      },
      {
        heading: "Holder access",
        body: [
          "LIEND utility is available after a connected wallet is verified.",
          "When a mint and minimum balance are published, the App and API check wallet holdings against those values.",
        ],
      },
      {
        heading: "Where to get LIEND",
        body: [
          "The official acquisition path is Pump.fun. Use the Pump.fun control in the header. Do not follow unofficial ticker pages.",
          "LIEND never asks for a seed phrase, a private key or a wallet password.",
        ],
      },
    ],
  },
  {
    slug: "how-it-works",
    href: "/docs/how-it-works",
    title: "How it works",
    kicker: "Flow",
    summary: "The six-step path from a connected wallet to SOL liquidity.",
    sections: [
      {
        heading: "Connect",
        body: [
          "A user connects a Solana wallet through a standard wallet provider. LIEND asks for a plain-text signature to prove control of the address.",
          "That signature creates no transaction and costs no fees.",
        ],
      },
      {
        heading: "Verify",
        body: [
          "LIEND reads wallet positions and supported markets through the configured adapter. No seed material leaves the wallet.",
        ],
      },
      {
        heading: "Select",
        body: [
          "The user chooses a migrated token position. A migrated token has left its bonding curve and entered open market liquidity.",
        ],
      },
      {
        heading: "Configure",
        body: [
          "Collateral size and requested liquidity are chosen in the App. Health, LTV and liquidation behavior follow active protocol parameters when those parameters exist.",
        ],
      },
      {
        heading: "Execute and receive",
        body: [
          "The user reviews the full route before confirming. After a successful execution, SOL is received in the destination wallet.",
        ],
      },
    ],
  },
  {
    slug: "app",
    href: "/docs/app",
    title: "LIEND App",
    kicker: "Product",
    summary: "The wallet-connected surface for positions, pairing and settings.",
    sections: [
      {
        heading: "Launch App",
        body: [
          "Launch App in the header opens the LIEND App origin. The App talks to the LIEND API for auth, sessions and extension pairing.",
        ],
      },
      {
        heading: "Wallet session",
        body: [
          "After a successful challenge and verify, the API stores a session bound to the wallet address. The cookie carries an opaque id plus an HMAC tag. The client cannot edit its own identity.",
        ],
      },
      {
        heading: "Pairing the extension",
        body: [
          "A signed-in user can approve a pairing request from the Chrome extension. Approval binds the device to that wallet.",
          "The device credential is shown once. LIEND stores only a hash. Revoking a device in settings invalidates sessions derived from it.",
        ],
      },
      {
        heading: "Positions and loans",
        body: [
          "The App lists supported positions, quotes available SOL, opens loans and records repayments against the connected wallet.",
          "Activity shows borrow and repayment events for that wallet.",
        ],
      },
    ],
  },
  {
    slug: "extension",
    href: "/docs/extension",
    title: "Chrome extension",
    kicker: "Context",
    summary: "Side panel context on Pump.fun without taking custody of the wallet.",
    sections: [
      {
        heading: "Install",
        body: [
          "LIEND is not on the Chrome Web Store yet. Add to Chrome downloads a packed archive. Load it unpacked from chrome://extensions with Developer mode enabled.",
        ],
      },
      {
        heading: "What it reads",
        body: [
          "On supported Pump.fun token pages the extension identifies the mint from the URL and opens liquidity context in the side panel.",
          "It does not request seed phrases. It does not inject transactions into the page.",
        ],
      },
      {
        heading: "Pairing",
        body: [
          "The extension pairs through the LIEND App. After pairing, short-lived API sessions let the side panel read status without storing the wallet key.",
        ],
      },
    ],
  },
  {
    slug: "security",
    href: "/docs/security",
    title: "Security",
    kicker: "Trust",
    summary: "Non-custodial design, explicit origins and no invented balances.",
    sections: [
      {
        heading: "Non-custodial",
        body: [
          "LIEND never takes custody of keys. Authentication is a signed message. Execution, when it exists, is a user-approved transaction from the connected wallet.",
        ],
      },
      {
        heading: "Origins and cookies",
        body: [
          "The API allowlists exact App and extension origins. It does not trust every vercel.app host. Session secrets stay server-side.",
        ],
      },
      {
        heading: "Storage",
        body: [
          "Production persistence is Postgres. Device credentials and extension sessions are stored as hashes. Pairing identifiers are not themselves credentials.",
        ],
      },
      {
        heading: "Truthful empty states",
        body: [
          "If the API, the App origin or the database is missing, the UI says so. LIEND does not invent a mint, a holder threshold or a Pump.fun coin page.",
        ],
      },
    ],
  },
]

export function docsPageBySlug(slug: string | undefined): DocsPage | undefined {
  const key = slug ?? ""
  return docsPages.find((page) => page.slug === key)
}

export function docsNeighbors(slug: string | undefined): {
  previous: DocsPage | null
  next: DocsPage | null
} {
  const index = docsPages.findIndex((page) => page.slug === (slug ?? ""))
  if (index < 0) return { previous: null, next: null }
  return {
    previous: docsPages[index - 1] ?? null,
    next: docsPages[index + 1] ?? null,
  }
}
