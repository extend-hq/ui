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
import type * as ReactPdf from "react-pdf"

import { Button } from "@/components/ui/button"
import {
  FileThumbnail,
  type ThumbnailFile,
} from "@/components/ui/file-thumbnail"
import { HighlightedCodeBlock } from "@/components/highlighted-code-block"

export type DemoFile = ThumbnailFile & {
  url: string
}

type ReactPdfModule = typeof ReactPdf

export const SAMPLE_FILES: DemoFile[] = [
  {
    name: "attention.pdf",
    type: "application/pdf",
    url: "/samples/attention.pdf",
    size: "15 pages",
  },
  {
    name: "demo.docx",
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    url: "/samples/demo.docx",
    size: "DOCX",
  },
  {
    name: "crazy-chart-zoo.xlsx",
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    url: "/samples/crazy-chart-zoo.xlsx",
    size: "XLSX",
  },
  {
    name: "opengraph-image.png",
    type: "image/png",
    url: "/opengraph-image.png",
    size: "1200 x 630",
  },
]

function isPdfFile(file: DemoFile) {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  )
}

function isImageFile(file: DemoFile) {
  return file.type.startsWith("image/")
}

function isDocxFile(file: DemoFile) {
  return (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.toLowerCase().endsWith(".docx")
  )
}

function isXlsxFile(file: DemoFile) {
  const fileName = file.name.toLowerCase()

  return (
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel" ||
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".xls")
  )
}

export function getFileKindLabel(file: DemoFile) {
  if (isPdfFile(file)) return "PDF"
  if (isImageFile(file)) return "Image"
  if (isDocxFile(file)) return "DOCX"
  if (isXlsxFile(file)) return "XLSX"

  return "File"
}

function getThumbnailFile(file: DemoFile): ThumbnailFile {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    url: file.url,
  }
}

function useThumbnailActivation(delayMs: number) {
  const [isActive, setIsActive] = React.useState(false)

  React.useEffect(() => {
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

function canvasToBlob(canvas: HTMLCanvasElement | null) {
  if (!canvas) return Promise.resolve<Blob | null>(null)

  const blobFromDataUrl = () => {
    if (typeof canvas.toDataURL !== "function") return Promise.resolve(null)

    return fetch(canvas.toDataURL("image/png"))
      .then((response) => response.blob())
      .catch(() => null)
  }

  return new Promise<Blob | null>((resolve) => {
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

export function DocumentAwareFileThumbnail({
  file,
  className,
  generationDelayMs = 0,
  showMetadata = false,
}: {
  file: DemoFile
  className?: string
  generationDelayMs?: number
  showMetadata?: boolean
}) {
  return (
    <FileThumbnail
      file={getThumbnailFile(file)}
      source={file.url}
      generationDelayMs={generationDelayMs}
      thumbnailWidth={isXlsxFile(file) ? 680 : 520}
      className={className}
      showMetadata={showMetadata}
    />
  )
}

function PdfFileThumbnail({
  file,
  className,
  isActive,
  showMetadata,
  thumbnailWidth,
}: {
  file: DemoFile
  className?: string
  isActive: boolean
  showMetadata: boolean
  thumbnailWidth: number
}) {
  const [reactPdf, setReactPdf] = React.useState<ReactPdfModule | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [hasError, setHasError] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const { objectUrl, updateObjectUrl } = useObjectUrl()
  const shouldRenderPdf = isActive && reactPdf && !objectUrl && !hasError
  const capturePdfCanvas = React.useCallback(() => {
    const canvas = rootRef.current?.querySelector("canvas") ?? null

    void canvasToBlob(canvas).then((blob) => {
      if (!blob) return

      updateObjectUrl(blob)
      setHasError(false)
      setIsLoading(false)
    })
  }, [updateObjectUrl])

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
      <FileThumbnail
        file={getThumbnailFile(file)}
        previewImageUrl={objectUrl}
        isLoading={isLoading && !objectUrl}
        hasError={hasError}
        className={className}
        showMetadata={showMetadata}
      />
      {shouldRenderPdf ? (
        <div
          ref={rootRef}
          aria-hidden="true"
          className="pointer-events-none fixed top-0 left-[-10000px] w-[560px] overflow-hidden bg-white"
        >
          <reactPdf.Document
            file={file.url}
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
  isActive,
  showMetadata,
  thumbnailWidth,
}: {
  file: DemoFile
  className?: string
  isActive: boolean
  showMetadata: boolean
  thumbnailWidth: number
}) {
  if (!isActive) {
    return (
      <FileThumbnail
        file={getThumbnailFile(file)}
        isLoading
        className={className}
        showMetadata={showMetadata}
      />
    )
  }

  return (
    <DocxFileThumbnailContent
      file={file}
      className={className}
      showMetadata={showMetadata}
      thumbnailWidth={thumbnailWidth}
    />
  )
}

function DocxFileThumbnailContent({
  className,
  file,
  showMetadata,
  thumbnailWidth,
}: {
  className?: string
  file: DemoFile
  showMetadata: boolean
  thumbnailWidth: number
}) {
  const editor = useDocxEditor({
    initialDocumentTheme: "light",
    initialFileName: file.name,
  })
  const { thumbnails } = useDocxViewerThumbnails(editor, {
    pixelRatio: 2,
    resolution: {
      maxHeight: thumbnailWidth,
      maxWidth: thumbnailWidth,
    },
  })
  const firstThumbnail = thumbnails[0]
  const [hasError, setHasError] = React.useState(false)
  const [isReady, setIsReady] = React.useState(false)
  const editorRef = React.useRef(editor)
  const importedDocxKeyRef = React.useRef<string | null>(null)
  editorRef.current = editor

  React.useEffect(() => {
    const docxKey = `${file.name}:${file.url}`

    if (importedDocxKeyRef.current === docxKey) return

    let isCurrent = true
    importedDocxKeyRef.current = docxKey
    setHasError(false)
    setIsReady(false)

    async function loadDocx() {
      try {
        const response = await fetch(file.url)
        if (!response.ok) {
          throw new Error(`Failed to fetch DOCX (${response.status})`)
        }

        const blob = await response.blob()
        const docxFile = new File([blob], file.name, {
          type:
            blob.type ||
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        })
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
  }, [file.name, file.url])

  React.useEffect(() => {
    if (firstThumbnail?.status === "ready") {
      setIsReady(true)
    } else if (firstThumbnail?.status === "error") {
      setHasError(true)
    }
  }, [firstThumbnail?.status])

  const previewContent = firstThumbnail ? (
    <canvas
      ref={firstThumbnail.canvasRef}
      width={firstThumbnail.pixelWidthPx}
      height={firstThumbnail.pixelHeightPx}
      className="!size-full bg-white object-cover object-top"
    />
  ) : null

  return (
    <>
      <FileThumbnail
        file={getThumbnailFile(file)}
        previewContent={previewContent}
        isLoading={!isReady && !hasError}
        hasError={hasError}
        className={className}
        previewClassName="bg-white"
        showMetadata={showMetadata}
      />
      {!hasError && !isReady ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed top-0 left-[-10000px] w-[816px] overflow-hidden bg-white"
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
  isActive,
  showMetadata,
  thumbnailWidth,
}: {
  file: DemoFile
  className?: string
  isActive: boolean
  showMetadata: boolean
  thumbnailWidth: number
}) {
  const [imageUrl, setImageUrl] = React.useState<string | null>(null)
  const [hasError, setHasError] = React.useState(false)
  const handleError = React.useCallback(() => {
    setHasError(true)
  }, [])

  return (
    <>
      <FileThumbnail
        file={getThumbnailFile(file)}
        previewImageUrl={imageUrl}
        isLoading={isActive && !imageUrl && !hasError}
        hasError={hasError}
        className={className}
        previewClassName="bg-white [&>img]:object-left-top"
        showMetadata={showMetadata}
      />
      {isActive && !imageUrl && !hasError ? (
        <XlsxThumbnailGenerator
          file={file}
          thumbnailWidth={thumbnailWidth}
          onError={handleError}
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
  thumbnailWidth,
}: {
  file: DemoFile
  onError: () => void
  onImageUrl: (url: string) => void
  thumbnailWidth: number
}) {
  const controller = useXlsxViewerController(
    React.useMemo(
      () => ({
        fileName: file.name,
        readOnly: true,
        src: file.url,
        useWorker: true,
      }),
      [file.name, file.url]
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
  const { thumbnails } = useXlsxViewerThumbnails({
    includeHeaders: true,
    resolution: {
      maxHeight: thumbnailWidth,
      maxWidth: thumbnailWidth,
    },
  })
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

export function FileThumbnailDemo() {
  const [isCodeVisible, setIsCodeVisible] = React.useState(false)

  return (
    <div
      data-slot="component-preview"
      className="group relative mt-4 mb-12 flex flex-col overflow-hidden rounded-xl border"
    >
      <div className="grid gap-6 bg-background p-6 sm:grid-cols-2 lg:grid-cols-4">
        {SAMPLE_FILES.map((file) => (
          <div key={file.url} className="space-y-2">
            <div className="text-sm font-medium">{getFileKindLabel(file)}</div>
            <DocumentAwareFileThumbnail
              file={file}
              generationDelayMs={250 + SAMPLE_FILES.indexOf(file) * 300}
            />
          </div>
        ))}
      </div>
      <div
        data-slot="code"
        data-mobile-code-visible={isCodeVisible}
        className="relative overflow-hidden **:data-[slot=copy-button]:right-4 **:data-[slot=copy-button]:hidden data-[mobile-code-visible=true]:**:data-[slot=copy-button]:flex [&_[data-rehype-pretty-code-figure]]:m-0! [&_[data-rehype-pretty-code-figure]]:rounded-t-none [&_[data-rehype-pretty-code-figure]]:border-t [&_pre]:max-h-72"
      >
        {isCodeVisible ? (
          <HighlightedCodeBlock
            code={fileThumbnailDemoCode}
            className="rounded-none border-x-0 border-b-0"
          />
        ) : (
          <div className="relative">
            <HighlightedCodeBlock
              code={fileThumbnailDemoCode}
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

const fileThumbnailDemoCode = `"use client"

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
import type * as ReactPdf from "react-pdf"

import {
  FileThumbnail,
  type ThumbnailFile,
} from "@/components/ui/file-thumbnail"

type DemoFile = ThumbnailFile & {
  url: string
}

type ReactPdfModule = typeof ReactPdf

function toThumbnailFile(file: DemoFile): ThumbnailFile {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
  }
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

function canvasToBlob(canvas: HTMLCanvasElement | null) {
  if (!canvas) return Promise.resolve<Blob | null>(null)

  return new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), "image/png")
    } catch {
      resolve(null)
    }
  })
}

function PdfThumbnail({ file }: { file: DemoFile }) {
  const [reactPdf, setReactPdf] = React.useState<ReactPdfModule | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [hasError, setHasError] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const { objectUrl, updateObjectUrl } = useObjectUrl()

  React.useEffect(() => {
    let isMounted = true

    void import("react-pdf")
      .then((module) => {
        module.pdfjs.GlobalWorkerOptions.workerSrc = \`https://unpkg.com/pdfjs-dist@\${module.pdfjs.version}/legacy/build/pdf.worker.min.mjs\`
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
  }, [])

  return (
    <>
      <FileThumbnail
        file={toThumbnailFile(file)}
        previewImageUrl={objectUrl}
        isLoading={isLoading}
        hasError={hasError}
        showMetadata={false}
      />
      {reactPdf ? (
        <div
          ref={rootRef}
          aria-hidden="true"
          className="pointer-events-none fixed top-0 left-[-10000px] w-[300px] overflow-hidden bg-white"
        >
          <reactPdf.Document file={file.url} loading={null}>
            <reactPdf.Thumbnail
              pageNumber={1}
              width={260}
              loading={null}
              onRenderSuccess={() => {
                window.requestAnimationFrame(() => {
                  const canvas = rootRef.current?.querySelector("canvas")
                  void canvasToBlob(canvas).then((blob) => {
                    if (!blob) {
                      setHasError(true)
                      setIsLoading(false)
                      return
                    }

                    updateObjectUrl(blob)
                    setIsLoading(false)
                  })
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

function DocxThumbnail({ file }: { file: DemoFile }) {
  const editor = useDocxEditor({
    initialDocumentTheme: "light",
    initialFileName: file.name,
  })
  const { thumbnails } = useDocxViewerThumbnails(editor, {
    pixelRatio: 2,
    resolution: { maxHeight: 520, maxWidth: 520 },
  })
  const firstThumbnail = thumbnails[0]
  const [isLoading, setIsLoading] = React.useState(true)
  const [hasError, setHasError] = React.useState(false)
  const editorRef = React.useRef(editor)
  const importedDocxKeyRef = React.useRef<string | null>(null)
  editorRef.current = editor

  React.useEffect(() => {
    const docxKey = \`\${file.name}:\${file.url}\`

    if (importedDocxKeyRef.current === docxKey) return

    let isCurrent = true
    importedDocxKeyRef.current = docxKey
    setIsLoading(true)
    setHasError(false)

    async function loadDocx() {
      try {
        const response = await fetch(file.url)
        const blob = await response.blob()
        await editorRef.current.importDocxFile(new File([blob], file.name))
      } catch {
        if (isCurrent && importedDocxKeyRef.current === docxKey) {
          setHasError(true)
          setIsLoading(false)
        }
      }
    }

    void loadDocx()

    return () => {
      isCurrent = false
    }
  }, [file.name, file.url])

  React.useEffect(() => {
    if (firstThumbnail?.status === "ready") {
      setIsLoading(false)
    } else if (firstThumbnail?.status === "error") {
      setHasError(true)
      setIsLoading(false)
    }
  }, [firstThumbnail?.status])

  const previewContent = firstThumbnail ? (
    <canvas
      ref={firstThumbnail.canvasRef}
      width={firstThumbnail.pixelWidthPx}
      height={firstThumbnail.pixelHeightPx}
      className="!size-full bg-white object-cover object-top"
    />
  ) : null

  return (
    <>
      <FileThumbnail
        file={toThumbnailFile(file)}
        previewContent={previewContent}
        isLoading={isLoading}
        hasError={hasError}
        previewClassName="bg-white"
        showMetadata={false}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-[-10000px] w-[816px] overflow-hidden bg-white"
      >
        <div className="w-[816px]">
          <DocxEditorViewer editor={editor} mode="read-only" />
        </div>
      </div>
    </>
  )
}

function XlsxThumbnail({ file }: { file: DemoFile }) {
  const controller = useXlsxViewerController(
    React.useMemo(
      () => ({
        fileName: file.name,
        readOnly: true,
        src: file.url,
        useWorker: true,
      }),
      [file.name, file.url]
    )
  )

  return (
    <XlsxViewerProvider controller={controller}>
      <XlsxThumbnailContent file={file} />
    </XlsxViewerProvider>
  )
}

function XlsxThumbnailContent({ file }: { file: DemoFile }) {
  const controller = useXlsxViewer()
  const { thumbnails } = useXlsxViewerThumbnails({
    includeHeaders: true,
    resolution: { maxHeight: 680, maxWidth: 680 },
  })
  const firstThumbnail = thumbnails[0]
  const [imageUrl, setImageUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!firstThumbnail) return

    const canvas = document.createElement("canvas")
    canvas.width = firstThumbnail.width
    canvas.height = firstThumbnail.height

    if (firstThumbnail.paint(canvas)) {
      setImageUrl(canvas.toDataURL("image/png"))
    }
  }, [firstThumbnail])

  return (
    <FileThumbnail
      file={toThumbnailFile(file)}
      previewImageUrl={imageUrl}
      isLoading={controller.isLoading || !imageUrl}
      hasError={Boolean(controller.error)}
      previewClassName="bg-white [&>img]:object-left-top"
      showMetadata={false}
    />
  )
}`

const fileThumbnailSourceCode = `"use client"

import * as React from "react"
import { File01Icon, FileImageIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"

export type ThumbnailFile = {
  name: string
  type: string
  size?: string
}

export type FileThumbnailProps = {
  file: ThumbnailFile
  className?: string
  previewClassName?: string
  previewContent?: React.ReactNode
  previewImageUrl?: string | null
  isLoading?: boolean
  hasError?: boolean
  showMetadata?: boolean
}

function isImageFile(file: ThumbnailFile) {
  return file.type.startsWith("image/")
}

function FileKindIcon({ file }: { file: ThumbnailFile }) {
  const icon = isImageFile(file) ? FileImageIcon : File01Icon

  return <HugeiconsIcon icon={icon} className="size-4" />
}

export function FileThumbnailLoadingOverlay() {
  return (
    <div className="absolute inset-0 z-10 overflow-hidden bg-muted">
      <style>{\\\`
        @keyframes file-thumbnail-preview-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .file-thumbnail-preview-shimmer {
            animation: none !important;
            transform: translateX(0);
            opacity: 0.55;
          }
        }
      \\\`}</style>
      <div className="absolute inset-0 bg-muted" />
      <div
        className="file-thumbnail-preview-shimmer absolute inset-0 bg-linear-to-r from-transparent via-background/65 to-transparent"
        style={{
          animation:
            "file-thumbnail-preview-shimmer 1.25s ease-in-out infinite",
        }}
      />
    </div>
  )
}

export function FileThumbnail({
  file,
  className,
  previewClassName,
  previewContent,
  previewImageUrl,
  isLoading = false,
  hasError = false,
  showMetadata = true,
}: FileThumbnailProps) {
  const imageRef = React.useRef<HTMLImageElement | null>(null)
  const [isImageLoading, setIsImageLoading] = React.useState(
    Boolean(previewImageUrl)
  )
  const [imageFailed, setImageFailed] = React.useState(false)
  const showLoading = isLoading || isImageLoading
  const hasPreviewContent = Boolean(previewContent)
  const showFallback =
    hasError || imageFailed || (!previewImageUrl && !hasPreviewContent)
  const markImageLoaded = React.useCallback((image: HTMLImageElement) => {
    const didLoad = image.naturalWidth > 0 && image.naturalHeight > 0

    setImageFailed(!didLoad)
    setIsImageLoading(false)
  }, [])

  React.useEffect(() => {
    setIsImageLoading(Boolean(previewImageUrl))
    setImageFailed(false)
  }, [previewImageUrl])

  React.useEffect(() => {
    const image = imageRef.current

    if (!image || !previewImageUrl) return

    if (image.complete) {
      markImageLoaded(image)
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
      >
        {previewImageUrl ? (
          <img
            ref={imageRef}
            src={previewImageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className={cn(
              "size-full object-cover transition-[opacity,filter,transform] duration-[160ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              showLoading
                ? "scale-[1.01] opacity-0 blur-sm"
                : "blur-0 scale-100 opacity-100"
            )}
            onLoad={(event) => {
              markImageLoaded(event.currentTarget)
            }}
            onError={() => {
              setImageFailed(true)
              setIsImageLoading(false)
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
}`

export function FileThumbnailSource() {
  return <HighlightedCodeBlock code={fileThumbnailSourceCode} />
}
