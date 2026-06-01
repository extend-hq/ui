"use client"

import * as React from "react"
import {
  DocxEditorViewer,
  useDocxEditor,
  useDocxViewerThumbnails,
} from "@extend-ai/react-docx"
import {
  useXlsxViewer,
  useXlsxViewerController,
  useXlsxViewerThumbnails,
  XlsxViewerProvider,
} from "@extend-ai/react-xlsx"
import { File01Icon, FileImageIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type * as ReactPdf from "react-pdf"

import { cn } from "@/lib/utils"

export type ThumbnailSource = string | File | Blob

export type ThumbnailFile = {
  name: string
  type: string
  size?: string | number
  source?: ThumbnailSource
  url?: string
}

export type FileThumbnailProps = {
  file: ThumbnailFile | File
  className?: string
  previewAspectRatio?: number
  previewClassName?: string
  previewContent?: React.ReactNode
  previewImageUrl?: string | null
  source?: ThumbnailSource
  thumbnailWidth?: number
  generationDelayMs?: number
  renderDocumentPreview?: boolean
  isLoading?: boolean
  hasError?: boolean
  showMetadata?: boolean
}

type NormalizedThumbnailFile = {
  name: string
  type: string
  size?: string | number
  source?: ThumbnailSource
  url?: string
}

type ReactPdfModule = typeof ReactPdf

function isBlobLike(value: unknown): value is Blob {
  return typeof Blob !== "undefined" && value instanceof Blob
}

function isFileLike(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File
}

function normalizeFile(file: ThumbnailFile | File): NormalizedThumbnailFile {
  return {
    name: file.name,
    size:
      typeof file.size === "number"
        ? formatBytes(file.size)
        : (file.size as string | undefined),
    source: isFileLike(file) ? file : (file as ThumbnailFile).source,
    type: file.type,
    url: (file as ThumbnailFile).url,
  }
}

function getThumbnailSource(
  file: NormalizedThumbnailFile,
  source?: ThumbnailSource
): ThumbnailSource | undefined {
  return source ?? file.source ?? file.url
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return undefined

  const units = ["B", "KB", "MB", "GB"]
  let value = bytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const formatted =
    value >= 10 || unitIndex === 0 ? Math.round(value) : value.toFixed(1)
  return `${formatted} ${units[unitIndex]}`
}

function isImageFile(file: NormalizedThumbnailFile) {
  return file.type.startsWith("image/")
}

function isPdfFile(file: NormalizedThumbnailFile) {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  )
}

function isDocxFile(file: NormalizedThumbnailFile) {
  return (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.toLowerCase().endsWith(".docx")
  )
}

function isXlsxFile(file: NormalizedThumbnailFile) {
  const fileName = file.name.toLowerCase()

  return (
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel" ||
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".xls")
  )
}

function FileKindIcon({ file }: { file: NormalizedThumbnailFile }) {
  const icon = isImageFile(file) ? FileImageIcon : File01Icon

  return <HugeiconsIcon icon={icon} className="size-4" />
}

function useThumbnailActivation(delayMs: number) {
  const [isActive, setIsActive] = React.useState(delayMs <= 0)

  React.useEffect(() => {
    if (delayMs <= 0) {
      setIsActive(true)
      return
    }

    setIsActive(false)
    const timeout = window.setTimeout(() => {
      setIsActive(true)
    }, delayMs)

    return () => window.clearTimeout(timeout)
  }, [delayMs])

  return isActive
}

function useObjectUrl() {
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null)

  const updateObjectUrl = React.useCallback((blob: Blob) => {
    const nextUrl = URL.createObjectURL(blob)
    setObjectUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl)
      return nextUrl
    })
  }, [])

  React.useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [objectUrl])

  return { objectUrl, updateObjectUrl }
}

function useSourceObjectUrl(source: ThumbnailSource | undefined) {
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!source || typeof source === "string") {
      setObjectUrl(null)
      return
    }

    const nextUrl = URL.createObjectURL(source)
    setObjectUrl(nextUrl)

    return () => URL.revokeObjectURL(nextUrl)
  }, [source])

  if (!source) return undefined
  return typeof source === "string" ? source : (objectUrl ?? undefined)
}

async function sourceToFile(
  source: ThumbnailSource,
  file: NormalizedThumbnailFile
) {
  if (isFileLike(source)) return source

  if (isBlobLike(source)) {
    return new File([source], file.name, {
      type: source.type || file.type,
    })
  }

  const response = await fetch(source)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${file.name} (${response.status})`)
  }

  const blob = await response.blob()

  return new File([blob], file.name, {
    type: blob.type || file.type,
  })
}

function canvasToBlob(canvas: HTMLCanvasElement | null) {
  if (!canvas) return Promise.resolve<Blob | null>(null)

  return new Promise<Blob | null>((resolve) => {
    const blobFromDataUrl = async () => {
      try {
        const dataUrl = canvas.toDataURL("image/png")
        const response = await fetch(dataUrl)
        return await response.blob()
      } catch {
        return null
      }
    }

    try {
      if (typeof canvas.toBlob === "function") {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
            return
          }

          void blobFromDataUrl().then(resolve)
        }, "image/png")
        return
      }

      void blobFromDataUrl().then(resolve)
    } catch {
      resolve(null)
    }
  })
}

function canvasHasVisiblePixels(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d")
  if (!context || canvas.width <= 0 || canvas.height <= 0) return false

  try {
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height)

    for (let index = 3; index < data.length; index += 4) {
      if (data[index] > 0) return true
    }

    return false
  } catch {
    return true
  }
}

export function FileThumbnailLoadingOverlay() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 z-10 overflow-hidden bg-muted"
    >
      <div className="absolute inset-0 bg-muted" />
      <div className="absolute inset-0 animate-pulse bg-background/55 motion-reduce:animate-none" />
    </div>
  )
}

function FileThumbnailShell({
  file,
  className,
  previewAspectRatio,
  previewClassName,
  previewContent,
  previewImageUrl,
  isLoading = false,
  hasError = false,
  showMetadata = true,
}: {
  file: NormalizedThumbnailFile
  className?: string
  previewAspectRatio?: number
  previewClassName?: string
  previewContent?: React.ReactNode
  previewImageUrl?: string | null
  isLoading?: boolean
  hasError?: boolean
  showMetadata?: boolean
}) {
  const imageRef = React.useRef<HTMLImageElement | null>(null)
  const revealFrameRef = React.useRef<number | null>(null)
  const [loadedPreviewImageUrl, setLoadedPreviewImageUrl] = React.useState<
    string | null
  >(null)
  const [failedPreviewImageUrl, setFailedPreviewImageUrl] = React.useState<
    string | null
  >(null)
  const imageFailed = Boolean(
    previewImageUrl && failedPreviewImageUrl === previewImageUrl
  )
  const isImageLoading = Boolean(
    previewImageUrl &&
      loadedPreviewImageUrl !== previewImageUrl &&
      !imageFailed
  )
  const showLoading = isLoading || isImageLoading
  const hasPreviewContent = Boolean(previewContent)
  const showFallback =
    !showLoading &&
    (hasError || imageFailed || (!previewImageUrl && !hasPreviewContent))
  const cancelImageReveal = React.useCallback(() => {
    if (revealFrameRef.current === null) return

    window.cancelAnimationFrame(revealFrameRef.current)
    revealFrameRef.current = null
  }, [])
  const markImageLoaded = React.useCallback(
    (image: HTMLImageElement, imageUrl: string | null | undefined) => {
      if (!imageUrl) return

      const didLoad = image.naturalWidth > 0 && image.naturalHeight > 0

      setFailedPreviewImageUrl(didLoad ? null : imageUrl)
      if (didLoad) {
        cancelImageReveal()
        revealFrameRef.current = window.requestAnimationFrame(() => {
          revealFrameRef.current = window.requestAnimationFrame(() => {
            setLoadedPreviewImageUrl(imageUrl)
            revealFrameRef.current = null
          })
        })
      }
    },
    [cancelImageReveal]
  )

  React.useEffect(() => {
    cancelImageReveal()

    if (previewImageUrl) return

    setLoadedPreviewImageUrl(null)
    setFailedPreviewImageUrl(null)
  }, [cancelImageReveal, previewImageUrl])

  React.useEffect(() => cancelImageReveal, [cancelImageReveal])

  React.useEffect(() => {
    const image = imageRef.current

    if (!image || !previewImageUrl) return

    if (image.complete) {
      markImageLoaded(image, previewImageUrl)
    }
  }, [markImageLoaded, previewImageUrl])

  return (
    <div
      className={cn(
        "group overflow-hidden rounded-lg border bg-background text-foreground",
        className
      )}
    >
      <div
        className={cn(
          "relative aspect-square overflow-hidden bg-muted",
          previewClassName
        )}
        style={
          previewAspectRatio
            ? { aspectRatio: String(previewAspectRatio) }
            : undefined
        }
      >
        {previewImageUrl ? (
          <img
            ref={imageRef}
            src={previewImageUrl}
            alt=""
            draggable={false}
            loading="lazy"
            decoding="async"
            className={cn(
              "size-full object-cover transition-[opacity,filter,transform] duration-[160ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              showLoading
                ? "scale-[1.01] opacity-0 blur-sm"
                : "blur-0 scale-100 opacity-100"
            )}
            onLoad={(event) => {
              markImageLoaded(event.currentTarget, previewImageUrl)
            }}
            onError={() => {
              if (previewImageUrl) {
                cancelImageReveal()
                setFailedPreviewImageUrl(previewImageUrl)
                setLoadedPreviewImageUrl((currentUrl) =>
                  currentUrl === previewImageUrl ? null : currentUrl
                )
              }
            }}
          />
        ) : null}
        {previewContent ? (
          <div
            className={cn(
              "size-full transition-[opacity,filter,transform] duration-[160ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              showLoading
                ? "scale-[1.01] opacity-0 blur-sm"
                : "blur-0 scale-100 opacity-100"
            )}
          >
            {previewContent}
          </div>
        ) : null}
        {showLoading ? <FileThumbnailLoadingOverlay /> : null}
        {showFallback ? (
          <div className="absolute inset-0 grid place-items-center bg-muted text-muted-foreground">
            <FileKindIcon file={file} />
          </div>
        ) : null}
      </div>
      {showMetadata ? (
        <div className="flex items-center gap-2 border-t px-3 py-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
            <FileKindIcon file={file} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{file.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {file.size ?? file.type}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ImageFileThumbnail({
  className,
  file,
  hasError,
  isLoading,
  previewClassName,
  previewAspectRatio,
  showMetadata,
  source,
}: {
  className?: string
  file: NormalizedThumbnailFile
  hasError?: boolean
  isLoading?: boolean
  previewAspectRatio?: number
  previewClassName?: string
  showMetadata?: boolean
  source: ThumbnailSource
}) {
  const imageUrl = useSourceObjectUrl(source)

  return (
    <FileThumbnailShell
      file={file}
      previewImageUrl={imageUrl}
      isLoading={isLoading || !imageUrl}
      hasError={hasError}
      className={className}
      previewAspectRatio={previewAspectRatio}
      previewClassName={previewClassName}
      showMetadata={showMetadata}
    />
  )
}

function PdfFileThumbnail({
  file,
  className,
  hasError: externalHasError,
  isActive,
  isLoading: externalIsLoading,
  previewClassName,
  previewAspectRatio,
  showMetadata,
  source,
  thumbnailWidth,
}: {
  file: NormalizedThumbnailFile
  className?: string
  hasError?: boolean
  isActive: boolean
  isLoading?: boolean
  previewAspectRatio?: number
  previewClassName?: string
  showMetadata: boolean
  source: ThumbnailSource
  thumbnailWidth: number
}) {
  const sourceUrl = useSourceObjectUrl(source)
  const [reactPdf, setReactPdf] = React.useState<ReactPdfModule | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [hasError, setHasError] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const { objectUrl, updateObjectUrl } = useObjectUrl()
  const shouldRenderPdf =
    isActive && sourceUrl && reactPdf && !objectUrl && !hasError
  const capturePdfCanvas = React.useCallback(() => {
    const canvas = rootRef.current?.querySelector("canvas") ?? null

    void canvasToBlob(canvas).then((blob) => {
      if (!blob) {
        setHasError(true)
        setIsLoading(false)
        return
      }

      updateObjectUrl(blob)
      setHasError(false)
      setIsLoading(false)
    })
  }, [updateObjectUrl])

  React.useEffect(() => {
    setIsLoading(true)
    setHasError(false)
  }, [sourceUrl])

  React.useEffect(() => {
    if (!isActive || reactPdf || objectUrl) return

    let isMounted = true
    setIsLoading(true)
    setHasError(false)

    void import("react-pdf")
      .then((module) => {
        module.pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${module.pdfjs.version}/legacy/build/pdf.worker.min.mjs`
        if (isMounted) setReactPdf(module)
      })
      .catch(() => {
        if (isMounted) {
          setHasError(true)
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [isActive, objectUrl, reactPdf])

  return (
    <>
      <FileThumbnailShell
        file={file}
        previewImageUrl={objectUrl}
        isLoading={Boolean(externalIsLoading || (isLoading && !objectUrl))}
        hasError={Boolean(externalHasError || hasError)}
        className={className}
        previewAspectRatio={previewAspectRatio}
        previewClassName={previewClassName}
        showMetadata={showMetadata}
      />
      {shouldRenderPdf ? (
        <div
          ref={rootRef}
          aria-hidden="true"
          className="pointer-events-none fixed top-0 left-[-10000px] w-[560px] overflow-hidden bg-white"
        >
          <reactPdf.Document
            file={sourceUrl}
            loading={null}
            error={null}
            noData={null}
            onLoadError={() => {
              setHasError(true)
              setIsLoading(false)
            }}
          >
            <reactPdf.Thumbnail
              pageNumber={1}
              width={thumbnailWidth}
              loading={null}
              error={null}
              onRenderSuccess={() => {
                window.requestAnimationFrame(() => {
                  capturePdfCanvas()
                })
              }}
              onRenderError={() => {
                setHasError(true)
                setIsLoading(false)
              }}
            />
          </reactPdf.Document>
        </div>
      ) : null}
    </>
  )
}

function DocxFileThumbnail({
  file,
  className,
  hasError: externalHasError,
  isActive,
  isLoading: externalIsLoading,
  previewClassName,
  previewAspectRatio,
  showMetadata,
  source,
  thumbnailWidth,
}: {
  file: NormalizedThumbnailFile
  className?: string
  hasError?: boolean
  isActive: boolean
  isLoading?: boolean
  previewAspectRatio?: number
  previewClassName?: string
  showMetadata: boolean
  source: ThumbnailSource
  thumbnailWidth: number
}) {
  const editor = useDocxEditor({
    initialDocumentTheme: "light",
    initialFileName: file.name,
  })
  const thumbnailOptions = React.useMemo(
    () => ({
      pixelRatio: 2,
      resolution: {
        maxHeight: thumbnailWidth,
        maxWidth: thumbnailWidth,
      },
    }),
    [thumbnailWidth]
  )
  const { thumbnails } = useDocxViewerThumbnails(editor, thumbnailOptions)
  const firstThumbnail = thumbnails[0]
  const [hasError, setHasError] = React.useState(false)
  const [isReady, setIsReady] = React.useState(false)
  const [thumbnailSize, setThumbnailSize] = React.useState<{
    height: number
    width: number
  } | null>(null)
  const [thumbnailCanvas, setThumbnailCanvas] =
    React.useState<HTMLCanvasElement | null>(null)
  const editorRef = React.useRef(editor)
  const importedDocxKeyRef = React.useRef<string | null>(null)
  const hiddenDocxViewerRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    editorRef.current = editor
  }, [editor])

  React.useEffect(() => {
    if (!isActive) return

    const docxKey =
      typeof source === "string"
        ? `${file.name}:${source}`
        : `${file.name}:${source.size}:${source.type}`

    if (importedDocxKeyRef.current === docxKey) return

    let isCurrent = true
    importedDocxKeyRef.current = docxKey
    setHasError(false)
    setIsReady(false)

    async function loadDocx() {
      try {
        const docxFile = await sourceToFile(source, file)
        await editorRef.current.importDocxFile(docxFile)
      } catch {
        if (isCurrent && importedDocxKeyRef.current === docxKey) {
          setHasError(true)
        }
      }
    }

    void loadDocx()

    return () => {
      isCurrent = false
    }
  }, [file, isActive, source])

  React.useEffect(() => {
    if (!firstThumbnail) {
      setThumbnailSize(null)
      return
    }

    setThumbnailSize((currentSize) => {
      if (
        currentSize?.height === firstThumbnail.pixelHeightPx &&
        currentSize.width === firstThumbnail.pixelWidthPx
      ) {
        return currentSize
      }

      return {
        height: firstThumbnail.pixelHeightPx,
        width: firstThumbnail.pixelWidthPx,
      }
    })

    if (firstThumbnail?.status === "error") {
      setHasError(true)
    }
  }, [
    firstThumbnail,
    firstThumbnail?.pixelHeightPx,
    firstThumbnail?.pixelWidthPx,
    firstThumbnail?.status,
  ])

  const attachThumbnailCanvas = React.useCallback(
    (canvas: HTMLCanvasElement | null) => {
      setThumbnailCanvas(canvas)
      if (canvas) firstThumbnail?.canvasRef(canvas)
    },
    [firstThumbnail]
  )

  React.useEffect(() => {
    if (
      !isActive ||
      !firstThumbnail ||
      !thumbnailCanvas ||
      isReady ||
      hasError
    ) {
      return
    }

    let isCurrent = true
    let timeoutId: number | undefined
    let attempts = 0

    const getRenderedPageSurface = () => {
      const pageSurface = hiddenDocxViewerRef.current?.querySelector(
        '[data-docx-page-surface="true"]'
      )

      if (!pageSurface) return null

      const hasText = Boolean(pageSurface.textContent?.trim())
      const hasEmbeddedContent = Boolean(
        pageSurface.querySelector("canvas,img,svg,table")
      )

      return hasText || hasEmbeddedContent ? pageSurface : null
    }

    const checkThumbnail = () => {
      if (!isCurrent) return

      if (canvasHasVisiblePixels(thumbnailCanvas)) {
        setIsReady(true)
        return
      }

      if (!getRenderedPageSurface()) {
        attempts += 1

        if (attempts > 50) {
          setIsReady(true)
          return
        }

        timeoutId = window.setTimeout(checkThumbnail, 100)
        return
      }

      attempts += 1

      if (attempts > 50) {
        setIsReady(true)
        return
      }

      timeoutId = window.setTimeout(checkThumbnail, 100)
    }

    checkThumbnail()

    return () => {
      isCurrent = false
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }, [
    firstThumbnail,
    firstThumbnail?.isMounted,
    hasError,
    isActive,
    isReady,
    thumbnailCanvas,
  ])

  const previewContent = thumbnailSize ? (
    <canvas
      ref={attachThumbnailCanvas}
      width={thumbnailSize.width}
      height={thumbnailSize.height}
      className="!size-full bg-white object-cover object-top"
    />
  ) : null

  return (
    <>
      <FileThumbnailShell
        file={file}
        previewContent={previewContent}
        isLoading={Boolean(externalIsLoading || (!isReady && !hasError))}
        hasError={Boolean(externalHasError || hasError)}
        className={className}
        previewAspectRatio={previewAspectRatio}
        previewClassName={cn("bg-white", previewClassName)}
        showMetadata={showMetadata}
      />
      {isActive && !hasError ? (
        <div
          ref={hiddenDocxViewerRef}
          aria-hidden="true"
          className="pointer-events-none fixed top-[100vh] left-0 -z-10 h-[1056px] w-[816px] overflow-hidden bg-white"
        >
          <div className="w-[816px]">
            <DocxEditorViewer
              editor={editor}
              mode="read-only"
              pageBackgroundColor="#ffffff"
              pageGapBackgroundColor="transparent"
              visiblePageRange={{ endPageIndex: 0, startPageIndex: 0 }}
              pageVirtualization={{ enabled: false }}
              deferInitialPaginationPaint={false}
            />
          </div>
        </div>
      ) : null}
    </>
  )
}

function XlsxFileThumbnail({
  file,
  className,
  hasError: externalHasError,
  isActive,
  isLoading: externalIsLoading,
  previewClassName,
  previewAspectRatio,
  showMetadata,
  source,
  thumbnailWidth,
}: {
  file: NormalizedThumbnailFile
  className?: string
  hasError?: boolean
  isActive: boolean
  isLoading?: boolean
  previewAspectRatio?: number
  previewClassName?: string
  showMetadata: boolean
  source: ThumbnailSource
  thumbnailWidth: number
}) {
  const sourceUrl = useSourceObjectUrl(source)
  const [imageUrl, setImageUrl] = React.useState<string | null>(null)
  const [hasError, setHasError] = React.useState(false)

  React.useEffect(() => {
    setImageUrl(null)
    setHasError(false)
  }, [sourceUrl])

  return (
    <>
      <FileThumbnailShell
        file={file}
        previewImageUrl={imageUrl}
        isLoading={Boolean(externalIsLoading || (!imageUrl && !hasError))}
        hasError={Boolean(externalHasError || hasError)}
        className={className}
        previewAspectRatio={previewAspectRatio}
        previewClassName={cn(
          "bg-white [&>img]:object-left-top",
          previewClassName
        )}
        showMetadata={showMetadata}
      />
      {isActive && sourceUrl && !imageUrl && !hasError ? (
        <XlsxThumbnailGenerator
          file={file}
          sourceUrl={sourceUrl}
          thumbnailWidth={thumbnailWidth}
          onError={() => setHasError(true)}
          onImageUrl={setImageUrl}
        />
      ) : null}
    </>
  )
}

function XlsxThumbnailGenerator({
  file,
  onError,
  onImageUrl,
  sourceUrl,
  thumbnailWidth,
}: {
  file: NormalizedThumbnailFile
  onError: () => void
  onImageUrl: (url: string) => void
  sourceUrl: string
  thumbnailWidth: number
}) {
  const controller = useXlsxViewerController(
    React.useMemo(
      () => ({
        fileName: file.name,
        readOnly: true,
        src: sourceUrl,
        useWorker: true,
      }),
      [file.name, sourceUrl]
    )
  )

  return (
    <XlsxViewerProvider controller={controller}>
      <XlsxThumbnailGeneratorContent
        thumbnailWidth={thumbnailWidth}
        onError={onError}
        onImageUrl={onImageUrl}
      />
    </XlsxViewerProvider>
  )
}

function XlsxThumbnailGeneratorContent({
  onError,
  onImageUrl,
  thumbnailWidth,
}: {
  onError: () => void
  onImageUrl: (url: string) => void
  thumbnailWidth: number
}) {
  const controller = useXlsxViewer()
  const thumbnailOptions = React.useMemo(
    () => ({
      includeHeaders: true,
      resolution: {
        maxHeight: thumbnailWidth,
        maxWidth: thumbnailWidth,
      },
    }),
    [thumbnailWidth]
  )
  const { thumbnails } = useXlsxViewerThumbnails(thumbnailOptions)
  const firstThumbnail = thumbnails[0]

  React.useEffect(() => {
    if (controller.error) {
      onError()
      return
    }

    if (!firstThumbnail) return

    const canvas = document.createElement("canvas")

    if (!firstThumbnail.paint(canvas)) return

    onImageUrl(canvas.toDataURL("image/png"))
  }, [controller.error, firstThumbnail, onError, onImageUrl])

  return null
}

export function FileThumbnail({
  file: rawFile,
  className,
  previewAspectRatio,
  previewClassName,
  previewContent,
  previewImageUrl,
  source: explicitSource,
  thumbnailWidth,
  generationDelayMs = 0,
  renderDocumentPreview = true,
  isLoading = false,
  hasError = false,
  showMetadata = true,
}: FileThumbnailProps) {
  const file = React.useMemo(() => normalizeFile(rawFile), [rawFile])
  const source = getThumbnailSource(file, explicitSource)
  const isActive = useThumbnailActivation(generationDelayMs)

  if (previewImageUrl || previewContent || !renderDocumentPreview || !source) {
    return (
      <FileThumbnailShell
        file={file}
        previewImageUrl={previewImageUrl}
        previewContent={previewContent}
        isLoading={isLoading}
        hasError={hasError}
        className={className}
        previewAspectRatio={previewAspectRatio}
        previewClassName={previewClassName}
        showMetadata={showMetadata}
      />
    )
  }

  if (isImageFile(file)) {
    return (
      <ImageFileThumbnail
        file={file}
        source={source}
        isLoading={isLoading}
        hasError={hasError}
        className={className}
        previewAspectRatio={previewAspectRatio}
        previewClassName={previewClassName}
        showMetadata={showMetadata}
      />
    )
  }

  if (isPdfFile(file)) {
    return (
      <PdfFileThumbnail
        file={file}
        source={source}
        isActive={isActive}
        isLoading={isLoading}
        hasError={hasError}
        className={className}
        previewAspectRatio={previewAspectRatio}
        previewClassName={previewClassName}
        showMetadata={showMetadata}
        thumbnailWidth={thumbnailWidth ?? 520}
      />
    )
  }

  if (isDocxFile(file)) {
    return (
      <DocxFileThumbnail
        file={file}
        source={source}
        isActive={isActive}
        isLoading={isLoading}
        hasError={hasError}
        className={className}
        previewAspectRatio={previewAspectRatio}
        previewClassName={previewClassName}
        showMetadata={showMetadata}
        thumbnailWidth={thumbnailWidth ?? 520}
      />
    )
  }

  if (isXlsxFile(file)) {
    return (
      <XlsxFileThumbnail
        file={file}
        source={source}
        isActive={isActive}
        isLoading={isLoading}
        hasError={hasError}
        className={className}
        previewAspectRatio={previewAspectRatio}
        previewClassName={previewClassName}
        showMetadata={showMetadata}
        thumbnailWidth={thumbnailWidth ?? 680}
      />
    )
  }

  return (
    <FileThumbnailShell
      file={file}
      isLoading={isLoading}
      hasError={hasError}
      className={className}
      previewAspectRatio={previewAspectRatio}
      previewClassName={previewClassName}
      showMetadata={showMetadata}
    />
  )
}
