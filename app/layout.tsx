import type { Metadata, Viewport } from "next"
import { IBM_Plex_Mono, Silkscreen } from "next/font/google"
import "./globals.css"
import "./webcore.css"

import { project } from "@/config/project"

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
})

const silkscreen = Silkscreen({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-silk",
})

export const metadata: Metadata = {
  title: "LIEND | Utility liquidity for migrated tokens",
  description:
    "Borrow against supported migrated token positions on Solana without making a market sale your first move",
  metadataBase: new URL(project.siteUrl),
  openGraph: {
    title: "LIEND | Hold the position, access the liquidity",
    description:
      "A utility lending interface for supported migrated token positions on Solana",
    images: ["/assets/liend-card.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "LIEND",
    description: "Utility liquidity for migrated tokens on Solana",
    images: ["/assets/liend-card.png"],
  },
  icons: {
    icon: [{ url: "/assets/logo/pixel/liend-mark.png", type: "image/png" }],
    apple: "/assets/logo/pixel/liend-mark.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#1540d4",
  colorScheme: "dark",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${plexMono.variable} ${silkscreen.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  )
}
