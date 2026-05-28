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
  const thumbnailOptions = React.useMemo(
    () => ({
      pixelRatio: 2,
      resolution: { maxHeight: 520, maxWidth: 520 },
    }),
    []
  )
  const { thumbnails } = useDocxViewerThumbnails(editor, thumbnailOptions)
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

const fileThumbnailSourceCode =
  '"use client"\n\nimport * as React from "react"\nimport {\n  DocxEditorViewer,\n  useDocxEditor,\n  useDocxViewerThumbnails,\n} from "@extend-ai/react-docx"\nimport {\n  useXlsxViewer,\n  useXlsxViewerController,\n  useXlsxViewerThumbnails,\n  XlsxViewerProvider,\n} from "@extend-ai/react-xlsx"\nimport { File01Icon, FileImageIcon } from "@hugeicons/core-free-icons"\nimport { HugeiconsIcon } from "@hugeicons/react"\nimport type * as ReactPdf from "react-pdf"\n\nimport { cn } from "@/lib/utils"\n\nexport type ThumbnailSource = string | File | Blob\n\nexport type ThumbnailFile = {\n  name: string\n  type: string\n  size?: string | number\n  source?: ThumbnailSource\n  url?: string\n}\n\nexport type FileThumbnailProps = {\n  file: ThumbnailFile | File\n  className?: string\n  previewAspectRatio?: number\n  previewClassName?: string\n  previewContent?: React.ReactNode\n  previewImageUrl?: string | null\n  source?: ThumbnailSource\n  thumbnailWidth?: number\n  generationDelayMs?: number\n  renderDocumentPreview?: boolean\n  isLoading?: boolean\n  hasError?: boolean\n  showMetadata?: boolean\n}\n\ntype NormalizedThumbnailFile = {\n  name: string\n  type: string\n  size?: string | number\n  source?: ThumbnailSource\n  url?: string\n}\n\ntype ReactPdfModule = typeof ReactPdf\n\nfunction isBlobLike(value: unknown): value is Blob {\n  return typeof Blob !== "undefined" && value instanceof Blob\n}\n\nfunction isFileLike(value: unknown): value is File {\n  return typeof File !== "undefined" && value instanceof File\n}\n\nfunction normalizeFile(file: ThumbnailFile | File): NormalizedThumbnailFile {\n  return {\n    name: file.name,\n    size:\n      typeof file.size === "number"\n        ? formatBytes(file.size)\n        : (file.size as string | undefined),\n    source: isFileLike(file) ? file : (file as ThumbnailFile).source,\n    type: file.type,\n    url: (file as ThumbnailFile).url,\n  }\n}\n\nfunction getThumbnailSource(\n  file: NormalizedThumbnailFile,\n  source?: ThumbnailSource\n): ThumbnailSource | undefined {\n  return source ?? file.source ?? file.url\n}\n\nfunction formatBytes(bytes: number) {\n  if (!Number.isFinite(bytes) || bytes <= 0) return undefined\n\n  const units = ["B", "KB", "MB", "GB"]\n  let value = bytes\n  let unitIndex = 0\n\n  while (value >= 1024 && unitIndex < units.length - 1) {\n    value /= 1024\n    unitIndex += 1\n  }\n\n  const formatted =\n    value >= 10 || unitIndex === 0 ? Math.round(value) : value.toFixed(1)\n  return `${formatted} ${units[unitIndex]}`\n}\n\nfunction isImageFile(file: NormalizedThumbnailFile) {\n  return file.type.startsWith("image/")\n}\n\nfunction isPdfFile(file: NormalizedThumbnailFile) {\n  return (\n    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")\n  )\n}\n\nfunction isDocxFile(file: NormalizedThumbnailFile) {\n  return (\n    file.type ===\n      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||\n    file.name.toLowerCase().endsWith(".docx")\n  )\n}\n\nfunction isXlsxFile(file: NormalizedThumbnailFile) {\n  const fileName = file.name.toLowerCase()\n\n  return (\n    file.type ===\n      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||\n    file.type === "application/vnd.ms-excel" ||\n    fileName.endsWith(".xlsx") ||\n    fileName.endsWith(".xls")\n  )\n}\n\nfunction FileKindIcon({ file }: { file: NormalizedThumbnailFile }) {\n  const icon = isImageFile(file) ? FileImageIcon : File01Icon\n\n  return <HugeiconsIcon icon={icon} className="size-4" />\n}\n\nfunction useThumbnailActivation(delayMs: number) {\n  const [isActive, setIsActive] = React.useState(delayMs <= 0)\n\n  React.useEffect(() => {\n    if (delayMs <= 0) {\n      setIsActive(true)\n      return\n    }\n\n    setIsActive(false)\n    const timeout = window.setTimeout(() => {\n      setIsActive(true)\n    }, delayMs)\n\n    return () => window.clearTimeout(timeout)\n  }, [delayMs])\n\n  return isActive\n}\n\nfunction useObjectUrl() {\n  const [objectUrl, setObjectUrl] = React.useState<string | null>(null)\n\n  const updateObjectUrl = React.useCallback((blob: Blob) => {\n    const nextUrl = URL.createObjectURL(blob)\n    setObjectUrl((currentUrl) => {\n      if (currentUrl) URL.revokeObjectURL(currentUrl)\n      return nextUrl\n    })\n  }, [])\n\n  React.useEffect(() => {\n    return () => {\n      if (objectUrl) URL.revokeObjectURL(objectUrl)\n    }\n  }, [objectUrl])\n\n  return { objectUrl, updateObjectUrl }\n}\n\nfunction useSourceObjectUrl(source: ThumbnailSource | undefined) {\n  const [objectUrl, setObjectUrl] = React.useState<string | null>(null)\n\n  React.useEffect(() => {\n    if (!source || typeof source === "string") {\n      setObjectUrl(null)\n      return\n    }\n\n    const nextUrl = URL.createObjectURL(source)\n    setObjectUrl(nextUrl)\n\n    return () => URL.revokeObjectURL(nextUrl)\n  }, [source])\n\n  if (!source) return undefined\n  return typeof source === "string" ? source : (objectUrl ?? undefined)\n}\n\nasync function sourceToFile(\n  source: ThumbnailSource,\n  file: NormalizedThumbnailFile\n) {\n  if (isFileLike(source)) return source\n\n  if (isBlobLike(source)) {\n    return new File([source], file.name, {\n      type: source.type || file.type,\n    })\n  }\n\n  const response = await fetch(source)\n  if (!response.ok) {\n    throw new Error(`Failed to fetch ${file.name} (${response.status})`)\n  }\n\n  const blob = await response.blob()\n\n  return new File([blob], file.name, {\n    type: blob.type || file.type,\n  })\n}\n\nfunction canvasToBlob(canvas: HTMLCanvasElement | null) {\n  if (!canvas) return Promise.resolve<Blob | null>(null)\n\n  return new Promise<Blob | null>((resolve) => {\n    const blobFromDataUrl = async () => {\n      try {\n        const dataUrl = canvas.toDataURL("image/png")\n        const response = await fetch(dataUrl)\n        return await response.blob()\n      } catch {\n        return null\n      }\n    }\n\n    try {\n      if (typeof canvas.toBlob === "function") {\n        canvas.toBlob((blob) => {\n          if (blob) {\n            resolve(blob)\n            return\n          }\n\n          void blobFromDataUrl().then(resolve)\n        }, "image/png")\n        return\n      }\n\n      void blobFromDataUrl().then(resolve)\n    } catch {\n      resolve(null)\n    }\n  })\n}\n\nexport function FileThumbnailLoadingOverlay() {\n  return (\n    <div\n      aria-hidden="true"\n      className="absolute inset-0 z-10 overflow-hidden bg-muted"\n    >\n      <div className="absolute inset-0 bg-muted" />\n      <div className="absolute inset-0 animate-pulse bg-background/55 motion-reduce:animate-none" />\n    </div>\n  )\n}\n\nfunction FileThumbnailShell({\n  file,\n  className,\n  previewAspectRatio,\n  previewClassName,\n  previewContent,\n  previewImageUrl,\n  isLoading = false,\n  hasError = false,\n  showMetadata = true,\n}: {\n  file: NormalizedThumbnailFile\n  className?: string\n  previewAspectRatio?: number\n  previewClassName?: string\n  previewContent?: React.ReactNode\n  previewImageUrl?: string | null\n  isLoading?: boolean\n  hasError?: boolean\n  showMetadata?: boolean\n}) {\n  const imageRef = React.useRef<HTMLImageElement | null>(null)\n  const [isImageLoading, setIsImageLoading] = React.useState(\n    Boolean(previewImageUrl)\n  )\n  const [imageFailed, setImageFailed] = React.useState(false)\n  const showLoading = isLoading || isImageLoading\n  const hasPreviewContent = Boolean(previewContent)\n  const showFallback =\n    hasError || imageFailed || (!previewImageUrl && !hasPreviewContent)\n  const markImageLoaded = React.useCallback((image: HTMLImageElement) => {\n    const didLoad = image.naturalWidth > 0 && image.naturalHeight > 0\n\n    setImageFailed(!didLoad)\n    setIsImageLoading(false)\n  }, [])\n\n  React.useEffect(() => {\n    setIsImageLoading(Boolean(previewImageUrl))\n    setImageFailed(false)\n  }, [previewImageUrl])\n\n  React.useEffect(() => {\n    const image = imageRef.current\n\n    if (!image || !previewImageUrl) return\n\n    if (image.complete) {\n      markImageLoaded(image)\n    }\n  }, [markImageLoaded, previewImageUrl])\n\n  return (\n    <div\n      className={cn(\n        "group overflow-hidden rounded-lg border bg-background text-foreground",\n        className\n      )}\n    >\n      <div\n        className={cn(\n          "relative aspect-square overflow-hidden bg-muted",\n          previewClassName\n        )}\n        style={\n          previewAspectRatio\n            ? { aspectRatio: String(previewAspectRatio) }\n            : undefined\n        }\n      >\n        {previewImageUrl ? (\n          <img\n            ref={imageRef}\n            src={previewImageUrl}\n            alt=""\n            draggable={false}\n            loading="lazy"\n            decoding="async"\n            className={cn(\n              "size-full object-cover transition-[opacity,filter,transform] duration-[160ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",\n              showLoading\n                ? "scale-[1.01] opacity-0 blur-sm"\n                : "blur-0 scale-100 opacity-100"\n            )}\n            onLoad={(event) => {\n              markImageLoaded(event.currentTarget)\n            }}\n            onError={() => {\n              setImageFailed(true)\n              setIsImageLoading(false)\n            }}\n          />\n        ) : null}\n        {previewContent ? (\n          <div\n            className={cn(\n              "size-full transition-[opacity,filter,transform] duration-[160ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",\n              showLoading\n                ? "scale-[1.01] opacity-0 blur-sm"\n                : "blur-0 scale-100 opacity-100"\n            )}\n          >\n            {previewContent}\n          </div>\n        ) : null}\n        {showLoading ? <FileThumbnailLoadingOverlay /> : null}\n        {showFallback ? (\n          <div className="absolute inset-0 grid place-items-center bg-muted text-muted-foreground">\n            <FileKindIcon file={file} />\n          </div>\n        ) : null}\n      </div>\n      {showMetadata ? (\n        <div className="flex items-center gap-2 border-t px-3 py-2">\n          <div className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">\n            <FileKindIcon file={file} />\n          </div>\n          <div className="min-w-0">\n            <div className="truncate text-sm font-medium">{file.name}</div>\n            <div className="truncate text-xs text-muted-foreground">\n              {file.size ?? file.type}\n            </div>\n          </div>\n        </div>\n      ) : null}\n    </div>\n  )\n}\n\nfunction ImageFileThumbnail({\n  className,\n  file,\n  hasError,\n  isLoading,\n  previewClassName,\n  previewAspectRatio,\n  showMetadata,\n  source,\n}: {\n  className?: string\n  file: NormalizedThumbnailFile\n  hasError?: boolean\n  isLoading?: boolean\n  previewAspectRatio?: number\n  previewClassName?: string\n  showMetadata?: boolean\n  source: ThumbnailSource\n}) {\n  const imageUrl = useSourceObjectUrl(source)\n\n  return (\n    <FileThumbnailShell\n      file={file}\n      previewImageUrl={imageUrl}\n      isLoading={isLoading || !imageUrl}\n      hasError={hasError}\n      className={className}\n      previewAspectRatio={previewAspectRatio}\n      previewClassName={previewClassName}\n      showMetadata={showMetadata}\n    />\n  )\n}\n\nfunction PdfFileThumbnail({\n  file,\n  className,\n  hasError: externalHasError,\n  isActive,\n  isLoading: externalIsLoading,\n  previewClassName,\n  previewAspectRatio,\n  showMetadata,\n  source,\n  thumbnailWidth,\n}: {\n  file: NormalizedThumbnailFile\n  className?: string\n  hasError?: boolean\n  isActive: boolean\n  isLoading?: boolean\n  previewAspectRatio?: number\n  previewClassName?: string\n  showMetadata: boolean\n  source: ThumbnailSource\n  thumbnailWidth: number\n}) {\n  const sourceUrl = useSourceObjectUrl(source)\n  const [reactPdf, setReactPdf] = React.useState<ReactPdfModule | null>(null)\n  const [isLoading, setIsLoading] = React.useState(true)\n  const [hasError, setHasError] = React.useState(false)\n  const rootRef = React.useRef<HTMLDivElement | null>(null)\n  const { objectUrl, updateObjectUrl } = useObjectUrl()\n  const shouldRenderPdf =\n    isActive && sourceUrl && reactPdf && !objectUrl && !hasError\n  const capturePdfCanvas = React.useCallback(() => {\n    const canvas = rootRef.current?.querySelector("canvas") ?? null\n\n    void canvasToBlob(canvas).then((blob) => {\n      if (!blob) {\n        setHasError(true)\n        setIsLoading(false)\n        return\n      }\n\n      updateObjectUrl(blob)\n      setHasError(false)\n      setIsLoading(false)\n    })\n  }, [updateObjectUrl])\n\n  React.useEffect(() => {\n    setIsLoading(true)\n    setHasError(false)\n  }, [sourceUrl])\n\n  React.useEffect(() => {\n    if (!isActive || reactPdf || objectUrl) return\n\n    let isMounted = true\n    setIsLoading(true)\n    setHasError(false)\n\n    void import("react-pdf")\n      .then((module) => {\n        module.pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${module.pdfjs.version}/legacy/build/pdf.worker.min.mjs`\n        if (isMounted) setReactPdf(module)\n      })\n      .catch(() => {\n        if (isMounted) {\n          setHasError(true)\n          setIsLoading(false)\n        }\n      })\n\n    return () => {\n      isMounted = false\n    }\n  }, [isActive, objectUrl, reactPdf])\n\n  return (\n    <>\n      <FileThumbnailShell\n        file={file}\n        previewImageUrl={objectUrl}\n        isLoading={Boolean(externalIsLoading || (isLoading && !objectUrl))}\n        hasError={Boolean(externalHasError || hasError)}\n        className={className}\n        previewAspectRatio={previewAspectRatio}\n        previewClassName={previewClassName}\n        showMetadata={showMetadata}\n      />\n      {shouldRenderPdf ? (\n        <div\n          ref={rootRef}\n          aria-hidden="true"\n          className="pointer-events-none fixed top-0 left-[-10000px] w-[560px] overflow-hidden bg-white"\n        >\n          <reactPdf.Document\n            file={sourceUrl}\n            loading={null}\n            error={null}\n            noData={null}\n            onLoadError={() => {\n              setHasError(true)\n              setIsLoading(false)\n            }}\n          >\n            <reactPdf.Thumbnail\n              pageNumber={1}\n              width={thumbnailWidth}\n              loading={null}\n              error={null}\n              onRenderSuccess={() => {\n                window.requestAnimationFrame(() => {\n                  capturePdfCanvas()\n                })\n              }}\n              onRenderError={() => {\n                setHasError(true)\n                setIsLoading(false)\n              }}\n            />\n          </reactPdf.Document>\n        </div>\n      ) : null}\n    </>\n  )\n}\n\nfunction DocxFileThumbnail({\n  file,\n  className,\n  hasError: externalHasError,\n  isActive,\n  isLoading: externalIsLoading,\n  previewClassName,\n  previewAspectRatio,\n  showMetadata,\n  source,\n  thumbnailWidth,\n}: {\n  file: NormalizedThumbnailFile\n  className?: string\n  hasError?: boolean\n  isActive: boolean\n  isLoading?: boolean\n  previewAspectRatio?: number\n  previewClassName?: string\n  showMetadata: boolean\n  source: ThumbnailSource\n  thumbnailWidth: number\n}) {\n  const editor = useDocxEditor({\n    initialDocumentTheme: "light",\n    initialFileName: file.name,\n  })\n  const thumbnailOptions = React.useMemo(\n    () => ({\n      pixelRatio: 2,\n      resolution: {\n        maxHeight: thumbnailWidth,\n        maxWidth: thumbnailWidth,\n      },\n    }),\n    [thumbnailWidth]\n  )\n  const { thumbnails } = useDocxViewerThumbnails(editor, thumbnailOptions)\n  const firstThumbnail = thumbnails[0]\n  const [hasError, setHasError] = React.useState(false)\n  const [isReady, setIsReady] = React.useState(false)\n  const [thumbnailSize, setThumbnailSize] = React.useState<{\n    height: number\n    width: number\n  } | null>(null)\n  const [thumbnailCanvas, setThumbnailCanvas] =\n    React.useState<HTMLCanvasElement | null>(null)\n  const editorRef = React.useRef(editor)\n  const importedDocxKeyRef = React.useRef<string | null>(null)\n  const hiddenDocxViewerRef = React.useRef<HTMLDivElement | null>(null)\n\n  React.useEffect(() => {\n    editorRef.current = editor\n  }, [editor])\n\n  React.useEffect(() => {\n    if (!isActive) return\n\n    const docxKey =\n      typeof source === "string"\n        ? `${file.name}:${source}`\n        : `${file.name}:${source.size}:${source.type}`\n\n    if (importedDocxKeyRef.current === docxKey) return\n\n    let isCurrent = true\n    importedDocxKeyRef.current = docxKey\n    setHasError(false)\n    setIsReady(false)\n\n    async function loadDocx() {\n      try {\n        const docxFile = await sourceToFile(source, file)\n        await editorRef.current.importDocxFile(docxFile)\n      } catch {\n        if (isCurrent && importedDocxKeyRef.current === docxKey) {\n          setHasError(true)\n        }\n      }\n    }\n\n    void loadDocx()\n\n    return () => {\n      isCurrent = false\n    }\n  }, [file, isActive, source])\n\n  React.useEffect(() => {\n    if (!firstThumbnail) {\n      setThumbnailSize(null)\n      return\n    }\n\n    setThumbnailSize((currentSize) => {\n      if (\n        currentSize?.height === firstThumbnail.pixelHeightPx &&\n        currentSize.width === firstThumbnail.pixelWidthPx\n      ) {\n        return currentSize\n      }\n\n      return {\n        height: firstThumbnail.pixelHeightPx,\n        width: firstThumbnail.pixelWidthPx,\n      }\n    })\n\n    if (firstThumbnail?.status === "error") {\n      setHasError(true)\n    }\n  }, [\n    firstThumbnail,\n    firstThumbnail?.pixelHeightPx,\n    firstThumbnail?.pixelWidthPx,\n    firstThumbnail?.status,\n  ])\n\n  const attachThumbnailCanvas = React.useCallback(\n    (canvas: HTMLCanvasElement | null) => {\n      setThumbnailCanvas(canvas)\n    },\n    []\n  )\n\n  React.useEffect(() => {\n    if (\n      !isActive ||\n      !firstThumbnail ||\n      !thumbnailCanvas ||\n      isReady ||\n      hasError\n    ) {\n      return\n    }\n\n    let isCurrent = true\n    let timeoutId: number | undefined\n    let animationFrameId: number | undefined\n    let nestedAnimationFrameId: number | undefined\n    let attempts = 0\n\n    const getRenderedPageSurface = () => {\n      const pageSurface = hiddenDocxViewerRef.current?.querySelector(\n        \'[data-docx-page-surface="true"]\'\n      )\n\n      if (!pageSurface) return null\n\n      const hasText = Boolean(pageSurface.textContent?.trim())\n      const hasEmbeddedContent = Boolean(\n        pageSurface.querySelector("canvas,img,svg,table")\n      )\n\n      return hasText || hasEmbeddedContent ? pageSurface : null\n    }\n\n    const renderThumbnail = () => {\n      if (!isCurrent) return\n\n      if (!getRenderedPageSurface()) {\n        attempts += 1\n\n        if (attempts > 50) {\n          setHasError(true)\n          return\n        }\n\n        timeoutId = window.setTimeout(renderThumbnail, 100)\n        return\n      }\n\n      animationFrameId = window.requestAnimationFrame(() => {\n        nestedAnimationFrameId = window.requestAnimationFrame(() => {\n          void firstThumbnail\n            .renderToCanvas(thumbnailCanvas)\n            .then(() => {\n              if (isCurrent) setIsReady(true)\n            })\n            .catch(() => {\n              if (isCurrent) setHasError(true)\n            })\n        })\n      })\n    }\n\n    renderThumbnail()\n\n    return () => {\n      isCurrent = false\n      if (timeoutId !== undefined) window.clearTimeout(timeoutId)\n      if (animationFrameId !== undefined) {\n        window.cancelAnimationFrame(animationFrameId)\n      }\n      if (nestedAnimationFrameId !== undefined) {\n        window.cancelAnimationFrame(nestedAnimationFrameId)\n      }\n    }\n  }, [firstThumbnail, hasError, isActive, isReady, thumbnailCanvas])\n\n  const previewContent = thumbnailSize ? (\n    <canvas\n      ref={attachThumbnailCanvas}\n      width={thumbnailSize.width}\n      height={thumbnailSize.height}\n      className="!size-full bg-white object-cover object-top"\n    />\n  ) : null\n\n  return (\n    <>\n      <FileThumbnailShell\n        file={file}\n        previewContent={previewContent}\n        isLoading={Boolean(externalIsLoading || (!isReady && !hasError))}\n        hasError={Boolean(externalHasError || hasError)}\n        className={className}\n        previewAspectRatio={previewAspectRatio}\n        previewClassName={cn("bg-white", previewClassName)}\n        showMetadata={showMetadata}\n      />\n      {isActive && !hasError && !isReady ? (\n        <div\n          ref={hiddenDocxViewerRef}\n          aria-hidden="true"\n          className="pointer-events-none fixed top-0 left-[-10000px] w-[816px] overflow-hidden bg-white"\n        >\n          <div className="w-[816px]">\n            <DocxEditorViewer\n              editor={editor}\n              mode="read-only"\n              pageBackgroundColor="#ffffff"\n              pageGapBackgroundColor="transparent"\n              visiblePageRange={{ endPageIndex: 0, startPageIndex: 0 }}\n              pageVirtualization={{ enabled: false }}\n              deferInitialPaginationPaint={false}\n            />\n          </div>\n        </div>\n      ) : null}\n    </>\n  )\n}\n\nfunction XlsxFileThumbnail({\n  file,\n  className,\n  hasError: externalHasError,\n  isActive,\n  isLoading: externalIsLoading,\n  previewClassName,\n  previewAspectRatio,\n  showMetadata,\n  source,\n  thumbnailWidth,\n}: {\n  file: NormalizedThumbnailFile\n  className?: string\n  hasError?: boolean\n  isActive: boolean\n  isLoading?: boolean\n  previewAspectRatio?: number\n  previewClassName?: string\n  showMetadata: boolean\n  source: ThumbnailSource\n  thumbnailWidth: number\n}) {\n  const sourceUrl = useSourceObjectUrl(source)\n  const [imageUrl, setImageUrl] = React.useState<string | null>(null)\n  const [hasError, setHasError] = React.useState(false)\n\n  React.useEffect(() => {\n    setImageUrl(null)\n    setHasError(false)\n  }, [sourceUrl])\n\n  return (\n    <>\n      <FileThumbnailShell\n        file={file}\n        previewImageUrl={imageUrl}\n        isLoading={Boolean(\n          externalIsLoading || (isActive && !imageUrl && !hasError)\n        )}\n        hasError={Boolean(externalHasError || hasError)}\n        className={className}\n        previewAspectRatio={previewAspectRatio}\n        previewClassName={cn(\n          "bg-white [&>img]:object-left-top",\n          previewClassName\n        )}\n        showMetadata={showMetadata}\n      />\n      {isActive && sourceUrl && !imageUrl && !hasError ? (\n        <XlsxThumbnailGenerator\n          file={file}\n          sourceUrl={sourceUrl}\n          thumbnailWidth={thumbnailWidth}\n          onError={() => setHasError(true)}\n          onImageUrl={setImageUrl}\n        />\n      ) : null}\n    </>\n  )\n}\n\nfunction XlsxThumbnailGenerator({\n  file,\n  onError,\n  onImageUrl,\n  sourceUrl,\n  thumbnailWidth,\n}: {\n  file: NormalizedThumbnailFile\n  onError: () => void\n  onImageUrl: (url: string) => void\n  sourceUrl: string\n  thumbnailWidth: number\n}) {\n  const controller = useXlsxViewerController(\n    React.useMemo(\n      () => ({\n        fileName: file.name,\n        readOnly: true,\n        src: sourceUrl,\n        useWorker: true,\n      }),\n      [file.name, sourceUrl]\n    )\n  )\n\n  return (\n    <XlsxViewerProvider controller={controller}>\n      <XlsxThumbnailGeneratorContent\n        thumbnailWidth={thumbnailWidth}\n        onError={onError}\n        onImageUrl={onImageUrl}\n      />\n    </XlsxViewerProvider>\n  )\n}\n\nfunction XlsxThumbnailGeneratorContent({\n  onError,\n  onImageUrl,\n  thumbnailWidth,\n}: {\n  onError: () => void\n  onImageUrl: (url: string) => void\n  thumbnailWidth: number\n}) {\n  const controller = useXlsxViewer()\n  const { thumbnails } = useXlsxViewerThumbnails({\n    includeHeaders: true,\n    resolution: {\n      maxHeight: thumbnailWidth,\n      maxWidth: thumbnailWidth,\n    },\n  })\n  const firstThumbnail = thumbnails[0]\n\n  React.useEffect(() => {\n    if (controller.error) {\n      onError()\n      return\n    }\n\n    if (!firstThumbnail) return\n\n    const canvas = document.createElement("canvas")\n\n    if (!firstThumbnail.paint(canvas)) return\n\n    onImageUrl(canvas.toDataURL("image/png"))\n  }, [controller.error, firstThumbnail, onError, onImageUrl])\n\n  return null\n}\n\nexport function FileThumbnail({\n  file: rawFile,\n  className,\n  previewAspectRatio,\n  previewClassName,\n  previewContent,\n  previewImageUrl,\n  source: explicitSource,\n  thumbnailWidth,\n  generationDelayMs = 0,\n  renderDocumentPreview = true,\n  isLoading = false,\n  hasError = false,\n  showMetadata = true,\n}: FileThumbnailProps) {\n  const file = React.useMemo(() => normalizeFile(rawFile), [rawFile])\n  const source = getThumbnailSource(file, explicitSource)\n  const isActive = useThumbnailActivation(generationDelayMs)\n\n  if (previewImageUrl || previewContent || !renderDocumentPreview || !source) {\n    return (\n      <FileThumbnailShell\n        file={file}\n        previewImageUrl={previewImageUrl}\n        previewContent={previewContent}\n        isLoading={isLoading}\n        hasError={hasError}\n        className={className}\n        previewAspectRatio={previewAspectRatio}\n        previewClassName={previewClassName}\n        showMetadata={showMetadata}\n      />\n    )\n  }\n\n  if (isImageFile(file)) {\n    return (\n      <ImageFileThumbnail\n        file={file}\n        source={source}\n        isLoading={isLoading}\n        hasError={hasError}\n        className={className}\n        previewAspectRatio={previewAspectRatio}\n        previewClassName={previewClassName}\n        showMetadata={showMetadata}\n      />\n    )\n  }\n\n  if (isPdfFile(file)) {\n    return (\n      <PdfFileThumbnail\n        file={file}\n        source={source}\n        isActive={isActive}\n        isLoading={isLoading}\n        hasError={hasError}\n        className={className}\n        previewAspectRatio={previewAspectRatio}\n        previewClassName={previewClassName}\n        showMetadata={showMetadata}\n        thumbnailWidth={thumbnailWidth ?? 520}\n      />\n    )\n  }\n\n  if (isDocxFile(file)) {\n    return (\n      <DocxFileThumbnail\n        file={file}\n        source={source}\n        isActive={isActive}\n        isLoading={isLoading}\n        hasError={hasError}\n        className={className}\n        previewAspectRatio={previewAspectRatio}\n        previewClassName={previewClassName}\n        showMetadata={showMetadata}\n        thumbnailWidth={thumbnailWidth ?? 520}\n      />\n    )\n  }\n\n  if (isXlsxFile(file)) {\n    return (\n      <XlsxFileThumbnail\n        file={file}\n        source={source}\n        isActive={isActive}\n        isLoading={isLoading}\n        hasError={hasError}\n        className={className}\n        previewAspectRatio={previewAspectRatio}\n        previewClassName={previewClassName}\n        showMetadata={showMetadata}\n        thumbnailWidth={thumbnailWidth ?? 680}\n      />\n    )\n  }\n\n  return (\n    <FileThumbnailShell\n      file={file}\n      isLoading={isLoading}\n      hasError={hasError}\n      className={className}\n      previewAspectRatio={previewAspectRatio}\n      previewClassName={previewClassName}\n      showMetadata={showMetadata}\n    />\n  )\n}'

export function FileThumbnailSource() {
  return <HighlightedCodeBlock code={fileThumbnailSourceCode} />
}
