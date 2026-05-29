"use client"

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
  return (
    <aside
      data-document-thumbnail-sidebar=""
      data-sidebar-mode={inline ? "inline" : "overlay"}
      data-sidebar-open={open ? "true" : "false"}
      className={cn(
        "absolute inset-y-0 left-0 z-30 w-40 shrink-0 overflow-hidden border-r bg-sidebar shadow-lg transition-[translate,margin-left,border-color] duration-200 ease-out",
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
      <div className="mx-auto h-28 w-20 rounded-sm border bg-background shadow-xs">
        <div className="h-full animate-pulse bg-muted" />
      </div>
      <div className="mx-auto mt-3 h-3 w-10 rounded-full bg-muted" />
    </div>
  )
}
