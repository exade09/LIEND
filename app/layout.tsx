import type { Metadata, Viewport } from "next"
import { IBM_Plex_Mono, Silkscreen } from "next/font/google"
import "./globals.css"
import "./webcore.css"

import { PublishedCaProvider } from "@/lib/usePublishedCa"
import { getPublishedCa } from "@/lib/published-ca"
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
  title: "Lona",
  description:
    "Borrow against supported migrated token positions on Robinhood Chain without making a market sale your first move",
  metadataBase: new URL(project.siteUrl),
  openGraph: {
    title: "LONS | Hold the position, access the liquidity",
    description:
      "A utility lending interface for supported migrated token positions on Robinhood Chain",
  },
  twitter: {
    card: "summary_large_image",
    title: "LONS",
    description: "Utility liquidity for migrated tokens on Robinhood Chain",
  },
  icons: {
    icon: [{ url: "/assets/lons-mark.png", type: "image/png" }],
    apple: "/assets/lons-mark.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#f5f2e9",
  colorScheme: "light",
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const ca = await getPublishedCa()

  return (
    <html lang="en" className={`${plexMono.variable} ${silkscreen.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <PublishedCaProvider initialValue={ca}>{children}</PublishedCaProvider>
      </body>
    </html>
  )
}
