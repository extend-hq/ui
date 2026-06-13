"use client"

import * as React from "react"
import {
  DocxEditorViewer,
  useDocxComments,
  useDocxEditor,
  useDocxPageLayout,
  useDocxTrackChanges,
  useDocxViewerThumbnails,
  type DocxDocumentTheme,
  type DocxEditorController,
  type DocxPageThumbnailItem,
} from "@extend-ai/react-docx"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  Comment01Icon,
  Download01Icon,
  MinusSignCircleIcon,
  Moon02Icon,
  MoreHorizontalIcon,
  PlusSignCircleIcon,
  SidebarLeftIcon,
  Upload01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DocumentViewerThumbnailSidebar,
  useElementWidth,
  useInlineThumbnailSidebar,
} from "@/components/ui/document-viewer-sidebar"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FileThumbnail } from "@/components/ui/file-thumbnail"
import { Input } from "@/components/ui/input"
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

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
const DOCX_LOADING_INDICATOR_DELAY_MS = 300
const DOCX_THUMBNAIL_WIDTH = 92
const DOCX_THUMBNAIL_LIST_PADDING = 16
const DOCX_THUMBNAIL_ROW_ESTIMATE = 172
const DEFAULT_ZOOM = 50
const ZOOM_OPTIONS = [10, 25, 50, 75, 100, 125, 150, 175, 200, 400] as const
const DOCX_PADDING_WARNING_TEXT = "a style property during rerender"

type UploadedDocxFile = {
  file: File
  identity: string
}

async function loadDocxFile(
  url: string,
  displayFileName: string
): Promise<File> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch DOCX (${response.status})`)
  }

  const blob = await response.blob()
  return new File([blob], displayFileName, {
    type: blob.type || DOCX_MIME_TYPE,
  })
}

function formatDocumentName(fileName: string | undefined, url: string) {
  if (fileName?.trim()) return fileName

  const pathname = url.split("?")[0] ?? ""
  const rawName = pathname.split("/").pop() ?? "document.docx"

  try {
    return decodeURIComponent(rawName)
  } catch {
    return rawName
  }
}

function ensureDocxExtension(fileName: string) {
  return fileName.toLowerCase().endsWith(".docx")
    ? fileName
    : `${fileName}.docx`
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

async function downloadDocxFile({
  file,
  fileName,
  url,
}: {
  file?: File
  fileName: string
  url?: string
}) {
  if (file) {
    downloadBlob(file, ensureDocxExtension(fileName))
    return
  }

  if (!url) return

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download DOCX (${response.status})`)
  }

  downloadBlob(await response.blob(), ensureDocxExtension(fileName))
}

function getNextZoomScale(currentZoomScale: number, direction: 1 | -1) {
  const currentIndex = ZOOM_OPTIONS.indexOf(
    currentZoomScale as (typeof ZOOM_OPTIONS)[number]
  )
  let fallbackIndex = -1

  if (direction > 0) {
    fallbackIndex = ZOOM_OPTIONS.findIndex((value) => value > currentZoomScale)
  } else {
    for (let index = ZOOM_OPTIONS.length - 1; index >= 0; index -= 1) {
      if (ZOOM_OPTIONS[index] < currentZoomScale) {
        fallbackIndex = index
        break
      }
    }
  }

  const resolvedIndex = currentIndex >= 0 ? currentIndex : fallbackIndex
  if (resolvedIndex < 0) return currentZoomScale

  const nextIndex = Math.min(
    Math.max(resolvedIndex + direction, 0),
    ZOOM_OPTIONS.length - 1
  )

  return ZOOM_OPTIONS[nextIndex] ?? currentZoomScale
}

function normalizeDocxZoomScale(value: number | undefined): number {
  return typeof value === "number" &&
    ZOOM_OPTIONS.includes(value as (typeof ZOOM_OPTIONS)[number])
    ? value
    : DEFAULT_ZOOM
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

function isDocxPaddingWarning(args: unknown[]) {
  return (
    typeof args[0] === "string" &&
    args[0].includes(DOCX_PADDING_WARNING_TEXT) &&
    args.some((arg) => String(arg).includes("padding"))
  )
}

function useSuppressDocxPaddingWarning(enabled: boolean) {
  React.useEffect(() => {
    if (!enabled) return

    const originalConsoleError = console.error

    console.error = (...args: unknown[]) => {
      if (isDocxPaddingWarning(args)) return
      originalConsoleError(...args)
    }

    return () => {
      console.error = originalConsoleError
    }
  }, [enabled])
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
    <div className="grid h-full min-h-52 place-items-center bg-transparent">
      {showSpinner ? <Spinner className="size-4" /> : null}
    </div>
  )
}

function DocxFileActionsMenu({
  controlsDisabled,
  downloadDisabled,
  isPreparingDownload,
  isDark,
  onDownload,
  onIsDarkChange,
  onShowDocumentMarkupChange,
  onUploadClick,
  showDocumentMarkup,
  showDownloadButton,
  showNightRenderToggle,
  showUploadButton,
}: {
  controlsDisabled: boolean
  downloadDisabled: boolean
  isPreparingDownload: boolean
  isDark: boolean
  onDownload: () => void
  onIsDarkChange: (checked: boolean) => void
  onShowDocumentMarkupChange: (checked: boolean) => void
  onUploadClick: () => void
  showDocumentMarkup: boolean
  showDownloadButton: boolean
  showNightRenderToggle: boolean
  showUploadButton: boolean
}) {
  const showFileActions = showDownloadButton || showUploadButton

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Open DOCX actions"
        >
          <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {showNightRenderToggle ? (
          <>
            <DropdownMenuCheckboxItem
              checked={isDark}
              disabled={controlsDisabled}
              variant="switch"
              onCheckedChange={(checked) => onIsDarkChange(checked === true)}
            >
              <span className="flex min-w-0 items-center gap-2">
                <HugeiconsIcon icon={Moon02Icon} className="size-4" />
                Dark mode
              </span>
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuCheckboxItem
          checked={showDocumentMarkup}
          disabled={controlsDisabled}
          variant="switch"
          onCheckedChange={(checked) =>
            onShowDocumentMarkupChange(checked === true)
          }
        >
          <span className="flex min-w-0 items-center gap-2">
            <HugeiconsIcon icon={Comment01Icon} className="size-4" />
            Comments/edits
          </span>
        </DropdownMenuCheckboxItem>
        {showFileActions ? <DropdownMenuSeparator /> : null}
        {showDownloadButton ? (
          <DropdownMenuItem disabled={downloadDisabled} onClick={onDownload}>
            {isPreparingDownload ? (
              <Spinner className="size-4" />
            ) : (
              <HugeiconsIcon icon={Download01Icon} className="size-4" />
            )}
            Download
          </DropdownMenuItem>
        ) : null}
        {showUploadButton ? (
          <DropdownMenuItem onClick={onUploadClick}>
            <HugeiconsIcon icon={Upload01Icon} className="size-4" />
            Upload
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function DocxPageNumberControl({
  activePage,
  controlsDisabled,
  onPageChange,
  pageCount,
}: {
  activePage: number
  controlsDisabled: boolean
  onPageChange: (pageNumber: number) => void
  pageCount: number
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const displayPage = pageCount ? activePage : 1
  const [isEditing, setIsEditing] = React.useState(false)
  const [draftPage, setDraftPage] = React.useState(() => String(displayPage))

  React.useEffect(() => {
    if (!isEditing) {
      setDraftPage(String(displayPage))
    }
  }, [displayPage, isEditing])

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
      if (parsedPage < 1 || parsedPage > pageCount) return

      onPageChange(parsedPage)
    },
    [onPageChange, pageCount]
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
          size="sm"
          className="font-normal"
          aria-label={`Current page ${displayPage}. Edit page number`}
          disabled={controlsDisabled || !pageCount}
          onClick={() => setIsEditing(true)}
        >
          {displayPage}
        </Button>
      )}
      <span>of {pageCount || "-"}</span>
    </div>
  )
}

function DocxToolbar({
  activePage,
  controlsDisabled,
  isDark,
  isPreparingDownload,
  onDownload,
  onIsDarkChange,
  onPageChange,
  onShowDocumentMarkupChange,
  onToggleSidebar,
  onUploadClick,
  pageCount,
  setZoomScale,
  showDocumentMarkup,
  showDownloadButton = true,
  showNightRenderToggle,
  showUploadButton = true,
  toolbarActions,
  zoomScale,
}: {
  activePage: number
  controlsDisabled: boolean
  isDark: boolean
  isPreparingDownload: boolean
  onDownload: () => void
  onIsDarkChange: (checked: boolean) => void
  onPageChange: (pageNumber: number) => void
  onShowDocumentMarkupChange: (checked: boolean) => void
  onToggleSidebar: () => void
  onUploadClick: () => void
  pageCount: number
  setZoomScale: React.Dispatch<React.SetStateAction<number>>
  showDocumentMarkup: boolean
  showDownloadButton?: boolean
  showNightRenderToggle: boolean
  showUploadButton?: boolean
  toolbarActions?: React.ReactNode
  zoomScale: number
}) {
  const canZoomIn = zoomScale < ZOOM_OPTIONS[ZOOM_OPTIONS.length - 1]
  const canZoomOut = zoomScale > ZOOM_OPTIONS[0]

  return (
    <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b bg-background px-3 py-2">
      <TooltipProvider>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <ToolbarTooltip label="Toggle thumbnails">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Toggle thumbnails"
              disabled={controlsDisabled}
              onClick={onToggleSidebar}
            >
              <HugeiconsIcon icon={SidebarLeftIcon} className="size-4" />
            </Button>
          </ToolbarTooltip>
          <DocxPageNumberControl
            activePage={activePage}
            controlsDisabled={controlsDisabled}
            onPageChange={onPageChange}
            pageCount={pageCount}
          />
        </div>
        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1">
          <div className="flex flex-none items-center gap-1">
            <ToolbarTooltip label="Zoom out">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={controlsDisabled || !canZoomOut}
                aria-label="Zoom out"
                onClick={() =>
                  setZoomScale((currentZoomScale) =>
                    getNextZoomScale(currentZoomScale, -1)
                  )
                }
              >
                <HugeiconsIcon icon={MinusSignCircleIcon} className="size-4" />
              </Button>
            </ToolbarTooltip>
            <Select
              value={zoomScale.toString()}
              onValueChange={(value) => setZoomScale(Number(value))}
              disabled={controlsDisabled}
              modal={false}
            >
              <SelectTrigger
                size="sm"
                className="w-[84px] min-w-[84px]"
                aria-label="Zoom level"
              >
                <SelectValue>{Math.round(zoomScale)}%</SelectValue>
              </SelectTrigger>
              <SelectContent align="end" alignItemWithTrigger={false}>
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
                disabled={controlsDisabled || !canZoomIn}
                aria-label="Zoom in"
                onClick={() =>
                  setZoomScale((currentZoomScale) =>
                    getNextZoomScale(currentZoomScale, 1)
                  )
                }
              >
                <HugeiconsIcon icon={PlusSignCircleIcon} className="size-4" />
              </Button>
            </ToolbarTooltip>
          </div>
          {toolbarActions ? (
            <>
              <Separator
                orientation="vertical"
                className="mx-1 h-4 self-center"
              />
              {toolbarActions}
            </>
          ) : null}
          <Separator orientation="vertical" className="mx-1 h-4 self-center" />
          <DocxFileActionsMenu
            controlsDisabled={controlsDisabled}
            downloadDisabled={controlsDisabled || isPreparingDownload}
            isPreparingDownload={isPreparingDownload}
            isDark={isDark}
            onDownload={onDownload}
            onIsDarkChange={onIsDarkChange}
            onShowDocumentMarkupChange={onShowDocumentMarkupChange}
            onUploadClick={onUploadClick}
            showDocumentMarkup={showDocumentMarkup}
            showDownloadButton={showDownloadButton}
            showNightRenderToggle={showNightRenderToggle}
            showUploadButton={showUploadButton}
          />
        </div>
      </TooltipProvider>
    </div>
  )
}

function DocxSidebarThumbnail({
  canvasRef,
  displayFileName,
  hasError,
  isActive,
  isLoading,
  pageNumber,
  pixelHeightPx,
  pixelWidthPx,
  previewAspectRatio,
}: {
  canvasRef: React.RefCallback<HTMLCanvasElement>
  displayFileName: string
  hasError: boolean
  isActive: boolean
  isLoading: boolean
  pageNumber: number
  pixelHeightPx: number
  pixelWidthPx: number
  previewAspectRatio: number
}) {
  return (
    <FileThumbnail
      file={{
        name: `${displayFileName} page ${pageNumber}`,
        type: DOCX_MIME_TYPE,
      }}
      previewAspectRatio={previewAspectRatio}
      previewClassName="rounded-md bg-white"
      previewContent={
        <canvas
          ref={canvasRef}
          width={pixelWidthPx}
          height={pixelHeightPx}
          className="!size-full bg-white object-cover object-top"
        />
      }
      isLoading={isLoading}
      hasError={hasError}
      className={cn(
        "w-[92px] rounded-md border-0 shadow-xs ring-0 transition-shadow duration-150",
        isActive && "shadow-sm"
      )}
    />
  )
}

function DocxThumbnailSidebarList({
  activePage,
  displayFileName,
  isLoadingDocument,
  onSelectPage,
  pageCount,
  sidebarOpen,
  thumbnails,
}: {
  activePage: number
  displayFileName: string
  isLoadingDocument: boolean
  onSelectPage: (pageNumber: number) => void
  pageCount: number
  sidebarOpen: boolean
  thumbnails: DocxPageThumbnailItem[]
}) {
  const viewportRef = React.useRef<HTMLDivElement | null>(null)
  const visibleThumbnails = React.useMemo(
    () => thumbnails.slice(0, pageCount || 0),
    [pageCount, thumbnails]
  )
  const virtualizer = useVirtualizer({
    count: visibleThumbnails.length,
    estimateSize: () => DOCX_THUMBNAIL_ROW_ESTIMATE,
    getItemKey: (index) => visibleThumbnails[index]?.pageIndex ?? index,
    getScrollElement: () => viewportRef.current,
    overscan: 3,
  })

  React.useEffect(() => {
    if (!sidebarOpen || activePage < 1 || !visibleThumbnails.length) return

    virtualizer.scrollToIndex(
      Math.min(activePage - 1, visibleThumbnails.length - 1),
      { align: "auto" }
    )
  }, [activePage, sidebarOpen, virtualizer, visibleThumbnails.length])

  return (
    <ScrollArea className="h-full" scrollFade viewportRef={viewportRef}>
      {isLoadingDocument ? (
        <div className="p-4">
          <div className="mx-auto h-28 w-20 overflow-hidden rounded-md bg-background shadow-xs">
            <div className="h-full animate-pulse bg-muted" />
          </div>
          <div className="mx-auto mt-3 h-3 w-10 rounded-full bg-muted" />
        </div>
      ) : visibleThumbnails.length ? (
        <div
          className="relative"
          style={{
            height: virtualizer.getTotalSize() + DOCX_THUMBNAIL_LIST_PADDING * 2,
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const thumbnail = visibleThumbnails[virtualRow.index]
            if (!thumbnail) return null

            return (
              <div
                key={virtualRow.key}
                ref={virtualizer.measureElement}
                data-index={virtualRow.index}
                className="absolute top-0 right-3 left-3 pb-3 [contain:layout_paint]"
                style={{
                  transform: `translateY(${
                    virtualRow.start + DOCX_THUMBNAIL_LIST_PADDING
                  }px)`,
                }}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "!h-auto w-full flex-col items-center gap-2 p-2 text-xs shadow-none transition-none hover:bg-sidebar-accent",
                    thumbnail.pageNumber === activePage &&
                      "bg-sidebar-accent text-foreground",
                    thumbnail.pageNumber !== activePage &&
                      "text-muted-foreground"
                  )}
                  onFocus={(event) => event.currentTarget.blur()}
                  onClick={() => onSelectPage(thumbnail.pageNumber)}
                >
                  <DocxSidebarThumbnail
                    canvasRef={thumbnail.canvasRef}
                    displayFileName={displayFileName}
                    hasError={thumbnail.status === "error"}
                    isActive={thumbnail.pageNumber === activePage}
                    isLoading={
                      thumbnail.status !== "ready" &&
                      thumbnail.status !== "error"
                    }
                    pageNumber={thumbnail.pageNumber}
                    pixelHeightPx={thumbnail.pixelHeightPx}
                    pixelWidthPx={thumbnail.pixelWidthPx}
                    previewAspectRatio={thumbnail.aspectRatio}
                  />
                  {thumbnail.pageNumber}
                </Button>
              </div>
            )
          })}
        </div>
      ) : null}
    </ScrollArea>
  )
}

export function DocxViewerPreview({
  className,
  defaultZoom = DEFAULT_ZOOM,
  fileName,
  isDark,
  onIsDarkChange,
  showDownload = true,
  showToolbar = true,
  showUpload = true,
  src,
  toolbarActions,
}: {
  className?: string
  defaultZoom?: number
  fileName?: string
  isDark: boolean
  onIsDarkChange: (isDark: boolean) => void
  showDownload?: boolean
  showToolbar?: boolean
  showUpload?: boolean
  src?: string
  toolbarActions?: React.ReactNode
}) {
  return (
    <DocxViewerContent
      className={className}
      defaultZoom={defaultZoom}
      effectiveIsDark={isDark}
      fileName={fileName}
      setNightRenderEnabled={onIsDarkChange}
      shouldRenderNightMode
      showDownload={showDownload}
      showToolbar={showToolbar}
      showUpload={showUpload}
      toolbarActions={toolbarActions}
      url={src}
    />
  )
}

function DocxViewerContent({
  className,
  defaultZoom,
  effectiveIsDark,
  fileName,
  setNightRenderEnabled,
  shouldRenderNightMode,
  showDownload,
  showToolbar = true,
  showUpload,
  toolbarActions,
  url,
}: {
  className?: string
  defaultZoom?: number
  effectiveIsDark: boolean
  fileName?: string
  setNightRenderEnabled: (checked: boolean) => void
  shouldRenderNightMode: boolean
  showDownload: boolean
  showToolbar?: boolean
  showUpload: boolean
  toolbarActions?: React.ReactNode
  url?: string
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const viewportRef = React.useRef<HTMLDivElement | null>(null)
  const [viewportElement, setViewportElement] =
    React.useState<HTMLDivElement | null>(null)
  const [viewerShellRef, viewerShellWidth] = useElementWidth<HTMLDivElement>()
  const [uploadedDocxFile, setUploadedDocxFile] =
    React.useState<UploadedDocxFile | null>(null)
  const [activePage, setActivePage] = React.useState(1)
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const resolvedDefaultZoomScale = normalizeDocxZoomScale(defaultZoom)
  const sidebarInline = useInlineThumbnailSidebar(viewerShellWidth)
  const viewerBackgroundColor =
    "color-mix(in oklab, var(--muted) 40%, transparent)"
  const displayFileName = React.useMemo(
    () =>
      uploadedDocxFile?.file.name ??
      (url ? formatDocumentName(fileName, url) : (fileName ?? "document.docx")),
    [fileName, uploadedDocxFile?.file.name, url]
  )
  const [initialDocumentTheme] = React.useState<DocxDocumentTheme>(() =>
    effectiveIsDark ? "dark" : "light"
  )
  const editorOptions = React.useMemo(
    () => ({
      initialDocumentTheme,
      initialFileName: displayFileName,
    }),
    [displayFileName, initialDocumentTheme]
  )
  const editor = useDocxEditor(editorOptions)
  const { layout: pageLayout } = useDocxPageLayout(editor)
  const { importDocxFile, setDocumentTheme, status } = editor
  const { showComments, setShowComments } = useDocxComments(editor)
  const { showTrackedChanges, setShowTrackedChanges } =
    useDocxTrackChanges(editor)
  const [reportedPageCount, setReportedPageCount] = React.useState(0)
  const thumbnailEditor = React.useMemo<DocxEditorController>(
    () => ({
      ...editor,
      totalPages: Math.max(editor.totalPages, reportedPageCount),
    }),
    [editor, reportedPageCount]
  )
  const thumbnailOptions = React.useMemo(
    () => ({
      // Detached thumbnail rendering handles offscreen pages; keep the raster
      // queue dormant while the sidebar is closed.
      disabled: !sidebarOpen,
      pixelRatio: 1,
      resolution: {
        maxHeight: DOCX_THUMBNAIL_WIDTH * 1.35,
        maxWidth: DOCX_THUMBNAIL_WIDTH,
      },
    }),
    [sidebarOpen]
  )
  const { thumbnails } = useDocxViewerThumbnails(
    thumbnailEditor,
    thumbnailOptions
  )
  const [zoomScale, setZoomScale] = React.useState<number>(
    resolvedDefaultZoomScale
  )
  const [loadError, setLoadError] = React.useState<string>()
  const [isLoadingDocument, setIsLoadingDocument] = React.useState(true)
  const [isPreparingDownload, setIsPreparingDownload] = React.useState(false)
  const shouldShowDocumentSpinner = useDelayedLoadingIndicator(
    isLoadingDocument,
    DOCX_LOADING_INDICATOR_DELAY_MS
  )
  const loadingState = (
    <ViewerLoadingSurface showSpinner={shouldShowDocumentSpinner} />
  )
  const hasDocument = Boolean(url || uploadedDocxFile)
  const pageCount =
    hasDocument && !isLoadingDocument && !loadError
      ? Math.max(1, reportedPageCount || editor.totalPages)
      : 0
  const controlsDisabled =
    !hasDocument || isLoadingDocument || Boolean(loadError)
  const showDocumentMarkup = showComments || showTrackedChanges
  const handlePageCountChange = React.useCallback((nextPageCount: number) => {
    setReportedPageCount(Math.max(1, Math.round(nextPageCount || 1)))
  }, [])
  const setViewportRef = React.useCallback((element: HTMLDivElement | null) => {
    viewportRef.current = element
    setViewportElement(element)
  }, [])
  const pageVirtualization = React.useMemo(
    () => ({
      enabled: true,
      overscan: 1,
      scrollElement: viewportElement,
      zoomScale: zoomScale / 100,
    }),
    [viewportElement, zoomScale]
  )
  const handleDownload = React.useCallback(async () => {
    if (isPreparingDownload) return
    if (!uploadedDocxFile && !url) return

    setIsPreparingDownload(true)

    try {
      await downloadDocxFile({
        file: uploadedDocxFile?.file,
        fileName: displayFileName,
        url,
      })
    } catch (error) {
      console.error(error)
    } finally {
      setIsPreparingDownload(false)
    }
  }, [displayFileName, isPreparingDownload, uploadedDocxFile, url])
  const handleShowDocumentMarkupChange = React.useCallback(
    (checked: boolean) => {
      setShowComments(checked)
      setShowTrackedChanges(checked)
    },
    [setShowComments, setShowTrackedChanges]
  )

  useSuppressDocxPaddingWarning(!isLoadingDocument && !loadError)

  React.useEffect(() => {
    setZoomScale(resolvedDefaultZoomScale)
    setActivePage(1)
    viewportRef.current?.scrollTo({ top: 0, left: 0 })
  }, [resolvedDefaultZoomScale, url])

  React.useEffect(() => {
    setDocumentTheme(effectiveIsDark ? "dark" : "light")
  }, [effectiveIsDark, setDocumentTheme])

  React.useEffect(() => {
    if (
      status.startsWith("Failed to load file") ||
      status === "Only .docx files are supported"
    ) {
      setLoadError(status)
      setIsLoadingDocument(false)
    }
  }, [status])

  // Imports mutate the shared editor instance; concurrent calls (effect
  // re-runs, StrictMode double-invoke) race inside the parser and surface as
  // bogus "Invalid DOCX ZIP" errors, so every import is chained through here.
  const importQueueRef = React.useRef<Promise<void>>(Promise.resolve())

  React.useEffect(() => {
    let isCurrent = true

    async function load() {
      // Superseded while queued — let the newest import run instead.
      if (!isCurrent) return
      if (!uploadedDocxFile && !url) {
        setIsLoadingDocument(false)
        setLoadError(undefined)
        setReportedPageCount(0)
        return
      }

      setIsLoadingDocument(true)
      setLoadError(undefined)
      setReportedPageCount(0)

      try {
        const docxFile =
          uploadedDocxFile?.file ??
          (url ? await loadDocxFile(url, displayFileName) : null)
        if (!docxFile) return
        await importDocxFile(docxFile)

        if (isCurrent) {
          setIsLoadingDocument(false)
          setActivePage(1)
          viewportRef.current?.scrollTo({ top: 0, left: 0 })
        }
      } catch (error) {
        if (isCurrent) {
          setLoadError(
            error instanceof Error ? error.message : "Unknown DOCX load error"
          )
          setIsLoadingDocument(false)
        }
      }
    }

    importQueueRef.current = importQueueRef.current.then(load)

    return () => {
      isCurrent = false
    }
  }, [displayFileName, importDocxFile, uploadedDocxFile, url])

  React.useEffect(() => {
    if (url) {
      setUploadedDocxFile(null)
    }
  }, [url])

  const updateActivePageFromViewport = React.useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport || !pageCount) return

    const viewportRect = viewport.getBoundingClientRect()
    const viewportCenter = viewportRect.top + viewportRect.height / 2
    let closestPage = 1
    let closestDistance = Number.POSITIVE_INFINITY

    viewport
      .querySelectorAll<HTMLElement>(
        '[data-docx-page-wrapper="true"][data-index]'
      )
      .forEach((page) => {
        const pageIndex = Number(page.dataset.index)
        if (!Number.isFinite(pageIndex)) return

        const pageRect = page.getBoundingClientRect()
        const pageCenter = pageRect.top + pageRect.height / 2
        const distance = Math.abs(pageCenter - viewportCenter)

        if (distance < closestDistance) {
          closestDistance = distance
          closestPage = pageIndex + 1
        }
      })

    setActivePage((currentPage) =>
      currentPage === closestPage ? currentPage : closestPage
    )
  }, [pageCount])

  React.useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || !pageCount) return

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
  }, [pageCount, updateActivePageFromViewport])

  const scrollToPage = React.useCallback(
    (pageNumber: number) => {
      const viewport = viewportRef.current
      const targetPageIndex = pageNumber - 1
      const page = viewport?.querySelector<HTMLElement>(
        `[data-docx-page-wrapper="true"][data-index="${targetPageIndex}"]`
      )

      setActivePage(pageNumber)

      if (!viewport) return

      if (!page) {
        const pageStridePx =
          (pageLayout.pageHeightPx + pageLayout.viewportDefaults.pageGapPx) *
          (zoomScale / 100)

        viewport.scrollTo({
          top: Math.max(0, targetPageIndex * pageStridePx - 24),
          behavior: "auto",
        })
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
    },
    [pageLayout.pageHeightPx, pageLayout.viewportDefaults.pageGapPx, zoomScale]
  )

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) return

    setZoomScale(resolvedDefaultZoomScale)
    setActivePage(1)
    setReportedPageCount(0)
    setUploadedDocxFile({
      file,
      identity: `${file.name}-${file.size}-${file.lastModified}`,
    })
  }

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
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={handleUpload}
      />
      {showToolbar ? (
        <DocxToolbar
          activePage={activePage}
          controlsDisabled={controlsDisabled}
          isDark={effectiveIsDark}
          isPreparingDownload={isPreparingDownload}
          onDownload={handleDownload}
          onIsDarkChange={setNightRenderEnabled}
          onPageChange={scrollToPage}
          onShowDocumentMarkupChange={handleShowDocumentMarkupChange}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
          onUploadClick={() => fileInputRef.current?.click()}
          pageCount={pageCount}
          setZoomScale={setZoomScale}
          showDocumentMarkup={showDocumentMarkup}
          showDownloadButton={showDownload}
          showNightRenderToggle={shouldRenderNightMode}
          showUploadButton={showUpload}
          toolbarActions={toolbarActions}
          zoomScale={zoomScale}
        />
      ) : null}
      <div
        ref={viewerShellRef}
        className="relative flex min-h-0 flex-1 overflow-hidden bg-muted/30"
      >
        <DocumentViewerThumbnailSidebar
          inline={sidebarInline}
          open={Boolean(sidebarOpen && (pageCount || isLoadingDocument))}
        >
          <DocxThumbnailSidebarList
            activePage={activePage}
            displayFileName={displayFileName}
            isLoadingDocument={isLoadingDocument}
            onSelectPage={scrollToPage}
            pageCount={pageCount}
            sidebarOpen={sidebarOpen}
            thumbnails={thumbnails}
          />
        </DocumentViewerThumbnailSidebar>
        <ScrollArea
          className="min-h-0 flex-1"
          style={{ backgroundColor: viewerBackgroundColor }}
          viewportClassName="px-4 py-6"
          viewportRef={setViewportRef}
        >
          {!url && !uploadedDocxFile ? (
            <div className="grid h-full min-h-96 place-items-center p-6 text-center">
              <div className="max-w-md rounded-lg border bg-background p-4 text-sm shadow-xs">
                <div className="font-medium">Upload a DOCX to preview</div>
                <div className="mt-1 text-muted-foreground">
                  Pass a DOCX URL with the <code>src</code> prop or upload a
                  file.
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <HugeiconsIcon icon={Upload01Icon} className="size-4" />
                  Upload DOCX
                </Button>
              </div>
            </div>
          ) : loadError ? (
            <div className="grid h-full min-h-96 place-items-center p-6 text-center">
              <div className="max-w-md rounded-lg border bg-background p-4 text-sm text-destructive shadow-xs">
                <div className="font-medium">Unable to display DOCX</div>
                <div className="mt-1 text-muted-foreground">{loadError}</div>
              </div>
            </div>
          ) : isLoadingDocument ? (
            loadingState
          ) : (
            <div className="mx-auto flex min-h-full justify-center">
              <div
                className={cn(
                  "origin-top",
                  effectiveIsDark && "docx-night-reader-shell"
                )}
                style={{ zoom: zoomScale / 100 }}
              >
                <DocxEditorViewer
                  editor={editor}
                  mode="read-only"
                  showTrackedChanges={showTrackedChanges}
                  showComments={showComments}
                  loadingState={loadingState}
                  pageBackgroundColor={effectiveIsDark ? "#0a0a0a" : undefined}
                  pageGapBackgroundColor={viewerBackgroundColor}
                  pageVirtualization={pageVirtualization}
                  deferInitialPaginationPaint={false}
                  onPageCountChange={handlePageCountChange}
                />
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
