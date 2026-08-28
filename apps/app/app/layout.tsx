import type { Metadata, Viewport } from "next"
import { IBM_Plex_Mono, Silkscreen } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "@/components/SessionProvider"
import { UnbackedBookProvider } from "@/components/UnbackedBook"
import { StageBackdrop } from "@/components/StageBackdrop"
import { ActivityTape } from "@/components/ActivityTape"
import { AppHeader } from "@/components/AppHeader"
import { RouteFrame } from "@/components/RouteFrame"

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
  title: "LONS",
  description: "Utility liquidity for migrated token positions on Solana",
  icons: {
    icon: [{ url: "/assets/lons-mark.png", type: "image/png" }],
    apple: "/assets/lons-mark.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#f5f2e9",
  colorScheme: "light",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plexMono.variable} ${silkscreen.variable}`}>
      <body>
        <StageBackdrop />
        <SessionProvider>
          <UnbackedBookProvider>
            <div className="shell">
              <ActivityTape />
              <AppHeader />
              <RouteFrame>{children}</RouteFrame>
            </div>
          </UnbackedBookProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
