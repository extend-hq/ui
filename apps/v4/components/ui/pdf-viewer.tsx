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
import { useVirtualizer } from "@tanstack/react-virtual"
import type { PDFDocumentProxy } from "pdfjs-dist"
import type * as ReactPdf from "react-pdf"

import "react-pdf/dist/Page/TextLayer.css"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DocumentViewerSidebarSkeleton,
  DocumentViewerThumbnailSidebar,
  useElementWidth,
  useInlineThumbnailSidebar,
} from "@/components/ui/document-viewer-sidebar"
import { FileThumbnail } from "@/components/ui/file-thumbnail"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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

export type PDFViewerScrollDirection = "forward" | "backward" | "none"

export type PDFViewerVisiblePagesRange = {
  activePage: number
  endPage: number
  isFastScrolling: boolean
  numPages: number
  pageRenderBuffer: number
  scrollDirection: PDFViewerScrollDirection
  startPage: number
}

export type PDFViewerRenderRange = {
  endPage: number
  startPage: number
}

export type PDFViewerProps = {
  file?: string
  className?: string
  documentOptions?: ReactPdf.DocumentProps["options"]
  defaultThumbnailSidebarOpen?: boolean
  defaultZoom?: number
  pageWidth?: number
  pageHeight?: number
  pageNumbers?: number[]
  pageRenderBuffer?: number
  setRenderRange?: (
    visiblePagesRange: PDFViewerVisiblePagesRange
  ) => PDFViewerRenderRange
  downloadFileName?: string
  showDownload?: boolean
  showToolbar?: boolean
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
const DEFAULT_ZOOM = 1
const ZOOM_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2]
const MAX_DEVICE_PIXEL_RATIO = 2
const DEFAULT_PAGE_RENDER_BUFFER = 4
const FAST_SCROLL_VELOCITY_PX_PER_MS = 1
const SCROLL_IDLE_TIMEOUT_MS = 180
const PAGE_VIRTUALIZER_PADDING = 24
const PAGE_VIRTUALIZER_GAP = 24
const THUMBNAIL_VIRTUALIZER_PADDING = 16
const THUMBNAIL_ITEM_CHROME_HEIGHT = 48
const THUMBNAIL_ITEM_GAP = 12
const THUMBNAIL_WIDTH = 92
type SearchHighlight = {
  id: string
  left: number
  top: number
  width: number
  height: number
}

function areNumberSetsEqual(left: Set<number>, right: Set<number>) {
  if (left.size !== right.size) return false

  for (const value of left) {
    if (!right.has(value)) return false
  }

  return true
}

function getPdfWorkerUrl(pdfjsVersion: string) {
  return `//unpkg.com/pdfjs-dist@${pdfjsVersion}/legacy/build/pdf.worker.min.mjs`
}

function getPdfAssetBaseUrl(pdfjsVersion: string) {
  return `https://unpkg.com/pdfjs-dist@${pdfjsVersion}`
}

const defaultPdfDocumentOptionsByVersion = new Map<
  string,
  ReactPdf.DocumentProps["options"]
>()

function getDefaultPdfDocumentOptions(
  pdfjsVersion: string
): ReactPdf.DocumentProps["options"] {
  const cachedOptions = defaultPdfDocumentOptionsByVersion.get(pdfjsVersion)

  if (cachedOptions) return cachedOptions

  const assetBaseUrl = getPdfAssetBaseUrl(pdfjsVersion)

  const options = {
    cMapPacked: true,
    cMapUrl: `${assetBaseUrl}/cmaps/`,
    standardFontDataUrl: `${assetBaseUrl}/standard_fonts/`,
  }

  defaultPdfDocumentOptionsByVersion.set(pdfjsVersion, options)

  return options
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

async function getPdfPageMetrics(
  pdf: PDFDocumentProxy,
  pageNumber: number
): Promise<PDFPageMetrics> {
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale: 1, rotation: 0 })

  return {
    width: viewport.width,
    height: viewport.height,
    rotation: normalizeRotation(page.rotate),
  }
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

function PDFViewerPageNumberControl({
  activePage,
  controlsDisabled,
  numPages,
  onPageChange,
}: {
  activePage: number
  controlsDisabled: boolean
  numPages: number
  onPageChange: (pageNumber: number) => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isEditing, setIsEditing] = React.useState(false)
  const [draftPage, setDraftPage] = React.useState(() => String(activePage))

  React.useEffect(() => {
    if (!isEditing) {
      setDraftPage(String(activePage))
    }
  }, [activePage, isEditing])

  React.useEffect(() => {
    if (!isEditing) return

    inputRef.current?.focus()
    inputRef.current?.select()
  }, [isEditing])

  const applyPageDraft = React.useCallback(
    (value: string) => {
      const trimmedValue = value.trim()

      if (!trimmedValue) return

      const parsedPage = Number(trimmedValue)

      if (!Number.isInteger(parsedPage)) return

      onPageChange(parsedPage)
    },
    [onPageChange]
  )

  return (
    <div className="flex items-center text-sm whitespace-nowrap text-primary">
      <span>Page</span>
      {isEditing ? (
        <Input
          ref={inputRef}
          aria-label="Page number"
          inputMode="numeric"
          pattern="[0-9]*"
          size="sm"
          value={draftPage}
          className="mx-1 w-14 min-w-14 rounded-md [&_[data-slot=input]]:text-center"
          onBlur={() => setIsEditing(false)}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            const nextValue = event.target.value

            setDraftPage(nextValue)
            applyPageDraft(nextValue)
          }}
          onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === "Enter" || event.key === "Escape") {
              event.currentTarget.blur()
            }
          }}
        />
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="mx-0.5 h-auto min-w-7 rounded-sm px-1.5 py-0 text-sm leading-normal font-normal text-primary sm:text-sm"
          aria-label={`Current page ${activePage}. Edit page number`}
          disabled={controlsDisabled}
          onClick={() => setIsEditing(true)}
        >
          {activePage}
        </Button>
      )}
      <span>of {numPages || "-"}</span>
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

function clampPageNumber(pageNumber: number, renderedPageNumbers: number[]) {
  if (!renderedPageNumbers.length) return pageNumber

  const minPage = Math.min(...renderedPageNumbers)
  const maxPage = Math.max(...renderedPageNumbers)

  return Math.min(Math.max(pageNumber, minPage), maxPage)
}

function normalizeRenderRange(
  range: PDFViewerRenderRange,
  renderedPageNumbers: number[]
) {
  const startPage = clampPageNumber(
    Math.min(range.startPage, range.endPage),
    renderedPageNumbers
  )
  const endPage = clampPageNumber(
    Math.max(range.startPage, range.endPage),
    renderedPageNumbers
  )

  return { startPage, endPage }
}

function getPageRenderPriority({
  activePage,
  pageNumber,
  scrollDirection,
}: {
  activePage: number
  pageNumber: number
  scrollDirection: PDFViewerScrollDirection
}) {
  const distance = Math.abs(pageNumber - activePage)

  if (pageNumber === activePage) return -1000

  if (scrollDirection === "forward") {
    return pageNumber > activePage ? distance : distance + 1000
  }

  if (scrollDirection === "backward") {
    return pageNumber < activePage ? distance : distance + 1000
  }

  return distance
}

function PDFViewerPage({
  devicePixelRatioLimit,
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
  devicePixelRatioLimit: number
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
  onPageSettled: (pageNumber: number, devicePixelRatioLimit: number) => void
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
  const clearSearchHighlights = React.useCallback(() => {
    setSearchHighlights((currentHighlights) =>
      currentHighlights.length ? [] : currentHighlights
    )
  }, [])

  const updateSearchHighlights = React.useCallback(() => {
    const pageElement = pageRef.current
    const query = searchQuery.trim().toLowerCase()

    if (!pageElement || !query) {
      clearSearchHighlights()
      return
    }

    const textLayer = pageElement.querySelector<HTMLElement>(
      ".react-pdf__Page__textContent"
    )

    if (!textLayer) {
      clearSearchHighlights()
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
  }, [clearSearchHighlights, pageNumber, searchQuery])

  React.useEffect(() => {
    if (!shouldRenderPage || !hasSearchQuery) {
      clearSearchHighlights()
      return
    }

    const frame = window.requestAnimationFrame(updateSearchHighlights)
    return () => window.cancelAnimationFrame(frame)
  }, [
    clearSearchHighlights,
    hasSearchQuery,
    shouldRenderPage,
    updateSearchHighlights,
  ])

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
                : Math.min(devicePixelRatioLimit, window.devicePixelRatio || 1)
            }
            loading={
              <div className="grid place-items-center" style={pageStyle}>
                <Spinner className="size-4" />
              </div>
            }
            onRenderSuccess={() =>
              onPageSettled(pageNumber, devicePixelRatioLimit)
            }
            onRenderTextLayerSuccess={updateSearchHighlights}
            onRenderError={() =>
              onPageSettled(pageNumber, devicePixelRatioLimit)
            }
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
        <div className="size-full border bg-white shadow-xs" />
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
      documentOptions,
      defaultThumbnailSidebarOpen = false,
      defaultZoom = DEFAULT_ZOOM,
      pageWidth = DEFAULT_PAGE_WIDTH,
      pageHeight = DEFAULT_PAGE_HEIGHT,
      pageNumbers,
      pageRenderBuffer = DEFAULT_PAGE_RENDER_BUFFER,
      setRenderRange,
      downloadFileName,
      showDownload = true,
      showRotateControls = true,
      showToolbar = true,
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
    const [pdfDocument, setPdfDocument] =
      React.useState<PDFDocumentProxy | null>(null)
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
    const [lowResolutionPageNumbers, setLowResolutionPageNumbers] =
      React.useState<Set<number>>(() => new Set())
    const [visiblePageNumbers, setVisiblePageNumbers] = React.useState<
      Set<number>
    >(() => new Set([1]))
    const [scrollState, setScrollState] = React.useState<{
      direction: PDFViewerScrollDirection
      isFastScrolling: boolean
    }>({ direction: "none", isFastScrolling: false })
    const [loadError, setLoadError] = React.useState(false)
    const [isPreparingDownload, setIsPreparingDownload] = React.useState(false)
    const viewportRef = React.useRef<HTMLDivElement>(null)
    const thumbnailViewportRef = React.useRef<HTMLDivElement>(null)
    const wasThumbnailSidebarVisibleRef = React.useRef(false)
    const [viewerShellRef, viewerShellWidth] = useElementWidth<HTMLDivElement>()
    const thumbnailClickScrollYRef = React.useRef<number | null>(null)
    const pendingPageMetricsRef = React.useRef<Set<number>>(new Set())
    const pageMetricsGenerationRef = React.useRef(0)
    const scrollTrackerRef = React.useRef({
      scrollTop: 0,
      timestamp: 0,
    })

    React.useEffect(() => {
      setPdfFile(file ?? "")
      setLoadError(false)
      setIsDocumentLoading(Boolean(file))
      setIsFirstPageRendering(Boolean(file))
      setSettledPageNumbers(new Set())
      setPdfDocument(null)
      pendingPageMetricsRef.current.clear()
      pageMetricsGenerationRef.current += 1
      setNumPages(0)
      setActivePage(1)
      setPageMetrics(new Map())
      setPageRotationDeltas(new Map())
      setLowResolutionPageNumbers(new Set())
      setVisiblePageNumbers(new Set([1]))
      setScrollState({ direction: "none", isFastScrolling: false })
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
    const getEstimatedPageSize = React.useCallback(
      (index: number) => {
        const pageNumber = renderedPageNumbers[index] ?? firstRenderedPage
        const metrics = getPageMetrics(pageNumber)
        const rotationDelta = pageRotationDeltas.get(pageNumber) ?? 0
        const effectiveRotation = normalizeRotation(
          metrics.rotation + rotationDelta
        )
        const dimensions = getPageDimensions(metrics, effectiveRotation)

        return dimensions.height * zoom + PAGE_VIRTUALIZER_GAP
      },
      [
        firstRenderedPage,
        getPageMetrics,
        pageRotationDeltas,
        renderedPageNumbers,
        zoom,
      ]
    )
    const getEstimatedPageWidth = React.useCallback(
      (pageNumber: number) => {
        const metrics = getPageMetrics(pageNumber)
        const rotationDelta = pageRotationDeltas.get(pageNumber) ?? 0
        const effectiveRotation = normalizeRotation(
          metrics.rotation + rotationDelta
        )
        const dimensions = getPageDimensions(metrics, effectiveRotation)

        return dimensions.width * zoom
      },
      [getPageMetrics, pageRotationDeltas, zoom]
    )
    const pageVirtualizer = useVirtualizer({
      count: renderedPageNumbers.length,
      estimateSize: getEstimatedPageSize,
      getItemKey: (index) => renderedPageNumbers[index] ?? index,
      getScrollElement: () => viewportRef.current,
      overscan: scrollState.isFastScrolling ? 14 : 8,
      paddingEnd: PAGE_VIRTUALIZER_PADDING,
      paddingStart: PAGE_VIRTUALIZER_PADDING,
      scrollPaddingStart: PAGE_VIRTUALIZER_PADDING,
    })
    const virtualPageItems = pageVirtualizer.getVirtualItems()
    const virtualPageNumbers = React.useMemo(
      () =>
        virtualPageItems.flatMap((virtualPage) => {
          const pageNumber = renderedPageNumbers[virtualPage.index]

          return pageNumber ? [pageNumber] : []
        }),
      [renderedPageNumbers, virtualPageItems]
    )
    const virtualPageNumbersKey = virtualPageNumbers.join(",")
    const virtualPageNumberSet = React.useMemo(
      () =>
        new Set(
          virtualPageNumbersKey
            ? virtualPageNumbersKey
                .split(",")
                .map((pageNumber) => Number(pageNumber))
            : []
        ),
      [virtualPageNumbersKey]
    )
    const maxEstimatedPageWidth = React.useMemo(() => {
      if (!renderedPageNumbers.length) return pageWidth * zoom

      return renderedPageNumbers.reduce(
        (maxWidth, pageNumber) =>
          Math.max(maxWidth, getEstimatedPageWidth(pageNumber)),
        0
      )
    }, [getEstimatedPageWidth, pageWidth, renderedPageNumbers, zoom])
    const activePageIndex = React.useMemo(
      () => renderedPageNumbers.indexOf(activePage),
      [activePage, renderedPageNumbers]
    )
    const loadPageMetrics = React.useCallback(
      async (pageNumbersToLoad: number[]) => {
        const pdf = pdfDocument

        if (!pdf) return

        const generation = pageMetricsGenerationRef.current
        const uniquePageNumbers = Array.from(new Set(pageNumbersToLoad)).filter(
          (pageNumber) =>
            pageNumber >= 1 &&
            pageNumber <= pdf.numPages &&
            !pageMetrics.has(pageNumber) &&
            !pendingPageMetricsRef.current.has(pageNumber)
        )

        if (!uniquePageNumbers.length) return

        uniquePageNumbers.forEach((pageNumber) => {
          pendingPageMetricsRef.current.add(pageNumber)
        })

        const pageMetricEntries = await Promise.all(
          uniquePageNumbers.map(async (pageNumber) => {
            try {
              return [
                pageNumber,
                await getPdfPageMetrics(pdf, pageNumber),
              ] as const
            } catch {
              return null
            }
          })
        )

        uniquePageNumbers.forEach((pageNumber) => {
          pendingPageMetricsRef.current.delete(pageNumber)
        })

        if (generation !== pageMetricsGenerationRef.current) return

        const resolvedPageMetricEntries = pageMetricEntries.filter(
          (entry): entry is readonly [number, PDFPageMetrics] => Boolean(entry)
        )

        if (!resolvedPageMetricEntries.length) return

        setPageMetrics((currentMetrics) => {
          const nextMetrics = new Map(currentMetrics)
          let changed = false

          resolvedPageMetricEntries.forEach(([pageNumber, metrics]) => {
            if (nextMetrics.has(pageNumber)) return
            nextMetrics.set(pageNumber, metrics)
            changed = true
          })

          return changed ? nextMetrics : currentMetrics
        })
      },
      [pageMetrics, pdfDocument]
    )
    const resolvedDownloadFileName = React.useMemo(
      () => getPdfDownloadFileName(downloadFileName, pdfFile),
      [downloadFileName, pdfFile]
    )
    const pdfjsVersion = reactPdf?.pdfjs.version
    const defaultDocumentOptions = React.useMemo(
      () =>
        pdfjsVersion ? getDefaultPdfDocumentOptions(pdfjsVersion) : undefined,
      [pdfjsVersion]
    )
    const resolvedDocumentOptions = documentOptions ?? defaultDocumentOptions
    const hasPdfFile = Boolean(pdfFile)
    const controlsDisabled = !hasPdfFile || !reactPdf || !numPages
    const downloadDisabled = controlsDisabled || isPreparingDownload
    const isLoading =
      hasPdfFile && (!reactPdf || isDocumentLoading || isFirstPageRendering)
    const sidebarInline = useInlineThumbnailSidebar(viewerShellWidth)
    const thumbnailSidebarVisible = Boolean(
      sidebarOpen && !isLoading && !loadError
    )
    const normalizedPageRenderBuffer = Math.max(0, Math.floor(pageRenderBuffer))
    const getEstimatedThumbnailItemSize = React.useCallback(
      (index: number) => {
        const pageNumber = renderedPageNumbers[index] ?? firstRenderedPage
        const metrics = getPageMetrics(pageNumber)
        const rotationDelta = pageRotationDeltas.get(pageNumber) ?? 0
        const effectiveRotation = normalizeRotation(
          metrics.rotation + rotationDelta
        )
        const dimensions = getPageDimensions(metrics, effectiveRotation)
        const thumbnailAspectRatio = dimensions.width / dimensions.height

        return (
          THUMBNAIL_WIDTH / thumbnailAspectRatio +
          THUMBNAIL_ITEM_CHROME_HEIGHT +
          THUMBNAIL_ITEM_GAP
        )
      },
      [
        firstRenderedPage,
        getPageMetrics,
        pageRotationDeltas,
        renderedPageNumbers,
      ]
    )
    const thumbnailVirtualizer = useVirtualizer({
      count: thumbnailSidebarVisible ? renderedPageNumbers.length : 0,
      estimateSize: getEstimatedThumbnailItemSize,
      getItemKey: (index) => renderedPageNumbers[index] ?? index,
      getScrollElement: () => thumbnailViewportRef.current,
      overscan: 10,
      paddingEnd: THUMBNAIL_VIRTUALIZER_PADDING,
      paddingStart: THUMBNAIL_VIRTUALIZER_PADDING,
      scrollPaddingStart: THUMBNAIL_VIRTUALIZER_PADDING,
    })

    const renderRange = React.useMemo(() => {
      if (!renderedPageNumbers.length) {
        return { startPage: 1, endPage: 1 }
      }

      const slowTrailingBuffer =
        scrollState.direction === "none"
          ? 0
          : Math.min(2, normalizedPageRenderBuffer)
      const fastAheadBuffer = Math.max(normalizedPageRenderBuffer + 6, 8)
      const fastBehindBuffer = Math.min(1, normalizedPageRenderBuffer)
      const beforeBuffer = scrollState.isFastScrolling
        ? scrollState.direction === "backward"
          ? fastAheadBuffer
          : fastBehindBuffer
        : normalizedPageRenderBuffer +
          (scrollState.direction === "backward" ? slowTrailingBuffer : 0)
      const afterBuffer = scrollState.isFastScrolling
        ? scrollState.direction === "forward"
          ? fastAheadBuffer
          : fastBehindBuffer
        : normalizedPageRenderBuffer +
          (scrollState.direction === "forward" ? slowTrailingBuffer : 0)
      const defaultRange = normalizeRenderRange(
        {
          startPage: activePage - beforeBuffer,
          endPage: activePage + afterBuffer,
        },
        renderedPageNumbers
      )
      const customRange = setRenderRange?.({
        ...defaultRange,
        activePage,
        isFastScrolling: scrollState.isFastScrolling,
        numPages,
        pageRenderBuffer: normalizedPageRenderBuffer,
        scrollDirection: scrollState.direction,
      })

      return normalizeRenderRange(
        customRange ?? defaultRange,
        renderedPageNumbers
      )
    }, [
      activePage,
      normalizedPageRenderBuffer,
      numPages,
      renderedPageNumbers,
      scrollState.direction,
      scrollState.isFastScrolling,
      setRenderRange,
    ])

    React.useEffect(() => {
      if (lowResolutionPageNumbers.size === 0) {
        return
      }

      let hasStalePageNumber = false

      lowResolutionPageNumbers.forEach((pageNumber) => {
        if (!virtualPageNumberSet.has(pageNumber)) {
          hasStalePageNumber = true
        }
      })

      if (!hasStalePageNumber) {
        return
      }

      setLowResolutionPageNumbers((currentPageNumbers) => {
        let changed = false
        const nextPageNumbers = new Set(currentPageNumbers)

        currentPageNumbers.forEach((pageNumber) => {
          if (!virtualPageNumberSet.has(pageNumber)) {
            nextPageNumbers.delete(pageNumber)
            changed = true
          }
        })

        return changed ? nextPageNumbers : currentPageNumbers
      })
    }, [lowResolutionPageNumbers, virtualPageNumberSet])

    const queuedPageNumbers = React.useMemo(() => {
      if (renderedPageNumbers.length <= 3) {
        return new Set(renderedPageNumbers)
      }

      const maxUnsettledPages = scrollState.isFastScrolling ? 4 : 8
      const visibleUnsettledCandidates = virtualPageNumbers.filter(
        (pageNumber) =>
          visiblePageNumbers.has(pageNumber) &&
          !settledPageNumbers.has(pageNumber)
      )
      const unsettledCandidates = virtualPageNumbers
        .filter(
          (pageNumber) =>
            pageNumber >= renderRange.startPage &&
            pageNumber <= renderRange.endPage &&
            !visiblePageNumbers.has(pageNumber) &&
            !settledPageNumbers.has(pageNumber)
        )
        .sort(
          (leftPage, rightPage) =>
            getPageRenderPriority({
              activePage,
              pageNumber: leftPage,
              scrollDirection: scrollState.direction,
            }) -
            getPageRenderPriority({
              activePage,
              pageNumber: rightPage,
              scrollDirection: scrollState.direction,
            })
        )

      return new Set(
        [...visibleUnsettledCandidates, ...unsettledCandidates].slice(
          0,
          maxUnsettledPages
        )
      )
    }, [
      activePage,
      renderRange.endPage,
      renderRange.startPage,
      renderedPageNumbers,
      scrollState.direction,
      scrollState.isFastScrolling,
      settledPageNumbers,
      visiblePageNumbers,
      virtualPageNumbers,
    ])

    const pageNumbersForMetrics = React.useMemo(() => {
      const nextPageNumbers = new Set<number>([
        firstRenderedPage,
        activePage,
        ...visiblePageNumbers,
        ...virtualPageNumbers,
      ])

      renderedPageNumbers.forEach((pageNumber) => {
        if (
          pageNumber >= renderRange.startPage &&
          pageNumber <= renderRange.endPage
        ) {
          nextPageNumbers.add(pageNumber)
        }
      })

      return Array.from(nextPageNumbers)
    }, [
      activePage,
      firstRenderedPage,
      renderRange.endPage,
      renderRange.startPage,
      renderedPageNumbers,
      visiblePageNumbers,
      virtualPageNumbers,
    ])

    React.useEffect(() => {
      void loadPageMetrics(pageNumbersForMetrics)
    }, [loadPageMetrics, pageNumbersForMetrics])

    const updateActivePageFromViewport = React.useCallback(() => {
      const viewport = viewportRef.current
      if (!viewport || !renderedPageNumbers.length) return

      const viewportRect = viewport.getBoundingClientRect()
      const viewportCenter = viewportRect.top + viewportRect.height / 2
      const nextVisiblePageNumbers = new Set<number>()
      let closestPage = renderedPageNumbers[0] ?? 1
      let closestDistance = Number.POSITIVE_INFINITY

      viewport
        .querySelectorAll<HTMLElement>("[data-pdf-viewer-page]")
        .forEach((pageElement) => {
          const pageNumber = Number(pageElement.dataset.pdfViewerPage)

          if (!pageNumber) return

          const pageRect = pageElement.getBoundingClientRect()
          const pageCenter = pageRect.top + pageRect.height / 2
          const distance = Math.abs(pageCenter - viewportCenter)

          if (
            pageRect.bottom > viewportRect.top &&
            pageRect.top < viewportRect.bottom
          ) {
            nextVisiblePageNumbers.add(pageNumber)
          }

          if (distance < closestDistance) {
            closestDistance = distance
            closestPage = pageNumber
          }
        })

      if (!nextVisiblePageNumbers.size) {
        nextVisiblePageNumbers.add(closestPage)
      }

      setActivePage((currentPage) => {
        if (currentPage === closestPage) return currentPage
        onActivePageChange?.(closestPage)
        return closestPage
      })

      setVisiblePageNumbers((currentPageNumbers) =>
        areNumberSetsEqual(currentPageNumbers, nextVisiblePageNumbers)
          ? currentPageNumbers
          : nextVisiblePageNumbers
      )
    }, [onActivePageChange, renderedPageNumbers])

    React.useEffect(() => {
      const frameId = window.requestAnimationFrame(updateActivePageFromViewport)

      return () => window.cancelAnimationFrame(frameId)
    }, [updateActivePageFromViewport, virtualPageNumbersKey])

    React.useEffect(() => {
      const viewport = viewportRef.current
      if (!viewport || !numPages) return

      let frameId = 0
      let idleTimeoutId = 0
      const handleScroll = () => {
        const currentScrollTop = viewport.scrollTop
        const currentTimestamp = performance.now()
        const previous = scrollTrackerRef.current
        const delta = currentScrollTop - previous.scrollTop
        const elapsed = Math.max(1, currentTimestamp - previous.timestamp)
        const speed = Math.abs(delta) / elapsed
        const direction: PDFViewerScrollDirection =
          delta > 0 ? "forward" : delta < 0 ? "backward" : "none"
        const isFastScrolling = speed >= FAST_SCROLL_VELOCITY_PX_PER_MS

        scrollTrackerRef.current = {
          scrollTop: currentScrollTop,
          timestamp: currentTimestamp,
        }

        if (direction !== "none") {
          setScrollState((currentState) =>
            currentState.direction === direction &&
            currentState.isFastScrolling === isFastScrolling
              ? currentState
              : { direction, isFastScrolling }
          )
        }

        window.clearTimeout(idleTimeoutId)
        idleTimeoutId = window.setTimeout(() => {
          setScrollState((currentState) =>
            currentState.direction === "none" && !currentState.isFastScrolling
              ? currentState
              : { direction: "none", isFastScrolling: false }
          )
        }, SCROLL_IDLE_TIMEOUT_MS)

        window.cancelAnimationFrame(frameId)
        frameId = window.requestAnimationFrame(updateActivePageFromViewport)
      }

      scrollTrackerRef.current = {
        scrollTop: viewport.scrollTop,
        timestamp: performance.now(),
      }
      frameId = window.requestAnimationFrame(updateActivePageFromViewport)
      viewport.addEventListener("scroll", handleScroll, { passive: true })

      return () => {
        window.cancelAnimationFrame(frameId)
        window.clearTimeout(idleTimeoutId)
        viewport.removeEventListener("scroll", handleScroll)
      }
    }, [numPages, updateActivePageFromViewport])

    React.useImperativeHandle(
      ref,
      () => ({
        scrollToPage: (pageNumber, options) => {
          const pageIndex = renderedPageNumbers.indexOf(pageNumber)
          if (pageIndex === -1) return

          pageVirtualizer.scrollToIndex(pageIndex, {
            align: "start",
            behavior: options?.behavior ?? "auto",
          })
        },
        scrollToPageArea: (pageNumber, area, options) => {
          const viewport = viewportRef.current
          const pageIndex = renderedPageNumbers.indexOf(pageNumber)
          const pageOffset = pageVirtualizer.getOffsetForIndex(
            pageIndex,
            "start"
          )?.[0]

          if (!viewport || pageIndex === -1 || pageOffset === undefined) return

          const metrics = getPageMetrics(pageNumber)
          const rotationDelta = pageRotationDeltas.get(pageNumber) ?? 0
          const effectiveRotation = normalizeRotation(
            metrics.rotation + rotationDelta
          )
          const dimensions = getPageDimensions(metrics, effectiveRotation)
          const targetTop =
            pageOffset + (area.top / 100) * dimensions.height * zoom - 96

          viewport.scrollTo({
            top: Math.max(0, targetTop),
            behavior: "smooth",
            ...options,
          })
        },
        getViewportElement: () => viewportRef.current,
      }),
      [
        getPageMetrics,
        pageRotationDeltas,
        pageVirtualizer,
        renderedPageNumbers,
        zoom,
      ]
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
        onActivePageChange?.(pageNumber)

        const pageIndex = renderedPageNumbers.indexOf(pageNumber)

        if (pageIndex === -1) {
          restoreWindowScroll(windowScrollY)
          return
        }

        pageVirtualizer.scrollToIndex(pageIndex, {
          align: "start",
          behavior: "auto",
        })
        restoreWindowScroll(windowScrollY)
        window.setTimeout(() => {
          if (thumbnailClickScrollYRef.current === windowScrollY) {
            thumbnailClickScrollYRef.current = null
          }
        }, 350)
      },
      [
        onActivePageChange,
        pageVirtualizer,
        renderedPageNumbers,
        restoreWindowScroll,
      ]
    )

    const handlePageNumberChange = React.useCallback(
      (pageNumber: number) => {
        if (!renderedPageNumbers.includes(pageNumber)) return

        scrollToPage(pageNumber)
      },
      [renderedPageNumbers, scrollToPage]
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
      if (activePageIndex === -1) return

      thumbnailVirtualizer.scrollToIndex(activePageIndex, {
        align: "center",
        behavior: "auto",
      })
    }, [activePageIndex, thumbnailVirtualizer])

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
      setPdfDocument(null)
      pendingPageMetricsRef.current.clear()
      pageMetricsGenerationRef.current += 1
      setNumPages(0)
      setActivePage(1)
      setPageMetrics(new Map())
      setPageRotationDeltas(new Map())
      setSettledPageNumbers(new Set())
      setLowResolutionPageNumbers(new Set())
      setVisiblePageNumbers(new Set([1]))
      setScrollState({ direction: "none", isFastScrolling: false })
      onActivePageChange?.(1)
      setSearchQuery("")
      setSearchDraft("")
      viewportRef.current?.scrollTo({ top: 0, left: 0 })
    }, [onActivePageChange])

    const handleLoadSuccess = React.useCallback(
      async (pdf: PDFDocumentProxy) => {
        const nextNumPages = pdf.numPages
        const nextGeneration = pageMetricsGenerationRef.current + 1

        pageMetricsGenerationRef.current = nextGeneration
        pendingPageMetricsRef.current.clear()
        setPdfDocument(pdf)
        setNumPages(nextNumPages)
        setIsFirstPageRendering(true)
        setSettledPageNumbers(new Set())
        setLowResolutionPageNumbers(new Set())
        setVisiblePageNumbers(new Set([1]))
        setLoadError(false)
        setActivePage(1)
        onActivePageChange?.(1)
        onDocumentLoadSuccess?.(nextNumPages)
        setSearchQuery("")
        setSearchDraft("")
        viewportRef.current?.scrollTo({ top: 0, left: 0 })

        try {
          const initialPageNumber = pageNumbers?.[0] ?? 1
          const initialMetrics = await getPdfPageMetrics(pdf, initialPageNumber)

          if (nextGeneration === pageMetricsGenerationRef.current) {
            setPageMetrics(new Map([[initialPageNumber, initialMetrics]]))
          }
        } catch {
          setPageMetrics(new Map())
        } finally {
          setIsDocumentLoading(false)
        }
      },
      [onActivePageChange, onDocumentLoadSuccess, pageNumbers]
    )

    const handleLoadError = React.useCallback(() => {
      setIsDocumentLoading(false)
      setIsFirstPageRendering(false)
      setLoadError(true)
      setPdfDocument(null)
      pendingPageMetricsRef.current.clear()
      pageMetricsGenerationRef.current += 1
      setNumPages(0)
      setPageMetrics(new Map())
      setPageRotationDeltas(new Map())
      setSettledPageNumbers(new Set())
      setLowResolutionPageNumbers(new Set())
      setVisiblePageNumbers(new Set([1]))
    }, [])

    const handlePageSettled = React.useCallback(
      (pageNumber: number, devicePixelRatioLimit: number) => {
        setSettledPageNumbers((currentPageNumbers) => {
          if (currentPageNumbers.has(pageNumber)) return currentPageNumbers

          const nextPageNumbers = new Set(currentPageNumbers)
          nextPageNumbers.add(pageNumber)
          return nextPageNumbers
        })
        setLowResolutionPageNumbers((currentPageNumbers) => {
          const isLowResolutionRender =
            devicePixelRatioLimit < MAX_DEVICE_PIXEL_RATIO
          const alreadyLowResolution = currentPageNumbers.has(pageNumber)

          if (isLowResolutionRender && alreadyLowResolution) {
            return currentPageNumbers
          }

          if (!isLowResolutionRender && !alreadyLowResolution) {
            return currentPageNumbers
          }

          const nextPageNumbers = new Set(currentPageNumbers)

          if (isLowResolutionRender) {
            nextPageNumbers.add(pageNumber)
          } else {
            nextPageNumbers.delete(pageNumber)
          }

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
      setLowResolutionPageNumbers(new Set())
      setVisiblePageNumbers(new Set([1]))
      setIsFirstPageRendering(Boolean(pdfFile))
    }, [pdfFile])

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
        {showToolbar ? (
          <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b bg-background px-3 py-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
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
              <PDFViewerPageNumberControl
                activePage={activePage}
                controlsDisabled={controlsDisabled}
                numPages={numPages}
                onPageChange={handlePageNumberChange}
              />
            </div>
            <TooltipProvider>
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">
                {showRotateControls ? (
                  <>
                    <div className="flex flex-none items-center gap-1">
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
                    </div>
                    <Separator
                      orientation="vertical"
                      className="mx-1 h-4 self-center"
                    />
                  </>
                ) : null}
                <div className="flex flex-none items-center gap-1">
                  <ToolbarTooltip label="Zoom out">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Zoom out"
                      disabled={controlsDisabled || zoom <= ZOOM_OPTIONS[0]}
                      onClick={() => {
                        const currentIndex = ZOOM_OPTIONS.indexOf(zoom)
                        setZoom(
                          ZOOM_OPTIONS[Math.max(0, currentIndex - 1)] ?? zoom
                        )
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
                      <HugeiconsIcon
                        icon={PlusSignCircleIcon}
                        className="size-4"
                      />
                    </Button>
                  </ToolbarTooltip>
                </div>
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
                {showDownload ? (
                  <>
                    <Separator
                      orientation="vertical"
                      className="mx-1 h-4 self-center"
                    />
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
                {toolbarActions ? (
                  <>
                    <Separator
                      orientation="vertical"
                      className="mx-1 h-4 self-center"
                    />
                    {toolbarActions}
                  </>
                ) : null}
              </div>
            </TooltipProvider>
          </div>
        ) : null}
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
              options={resolvedDocumentOptions}
              className={cn(
                "flex h-full min-h-0 w-full flex-1",
                (isLoading || loadError) && "invisible"
              )}
              loading={null}
              error={null}
              onLoadStart={handleLoadStart}
              onLoadSuccess={handleLoadSuccess}
              onLoadError={handleLoadError}
              onItemClick={({ pageNumber }) => scrollToPage(pageNumber)}
            >
              <div className="flex h-full max-h-full min-h-0 w-full flex-1 overflow-hidden">
                <DocumentViewerThumbnailSidebar
                  inline={sidebarInline}
                  open={thumbnailSidebarVisible}
                >
                  {thumbnailSidebarVisible ? (
                    <ScrollArea
                      className="h-full"
                      scrollFade
                      viewportRef={thumbnailViewportRef}
                    >
                      <div
                        className="relative"
                        style={{ height: thumbnailVirtualizer.getTotalSize() }}
                      >
                        {thumbnailVirtualizer
                          .getVirtualItems()
                          .map((virtualThumbnail) => {
                            const pageNumber =
                              renderedPageNumbers[virtualThumbnail.index]

                            if (!pageNumber) return null

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
                              <div
                                key={virtualThumbnail.key}
                                className="absolute top-0 right-4 left-4 flex justify-center [contain:layout_paint]"
                                style={{
                                  transform: `translateY(${virtualThumbnail.start}px)`,
                                }}
                              >
                                <Button
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
                                  onFocus={(event) =>
                                    event.currentTarget.blur()
                                  }
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
                              </div>
                            )
                          })}
                      </div>
                    </ScrollArea>
                  ) : null}
                </DocumentViewerThumbnailSidebar>
                <ScrollArea
                  className="h-full max-h-full min-h-0 min-w-0 flex-1"
                  viewportClassName={cn(
                    isFirstPageRendering && !loadError && "invisible"
                  )}
                  viewportRef={viewportRef}
                >
                  <div
                    className="relative min-h-full min-w-full"
                    style={{
                      height: pageVirtualizer.getTotalSize(),
                      width:
                        maxEstimatedPageWidth + PAGE_VIRTUALIZER_PADDING * 2,
                    }}
                  >
                    {virtualPageItems.map((virtualPage) => {
                      const pageNumber = renderedPageNumbers[virtualPage.index]

                      if (!pageNumber) return null

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
                        settledPageNumbers.has(pageNumber) ||
                        queuedPageNumbers.has(pageNumber)
                      const devicePixelRatioLimit =
                        (scrollState.isFastScrolling &&
                          !settledPageNumbers.has(pageNumber)) ||
                        lowResolutionPageNumbers.has(pageNumber)
                          ? 1
                          : MAX_DEVICE_PIXEL_RATIO
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
                        <div
                          key={virtualPage.key}
                          className="absolute top-0 left-1/2 [contain:layout_paint]"
                          style={{
                            height: pageStyle.height,
                            transform: `translateX(-50%) translateY(${virtualPage.start}px)`,
                            width: pageStyle.width,
                          }}
                        >
                          <PDFViewerPage
                            devicePixelRatioLimit={devicePixelRatioLimit}
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
                        </div>
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
