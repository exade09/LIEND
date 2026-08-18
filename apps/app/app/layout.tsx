import type { Metadata } from "next"
import Link from "next/link"
import "./globals.css"
import { SessionProvider } from "@/components/SessionProvider"
import { UnbackedBookProvider } from "@/components/UnbackedBook"
import { AccessSummary } from "@/components/AccessSummary"

export const metadata: Metadata = {
  title: "LIEND",
  description: "Utility liquidity for migrated token positions on Solana",
}

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/positions", label: "Positions" },
  { href: "/loans", label: "Loans" },
  { href: "/activity", label: "Activity" },
  { href: "/settings", label: "Settings" },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <UnbackedBookProvider>
            <div className="shell">
              <aside className="sidebar">
                <Link className="wordmark" href="/">
                  LIEND
                </Link>
                <nav className="nav">
                  {NAV.map((item) => (
                    <Link key={item.href} href={item.href}>
                      {item.label}
                    </Link>
                  ))}
                </nav>
                <AccessSummary />
              </aside>
              <main className="content">{children}</main>
            </div>
          </UnbackedBookProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
