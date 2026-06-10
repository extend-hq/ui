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
import type { PDFDocumentProxy } from "pdfjs-dist"
import type * as ReactPdf from "react-pdf"

import { cn } from "@/lib/utils"
import { withUiBasePath } from "@/lib/zone-path"
import { FileSystem, type FileSystemItem } from "@/components/ui/file-system"
import { DocsViewCodeBlock } from "@/components/docs-code-block"
import { FileSystemSourceCode } from "@/components/file-system-source-code"
import { FileSystemBlock } from "@/registry/new-york-v4/blocks/file-system-block"

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
const THUMBNAIL_WIDTH = 360

type DemoThumbnailKind = "docx" | "pdf" | "url" | "xlsx"

type DemoSource = {
  contentType: string
  createdAt: string
  path: string
  /** Thumbnail aspect ratio; images use their natural ratio. */
  previewAspectRatio?: number
  size: number
  thumbnail: DemoThumbnailKind
  updatedAt: string
  url: string
}

const DEMO_SOURCES: DemoSource[] = [
  {
    contentType: "application/pdf",
    createdAt: "2026-02-12T18:21:00Z",
    path: "reports/attention.pdf",
    size: 2215244,
    thumbnail: "pdf",
    updatedAt: "2026-03-24T21:43:00Z",
    url: withUiBasePath("/samples/attention.pdf"),
  },
  {
    contentType: "application/pdf",
    createdAt: "2026-01-30T15:02:00Z",
    path: "reports/2026/knicks.pdf",
    size: 842419,
    thumbnail: "pdf",
    updatedAt: "2026-02-03T19:11:00Z",
    url: withUiBasePath("/samples/knicks.pdf"),
  },
  {
    contentType: "application/pdf",
    createdAt: "2026-04-03T14:04:00Z",
    path: "reports/loan-application.pdf",
    size: 39248,
    thumbnail: "pdf",
    updatedAt: "2026-04-05T21:56:00Z",
    url: withUiBasePath("/samples/loan-application.pdf"),
  },
  {
    contentType: DOCX_MIME_TYPE,
    createdAt: "2026-03-24T17:43:00Z",
    path: "demo.docx",
    size: 1311881,
    // react-docx >= 0.7.0 rasterizes pages without tainting the canvas, so
    // the thumbnail is generated client-side like the PDFs.
    thumbnail: "docx",
    updatedAt: "2026-03-24T17:43:00Z",
    url: withUiBasePath("/samples/demo.docx"),
  },
  {
    contentType: XLSX_MIME_TYPE,
    createdAt: "2026-02-24T08:16:44Z",
    path: "crazy-chart-zoo.xlsx",
    previewAspectRatio: 1.6,
    size: 66655,
    thumbnail: "xlsx",
    updatedAt: "2026-02-24T08:52:48Z",
    url: withUiBasePath("/samples/crazy-chart-zoo.xlsx"),
  },
  {
    contentType: "image/png",
    createdAt: "2026-03-24T15:53:14Z",
    path: "images/attention-page-1.png",
    previewAspectRatio: 800 / 1036,
    size: 183356,
    thumbnail: "url",
    updatedAt: "2026-03-24T16:06:44Z",
    url: withUiBasePath("/samples/attention-page-1.png"),
  },
  {
    contentType: "image/png",
    createdAt: "2026-01-08T11:24:00Z",
    path: "social-card.png",
    previewAspectRatio: 2400 / 1260,
    size: 83838,
    thumbnail: "url",
    updatedAt: "2026-01-08T11:24:00Z",
    url: withUiBasePath("/opengraph-image.png"),
  },
  {
    contentType: "application/pdf",
    createdAt: "2026-04-05T21:57:02Z",
    path: "bank-statement.pdf",
    size: 80096,
    thumbnail: "pdf",
    updatedAt: "2026-04-05T21:57:02Z",
    url: withUiBasePath("/samples/bank-statement-x4uhhi7t.pdf"),
  },
]

function getPdfWorkerUrl(pdfjsVersion: string) {
  return `//unpkg.com/pdfjs-dist@${pdfjsVersion}/legacy/build/pdf.worker.min.mjs`
}

// Pages rendered eagerly per PDF; the rest load on demand through the
// component's `loadPreviewImageUrl` as the pager reaches them.
const EAGER_PAGE_THUMBNAILS = 2
// Quiet period after the last reported page-count change before the DOCX
// page thumbnails are captured.
const DOCX_PAGINATION_SETTLE_MS = 600

type PdfjsModule = (typeof ReactPdf)["pdfjs"]

let pdfjsModulePromise: Promise<PdfjsModule> | null = null

function loadPdfjs() {
  pdfjsModulePromise ??= import("react-pdf").then((reactPdf) => {
    reactPdf.pdfjs.GlobalWorkerOptions.workerSrc = getPdfWorkerUrl(
      reactPdf.pdfjs.version
    )
    return reactPdf.pdfjs
  })
  return pdfjsModulePromise
}

const pdfDocumentCache = new Map<string, Promise<PDFDocumentProxy>>()

function loadPdfDocument(url: string) {
  let documentPromise = pdfDocumentCache.get(url)

  if (!documentPromise) {
    documentPromise = loadPdfjs().then(
      (pdfjs) => pdfjs.getDocument(url).promise
    )
    pdfDocumentCache.set(url, documentPromise)
  }
  return documentPromise
}

async function renderPdfPageThumbnail(url: string, pageIndex: number) {
  const pdf = await loadPdfDocument(url)

  if (pageIndex >= pdf.numPages) return null

  const page = await pdf.getPage(pageIndex + 1)
  const baseViewport = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({
    scale: THUMBNAIL_WIDTH / baseViewport.width,
  })
  const canvas = document.createElement("canvas")

  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)

  const canvasContext = canvas.getContext("2d")

  if (!canvasContext) return null

  await page.render({ canvas, canvasContext, viewport }).promise
  return canvas.toDataURL("image/png")
}

function PdfThumbnailUrlGenerator({
  onUrls,
  url,
}: {
  onUrls: (dataUrls: string[], pageCount: number) => void
  url: string
}) {
  React.useEffect(() => {
    let isCurrent = true

    void (async () => {
      const pdf = await loadPdfDocument(url)
      const eagerPageCount = Math.min(pdf.numPages, EAGER_PAGE_THUMBNAILS)
      const dataUrls: string[] = []

      for (let pageIndex = 0; pageIndex < eagerPageCount; pageIndex += 1) {
        if (!isCurrent) return

        const dataUrl = await renderPdfPageThumbnail(url, pageIndex)

        if (!dataUrl) return

        dataUrls.push(dataUrl)
      }
      if (isCurrent && dataUrls.length) {
        onUrls(dataUrls, pdf.numPages)
      }
    })().catch(() => {})

    return () => {
      isCurrent = false
    }
  }, [onUrls, url])

  return null
}

// The docx canvas reports "ready" once for the blank pre-import page; only
// capture once actual content has been painted.
function canvasHasInk(canvas: HTMLCanvasElement) {
  const sampleSize = 32
  const sample = document.createElement("canvas")

  sample.width = sampleSize
  sample.height = sampleSize

  const context = sample.getContext("2d")

  if (!context) return false

  context.drawImage(canvas, 0, 0, sampleSize, sampleSize)

  const { data } = context.getImageData(0, 0, sampleSize, sampleSize)

  for (let index = 0; index < data.length; index += 4) {
    if (
      data[index + 3] > 0 &&
      (data[index] < 240 || data[index + 1] < 240 || data[index + 2] < 240)
    ) {
      return true
    }
  }
  return false
}

function DocxThumbnailUrlGenerator({
  fileName,
  onUrls,
  url,
}: {
  fileName: string
  onUrls: (dataUrls: string[], pageCount: number) => void
  url: string
}) {
  const editor = useDocxEditor({
    initialDocumentTheme: "light",
    initialFileName: fileName,
  })
  const { importDocxFile } = editor
  const [isImported, setIsImported] = React.useState(false)
  // Pagination reports the live page count through the viewer while pages
  // are still being measured (1, 2, … final); mirror it so the thumbnails
  // hook covers every page.
  const [reportedPageCount, setReportedPageCount] = React.useState(0)
  // Capturing at the first reported count would snapshot a partially
  // paginated document, so wait until the count stops changing.
  const [settledPageCount, setSettledPageCount] = React.useState(0)
  const settledPageCountRef = React.useRef(0)
  const thumbnailEditor = React.useMemo<DocxEditorController>(
    () => ({
      ...editor,
      totalPages: Math.max(editor.totalPages, reportedPageCount, 1),
    }),
    [editor, reportedPageCount]
  )
  const { thumbnails } = useDocxViewerThumbnails(
    thumbnailEditor,
    React.useMemo(
      () => ({
        pixelRatio: 2,
        resolution: {
          maxHeight: THUMBNAIL_WIDTH * 1.35,
          maxWidth: THUMBNAIL_WIDTH,
        },
      }),
      []
    )
  )
  const isCapturedRef = React.useRef(false)
  const isCapturingRef = React.useRef(false)

  React.useEffect(() => {
    let isCurrent = true

    void fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch ${fileName} (${response.status})`)
        }

        const blob = await response.blob()

        return new File([blob], fileName, {
          type: blob.type || DOCX_MIME_TYPE,
        })
      })
      .then((docxFile) => {
        if (isCurrent) {
          return importDocxFile(docxFile).then(() => {
            if (isCurrent) {
              setIsImported(true)
            }
          })
        }
      })
      .catch(() => {})

    return () => {
      isCurrent = false
    }
  }, [fileName, importDocxFile, url])

  React.useEffect(() => {
    if (!isImported || reportedPageCount === 0) return

    settledPageCountRef.current = 0
    setSettledPageCount(0)

    const timeoutId = window.setTimeout(() => {
      settledPageCountRef.current = reportedPageCount
      setSettledPageCount(reportedPageCount)
    }, DOCX_PAGINATION_SETTLE_MS)

    return () => window.clearTimeout(timeoutId)
  }, [isImported, reportedPageCount])

  React.useEffect(() => {
    if (settledPageCount === 0) return
    if (isCapturedRef.current || isCapturingRef.current) return
    if (thumbnails.length < settledPageCount) return
    if (thumbnails.some((thumbnail) => !thumbnail.isMounted)) return

    // Guarded by a ref instead of effect cleanup: each render call updates
    // the hook's thumbnail state, which would cancel an abortable effect
    // before the capture ever finished.
    isCapturingRef.current = true

    void Promise.all(
      thumbnails.map(async (thumbnail) => {
        const canvas = document.createElement("canvas")

        canvas.width = thumbnail.pixelWidthPx
        canvas.height = thumbnail.pixelHeightPx
        await thumbnail.renderToCanvas(canvas)
        return canvas
      })
    )
      .then((canvases) => {
        isCapturingRef.current = false

        if (isCapturedRef.current) return
        // Pagination moved on while the capture was in flight — drop the
        // stale snapshot and let the next settled count retry.
        if (settledPageCountRef.current !== settledPageCount) return
        // The first paint can race the imported content; skip blank frames
        // so the next thumbnail state change retries.
        if (!canvases[0] || !canvasHasInk(canvases[0])) return

        isCapturedRef.current = true
        onUrls(
          canvases.map((canvas) => canvas.toDataURL("image/png")),
          canvases.length
        )
      })
      .catch(() => {
        isCapturingRef.current = false
      })
  }, [onUrls, settledPageCount, thumbnails])

  return (
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
          pageVirtualization={{ enabled: false }}
          deferInitialPaginationPaint={false}
          onPageCountChange={(pageCount) =>
            setReportedPageCount(Math.max(1, Math.round(pageCount || 1)))
          }
        />
      </div>
    </div>
  )
}

function XlsxThumbnailUrlGenerator({
  fileName,
  onUrls,
  url,
}: {
  fileName: string
  onUrls: (dataUrls: string[], pageCount: number) => void
  url: string
}) {
  const [workbookBuffer, setWorkbookBuffer] =
    React.useState<ArrayBuffer | null>(null)

  React.useEffect(() => {
    let isCurrent = true

    void fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch ${fileName} (${response.status})`)
        }

        return response.arrayBuffer()
      })
      .then((buffer) => {
        if (isCurrent) {
          setWorkbookBuffer(buffer)
        }
      })
      .catch(() => {})

    return () => {
      isCurrent = false
    }
  }, [fileName, url])

  if (!workbookBuffer) return null

  return (
    <XlsxWorkbookThumbnailCapture
      fileName={fileName}
      onUrls={onUrls}
      workbookBuffer={workbookBuffer}
    />
  )
}

function XlsxWorkbookThumbnailCapture({
  fileName,
  onUrls,
  workbookBuffer,
}: {
  fileName: string
  onUrls: (dataUrls: string[], pageCount: number) => void
  workbookBuffer: ArrayBuffer
}) {
  const controller = useXlsxViewerController(
    React.useMemo(
      () => ({
        file: workbookBuffer,
        fileName,
        readOnly: true,
        useWorker: true,
      }),
      [fileName, workbookBuffer]
    )
  )

  return (
    <XlsxViewerProvider controller={controller}>
      <XlsxThumbnailCapture onUrls={onUrls} />
    </XlsxViewerProvider>
  )
}

function XlsxThumbnailCapture({
  onUrls,
}: {
  onUrls: (dataUrls: string[], pageCount: number) => void
}) {
  const { thumbnails } = useXlsxViewerThumbnails(
    React.useMemo(
      () => ({
        includeHeaders: true,
        resolution: {
          maxHeight: THUMBNAIL_WIDTH,
          maxWidth: THUMBNAIL_WIDTH * 1.6,
        },
      }),
      []
    )
  )

  React.useEffect(() => {
    if (thumbnails.length === 0) return

    const dataUrls: string[] = []

    for (const thumbnail of thumbnails) {
      const canvas = document.createElement("canvas")

      canvas.width = thumbnail.width
      canvas.height = thumbnail.height

      // Bail until every sheet paints; the effect reruns as they become ready.
      if (!thumbnail.paint(canvas)) return

      dataUrls.push(canvas.toDataURL("image/png"))
    }
    onUrls(dataUrls, dataUrls.length)
  }, [onUrls, thumbnails])

  return null
}

type DemoThumbnails = {
  pageCount: number
  urls: string[]
}

export function useFileSystemDemoItems() {
  const [thumbnails, setThumbnails] = React.useState<
    Record<string, DemoThumbnails>
  >({})
  const setPathThumbnails = React.useCallback(
    (path: string, urls: string[], pageCount: number) => {
      setThumbnails((previous) =>
        previous[path] ? previous : { ...previous, [path]: { pageCount, urls } }
      )
    },
    []
  )

  const items = React.useMemo<FileSystemItem[]>(
    () =>
      DEMO_SOURCES.map<FileSystemItem>((source) => ({
        contentType: source.contentType,
        createdAt: source.createdAt,
        key: source.path,
        kind: "file",
        path: source.path,
        previewAspectRatio: source.previewAspectRatio,
        previewImageUrls:
          source.thumbnail === "url"
            ? [source.url]
            : (thumbnails[source.path]?.urls ?? null),
        previewPageCount: thumbnails[source.path]?.pageCount,
        size: source.size,
        updatedAt: source.updatedAt,
        url: source.url,
      })),
    [thumbnails]
  )

  // Remaining PDF pages render on demand; data URLs are memoized per page so
  // revisiting a page is instant.
  const lazyPageCacheRef = React.useRef(
    new Map<string, Promise<string | null>>()
  )
  const loadPreviewImageUrl = React.useCallback(
    (file: FileSystemItem & { kind: "file" }, pageIndex: number) => {
      const source = DEMO_SOURCES.find(
        (demoSource) => demoSource.path === file.path
      )

      if (source?.thumbnail !== "pdf") return Promise.resolve(null)

      const cacheKey = `${source.url}#${pageIndex}`
      let pagePromise = lazyPageCacheRef.current.get(cacheKey)

      if (!pagePromise) {
        pagePromise = renderPdfPageThumbnail(source.url, pageIndex)
        lazyPageCacheRef.current.set(cacheKey, pagePromise)
      }
      return pagePromise
    },
    []
  )

  const thumbnailGenerators = (
    <>
      {DEMO_SOURCES.filter(
        (source) => source.thumbnail === "pdf" && !thumbnails[source.path]
      ).map((source) => (
        <PdfThumbnailUrlGenerator
          key={source.path}
          url={source.url}
          onUrls={(dataUrls, pageCount) =>
            setPathThumbnails(source.path, dataUrls, pageCount)
          }
        />
      ))}
      {DEMO_SOURCES.filter(
        (source) => source.thumbnail === "docx" && !thumbnails[source.path]
      ).map((source) => (
        <DocxThumbnailUrlGenerator
          key={source.path}
          fileName={source.path.split("/").pop() ?? source.path}
          url={source.url}
          onUrls={(dataUrls, pageCount) =>
            setPathThumbnails(source.path, dataUrls, pageCount)
          }
        />
      ))}
      {DEMO_SOURCES.filter(
        (source) => source.thumbnail === "xlsx" && !thumbnails[source.path]
      ).map((source) => (
        <XlsxThumbnailUrlGenerator
          key={source.path}
          fileName={source.path.split("/").pop() ?? source.path}
          url={source.url}
          onUrls={(dataUrls, pageCount) =>
            setPathThumbnails(source.path, dataUrls, pageCount)
          }
        />
      ))}
    </>
  )

  return { items, loadPreviewImageUrl, thumbnailGenerators }
}

export function FileSystemDemo() {
  const { items, loadPreviewImageUrl, thumbnailGenerators } =
    useFileSystemDemoItems()

  return (
    <div
      data-slot="component-preview"
      className="group relative mt-4 mb-12 flex flex-col overflow-hidden rounded-xl border"
    >
      <div className="bg-background p-4 sm:p-6">
        <FileSystem
          items={items}
          title="Documents"
          className="h-[560px]"
          loadPreviewImageUrl={loadPreviewImageUrl}
        />
        {thumbnailGenerators}
      </div>
      <DocsViewCodeBlock code={fileSystemDemoCode} />
    </div>
  )
}

export function FileSystemFinderBlock({
  heightClassName = "h-[680px]",
}: {
  heightClassName?: string
}) {
  const { items, loadPreviewImageUrl, thumbnailGenerators } =
    useFileSystemDemoItems()

  return (
    <div className="flex h-full min-h-0 bg-background">
      <FileSystemBlock
        items={items}
        title="Documents"
        className={cn("min-h-0 flex-1 rounded-none border-0", heightClassName)}
        loadPreviewImageUrl={loadPreviewImageUrl}
      />
      {thumbnailGenerators}
    </div>
  )
}

const fileSystemDemoCode = `"use client"

import { FileSystem, type FileSystemItem } from "@/components/ui/file-system"

// Flat manifest — maps 1:1 from S3/R2 ListObjectsV2:
//   Contents[].Key          -> file.key / file.path
//   Contents[].Size         -> file.size
//   Contents[].LastModified -> file.updatedAt
//   Contents[].ETag         -> file.etag
//   CommonPrefixes[].Prefix -> folder.path
const items: FileSystemItem[] = [
  {
    kind: "file",
    key: "reports/attention.pdf",
    path: "reports/attention.pdf",
    contentType: "application/pdf",
    size: 2215244,
    createdAt: "2026-02-12T18:21:00Z",
    updatedAt: "2026-03-24T21:43:00Z",
    // Generated externally, e.g. with react-pdf, react-docx, or react-xlsx.
    previewImageUrl: "/thumbnails/reports/attention.png",
  },
  // ...
]

export function DocumentsBrowser() {
  return (
    <FileSystem
      items={items}
      title="Documents"
      className="h-[560px]"
      getFileUrl={async (file) =>
        \`/api/files/sign?key=\${encodeURIComponent(file.key ?? file.path)}\`
      }
      loadChildren={async ({ path, cursor }) => {
        const response = await fetch(
          \`/api/files/list?prefix=\${encodeURIComponent(path)}&cursor=\${cursor ?? ""}\`
        )

        return response.json() // { items, nextCursor }
      }}
    />
  )
}`

export function FileSystemSource() {
  return <FileSystemSourceCode />
}
