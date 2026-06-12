"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import type { PDFDocumentProxy } from "pdfjs-dist"
import type * as ReactPdf from "react-pdf"

import { cn } from "@/lib/utils"
import { withUiBasePath } from "@/lib/zone-path"
import {
  FileSystem,
  type FileSystemItem,
  type FileSystemProps,
} from "@/components/ui/file-system"
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

// Synthetic "aurora" project folder so the docs demo covers the complete
// file-type icon set plus search, sort, and the file-type filter — without
// bloating the manifest. Everything derives from the path hash, so it is
// stable across server and client renders.
const AURORA_PROJECT_FILES = [
  ".gitignore",
  ".prettierrc",
  "biome.json",
  "bun.lockb",
  "CLAUDE.md",
  "config.yaml",
  "Dockerfile",
  "docker-compose.yml",
  "eslint.config.js",
  "next.config.ts",
  "package.json",
  "README.md",
  "tailwind.config.ts",
  "tsconfig.json",
  "vite.config.ts",
]

const AURORA_AREAS: Array<{
  extensions: string[]
  folder: string
}> = [
  { extensions: ["tsx", "ts", "css"], folder: "src/components" },
  { extensions: ["ts"], folder: "src/lib" },
  { extensions: ["md", "mdx"], folder: "docs" },
  { extensions: ["csv", "json", "xlsx"], folder: "data" },
  { extensions: ["png", "svg", "webp"], folder: "assets" },
  { extensions: ["sh", "py"], folder: "scripts" },
  { extensions: ["go", "rs", "sql"], folder: "backend" },
]

const AURORA_WORDS = [
  "billing",
  "catalog",
  "checkout",
  "dashboard",
  "gateway",
  "inventory",
]

// djb2, unsigned — deterministic sizes and dates per path.
function auroraHash(value: string) {
  let hash = 5381

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) | 0
  }
  return hash >>> 0
}

function generateAuroraItems(): FileSystemItem[] {
  const items: FileSystemItem[] = []
  const pushFile = (path: string) => {
    const hash = auroraHash(path)
    const createdAt = Date.UTC(2025, 5, 1) + (hash % 320) * 86_400_000
    const updatedAt = createdAt + (hash % 90) * 86_400_000

    items.push({
      createdAt: new Date(createdAt).toISOString(),
      kind: "file",
      path,
      size: 850 + (hash % 3_800_000),
      updatedAt: new Date(updatedAt).toISOString(),
    })
  }

  for (const fileName of AURORA_PROJECT_FILES) {
    pushFile(`aurora/${fileName}`)
  }
  for (const area of AURORA_AREAS) {
    // Two files per extension — enough to show off every file type.
    const fileCount = area.extensions.length * 2

    for (let index = 0; index < fileCount; index += 1) {
      const word = AURORA_WORDS[index % AURORA_WORDS.length]
      const extension = area.extensions[index % area.extensions.length]
      const fileName = `${word}-${String(index + 1).padStart(3, "0")}.${extension}`

      pushFile(`aurora/${area.folder}/${fileName}`)
    }
  }
  return items
}

const AURORA_ITEMS = generateAuroraItems()

function getPdfWorkerUrl(pdfjsVersion: string) {
  return `//unpkg.com/pdfjs-dist@${pdfjsVersion}/legacy/build/pdf.worker.min.mjs`
}

// Pages rendered eagerly per PDF; the rest load on demand through the
// component's `loadPreviewImageUrl` as the pager reaches them.
const EAGER_PAGE_THUMBNAILS = 2

// The DOCX and XLSX generators are the only consumers of their viewer
// engines here, so each lives in its own chunk that loads only when that
// thumbnail kind actually needs to be generated.
const DocxThumbnailUrlGenerator = dynamic(
  () =>
    import("@/components/file-system-docx-thumbnails").then(
      (mod) => mod.DocxThumbnailUrlGenerator
    ),
  { ssr: false }
)

const XlsxThumbnailUrlGenerator = dynamic(
  () =>
    import("@/components/file-system-xlsx-thumbnails").then(
      (mod) => mod.XlsxThumbnailUrlGenerator
    ),
  { ssr: false }
)

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

type DemoThumbnails = {
  pageCount: number
  urls: string[]
}

// Generated data URLs survive remounts and route changes; without this every
// FileSystem instance re-runs the full generator pipeline (PDF rasterization,
// a hidden DOCX import + pagination, XLSX sheet paints).
const demoThumbnailCache = new Map<string, DemoThumbnails>()

// The hidden DOCX generator imports and paginates the whole 1.3MB demo.docx
// on the main thread — by far the heaviest job on the page. Its output is
// only gallery thumbnails, so hold it until the visible viewers have parsed.
const DOCX_GENERATOR_DELAY_MS = 1200

function useDeferredDocxGeneration() {
  const [isReady, setIsReady] = React.useState(false)

  React.useEffect(() => {
    let idleCallbackId: number | null = null
    let timeoutId: number | null = window.setTimeout(() => {
      timeoutId = null

      const markReady = () => setIsReady(true)

      if ("requestIdleCallback" in window) {
        idleCallbackId = window.requestIdleCallback(markReady, {
          timeout: 4000,
        })
      } else {
        markReady()
      }
    }, DOCX_GENERATOR_DELAY_MS)

    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId)
      if (idleCallbackId !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleCallbackId)
      }
    }
  }, [])

  return isReady
}

export function useFileSystemDemoItems() {
  const [thumbnails, setThumbnails] = React.useState<
    Record<string, DemoThumbnails>
  >(() => Object.fromEntries(demoThumbnailCache))
  const canGenerateDocx = useDeferredDocxGeneration()
  const setPathThumbnails = React.useCallback(
    (path: string, urls: string[], pageCount: number) => {
      if (!demoThumbnailCache.has(path)) {
        demoThumbnailCache.set(path, { pageCount, urls })
      }
      React.startTransition(() => {
        setThumbnails((previous) =>
          previous[path]
            ? previous
            : { ...previous, [path]: { pageCount, urls } }
        )
      })
    },
    []
  )

  const items = React.useMemo<FileSystemItem[]>(
    () => [
      ...DEMO_SOURCES.map<FileSystemItem>((source) => {
        return {
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
        }
      }),
      ...AURORA_ITEMS,
    ],
    [thumbnails]
  )

  // PDF previews render on demand; data URLs are memoized per page so
  // revisiting a page is instant without shipping generated thumbnail assets.
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
        (source) =>
          source.thumbnail === "docx" &&
          canGenerateDocx &&
          !thumbnails[source.path]
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
  defaultView,
  heightClassName = "h-[680px]",
}: {
  defaultView?: FileSystemProps["defaultView"]
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
        defaultView={defaultView}
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
    url: "/samples/attention.pdf",
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
