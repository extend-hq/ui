"use client"

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
import { Document, Page, pdfjs, Thumbnail } from "react-pdf"

import { cn } from "@/lib/utils"
import { Button } from "@/registry/new-york-v4/ui/button"
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/new-york-v4/ui/tooltip"

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`

const ZOOM_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2]
const SAMPLE_PDF_URL = "/samples/attention.pdf"
const PAGE_RENDER_BUFFER = 2
const PAGE_BASE_WIDTH = 612
const PAGE_BASE_HEIGHT = 792
const MAX_DEVICE_PIXEL_RATIO = 2
const THUMBNAIL_WIDTH = 92

function createSearchStore() {
  let draftValue = ""
  let appliedValue = ""
  const listeners = new Set<() => void>()

  return {
    getSnapshot: () => appliedValue,
    getDraftSnapshot: () => draftValue,
    setDraftSnapshot: (nextValue: string) => {
      draftValue = nextValue
    },
    applyDraftSnapshot: () => {
      if (draftValue === appliedValue) {
        return
      }

      appliedValue = draftValue
      listeners.forEach((listener) => listener())
    },
    clearSnapshot: () => {
      if (!draftValue && !appliedValue) {
        return
      }

      draftValue = ""
      appliedValue = ""
      listeners.forEach((listener) => listener())
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
  }
}

type SearchStore = ReturnType<typeof createSearchStore>

type SearchHighlight = {
  id: string
  left: number
  top: number
  width: number
  height: number
}

function SearchInput({ searchStore }: { searchStore: SearchStore }) {
  const [value, setValue] = React.useState(() => searchStore.getDraftSnapshot())

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search text"
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value
          setValue(nextValue)
          searchStore.setDraftSnapshot(nextValue)
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            searchStore.applyDraftSnapshot()
          }
        }}
      />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setValue("")
            searchStore.clearSnapshot()
          }}
        >
          Clear
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            searchStore.setDraftSnapshot(value)
            searchStore.applyDraftSnapshot()
          }}
        >
          Search
        </Button>
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

const PdfPage = React.memo(function PdfPage({
  pageNumber,
  rotation,
  scale,
  searchQuery,
  shouldRenderPage,
  onFirstPageRender,
}: {
  pageNumber: number
  rotation: number
  scale: number
  searchQuery: string
  shouldRenderPage: boolean
  onFirstPageRender: () => void
}) {
  const pageRef = React.useRef<HTMLDivElement>(null)
  const [searchHighlights, setSearchHighlights] = React.useState<
    SearchHighlight[]
  >([])
  const isRotated = Math.abs(Math.round(rotation / 90)) % 2 === 1
  const hasSearchQuery = Boolean(searchQuery.trim())
  const pageSize = {
    width: (isRotated ? PAGE_BASE_HEIGHT : PAGE_BASE_WIDTH) * scale,
    height: (isRotated ? PAGE_BASE_WIDTH : PAGE_BASE_HEIGHT) * scale,
  }
  const devicePixelRatio =
    typeof window === "undefined"
      ? 1
      : Math.min(MAX_DEVICE_PIXEL_RATIO, window.devicePixelRatio || 1)

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
          if (rect.width <= 0 || rect.height <= 0) {
            return
          }

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
      data-page-number={pageNumber}
      className="relative"
      style={pageSize}
    >
      {shouldRenderPage ? (
        <>
          <Page
            pageNumber={pageNumber}
            className="overflow-hidden rounded-sm border bg-background shadow-xs"
            renderAnnotationLayer={false}
            renderTextLayer={hasSearchQuery}
            devicePixelRatio={devicePixelRatio}
            rotate={rotation}
            scale={scale}
            loading={
              <div
                style={pageSize}
                className="flex items-center justify-center"
              >
                <HugeiconsIcon
                  icon={Loading03Icon}
                  className="size-4 animate-spin"
                />
              </div>
            }
            onRenderSuccess={() => {
              if (pageNumber === 1) {
                onFirstPageRender()
              }
            }}
            onRenderTextLayerSuccess={updateSearchHighlights}
            onRenderError={() => {
              if (pageNumber === 1) {
                onFirstPageRender()
              }
            }}
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
        <div className="size-full rounded-sm border bg-muted/30 shadow-xs" />
      )}
    </div>
  )
})

const PdfPages = React.memo(function PdfPages({
  pageNumbers,
  currentPage,
  rotation,
  scale,
  searchStore,
  onFirstPageRender,
}: {
  pageNumbers: number[]
  currentPage: number
  rotation: number
  scale: number
  searchStore: SearchStore
  onFirstPageRender: () => void
}) {
  const searchQuery = React.useSyncExternalStore(
    searchStore.subscribe,
    searchStore.getSnapshot,
    searchStore.getSnapshot
  )
  const hasSearchQuery = Boolean(searchQuery.trim())

  return (
    <>
      {pageNumbers.map((pageNumber) => (
        <PdfPage
          key={pageNumber}
          pageNumber={pageNumber}
          rotation={rotation}
          scale={scale}
          shouldRenderPage={
            Math.abs(pageNumber - currentPage) <= PAGE_RENDER_BUFFER
          }
          searchQuery={
            hasSearchQuery && Math.abs(pageNumber - currentPage) <= 1
              ? searchQuery
              : ""
          }
          onFirstPageRender={onFirstPageRender}
        />
      ))}
    </>
  )
})

export function PdfViewerPreviewClient() {
  const [numPages, setNumPages] = React.useState<number | null>(null)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [zoom, setZoom] = React.useState(0.5)
  const [rotation, setRotation] = React.useState(0)
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const [fileUrl, setFileUrl] = React.useState<string>(SAMPLE_PDF_URL)
  const [isDocumentLoading, setIsDocumentLoading] = React.useState(true)
  const [isPageRendering, setIsPageRendering] = React.useState(true)
  const [loadError, setLoadError] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const thumbnailClickScrollYRef = React.useRef<number | null>(null)
  const viewportRef = React.useRef<HTMLDivElement>(null)
  const searchStore = React.useMemo(() => createSearchStore(), [])

  const handleFirstPageRender = React.useCallback(() => {
    setIsPageRendering(false)
  }, [])
  const handleDocumentLoadStart = React.useCallback(() => {
    setIsDocumentLoading(true)
    setIsPageRendering(true)
    setLoadError(false)
    setNumPages(null)
    setCurrentPage(1)
    viewportRef.current?.scrollTo({ top: 0, left: 0 })
  }, [])
  const handleDocumentLoadSuccess = React.useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages)
      setCurrentPage(1)
      setIsDocumentLoading(false)
      setIsPageRendering(true)
      setLoadError(false)
      viewportRef.current?.scrollTo({ top: 0, left: 0 })
    },
    []
  )
  const handleDocumentLoadError = React.useCallback(() => {
    setIsDocumentLoading(false)
    setIsPageRendering(false)
    setLoadError(true)
    setNumPages(null)
  }, [])

  const pageNumbers = React.useMemo(() => {
    return Array.from({ length: numPages ?? 0 }, (_, index) => index + 1)
  }, [numPages])
  const thumbnailIsRotated = Math.abs(Math.round(rotation / 90)) % 2 === 1
  const thumbnailSize = {
    width: THUMBNAIL_WIDTH,
    height: Math.round(
      THUMBNAIL_WIDTH *
        (thumbnailIsRotated
          ? PAGE_BASE_WIDTH / PAGE_BASE_HEIGHT
          : PAGE_BASE_HEIGHT / PAGE_BASE_WIDTH)
    ),
  }
  const isViewerLoading = isDocumentLoading || isPageRendering
  const controlsDisabled = isViewerLoading || loadError || !numPages

  const updateCurrentPageFromViewport = React.useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport || !numPages) {
      return
    }

    const viewportRect = viewport.getBoundingClientRect()
    const viewportCenter = viewportRect.top + viewportRect.height / 2
    let closestPage = 1
    let closestDistance = Number.POSITIVE_INFINITY

    viewport
      .querySelectorAll<HTMLElement>("[data-page-number]")
      .forEach((page) => {
        const pageRect = page.getBoundingClientRect()
        const pageCenter = pageRect.top + pageRect.height / 2
        const distance = Math.abs(pageCenter - viewportCenter)

        if (distance < closestDistance) {
          closestDistance = distance
          closestPage = Number(page.dataset.pageNumber || "1")
        }
      })

    setCurrentPage((page) => (page === closestPage ? page : closestPage))
  }, [numPages])

  React.useEffect(() => {
    return () => {
      if (fileUrl.startsWith("blob:")) {
        URL.revokeObjectURL(fileUrl)
      }
    }
  }, [fileUrl])

  React.useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || !numPages) {
      return
    }

    let frameId = 0
    const handleScroll = () => {
      window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(updateCurrentPageFromViewport)
    }

    frameId = window.requestAnimationFrame(updateCurrentPageFromViewport)
    viewport.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.cancelAnimationFrame(frameId)
      viewport.removeEventListener("scroll", handleScroll)
    }
  }, [numPages, rotation, updateCurrentPageFromViewport, zoom])

  function restoreWindowScroll(scrollY: number) {
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
  }

  function scrollToPage(pageNumber: number) {
    const windowScrollY = thumbnailClickScrollYRef.current ?? window.scrollY
    setCurrentPage(pageNumber)

    const viewport = viewportRef.current
    const page = viewport?.querySelector<HTMLElement>(
      `[data-page-number="${pageNumber}"]`
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
  }

  function preserveThumbnailClickScroll(
    event: React.PointerEvent | React.MouseEvent
  ) {
    event.preventDefault()

    if (thumbnailClickScrollYRef.current === null) {
      thumbnailClickScrollYRef.current = window.scrollY
    }
  }

  return (
    <div
      data-slot="pdf-viewer"
      data-loading={isViewerLoading}
      className="flex h-[560px] w-full flex-col overflow-hidden bg-background [overflow-anchor:none]"
    >
      <div className="flex min-h-12 items-center justify-between gap-3 border-b px-3">
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <ToolbarTooltip label="Toggle thumbnails">
              <Button
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
            Page {currentPage} of {numPages ?? "-"}
          </div>
        </div>
        <TooltipProvider>
          <div className="flex min-w-0 items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) {
                  return
                }

                setFileUrl((previousUrl) => {
                  if (previousUrl.startsWith("blob:")) {
                    URL.revokeObjectURL(previousUrl)
                  }

                  return URL.createObjectURL(file)
                })
                event.target.value = ""
              }}
            />
            <ToolbarTooltip label="Rotate counterclockwise">
              <Button
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
                variant="ghost"
                size="icon-sm"
                aria-label="Rotate clockwise"
                disabled={controlsDisabled}
                onClick={() => setRotation((value) => value + 90)}
              >
                <HugeiconsIcon icon={RotateClockwiseIcon} className="size-4" />
              </Button>
            </ToolbarTooltip>
            <ToolbarTooltip label="Zoom out">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Zoom out"
                disabled={controlsDisabled || zoom <= ZOOM_OPTIONS[0]}
                onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}
              >
                <HugeiconsIcon icon={MinusSignCircleIcon} className="size-4" />
              </Button>
            </ToolbarTooltip>
            <ToolbarTooltip label="Zoom in">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Zoom in"
                disabled={
                  controlsDisabled ||
                  zoom >= ZOOM_OPTIONS[ZOOM_OPTIONS.length - 1]
                }
                onClick={() => setZoom((value) => Math.min(2, value + 0.25))}
              >
                <HugeiconsIcon icon={PlusSignCircleIcon} className="size-4" />
              </Button>
            </ToolbarTooltip>
            <Select
              value={zoom.toString()}
              onValueChange={(value) => setZoom(Number(value))}
              disabled={controlsDisabled}
            >
              <div className="hidden sm:block">
                <SelectTrigger size="sm" className="w-[84px] min-w-[84px]">
                  <SelectValue placeholder="Zoom">{`${zoom * 100}%`}</SelectValue>
                </SelectTrigger>
              </div>
              <SelectContent align="end">
                {ZOOM_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {`${option * 100}%`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <ToolbarTooltip label="Search text">
                <PopoverTrigger asChild>
                  <Button
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
                <SearchInput searchStore={searchStore} />
              </PopoverContent>
            </Popover>
            <ToolbarTooltip label="Upload PDF">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Upload PDF"
                disabled={isViewerLoading}
                onClick={() => fileInputRef.current?.click()}
              >
                <HugeiconsIcon icon={Upload01Icon} className="size-4" />
              </Button>
            </ToolbarTooltip>
          </div>
        </TooltipProvider>
      </div>
      <div className="relative flex h-full min-h-0 w-full flex-1">
        {isViewerLoading && !loadError ? (
          <div className="absolute inset-0 z-10 grid place-items-center bg-background">
            <HugeiconsIcon
              icon={Loading03Icon}
              className="size-4 animate-spin"
            />
          </div>
        ) : null}
        {loadError ? (
          <div className="absolute inset-0 z-10 grid place-items-center bg-background p-6 text-sm text-muted-foreground">
            Unable to load the PDF preview.
          </div>
        ) : null}
        <Document
          key={fileUrl}
          file={fileUrl}
          onLoadStart={handleDocumentLoadStart}
          onLoadSuccess={handleDocumentLoadSuccess}
          onLoadError={handleDocumentLoadError}
          className={cn(
            "flex h-full min-h-0 w-full flex-1",
            (isViewerLoading || loadError) && "invisible"
          )}
          loading={null}
          error={null}
        >
          <div className="flex h-full min-h-0 w-full flex-1">
            <aside
              className={cn(
                "hidden shrink-0 overflow-hidden border-r bg-sidebar transition-[width] md:block",
                sidebarOpen && !isViewerLoading && !loadError
                  ? "w-40"
                  : "w-0 border-r-0"
              )}
            >
              <div className="h-full overflow-y-auto overscroll-contain p-4">
                <div className="flex flex-col items-center gap-3">
                  {pageNumbers.map((pageNumber) => (
                    <Button
                      variant="ghost"
                      size="sm"
                      key={pageNumber}
                      className={cn(
                        "!h-auto w-full flex-col items-center gap-2 p-2 text-xs text-muted-foreground shadow-none hover:bg-sidebar-accent",
                        pageNumber === currentPage && "bg-sidebar-accent"
                      )}
                      onFocus={(event) => event.currentTarget.blur()}
                      onMouseDown={preserveThumbnailClickScroll}
                      onPointerDown={preserveThumbnailClickScroll}
                      onClick={() => scrollToPage(pageNumber)}
                    >
                      <div
                        className="shrink-0 overflow-hidden rounded-sm border bg-background shadow-xs"
                        style={thumbnailSize}
                      >
                        <Thumbnail
                          pageNumber={pageNumber}
                          className="block size-full [&_.react-pdf__Thumbnail__page]:size-full [&_canvas]:size-full"
                          width={THUMBNAIL_WIDTH}
                          rotate={rotation}
                        />
                      </div>
                      {pageNumber}
                    </Button>
                  ))}
                </div>
              </div>
            </aside>
            <div
              ref={viewportRef}
              className={cn(
                "min-h-0 min-w-0 flex-1 overflow-auto",
                isPageRendering && !loadError && "invisible"
              )}
            >
              <div className="flex min-h-full w-max min-w-full flex-col items-center justify-start gap-6 p-6">
                <PdfPages
                  pageNumbers={pageNumbers}
                  currentPage={currentPage}
                  rotation={rotation}
                  scale={zoom}
                  searchStore={searchStore}
                  onFirstPageRender={handleFirstPageRender}
                />
              </div>
            </div>
          </div>
        </Document>
      </div>
    </div>
  )
}
