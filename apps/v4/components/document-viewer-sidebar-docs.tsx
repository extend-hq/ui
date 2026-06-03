"use client"

import * as React from "react"
import { SidebarLeftIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DocumentViewerSidebarSkeleton,
  DocumentViewerThumbnailSidebar,
  useElementWidth,
  useInlineThumbnailSidebar,
} from "@/components/ui/document-viewer-sidebar"
import {
  DocsSourceCodeBlock,
  DocsViewCodeBlock,
} from "@/components/docs-code-block"

const demoPages = [
  { id: 1, label: "Invoice summary" },
  { id: 2, label: "Line items" },
  { id: 3, label: "Approval trail" },
  { id: 4, label: "Exception notes" },
] as const

function DemoThumbnail({
  active,
  page,
}: {
  active: boolean
  page: (typeof demoPages)[number]
}) {
  return (
    <div
      className={cn(
        "h-28 w-20 overflow-hidden rounded-md border bg-background p-2 shadow-xs transition-shadow",
        active && "shadow-sm ring-2 ring-ring/32"
      )}
    >
      <div className="mb-2 h-2 w-8 rounded-full bg-muted-foreground/24" />
      <div className="space-y-1.5">
        <div className="h-1.5 rounded-full bg-muted-foreground/20" />
        <div className="h-1.5 w-10 rounded-full bg-muted-foreground/20" />
        <div className="h-1.5 rounded-full bg-muted-foreground/20" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-1">
        <div className="h-5 rounded bg-muted" />
        <div className="h-5 rounded bg-muted" />
        <div className="h-5 rounded bg-muted" />
        <div className="h-5 rounded bg-muted" />
      </div>
    </div>
  )
}

function DemoDocumentPage({
  activePage,
}: {
  activePage: (typeof demoPages)[number]
}) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[520px] items-start justify-center p-6">
      <div className="w-full rounded-sm border bg-background p-8 shadow-xs">
        <div className="h-2 w-20 rounded-full bg-muted-foreground/24" />
        <div className="mt-5 h-5 w-2/3 rounded-full bg-foreground/12" />
        <div className="mt-6 space-y-2">
          <div className="h-2 rounded-full bg-muted-foreground/16" />
          <div className="h-2 rounded-full bg-muted-foreground/16" />
          <div className="h-2 w-4/5 rounded-full bg-muted-foreground/16" />
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3">
          <div className="h-20 rounded-md border bg-muted/40" />
          <div className="h-20 rounded-md border bg-muted/40" />
          <div className="h-20 rounded-md border bg-muted/40" />
          <div className="h-20 rounded-md border bg-muted/40" />
        </div>
        <div className="mt-6 text-sm font-medium text-muted-foreground">
          Page {activePage.id}: {activePage.label}
        </div>
      </div>
    </div>
  )
}

function DocumentViewerSidebarPreview() {
  const [viewerShellRef, viewerShellWidth] = useElementWidth<HTMLDivElement>()
  const sidebarInline = useInlineThumbnailSidebar(viewerShellWidth)
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const [activePageId, setActivePageId] = React.useState(1)
  const activePage =
    demoPages.find((page) => page.id === activePageId) ?? demoPages[0]

  return (
    <div className="bg-background p-4 sm:p-6">
      <div className="mx-auto flex h-[460px] max-w-4xl flex-col overflow-hidden rounded-lg border bg-background">
        <div className="flex min-h-12 items-center justify-between gap-3 border-b px-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Toggle thumbnails"
              data-pressed={sidebarOpen ? "" : undefined}
              onClick={() => setSidebarOpen((open) => !open)}
            >
              <HugeiconsIcon icon={SidebarLeftIcon} className="size-4" />
            </Button>
            <div className="text-sm whitespace-nowrap text-primary">
              Page {activePage.id} of {demoPages.length}
            </div>
          </div>
          <div className="hidden text-xs text-muted-foreground sm:block">
            {sidebarInline ? "Inline thumbnails" : "Overlay thumbnails"}
          </div>
        </div>
        <div
          ref={viewerShellRef}
          className="relative flex min-h-0 flex-1 overflow-hidden bg-muted/30"
        >
          {sidebarOpen ? null : (
            <DocumentViewerSidebarSkeleton inline={sidebarInline} />
          )}
          <DocumentViewerThumbnailSidebar
            inline={sidebarInline}
            open={sidebarOpen}
          >
            <div className="h-full overflow-auto p-4">
              <div className="flex flex-col items-center gap-3">
                {demoPages.map((page) => (
                  <Button
                    key={page.id}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "!h-auto w-full flex-col items-center gap-2 p-2 text-xs shadow-none hover:bg-sidebar-accent",
                      page.id === activePageId
                        ? "bg-sidebar-accent text-foreground"
                        : "text-muted-foreground"
                    )}
                    onClick={() => setActivePageId(page.id)}
                  >
                    <DemoThumbnail
                      active={page.id === activePageId}
                      page={page}
                    />
                    {page.id}
                  </Button>
                ))}
              </div>
            </div>
          </DocumentViewerThumbnailSidebar>
          <div className="min-w-0 flex-1 overflow-auto">
            <DemoDocumentPage activePage={activePage} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function DocumentViewerSidebarDemo() {
  return (
    <div
      data-slot="component-preview"
      className="group relative mt-4 mb-12 flex flex-col overflow-hidden rounded-xl border"
    >
      <DocumentViewerSidebarPreview />
      <DocsViewCodeBlock code={documentViewerSidebarUsageCode} />
    </div>
  )
}

const documentViewerSidebarUsageCode = `"use client"

import * as React from "react"

import {
  DocumentViewerThumbnailSidebar,
  useElementWidth,
  useInlineThumbnailSidebar,
} from "@/components/ui/document-viewer-sidebar"

const pages = [1, 2, 3, 4]

export function DocumentViewerShell() {
  const [viewerShellRef, viewerShellWidth] = useElementWidth<HTMLDivElement>()
  const sidebarInline = useInlineThumbnailSidebar(viewerShellWidth)
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const [activePage, setActivePage] = React.useState(1)

  return (
    <div className="flex h-[560px] flex-col overflow-hidden border bg-background">
      <button type="button" onClick={() => setSidebarOpen((open) => !open)}>
        Toggle thumbnails
      </button>
      <div
        ref={viewerShellRef}
        className="relative flex min-h-0 flex-1 overflow-hidden bg-muted/30"
      >
        <DocumentViewerThumbnailSidebar
          inline={sidebarInline}
          open={sidebarOpen}
        >
          <div className="h-full overflow-auto p-4">
            {pages.map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setActivePage(page)}
              >
                Page {page}
              </button>
            ))}
          </div>
        </DocumentViewerThumbnailSidebar>
        <div className="min-w-0 flex-1 overflow-auto">
          Active page: {activePage}
        </div>
      </div>
    </div>
  )
}`

const documentViewerSidebarSourceCode = `"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

const INLINE_THUMBNAIL_SIDEBAR_MIN_WIDTH = 768

export function useElementWidth<TElement extends HTMLElement>() {
  const ref = React.useRef<TElement | null>(null)
  const [width, setWidth] = React.useState(0)

  React.useLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    const updateWidth = () => {
      setWidth(element.getBoundingClientRect().width)
    }

    updateWidth()

    const observer = new ResizeObserver(updateWidth)
    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  return [ref, width] as const
}

export function useInlineThumbnailSidebar(width: number) {
  return width >= INLINE_THUMBNAIL_SIDEBAR_MIN_WIDTH
}

export function DocumentViewerThumbnailSidebar({
  children,
  className,
  inline,
  open,
}: {
  children: React.ReactNode
  className?: string
  inline: boolean
  open: boolean
}) {
  const [transitionsReady, setTransitionsReady] = React.useState(false)
  const shouldAnimateSidebar = transitionsReady && open

  React.useEffect(() => {
    let secondFrameId = 0
    const firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        setTransitionsReady(true)
      })
    })

    return () => {
      window.cancelAnimationFrame(firstFrameId)
      window.cancelAnimationFrame(secondFrameId)
    }
  }, [])

  return (
    <aside
      data-document-thumbnail-sidebar=""
      data-sidebar-mode={inline ? "inline" : "overlay"}
      data-sidebar-open={open ? "true" : "false"}
      className={cn(
        "absolute inset-y-0 left-0 z-30 w-40 shrink-0 overflow-hidden border-r bg-sidebar shadow-lg",
        shouldAnimateSidebar
          ? "transition-[translate,margin-left,border-color] duration-200 ease-out"
          : "transition-none",
        inline && "relative z-auto translate-x-0 shadow-none",
        open
          ? "ml-0 translate-x-0"
          : inline
            ? "pointer-events-auto -ml-40 border-r-0"
            : "pointer-events-none -translate-x-full border-r-0",
        className
      )}
    >
      {children}
    </aside>
  )
}

export function DocumentViewerSidebarSkeleton({ inline }: { inline: boolean }) {
  if (!inline) return null

  return (
    <div className="w-40 shrink-0 border-r bg-sidebar p-4">
      <div className="mx-auto h-28 w-20 overflow-hidden rounded-md bg-background shadow-xs">
        <div className="h-full animate-pulse bg-muted" />
      </div>
      <div className="mx-auto mt-3 h-3 w-10 rounded-full bg-muted" />
    </div>
  )
}`

export function DocumentViewerSidebarSource() {
  return (
    <DocsSourceCodeBlock
      code={documentViewerSidebarSourceCode}
      fileName="components/ui/document-viewer-sidebar.tsx"
    />
  )
}
