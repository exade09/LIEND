"use client"

import type { AnchorHTMLAttributes, ReactNode } from "react"
import { ProductLink } from "@/components/ProductLink"
import { ponsTokenUrl } from "@/lib/ca"
import { usePublishedCa } from "@/lib/usePublishedCa"

type PonsLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  children: ReactNode
  className?: string
  mint?: string | null
}

/** Official pons launchpad link for Robinhood Chain. */
export function PonsLink({ children, className, mint, ...rest }: PonsLinkProps) {
  const published = usePublishedCa()
  const href = ponsTokenUrl(mint !== undefined ? mint : published.mint)
  return (
    <ProductLink className={className} href={href} {...rest}>
      {children}
    </ProductLink>
  )
}
