"use client"

import * as React from "react"
import {
  DocxEditorViewer,
  useDocxEditor,
  useDocxViewerThumbnails,
  type DocxEditorController,
} from "@extend-ai/react-docx"
import {
  useXlsxViewerController,
  useXlsxViewerThumbnails,
  XlsxViewerProvider,
} from "@extend-ai/react-xlsx"
import type * as ReactPdf from "react-pdf"

import { withUiBasePath } from "@/lib/zone-path"
import { Button } from "@/components/ui/button"
import {
  FileThumbnail,
  type ThumbnailFile,
} from "@/components/ui/file-thumbnail"
import {
  DocsSourceCodeBlock,
  DocsViewCodeBlock,
} from "@/components/docs-code-block"

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
const DOCX_THUMBNAIL_WIDTH = 240
const XLSX_THUMBNAIL_WIDTH = 520

type ReactPdfModule = typeof ReactPdf

type DemoFileKind = "image" | "pdf" | "docx" | "xlsx"

type DemoFile = ThumbnailFile & {
  description: string
  kind: DemoFileKind
  url: string
}

type DocxThumbnailRenderState = {
  aspectRatio: number
  isMounted: boolean
  pixelHeightPx: number
  pixelWidthPx: number
  status: string
}

export const SAMPLE_FILES: DemoFile[] = [
  {
    name: "invoice-preview.png",
    type: "image/png",
    description: "Image",
    kind: "image",
    url: withUiBasePath("/opengraph-image.png"),
  },
  {
    name: "attention.pdf",
    type: "application/pdf",
    description: "PDF",
    kind: "pdf",
    url: withUiBasePath("/samples/attention.pdf"),
  },
  {
    name: "demo.docx",
    type: DOCX_MIME_TYPE,
    description: "DOCX",
    kind: "docx",
    url: withUiBasePath("/samples/demo.docx"),
  },
  {
    name: "crazy-chart-zoo.xlsx",
    type: XLSX_MIME_TYPE,
    description: "XLSX",
    kind: "xlsx",
    url: withUiBasePath("/samples/crazy-chart-zoo.xlsx"),
  },
]

function getPdfWorkerUrl(pdfjsVersion: string) {
  return `//unpkg.com/pdfjs-dist@${pdfjsVersion}/legacy/build/pdf.worker.min.mjs`
}

async function fetchFile(file: DemoFile) {
  const response = await fetch(file.url)

  if (!response.ok) {
    throw new Error(`Failed to fetch ${file.name} (${response.status})`)
  }

  const blob = await response.blob()

  return new File([blob], file.name, {
    type: blob.type || file.type,
  })
}

export function getFileKindLabel(file: ThumbnailFile) {
  if (file.type.startsWith("image/")) return "Image"
  if (file.type === "application/pdf") return "PDF"
  if (file.name.endsWith(".docx")) return "DOCX"
  if (file.name.endsWith(".xlsx")) return "XLSX"

  return "File"
}

function ImageThumbnailPreview({
  file,
  previewAspectRatio,
}: {
  file: DemoFile
  previewAspectRatio?: number
}) {
  return (
    <FileThumbnail
      file={file}
      previewImageUrl={file.url}
      previewAspectRatio={previewAspectRatio}
      previewClassName="bg-background"
    />
  )
}

function PdfThumbnailPreview({
  file,
  previewAspectRatio,
}: {
  file: DemoFile
  previewAspectRatio?: number
}) {
  const [reactPdf, setReactPdf] = React.useState<ReactPdfModule | null>(null)
  const [isReady, setIsReady] = React.useState(false)
  const [hasError, setHasError] = React.useState(false)

  React.useEffect(() => {
    let isMounted = true

    void import("react-pdf")
      .then((module) => {
        module.pdfjs.GlobalWorkerOptions.workerSrc = getPdfWorkerUrl(
          module.pdfjs.version
        )

        if (isMounted) {
          setReactPdf(module)
        }
      })
      .catch(() => {
        if (isMounted) {
          setHasError(true)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <FileThumbnail
      file={file}
      previewAspectRatio={previewAspectRatio ?? 0.77}
      previewClassName="bg-white"
      previewContent={
        reactPdf && !hasError ? (
          <reactPdf.Document
            file={file.url}
            loading={null}
            error={null}
            onLoadError={() => setHasError(true)}
          >
            <reactPdf.Thumbnail
              pageNumber={1}
              width={DOCX_THUMBNAIL_WIDTH}
              loading={null}
              error={null}
              onRenderSuccess={() => setIsReady(true)}
              onRenderError={() => setHasError(true)}
              className="flex size-full items-center justify-center [&_.react-pdf__Thumbnail__page]:!m-0 [&_.react-pdf__Thumbnail__page]:!h-auto [&_.react-pdf__Thumbnail__page]:!w-full [&_.react-pdf__Thumbnail__page]:overflow-hidden [&_canvas]:!h-auto [&_canvas]:!w-full"
            />
          </reactPdf.Document>
        ) : null
      }
      isLoading={!isReady && !hasError}
      hasError={hasError}
    />
  )
}

function DocxThumbnailPreview({
  file,
  previewAspectRatio,
}: {
  file: DemoFile
  previewAspectRatio?: number
}) {
  const editor = useDocxEditor({
    initialDocumentTheme: "light",
    initialFileName: file.name,
  })
  const { importDocxFile } = editor
  const [isLoading, setIsLoading] = React.useState(true)
  const [hasError, setHasError] = React.useState(false)
  const thumbnailEditor = React.useMemo<DocxEditorController>(
    () => ({
      ...editor,
      totalPages: Math.max(editor.totalPages, 1),
    }),
    [editor]
  )
  const { thumbnails } = useDocxViewerThumbnails(
    thumbnailEditor,
    React.useMemo(
      () => ({
        pixelRatio: 2,
        resolution: {
          maxHeight: DOCX_THUMBNAIL_WIDTH * 1.35,
          maxWidth: DOCX_THUMBNAIL_WIDTH,
        },
      }),
      []
    )
  )
  const firstThumbnail = thumbnails[0]
  const docxCanvasRef =
    React.useRef<React.RefCallback<HTMLCanvasElement> | null>(null)
  const [thumbnailRenderState, setThumbnailRenderState] =
    React.useState<DocxThumbnailRenderState | null>(null)
  const attachDocxThumbnailCanvas = React.useCallback(
    (canvas: HTMLCanvasElement | null) => {
      docxCanvasRef.current?.(canvas)
    },
    []
  )

  React.useEffect(() => {
    let isCurrent = true

    setIsLoading(true)
    setHasError(false)

    void fetchFile(file)
      .then((docxFile) => importDocxFile(docxFile))
      .then(() => {
        if (isCurrent) {
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (isCurrent) {
          setIsLoading(false)
          setHasError(true)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [file, importDocxFile])

  React.useEffect(() => {
    if (!firstThumbnail) {
      docxCanvasRef.current = null
      setThumbnailRenderState(null)
      return
    }

    docxCanvasRef.current = firstThumbnail.canvasRef
    setThumbnailRenderState({
      aspectRatio: firstThumbnail.aspectRatio,
      isMounted: firstThumbnail.isMounted,
      pixelHeightPx: firstThumbnail.pixelHeightPx,
      pixelWidthPx: firstThumbnail.pixelWidthPx,
      status: firstThumbnail.status,
    })
  }, [firstThumbnail])

  const thumbnailIsLoading =
    isLoading ||
    (!thumbnailRenderState && !hasError) ||
    Boolean(
      thumbnailRenderState &&
        !thumbnailRenderState.isMounted &&
        thumbnailRenderState.status !== "ready" &&
        thumbnailRenderState.status !== "error"
    )
  const thumbnailHasError = hasError || thumbnailRenderState?.status === "error"

  return (
    <>
      <FileThumbnail
        file={file}
        previewAspectRatio={
          previewAspectRatio ?? thumbnailRenderState?.aspectRatio ?? 0.77
        }
        previewClassName="bg-white"
        previewContent={
          thumbnailRenderState ? (
            <canvas
              ref={attachDocxThumbnailCanvas}
              width={thumbnailRenderState.pixelWidthPx}
              height={thumbnailRenderState.pixelHeightPx}
              className="!size-full bg-white object-cover object-top"
            />
          ) : null
        }
        isLoading={thumbnailIsLoading}
        hasError={thumbnailHasError}
      />
      {!thumbnailHasError ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed top-0 left-0 -z-10 h-[1056px] w-[816px] overflow-hidden bg-white opacity-0 [contain:layout_paint]"
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

function XlsxThumbnailPreview({
  file,
  previewAspectRatio,
}: {
  file: DemoFile
  previewAspectRatio?: number
}) {
  const [workbookBuffer, setWorkbookBuffer] =
    React.useState<ArrayBuffer | null>(null)
  const [imageUrl, setImageUrl] = React.useState<string | null>(null)
  const [hasError, setHasError] = React.useState(false)

  React.useEffect(() => {
    let isCurrent = true

    setWorkbookBuffer(null)
    setImageUrl(null)
    setHasError(false)

    void fetch(file.url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch ${file.name} (${response.status})`)
        }

        return response.arrayBuffer()
      })
      .then((buffer) => {
        if (isCurrent) {
          setWorkbookBuffer(buffer)
        }
      })
      .catch(() => {
        if (isCurrent) {
          setHasError(true)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [file])

  return (
    <>
      <FileThumbnail
        file={file}
        previewAspectRatio={previewAspectRatio ?? 11 / 7}
        previewClassName="bg-white [&>img]:object-left-top"
        previewImageUrl={imageUrl}
        isLoading={!imageUrl && !hasError}
        hasError={hasError}
      />
      {workbookBuffer && !imageUrl && !hasError ? (
        <XlsxThumbnailGenerator
          file={file}
          workbookBuffer={workbookBuffer}
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
  workbookBuffer,
}: {
  file: DemoFile
  onError: () => void
  onImageUrl: (url: string) => void
  workbookBuffer: ArrayBuffer
}) {
  const controller = useXlsxViewerController(
    React.useMemo(
      () => ({
        file: workbookBuffer,
        fileName: file.name,
        readOnly: true,
        useWorker: true,
      }),
      [file.name, workbookBuffer]
    )
  )

  return (
    <XlsxViewerProvider controller={controller}>
      <XlsxThumbnailCapture onError={onError} onImageUrl={onImageUrl} />
    </XlsxViewerProvider>
  )
}

function XlsxThumbnailCapture({
  onError,
  onImageUrl,
}: {
  onError: () => void
  onImageUrl: (url: string) => void
}) {
  const { thumbnails } = useXlsxViewerThumbnails(
    React.useMemo(
      () => ({
        includeHeaders: true,
        resolution: {
          maxHeight: XLSX_THUMBNAIL_WIDTH,
          maxWidth: XLSX_THUMBNAIL_WIDTH,
        },
      }),
      []
    )
  )
  const firstThumbnail = thumbnails[0]

  React.useEffect(() => {
    if (!firstThumbnail) return

    const canvas = document.createElement("canvas")

    canvas.width = firstThumbnail.width
    canvas.height = firstThumbnail.height

    if (!firstThumbnail.paint(canvas)) {
      onError()
      return
    }

    onImageUrl(canvas.toDataURL("image/png"))
  }, [firstThumbnail, onError, onImageUrl])

  return null
}

function FileThumbnailExample({
  className,
  file,
  previewAspectRatio,
}: {
  className?: string
  file: DemoFile
  previewAspectRatio?: number
}) {
  return (
    <div className={className}>
      {file.kind === "image" ? (
        <ImageThumbnailPreview
          file={file}
          previewAspectRatio={previewAspectRatio}
        />
      ) : null}
      {file.kind === "pdf" ? (
        <PdfThumbnailPreview
          file={file}
          previewAspectRatio={previewAspectRatio}
        />
      ) : null}
      {file.kind === "docx" ? (
        <DocxThumbnailPreview
          file={file}
          previewAspectRatio={previewAspectRatio}
        />
      ) : null}
      {file.kind === "xlsx" ? (
        <XlsxThumbnailPreview
          file={file}
          previewAspectRatio={previewAspectRatio}
        />
      ) : null}
    </div>
  )
}

export function DocumentAwareFileThumbnail({
  file,
  className,
}: {
  file: DemoFile
  className?: string
}) {
  return (
    <FileThumbnailExample
      file={file}
      className={className}
      previewAspectRatio={1}
    />
  )
}

export function FileThumbnailDemo() {
  return (
    <div
      data-slot="component-preview"
      className="group relative mt-4 mb-12 flex flex-col overflow-hidden rounded-xl border"
    >
      <div className="grid gap-6 bg-background p-6 sm:grid-cols-2 lg:grid-cols-4">
        {SAMPLE_FILES.map((file) => (
          <div key={file.name} className="space-y-2">
            <div className="text-sm font-medium">{file.description}</div>
            <FileThumbnailExample file={file} previewAspectRatio={1} />
          </div>
        ))}
      </div>
      <DocsViewCodeBlock code={fileThumbnailDemoCode} />
    </div>
  )
}

const fileThumbnailDemoCode = `"use client"

import * as React from "react"
import {
  DocxEditorViewer,
  useDocxEditor,
  useDocxViewerThumbnails,
} from "@extend-ai/react-docx"
import {
  useXlsxViewerController,
  useXlsxViewerThumbnails,
  XlsxViewerProvider,
} from "@extend-ai/react-xlsx"

import { FileThumbnail } from "@/components/ui/file-thumbnail"

export function PdfAttachmentThumbnail({ reactPdf, fileUrl }) {
  return (
    <FileThumbnail
      file={{ name: "contract.pdf", type: "application/pdf" }}
      previewAspectRatio={0.77}
      previewClassName="bg-white"
      previewContent={
        <reactPdf.Document file={fileUrl} loading={null} error={null}>
          <reactPdf.Thumbnail pageNumber={1} width={240} />
        </reactPdf.Document>
      }
    />
  )
}

export function DocxAttachmentThumbnail({ file }) {
  const editor = useDocxEditor({ initialFileName: file.name })
  const { thumbnails } = useDocxViewerThumbnails(editor, {
    pixelRatio: 2,
    resolution: { maxHeight: 324, maxWidth: 240 },
  })
  const firstThumbnail = thumbnails[0]

  React.useEffect(() => {
    void editor.importDocxFile(file)
  }, [editor, file])

  return (
    <>
      <FileThumbnail
        file={file}
        previewAspectRatio={firstThumbnail?.aspectRatio ?? 0.77}
        previewClassName="bg-white"
        previewContent={
          firstThumbnail ? (
            <canvas
              ref={firstThumbnail.canvasRef}
              width={firstThumbnail.pixelWidthPx}
              height={firstThumbnail.pixelHeightPx}
              className="!size-full bg-white object-cover object-top"
            />
          ) : null
        }
        isLoading={!firstThumbnail}
      />
      <div className="pointer-events-none fixed -z-10 opacity-0">
        <DocxEditorViewer editor={editor} mode="read-only" />
      </div>
    </>
  )
}

export function XlsxAttachmentThumbnail({ workbookBuffer }) {
  const [imageUrl, setImageUrl] = React.useState(null)
  const controller = useXlsxViewerController({
    file: workbookBuffer,
    fileName: "workbook.xlsx",
    readOnly: true,
    useWorker: true,
  })

  return (
    <XlsxViewerProvider controller={controller}>
      <XlsxThumbnailCapture onImageUrl={setImageUrl} />
      <FileThumbnail
        file={{ name: "workbook.xlsx", type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }}
        previewAspectRatio={11 / 7}
        previewClassName="bg-white [&>img]:object-left-top"
        previewImageUrl={imageUrl}
        isLoading={!imageUrl}
      />
    </XlsxViewerProvider>
  )
}

function XlsxThumbnailCapture({ onImageUrl }) {
  const { thumbnails } = useXlsxViewerThumbnails({
    includeHeaders: true,
    resolution: { maxHeight: 520, maxWidth: 520 },
  })

  React.useEffect(() => {
    const thumbnail = thumbnails[0]
    if (!thumbnail) return

    const canvas = document.createElement("canvas")
    canvas.width = thumbnail.width
    canvas.height = thumbnail.height
    if (thumbnail.paint(canvas)) {
      onImageUrl(canvas.toDataURL("image/png"))
    }
  }, [onImageUrl, thumbnails])

  return null
}`

const fileThumbnailSourceCode = `"use client"

import * as React from "react"

export type ThumbnailFile = {
  name: string
  type: string
}

export type FileThumbnailProps = {
  file: ThumbnailFile | File
  className?: string
  previewAspectRatio?: number
  previewClassName?: string
  previewContent?: React.ReactNode
  previewImageUrl?: string | null
  isLoading?: boolean
  hasError?: boolean
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
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

export function FileThumbnail({
  file: _file,
  className,
  previewAspectRatio,
  previewClassName,
  previewContent,
  previewImageUrl,
  isLoading = false,
  hasError = false,
}: FileThumbnailProps) {
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
    previewImageUrl && loadedPreviewImageUrl !== previewImageUrl && !imageFailed
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
      className={cx(
        "group overflow-hidden rounded-lg border bg-background text-foreground",
        className
      )}
    >
      <div
        className={cx(
          "relative aspect-square overflow-hidden bg-muted [contain:layout_paint]",
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
            className={cx(
              "absolute inset-0 block size-full object-cover transition-[opacity,filter] duration-[160ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              showLoading ? "opacity-0 blur-sm" : "blur-0 opacity-100"
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
            className={cx(
              "absolute inset-0 size-full transition-[opacity,filter] duration-[160ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              showLoading ? "opacity-0 blur-sm" : "blur-0 opacity-100"
            )}
          >
            {previewContent}
          </div>
        ) : null}
        {showLoading ? <FileThumbnailLoadingOverlay /> : null}
        {showFallback ? (
          <div className="absolute inset-0 bg-muted" aria-hidden="true" />
        ) : null}
      </div>
    </div>
  )
}`

export function FileThumbnailSource() {
  return (
    <DocsSourceCodeBlock
      code={fileThumbnailSourceCode}
      fileName="components/ui/file-thumbnail.tsx"
    />
  )
}
