"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import {
  MinusSignCircleIcon,
  PlusSignCircleIcon,
  RotateClockwiseIcon,
  Search01Icon,
  SidebarLeftIcon,
  Upload01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { HighlightedCodeBlock } from "@/components/highlighted-code-block"
import { Separator } from "@/registry/new-york-v4/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/new-york-v4/ui/tooltip"

function ToolbarTooltip({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{children}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

function PdfViewerLoadingShell() {
  return (
    <div
      data-slot="pdf-viewer"
      data-loading
      className="flex h-[560px] w-full flex-col overflow-hidden bg-background"
    >
      <div className="flex min-h-12 items-center justify-between gap-3 border-b px-3">
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <ToolbarTooltip label="Toggle thumbnails">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Toggle thumbnails"
                disabled
              >
                <HugeiconsIcon icon={SidebarLeftIcon} className="size-4" />
              </Button>
            </ToolbarTooltip>
          </TooltipProvider>
          <div className="text-sm whitespace-nowrap text-primary">
            Page 1 of -
          </div>
        </div>
        <TooltipProvider>
          <div className="flex min-w-0 items-center gap-1">
            <ToolbarTooltip label="Rotate counterclockwise">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Rotate counterclockwise"
                disabled
              >
                <HugeiconsIcon
                  icon={RotateClockwiseIcon}
                  className="size-4 -scale-x-100"
                />
              </Button>
            </ToolbarTooltip>
            <ToolbarTooltip label="Rotate clockwise">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Rotate clockwise"
                disabled
              >
                <HugeiconsIcon icon={RotateClockwiseIcon} className="size-4" />
              </Button>
            </ToolbarTooltip>
            <Separator
              orientation="vertical"
              className="mx-1 h-4 self-center"
            />
            <ToolbarTooltip label="Zoom out">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Zoom out"
                disabled
              >
                <HugeiconsIcon icon={MinusSignCircleIcon} className="size-4" />
              </Button>
            </ToolbarTooltip>
            <Select value="0.75" disabled>
              <div className="hidden sm:block">
                <SelectTrigger size="sm" className="w-[84px] min-w-[84px]">
                  <SelectValue placeholder="Zoom">75%</SelectValue>
                </SelectTrigger>
              </div>
            </Select>
            <ToolbarTooltip label="Zoom in">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Zoom in"
                disabled
              >
                <HugeiconsIcon icon={PlusSignCircleIcon} className="size-4" />
              </Button>
            </ToolbarTooltip>
            <Separator
              orientation="vertical"
              className="mx-1 h-4 self-center"
            />
            <ToolbarTooltip label="Search text">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Search text"
                disabled
              >
                <HugeiconsIcon icon={Search01Icon} className="size-4" />
              </Button>
            </ToolbarTooltip>
            <ToolbarTooltip label="Upload PDF">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Upload PDF"
                disabled
              >
                <HugeiconsIcon icon={Upload01Icon} className="size-4" />
              </Button>
            </ToolbarTooltip>
          </div>
        </TooltipProvider>
      </div>
      <div className="grid h-full min-h-0 w-full flex-1 place-items-center">
        <Spinner className="size-4" />
      </div>
    </div>
  )
}

const PdfViewerPreview = dynamic(
  () =>
    import("@/components/pdf-viewer-preview-client").then(
      (mod) => mod.PdfViewerPreviewClient
    ),
  {
    ssr: false,
    loading: () => <PdfViewerLoadingShell />,
  }
)

const pdfViewerUsageCode = `"use client";

import { PDFViewer } from "@/components/ui/pdf-viewer";

export function PdfViewerExample() {
  return (
    <PDFViewer
      file="/path/to/document.pdf"
      className="h-[640px]"
      defaultThumbnailSidebarOpen={false}
    />
  );
}`

const PdfViewerSourceCode = dynamic(
  () =>
    import("@/components/pdf-viewer-source-code").then(
      (mod) => mod.PdfViewerSourceCode
    ),
  {
    ssr: false,
    loading: () => <PdfViewerSourceShell />,
  }
)

function PdfViewerSourceShell() {
  return (
    <div
      data-slot="pdf-viewer-source-shell"
      className="h-72 rounded-lg border bg-code"
    />
  )
}

export function PdfViewerDemo() {
  const [isCodeVisible, setIsCodeVisible] = React.useState(false)

  return (
    <div
      data-slot="component-preview"
      className="group relative mt-4 mb-12 flex flex-col overflow-hidden rounded-xl border"
    >
      <PdfViewerPreview />
      <div
        data-slot="code"
        data-mobile-code-visible={isCodeVisible}
        className="relative overflow-hidden **:data-[slot=copy-button]:right-4 **:data-[slot=copy-button]:hidden data-[mobile-code-visible=true]:**:data-[slot=copy-button]:flex [&_[data-rehype-pretty-code-figure]]:m-0! [&_[data-rehype-pretty-code-figure]]:rounded-t-none [&_[data-rehype-pretty-code-figure]]:border-t [&_pre]:max-h-72"
      >
        {isCodeVisible ? (
          <HighlightedCodeBlock
            code={pdfViewerUsageCode}
            className="rounded-none border-x-0 border-b-0"
          />
        ) : (
          <div className="relative">
            <HighlightedCodeBlock
              code={pdfViewerUsageCode}
              className="rounded-none border-x-0 border-b-0"
              maxHeightClassName="max-h-56"
              previewLines={10}
              showCopy={false}
            />
            <div className="absolute inset-0 flex items-center justify-center pb-4">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, var(--color-code), color-mix(in oklab, var(--color-code) 60%, transparent), transparent)",
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="docs-view-code-button relative z-10 rounded-lg"
                onClick={() => setIsCodeVisible(true)}
              >
                View Code
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function PdfViewerSource() {
  const [shouldLoadSource, setShouldLoadSource] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    if (!("IntersectionObserver" in window)) {
      setShouldLoadSource(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return

        setShouldLoadSource(true)
        observer.disconnect()
      },
      { rootMargin: "700px 0px" }
    )

    observer.observe(container)

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef}>
      {shouldLoadSource ? <PdfViewerSourceCode /> : <PdfViewerSourceShell />}
    </div>
  )
}
