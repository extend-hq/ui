import type { MetadataRoute } from "next"

import {
  getAllPagesFromFolder,
  type PageTreeNode,
  type PageTreePage,
} from "@/lib/page-tree"
import { source } from "@/lib/source"
import { absoluteUrl } from "@/lib/utils"

function getDocsPages(nodes: PageTreeNode[]): PageTreePage[] {
  return nodes.flatMap((node) => {
    if (node.type === "page") return [node]
    if (node.type === "folder") return getAllPagesFromFolder(node)

    return []
  })
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const docsPages = getDocsPages(source.pageTree.children)

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/blocks"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ]

  const docsRoutes: MetadataRoute.Sitemap = docsPages.map((page) => ({
    url: absoluteUrl(page.url),
    lastModified: now,
    changeFrequency: "weekly",
    priority: page.url === "/docs/components" ? 0.8 : 0.6,
  }))

  return [...staticRoutes, ...docsRoutes]
}
