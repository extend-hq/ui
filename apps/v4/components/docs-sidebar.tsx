"use client"

import { Fragment } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { showMcpDocs } from "@/lib/flags"
import {
  getCurrentBase,
  getNestedPagesFromFolder,
  getPagesFromFolder,
} from "@/lib/page-tree"
import type { source } from "@/lib/source"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/registry/new-york-v4/ui/sidebar"

const TOP_LEVEL_SECTIONS = [
  { name: "Introduction", href: "/docs" },
  {
    name: "Components",
    href: "/docs/components",
  },
]
const EXCLUDED_SECTIONS: string[] = []
const EXCLUDED_PAGES = ["/docs"]
const PDF_VIEWER_URL = "/docs/components/pdf-viewer"
const PDF_VIEWER_SUBPAGES = [
  { name: "Citations", url: "/docs/components/pdf-viewer/citations" },
  { name: "OCR Blocks", url: "/docs/components/pdf-viewer/ocr-blocks" },
  { name: "E-Signature", url: "/docs/components/pdf-viewer/e-signature" },
]

export function DocsSidebar({
  tree,
  ...props
}: React.ComponentProps<typeof Sidebar> & { tree: typeof source.pageTree }) {
  const pathname = usePathname()
  const currentBase = getCurrentBase(pathname)

  return (
    <Sidebar
      className="sticky top-[calc(var(--header-height)+0.6rem)] z-30 hidden h-[calc(100svh-10rem)] overscroll-none bg-transparent [--sidebar-menu-width:--spacing(56)] lg:flex"
      collapsible="none"
      {...props}
    >
      <div className="h-9" />
      <div className="absolute top-8 z-10 h-8 w-(--sidebar-menu-width) shrink-0 bg-linear-to-b from-background via-background/80 to-background/50 blur-xs" />
      <div className="absolute top-12 right-2 bottom-0 hidden h-full w-px bg-linear-to-b from-transparent via-border to-transparent lg:flex" />
      <SidebarContent className="mx-auto no-scrollbar w-(--sidebar-menu-width) overflow-x-hidden px-2">
        <SidebarGroup className="pt-6">
          <SidebarGroupLabel className="font-medium text-muted-foreground">
            Sections
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {TOP_LEVEL_SECTIONS.map(({ name, href }) => {
                if (!showMcpDocs && href.includes("/mcp")) {
                  return null
                }
                return (
                  <SidebarMenuItem key={name}>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        href === "/docs"
                          ? pathname === href
                          : pathname.startsWith(href)
                      }
                      className="relative h-[30px] w-fit overflow-visible border border-transparent text-[0.8rem] font-medium after:absolute after:inset-x-0 after:-inset-y-1 after:z-0 after:rounded-md data-[active=true]:border-accent data-[active=true]:bg-accent 3xl:fixed:w-full 3xl:fixed:max-w-48"
                    >
                      <Link href={href}>
                        <span className="absolute inset-0 flex w-(--sidebar-menu-width) bg-transparent" />
                        {name}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {tree.children.map((item) => {
          if (EXCLUDED_SECTIONS.includes(item.$id ?? "")) {
            return null
          }

          const pages =
            item.type === "folder"
              ? getPagesFromFolder(item, currentBase).filter((page) => {
                  if (!showMcpDocs && page.url.includes("/mcp")) {
                    return false
                  }

                  return !EXCLUDED_PAGES.includes(page.url)
                })
              : []

          if (pages.length === 0) {
            return null
          }

          const pdfViewerSubpages =
            item.type === "folder"
              ? getNestedPagesFromFolder(item, "pdf-viewer").filter((page) => {
                  if (!showMcpDocs && page.url.includes("/mcp")) {
                    return false
                  }

                  return !EXCLUDED_PAGES.includes(page.url)
                })
              : []
          const pdfViewerSidebarSubpages =
            pdfViewerSubpages.length > 0
              ? pdfViewerSubpages
              : PDF_VIEWER_SUBPAGES

          return (
            <SidebarGroup key={item.$id}>
              <SidebarGroupLabel className="font-medium text-muted-foreground">
                {item.name}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                {item.type === "folder" && (
                  <SidebarMenu className="gap-0.5">
                    {pages.map((page) => {
                      const isPdfViewer = page.url === PDF_VIEWER_URL
                      const isPdfSubpage =
                        isPdfViewer && pathname.startsWith(`${page.url}/`)

                      return (
                        <Fragment key={page.url}>
                          <SidebarMenuItem>
                            <SidebarMenuButton
                              asChild
                              isActive={page.url === pathname || isPdfSubpage}
                              className="relative h-[30px] w-fit overflow-visible border border-transparent text-[0.8rem] font-medium after:absolute after:inset-x-0 after:-inset-y-1 after:z-0 after:rounded-md data-[active=true]:border-accent data-[active=true]:bg-accent 3xl:fixed:w-full 3xl:fixed:max-w-48"
                            >
                              <Link href={page.url}>
                                <span className="absolute inset-0 flex w-(--sidebar-menu-width) bg-transparent" />
                                {page.name}
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                          {isPdfViewer &&
                          pdfViewerSidebarSubpages.length > 0 ? (
                            <>
                              {pdfViewerSidebarSubpages.map(
                                (subpage, index) => (
                                  <SidebarMenuItem
                                    key={subpage.url}
                                    className={cn(
                                      "ml-5 border-l border-border/70",
                                      index === 0 && "mt-1"
                                    )}
                                  >
                                    <SidebarMenuButton
                                      asChild
                                      isActive={subpage.url === pathname}
                                      className="relative h-7 w-fit overflow-visible border border-transparent text-[0.78rem] font-medium text-muted-foreground after:absolute after:inset-x-0 after:-inset-y-1 after:z-0 after:rounded-md data-[active=true]:border-accent data-[active=true]:bg-accent data-[active=true]:text-foreground 3xl:fixed:w-full 3xl:fixed:max-w-44"
                                    >
                                      <Link href={subpage.url}>
                                        <span className="absolute inset-0 flex w-[calc(var(--sidebar-menu-width)-1.25rem)] bg-transparent" />
                                        {subpage.name}
                                      </Link>
                                    </SidebarMenuButton>
                                  </SidebarMenuItem>
                                )
                              )}
                            </>
                          ) : null}
                        </Fragment>
                      )
                    })}
                  </SidebarMenu>
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
        <div className="sticky -bottom-1 z-10 h-16 shrink-0 bg-linear-to-t from-background via-background/80 to-background/50 blur-xs" />
      </SidebarContent>
    </Sidebar>
  )
}
