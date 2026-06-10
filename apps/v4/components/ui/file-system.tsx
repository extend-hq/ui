"use client"

import * as React from "react"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  File01Icon,
  GalleryThumbnailsIcon,
  GridViewIcon,
  LayoutThreeColumnIcon,
  LeftToRightListBulletIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { prepareFileTreeInput } from "@pierre/trees"
import { FileTree as PierreFileTree, useFileTree } from "@pierre/trees/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { DocxViewerPreview } from "@/components/ui/docx-viewer"
import { FileThumbnail } from "@/components/ui/file-thumbnail"
import { PDFViewer } from "@/components/ui/pdf-viewer"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { XlsxViewerPreview } from "@/components/ui/xlsx-viewer"

export type FileSystemView = "icons" | "list" | "columns" | "gallery"

export type FileSystemFolderItem = {
  kind: "folder"
  /** Folder prefix, e.g. `"invoices/2026/"`. A trailing slash is added when missing. */
  path: string
  name?: string
  parentPath?: string
  /** Set when children exist but are not in `items` yet; enables `loadChildren`. */
  hasChildren?: boolean
  createdAt?: string
  updatedAt?: string
}

export type FileSystemFileItem = {
  kind: "file"
  /** Display/canonical path, e.g. `"invoices/2026/jan.pdf"`. */
  path: string
  /** Original object key (S3/R2). Defaults to `path`. */
  key?: string
  name?: string
  parentPath?: string
  contentType?: string
  size?: number
  createdAt?: string
  updatedAt?: string
  etag?: string
  /** Optional if already public/presigned. Otherwise resolved via `getFileUrl`. */
  url?: string
  /** Externally generated thumbnail. The component never renders documents itself. */
  previewImageUrl?: string | null
  /**
   * Externally generated page thumbnails (first entry is the cover). When a
   * file has more than one page, large thumbnails show a hover pager.
   */
  previewImageUrls?: string[] | null
  /**
   * Total page count when it exceeds `previewImageUrls.length`; the pager
   * loads the remaining pages on demand via `loadPreviewImageUrl`.
   */
  previewPageCount?: number
  /** Thumbnail aspect ratio (width / height). Defaults to a portrait page. */
  previewAspectRatio?: number
  metadata?: Record<string, string>
}

export type FileSystemItem = FileSystemFolderItem | FileSystemFileItem

export type FileSystemLoadChildrenArgs = {
  path: string
  cursor: string | null
}

export type FileSystemLoadChildrenResult = {
  items: FileSystemItem[]
  nextCursor?: string | null
}

export type FileSystemProps = {
  /** Flat manifest. Folders are optional; missing prefixes are inferred from file paths. */
  items: FileSystemItem[]
  className?: string
  /** Label for the root folder. */
  title?: string
  defaultView?: FileSystemView
  view?: FileSystemView
  onViewChange?: (view: FileSystemView) => void
  /** Folder prefix to open initially, e.g. `"invoices/"`. */
  defaultPath?: string
  onSelectionChange?: (item: FileSystemItem | null) => void
  /**
   * Called on file open (double-click), replacing the built-in behavior. By
   * default PDF, DOCX, XLSX, and image files open in a viewer dialog and
   * other files open their resolved URL in a new tab.
   */
  onFileOpen?: (file: FileSystemFileItem, url: string | null) => void
  /** Resolve a URL (e.g. presigned) for a file without one. */
  getFileUrl?: (file: FileSystemFileItem) => string | Promise<string>
  /** Lazily fetch children for folders with `hasChildren` and no loaded entries. */
  loadChildren?: (
    args: FileSystemLoadChildrenArgs
  ) => Promise<FileSystemLoadChildrenResult>
  /** Custom preview node for files without `previewImageUrl`. */
  renderFilePreview?: (file: FileSystemFileItem) => React.ReactNode
  /**
   * Lazily render a page thumbnail beyond the eagerly provided
   * `previewImageUrls` (the pager calls this as pages come into view).
   */
  loadPreviewImageUrl?: (
    file: FileSystemFileItem,
    pageIndex: number
  ) => Promise<string | null>
}

type FolderEntry = FileSystemFolderItem & {
  name: string
  parentPath: string
}

type FileEntry = FileSystemFileItem & {
  key: string
  name: string
  parentPath: string
}

type FileSystemEntry = FolderEntry | FileEntry

type FileSystemIndex = {
  children: Map<string, FileSystemEntry[]>
  files: Map<string, FileEntry>
  folders: Map<string, FolderEntry>
}

function normalizeFolderPath(path: string) {
  if (!path || path === "/") return ""
  return path.endsWith("/") ? path : `${path}/`
}

function pathName(path: string) {
  const trimmed = path.endsWith("/") ? path.slice(0, -1) : path
  const separatorIndex = trimmed.lastIndexOf("/")
  return separatorIndex === -1 ? trimmed : trimmed.slice(separatorIndex + 1)
}

function pathParent(path: string) {
  const trimmed = path.endsWith("/") ? path.slice(0, -1) : path
  const separatorIndex = trimmed.lastIndexOf("/")
  return separatorIndex === -1 ? "" : trimmed.slice(0, separatorIndex + 1)
}

function fileExtension(name: string) {
  const dotIndex = name.lastIndexOf(".")
  return dotIndex === -1 ? "" : name.slice(dotIndex + 1).toLowerCase()
}

const FILE_KIND_LABELS: Record<string, string> = {
  csv: "CSV Document",
  doc: "Word Document",
  docx: "Word Document",
  gif: "GIF Image",
  jpeg: "JPEG Image",
  jpg: "JPEG Image",
  md: "Markdown Document",
  pdf: "PDF Document",
  png: "PNG Image",
  ppt: "PowerPoint Presentation",
  pptx: "PowerPoint Presentation",
  svg: "SVG Image",
  tsv: "TSV Document",
  txt: "Plain Text",
  webp: "WebP Image",
  xls: "Excel Workbook",
  xlsx: "Excel Workbook",
  zip: "ZIP Archive",
}

function fileKindLabel(file: FileEntry) {
  const byExtension = FILE_KIND_LABELS[fileExtension(file.name)]

  if (byExtension) return byExtension
  if (file.contentType?.startsWith("image/")) return "Image"

  return file.contentType ?? "Document"
}

export type FileSystemViewerKind = "docx" | "image" | "pdf" | "xlsx"

function viewerKindForFile(
  file: FileSystemFileItem
): FileSystemViewerKind | null {
  if (file.contentType?.startsWith("image/")) return "image"
  if (file.contentType === "application/pdf") return "pdf"

  const name = (file.name ?? file.path).toLowerCase()

  if (name.endsWith(".pdf")) return "pdf"
  if (name.endsWith(".docx")) return "docx"
  if (name.endsWith(".xlsx")) return "xlsx"
  if (/\.(avif|gif|jpe?g|png|svg|webp)$/.test(name)) return "image"

  return null
}

// PDF and DOCX pages want height; spreadsheets want width; images get a
// roomy but contained frame.
const VIEWER_DIALOG_CLASSNAMES: Record<FileSystemViewerKind, string> = {
  docx: "h-[88vh] w-[min(96vw,68rem)] max-w-none",
  image: "max-h-[88vh] w-fit max-w-[min(96vw,64rem)]",
  pdf: "h-[88vh] w-[min(96vw,68rem)] max-w-none",
  xlsx: "h-[85vh] w-[min(96vw,100rem)] max-w-none",
}

function formatByteSize(size: number | undefined) {
  if (size === undefined) return null
  if (size < 1000) return `${size} bytes`

  const units = ["KB", "MB", "GB", "TB"]
  let value = size

  for (const unit of units) {
    value /= 1000
    if (value < 1000 || unit === "TB") {
      return `${value >= 100 ? Math.round(value) : value.toFixed(value >= 10 ? 1 : 2).replace(/\.?0+$/, "")} ${unit}`
    }
  }

  return null
}

function formatTimestamp(value: string | undefined) {
  if (!value) return null

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return null

  const day = date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })

  return `${day} at ${time}`
}

function buildFileSystemIndex(items: FileSystemItem[]): FileSystemIndex {
  const folders = new Map<string, FolderEntry>()
  const files = new Map<string, FileEntry>()

  const ensureFolderChain = (folderPath: string) => {
    let path = normalizeFolderPath(folderPath)

    while (path && !folders.has(path)) {
      folders.set(path, {
        kind: "folder",
        name: pathName(path),
        parentPath: pathParent(path),
        path,
      })
      path = pathParent(path)
    }
  }

  for (const item of items) {
    if (item.kind === "folder") {
      const path = normalizeFolderPath(item.path)

      if (!path) continue

      folders.set(path, {
        ...item,
        name: item.name ?? pathName(path),
        parentPath: normalizeFolderPath(item.parentPath ?? pathParent(path)),
        path,
      })
      ensureFolderChain(pathParent(path))
    } else {
      if (!item.path) continue

      files.set(item.path, {
        ...item,
        key: item.key ?? item.path,
        name: item.name ?? pathName(item.path),
        parentPath: normalizeFolderPath(
          item.parentPath ?? pathParent(item.path)
        ),
      })
      ensureFolderChain(pathParent(item.path))
    }
  }

  const children = new Map<string, FileSystemEntry[]>()
  const pushChild = (entry: FileSystemEntry) => {
    const siblings = children.get(entry.parentPath)

    if (siblings) {
      siblings.push(entry)
    } else {
      children.set(entry.parentPath, [entry])
    }
  }

  for (const folder of folders.values()) pushChild(folder)
  for (const file of files.values()) pushChild(file)
  for (const siblings of children.values()) {
    siblings.sort((left, right) =>
      left.name.localeCompare(right.name, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    )
  }

  return { children, files, folders }
}

function folderHasChildren(index: FileSystemIndex, folder: FolderEntry) {
  return (
    (index.children.get(folder.path)?.length ?? 0) > 0 ||
    folder.hasChildren === true
  )
}

// A single SVG source so the same glyph renders as a React element, inside the
// @pierre/trees shadow DOM (via CSS url()), and stays pixel-identical in both.
const FOLDER_GLYPH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 50" width="64" height="50"><defs><linearGradient id="fs-folder-back" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3dabf5"/><stop offset="1" stop-color="#1d84dd"/></linearGradient><linearGradient id="fs-folder-front" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#7accfb"/><stop offset="1" stop-color="#37a0ef"/></linearGradient></defs><path d="M5 10c0-3.31 2.69-6 6-6h10.9c1.6 0 3.13.7 4.18 1.9l1.5 1.73a3.5 3.5 0 0 0 2.64 1.22H54c2.76 0 5 2.24 5 5V40c0 3.87-3.13 7-7 7H12c-3.87 0-7-3.13-7-7V10Z" fill="url(#fs-folder-back)"/><path d="M5 15.5h54V40c0 3.87-3.13 7-7 7H12c-3.87 0-7-3.13-7-7V15.5Z" fill="url(#fs-folder-front)"/></svg>`

const FOLDER_GLYPH_DATA_URL = `data:image/svg+xml,${encodeURIComponent(FOLDER_GLYPH_SVG)}`

function FileSystemFolderGlyph({ className }: { className?: string }) {
  return (
    <img
      src={FOLDER_GLYPH_DATA_URL}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={className}
    />
  )
}

function escapeXmlAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function FileGenericPreview({ file }: { file: FileEntry }) {
  const extension = fileExtension(file.name)

  return (
    <div className="flex size-full flex-col items-center justify-center gap-1.5 bg-white text-neutral-400 dark:bg-neutral-100">
      <HugeiconsIcon icon={File01Icon} className="size-1/3 min-h-4 min-w-4" />
      {extension ? (
        <span className="text-[min(0.625rem,18cqw)] font-semibold tracking-wide uppercase">
          {extension}
        </span>
      ) : null}
    </div>
  )
}

function filePreviewUrls(file: FileSystemFileItem) {
  if (file.previewImageUrls?.length) return file.previewImageUrls
  return file.previewImageUrl ? [file.previewImageUrl] : []
}

// djb2 — cheap stable hash for remount keys derived from path lists.
function hashString(value: string) {
  let hash = 5381

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) | 0
  }
  return hash
}

function FileVisual({
  file,
  className,
  loadPreviewImageUrl,
  pageable = false,
  previewAspectRatio,
  previewClassName,
  renderFilePreview,
}: {
  file: FileEntry
  className?: string
  loadPreviewImageUrl?: (
    file: FileSystemFileItem,
    pageIndex: number
  ) => Promise<string | null>
  /** Show a hover pager over multi-page thumbnails. */
  pageable?: boolean
  previewAspectRatio?: number
  previewClassName?: string
  renderFilePreview?: (file: FileSystemFileItem) => React.ReactNode
}) {
  const previewUrls = filePreviewUrls(file)
  const canLoadLazily = pageable && Boolean(loadPreviewImageUrl)
  const totalPages = Math.max(
    previewUrls.length,
    canLoadLazily ? (file.previewPageCount ?? 0) : 0
  )
  const [pageIndex, setPageIndex] = React.useState(0)
  const [lazyPageUrls, setLazyPageUrls] = React.useState<
    Record<number, string>
  >({})
  const clampedPageIndex = Math.min(pageIndex, Math.max(totalPages - 1, 0))
  const previewUrl =
    previewUrls[clampedPageIndex] ?? lazyPageUrls[clampedPageIndex] ?? null
  const resolvedAspectRatio = file.previewAspectRatio ?? previewAspectRatio
  const isLazyPagePending =
    canLoadLazily && !previewUrl && clampedPageIndex < totalPages

  const fileRef = React.useRef(file)

  React.useEffect(() => {
    fileRef.current = file
  })

  React.useEffect(() => {
    setPageIndex(0)
    setLazyPageUrls({})
  }, [file.path])

  // Keyed by path (not object identity) so manifest churn doesn't re-request
  // the page already being loaded.
  React.useEffect(() => {
    if (!isLazyPagePending || !loadPreviewImageUrl) return

    let isCurrent = true

    void loadPreviewImageUrl(fileRef.current, clampedPageIndex)
      .then((url) => {
        if (isCurrent && url) {
          setLazyPageUrls((previous) => ({
            ...previous,
            [clampedPageIndex]: url,
          }))
        }
      })
      .catch(() => {})

    return () => {
      isCurrent = false
    }
  }, [clampedPageIndex, file.path, isLazyPagePending, loadPreviewImageUrl])

  const customPreview =
    !previewUrl && !isLazyPagePending ? renderFilePreview?.(file) : null
  const showPager = pageable && totalPages > 1
  const thumbnail = (
    <FileThumbnail
      file={{ name: file.name, type: file.contentType ?? "" }}
      className={cn("@container", !showPager && className)}
      previewAspectRatio={resolvedAspectRatio}
      previewClassName={cn("bg-white dark:bg-neutral-100", previewClassName)}
      previewImageUrl={previewUrl ?? undefined}
      isLoading={isLazyPagePending}
      previewContent={
        previewUrl || isLazyPagePending
          ? undefined
          : (customPreview ?? <FileGenericPreview file={file} />)
      }
    />
  )

  if (!showPager) return thumbnail

  return (
    <div className={cn("group/pager relative", className)}>
      {thumbnail}
      <div className="absolute inset-x-0 bottom-1.5 flex items-center justify-center gap-1 opacity-0 transition-opacity group-focus-within/pager:opacity-100 group-hover/pager:opacity-100">
        <button
          type="button"
          aria-label="Previous page"
          disabled={clampedPageIndex === 0}
          onClick={(event) => {
            event.stopPropagation()
            setPageIndex((previous) => Math.max(0, previous - 1))
          }}
          onDoubleClick={(event) => event.stopPropagation()}
          className="flex size-6 items-center justify-center rounded-md bg-background/80 text-foreground shadow-xs backdrop-blur-sm transition-colors outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
        </button>
        <span className="rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums shadow-xs backdrop-blur-sm">
          {clampedPageIndex + 1}/{totalPages}
        </span>
        <button
          type="button"
          aria-label="Next page"
          disabled={clampedPageIndex >= totalPages - 1}
          onClick={(event) => {
            event.stopPropagation()
            setPageIndex((previous) => Math.min(totalPages - 1, previous + 1))
          }}
          onDoubleClick={(event) => event.stopPropagation()}
          className="flex size-6 items-center justify-center rounded-md bg-background/80 text-foreground shadow-xs backdrop-blur-sm transition-colors outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

const VIEW_OPTIONS: Array<{
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"]
  label: string
  value: FileSystemView
}> = [
  { icon: GridViewIcon, label: "Grid", value: "icons" },
  { icon: LeftToRightListBulletIcon, label: "List", value: "list" },
  { icon: LayoutThreeColumnIcon, label: "Columns", value: "columns" },
  { icon: GalleryThumbnailsIcon, label: "Gallery", value: "gallery" },
]

export function FileSystem({
  items,
  className,
  title = "Files",
  defaultView = "icons",
  view: viewProp,
  onViewChange,
  defaultPath = "",
  onSelectionChange,
  onFileOpen,
  getFileUrl,
  loadChildren,
  loadPreviewImageUrl,
  renderFilePreview,
}: FileSystemProps) {
  const [internalView, setInternalView] = React.useState(defaultView)
  const view = viewProp ?? internalView
  const setView = React.useCallback(
    (nextView: FileSystemView) => {
      setInternalView(nextView)
      onViewChange?.(nextView)
    },
    [onViewChange]
  )

  const [loadedItems, setLoadedItems] = React.useState<FileSystemItem[]>([])
  const allItems = React.useMemo(
    () => (loadedItems.length ? [...items, ...loadedItems] : items),
    [items, loadedItems]
  )
  const index = React.useMemo(() => buildFileSystemIndex(allItems), [allItems])

  const [history, setHistory] = React.useState(() => ({
    index: 0,
    stack: [normalizeFolderPath(defaultPath)],
  }))
  const currentPath = history.stack[history.index] ?? ""
  const canGoBack = history.index > 0
  const canGoForward = history.index < history.stack.length - 1

  const [selectedPath, setSelectedPath] = React.useState<string | null>(null)
  const selectedEntry = React.useMemo(() => {
    if (selectedPath === null) return null

    return (
      index.files.get(selectedPath) ?? index.folders.get(selectedPath) ?? null
    )
  }, [index, selectedPath])

  const selectEntry = React.useCallback(
    (entry: FileSystemEntry | null) => {
      setSelectedPath(entry?.path ?? null)
      onSelectionChange?.(entry)
    },
    [onSelectionChange]
  )

  // Below this width the tabs view switcher no longer fits in the toolbar.
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const [isCompact, setIsCompact] = React.useState(false)

  React.useEffect(() => {
    const root = rootRef.current

    if (!root || typeof ResizeObserver === "undefined") return

    const observer = new ResizeObserver((observerEntries) => {
      const width = observerEntries[0]?.contentRect.width

      if (width !== undefined) setIsCompact(width < 480)
    })

    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  const requestedFoldersRef = React.useRef(new Set<string>())
  const [loadingFolders, setLoadingFolders] = React.useState<Set<string>>(
    () => new Set()
  )
  const ensureChildren = React.useCallback(
    (folderPath: string) => {
      if (!loadChildren) return

      const folder = index.folders.get(folderPath)

      if (!folder?.hasChildren) return
      if (index.children.get(folderPath)?.length) return
      if (requestedFoldersRef.current.has(folderPath)) return

      requestedFoldersRef.current.add(folderPath)
      setLoadingFolders((previous) => new Set(previous).add(folderPath))

      void (async () => {
        try {
          let cursor: string | null = null

          do {
            const result = await loadChildren({ cursor, path: folderPath })

            if (result.items.length) {
              setLoadedItems((previous) => [...previous, ...result.items])
            }
            cursor = result.nextCursor ?? null
          } while (cursor)
        } catch {
          requestedFoldersRef.current.delete(folderPath)
        } finally {
          setLoadingFolders((previous) => {
            const next = new Set(previous)

            next.delete(folderPath)
            return next
          })
        }
      })()
    },
    [index, loadChildren]
  )

  const navigateTo = React.useCallback(
    (folderPath: string) => {
      const path = normalizeFolderPath(folderPath)

      setHistory((previous) => {
        if (previous.stack[previous.index] === path) return previous

        const stack = [...previous.stack.slice(0, previous.index + 1), path]

        return { index: stack.length - 1, stack }
      })
      selectEntry(null)
      ensureChildren(path)
    },
    [ensureChildren, selectEntry]
  )

  React.useEffect(() => {
    ensureChildren(currentPath)
  }, [currentPath, ensureChildren])

  // Navigation unmounts the focused row, dropping focus to <body> and killing
  // the ⌘ shortcuts; reclaim focus onto the component root when that happens.
  const hasNavigatedRef = React.useRef(false)

  React.useEffect(() => {
    if (!hasNavigatedRef.current) {
      hasNavigatedRef.current = true
      return
    }

    const root = rootRef.current

    if (root && document.activeElement === document.body) {
      root.focus()
    }
  }, [currentPath])

  const [openedFile, setOpenedFile] = React.useState<{
    file: FileEntry
    kind: FileSystemViewerKind
    url: string
  } | null>(null)

  const openFile = React.useCallback(
    (file: FileEntry) => {
      void (async () => {
        let url = file.url ?? null

        if (!url && getFileUrl) {
          try {
            url = await getFileUrl(file)
          } catch {
            url = null
          }
        }
        if (onFileOpen) {
          onFileOpen(file, url)
          return
        }

        const kind = viewerKindForFile(file)

        if (kind && url) {
          setOpenedFile({ file, kind, url })
        } else if (url && typeof window !== "undefined") {
          window.open(url, "_blank", "noopener,noreferrer")
        }
      })()
    },
    [getFileUrl, onFileOpen]
  )

  const openEntry = React.useCallback(
    (entry: FileSystemEntry) => {
      if (entry.kind === "folder") {
        navigateTo(entry.path)
      } else {
        openFile(entry)
      }
    },
    [navigateTo, openFile]
  )

  // Selecting a lazy folder (columns view, keyboard nav) prefetches children.
  const selectAndPrefetchEntry = React.useCallback(
    (entry: FileSystemEntry | null) => {
      selectEntry(entry)
      if (entry?.kind === "folder") ensureChildren(entry.path)
    },
    [ensureChildren, selectEntry]
  )

  const goBack = React.useCallback(() => {
    setHistory((previous) => ({
      ...previous,
      index: Math.max(0, previous.index - 1),
    }))
    selectEntry(null)
  }, [selectEntry])

  const goForward = React.useCallback(() => {
    setHistory((previous) => ({
      ...previous,
      index: Math.min(previous.stack.length - 1, previous.index + 1),
    }))
    selectEntry(null)
  }, [selectEntry])

  const currentEntries = index.children.get(currentPath) ?? []
  const currentFolderName =
    currentPath === "" ? title : pathName(currentPath) || title
  const isLoadingCurrentFolder = loadingFolders.has(currentPath)

  const viewProps: FileSystemViewProps = {
    currentPath,
    entries: currentEntries,
    getFileUrl,
    index,
    loadPreviewImageUrl,
    loadingFolders,
    onOpen: openEntry,
    onSelect: selectAndPrefetchEntry,
    renderFilePreview,
    selectedEntry,
    selectedPath,
  }

  const openedFileName = openedFile
    ? (openedFile.file.name ?? openedFile.file.path)
    : ""
  const activeViewOption = VIEW_OPTIONS.find((option) => option.value === view)
  const viewerCloseToolbarAction = (
    <DialogClose
      aria-label="Close preview"
      render={<Button type="button" variant="ghost" size="icon-sm" />}
    >
      <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
    </DialogClose>
  )

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className={cn(
        "flex h-[480px] min-h-0 flex-col overflow-hidden rounded-xl border bg-background text-foreground outline-none",
        className
      )}
    >
      <div className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b bg-muted/40 px-2">
        <div className="flex min-w-0 items-center gap-0.5">
          <button
            type="button"
            aria-label="Back"
            title="Back"
            disabled={!canGoBack}
            onClick={goBack}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4.5" />
          </button>
          <button
            type="button"
            aria-label="Forward"
            title="Forward"
            disabled={!canGoForward}
            onClick={goForward}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-4.5" />
          </button>
          <span className="ml-1.5 truncate text-sm font-semibold">
            {currentFolderName}
          </span>
        </div>
        {isCompact ? (
          <Select
            value={view}
            onValueChange={(value) => setView(value as FileSystemView)}
          >
            <SelectTrigger size="sm" aria-label="View" className="min-w-32">
              <SelectValue>
                {activeViewOption ? (
                  <span className="flex items-center gap-2">
                    <HugeiconsIcon
                      icon={activeViewOption.icon}
                      className="size-4"
                    />
                    {activeViewOption.label}
                  </span>
                ) : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {VIEW_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center gap-2">
                    <HugeiconsIcon icon={option.icon} className="size-4" />
                    {option.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Tabs
            value={view}
            onValueChange={(value) => setView(value as FileSystemView)}
            className="gap-0"
          >
            <TabsList className="h-8 p-0.5">
              {VIEW_OPTIONS.map((option) => (
                <TabsTrigger
                  key={option.value}
                  value={option.value}
                  aria-label={`${option.label} view`}
                  title={option.label}
                  className="h-7 grow-0 px-2.5 sm:h-7"
                >
                  <HugeiconsIcon icon={option.icon} className="size-4" />
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
        <div />
      </div>
      <div className="relative min-h-0 flex-1">
        {isLoadingCurrentFolder && currentEntries.length === 0 ? (
          <FileSystemEmptyState label="Loading…" isLoading />
        ) : currentEntries.length === 0 && view !== "columns" ? (
          <FileSystemEmptyState label="This folder is empty" />
        ) : view === "icons" ? (
          <FileSystemIconsView {...viewProps} />
        ) : view === "list" ? (
          <FileSystemListView {...viewProps} />
        ) : view === "columns" ? (
          <FileSystemColumnsView {...viewProps} />
        ) : (
          <FileSystemGalleryView {...viewProps} />
        )}
      </div>
      <div
        aria-live="polite"
        className="flex h-7 shrink-0 items-center justify-center gap-1 border-t bg-muted/40 px-3 text-xs text-muted-foreground"
      >
        <span>
          {currentEntries.length}{" "}
          {currentEntries.length === 1 ? "item" : "items"}
        </span>
        {selectedEntry ? <span>· “{selectedEntry.name}” selected</span> : null}
      </div>
      <Dialog
        open={openedFile !== null}
        onOpenChange={(open) => {
          if (!open) setOpenedFile(null)
        }}
      >
        {openedFile ? (
          <DialogContent
            className={cn(
              "overflow-hidden p-0",
              VIEWER_DIALOG_CLASSNAMES[openedFile.kind]
            )}
            showCloseButton={openedFile.kind === "image"}
          >
            <DialogTitle className="sr-only">{openedFileName}</DialogTitle>
            {openedFile.kind === "pdf" ? (
              <PDFViewer
                file={openedFile.url}
                className="h-full min-h-0 flex-1 overflow-hidden rounded-2xl"
                downloadFileName={openedFileName}
                showUpload={false}
                toolbarActions={viewerCloseToolbarAction}
              />
            ) : openedFile.kind === "docx" ? (
              <DocxViewerPreview
                src={openedFile.url}
                fileName={openedFileName}
                className="h-full min-h-0 flex-1"
                rounded
                showUpload={false}
                toolbarActions={viewerCloseToolbarAction}
              />
            ) : openedFile.kind === "xlsx" ? (
              <XlsxViewerPreview
                src={openedFile.url}
                fileName={openedFileName}
                className="h-full min-h-0 flex-1"
                rounded
                showUpload={false}
                toolbarActions={viewerCloseToolbarAction}
              />
            ) : (
              <img
                src={openedFile.url}
                alt={openedFileName}
                className="max-h-[88vh] w-auto max-w-full rounded-2xl object-contain"
              />
            )}
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  )
}

type FileSystemViewProps = {
  currentPath: string
  entries: FileSystemEntry[]
  getFileUrl?: (file: FileSystemFileItem) => string | Promise<string>
  index: FileSystemIndex
  loadPreviewImageUrl?: (
    file: FileSystemFileItem,
    pageIndex: number
  ) => Promise<string | null>
  loadingFolders: Set<string>
  onOpen: (entry: FileSystemEntry) => void
  onSelect: (entry: FileSystemEntry | null) => void
  renderFilePreview?: (file: FileSystemFileItem) => React.ReactNode
  selectedEntry: FileSystemEntry | null
  selectedPath: string | null
}

// Resolves a display URL for a file: its own `url`, else via `getFileUrl`.
// Keyed by path/url (not object identity) so manifest churn — e.g. thumbnails
// streaming in — doesn't re-trigger presign calls for the same file.
function useResolvedFileUrl(
  file: FileEntry | null,
  getFileUrl?: (file: FileSystemFileItem) => string | Promise<string>
) {
  const [resolvedUrl, setResolvedUrl] = React.useState<string | null>(
    file?.url ?? null
  )
  const fileRef = React.useRef(file)

  React.useEffect(() => {
    fileRef.current = file
  })

  const filePath = file?.path ?? null
  const fileUrl = file?.url ?? null

  React.useEffect(() => {
    const currentFile = fileRef.current

    if (!currentFile || fileUrl) {
      setResolvedUrl(fileUrl)
      return
    }
    if (!getFileUrl) {
      setResolvedUrl(null)
      return
    }

    let isCurrent = true

    setResolvedUrl(null)
    void Promise.resolve(getFileUrl(currentFile))
      .then((url) => {
        if (isCurrent) setResolvedUrl(url)
      })
      .catch(() => {})

    return () => {
      isCurrent = false
    }
  }, [filePath, fileUrl, getFileUrl])

  return resolvedUrl
}

function FileSystemEmptyState({
  label,
  isLoading = false,
}: {
  label: string
  isLoading?: boolean
}) {
  return (
    <div
      className={cn(
        "flex size-full items-center justify-center text-sm text-muted-foreground",
        isLoading && "animate-pulse motion-reduce:animate-none"
      )}
    >
      {label}
    </div>
  )
}

const ARROW_KEYS = new Set(["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp"])

// Selects (and focuses) the entry reached by an arrow key. Up/down use row
// geometry so navigation follows the rendered auto-fill grid.
function moveGridSelection({
  entries,
  itemRefs,
  key,
  onSelect,
  selectedPath,
}: {
  entries: FileSystemEntry[]
  itemRefs: Map<string, HTMLButtonElement>
  key: string
  onSelect: (entry: FileSystemEntry | null) => void
  selectedPath: string | null
}) {
  if (entries.length === 0) return false

  const currentIndex = entries.findIndex((entry) => entry.path === selectedPath)
  let nextEntry: FileSystemEntry | undefined

  if (currentIndex === -1) {
    nextEntry = entries[0]
  } else if (key === "ArrowLeft" || key === "ArrowRight") {
    nextEntry = entries[currentIndex + (key === "ArrowLeft" ? -1 : 1)]
  } else {
    const currentElement = itemRefs.get(entries[currentIndex].path)

    if (!currentElement) return false

    const currentRect = currentElement.getBoundingClientRect()
    let bestScore = Infinity

    for (const entry of entries) {
      if (entry.path === selectedPath) continue

      const rect = itemRefs.get(entry.path)?.getBoundingClientRect()

      if (!rect) continue

      const rowDelta =
        key === "ArrowDown"
          ? rect.top - currentRect.top
          : currentRect.top - rect.top

      if (rowDelta <= 1) continue

      const score = rowDelta * 1000 + Math.abs(rect.left - currentRect.left)

      if (score < bestScore) {
        bestScore = score
        nextEntry = entry
      }
    }
  }

  if (!nextEntry) return false

  onSelect(nextEntry)
  itemRefs.get(nextEntry.path)?.focus()
  return true
}

function FileSystemIconsView({
  entries,
  onOpen,
  onSelect,
  renderFilePreview,
  selectedPath,
}: FileSystemViewProps) {
  const itemRefs = React.useRef(new Map<string, HTMLButtonElement>())

  return (
    <ScrollArea
      orientation="vertical"
      viewportClassName="p-3"
      viewportProps={{
        onClick: (event) => {
          if (event.target === event.currentTarget) onSelect(null)
        },
      }}
    >
      <div
        role="listbox"
        aria-label="Files"
        className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-x-1 gap-y-3"
        onKeyDown={(event) => {
          if (!ARROW_KEYS.has(event.key)) return
          if (
            moveGridSelection({
              entries,
              itemRefs: itemRefs.current,
              key: event.key,
              onSelect,
              selectedPath,
            })
          ) {
            event.preventDefault()
          }
        }}
      >
        {entries.map((entry) => {
          const isSelected = entry.path === selectedPath

          return (
            <button
              key={entry.path}
              type="button"
              role="option"
              aria-selected={isSelected}
              ref={(element) => {
                if (element) {
                  itemRefs.current.set(entry.path, element)
                } else {
                  itemRefs.current.delete(entry.path)
                }
              }}
              onClick={() => onSelect(entry)}
              onDoubleClick={() => onOpen(entry)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onOpen(entry)
              }}
              className="group flex flex-col items-center gap-1.5 outline-none"
            >
              <span
                className={cn(
                  "flex h-16 w-20 items-center justify-center rounded-lg p-1 transition-colors group-focus-visible:ring-2 group-focus-visible:ring-ring",
                  isSelected && "bg-accent"
                )}
              >
                {entry.kind === "folder" ? (
                  <FileSystemFolderGlyph className="h-13 w-auto drop-shadow-sm" />
                ) : (
                  <FileVisual
                    file={entry}
                    className={cn(
                      "rounded-sm shadow-xs",
                      // Landscape thumbnails get extra width so they fill
                      // the tile instead of rendering as a short sliver.
                      (entry.previewAspectRatio ?? 0.78) > 1.2
                        ? "w-[4.75rem]"
                        : "w-12"
                    )}
                    previewAspectRatio={0.78}
                    renderFilePreview={renderFilePreview}
                  />
                )}
              </span>
              <span
                className={cn(
                  "max-w-full rounded-sm px-1.5 py-px text-center text-xs leading-tight break-words",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground"
                )}
              >
                <span className="line-clamp-2">{entry.name}</span>
              </span>
            </button>
          )
        })}
      </div>
    </ScrollArea>
  )
}

function FileSystemListView({
  currentPath,
  index,
  onOpen,
  onSelect,
  selectedPath,
}: FileSystemViewProps) {
  const relativePaths = React.useMemo(() => {
    const paths: string[] = []

    for (const path of index.files.keys()) {
      if (currentPath === "" || path.startsWith(currentPath)) {
        const relativePath = path.slice(currentPath.length)

        if (relativePath) paths.push(relativePath)
      }
    }
    return paths.sort()
  }, [currentPath, index])
  // Content-derived key: the tree only remounts when the path set actually
  // changes (a bare length check misses same-count replacements).
  const treeKey = React.useMemo(
    () => hashString(relativePaths.join("\n")),
    [relativePaths]
  )

  if (relativePaths.length === 0) {
    return <FileSystemEmptyState label="This folder is empty" />
  }

  return (
    <div className="flex size-full flex-col">
      {/* Paddings match the tree's row geometry: name text starts 46px in
          (16px tree padding + 30px icon lane), metadata ends 24px from the
          right (16px tree padding + 8px decoration inset). */}
      <div className="flex shrink-0 items-center border-b py-1.5 pr-6 pl-[46px] text-xs font-medium text-muted-foreground">
        <span className="flex-1">Name</span>
        <span className="w-44 text-right">Date Modified</span>
        <span className="w-20 text-right">Size</span>
      </div>
      <FileSystemPierreTree
        key={`${currentPath}::${treeKey}`}
        currentPath={currentPath}
        index={index}
        initialSelectedPath={
          selectedPath?.startsWith(currentPath)
            ? selectedPath.slice(currentPath.length).replace(/\/$/, "")
            : null
        }
        onOpen={onOpen}
        onSelect={onSelect}
        relativePaths={relativePaths}
      />
    </div>
  )
}

function FileSystemPierreTree({
  currentPath,
  index,
  initialSelectedPath,
  onOpen,
  onSelect,
  relativePaths,
}: {
  currentPath: string
  index: FileSystemIndex
  initialSelectedPath: string | null
  onOpen: (entry: FileSystemEntry) => void
  onSelect: (entry: FileSystemEntry | null) => void
  relativePaths: string[]
}) {
  const preparedInput = React.useMemo(
    () => prepareFileTreeInput(relativePaths, { sort: "default" }),
    [relativePaths]
  )
  // Inject per-file thumbnails into the tree's shadow DOM as sprite symbols
  // wrapping an <image>, remapped onto rows by file basename. The chevron is
  // remapped to the Hugeicons arrow so it matches the rest of the component;
  // the tree's rotation CSS keys off data-icon-name, which remapping keeps.
  const icons = React.useMemo(() => {
    const byFileName: Record<string, { name: string; viewBox: string }> = {}
    const symbols: string[] = [
      `<symbol id="file-system-chevron" viewBox="0 0 24 24"><path d="M18 9.00005C18 9.00005 13.5811 15 12 15C10.4188 15 6 9 6 9" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></symbol>`,
    ]

    for (const relativePath of relativePaths) {
      const file = index.files.get(`${currentPath}${relativePath}`)
      const coverUrl = file ? filePreviewUrls(file)[0] : undefined

      if (!file || !coverUrl) continue

      const baseName = file.name.toLowerCase()

      if (byFileName[baseName]) continue

      const symbolId = `file-system-thumbnail-${symbols.length}`

      symbols.push(
        `<symbol id="${symbolId}" viewBox="0 0 16 16"><clipPath id="${symbolId}-clip"><rect width="16" height="16" rx="2.5"/></clipPath><image href="${escapeXmlAttribute(coverUrl)}" width="16" height="16" preserveAspectRatio="xMidYMid slice" clip-path="url(#${symbolId}-clip)"/></symbol>`
      )
      byFileName[baseName] = { name: symbolId, viewBox: "0 0 16 16" }
    }

    return {
      byFileName,
      remap: {
        "file-tree-icon-chevron": {
          name: "file-system-chevron",
          viewBox: "0 0 24 24",
        },
      },
      spriteSheet: `<svg data-icon-sprite aria-hidden="true" width="0" height="0">${symbols.join("")}</svg>`,
    }
  }, [currentPath, index, relativePaths])
  const { model } = useFileTree({
    flattenEmptyDirectories: false,
    icons,
    initialExpansion: "closed",
    initialSelectedPaths: initialSelectedPath ? [initialSelectedPath] : [],
    itemHeight: 28,
    overscan: 12,
    preparedInput,
    renderRowDecoration: ({ row }) => {
      const entry =
        row.kind === "file"
          ? index.files.get(`${currentPath}${row.path}`)
          : index.folders.get(normalizeFolderPath(`${currentPath}${row.path}`))

      if (!entry) return null

      // The decoration lane renders one <span title>; CSS splits it into
      // aligned Date Modified (::before from title) and Size columns.
      const dateColumn =
        formatTimestamp(entry.updatedAt ?? entry.createdAt) ?? "—"

      if (entry.kind === "folder") {
        const childCount = index.children.get(entry.path)?.length

        return {
          text:
            childCount === undefined
              ? "—"
              : `${childCount} ${childCount === 1 ? "item" : "items"}`,
          title: dateColumn,
        }
      }

      return { text: formatByteSize(entry.size) ?? "—", title: dateColumn }
    },
    unsafeCSS: `
      button[data-type='item']:not([data-item-selected]):hover {
        background: color-mix(in oklab, var(--color-accent) 50%, transparent);
      }
      button[data-type='item'][data-item-selected] {
        background: var(--color-primary);
        color: var(--color-primary-foreground);
      }
      button[data-type='item'][data-item-selected] *,
      button[data-type='item'][data-item-selected] [data-item-section]::before,
      button[data-type='item'][data-item-selected] svg {
        color: var(--color-primary-foreground) !important;
      }
      [data-item-section='decoration'] > span {
        display: grid;
        grid-template-columns: 11rem 5rem;
        justify-items: end;
        white-space: nowrap;
      }
      [data-item-section='decoration'] > span::before {
        content: attr(title);
      }
      button[data-type='item'][data-item-type='folder'] [data-item-section='content'] {
        display: flex;
        align-items: center;
        min-width: 0;
      }
      button[data-type='item'][data-item-type='folder'] [data-item-section='content']::before {
        content: "";
        flex: none;
        width: 18px;
        height: 14px;
        margin-right: 4px;
        background: url("${FOLDER_GLYPH_DATA_URL}") center / contain no-repeat;
      }
    `,
    onSelectionChange: (selectedPaths) => {
      const relativePath = selectedPaths[0]

      if (!relativePath) {
        onSelect(null)
        return
      }

      const absolutePath = `${currentPath}${relativePath}`
      const entry =
        index.files.get(absolutePath) ??
        index.folders.get(normalizeFolderPath(absolutePath)) ??
        null

      onSelect(entry)
    },
  })

  // Thumbnails can resolve after mount (e.g. generated client-side); push
  // sprite updates into the existing model instead of remounting the tree.
  React.useEffect(() => {
    model.setIcons(icons)
  }, [icons, model])

  return (
    <PierreFileTree
      model={model}
      className="block min-h-0 flex-1"
      onDoubleClick={(event) => {
        // Rows live in the tree's shadow DOM; composedPath surfaces the row
        // element so double-clicked files open like in the other views.
        for (const target of event.nativeEvent.composedPath()) {
          if (!(target instanceof HTMLElement)) continue
          const relativePath = target.dataset?.itemPath
          if (!relativePath) continue

          const file = index.files.get(`${currentPath}${relativePath}`)

          if (file) onOpen(file)
          return
        }
      }}
      style={
        {
          "--trees-bg-override": "transparent",
          "--trees-border-color-override": "var(--color-border)",
          "--trees-fg-override": "var(--color-foreground)",
          "--trees-selected-bg-override": "var(--color-primary)",
        } as React.CSSProperties
      }
    />
  )
}

function FileSystemColumnsView(props: FileSystemViewProps) {
  const {
    currentPath,
    index,
    loadPreviewImageUrl,
    loadingFolders,
    onOpen,
    onSelect,
    renderFilePreview,
    selectedEntry,
    selectedPath,
  } = props
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null)
  const rowRefs = React.useRef(new Map<string, HTMLButtonElement>())

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!ARROW_KEYS.has(event.key)) return

    let nextEntry: FileSystemEntry | null | undefined

    if (!selectedEntry || !selectedPath?.startsWith(currentPath)) {
      nextEntry = index.children.get(currentPath)?.[0]
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const siblings = index.children.get(selectedEntry.parentPath) ?? []
      const currentIndex = siblings.findIndex(
        (sibling) => sibling.path === selectedEntry.path
      )

      nextEntry = siblings[currentIndex + (event.key === "ArrowUp" ? -1 : 1)]
    } else if (event.key === "ArrowLeft") {
      if (selectedEntry.parentPath !== currentPath) {
        nextEntry = index.folders.get(selectedEntry.parentPath)
      }
    } else if (selectedEntry.kind === "folder") {
      nextEntry = index.children.get(selectedEntry.path)?.[0]
    }

    if (!nextEntry) return

    onSelect(nextEntry)
    rowRefs.current.get(nextEntry.path)?.focus()
    event.preventDefault()
  }

  const columnPaths = React.useMemo(() => {
    const paths = [currentPath]

    if (!selectedPath?.startsWith(currentPath)) return paths

    const targetFolder =
      selectedEntry?.kind === "folder"
        ? selectedEntry.path
        : (selectedEntry?.parentPath ?? currentPath)
    const relativePath = targetFolder.slice(currentPath.length)
    let walkedPath = currentPath

    for (const segment of relativePath.split("/")) {
      if (!segment) continue
      walkedPath = `${walkedPath}${segment}/`
      paths.push(walkedPath)
    }
    return paths
  }, [currentPath, selectedEntry, selectedPath])
  const columnPathSet = React.useMemo(() => new Set(columnPaths), [columnPaths])
  const selectedFile =
    selectedEntry?.kind === "file" ? (selectedEntry as FileEntry) : null
  const selectedFileSize = selectedFile
    ? formatByteSize(selectedFile.size)
    : null

  React.useEffect(() => {
    const container = scrollContainerRef.current

    if (container) container.scrollLeft = container.scrollWidth
  }, [columnPaths.length, selectedPath])

  return (
    <ScrollArea
      orientation="horizontal"
      viewportRef={scrollContainerRef}
      viewportClassName="overscroll-x-contain"
    >
      <div className="flex h-full w-max min-w-full" onKeyDown={handleKeyDown}>
        {columnPaths.map((columnPath) => (
          <ScrollArea
            key={columnPath || "(root)"}
            orientation="vertical"
            className="w-60 shrink-0 border-r"
            viewportClassName="flex flex-col gap-px p-1.5"
            viewportProps={{ "aria-label": "Files", role: "listbox" }}
          >
            {loadingFolders.has(columnPath) &&
            !index.children.get(columnPath)?.length ? (
              <div className="animate-pulse px-2 py-1.5 text-xs text-muted-foreground motion-reduce:animate-none">
                Loading…
              </div>
            ) : (
              (index.children.get(columnPath) ?? []).map((entry) => {
                const isSelected = entry.path === selectedPath
                const isOnTrail =
                  entry.kind === "folder" && columnPathSet.has(entry.path)

                const coverUrl =
                  entry.kind === "file" ? filePreviewUrls(entry)[0] : undefined

                return (
                  <button
                    key={entry.path}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    ref={(element) => {
                      if (element) {
                        rowRefs.current.set(entry.path, element)
                      } else {
                        rowRefs.current.delete(entry.path)
                      }
                    }}
                    onClick={() => onSelect(entry)}
                    onDoubleClick={() => onOpen(entry)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") onOpen(entry)
                    }}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-md px-2 py-1 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : isOnTrail
                          ? "bg-accent"
                          : "hover:bg-accent/50"
                    )}
                  >
                    {entry.kind === "folder" ? (
                      <FileSystemFolderGlyph className="h-3.5 w-auto shrink-0" />
                    ) : coverUrl ? (
                      <img
                        src={coverUrl}
                        alt=""
                        draggable={false}
                        className="size-4 shrink-0 rounded-[3px] bg-white object-cover"
                      />
                    ) : (
                      <HugeiconsIcon
                        icon={File01Icon}
                        className={cn(
                          "size-4 shrink-0",
                          !isSelected && "text-muted-foreground"
                        )}
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      {entry.name}
                    </span>
                    {entry.kind === "folder" &&
                    folderHasChildren(index, entry) ? (
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        className={cn(
                          "size-3.5 shrink-0",
                          !isSelected && "text-muted-foreground/60"
                        )}
                      />
                    ) : null}
                  </button>
                )
              })
            )}
          </ScrollArea>
        ))}
        {selectedFile ? (
          <ScrollArea
            orientation="vertical"
            className="min-w-72 flex-1"
            viewportClassName="flex justify-center p-4"
          >
            <div className="flex w-full max-w-lg flex-col items-stretch gap-3">
              {/* Width derives from the aspect ratio so the thumbnail grows
                  with the pane up to a 20rem height cap. */}
              <div
                className="mx-auto w-full shrink-0"
                style={{
                  maxWidth: `min(100%, ${(selectedFile.previewAspectRatio ?? 0.78) * 20}rem)`,
                }}
              >
                <FileVisual
                  file={selectedFile}
                  className="w-full"
                  loadPreviewImageUrl={loadPreviewImageUrl}
                  pageable
                  previewAspectRatio={0.78}
                  renderFilePreview={renderFilePreview}
                />
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold break-words">
                  {selectedFile.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {fileKindLabel(selectedFile)}
                  {selectedFileSize ? ` - ${selectedFileSize}` : null}
                </div>
              </div>
              <FileSystemInformation entry={selectedFile} index={index} />
            </div>
          </ScrollArea>
        ) : null}
      </div>
    </ScrollArea>
  )
}

function FileSystemInformation({
  entry,
  index,
}: {
  entry: FileSystemEntry
  index: FileSystemIndex
}) {
  const rows: Array<[string, string]> = []
  const created = formatTimestamp(entry.createdAt)
  const updated = formatTimestamp(entry.updatedAt)

  if (created) rows.push(["Created", created])
  if (updated) rows.push(["Modified", updated])
  if (entry.kind === "file") {
    const size = formatByteSize(entry.size)

    if (size) rows.push(["Size", size])
  } else {
    const childCount = index.children.get(entry.path)?.length

    if (childCount !== undefined) {
      rows.push(["Items", `${childCount}`])
    }
  }

  if (rows.length === 0) return null

  return (
    <div className="border-t pt-3">
      <div className="mb-1.5 text-xs font-semibold">Information</div>
      <dl className="space-y-1">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-3 text-xs"
          >
            <dt className="shrink-0 text-muted-foreground">{label}</dt>
            <dd className="text-right" suppressHydrationWarning>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function FileSystemGalleryView(props: FileSystemViewProps) {
  const {
    entries,
    getFileUrl,
    index,
    loadPreviewImageUrl,
    onOpen,
    onSelect,
    renderFilePreview,
    selectedEntry,
    selectedPath,
  } = props
  const stripRefs = React.useRef(new Map<string, HTMLButtonElement>())
  const activeEntry =
    selectedEntry && entries.some((entry) => entry.path === selectedEntry.path)
      ? selectedEntry
      : (entries[0] ?? null)
  const activeFile = activeEntry?.kind === "file" ? activeEntry : null
  const activeViewerKind = activeFile ? viewerKindForFile(activeFile) : null
  const activeFileUrl = useResolvedFileUrl(activeFile, getFileUrl)
  const activeFileSize = activeFile ? formatByteSize(activeFile.size) : null

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
    if (entries.length === 0) return

    const currentIndex = activeEntry
      ? entries.findIndex((entry) => entry.path === activeEntry.path)
      : -1
    const nextEntry =
      entries[
        currentIndex === -1
          ? 0
          : currentIndex + (event.key === "ArrowLeft" ? -1 : 1)
      ]

    if (!nextEntry) return

    onSelect(nextEntry)
    stripRefs.current.get(nextEntry.path)?.focus()
    event.preventDefault()
  }

  return (
    <div className="flex size-full flex-col" onKeyDown={handleKeyDown}>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center p-3">
          {activeEntry ? (
            activeEntry.kind === "folder" ? (
              <FileSystemFolderGlyph className="h-40 max-h-full w-auto drop-shadow-md" />
            ) : activeViewerKind === "image" && activeFileUrl ? (
              <img
                src={activeFileUrl}
                alt={activeEntry.name}
                className="max-h-full max-w-full rounded-lg object-contain"
              />
            ) : activeViewerKind === "pdf" && activeFileUrl ? (
              <div className="size-full overflow-hidden rounded-lg border">
                <PDFViewer
                  key={activeEntry.path}
                  file={activeFileUrl}
                  className="h-full"
                  showToolbar={false}
                />
              </div>
            ) : activeViewerKind === "docx" && activeFileUrl ? (
              <div className="size-full overflow-hidden rounded-lg border">
                <DocxViewerPreview
                  key={activeEntry.path}
                  src={activeFileUrl}
                  fileName={activeEntry.name}
                  className="h-full"
                  showToolbar={false}
                />
              </div>
            ) : activeViewerKind === "xlsx" && activeFileUrl ? (
              <div className="size-full overflow-hidden rounded-lg border">
                <XlsxViewerPreview
                  key={activeEntry.path}
                  src={activeFileUrl}
                  fileName={activeEntry.name}
                  className="h-full"
                  showToolbar={false}
                />
              </div>
            ) : (
              <FileVisual
                file={activeEntry}
                className="w-56 max-w-full"
                loadPreviewImageUrl={loadPreviewImageUrl}
                pageable
                previewAspectRatio={0.78}
                renderFilePreview={renderFilePreview}
              />
            )
          ) : null}
        </div>
        {activeEntry ? (
          <ScrollArea
            orientation="vertical"
            className="hidden w-64 shrink-0 border-l sm:block"
            viewportClassName="flex flex-col gap-3 p-4"
          >
            <div className="flex items-center gap-3">
              {activeFile ? (
                <FileVisual
                  file={activeFile}
                  className={cn(
                    "shrink-0 rounded-sm",
                    (activeFile.previewAspectRatio ?? 0.78) > 1.2
                      ? "w-16"
                      : "w-9"
                  )}
                  previewAspectRatio={0.78}
                  renderFilePreview={renderFilePreview}
                />
              ) : (
                <FileSystemFolderGlyph className="h-8 w-auto shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold break-words">
                  {activeEntry.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {activeFile ? fileKindLabel(activeFile) : "Folder"}
                  {activeFileSize ? ` - ${activeFileSize}` : null}
                </div>
              </div>
            </div>
            <FileSystemInformation entry={activeEntry} index={index} />
          </ScrollArea>
        ) : null}
      </div>
      <ScrollArea
        orientation="horizontal"
        className="h-auto w-full shrink-0 border-t"
      >
        <div
          role="listbox"
          aria-label="Files"
          className="flex w-max min-w-full items-center gap-1.5 p-2"
        >
          {entries.map((entry) => {
            const isActive = entry.path === (activeEntry?.path ?? selectedPath)

            return (
              <button
                key={entry.path}
                type="button"
                role="option"
                aria-selected={isActive}
                ref={(element) => {
                  if (element) {
                    stripRefs.current.set(entry.path, element)
                  } else {
                    stripRefs.current.delete(entry.path)
                  }
                }}
                onClick={() => onSelect(entry)}
                onDoubleClick={() => onOpen(entry)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onOpen(entry)
                }}
                title={entry.name}
                className={cn(
                  "flex size-14 shrink-0 items-center justify-center rounded-md border border-transparent p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive && "border-ring/40 bg-accent"
                )}
              >
                {entry.kind === "folder" ? (
                  <FileSystemFolderGlyph className="h-9 w-auto" />
                ) : (
                  <FileVisual
                    file={entry}
                    className="w-9 rounded-sm"
                    previewAspectRatio={0.78}
                    renderFilePreview={renderFilePreview}
                  />
                )}
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
