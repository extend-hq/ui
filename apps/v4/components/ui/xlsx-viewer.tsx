"use client"

import * as React from "react"
import {
  useXlsxViewer,
  useXlsxViewerController,
  useXlsxViewerThumbnails,
  useXlsxViewerZoom,
  XlsxViewer,
  XlsxViewerProvider,
  type XlsxScrollerRenderProps,
  type XlsxTableHeaderMenuRenderProps,
} from "@extend-ai/react-xlsx"
import {
  Download01Icon,
  MinusSignCircleIcon,
  Moon02Icon,
  MoreHorizontalIcon,
  PlusSignCircleIcon,
  Sun03Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const XLSX_LOADING_INDICATOR_DELAY_MS = 300
const XLSX_DROPDOWN_Z_INDEX_CLASS = "z-40"
const ZOOM_OPTIONS = [10, 25, 50, 75, 100, 125, 150, 175, 200, 400] as const

// Stable reference so the thumbnails memo isn't invalidated on every render
// (e.g. by selection changes), which would recompute every sheet thumbnail.
const XLSX_SHEET_TAB_THUMBNAIL_OPTIONS = {
  resolution: {
    maxHeight: 360,
    maxWidth: 560,
  },
} as const

type UploadedWorkbook = {
  buffer: ArrayBuffer
  fileName: string
  identity: string
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

function ensureWorkbookExtension(fileName: string) {
  const lowerFileName = fileName.toLowerCase()
  return lowerFileName.endsWith(".xlsx") || lowerFileName.endsWith(".xls")
    ? fileName
    : `${fileName}.xlsx`
}

function downloadWorkbookBuffer(buffer: ArrayBuffer, fileName: string) {
  const resolvedFileName = ensureWorkbookExtension(fileName)
  const blob = new Blob([buffer], {
    type: resolvedFileName.toLowerCase().endsWith(".xls")
      ? "application/vnd.ms-excel"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")

  anchor.href = url
  anchor.download = resolvedFileName
  anchor.rel = "noopener"
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
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

export function useControllableDarkMode({
  defaultIsDark = false,
  isDark,
  onIsDarkChange,
}: {
  defaultIsDark?: boolean
  isDark?: boolean
  onIsDarkChange?: (isDark: boolean) => void
}) {
  const [uncontrolledIsDark, setUncontrolledIsDark] =
    React.useState(defaultIsDark)
  const resolvedIsDark = isDark ?? uncontrolledIsDark

  const setIsDark = React.useCallback(
    (nextIsDark: boolean) => {
      if (isDark === undefined) {
        setUncontrolledIsDark(nextIsDark)
      }

      onIsDarkChange?.(nextIsDark)
    },
    [isDark, onIsDarkChange]
  )

  return [resolvedIsDark, setIsDark] as const
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

export function renderXlsxScroller({
  children,
  viewportProps,
}: XlsxScrollerRenderProps) {
  return (
    <ScrollArea
      className="h-full min-h-0 w-full min-w-0 flex-1"
      viewportProps={viewportProps}
    >
      {children}
    </ScrollArea>
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
  onDownload,
  onIsDarkChange,
  onUploadClick,
  showDownloadButton = true,
  showNightRenderToggle,
  showUploadButton = true,
  toolbarActions,
  workbookIdentity,
}: {
  isDark: boolean
  onDownload?: () => void
  onIsDarkChange: (checked: boolean) => void
  onUploadClick: () => void
  showDownloadButton?: boolean
  showNightRenderToggle: boolean
  showUploadButton?: boolean
  toolbarActions?: React.ReactNode
  workbookIdentity: string
}) {
  const { canZoomIn, canZoomOut, setZoomScale, zoomIn, zoomOut, zoomScale } =
    useXlsxViewerZoom()
  const currentZoom = Math.round(zoomScale)

  React.useEffect(() => {
    setZoomScale(100)
  }, [setZoomScale, workbookIdentity])

  return (
    <div className="flex min-h-12 flex-wrap items-center justify-end gap-2 border-b bg-background px-3 py-2">
      <TooltipProvider>
        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1">
          {showNightRenderToggle ? (
            <ToolbarTooltip
              label={isDark ? "Use light workbook" : "Use dark workbook"}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={isDark ? "Use light workbook" : "Use dark workbook"}
                onClick={() => onIsDarkChange(!isDark)}
              >
                <HugeiconsIcon
                  icon={isDark ? Sun03Icon : Moon02Icon}
                  className="size-4"
                />
              </Button>
            </ToolbarTooltip>
          ) : null}
          <Separator orientation="vertical" className="mx-1 h-4 self-center" />
          <div className="flex flex-none items-center gap-1">
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
              modal={false}
            >
              <SelectTrigger
                size="sm"
                className="w-[84px] min-w-[84px]"
                aria-label="Zoom level"
              >
                <SelectValue>{currentZoom}%</SelectValue>
              </SelectTrigger>
              <SelectContent
                align="end"
                alignItemWithTrigger={false}
                className={XLSX_DROPDOWN_Z_INDEX_CLASS}
              >
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
          </div>
          {showDownloadButton && onDownload ? (
            <>
              <Separator
                orientation="vertical"
                className="mx-1 h-4 self-center"
              />
              <ToolbarTooltip label="Download XLSX">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Download XLSX"
                  onClick={onDownload}
                >
                  <HugeiconsIcon icon={Download01Icon} className="size-4" />
                </Button>
              </ToolbarTooltip>
            </>
          ) : null}
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
  )
}

function WorkbookStandaloneToolbar({
  onUploadClick,
  showUploadButton = true,
  toolbarActions,
}: {
  onUploadClick: () => void
  showUploadButton?: boolean
  toolbarActions?: React.ReactNode
}) {
  return (
    <div className="flex min-h-12 flex-wrap items-center justify-end gap-2 border-b bg-background px-3 py-2">
      <TooltipProvider>
        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1">
          {showUploadButton ? (
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
          ) : null}
          {toolbarActions ? (
            <>
              {showUploadButton ? (
                <Separator
                  orientation="vertical"
                  className="mx-1 h-4 self-center"
                />
              ) : null}
              {toolbarActions}
            </>
          ) : null}
        </div>
      </TooltipProvider>
    </div>
  )
}

type WorkbookSheetTab = {
  name: string
  workbookSheetIndex: number
}

type WorkbookSheetTabsInnerProps = {
  activeSheetIndex: number
  onActiveSheetIndexChange: (index: number) => void
  sheets: WorkbookSheetTab[]
  workbookIdentity: string
}

export function WorkbookSheetTabs({
  workbookIdentity,
}: {
  workbookIdentity: string
}) {
  const { activeSheetIndex, setActiveSheetIndex, sheets } = useXlsxViewer()

  const handleActiveSheetIndexChange = React.useCallback(
    (index: number) => setActiveSheetIndex(index),
    [setActiveSheetIndex]
  )

  return (
    <WorkbookSheetTabsInner
      activeSheetIndex={activeSheetIndex}
      onActiveSheetIndexChange={handleActiveSheetIndexChange}
      sheets={sheets}
      workbookIdentity={workbookIdentity}
    />
  )
}

const WorkbookSheetTabsInner = React.memo(function WorkbookSheetTabsInner({
  activeSheetIndex,
  onActiveSheetIndexChange,
  sheets,
  workbookIdentity,
}: WorkbookSheetTabsInnerProps) {
  const [visiblePreviewIndex, setVisiblePreviewIndex] = React.useState<
    number | null
  >(null)
  const [previewPosition, setPreviewPosition] = React.useState({
    left: 0,
    top: 0,
  })
  const { thumbnails } = useXlsxViewerThumbnails(
    XLSX_SHEET_TAB_THUMBNAIL_OPTIONS
  )
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
      setThumbnailUrls((current) => {
        if (current[thumbnail.sheetIndex]) return current

        const canvas = document.createElement("canvas")
        canvas.width = thumbnail.width
        canvas.height = thumbnail.height

        if (!thumbnail.paint(canvas)) return current

        return {
          ...current,
          [thumbnail.sheetIndex]: canvas.toDataURL("image/png"),
        }
      })
    })
  }, [thumbnails])

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

  const previewSheet =
    visiblePreviewIndex === null ? null : sheets[visiblePreviewIndex]
  const previewUrl =
    visiblePreviewIndex === null
      ? null
      : (thumbnailUrls[visiblePreviewIndex] ?? null)

  return (
    <div
      className="border-t bg-muted/40 px-3 py-2"
      onMouseLeave={handleContainerLeave}
    >
      <Tabs
        value={String(activeSheetIndex)}
        onValueChange={(value) => onActiveSheetIndexChange(Number(value))}
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
                  key={`${sheet.workbookSheetIndex}-${sheet.name}`}
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
      {typeof document !== "undefined" &&
      previewSheet &&
      visiblePreviewIndex !== null &&
      previewUrl
        ? createPortal(
            <div
              className="pointer-events-none fixed z-40 translate-y-0 overflow-hidden rounded-lg border bg-background/95 opacity-100 shadow-xl backdrop-blur-md transition-[opacity,transform] duration-100"
              style={{
                left: previewPosition.left,
                top: previewPosition.top,
                width: previewWidth,
              }}
            >
              <div className="relative aspect-[11/7] w-full overflow-hidden bg-muted/60">
                <img
                  key={`${workbookIdentity}-${visiblePreviewIndex}-${previewUrl}`}
                  src={previewUrl}
                  alt={`${previewSheet.name} preview`}
                  className="absolute inset-0 h-full w-full object-cover object-left-top"
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  )
})

export function XlsxWorkbookSurface({
  className,
  isDark,
  onDownload,
  onIsDarkChange,
  onUploadClick,
  renderTableHeaderMenu,
  rounded,
  showDownloadButton = true,
  showNightRenderToggle,
  showToolbar = true,
  showUploadButton = true,
  toolbarActions,
  workbookIdentity,
}: {
  className?: string
  isDark: boolean
  onDownload?: () => void
  onIsDarkChange: (checked: boolean) => void
  onUploadClick: () => void
  renderTableHeaderMenu: (
    props: XlsxTableHeaderMenuRenderProps
  ) => React.ReactNode
  rounded: boolean
  showDownloadButton?: boolean
  showNightRenderToggle: boolean
  showToolbar?: boolean
  showUploadButton?: boolean
  toolbarActions?: React.ReactNode
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
      {showToolbar ? (
        <WorkbookToolbar
          isDark={isDark}
          onDownload={onDownload}
          onIsDarkChange={onIsDarkChange}
          onUploadClick={onUploadClick}
          showDownloadButton={showDownloadButton}
          showNightRenderToggle={showNightRenderToggle}
          showUploadButton={showUploadButton}
          toolbarActions={toolbarActions}
          workbookIdentity={workbookIdentity}
        />
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 bg-muted/20">
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
            renderScroller={renderXlsxScroller}
            errorState={
              <div className="grid h-full w-full min-w-full place-items-center p-6 text-sm text-destructive">
                {error?.message ?? "Unable to display workbook."}
              </div>
            }
            renderTableHeaderMenu={renderTableHeaderMenu}
          />
        </div>
        <WorkbookSheetTabs workbookIdentity={workbookIdentity} />
      </div>
    </div>
  )
}

export function XlsxViewerPreview({
  className,
  defaultIsDark = false,
  fileName,
  isDark: controlledIsDark,
  onIsDarkChange,
  rounded = false,
  showDownload = true,
  showToolbar = true,
  showUpload = true,
  src,
  toolbarActions,
}: {
  className?: string
  defaultIsDark?: boolean
  fileName?: string
  isDark?: boolean
  onIsDarkChange?: (isDark: boolean) => void
  rounded?: boolean
  showDownload?: boolean
  showToolbar?: boolean
  showUpload?: boolean
  src?: string
  toolbarActions?: React.ReactNode
}) {
  const [effectiveIsDark, setIsDark] = useControllableDarkMode({
    defaultIsDark,
    isDark: controlledIsDark,
    onIsDarkChange,
  })

  return (
    <XlsxViewerContent
      className={className}
      effectiveIsDark={effectiveIsDark}
      fileName={fileName}
      rounded={rounded}
      setNightRenderEnabled={setIsDark}
      shouldRenderNightMode
      showDownload={showDownload}
      showToolbar={showToolbar}
      showUpload={showUpload}
      toolbarActions={toolbarActions}
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
  showDownload,
  showToolbar = true,
  showUpload,
  toolbarActions,
  url,
}: {
  className?: string
  effectiveIsDark: boolean
  fileName?: string
  rounded: boolean
  setNightRenderEnabled: (checked: boolean) => void
  shouldRenderNightMode: boolean
  showDownload: boolean
  showToolbar?: boolean
  showUpload: boolean
  toolbarActions?: React.ReactNode
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
  const displayFileName = React.useMemo(
    () => uploadedWorkbook?.fileName ?? sourceFileName,
    [sourceFileName, uploadedWorkbook?.fileName]
  )
  const workbookIdentity = React.useMemo(
    () => uploadedWorkbook?.identity ?? `${url ?? "empty"}::${displayFileName}`,
    [displayFileName, uploadedWorkbook?.identity, url]
  )
  const [workbookBuffer, setWorkbookBuffer] =
    React.useState<ArrayBuffer | null>(null)
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

      setWorkbookBuffer(null)
      setLoadError(undefined)

      try {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to fetch XLSX (${response.status})`)
        }

        const nextWorkbookBuffer = await response.arrayBuffer()
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
  }, [url])

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) return

    const buffer = await file.arrayBuffer()
    setLoadError(undefined)
    setUploadedWorkbook({
      buffer,
      fileName: file.name,
      identity: `${file.name}-${file.size}-${file.lastModified}`,
    })
  }

  const activeBuffer = uploadedWorkbook?.buffer ?? workbookBuffer
  const activeFileName = uploadedWorkbook?.fileName ?? displayFileName
  const activeIdentity = workbookIdentity

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
        <WorkbookStandaloneToolbar
          onUploadClick={() => fileInputRef.current?.click()}
          showUploadButton={showUpload}
          toolbarActions={toolbarActions}
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
        <WorkbookStandaloneToolbar
          onUploadClick={() => fileInputRef.current?.click()}
          showUploadButton={showUpload}
          toolbarActions={toolbarActions}
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
        <WorkbookStandaloneToolbar
          onUploadClick={() => fileInputRef.current?.click()}
          showUploadButton={showUpload}
          toolbarActions={toolbarActions}
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
        className={className}
        fileName={activeFileName}
        isDark={effectiveIsDark}
        onDownload={() => downloadWorkbookBuffer(activeBuffer, activeFileName)}
        onIsDarkChange={setNightRenderEnabled}
        onUploadClick={() => fileInputRef.current?.click()}
        renderTableHeaderMenu={(props) => (
          <WorkbookTableHeaderMenu {...props} />
        )}
        rounded={rounded}
        showDownloadButton={showDownload}
        showNightRenderToggle={shouldRenderNightMode}
        showToolbar={showToolbar}
        showUploadButton={showUpload}
        toolbarActions={toolbarActions}
        workbookBuffer={activeBuffer}
        workbookIdentity={activeIdentity}
      />
    </div>
  )
}

function XlsxWorkbookLoadedViewer({
  className,
  fileName,
  isDark,
  onDownload,
  onIsDarkChange,
  onUploadClick,
  renderTableHeaderMenu,
  rounded,
  showDownloadButton,
  showNightRenderToggle,
  showToolbar = true,
  showUploadButton,
  toolbarActions,
  workbookBuffer,
  workbookIdentity,
}: {
  className?: string
  fileName: string
  isDark: boolean
  onDownload: () => void
  onIsDarkChange: (checked: boolean) => void
  onUploadClick: () => void
  renderTableHeaderMenu: (
    props: XlsxTableHeaderMenuRenderProps
  ) => React.ReactNode
  rounded: boolean
  showDownloadButton: boolean
  showNightRenderToggle: boolean
  showToolbar?: boolean
  showUploadButton: boolean
  toolbarActions?: React.ReactNode
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
        className={className}
        isDark={isDark}
        onDownload={onDownload}
        onIsDarkChange={onIsDarkChange}
        onUploadClick={onUploadClick}
        renderTableHeaderMenu={renderTableHeaderMenu}
        rounded={rounded}
        showDownloadButton={showDownloadButton}
        showNightRenderToggle={showNightRenderToggle}
        showToolbar={showToolbar}
        showUploadButton={showUploadButton}
        toolbarActions={toolbarActions}
        workbookIdentity={workbookIdentity}
      />
    </XlsxViewerProvider>
  )
}
