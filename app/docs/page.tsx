import type { Metadata } from "next"
import { DocsArticle } from "@/components/DocsArticle"

export const metadata: Metadata = {
  title: "LIEND Docs",
  description: "Product documentation for the LIEND utility layer on Solana.",
}

export default function DocsIndexPage() {
  return <DocsArticle slug="" />
}
