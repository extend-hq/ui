import type { source } from "@/lib/source"

export type PageTreeNode = (typeof source.pageTree)["children"][number]
export type PageTreeFolder = Extract<PageTreeNode, { type: "folder" }>
export type PageTreePage = Extract<PageTreeNode, { type: "page" }>

// Recursively find all pages in a folder tree.
export function getAllPagesFromFolder(folder: PageTreeFolder): PageTreePage[] {
  const pages: PageTreePage[] = []

  for (const child of folder.children) {
    if (child.type === "page") {
      pages.push(child)
    } else if (child.type === "folder") {
      pages.push(...getAllPagesFromFolder(child))
    }
  }

  return pages
}

// Get the pages from a folder, handling nested base folders (radix/base).
export function getPagesFromFolder(
  folder: PageTreeFolder,
  currentBase: string
): PageTreePage[] {
  // For the components folder, find the base subfolder.
  if (folder.$id === "components" || folder.name === "Components") {
    for (const child of folder.children) {
      if (child.type === "folder") {
        // Match by $id or by name.
        const isRadix = child.$id === "radix" || child.name === "Radix UI"
        const isBase = child.$id === "base" || child.name === "Base UI"

        if (
          (currentBase === "radix" && isRadix) ||
          (currentBase === "base" && isBase)
        ) {
          return child.children.filter(
            (c): c is PageTreePage => c.type === "page"
          )
        }
      }
    }

    // Fallback: return direct component pages. Nested folders are rendered as
    // contextual subpages in the sidebar instead of top-level component links.
    return folder.children.filter(
      (child): child is PageTreePage =>
        child.type === "page" && !child.url.endsWith("/components")
    )
  }

  // For other folders, return direct page children.
  return folder.children.filter(
    (child): child is PageTreePage =>
      child.type === "page" && !child.url.endsWith("/components")
  )
}

export function getNestedPagesFromFolder(
  folder: PageTreeFolder,
  folderId: string
): PageTreePage[] {
  const nestedFolder = folder.children.find(
    (child): child is PageTreeFolder =>
      child.type === "folder" &&
      (child.$id === folderId ||
        child.$id?.endsWith(`/${folderId}`) ||
        (typeof child.name === "string" &&
          child.name.toLowerCase().replaceAll(" ", "-") === folderId) ||
        getAllPagesFromFolder(child).some((page) =>
          page.url.includes(`/components/${folderId}/`)
        ))
  )

  if (!nestedFolder) {
    return []
  }

  return getAllPagesFromFolder(nestedFolder).filter(
    (page) => !page.url.endsWith("/components")
  )
}

// Get current base (radix or base) from pathname.
export function getCurrentBase(pathname: string): string {
  const baseMatch = pathname.match(/\/docs\/components\/(radix|base)\//)
  return baseMatch ? baseMatch[1] : "radix" // Default to radix.
}
