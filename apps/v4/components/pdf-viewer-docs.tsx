"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import {
  Loading03Icon,
  MinusSignCircleIcon,
  PlusSignCircleIcon,
  RotateClockwiseIcon,
  Search01Icon,
  SidebarLeftIcon,
  Upload01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { HighlightedCodeBlock } from "@/components/highlighted-code-block"
import {
  Select,
  SelectTrigger,
  SelectValue,
} from "@/registry/new-york-v4/ui/select"
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
        <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
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
  return <PDFViewer file="/path/to/document.pdf" className="h-[640px]" />;
}`

const pdfViewerSourceCode = `"use client"

import * as React from "react"
import {
  Loading03Icon,
  MinusSignCircleIcon,
  PlusSignCircleIcon,
  RotateClockwiseIcon,
  Search01Icon,
  SidebarLeftIcon,
  Upload01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type * as ReactPdf from "react-pdf"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/registry/new-york-v4/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/registry/new-york-v4/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/new-york-v4/ui/select"
import { Separator } from "@/registry/new-york-v4/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/new-york-v4/ui/tooltip"

type ReactPdfModule = typeof ReactPdf

export type PDFViewerPageOverlayProps = {
  pageNumber: number
  pageWidth: number
  pageHeight: number
  scale: number
  rotation: number
}

export type PDFViewerHandle = {
  scrollToPage: (pageNumber: number, options?: ScrollIntoViewOptions) => void
  scrollToPageArea: (
    pageNumber: number,
    area: { top: number; left?: number; width?: number; height?: number },
    options?: ScrollToOptions
  ) => void
  getViewportElement: () => HTMLDivElement | null
}

export type PDFViewerProps = {
  file?: string
  className?: string
  defaultZoom?: number
  pageWidth?: number
  pageHeight?: number
  pageNumbers?: number[]
  pageRenderBuffer?: number
  showRotateControls?: boolean
  showUpload?: boolean
  toolbarActions?: React.ReactNode
  pageClassName?: (pageNumber: number) => string | undefined
  renderPageOverlay?: (props: PDFViewerPageOverlayProps) => React.ReactNode
  onActivePageChange?: (pageNumber: number) => void
  onDocumentLoadSuccess?: (numPages: number) => void
  onPdfUpload?: (file: File) => void
  onPagePointerDown?: (
    event: React.PointerEvent<HTMLDivElement>,
    pageNumber: number
  ) => void
  onPagePointerMove?: (
    event: React.PointerEvent<HTMLDivElement>,
    pageNumber: number
  ) => void
  onPagePointerUp?: (
    event: React.PointerEvent<HTMLDivElement>,
    pageNumber: number
  ) => void
  onPagePointerCancel?: (
    event: React.PointerEvent<HTMLDivElement>,
    pageNumber: number
  ) => void
}

const DEFAULT_FILE = "/samples/attention.pdf"
const DEFAULT_PAGE_WIDTH = 612
const DEFAULT_PAGE_HEIGHT = 792
const DEFAULT_ZOOM = 0.75
const ZOOM_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2]
const MAX_DEVICE_PIXEL_RATIO = 2
const DEFAULT_PAGE_RENDER_BUFFER = 2
const THUMBNAIL_WIDTH = 92
const PDF_WORKER_URL = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  import.meta.url
).toString()

type SearchHighlight = {
  id: string
  left: number
  top: number
  width: number
  height: number
}

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

function SearchInput({
  value,
  onValueChange,
  onApply,
  onClear,
}: {
  value: string
  onValueChange: (value: string) => void
  onApply: () => void
  onClear: () => void
}) {
  return (
    <div className="space-y-3">
      <Input
        placeholder="Search text"
        value={value}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          onValueChange(event.target.value)
        }
        onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
          if (event.key === "Enter") {
            onApply()
          }
        }}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onClear}>
          Clear
        </Button>
        <Button type="button" size="sm" onClick={onApply}>
          Search
        </Button>
      </div>
    </div>
  )
}

function PDFViewerPage({
  reactPdf,
  pageNumber,
  pageStyle,
  renderedPageWidth,
  zoom,
  rotation,
  shouldRenderPage,
  searchQuery,
  isFirstRenderedPage,
  pageClassName,
  renderPageOverlay,
  onFirstPageSettled,
  onPagePointerDown,
  onPagePointerMove,
  onPagePointerUp,
  onPagePointerCancel,
}: {
  reactPdf: ReactPdfModule
  pageNumber: number
  pageStyle: React.CSSProperties & { width: number; height: number }
  renderedPageWidth: number
  zoom: number
  rotation: number
  shouldRenderPage: boolean
  searchQuery: string
  isFirstRenderedPage: boolean
  pageClassName?: (pageNumber: number) => string | undefined
  renderPageOverlay?: (props: PDFViewerPageOverlayProps) => React.ReactNode
  onFirstPageSettled: () => void
  onPagePointerDown?: (
    event: React.PointerEvent<HTMLDivElement>,
    pageNumber: number
  ) => void
  onPagePointerMove?: (
    event: React.PointerEvent<HTMLDivElement>,
    pageNumber: number
  ) => void
  onPagePointerUp?: (
    event: React.PointerEvent<HTMLDivElement>,
    pageNumber: number
  ) => void
  onPagePointerCancel?: (
    event: React.PointerEvent<HTMLDivElement>,
    pageNumber: number
  ) => void
}) {
  const pageRef = React.useRef<HTMLDivElement>(null)
  const [searchHighlights, setSearchHighlights] = React.useState<
    SearchHighlight[]
  >([])
  const hasSearchQuery = Boolean(searchQuery.trim())

  const updateSearchHighlights = React.useCallback(() => {
    const pageElement = pageRef.current
    const query = searchQuery.trim().toLowerCase()

    if (!pageElement || !query) {
      setSearchHighlights([])
      return
    }

    const textLayer = pageElement.querySelector<HTMLElement>(
      ".react-pdf__Page__textContent"
    )

    if (!textLayer) {
      setSearchHighlights([])
      return
    }

    const pageRect = pageElement.getBoundingClientRect()
    const nextHighlights: SearchHighlight[] = []

    textLayer.querySelectorAll<HTMLElement>("span").forEach((span, index) => {
      const textNode = Array.from(span.childNodes).find(
        (node): node is Text => node.nodeType === Node.TEXT_NODE
      )
      const text = textNode?.textContent ?? ""
      const normalizedText = text.toLowerCase()
      let matchIndex = normalizedText.indexOf(query)

      while (textNode && matchIndex !== -1) {
        const range = document.createRange()
        range.setStart(textNode, matchIndex)
        range.setEnd(textNode, matchIndex + query.length)

        Array.from(range.getClientRects()).forEach((rect, rectIndex) => {
          if (rect.width <= 0 || rect.height <= 0) return

          nextHighlights.push({
            id: \`\${pageNumber}-\${index}-\${matchIndex}-\${rectIndex}\`,
            left: rect.left - pageRect.left,
            top: rect.top - pageRect.top,
            width: rect.width,
            height: rect.height,
          })
        })

        range.detach()
        matchIndex = normalizedText.indexOf(query, matchIndex + query.length)
      }
    })

    setSearchHighlights(nextHighlights)
  }, [pageNumber, searchQuery])

  React.useEffect(() => {
    if (!shouldRenderPage || !hasSearchQuery) {
      setSearchHighlights([])
      return
    }

    const frame = window.requestAnimationFrame(updateSearchHighlights)
    return () => window.cancelAnimationFrame(frame)
  }, [hasSearchQuery, shouldRenderPage, updateSearchHighlights])

  return (
    <div
      ref={pageRef}
      data-pdf-viewer-page={pageNumber}
      className={cn("relative", pageClassName?.(pageNumber))}
      style={pageStyle}
      onPointerDown={(event) => onPagePointerDown?.(event, pageNumber)}
      onPointerMove={(event) => onPagePointerMove?.(event, pageNumber)}
      onPointerUp={(event) => onPagePointerUp?.(event, pageNumber)}
      onPointerCancel={(event) => onPagePointerCancel?.(event, pageNumber)}
    >
      {shouldRenderPage ? (
        <>
          <reactPdf.Page
            pageNumber={pageNumber}
            width={renderedPageWidth}
            rotate={rotation}
            className="overflow-hidden border bg-background shadow-xs"
            renderAnnotationLayer={false}
            renderTextLayer={hasSearchQuery}
            devicePixelRatio={
              typeof window === "undefined"
                ? 1
                : Math.min(MAX_DEVICE_PIXEL_RATIO, window.devicePixelRatio || 1)
            }
            loading={
              <div className="grid place-items-center" style={pageStyle}>
                <HugeiconsIcon
                  icon={Loading03Icon}
                  className="size-4 animate-spin"
                />
              </div>
            }
            onRenderSuccess={
              isFirstRenderedPage ? onFirstPageSettled : undefined
            }
            onRenderTextLayerSuccess={updateSearchHighlights}
            onRenderError={isFirstRenderedPage ? onFirstPageSettled : undefined}
          />
          {searchHighlights.length ? (
            <div className="pointer-events-none absolute inset-0 z-10">
              {searchHighlights.map((highlight) => (
                <div
                  key={highlight.id}
                  className="absolute rounded-[2px] bg-yellow-300/45 mix-blend-multiply ring-1 ring-yellow-500/20 dark:bg-yellow-300/35"
                  style={{
                    left: highlight.left,
                    top: highlight.top,
                    width: highlight.width,
                    height: highlight.height,
                  }}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <div className="size-full border bg-muted/30 shadow-xs" />
      )}
      {renderPageOverlay?.({
        pageNumber,
        pageWidth: pageStyle.width,
        pageHeight: pageStyle.height,
        scale: zoom,
        rotation,
      })}
    </div>
  )
}

export const PDFViewer = React.forwardRef<PDFViewerHandle, PDFViewerProps>(
  function PDFViewer(
    {
      file = DEFAULT_FILE,
      className,
      defaultZoom = DEFAULT_ZOOM,
      pageWidth = DEFAULT_PAGE_WIDTH,
      pageHeight = DEFAULT_PAGE_HEIGHT,
      pageNumbers,
      pageRenderBuffer = DEFAULT_PAGE_RENDER_BUFFER,
      showRotateControls = true,
      showUpload = true,
      toolbarActions,
      pageClassName,
      renderPageOverlay,
      onActivePageChange,
      onDocumentLoadSuccess,
      onPdfUpload,
      onPagePointerDown,
      onPagePointerMove,
      onPagePointerUp,
      onPagePointerCancel,
    },
    ref
  ) {
    const [reactPdf, setReactPdf] = React.useState<ReactPdfModule | null>(null)
    const [pdfFile, setPdfFile] = React.useState(file)
    const [uploadedPdfUrl, setUploadedPdfUrl] = React.useState<string | null>(
      null
    )
    const [numPages, setNumPages] = React.useState(0)
    const [activePage, setActivePage] = React.useState(1)
    const [zoom, setZoom] = React.useState(defaultZoom)
    const [rotation, setRotation] = React.useState(0)
    const [sidebarOpen, setSidebarOpen] = React.useState(true)
    const [searchDraft, setSearchDraft] = React.useState("")
    const [searchQuery, setSearchQuery] = React.useState("")
    const [isDocumentLoading, setIsDocumentLoading] = React.useState(true)
    const [isFirstPageRendering, setIsFirstPageRendering] = React.useState(true)
    const [loadError, setLoadError] = React.useState(false)
    const viewportRef = React.useRef<HTMLDivElement>(null)
    const thumbnailClickScrollYRef = React.useRef<number | null>(null)

    React.useEffect(() => {
      setPdfFile(file)
    }, [file])

    React.useEffect(() => {
      let mounted = true

      void import("react-pdf")
        .then((module) => {
          module.pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL

          if (mounted) {
            setReactPdf(module)
          }
        })
        .catch(() => {
          if (mounted) {
            setLoadError(true)
            setIsDocumentLoading(false)
            setIsFirstPageRendering(false)
          }
        })

      return () => {
        mounted = false
      }
    }, [])

    React.useEffect(() => {
      return () => {
        if (uploadedPdfUrl) {
          URL.revokeObjectURL(uploadedPdfUrl)
        }
      }
    }, [uploadedPdfUrl])

    const renderedPageNumbers = React.useMemo(() => {
      if (pageNumbers?.length) return pageNumbers

      return Array.from({ length: numPages || 1 }, (_, index) => index + 1)
    }, [numPages, pageNumbers])

    const firstRenderedPage = renderedPageNumbers[0] ?? 1
    const isRotated = Math.abs(Math.round(rotation / 90)) % 2 === 1
    const renderedPageWidth = (isRotated ? pageHeight : pageWidth) * zoom
    const renderedPageHeight = (isRotated ? pageWidth : pageHeight) * zoom
    const controlsDisabled = !reactPdf || !numPages
    const isLoading = !reactPdf || isDocumentLoading || isFirstPageRendering
    const thumbnailIsRotated = Math.abs(Math.round(rotation / 90)) % 2 === 1
    const thumbnailSize = {
      width: THUMBNAIL_WIDTH,
      height: Math.round(
        THUMBNAIL_WIDTH *
          (thumbnailIsRotated ? pageWidth / pageHeight : pageHeight / pageWidth)
      ),
    }

    const updateActivePageFromViewport = React.useCallback(() => {
      const viewport = viewportRef.current
      if (!viewport || !renderedPageNumbers.length) return

      const viewportRect = viewport.getBoundingClientRect()
      const viewportCenter = viewportRect.top + viewportRect.height / 2
      let closestPage = renderedPageNumbers[0] ?? 1
      let closestDistance = Number.POSITIVE_INFINITY

      viewport
        .querySelectorAll<HTMLElement>("[data-pdf-viewer-page]")
        .forEach((page) => {
          const pageRect = page.getBoundingClientRect()
          const pageCenter = pageRect.top + pageRect.height / 2
          const distance = Math.abs(pageCenter - viewportCenter)

          if (distance < closestDistance) {
            closestDistance = distance
            closestPage = Number(page.dataset.pdfViewerPage || "1")
          }
        })

      setActivePage((currentPage) => {
        if (currentPage === closestPage) return currentPage
        onActivePageChange?.(closestPage)
        return closestPage
      })
    }, [onActivePageChange, renderedPageNumbers])

    React.useEffect(() => {
      const viewport = viewportRef.current
      if (!viewport || !numPages) return

      let frameId = 0
      const handleScroll = () => {
        window.cancelAnimationFrame(frameId)
        frameId = window.requestAnimationFrame(updateActivePageFromViewport)
      }

      frameId = window.requestAnimationFrame(updateActivePageFromViewport)
      viewport.addEventListener("scroll", handleScroll, { passive: true })

      return () => {
        window.cancelAnimationFrame(frameId)
        viewport.removeEventListener("scroll", handleScroll)
      }
    }, [numPages, updateActivePageFromViewport])

    React.useImperativeHandle(
      ref,
      () => ({
        scrollToPage: (pageNumber, options) => {
          const page = viewportRef.current?.querySelector<HTMLElement>(
            \`[data-pdf-viewer-page="\${pageNumber}"]\`
          )

          page?.scrollIntoView({
            block: "start",
            inline: "nearest",
            ...options,
          })
        },
        scrollToPageArea: (pageNumber, area, options) => {
          const viewport = viewportRef.current
          const page = viewport?.querySelector<HTMLElement>(
            \`[data-pdf-viewer-page="\${pageNumber}"]\`
          )

          if (!viewport || !page) return

          const pageTop =
            page.getBoundingClientRect().top -
            viewport.getBoundingClientRect().top +
            viewport.scrollTop
          const targetTop =
            pageTop +
            (area.top / 100) * page.getBoundingClientRect().height -
            96

          viewport.scrollTo({
            top: Math.max(0, targetTop),
            behavior: "smooth",
            ...options,
          })
        },
        getViewportElement: () => viewportRef.current,
      }),
      []
    )

    const restoreWindowScroll = React.useCallback((scrollY: number) => {
      window.scrollTo({ top: scrollY })
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY })
        window.requestAnimationFrame(() => {
          window.scrollTo({ top: scrollY })
        })
      })
      ;[0, 50, 150, 300].forEach((delay) => {
        window.setTimeout(() => {
          window.scrollTo({ top: scrollY })
        }, delay)
      })
    }, [])

    const scrollToPage = React.useCallback(
      (pageNumber: number) => {
        const windowScrollY = thumbnailClickScrollYRef.current ?? window.scrollY
        setActivePage(pageNumber)

        const viewport = viewportRef.current
        const page = viewport?.querySelector<HTMLElement>(
          \`[data-pdf-viewer-page="\${pageNumber}"]\`
        )

        if (!viewport || !page) {
          restoreWindowScroll(windowScrollY)
          return
        }

        viewport.scrollTo({
          top:
            page.getBoundingClientRect().top -
            viewport.getBoundingClientRect().top +
            viewport.scrollTop -
            24,
          behavior: "auto",
        })
        restoreWindowScroll(windowScrollY)
        window.setTimeout(() => {
          if (thumbnailClickScrollYRef.current === windowScrollY) {
            thumbnailClickScrollYRef.current = null
          }
        }, 350)
      },
      [restoreWindowScroll]
    )

    const preserveThumbnailClickScroll = React.useCallback(
      (event: React.PointerEvent | React.MouseEvent) => {
        event.preventDefault()

        if (thumbnailClickScrollYRef.current === null) {
          thumbnailClickScrollYRef.current = window.scrollY
        }
      },
      []
    )

    const handleLoadStart = React.useCallback(() => {
      setIsDocumentLoading(true)
      setIsFirstPageRendering(true)
      setLoadError(false)
      setNumPages(0)
      setActivePage(1)
      onActivePageChange?.(1)
      setSearchQuery("")
      setSearchDraft("")
      viewportRef.current?.scrollTo({ top: 0, left: 0 })
    }, [onActivePageChange])

    const handleLoadSuccess = React.useCallback(
      ({ numPages: nextNumPages }: { numPages: number }) => {
        setNumPages(nextNumPages)
        setIsDocumentLoading(false)
        setIsFirstPageRendering(true)
        setLoadError(false)
        setActivePage(1)
        onActivePageChange?.(1)
        onDocumentLoadSuccess?.(nextNumPages)
        setSearchQuery("")
        setSearchDraft("")
        viewportRef.current?.scrollTo({ top: 0, left: 0 })
      },
      [onActivePageChange, onDocumentLoadSuccess]
    )

    const handleLoadError = React.useCallback(() => {
      setIsDocumentLoading(false)
      setIsFirstPageRendering(false)
      setLoadError(true)
      setNumPages(0)
    }, [])

    const handleUpload = React.useCallback(
      (file: File) => {
        const nextUrl = URL.createObjectURL(file)

        setUploadedPdfUrl((previousUrl) => {
          if (previousUrl) URL.revokeObjectURL(previousUrl)
          return nextUrl
        })
        setPdfFile(nextUrl)
        onPdfUpload?.(file)
      },
      [onPdfUpload]
    )

    return (
      <div
        data-slot="pdf-viewer"
        className={cn(
          "flex h-full max-h-full min-h-0 w-full flex-col overflow-hidden bg-background",
          className
        )}
      >
        <div className="flex min-h-12 items-center justify-between gap-3 border-b px-3">
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <ToolbarTooltip label="Toggle thumbnails">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Toggle thumbnails"
                  disabled={controlsDisabled}
                  onClick={() => setSidebarOpen((open) => !open)}
                >
                  <HugeiconsIcon icon={SidebarLeftIcon} className="size-4" />
                </Button>
              </ToolbarTooltip>
            </TooltipProvider>
            <div className="text-sm whitespace-nowrap text-primary">
              Page {activePage} of {numPages || "-"}
            </div>
          </div>
          <TooltipProvider>
            <div className="flex min-w-0 items-center gap-1">
              {showRotateControls ? (
                <>
                  <ToolbarTooltip label="Rotate counterclockwise">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Rotate counterclockwise"
                      disabled={controlsDisabled}
                      onClick={() => setRotation((value) => value - 90)}
                    >
                      <HugeiconsIcon
                        icon={RotateClockwiseIcon}
                        className="size-4 -scale-x-100"
                      />
                    </Button>
                  </ToolbarTooltip>
                  <ToolbarTooltip label="Rotate clockwise">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Rotate clockwise"
                      disabled={controlsDisabled}
                      onClick={() => setRotation((value) => value + 90)}
                    >
                      <HugeiconsIcon
                        icon={RotateClockwiseIcon}
                        className="size-4"
                      />
                    </Button>
                  </ToolbarTooltip>
                  <Separator
                    orientation="vertical"
                    className="mx-1 h-4 self-center"
                  />
                </>
              ) : null}
              <ToolbarTooltip label="Zoom out">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Zoom out"
                  disabled={controlsDisabled || zoom <= ZOOM_OPTIONS[0]}
                  onClick={() => {
                    const currentIndex = ZOOM_OPTIONS.indexOf(zoom)
                    setZoom(ZOOM_OPTIONS[Math.max(0, currentIndex - 1)] ?? zoom)
                  }}
                >
                  <HugeiconsIcon
                    icon={MinusSignCircleIcon}
                    className="size-4"
                  />
                </Button>
              </ToolbarTooltip>
              <Select
                value={String(zoom)}
                onValueChange={(value) => setZoom(Number(value))}
                disabled={controlsDisabled}
              >
                <SelectTrigger size="sm" className="w-[84px] min-w-[84px]">
                  <SelectValue placeholder="Zoom">
                    {Math.round(zoom * 100)}%
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ZOOM_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {Math.round(option * 100)}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ToolbarTooltip label="Zoom in">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Zoom in"
                  disabled={
                    controlsDisabled ||
                    zoom >= ZOOM_OPTIONS[ZOOM_OPTIONS.length - 1]
                  }
                  onClick={() => {
                    const currentIndex = ZOOM_OPTIONS.indexOf(zoom)
                    setZoom(
                      ZOOM_OPTIONS[
                        Math.min(ZOOM_OPTIONS.length - 1, currentIndex + 1)
                      ] ?? zoom
                    )
                  }}
                >
                  <HugeiconsIcon icon={PlusSignCircleIcon} className="size-4" />
                </Button>
              </ToolbarTooltip>
              <Separator
                orientation="vertical"
                className="mx-1 h-4 self-center"
              />
              <Popover>
                <ToolbarTooltip label="Search text">
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Search text"
                      disabled={controlsDisabled}
                    >
                      <HugeiconsIcon icon={Search01Icon} className="size-4" />
                    </Button>
                  </PopoverTrigger>
                </ToolbarTooltip>
                <PopoverContent align="end" className="w-64">
                  <SearchInput
                    value={searchDraft}
                    onValueChange={setSearchDraft}
                    onApply={() => setSearchQuery(searchDraft)}
                    onClear={() => {
                      setSearchDraft("")
                      setSearchQuery("")
                    }}
                  />
                </PopoverContent>
              </Popover>
              {toolbarActions ? (
                <>
                  <Separator
                    orientation="vertical"
                    className="mx-1 h-4 self-center"
                  />
                  {toolbarActions}
                </>
              ) : null}
              {showUpload ? (
                <>
                  <Separator
                    orientation="vertical"
                    className="mx-1 h-4 self-center"
                  />
                  <ToolbarTooltip label="Upload PDF">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Upload PDF"
                      render={
                        <label>
                          <input
                            type="file"
                            accept="application/pdf,.pdf"
                            className="sr-only"
                            onChange={(event) => {
                              const nextFile = event.target.files?.[0]

                              if (nextFile) {
                                handleUpload(nextFile)
                                event.currentTarget.value = ""
                              }
                            }}
                          />
                          <HugeiconsIcon
                            icon={Upload01Icon}
                            className="size-4"
                          />
                        </label>
                      }
                    />
                  </ToolbarTooltip>
                </>
              ) : null}
            </div>
          </TooltipProvider>
        </div>
        <div className="relative flex min-h-0 flex-1 overflow-hidden bg-muted/30">
          {isLoading && !loadError ? (
            <div className="absolute inset-0 z-20 grid place-items-center bg-background">
              <HugeiconsIcon
                icon={Loading03Icon}
                className="size-4 animate-spin"
              />
            </div>
          ) : null}
          {loadError ? (
            <div className="absolute inset-0 z-20 grid place-items-center bg-background p-6 text-sm text-muted-foreground">
              Unable to load the PDF preview.
            </div>
          ) : null}
          {reactPdf ? (
            <reactPdf.Document
              file={pdfFile}
              className={cn(
                "flex h-full min-h-0 w-full flex-1",
                (isLoading || loadError) && "invisible"
              )}
              loading={null}
              error={null}
              onLoadStart={handleLoadStart}
              onLoadSuccess={handleLoadSuccess}
              onLoadError={handleLoadError}
            >
              <div className="flex h-full max-h-full min-h-0 w-full flex-1 overflow-hidden">
                <aside
                  className={cn(
                    "hidden w-40 shrink-0 overflow-hidden border-r bg-sidebar transition-[margin-left,border-color] duration-200 ease-out md:block",
                    sidebarOpen && !isLoading && !loadError
                      ? "ml-0"
                      : "-ml-40 border-r-0"
                  )}
                >
                  <ScrollArea className="h-full" scrollFade>
                    <div className="p-4">
                      <div className="flex flex-col items-center gap-3">
                        {renderedPageNumbers.map((pageNumber) => (
                          <Button
                            key={pageNumber}
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "!h-auto w-full flex-col items-center gap-2 p-2 text-xs text-muted-foreground shadow-none hover:bg-sidebar-accent",
                              pageNumber === activePage && "bg-sidebar-accent"
                            )}
                            onFocus={(event) => event.currentTarget.blur()}
                            onMouseDown={preserveThumbnailClickScroll}
                            onPointerDown={preserveThumbnailClickScroll}
                            onClick={() => scrollToPage(pageNumber)}
                          >
                            <div
                              className="shrink-0 overflow-hidden border bg-background shadow-xs"
                              style={thumbnailSize}
                            >
                              <reactPdf.Thumbnail
                                pageNumber={pageNumber}
                                width={THUMBNAIL_WIDTH}
                                rotate={rotation}
                                className="flex size-full items-center justify-center [&_.react-pdf__Thumbnail__page]:!m-0 [&_.react-pdf__Thumbnail__page]:!h-auto [&_.react-pdf__Thumbnail__page]:!w-full [&_.react-pdf__Thumbnail__page]:overflow-hidden [&_canvas]:!h-auto [&_canvas]:!w-full"
                                onItemClick={() => scrollToPage(pageNumber)}
                              />
                            </div>
                            {pageNumber}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </ScrollArea>
                </aside>
                <ScrollArea
                  className="h-full max-h-full min-h-0 min-w-0 flex-1"
                  viewportClassName={cn(
                    isFirstPageRendering && !loadError && "invisible"
                  )}
                  viewportRef={viewportRef}
                >
                  <div className="flex min-h-full w-max min-w-full flex-col items-center justify-start gap-6 p-6">
                    {renderedPageNumbers.map((pageNumber) => {
                      const shouldRenderPage =
                        Math.abs(pageNumber - activePage) <= pageRenderBuffer ||
                        renderedPageNumbers.length <= pageRenderBuffer * 2 + 1
                      const pageStyle = {
                        width: renderedPageWidth,
                        height: renderedPageHeight,
                      }
                      const pageSearchQuery =
                        searchQuery.trim() &&
                        Math.abs(pageNumber - activePage) <= 1
                          ? searchQuery
                          : ""

                      return (
                        <PDFViewerPage
                          key={pageNumber}
                          reactPdf={reactPdf}
                          pageNumber={pageNumber}
                          pageStyle={pageStyle}
                          renderedPageWidth={renderedPageWidth}
                          zoom={zoom}
                          rotation={rotation}
                          shouldRenderPage={shouldRenderPage}
                          searchQuery={pageSearchQuery}
                          isFirstRenderedPage={pageNumber === firstRenderedPage}
                          pageClassName={pageClassName}
                          renderPageOverlay={renderPageOverlay}
                          onFirstPageSettled={() =>
                            setIsFirstPageRendering(false)
                          }
                          onPagePointerDown={onPagePointerDown}
                          onPagePointerMove={onPagePointerMove}
                          onPagePointerUp={onPagePointerUp}
                          onPagePointerCancel={onPagePointerCancel}
                        />
                      )
                    })}
                  </div>
                </ScrollArea>
              </div>
            </reactPdf.Document>
          ) : null}
        </div>
      </div>
    )
  }
)
`

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
                className="relative z-10 rounded-lg bg-background text-foreground shadow-none hover:bg-muted dark:bg-background dark:text-foreground dark:hover:bg-muted"
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
  return <HighlightedCodeBlock code={pdfViewerSourceCode} />
}
