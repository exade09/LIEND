import type { Metadata } from "next"
import { DocsArticle } from "@/components/DocsArticle"

export const metadata: Metadata = {
  title: "LONS Docs",
  description: "Product documentation for the LONS utility layer on Robinhood Chain.",
}

export default function DocsIndexPage() {
  return <DocsArticle slug="" />
}
