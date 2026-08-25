"use client"

import type { AnchorHTMLAttributes, ReactNode } from "react"
import { ProductLink } from "@/components/ProductLink"
import { pumpFunCoinUrl } from "@/lib/ca"
import { usePublishedCa } from "@/lib/usePublishedCa"

type PumpFunLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  children: ReactNode
  className?: string
  /** Preview override — when omitted, the live published CA drives the href. */
  mint?: string | null
}

/**
 * Pump.fun chip/link that follows the admin CA broadcast.
 * Waiting → https://pump.fun. Published text → https://pump.fun/coin/{text}.
 */
export function PumpFunLink({ mint, children, className, ...rest }: PumpFunLinkProps) {
  const published = usePublishedCa()
  const href = pumpFunCoinUrl(mint !== undefined ? mint : published.mint)
  return (
    <ProductLink className={className} href={href} {...rest}>
      {children}
    </ProductLink>
  )
}
