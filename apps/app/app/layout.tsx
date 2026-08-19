import type { Metadata } from "next"
import "./globals.css"
import { SessionProvider } from "@/components/SessionProvider"
import { UnbackedBookProvider } from "@/components/UnbackedBook"
import { StageBackdrop } from "@/components/StageBackdrop"
import { AppHeader } from "@/components/AppHeader"

export const metadata: Metadata = {
  title: "LIEND",
  description: "Utility liquidity for migrated token positions on Solana",
  icons: {
    icon: [{ url: "/assets/logo/pixel/liend-mark.png", type: "image/png" }],
    apple: "/assets/liend-icon.png",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
