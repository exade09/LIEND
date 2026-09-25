"use client"

import type { AnchorHTMLAttributes, ReactNode } from "react"
import { ProductLink } from "@/components/ProductLink"
import { pumpTokenUrl } from "@/lib/ca"
import { usePublishedCa } from "@/lib/usePublishedCa"

type PumpLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  children: ReactNode
  className?: string
  mint?: string | null
}

/** Official pump.fun launchpad link for Solana. */
export function PumpLink({ children, className, mint, ...rest }: PumpLinkProps) {
  const published = usePublishedCa()
  const href = pumpTokenUrl(mint !== undefined ? mint : published.mint)
  return (
    <ProductLink className={className} href={href} {...rest}>
      {children}
    </ProductLink>
  )
}
