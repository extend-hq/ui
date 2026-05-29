"use client"

import * as React from "react"
import dynamic from "next/dynamic"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { HighlightedCodeBlock } from "@/components/highlighted-code-block"

function ViewerPreviewLoading() {
  return (
    <div className="grid h-[640px] place-items-center bg-background">
      <Spinner className="size-4" />
    </div>
  )
}

const XlsxViewerPreview = dynamic(
  () =>
    import("@/components/ui/xlsx-viewer").then((mod) => mod.XlsxViewerPreview),
  {
    ssr: false,
    loading: () => <ViewerPreviewLoading />,
  }
)

export function XlsxViewerDemo() {
  const [isCodeVisible, setIsCodeVisible] = React.useState(false)

  return (
    <div
      data-slot="component-preview"
      className="group relative mt-4 mb-12 flex flex-col overflow-hidden rounded-xl border"
    >
      <XlsxViewerPreview src="/samples/crazy-chart-zoo.xlsx" />
      <div
        data-slot="code"
        data-mobile-code-visible={isCodeVisible}
        className="relative overflow-hidden **:data-[slot=copy-button]:right-4 **:data-[slot=copy-button]:hidden data-[mobile-code-visible=true]:**:data-[slot=copy-button]:flex [&_[data-rehype-pretty-code-figure]]:m-0! [&_[data-rehype-pretty-code-figure]]:rounded-t-none [&_[data-rehype-pretty-code-figure]]:border-t [&_pre]:max-h-72"
      >
        {isCodeVisible ? (
          <HighlightedCodeBlock
            code={xlsxViewerUsageCode}
            className="rounded-none border-x-0 border-b-0"
          />
        ) : (
          <div className="relative">
            <HighlightedCodeBlock
              code={xlsxViewerUsageCode}
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

const xlsxViewerUsageCode = `"use client";

import { XlsxViewerPreview } from "@/components/ui/xlsx-viewer";

export function XlsxViewerExample() {
  return <XlsxViewerPreview src="/path/to/workbook.xlsx" />;
}`

const xlsxViewerSourceCode = `"use client"

import * as React from "react"
import {
  useXlsxViewer,
  useXlsxViewerController,
  useXlsxViewerThumbnails,
  useXlsxViewerZoom,
  XlsxViewer,
  XlsxViewerProvider,
  type XlsxTableHeaderMenuRenderProps,
} from "@extend-ai/react-xlsx"
import {
  MinusSignCircleIcon,
  Moon02Icon,
  MoreHorizontalIcon,
  PlusSignCircleIcon,
  Sun03Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useTheme } from "next-themes"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/registry/new-york-v4/ui/dropdown-menu"
import { Separator } from "@/registry/new-york-v4/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/new-york-v4/ui/tooltip"

const XLSX_SOURCE_CACHE_LIMIT = 3
const XLSX_LOADING_INDICATOR_DELAY_MS = 300
const XLSX_DROPDOWN_Z_INDEX_CLASS = "z-[100010]"
const ZOOM_OPTIONS = [10, 25, 50, 75, 100, 125, 150, 175, 200, 400] as const

const xlsxWorkbookBufferCache = new Map<string, ArrayBuffer>()
const xlsxWorkbookBufferPromiseCache = new Map<string, Promise<ArrayBuffer>>()

type UploadedWorkbook = {
  buffer: ArrayBuffer
  fileName: string
  identity: string
}

function getWorkbookCacheKey(url: string, fileName?: string) {
  return \`\${url.split("?")[0] ?? url}::\${fileName ?? ""}\`
}

function rememberWorkbookBuffer(cacheKey: string, workbookBuffer: ArrayBuffer) {
  if (xlsxWorkbookBufferCache.has(cacheKey)) {
    xlsxWorkbookBufferCache.delete(cacheKey)
  }

  xlsxWorkbookBufferCache.set(cacheKey, workbookBuffer)

  while (xlsxWorkbookBufferCache.size > XLSX_SOURCE_CACHE_LIMIT) {
    const oldestKey = xlsxWorkbookBufferCache.keys().next().value
    if (!oldestKey) break
    xlsxWorkbookBufferCache.delete(oldestKey)
  }
}

async function loadCachedWorkbookBuffer(
  url: string,
  cacheKey: string
): Promise<ArrayBuffer> {
  const cachedWorkbookBuffer = xlsxWorkbookBufferCache.get(cacheKey)
  if (cachedWorkbookBuffer) return cachedWorkbookBuffer

  const pendingRequest = xlsxWorkbookBufferPromiseCache.get(cacheKey)
  if (pendingRequest) return pendingRequest

  const nextRequest = fetch(url)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(\`Failed to fetch XLSX (\${response.status})\`)
      }

      const workbookBuffer = await response.arrayBuffer()
      rememberWorkbookBuffer(cacheKey, workbookBuffer)
      return workbookBuffer
    })
    .finally(() => {
      xlsxWorkbookBufferPromiseCache.delete(cacheKey)
    })

  xlsxWorkbookBufferPromiseCache.set(cacheKey, nextRequest)
  return nextRequest
}

function formatWorkbookName(fileName: string | undefined, url: string) {
  if (fileName?.trim()) return fileName

  const pathname = url.split("?")[0] ?? ""
  const rawName = pathname.split("/").pop() ?? "workbook.xlsx"

  try {
    return decodeURIComponent(rawName)
  } catch {
    return rawName
  }
}

function useDelayedLoadingIndicator(isLoading: boolean, delayMs: number) {
  const [showSpinner, setShowSpinner] = React.useState(false)

  React.useEffect(() => {
    if (!isLoading) {
      setShowSpinner(false)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setShowSpinner(true)
    }, delayMs)

    return () => window.clearTimeout(timeoutId)
  }, [delayMs, isLoading])

  return showSpinner
}

export function useWorkbookNightRenderPreference() {
  const [nightRenderEnabled, setNightRenderEnabled] = React.useState(false)
  const [nightRenderPrefLoaded, setNightRenderPrefLoaded] =
    React.useState(false)

  React.useEffect(() => {
    const storedValue = window.localStorage.getItem("xlsx-night-render")
    setNightRenderEnabled(storedValue === "true")
    setNightRenderPrefLoaded(true)
  }, [])

  const updateNightRenderEnabled = React.useCallback((checked: boolean) => {
    setNightRenderEnabled(checked)
    window.localStorage.setItem("xlsx-night-render", String(checked))
  }, [])

  return {
    nightRenderEnabled,
    nightRenderPrefLoaded,
    setNightRenderEnabled: updateNightRenderEnabled,
  }
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

function ViewerLoadingSurface({
  showSpinner = true,
}: {
  showSpinner?: boolean
}) {
  return (
    <div className="grid h-full min-h-52 w-full min-w-full place-items-center bg-transparent">
      {showSpinner ? <Spinner className="size-4" /> : null}
    </div>
  )
}

export function WorkbookTableHeaderMenu({
  direction,
  sortAscending,
  sortDescending,
  triggerIcon,
  triggerProps,
}: XlsxTableHeaderMenuRenderProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          {...triggerProps}
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn("size-6 rounded-sm", triggerProps.className)}
          aria-label="Column menu"
        >
          {triggerIcon ? (
            triggerIcon
          ) : (
            <HugeiconsIcon icon={MoreHorizontalIcon} className="size-3.5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn("w-40", XLSX_DROPDOWN_Z_INDEX_CLASS)}
      >
        <DropdownMenuRadioGroup
          value={direction ?? ""}
          onValueChange={(value) => {
            if (value === "ascending") {
              sortAscending()
            } else {
              sortDescending()
            }
            setOpen(false)
          }}
        >
          <DropdownMenuRadioItem value="ascending">
            Sort ascending
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="descending">
            Sort descending
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function WorkbookToolbar({
  isDark,
  onIsDarkChange,
  onUploadClick,
  showNightRenderToggle,
  showUploadButton = true,
  workbookIdentity,
}: {
  isDark: boolean
  onIsDarkChange: (checked: boolean) => void
  onUploadClick: () => void
  showNightRenderToggle: boolean
  showUploadButton?: boolean
  workbookIdentity: string
}) {
  const { canZoomIn, canZoomOut, setZoomScale, zoomIn, zoomOut, zoomScale } =
    useXlsxViewerZoom()
  const currentZoom = Math.round(zoomScale)

  React.useEffect(() => {
    setZoomScale(100)
  }, [setZoomScale, workbookIdentity])

  return (
    <div className="flex min-h-12 items-center justify-end gap-3 overflow-x-auto overflow-y-hidden border-b bg-background px-3">
      <TooltipProvider>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {showNightRenderToggle ? (
            <>
              <Separator
                orientation="vertical"
                className="mx-1 h-4 self-center"
              />
              <ToolbarTooltip
                label={isDark ? "Use light workbook" : "Use dark workbook"}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={
                    isDark ? "Use light workbook" : "Use dark workbook"
                  }
                  onClick={() => onIsDarkChange(!isDark)}
                >
                  <HugeiconsIcon
                    icon={isDark ? Sun03Icon : Moon02Icon}
                    className="size-4"
                  />
                </Button>
              </ToolbarTooltip>
            </>
          ) : null}
          <Separator orientation="vertical" className="mx-1 h-4 self-center" />
          <ToolbarTooltip label="Zoom out">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!canZoomOut}
              aria-label="Zoom out"
              onClick={zoomOut}
            >
              <HugeiconsIcon icon={MinusSignCircleIcon} className="size-4" />
            </Button>
          </ToolbarTooltip>
          <Select
            value={currentZoom.toString()}
            onValueChange={(value) => setZoomScale(Number(value))}
          >
            <SelectTrigger
              size="sm"
              className="w-[84px] min-w-[84px]"
              aria-label="Zoom level"
            >
              <SelectValue>{currentZoom}%</SelectValue>
            </SelectTrigger>
            <SelectContent align="end" className={XLSX_DROPDOWN_Z_INDEX_CLASS}>
              {ZOOM_OPTIONS.map((value) => (
                <SelectItem key={value} value={value.toString()}>
                  {value}%
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ToolbarTooltip label="Zoom in">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!canZoomIn}
              aria-label="Zoom in"
              onClick={zoomIn}
            >
              <HugeiconsIcon icon={PlusSignCircleIcon} className="size-4" />
            </Button>
          </ToolbarTooltip>
          {showUploadButton ? (
            <>
              <Separator
                orientation="vertical"
                className="mx-1 h-4 self-center"
              />
              <ToolbarTooltip label="Upload XLSX">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Upload XLSX"
                  onClick={onUploadClick}
                >
                  <HugeiconsIcon icon={Upload01Icon} className="size-4" />
                </Button>
              </ToolbarTooltip>
            </>
          ) : null}
        </div>
      </TooltipProvider>
    </div>
  )
}

export function WorkbookSheetTabs({
  workbookIdentity,
}: {
  workbookIdentity: string
}) {
  const { activeSheetIndex, setActiveSheetIndex, sheets } = useXlsxViewer()
  const { thumbnails } = useXlsxViewerThumbnails({
    resolution: {
      maxHeight: 360,
      maxWidth: 560,
    },
  })
  const [visiblePreviewIndex, setVisiblePreviewIndex] = React.useState<
    number | null
  >(null)
  const [previewPosition, setPreviewPosition] = React.useState({
    left: 0,
    top: 0,
  })
  const [thumbnailUrls, setThumbnailUrls] = React.useState<
    Record<number, string>
  >({})
  const scrollRef = React.useRef<HTMLDivElement | null>(null)
  const itemRefs = React.useRef<Record<number, HTMLButtonElement | null>>({})
  const openTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const closeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const previewWidth = 220
  const previewHeight = (previewWidth * 7) / 11
  const previewGap = 12
  const previewOpenDelayMs = 500

  const clearOpenTimeout = React.useCallback(() => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current)
      openTimeoutRef.current = null
    }
  }, [])

  const clearCloseTimeout = React.useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }, [])

  const getPreviewPosition = React.useCallback(
    (sheetIndex: number) => {
      const item = itemRefs.current[sheetIndex]
      if (!item || typeof window === "undefined") {
        return { left: 0, top: 0 }
      }

      const itemRect = item.getBoundingClientRect()
      const centeredLeft = itemRect.left + itemRect.width / 2 - previewWidth / 2
      const minLeft = 8
      const maxLeft = Math.max(minLeft, window.innerWidth - previewWidth - 8)
      const left = Math.max(minLeft, Math.min(centeredLeft, maxLeft))
      const top = Math.max(8, itemRect.top - previewHeight - previewGap)

      return { left, top }
    },
    [previewHeight]
  )

  const updatePreviewPosition = React.useCallback(
    (sheetIndex: number) => {
      setPreviewPosition(getPreviewPosition(sheetIndex))
    },
    [getPreviewPosition]
  )

  const handleItemEnter = React.useCallback(
    (sheetIndex: number) => {
      clearCloseTimeout()
      const nextPreviewPosition = getPreviewPosition(sheetIndex)

      if (visiblePreviewIndex !== null) {
        clearOpenTimeout()
        setPreviewPosition(nextPreviewPosition)
        setVisiblePreviewIndex(sheetIndex)
        return
      }

      clearOpenTimeout()
      openTimeoutRef.current = setTimeout(() => {
        setPreviewPosition(nextPreviewPosition)
        setVisiblePreviewIndex(sheetIndex)
      }, previewOpenDelayMs)
    },
    [
      clearCloseTimeout,
      clearOpenTimeout,
      getPreviewPosition,
      visiblePreviewIndex,
    ]
  )

  const handleContainerLeave = React.useCallback(() => {
    clearOpenTimeout()
    clearCloseTimeout()
    closeTimeoutRef.current = setTimeout(() => {
      setVisiblePreviewIndex(null)
    }, 80)
  }, [clearCloseTimeout, clearOpenTimeout])

  React.useEffect(() => {
    return () => {
      clearOpenTimeout()
      clearCloseTimeout()
    }
  }, [clearCloseTimeout, clearOpenTimeout])

  React.useEffect(() => {
    clearOpenTimeout()
    clearCloseTimeout()
    setVisiblePreviewIndex(null)
    setPreviewPosition({ left: 0, top: 0 })
    setThumbnailUrls({})
  }, [clearCloseTimeout, clearOpenTimeout, workbookIdentity])

  React.useEffect(() => {
    thumbnails.forEach((thumbnail) => {
      if (thumbnailUrls[thumbnail.sheetIndex]) return

      const canvas = document.createElement("canvas")
      canvas.width = thumbnail.width
      canvas.height = thumbnail.height

      if (!thumbnail.paint(canvas)) return

      const nextUrl = canvas.toDataURL("image/png")
      setThumbnailUrls((current) => {
        if (current[thumbnail.sheetIndex]) return current

        return {
          ...current,
          [thumbnail.sheetIndex]: nextUrl,
        }
      })
    })
  }, [thumbnailUrls, thumbnails])

  React.useEffect(() => {
    if (visiblePreviewIndex === null) return

    const handleReposition = () => updatePreviewPosition(visiblePreviewIndex)
    handleReposition()

    const scrollElement = scrollRef.current
    window.addEventListener("resize", handleReposition)
    scrollElement?.addEventListener("scroll", handleReposition, {
      passive: true,
    })

    return () => {
      window.removeEventListener("resize", handleReposition)
      scrollElement?.removeEventListener("scroll", handleReposition)
    }
  }, [updatePreviewPosition, visiblePreviewIndex])

  if (sheets.length <= 1) return null

  const previewUrl =
    visiblePreviewIndex === null ? null : thumbnailUrls[visiblePreviewIndex]
  const previewSheet =
    visiblePreviewIndex === null ? null : sheets[visiblePreviewIndex]

  return (
    <div
      className="border-t bg-muted/40 px-3 py-2"
      onMouseLeave={handleContainerLeave}
    >
      <Tabs
        value={String(activeSheetIndex)}
        onValueChange={(value) => setActiveSheetIndex(Number(value))}
        className="gap-0"
      >
        <ScrollArea
          orientation="horizontal"
          scrollbarGutter
          className="h-10 w-full has-[[data-slot=scroll-area-viewport][data-has-overflow-x]]:h-[50px]"
          viewportClassName="overflow-y-hidden"
          viewportRef={scrollRef}
        >
          <div className="flex h-full items-center">
            <TabsList className="shrink-0">
              {sheets.map((sheet, index) => (
                <TabsTrigger
                  key={\`\${sheet.workbookSheetIndex}-\${sheet.name}\`}
                  ref={(node) => {
                    itemRefs.current[index] = node
                  }}
                  value={String(index)}
                  className="max-w-48 flex-none"
                  onMouseEnter={() => handleItemEnter(index)}
                >
                  <span className="truncate">{sheet.name}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </ScrollArea>
      </Tabs>
      {typeof document !== "undefined" && previewSheet
        ? createPortal(
            <div
              className={cn(
                "pointer-events-none fixed z-[2147483647] overflow-hidden rounded-lg border bg-background/95 shadow-xl backdrop-blur-md transition-[opacity,transform] duration-100",
                previewUrl
                  ? "translate-y-0 opacity-100"
                  : "translate-y-1 opacity-0"
              )}
              style={{
                left: previewPosition.left,
                top: previewPosition.top,
                width: previewWidth,
              }}
            >
              <div className="relative aspect-[11/7] w-full overflow-hidden bg-muted/60">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={\`\${previewSheet.name} preview\`}
                    className="absolute inset-0 size-full object-cover object-left-top"
                    draggable={false}
                  />
                ) : (
                  <div className="grid size-full place-items-center">
                    <Spinner className="size-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  )
}

export function XlsxWorkbookSurface({
  className,
  isDark,
  onIsDarkChange,
  onUploadClick,
  renderTableHeaderMenu,
  rounded,
  showNightRenderToggle,
  showUploadButton = true,
  workbookIdentity,
}: {
  className?: string
  isDark: boolean
  onIsDarkChange: (checked: boolean) => void
  onUploadClick: () => void
  renderTableHeaderMenu: (
    props: XlsxTableHeaderMenuRenderProps
  ) => React.ReactNode
  rounded: boolean
  showNightRenderToggle: boolean
  showUploadButton?: boolean
  workbookIdentity: string
}) {
  const { error } = useXlsxViewer()

  return (
    <div
      className={cn(
        "flex h-[640px] min-h-0 flex-col overflow-hidden bg-background",
        className,
        rounded && "rounded-lg"
      )}
    >
      <WorkbookToolbar
        isDark={isDark}
        onIsDarkChange={onIsDarkChange}
        onUploadClick={onUploadClick}
        showNightRenderToggle={showNightRenderToggle}
        showUploadButton={showUploadButton}
        workbookIdentity={workbookIdentity}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        <ScrollArea
          orientation="both"
          className="min-h-0 flex-1 bg-muted/20"
          viewportClassName="min-h-0"
        >
          <XlsxViewer
            experimentalCanvas
            allowResizeInReadOnly
            className="h-full min-h-0 min-w-0"
            height="100%"
            isDark={isDark}
            readOnly
            rounded={false}
            showDefaultToolbar={false}
            showImages
            fileTooLargeState={
              <div className="grid h-full w-full min-w-full place-items-center p-6">
                <div className="max-w-sm rounded-lg border bg-background p-4 text-sm">
                  <p className="font-medium">File too large</p>
                  <p className="mt-1 text-muted-foreground">
                    This workbook exceeds the display limit. Download it to view
                    the full file.
                  </p>
                </div>
              </div>
            }
            loadingState={<ViewerLoadingSurface />}
            errorState={
              <div className="grid h-full w-full min-w-full place-items-center p-6 text-sm text-destructive">
                {error?.message ?? "Unable to display workbook."}
              </div>
            }
            renderTableHeaderMenu={renderTableHeaderMenu}
          />
        </ScrollArea>
        <WorkbookSheetTabs workbookIdentity={workbookIdentity} />
      </div>
    </div>
  )
}

export function XlsxViewerPreview({
  className,
  fileName,
  rounded = false,
  src,
}: {
  className?: string
  fileName?: string
  rounded?: boolean
  src?: string
}) {
  const { resolvedTheme } = useTheme()
  const { nightRenderEnabled, nightRenderPrefLoaded, setNightRenderEnabled } =
    useWorkbookNightRenderPreference()
  const isViewerHydrated = resolvedTheme !== undefined && nightRenderPrefLoaded
  const shouldShowHydrationSpinner = useDelayedLoadingIndicator(
    !isViewerHydrated,
    XLSX_LOADING_INDICATOR_DELAY_MS
  )

  if (!isViewerHydrated) {
    return (
      <div
        className={cn(
          "flex h-[640px] min-h-0 flex-col overflow-hidden bg-background",
          className
        )}
      >
        <div
          className={cn(
            "min-h-0 flex-1 overflow-hidden bg-muted/30 p-4",
            rounded && "rounded-b-lg"
          )}
        >
          <ViewerLoadingSurface showSpinner={shouldShowHydrationSpinner} />
        </div>
      </div>
    )
  }

  const shouldRenderNightMode = resolvedTheme === "dark"
  const effectiveIsDark = shouldRenderNightMode && nightRenderEnabled

  return (
    <XlsxViewerContent
      className={className}
      effectiveIsDark={effectiveIsDark}
      fileName={fileName}
      rounded={rounded}
      setNightRenderEnabled={setNightRenderEnabled}
      shouldRenderNightMode={shouldRenderNightMode}
      url={src}
    />
  )
}

function XlsxViewerContent({
  className,
  effectiveIsDark,
  fileName,
  rounded,
  setNightRenderEnabled,
  shouldRenderNightMode,
  url,
}: {
  className?: string
  effectiveIsDark: boolean
  fileName?: string
  rounded: boolean
  setNightRenderEnabled: (checked: boolean) => void
  shouldRenderNightMode: boolean
  url?: string
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [uploadedWorkbook, setUploadedWorkbook] =
    React.useState<UploadedWorkbook | null>(null)
  const sourceFileName = React.useMemo(
    () =>
      url ? formatWorkbookName(fileName, url) : (fileName ?? "workbook.xlsx"),
    [fileName, url]
  )
  const sourceCacheKey = React.useMemo(
    () => (url ? getWorkbookCacheKey(url, sourceFileName) : "xlsx-empty"),
    [sourceFileName, url]
  )
  const displayFileName = React.useMemo(
    () => uploadedWorkbook?.fileName ?? sourceFileName,
    [sourceFileName, uploadedWorkbook?.fileName]
  )
  const cacheKey = React.useMemo(
    () => uploadedWorkbook?.identity ?? sourceCacheKey,
    [sourceCacheKey, uploadedWorkbook?.identity]
  )
  const [workbookBuffer, setWorkbookBuffer] =
    React.useState<ArrayBuffer | null>(
      () => xlsxWorkbookBufferCache.get(cacheKey) ?? null
    )
  const [loadError, setLoadError] = React.useState<string>()
  const shouldShowLoadingSpinner = useDelayedLoadingIndicator(
    !workbookBuffer && !loadError && !uploadedWorkbook,
    XLSX_LOADING_INDICATOR_DELAY_MS
  )

  React.useEffect(() => {
    let isCurrent = true
    if (url) {
      setUploadedWorkbook(null)
    }

    async function loadWorkbook(): Promise<void> {
      if (!url) {
        setWorkbookBuffer(null)
        setLoadError(undefined)
        return
      }

      setWorkbookBuffer(xlsxWorkbookBufferCache.get(sourceCacheKey) ?? null)
      setLoadError(undefined)

      try {
        const nextWorkbookBuffer = await loadCachedWorkbookBuffer(
          url,
          sourceCacheKey
        )
        if (!isCurrent) return

        setWorkbookBuffer(nextWorkbookBuffer)
      } catch (error) {
        if (!isCurrent) return

        setLoadError(
          error instanceof Error ? error.message : "Unknown XLSX load error"
        )
      }
    }

    void loadWorkbook()

    return () => {
      isCurrent = false
    }
  }, [sourceCacheKey, url])

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) return

    const buffer = await file.arrayBuffer()
    setLoadError(undefined)
    setUploadedWorkbook({
      buffer,
      fileName: file.name,
      identity: \`\${file.name}-\${file.size}-\${file.lastModified}\`,
    })
  }

  const activeBuffer = uploadedWorkbook?.buffer ?? workbookBuffer
  const activeFileName = uploadedWorkbook?.fileName ?? displayFileName
  const activeIdentity = uploadedWorkbook?.identity ?? cacheKey

  if (!url && !uploadedWorkbook) {
    return (
      <div
        className={cn(
          "flex h-[640px] min-h-0 flex-col overflow-hidden bg-background",
          className
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          onChange={handleUpload}
        />
        <div className="grid min-h-0 flex-1 place-items-center bg-muted/30 p-4">
          <div className="max-w-md rounded-lg border bg-background p-4 text-center text-sm shadow-xs">
            <p className="font-medium">Upload a workbook to preview</p>
            <p className="mt-1 text-muted-foreground">
              Pass an XLSX URL with the <code>src</code> prop or upload a file.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => fileInputRef.current?.click()}
            >
              <HugeiconsIcon icon={Upload01Icon} className="size-4" />
              Upload XLSX
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (loadError && !activeBuffer) {
    return (
      <div
        className={cn(
          "flex h-[640px] min-h-0 flex-col overflow-hidden bg-background",
          className
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          onChange={handleUpload}
        />
        <div className="grid min-h-0 flex-1 place-items-center bg-muted/30 p-4">
          <div className="max-w-md rounded-lg border bg-background p-4 text-sm">
            <p className="font-medium">Unable to display workbook</p>
            <p className="mt-1 text-muted-foreground">{loadError}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => fileInputRef.current?.click()}
            >
              <HugeiconsIcon icon={Upload01Icon} className="size-4" />
              Upload XLSX
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!activeBuffer) {
    return (
      <div
        className={cn(
          "flex h-[640px] min-h-0 flex-col overflow-hidden bg-background",
          className
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          onChange={handleUpload}
        />
        <ViewerLoadingSurface showSpinner={shouldShowLoadingSpinner} />
      </div>
    )
  }

  return (
    <div className={cn("overflow-hidden", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={handleUpload}
      />
      <XlsxWorkbookLoadedViewer
        fileName={activeFileName}
        isDark={effectiveIsDark}
        onIsDarkChange={setNightRenderEnabled}
        onUploadClick={() => fileInputRef.current?.click()}
        renderTableHeaderMenu={(props) => (
          <WorkbookTableHeaderMenu {...props} />
        )}
        rounded={rounded}
        showNightRenderToggle={shouldRenderNightMode}
        workbookBuffer={activeBuffer}
        workbookIdentity={activeIdentity}
      />
    </div>
  )
}

function XlsxWorkbookLoadedViewer({
  fileName,
  isDark,
  onIsDarkChange,
  onUploadClick,
  renderTableHeaderMenu,
  rounded,
  showNightRenderToggle,
  workbookBuffer,
  workbookIdentity,
}: {
  fileName: string
  isDark: boolean
  onIsDarkChange: (checked: boolean) => void
  onUploadClick: () => void
  renderTableHeaderMenu: (
    props: XlsxTableHeaderMenuRenderProps
  ) => React.ReactNode
  rounded: boolean
  showNightRenderToggle: boolean
  workbookBuffer: ArrayBuffer
  workbookIdentity: string
}) {
  const controller = useXlsxViewerController(
    React.useMemo(
      () => ({
        allowResizeInReadOnly: true,
        file: workbookBuffer,
        fileName,
        readOnly: true,
        useWorker: true,
      }),
      [fileName, workbookBuffer]
    )
  )

  return (
    <XlsxViewerProvider controller={controller} isDark={isDark}>
      <XlsxWorkbookSurface
        isDark={isDark}
        onIsDarkChange={onIsDarkChange}
        onUploadClick={onUploadClick}
        renderTableHeaderMenu={renderTableHeaderMenu}
        rounded={rounded}
        showNightRenderToggle={showNightRenderToggle}
        workbookIdentity={workbookIdentity}
      />
    </XlsxViewerProvider>
  )
}
`

export function XlsxViewerSource() {
  return <HighlightedCodeBlock code={xlsxViewerSourceCode} />
}
