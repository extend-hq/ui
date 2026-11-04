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
  const docsPages = getDocsPages(source.pageTree.children)

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/") },
    { url: absoluteUrl("/blocks") },
  ]
  const docsRoutes: MetadataRoute.Sitemap = docsPages.map((page) => ({
    url: absoluteUrl(page.url),
  }))

  return [...staticRoutes, ...docsRoutes]
}
