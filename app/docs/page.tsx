import type { Metadata } from "next"
import { DocsArticle } from "@/components/DocsArticle"

export const metadata: Metadata = {
  title: "STAYFI Docs",
  description: "Product documentation for the STAYFI utility layer on Solana.",
}

export default function DocsIndexPage() {
  return <DocsArticle slug="" />
}
