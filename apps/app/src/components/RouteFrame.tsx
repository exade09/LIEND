"use client"

import { usePathname } from "next/navigation"

export function RouteFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <main className="content route-enter" key={pathname}>
      {children}
    </main>
  )
}
