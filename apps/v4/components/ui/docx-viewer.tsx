"use client"

import * as React from "react"
import {
  DocxEditorViewer,
  useDocxEditor,
  type DocxDocumentTheme,
} from "@extend-ai/react-docx"
import {
  Loading03Icon,
  Moon02Icon,
  MinusSignCircleIcon,
  PlusSignCircleIcon,
  Sun03Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
const DOCX_SOURCE_CACHE_LIMIT = 3
const DOCX_LOADING_INDICATOR_DELAY_MS = 300
const ZOOM_OPTIONS = [10, 25, 50, 75, 100, 125, 150, 175, 200, 400] as const
const DOCX_PADDING_WARNING_TEXT = "a style property during rerender"

const docxFileCache = new Map<string, File>()
const docxFilePromiseCache = new Map<string, Promise<File>>()

type UploadedDocxFile = {
  file: File
  identity: string
}

function getDocumentCacheKey(url: string, fileName?: string) {
  return `${url.split("?")[0] ?? url}::${fileName ?? ""}`
}

function rememberDocxFile(cacheKey: string, file: File) {
  if (docxFileCache.has(cacheKey)) {
    docxFileCache.delete(cacheKey)
  }

  docxFileCache.set(cacheKey, file)

  while (docxFileCache.size > DOCX_SOURCE_CACHE_LIMIT) {
    const oldestKey = docxFileCache.keys().next().value
    if (!oldestKey) break
    docxFileCache.delete(oldestKey)
  }
}

async function loadCachedDocxFile(
  url: string,
  displayFileName: string,
  cacheKey: string
): Promise<File> {
  const cachedFile = docxFileCache.get(cacheKey)
  if (cachedFile) return cachedFile

  const pendingRequest = docxFilePromiseCache.get(cacheKey)
  if (pendingRequest) return pendingRequest

  const nextRequest = fetch(url)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch DOCX (${response.status})`)
      }

      const blob = await response.blob()
      const docxFile = new File([blob], displayFileName, {
        type: blob.type || DOCX_MIME_TYPE,
      })

      rememberDocxFile(cacheKey, docxFile)
      return docxFile
    })
    .finally(() => {
      docxFilePromiseCache.delete(cacheKey)
    })

  docxFilePromiseCache.set(cacheKey, nextRequest)
  return nextRequest
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

function getNextZoomScale(currentZoomScale: number, direction: 1 | -1) {
  const currentIndex = ZOOM_OPTIONS.indexOf(
    currentZoomScale as (typeof ZOOM_OPTIONS)[number]
  )
  let fallbackIndex = -1

  if (direction > 0) {
    fallbackIndex = ZOOM_OPTIONS.findIndex(
      (value) => value > currentZoomScale
    )
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

function useDocumentNightRenderPreference() {
  const [nightRenderEnabled, setNightRenderEnabled] = React.useState(false)
  const [nightRenderPrefLoaded, setNightRenderPrefLoaded] =
    React.useState(false)

  React.useEffect(() => {
    const storedValue = window.localStorage.getItem("docx-night-render")
    setNightRenderEnabled(storedValue !== "false")
    setNightRenderPrefLoaded(true)
  }, [])

  const updateNightRenderEnabled = React.useCallback((checked: boolean) => {
    setNightRenderEnabled(checked)
    window.localStorage.setItem("docx-night-render", String(checked))
  }, [])

  return {
    nightRenderEnabled,
    nightRenderPrefLoaded,
    setNightRenderEnabled: updateNightRenderEnabled,
  }
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

function ViewerLoadingSurface({ showSpinner = true }: { showSpinner?: boolean }) {
  return (
    <div className="grid h-full min-h-52 place-items-center bg-transparent">
      {showSpinner ? (
        <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
      ) : null}
    </div>
  )
}

function DocxToolbar({
  isDark,
  onIsDarkChange,
  onUploadClick,
  setZoomScale,
  showNightRenderToggle,
  zoomScale,
}: {
  isDark: boolean
  onIsDarkChange: (checked: boolean) => void
  onUploadClick: () => void
  setZoomScale: React.Dispatch<React.SetStateAction<number>>
  showNightRenderToggle: boolean
  zoomScale: number
}) {
  const canZoomIn = zoomScale < ZOOM_OPTIONS[ZOOM_OPTIONS.length - 1]
  const canZoomOut = zoomScale > ZOOM_OPTIONS[0]

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
                label={isDark ? "Use light document" : "Use dark document"}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={
                    isDark ? "Use light document" : "Use dark document"
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
          >
            <SelectTrigger
              size="sm"
              className="w-[84px] min-w-[84px]"
              aria-label="Zoom level"
            >
              <SelectValue>{Math.round(zoomScale)}%</SelectValue>
            </SelectTrigger>
            <SelectContent align="end">
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
              onClick={() =>
                setZoomScale((currentZoomScale) =>
                  getNextZoomScale(currentZoomScale, 1)
                )
              }
            >
              <HugeiconsIcon icon={PlusSignCircleIcon} className="size-4" />
            </Button>
          </ToolbarTooltip>
          <Separator orientation="vertical" className="mx-1 h-4 self-center" />
          <ToolbarTooltip label="Upload DOCX">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Upload DOCX"
              onClick={onUploadClick}
            >
              <HugeiconsIcon icon={Upload01Icon} className="size-4" />
            </Button>
          </ToolbarTooltip>
        </div>
      </TooltipProvider>
    </div>
  )
}

export function DocxViewerPreview({
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
  const {
    nightRenderEnabled,
    nightRenderPrefLoaded,
    setNightRenderEnabled,
  } = useDocumentNightRenderPreference()
  const isViewerHydrated = resolvedTheme !== undefined && nightRenderPrefLoaded
  const shouldShowHydrationSpinner = useDelayedLoadingIndicator(
    !isViewerHydrated,
    DOCX_LOADING_INDICATOR_DELAY_MS
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
    <DocxViewerContent
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

function DocxViewerContent({
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
  const [uploadedDocxFile, setUploadedDocxFile] =
    React.useState<UploadedDocxFile | null>(null)
  const viewerBackgroundColor = "color-mix(in oklab, var(--muted) 40%, transparent)"
  const displayFileName = React.useMemo(
    () =>
      uploadedDocxFile?.file.name ??
      (url ? formatDocumentName(fileName, url) : fileName ?? "document.docx"),
    [fileName, uploadedDocxFile?.file.name, url]
  )
  const cacheKey = React.useMemo(
    () =>
      uploadedDocxFile?.identity ??
      (url ? getDocumentCacheKey(url, displayFileName) : "docx-empty"),
    [displayFileName, uploadedDocxFile?.identity, url]
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
  const { importDocxFile, setDocumentTheme, status } = editor
  const [zoomScale, setZoomScale] = React.useState(50)
  const [loadError, setLoadError] = React.useState<string>()
  const [isLoadingDocument, setIsLoadingDocument] = React.useState(true)
  const shouldShowDocumentSpinner = useDelayedLoadingIndicator(
    isLoadingDocument,
    DOCX_LOADING_INDICATOR_DELAY_MS
  )
  const loadingState = (
    <ViewerLoadingSurface showSpinner={shouldShowDocumentSpinner} />
  )

  useSuppressDocxPaddingWarning(!isLoadingDocument && !loadError)

  React.useEffect(() => {
    setZoomScale(50)
  }, [url])

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

  React.useEffect(() => {
    let isCurrent = true

    async function load() {
      if (!uploadedDocxFile && !url) {
        setIsLoadingDocument(false)
        setLoadError(undefined)
        return
      }

      setIsLoadingDocument(true)
      setLoadError(undefined)

      try {
        const docxFile =
          uploadedDocxFile?.file ??
          (url
            ? await loadCachedDocxFile(url, displayFileName, cacheKey)
            : null)
        if (!docxFile) return
        await importDocxFile(docxFile)

        if (isCurrent) {
          setIsLoadingDocument(false)
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

    void load()

    return () => {
      isCurrent = false
    }
  }, [cacheKey, displayFileName, importDocxFile, uploadedDocxFile, url])

  React.useEffect(() => {
    if (url) {
      setUploadedDocxFile(null)
    }
  }, [url])

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) return

    setZoomScale(50)
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
      <DocxToolbar
        isDark={effectiveIsDark}
        onIsDarkChange={setNightRenderEnabled}
        onUploadClick={() => fileInputRef.current?.click()}
        setZoomScale={setZoomScale}
        showNightRenderToggle={shouldRenderNightMode}
        zoomScale={zoomScale}
      />
      <div
        className={cn(
          "min-h-0 flex-1 overflow-auto p-4",
          rounded && "rounded-b-lg"
        )}
        style={{ backgroundColor: viewerBackgroundColor }}
      >
        {!url && !uploadedDocxFile ? (
          <div className="grid h-full min-h-96 place-items-center p-6 text-center">
            <div className="max-w-md rounded-lg border bg-background p-4 text-sm shadow-xs">
              <div className="font-medium">Upload a DOCX to preview</div>
              <div className="mt-1 text-muted-foreground">
                Pass a DOCX URL with the <code>src</code> prop or upload a file.
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
                loadingState={loadingState}
                pageBackgroundColor={effectiveIsDark ? "#0a0a0a" : undefined}
                pageGapBackgroundColor={viewerBackgroundColor}
                deferInitialPaginationPaint={false}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
