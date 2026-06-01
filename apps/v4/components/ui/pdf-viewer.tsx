"use client"

import * as React from "react"
import {
  Download01Icon,
  MinusSignCircleIcon,
  PlusSignCircleIcon,
  RotateClockwiseIcon,
  Search01Icon,
  SidebarLeftIcon,
  Upload01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { PDFDocumentProxy } from "pdfjs-dist"
import type * as ReactPdf from "react-pdf"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DocumentViewerSidebarSkeleton,
  DocumentViewerThumbnailSidebar,
  useElementWidth,
  useInlineThumbnailSidebar,
} from "@/components/ui/document-viewer-sidebar"
import { FileThumbnail } from "@/components/ui/file-thumbnail"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Input } from "@/registry/new-york-v4/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/registry/new-york-v4/ui/popover"
import { Separator } from "@/registry/new-york-v4/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/new-york-v4/ui/tooltip"

type ReactPdfModule = typeof ReactPdf
type PageRotationDeltas = Map<number, number>

type PDFPageMetrics = {
  width: number
  height: number
  rotation: number
}

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
  defaultThumbnailSidebarOpen?: boolean
  defaultZoom?: number
  pageWidth?: number
  pageHeight?: number
  pageNumbers?: number[]
  pageRenderBuffer?: number
  downloadFileName?: string
  showDownload?: boolean
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

const DEFAULT_PAGE_WIDTH = 612
const DEFAULT_PAGE_HEIGHT = 792
const DEFAULT_ZOOM = 0.75
const ZOOM_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2]
const MAX_DEVICE_PIXEL_RATIO = 2
const DEFAULT_PAGE_RENDER_BUFFER = 4
const THUMBNAIL_WIDTH = 92
type SearchHighlight = {
  id: string
  left: number
  top: number
  width: number
  height: number
}

function getPdfWorkerUrl(pdfjsVersion: string) {
  return `//unpkg.com/pdfjs-dist@${pdfjsVersion}/legacy/build/pdf.worker.min.mjs`
}

function normalizeRotation(rotation: number) {
  return (((Math.round(rotation / 90) * 90) % 360) + 360) % 360
}

function isQuarterTurn(rotation: number) {
  return Math.abs(normalizeRotation(rotation) / 90) % 2 === 1
}

function getPageDimensions(metrics: PDFPageMetrics, rotation: number) {
  return isQuarterTurn(rotation)
    ? { width: metrics.height, height: metrics.width }
    : { width: metrics.width, height: metrics.height }
}

function ensurePdfExtension(fileName: string) {
  return fileName.toLowerCase().endsWith(".pdf") ? fileName : `${fileName}.pdf`
}

function getPdfDownloadFileName(fileName: string | undefined, file: string) {
  if (fileName?.trim()) return ensurePdfExtension(fileName.trim())

  const pathname = file.split(/[?#]/)[0] ?? ""
  const rawName = pathname.split("/").pop() || "document.pdf"

  try {
    return ensurePdfExtension(decodeURIComponent(rawName))
  } catch {
    return ensurePdfExtension(rawName)
  }
}

function getRotatedPdfDownloadFileName(fileName: string) {
  return fileName.replace(/\.pdf$/i, "-rotated.pdf")
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")

  anchor.href = url
  anchor.download = fileName
  anchor.rel = "noopener"
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

async function getDocumentPageMetrics(pdf: PDFDocumentProxy) {
  const pageEntries = await Promise.all(
    Array.from({ length: pdf.numPages }, async (_, index) => {
      const pageNumber = index + 1
      const page = await pdf.getPage(pageNumber)
      const viewport = page.getViewport({ scale: 1, rotation: 0 })

      return [
        pageNumber,
        {
          width: viewport.width,
          height: viewport.height,
          rotation: normalizeRotation(page.rotate),
        },
      ] as const
    })
  )

  return new Map<number, PDFPageMetrics>(pageEntries)
}

async function downloadPdfWithPageRotations({
  file,
  fileName,
  pageRotationDeltas,
}: {
  file: string
  fileName: string
  pageRotationDeltas: PageRotationDeltas
}) {
  const response = await fetch(file)

  if (!response.ok) {
    throw new Error(`Failed to download PDF (${response.status})`)
  }

  const [{ PDFDocument, degrees }, pdfBytes] = await Promise.all([
    import("pdf-lib"),
    response.arrayBuffer(),
  ])
  const pdfDocument = await PDFDocument.load(pdfBytes)

  pdfDocument.getPages().forEach((page, index) => {
    const pageNumber = index + 1
    const rotationDelta = pageRotationDeltas.get(pageNumber) ?? 0

    if (!rotationDelta) return

    page.setRotation(
      degrees(normalizeRotation(page.getRotation().angle + rotationDelta))
    )
  })

  const nextPdfBytes = await pdfDocument.save()
  const nextPdfBuffer = new ArrayBuffer(nextPdfBytes.byteLength)
  new Uint8Array(nextPdfBuffer).set(nextPdfBytes)
  const hasPageRotationChanges = pageRotationDeltas.size > 0

  downloadBlob(
    new Blob([nextPdfBuffer], { type: "application/pdf" }),
    hasPageRotationChanges ? getRotatedPdfDownloadFileName(fileName) : fileName
  )
}

function PDFViewerLoadingSkeleton({
  sidebarOpen,
  sidebarInline,
}: {
  sidebarOpen: boolean
  sidebarInline: boolean
}) {
  return (
    <div className="absolute inset-0 z-20 flex bg-muted/30">
      {sidebarOpen ? (
        <DocumentViewerSidebarSkeleton inline={sidebarInline} />
      ) : null}
      <div className="grid min-w-0 flex-1 place-items-center">
        <Spinner className="size-4" />
      </div>
    </div>
  )
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

function PDFSidebarThumbnail({
  pageMetrics,
  pageNumber,
  reactPdf,
  rotation,
  thumbnailAspectRatio,
}: {
  pageMetrics: PDFPageMetrics
  pageNumber: number
  reactPdf: ReactPdfModule
  rotation: number
  thumbnailAspectRatio: number
}) {
  const effectiveRotation = normalizeRotation(pageMetrics.rotation + rotation)

  return (
    <FileThumbnail
      file={{
        name: `Page ${pageNumber}.pdf`,
        type: "application/pdf",
      }}
      previewAspectRatio={thumbnailAspectRatio}
      previewClassName="rounded-md bg-white"
      previewContent={
        <reactPdf.Thumbnail
          pageNumber={pageNumber}
          width={THUMBNAIL_WIDTH}
          rotate={effectiveRotation}
          className="flex size-full items-center justify-center [&_.react-pdf__Thumbnail__page]:!m-0 [&_.react-pdf__Thumbnail__page]:!h-auto [&_.react-pdf__Thumbnail__page]:!w-full [&_.react-pdf__Thumbnail__page]:overflow-hidden [&_canvas]:!h-auto [&_canvas]:!w-full"
        />
      }
      className="w-[92px] rounded-md border-0 shadow-xs ring-0"
    />
  )
}

function PDFViewerPage({
  effectiveRotation,
  reactPdf,
  pageNumber,
  pageStyle,
  renderedPageWidth,
  zoom,
  shouldRenderPage,
  searchQuery,
  pageClassName,
  renderPageOverlay,
  onPageSettled,
  onPagePointerDown,
  onPagePointerMove,
  onPagePointerUp,
  onPagePointerCancel,
}: {
  effectiveRotation: number
  reactPdf: ReactPdfModule
  pageNumber: number
  pageStyle: React.CSSProperties & { width: number; height: number }
  renderedPageWidth: number
  zoom: number
  shouldRenderPage: boolean
  searchQuery: string
  pageClassName?: (pageNumber: number) => string | undefined
  renderPageOverlay?: (props: PDFViewerPageOverlayProps) => React.ReactNode
  onPageSettled: (pageNumber: number) => void
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
            id: `${pageNumber}-${index}-${matchIndex}-${rectIndex}`,
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
            rotate={effectiveRotation}
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
                <Spinner className="size-4" />
              </div>
            }
            onRenderSuccess={() => onPageSettled(pageNumber)}
            onRenderTextLayerSuccess={updateSearchHighlights}
            onRenderError={() => onPageSettled(pageNumber)}
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
        rotation: effectiveRotation,
      })}
    </div>
  )
}

export const PDFViewer = React.forwardRef<PDFViewerHandle, PDFViewerProps>(
  function PDFViewer(
    {
      file,
      className,
      defaultThumbnailSidebarOpen = false,
      defaultZoom = DEFAULT_ZOOM,
      pageWidth = DEFAULT_PAGE_WIDTH,
      pageHeight = DEFAULT_PAGE_HEIGHT,
      pageNumbers,
      pageRenderBuffer = DEFAULT_PAGE_RENDER_BUFFER,
      downloadFileName,
      showDownload = true,
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
    const [pdfFile, setPdfFile] = React.useState(file ?? "")
    const [uploadedPdfUrl, setUploadedPdfUrl] = React.useState<string | null>(
      null
    )
    const [numPages, setNumPages] = React.useState(0)
    const [activePage, setActivePage] = React.useState(1)
    const [zoom, setZoom] = React.useState(defaultZoom)
    const [pageRotationDeltas, setPageRotationDeltas] =
      React.useState<PageRotationDeltas>(() => new Map())
    const [pageMetrics, setPageMetrics] = React.useState<
      Map<number, PDFPageMetrics>
    >(() => new Map())
    const [sidebarOpen, setSidebarOpen] = React.useState(
      defaultThumbnailSidebarOpen
    )
    const [searchDraft, setSearchDraft] = React.useState("")
    const [searchQuery, setSearchQuery] = React.useState("")
    const [isDocumentLoading, setIsDocumentLoading] = React.useState(true)
    const [isFirstPageRendering, setIsFirstPageRendering] = React.useState(true)
    const [settledPageNumbers, setSettledPageNumbers] = React.useState<
      Set<number>
    >(() => new Set())
    const [loadError, setLoadError] = React.useState(false)
    const [isPreparingDownload, setIsPreparingDownload] = React.useState(false)
    const viewportRef = React.useRef<HTMLDivElement>(null)
    const thumbnailViewportRef = React.useRef<HTMLDivElement>(null)
    const wasThumbnailSidebarVisibleRef = React.useRef(false)
    const [viewerShellRef, viewerShellWidth] = useElementWidth<HTMLDivElement>()
    const thumbnailClickScrollYRef = React.useRef<number | null>(null)

    React.useEffect(() => {
      setPdfFile(file ?? "")
      setLoadError(false)
      setIsDocumentLoading(Boolean(file))
      setIsFirstPageRendering(Boolean(file))
      setSettledPageNumbers(new Set())
      setNumPages(0)
      setActivePage(1)
      setPageMetrics(new Map())
      setPageRotationDeltas(new Map())
    }, [file])

    React.useEffect(() => {
      let mounted = true

      void import("react-pdf")
        .then((module) => {
          module.pdfjs.GlobalWorkerOptions.workerSrc = getPdfWorkerUrl(
            module.pdfjs.version
          )

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
    const defaultPageMetrics = React.useMemo<PDFPageMetrics>(
      () => ({ width: pageWidth, height: pageHeight, rotation: 0 }),
      [pageHeight, pageWidth]
    )
    const getPageMetrics = React.useCallback(
      (pageNumber: number) => pageMetrics.get(pageNumber) ?? defaultPageMetrics,
      [defaultPageMetrics, pageMetrics]
    )
    const resolvedDownloadFileName = React.useMemo(
      () => getPdfDownloadFileName(downloadFileName, pdfFile),
      [downloadFileName, pdfFile]
    )
    const hasPdfFile = Boolean(pdfFile)
    const controlsDisabled = !hasPdfFile || !reactPdf || !numPages
    const downloadDisabled = controlsDisabled || isPreparingDownload
    const isLoading =
      hasPdfFile && (!reactPdf || isDocumentLoading || isFirstPageRendering)
    const sidebarInline = useInlineThumbnailSidebar(viewerShellWidth)
    const thumbnailSidebarVisible = Boolean(
      sidebarOpen && !isLoading && !loadError
    )

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
            `[data-pdf-viewer-page="${pageNumber}"]`
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
            `[data-pdf-viewer-page="${pageNumber}"]`
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
          `[data-pdf-viewer-page="${pageNumber}"]`
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

    const scrollActiveThumbnailIntoView = React.useCallback(() => {
      const viewport = thumbnailViewportRef.current
      const thumbnail = viewport?.querySelector<HTMLElement>(
        `[data-pdf-viewer-thumbnail="${activePage}"]`
      )

      if (!viewport || !thumbnail) return

      const viewportRect = viewport.getBoundingClientRect()
      const thumbnailRect = thumbnail.getBoundingClientRect()
      const targetTop =
        thumbnailRect.top -
        viewportRect.top +
        viewport.scrollTop -
        (viewport.clientHeight - thumbnail.offsetHeight) / 2

      viewport.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "auto",
      })
    }, [activePage])

    React.useEffect(() => {
      const wasThumbnailSidebarVisible = wasThumbnailSidebarVisibleRef.current
      wasThumbnailSidebarVisibleRef.current = thumbnailSidebarVisible

      if (!thumbnailSidebarVisible || wasThumbnailSidebarVisible) return

      const frameId = window.requestAnimationFrame(
        scrollActiveThumbnailIntoView
      )

      return () => window.cancelAnimationFrame(frameId)
    }, [scrollActiveThumbnailIntoView, thumbnailSidebarVisible])

    const handleLoadStart = React.useCallback(() => {
      setIsDocumentLoading(true)
      setIsFirstPageRendering(true)
      setLoadError(false)
      setNumPages(0)
      setActivePage(1)
      setPageMetrics(new Map())
      setPageRotationDeltas(new Map())
      setSettledPageNumbers(new Set())
      onActivePageChange?.(1)
      setSearchQuery("")
      setSearchDraft("")
      viewportRef.current?.scrollTo({ top: 0, left: 0 })
    }, [onActivePageChange])

    const handleLoadSuccess = React.useCallback(
      async (pdf: PDFDocumentProxy) => {
        const nextNumPages = pdf.numPages

        setNumPages(nextNumPages)
        setIsFirstPageRendering(true)
        setSettledPageNumbers(new Set())
        setLoadError(false)
        setActivePage(1)
        onActivePageChange?.(1)
        onDocumentLoadSuccess?.(nextNumPages)
        setSearchQuery("")
        setSearchDraft("")
        viewportRef.current?.scrollTo({ top: 0, left: 0 })

        try {
          setPageMetrics(await getDocumentPageMetrics(pdf))
          setIsDocumentLoading(false)
        } catch {
          setPageMetrics(new Map())
          setIsDocumentLoading(false)
        }
      },
      [onActivePageChange, onDocumentLoadSuccess]
    )

    const handleLoadError = React.useCallback(() => {
      setIsDocumentLoading(false)
      setIsFirstPageRendering(false)
      setLoadError(true)
      setNumPages(0)
      setPageMetrics(new Map())
      setPageRotationDeltas(new Map())
    }, [])

    const handlePageSettled = React.useCallback(
      (pageNumber: number) => {
        setSettledPageNumbers((currentPageNumbers) => {
          if (currentPageNumbers.has(pageNumber)) return currentPageNumbers

          const nextPageNumbers = new Set(currentPageNumbers)
          nextPageNumbers.add(pageNumber)
          return nextPageNumbers
        })

        if (pageNumber === firstRenderedPage) {
          setIsFirstPageRendering(false)
        }
      },
      [firstRenderedPage]
    )

    React.useEffect(() => {
      setSettledPageNumbers(new Set())
      setIsFirstPageRendering(Boolean(pdfFile))
    }, [pdfFile, pageMetrics])

    const rotateActivePage = React.useCallback(
      (rotationDelta: number) => {
        setPageRotationDeltas((currentRotations) => {
          const currentRotation = currentRotations.get(activePage) ?? 0
          const nextRotation = normalizeRotation(
            currentRotation + rotationDelta
          )
          const nextRotations = new Map(currentRotations)

          if (nextRotation) {
            nextRotations.set(activePage, nextRotation)
          } else {
            nextRotations.delete(activePage)
          }

          return nextRotations
        })
      },
      [activePage]
    )

    const handleDownload = React.useCallback(async () => {
      if (!pdfFile || isPreparingDownload) return

      setIsPreparingDownload(true)

      try {
        await downloadPdfWithPageRotations({
          file: pdfFile,
          fileName: resolvedDownloadFileName,
          pageRotationDeltas,
        })
      } catch (error) {
        console.error(error)
      } finally {
        setIsPreparingDownload(false)
      }
    }, [
      isPreparingDownload,
      pageRotationDeltas,
      pdfFile,
      resolvedDownloadFileName,
    ])

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
                  <ToolbarTooltip label="Rotate page counterclockwise">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Rotate page counterclockwise"
                      disabled={controlsDisabled}
                      onClick={() => rotateActivePage(-90)}
                    >
                      <HugeiconsIcon
                        icon={RotateClockwiseIcon}
                        className="size-4 -scale-x-100"
                      />
                    </Button>
                  </ToolbarTooltip>
                  <ToolbarTooltip label="Rotate page clockwise">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Rotate page clockwise"
                      disabled={controlsDisabled}
                      onClick={() => rotateActivePage(90)}
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
                modal={false}
              >
                <SelectTrigger size="sm" className="w-[84px] min-w-[84px]">
                  <SelectValue placeholder="Zoom">
                    {Math.round(zoom * 100)}%
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
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
              {showDownload ? (
                <>
                  <ToolbarTooltip label="Download PDF">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Download PDF"
                      disabled={downloadDisabled}
                      onClick={handleDownload}
                    >
                      {isPreparingDownload ? (
                        <Spinner className="size-4" />
                      ) : (
                        <HugeiconsIcon
                          icon={Download01Icon}
                          className="size-4"
                        />
                      )}
                    </Button>
                  </ToolbarTooltip>
                  <Separator
                    orientation="vertical"
                    className="mx-1 h-4 self-center"
                  />
                </>
              ) : null}
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
        <div
          ref={viewerShellRef}
          className="relative flex min-h-0 flex-1 overflow-hidden bg-muted/30"
        >
          {!hasPdfFile ? (
            <div className="absolute inset-0 z-20 grid place-items-center bg-background p-6 text-center text-sm text-muted-foreground">
              <div className="max-w-sm space-y-3">
                <div className="font-medium text-foreground">
                  Upload a PDF to preview
                </div>
                <div>
                  Pass a PDF URL with the <code>file</code> prop or use the
                  upload control.
                </div>
              </div>
            </div>
          ) : null}
          {isLoading && !loadError ? (
            <PDFViewerLoadingSkeleton
              sidebarInline={sidebarInline}
              sidebarOpen={sidebarOpen}
            />
          ) : null}
          {loadError ? (
            <div className="absolute inset-0 z-20 grid place-items-center bg-background p-6 text-sm text-muted-foreground">
              Unable to load the PDF preview.
            </div>
          ) : null}
          {reactPdf && hasPdfFile ? (
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
                <DocumentViewerThumbnailSidebar
                  inline={sidebarInline}
                  open={thumbnailSidebarVisible}
                >
                  <ScrollArea
                    className="h-full"
                    scrollFade
                    viewportRef={thumbnailViewportRef}
                  >
                    <div className="p-4">
                      <div className="flex flex-col items-center gap-3">
                        {renderedPageNumbers.map((pageNumber) => {
                          const metrics = getPageMetrics(pageNumber)
                          const rotationDelta =
                            pageRotationDeltas.get(pageNumber) ?? 0
                          const effectiveRotation = normalizeRotation(
                            metrics.rotation + rotationDelta
                          )
                          const thumbnailDimensions = getPageDimensions(
                            metrics,
                            effectiveRotation
                          )
                          const thumbnailAspectRatio =
                            thumbnailDimensions.width /
                            thumbnailDimensions.height

                          return (
                            <Button
                              key={pageNumber}
                              data-pdf-viewer-thumbnail={pageNumber}
                              type="button"
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "!h-auto w-full flex-col items-center gap-2 p-2 text-xs shadow-none hover:bg-sidebar-accent",
                                pageNumber === activePage
                                  ? "bg-sidebar-accent text-foreground"
                                  : "text-muted-foreground"
                              )}
                              onFocus={(event) => event.currentTarget.blur()}
                              onMouseDown={preserveThumbnailClickScroll}
                              onPointerDown={preserveThumbnailClickScroll}
                              onClick={() => scrollToPage(pageNumber)}
                            >
                              <PDFSidebarThumbnail
                                pageMetrics={metrics}
                                pageNumber={pageNumber}
                                reactPdf={reactPdf}
                                rotation={rotationDelta}
                                thumbnailAspectRatio={thumbnailAspectRatio}
                              />
                              {pageNumber}
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  </ScrollArea>
                </DocumentViewerThumbnailSidebar>
                <ScrollArea
                  className="h-full max-h-full min-h-0 min-w-0 flex-1"
                  viewportClassName={cn(
                    isFirstPageRendering && !loadError && "invisible"
                  )}
                  viewportRef={viewportRef}
                >
                  <div className="flex min-h-full w-max min-w-full flex-col items-center justify-start gap-6 p-6">
                    {renderedPageNumbers.map((pageNumber) => {
                      const metrics = getPageMetrics(pageNumber)
                      const rotationDelta =
                        pageRotationDeltas.get(pageNumber) ?? 0
                      const effectiveRotation = normalizeRotation(
                        metrics.rotation + rotationDelta
                      )
                      const dimensions = getPageDimensions(
                        metrics,
                        effectiveRotation
                      )
                      const shouldRenderPage =
                        Math.abs(pageNumber - activePage) <= pageRenderBuffer ||
                        settledPageNumbers.has(pageNumber) ||
                        renderedPageNumbers.length <= pageRenderBuffer * 2 + 1
                      const pageStyle = {
                        width: dimensions.width * zoom,
                        height: dimensions.height * zoom,
                      }
                      const pageSearchQuery =
                        searchQuery.trim() &&
                        Math.abs(pageNumber - activePage) <= 1
                          ? searchQuery
                          : ""

                      return (
                        <PDFViewerPage
                          key={pageNumber}
                          effectiveRotation={effectiveRotation}
                          reactPdf={reactPdf}
                          pageNumber={pageNumber}
                          pageStyle={pageStyle}
                          renderedPageWidth={pageStyle.width}
                          zoom={zoom}
                          shouldRenderPage={shouldRenderPage}
                          searchQuery={pageSearchQuery}
                          pageClassName={pageClassName}
                          renderPageOverlay={renderPageOverlay}
                          onPageSettled={handlePageSettled}
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
