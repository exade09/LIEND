import type { Metadata, Viewport } from "next"
import { IBM_Plex_Mono, Silkscreen } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "@/components/SessionProvider"
import { UnbackedBookProvider } from "@/components/UnbackedBook"
import { StageBackdrop } from "@/components/StageBackdrop"
import { AppHeader } from "@/components/AppHeader"

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
  title: "LIEND",
  description: "Utility liquidity for migrated token positions on Solana",
  icons: {
    icon: [{ url: "/assets/logo/pixel/liend-mark.png", type: "image/png" }],
    apple: "/assets/liend-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#1540d4",
  colorScheme: "dark",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plexMono.variable} ${silkscreen.variable}`}>
      <body>
        <StageBackdrop />
        <SessionProvider>
          <UnbackedBookProvider>
            <div className="shell">
              <AppHeader />
              <main className="content">{children}</main>
            </div>
          </UnbackedBookProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
