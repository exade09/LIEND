import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { DocsArticle } from "@/components/DocsArticle"
import { docsPageBySlug, docsPages } from "@/lib/gitbook"

export function generateStaticParams() {
  return docsPages.filter((page) => page.slug).map((page) => ({ slug: page.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = docsPageBySlug(slug)
  if (!page) return { title: "LONS Docs" }
  return {
    title: `${page.title} | LONS Docs`,
    description: page.summary,
  }
}

export default async function DocsSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const page = docsPageBySlug(slug)
  if (!page || page.slug === "") notFound()
  return <DocsArticle slug={page.slug} />
}
