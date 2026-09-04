"use client"

import * as React from "react"
import { useDocumentState, useRegistry } from "@embedpdf/core/react"
import {
  PDF_FORM_FIELD_TYPE,
  PdfActionType,
  PdfAnnotationName,
  PdfAnnotationSubtype,
  PdfZoomMode,
  uuidV4,
  type PdfAttachmentObject,
  type PdfBookmarkObject,
  type PdfDestinationObject,
  type PdfWidgetAnnoObject,
} from "@embedpdf/models"
import {
  getGroupLeaderId,
  getSelectedAnnotations,
  getSidebarAnnotationsWithRepliesGroupedByPage,
  useAnnotation,
  type SidebarAnnotationEntry,
  type TrackedAnnotation,
} from "@embedpdf/plugin-annotation/react"
import { useAttachmentCapability } from "@embedpdf/plugin-attachment/react"
import { useBookmarkCapability } from "@embedpdf/plugin-bookmark/react"
import {
  useFormCapability,
  type FormFieldInfo,
} from "@embedpdf/plugin-form/react"
import {
  useRedaction,
  type RedactionItem,
} from "@embedpdf/plugin-redaction/react"
import { useScrollCapability } from "@embedpdf/plugin-scroll/react"
import {
  SignatureFieldKind,
  useActivePlacement,
  useSignatureEntries,
} from "@embedpdf/plugin-signature/react"
import {
  StampImg,
  useActiveStamp,
  useStampCapability,
  useStampLibraries,
  useStampsByLibrary,
  type StampDefinition,
} from "@embedpdf/plugin-stamp/react"
import {
  ThumbImg,
  useThumbnailPlugin,
  type ThumbMeta,
  type WindowState,
} from "@embedpdf/plugin-thumbnail/react"
import type { degrees, ParseSpeeds, PDFDocument } from "pdf-lib"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { getFormFieldTypeLabel } from "@/components/extend/pdf-editor-properties"
import {
  ArrowDownGlyph,
  ArrowUpGlyph,
  CheckGlyph,
  ChevronDownGlyph,
  ChevronRightGlyph,
  CommentsGlyph,
  downloadArrayBuffer,
  downloadBlob,
  DownloadGlyph,
  EditGlyph,
  EyeOffGlyph,
  FilePlusGlyph,
  formatBytes,
  formatRelativeDate,
  getAnnotationMeta,
  GridGlyph,
  ListTreeGlyph,
  MergeGlyph,
  PaperclipGlyph,
  PdfEditorEmptyState,
  PdfEditorScrollArea,
  PdfEditorToolbarSeparator,
  PdfEditorToolButton,
  PlusGlyph,
  RedactAreaGlyph,
  RotateGlyph,
  ScissorsGlyph,
  SignatureGlyph,
  StampGlyph,
  TextFieldGlyph,
  toArrayBuffer,
  TrashGlyph,
  UploadGlyph,
  usePdfEditor,
  withFileNameSuffix,
} from "@/components/extend/pdf-editor-shared"

/* -------------------------------------------------------------------------- */
/* Thumbnails                                                                 */
/* -------------------------------------------------------------------------- */

const THUMBNAIL_FOCUS_RING_CLASS =
  "group-focus-visible/pdf-editor-thumbnails:ring-2 group-focus-visible/pdf-editor-thumbnails:ring-ring group-focus-visible/pdf-editor-thumbnails:ring-offset-1 group-focus-visible/pdf-editor-thumbnails:ring-offset-background"

function createFormFieldStore(
  scope: {
    getFormFields: () => FormFieldInfo[]
    onFormReady: (listener: (fields: FormFieldInfo[]) => void) => () => void
    onFieldValueChange: (listener: () => void) => () => void
  } | null
) {
  let fields: FormFieldInfo[] = scope?.getFormFields() ?? []
  return {
    getSnapshot: () => fields,
    subscribe: (listener: () => void) => {
      if (!scope) return () => {}
      const update = (next: FormFieldInfo[]) => {
        fields = next
        listener()
      }
      const unsubscribeReady = scope.onFormReady(update)
      const unsubscribeChange = scope.onFieldValueChange(() =>
        update(scope.getFormFields())
      )
      update(scope.getFormFields())
      return () => {
        unsubscribeReady()
        unsubscribeChange()
      }
    },
  }
}

export function PdfEditorThumbnailsPanel({
  documentId,
  activePage,
  pageCount,
  onSelectPage,
}: {
  documentId: string
  activePage: number
  pageCount: number
  onSelectPage: (pageNumber: number) => void
}) {
  const { plugin: thumbnailPlugin } = useThumbnailPlugin()
  const listboxId = React.useId()
  const viewportRef = React.useRef<HTMLDivElement | null>(null)
  const scope = React.useMemo(
    () => thumbnailPlugin?.provides().forDocument(documentId) ?? null,
    [documentId, thumbnailPlugin]
  )
  const windowState = React.useSyncExternalStore<WindowState | null>(
    React.useCallback(
      (onStoreChange) => {
        if (!scope) return () => undefined

        return scope.onWindow(() => onStoreChange())
      },
      [scope]
    ),
    React.useCallback(() => scope?.getWindow() ?? null, [scope]),
    () => null
  )
  const paddingY = thumbnailPlugin?.cfg.paddingY ?? 0

  React.useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || !scope) return

    const updateWindow = () => {
      scope.updateWindow(viewport.scrollTop, viewport.clientHeight)
    }

    updateWindow()
    viewport.addEventListener("scroll", updateWindow, { passive: true })
    const resizeObserver = new ResizeObserver(updateWindow)
    resizeObserver.observe(viewport)

    return () => {
      viewport.removeEventListener("scroll", updateWindow)
      resizeObserver.disconnect()
    }
  }, [scope])

  React.useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || !scope) return

    return scope.onScrollTo(({ top, behavior }) => {
      viewport.scrollTo({ top, behavior })
    })
  }, [scope])

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (pageCount < 1) return

      const currentPage = activePage > 0 ? activePage : 1
      let nextPage: number | null = null

      if (event.key === "ArrowDown")
        nextPage = Math.min(pageCount, currentPage + 1)
      else if (event.key === "ArrowUp") nextPage = Math.max(1, currentPage - 1)
      else if (event.key === "Home") nextPage = 1
      else if (event.key === "End") nextPage = pageCount

      if (nextPage === null) return

      event.preventDefault()
      onSelectPage(nextPage)
    },
    [activePage, onSelectPage, pageCount]
  )

  return (
    <PdfEditorScrollArea
      className="h-full w-full"
      viewportClassName="group/pdf-editor-thumbnails px-4 focus-visible:ring-0 focus-visible:ring-offset-0"
      viewportProps={{
        "aria-activedescendant":
          activePage > 0 ? `${listboxId}-page-${activePage}` : undefined,
        "aria-label": "Pages",
        onKeyDown: handleKeyDown,
        onMouseDown: (event) => {
          event.currentTarget.focus({ preventScroll: true })
        },
        role: "listbox",
        style: { paddingBottom: paddingY, paddingTop: paddingY },
        tabIndex: 0,
      }}
      viewportRef={viewportRef}
    >
      <div
        className="relative"
        style={{ height: windowState?.totalHeight ?? 0 }}
      >
        {windowState?.items.map((meta: ThumbMeta) => {
          const pageNumber = meta.pageIndex + 1
          const isActive = pageNumber === activePage
          const imagePadding = meta.padding ?? 0

          return (
            <div
              key={meta.pageIndex}
              className={cn(
                "absolute right-0 left-0 flex justify-center",
                isActive && "z-10"
              )}
              style={{ top: meta.top, height: meta.wrapperHeight }}
            >
              <div
                id={`${listboxId}-page-${pageNumber}`}
                role="option"
                aria-selected={isActive}
                aria-current={isActive ? "page" : undefined}
                aria-label={`Page ${pageNumber}`}
                style={{ maxWidth: meta.width + imagePadding * 2 + 16 }}
                className={cn(
                  "flex h-full w-full cursor-default flex-col items-center justify-between rounded-md px-2 text-xs transition-shadow outline-none select-none hover:bg-sidebar-accent",
                  isActive
                    ? cn(
                        "bg-sidebar-accent text-foreground",
                        THUMBNAIL_FOCUS_RING_CLASS
                      )
                    : "text-muted-foreground"
                )}
                onClick={() => onSelectPage(pageNumber)}
              >
                <span
                  className="flex items-center justify-center overflow-hidden rounded-md"
                  style={{
                    width: meta.width + imagePadding * 2,
                    height: meta.height + imagePadding * 2,
                    padding: imagePadding,
                  }}
                >
                  <ThumbImg
                    documentId={documentId}
                    meta={meta}
                    className="block rounded-sm object-contain shadow-xs"
                    style={{ width: meta.width, height: meta.height }}
                  />
                </span>
                <span
                  className="flex items-center justify-center tabular-nums"
                  style={{ height: meta.labelHeight }}
                >
                  {pageNumber}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </PdfEditorScrollArea>
  )
}

/* -------------------------------------------------------------------------- */
/* Outline                                                                    */
/* -------------------------------------------------------------------------- */

function resolveBookmarkDestination(bookmark: PdfBookmarkObject): {
  destination: PdfDestinationObject | null
  uri: string | null
} {
  const target = bookmark.target

  if (!target) return { destination: null, uri: null }

  if (target.type === "destination") {
    return { destination: target.destination, uri: null }
  }

  const action = target.action

  if (
    action.type === PdfActionType.Goto ||
    action.type === PdfActionType.RemoteGoto
  ) {
    return { destination: action.destination, uri: null }
  }

  if (action.type === PdfActionType.URI) {
    return { destination: null, uri: action.uri }
  }

  return { destination: null, uri: null }
}

export function PdfEditorOutlinePanel({ documentId }: { documentId: string }) {
  const { provides: bookmark } = useBookmarkCapability()
  const { provides: scroll } = useScrollCapability()
  const documentState = useDocumentState(documentId)
  const document = documentState?.document ?? null
  const [bookmarks, setBookmarks] = React.useState<PdfBookmarkObject[] | null>(
    null
  )
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set())

  React.useEffect(() => {
    if (!bookmark || !document) return

    let cancelled = false
    const task = bookmark.forDocument(documentId).getBookmarks()

    task.wait(
      (result) => {
        if (cancelled) return

        setBookmarks(result.bookmarks)
        setExpanded(
          new Set(result.bookmarks.map((_, index) => `bookmark-${index}`))
        )
      },
      () => {
        if (!cancelled) setBookmarks([])
      }
    )

    return () => {
      cancelled = true
    }
  }, [bookmark, document, documentId])

  const navigate = React.useCallback(
    (item: PdfBookmarkObject) => {
      const { destination, uri } = resolveBookmarkDestination(item)

      if (uri) {
        window.open(uri, "_blank", "noopener")
        return
      }

      if (!destination || !scroll) return

      const scope = scroll.forDocument(documentId)
      const page = document?.pages[destination.pageIndex]

      if (destination.zoom.mode === PdfZoomMode.XYZ && page) {
        scope.scrollToPage({
          pageNumber: destination.pageIndex + 1,
          pageCoordinates: {
            x: destination.zoom.params.x,
            y: page.size.height - destination.zoom.params.y,
          },
          behavior: "smooth",
        })
        return
      }

      scope.scrollToPage({
        pageNumber: destination.pageIndex + 1,
        behavior: "smooth",
      })
    },
    [document, documentId, scroll]
  )

  if (bookmarks === null) {
    return (
      <div className="grid h-full place-items-center">
        <Spinner className="size-4" />
      </div>
    )
  }

  if (bookmarks.length === 0) {
    return (
      <PdfEditorEmptyState
        glyph={ListTreeGlyph}
        title="No outline"
        description="This document does not include bookmarks."
      />
    )
  }

  const renderBookmark = (
    item: PdfBookmarkObject,
    id: string,
    level: number
  ): React.ReactNode => {
    const hasChildren = Boolean(item.children && item.children.length > 0)
    const isExpanded = expanded.has(id)

    return (
      <div key={id}>
        <div
          className="group flex cursor-default items-center gap-1 rounded-md py-1 pr-2 text-sm hover:bg-sidebar-accent"
          style={{ paddingLeft: level * 12 + 4 }}
        >
          {hasChildren ? (
            <button
              type="button"
              aria-label={isExpanded ? "Collapse" : "Expand"}
              className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground hover:text-foreground"
              onClick={(event) => {
                event.stopPropagation()
                setExpanded((previous) => {
                  const next = new Set(previous)
                  if (next.has(id)) next.delete(id)
                  else next.add(id)
                  return next
                })
              }}
            >
              {isExpanded ? (
                <ChevronDownGlyph className="size-3.5" />
              ) : (
                <ChevronRightGlyph className="size-3.5" />
              )}
            </button>
          ) : (
            <span className="size-5 shrink-0" />
          )}
          <button
            type="button"
            className="min-w-0 flex-1 truncate text-left text-foreground/90 outline-none"
            onClick={() => navigate(item)}
          >
            {item.title || "Untitled"}
          </button>
        </div>
        {hasChildren && isExpanded
          ? item.children?.map((child, index) =>
              renderBookmark(child, `${id}-${index}`, level + 1)
            )
          : null}
      </div>
    )
  }

  return (
    <PdfEditorScrollArea className="h-full w-full" viewportClassName="p-2">
      {bookmarks.map((item, index) =>
        renderBookmark(item, `bookmark-${index}`, 0)
      )}
    </PdfEditorScrollArea>
  )
}

/* -------------------------------------------------------------------------- */
/* Attachments                                                                */
/* -------------------------------------------------------------------------- */

export function PdfEditorAttachmentsPanel({
  documentId,
}: {
  documentId: string
}) {
  const { provides: attachment } = useAttachmentCapability()
  const { registry } = useRegistry()
  const documentState = useDocumentState(documentId)
  const { notify, permissions } = usePdfEditor()
  const document = documentState?.document ?? null
  const [attachments, setAttachments] = React.useState<
    PdfAttachmentObject[] | null
  >(null)
  const [version, setVersion] = React.useState(0)
  const [busy, setBusy] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!attachment || !document) return

    let cancelled = false

    attachment
      .forDocument(documentId)
      .getAttachments()
      .wait(
        (result) => {
          if (!cancelled) setAttachments(result)
        },
        () => {
          if (!cancelled) setAttachments([])
        }
      )

    return () => {
      cancelled = true
    }
  }, [attachment, document, documentId, version])

  const refresh = () => setVersion((value) => value + 1)

  const handleDownload = (item: PdfAttachmentObject) => {
    attachment
      ?.forDocument(documentId)
      .downloadAttachment(item)
      .wait(
        (buffer) =>
          downloadArrayBuffer(
            buffer,
            item.name,
            item.mimeType || "application/octet-stream"
          ),
        () => notify("The attachment could not be downloaded.", "error")
      )
  }

  const handleRemove = (item: PdfAttachmentObject) => {
    if (!registry || !document) return

    setBusy(true)
    registry
      .getEngine()
      .removeAttachment(document, item)
      .wait(
        () => {
          setBusy(false)
          refresh()
          notify("Attachment removed.", "success")
        },
        () => {
          setBusy(false)
          notify("The attachment could not be removed.", "error")
        }
      )
  }

  const handleAdd = async (file: File) => {
    if (!registry || !document) return

    setBusy(true)

    try {
      const data = await file.arrayBuffer()

      registry
        .getEngine()
        .addAttachment(document, {
          name: file.name,
          description: "",
          mimeType: file.type || "application/octet-stream",
          data,
        })
        .wait(
          () => {
            setBusy(false)
            refresh()
            notify("Attachment added.", "success")
          },
          () => {
            setBusy(false)
            notify("The attachment could not be added.", "error")
          }
        )
    } catch {
      setBusy(false)
      notify("The file could not be read.", "error")
    }
  }

  const canModify = permissions.canModifyContents && !busy

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void handleAdd(file)
            event.currentTarget.value = ""
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canModify}
          onClick={() => inputRef.current?.click()}
        >
          <PlusGlyph className="size-4" />
          Attach file
        </Button>
        {busy ? <Spinner className="size-4" /> : null}
      </div>
      {attachments === null ? (
        <div className="grid flex-1 place-items-center">
          <Spinner className="size-4" />
        </div>
      ) : attachments.length === 0 ? (
        <PdfEditorEmptyState
          glyph={PaperclipGlyph}
          title="No attachments"
          description="Files embedded in the PDF appear here."
        />
      ) : (
        <PdfEditorScrollArea className="min-h-0 flex-1" viewportClassName="p-2">
          <div className="space-y-1">
            {attachments.map((item) => (
              <div
                key={`${item.index}-${item.name}`}
                className="flex items-center gap-2 rounded-lg border px-2.5 py-2"
              >
                <div className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                  <PaperclipGlyph className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {item.name}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {[item.mimeType, formatBytes(item.size), item.description]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <PdfEditorToolButton
                  label="Download"
                  size="icon-xs"
                  onClick={() => handleDownload(item)}
                >
                  <DownloadGlyph className="size-3.5" />
                </PdfEditorToolButton>
                <PdfEditorToolButton
                  label="Remove"
                  size="icon-xs"
                  disabled={!canModify}
                  onClick={() => handleRemove(item)}
                >
                  <TrashGlyph className="size-3.5" />
                </PdfEditorToolButton>
              </div>
            ))}
          </div>
        </PdfEditorScrollArea>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Pages (organizer)                                                          */
/* -------------------------------------------------------------------------- */

const PAGE_TILE_WIDTH = 76

type PdfLibModule = {
  PDFDocument: typeof PDFDocument
  ParseSpeeds: typeof ParseSpeeds
  degrees: typeof degrees
}

let pdfLibPromise: Promise<PdfLibModule> | null = null

function loadPdfLib() {
  pdfLibPromise ??= import("pdf-lib")
  return pdfLibPromise
}

export function PdfEditorPagesPanel({
  documentId,
  activePage,
}: {
  documentId: string
  activePage: number
}) {
  const { registry } = useRegistry()
  const documentState = useDocumentState(documentId)
  const { state: annotationState, provides: annotation } =
    useAnnotation(documentId)
  const {
    fileName,
    getDocumentBuffer,
    notify,
    openDialog,
    permissions,
    replaceDocument,
    scrollToPage,
  } = usePdfEditor()
  const document = documentState?.document ?? null
  const pages = React.useMemo(() => document?.pages ?? [], [document])
  const [selected, setSelected] = React.useState<Set<number>>(() => new Set())
  const [busy, setBusy] = React.useState<string | null>(null)
  const anchorRef = React.useRef<number | null>(null)
  const appendInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    void loadPdfLib()
  }, [])

  const metas = React.useMemo<ThumbMeta[]>(
    () =>
      pages.map((page) => {
        const height = Math.max(
          1,
          Math.round(PAGE_TILE_WIDTH * (page.size.height / page.size.width))
        )

        return {
          pageIndex: page.index,
          width: PAGE_TILE_WIDTH,
          height,
          wrapperHeight: height,
          top: 0,
          labelHeight: 0,
          padding: 0,
        }
      }),
    [pages]
  )

  const selectedIndices = React.useMemo(
    () => [...selected].sort((a, b) => a - b),
    [selected]
  )
  const isEncrypted = document?.isEncrypted ?? false
  const canAssemble =
    permissions.canAssembleDocument && !isEncrypted && busy === null
  const hasSelection = selectedIndices.length > 0
  const isContiguous =
    hasSelection &&
    selectedIndices[selectedIndices.length - 1] - selectedIndices[0] ===
      selectedIndices.length - 1

  const select = (pageIndex: number, mode: "replace" | "toggle" | "range") => {
    setSelected((previous) => {
      if (mode === "range" && anchorRef.current !== null) {
        const start = Math.min(anchorRef.current, pageIndex)
        const end = Math.max(anchorRef.current, pageIndex)
        const next = new Set<number>()
        for (let index = start; index <= end; index += 1) next.add(index)
        return next
      }

      if (mode === "toggle") {
        const next = new Set(previous)
        if (next.has(pageIndex)) next.delete(pageIndex)
        else next.add(pageIndex)
        anchorRef.current = pageIndex
        return next
      }

      anchorRef.current = pageIndex
      return new Set([pageIndex])
    })
  }

  const runOperation = async (
    label: string,
    mutate: (doc: PDFDocument, lib: PdfLibModule) => Promise<void> | void,
    options: { replace?: boolean } = { replace: true }
  ) => {
    setBusy(label)

    try {
      const [buffer, lib] = await Promise.all([
        getDocumentBuffer(),
        loadPdfLib(),
      ])
      const doc = await lib.PDFDocument.load(buffer, {
        ignoreEncryption: true,
        parseSpeed: lib.ParseSpeeds.Fastest,
        updateMetadata: false,
      })

      await mutate(doc, lib)

      if (options.replace !== false) {
        const bytes = await doc.save({ objectsPerTick: 500 })
        replaceDocument(toArrayBuffer(bytes), fileName)
        notify(`${label} applied.`, "success")
      }
    } catch (error) {
      console.error(error)
      notify(`${label} failed.`, "error")
    } finally {
      setBusy(null)
    }
  }

  const rotateSelected = (delta: 90 | -90) =>
    runOperation("Rotate pages", (doc, lib) => {
      for (const index of selectedIndices) {
        const page = doc.getPage(index)
        page.setRotation(
          lib.degrees((page.getRotation().angle + delta + 360) % 360)
        )
      }
    })

  const deleteSelected = () => {
    if (selectedIndices.length >= pages.length) {
      notify("A document needs at least one page.", "error")
      return
    }

    openDialog({
      type: "confirm",
      title: `Delete ${selectedIndices.length === 1 ? "this page" : `${selectedIndices.length} pages`}?`,
      description:
        "Content and annotations on the deleted pages are removed permanently.",
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: async () => {
        setBusy("Delete pages")

        try {
          if (!registry || !document) {
            throw new Error("The document is not ready.")
          }

          if (annotation && annotationState.hasPendingChanges) {
            await annotation.commit().toPromise()
          }

          const engine = registry.getEngine()

          for (const index of [...selectedIndices].reverse()) {
            await engine.deletePage(document, index).toPromise()
          }

          const buffer = await engine.saveAsCopy(document).toPromise()
          replaceDocument(buffer, fileName)
          notify("Delete pages applied.", "success")
        } catch (error) {
          console.error(error)
          notify("Delete pages failed.", "error")
        } finally {
          setBusy(null)
        }
      },
    })
  }

  const moveSelected = (direction: -1 | 1) => {
    const first = selectedIndices[0]
    const last = selectedIndices[selectedIndices.length - 1]

    if (direction === -1 && first === 0) return
    if (direction === 1 && last === pages.length - 1) return

    void runOperation("Move pages", (doc) => {
      // pdf-lib has no move API: detach the neighbouring page from the page
      // tree and re-insert it on the other side of the selected block.
      if (direction === -1) {
        const page = doc.getPage(first - 1)
        doc.removePage(first - 1)
        doc.insertPage(last, page)
      } else {
        const page = doc.getPage(last + 1)
        doc.removePage(last + 1)
        doc.insertPage(first, page)
      }
    })
  }

  const insertBlankAfter = () => {
    const referenceIndex = hasSelection
      ? selectedIndices[selectedIndices.length - 1]
      : Math.max(0, activePage - 1)

    void runOperation("Insert page", (doc) => {
      const reference = doc.getPage(referenceIndex)
      const { width, height } = reference.getSize()
      doc.insertPage(referenceIndex + 1, [width, height])
    })
  }

  const extractSelected = () =>
    runOperation(
      "Extract pages",
      async (doc, lib) => {
        const output = await lib.PDFDocument.create()
        const copied = await output.copyPages(doc, selectedIndices)
        copied.forEach((page) => output.addPage(page))
        const bytes = await output.save()
        downloadArrayBuffer(bytes, withFileNameSuffix(fileName, "-pages"))
        notify(
          `Extracted ${selectedIndices.length} page${selectedIndices.length === 1 ? "" : "s"}.`,
          "success"
        )
      },
      { replace: false }
    )

  const appendFile = (file: File) =>
    runOperation("Append PDF", async (doc, lib) => {
      const source = await lib.PDFDocument.load(await file.arrayBuffer(), {
        ignoreEncryption: true,
        parseSpeed: lib.ParseSpeeds.Fastest,
        updateMetadata: false,
      })
      const copied = await doc.copyPages(source, source.getPageIndices())
      copied.forEach((page) => doc.addPage(page))
    })

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-0.5 border-b px-2 py-1.5">
        <PdfEditorToolButton
          label="Rotate left"
          disabled={!canAssemble || !hasSelection}
          onClick={() => rotateSelected(-90)}
        >
          <RotateGlyph className="size-4 -scale-x-100" />
        </PdfEditorToolButton>
        <PdfEditorToolButton
          label="Rotate right"
          disabled={!canAssemble || !hasSelection}
          onClick={() => rotateSelected(90)}
        >
          <RotateGlyph className="size-4" />
        </PdfEditorToolButton>
        <PdfEditorToolbarSeparator />
        <PdfEditorToolButton
          label="Move up"
          disabled={!canAssemble || !isContiguous || selectedIndices[0] === 0}
          onClick={() => moveSelected(-1)}
        >
          <ArrowUpGlyph className="size-4" />
        </PdfEditorToolButton>
        <PdfEditorToolButton
          label="Move down"
          disabled={
            !canAssemble ||
            !isContiguous ||
            selectedIndices[selectedIndices.length - 1] === pages.length - 1
          }
          onClick={() => moveSelected(1)}
        >
          <ArrowDownGlyph className="size-4" />
        </PdfEditorToolButton>
        <PdfEditorToolbarSeparator />
        <PdfEditorToolButton
          label="Insert blank page after"
          disabled={!canAssemble}
          onClick={insertBlankAfter}
        >
          <FilePlusGlyph className="size-4" />
        </PdfEditorToolButton>
        <PdfEditorToolButton
          label="Append PDF"
          disabled={!canAssemble}
          onClick={() => appendInputRef.current?.click()}
        >
          <MergeGlyph className="size-4" />
        </PdfEditorToolButton>
        <PdfEditorToolButton
          label="Extract selected pages"
          disabled={busy !== null || !hasSelection}
          onClick={() => void extractSelected()}
        >
          <ScissorsGlyph className="size-4" />
        </PdfEditorToolButton>
        <PdfEditorToolButton
          label="Delete pages"
          disabled={!canAssemble || !hasSelection}
          onClick={deleteSelected}
        >
          <TrashGlyph className="size-4" />
        </PdfEditorToolButton>
        <input
          ref={appendInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void appendFile(file)
            event.currentTarget.value = ""
          }}
        />
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-1.5 text-xs text-muted-foreground">
        <span>
          {hasSelection
            ? `${selectedIndices.length} of ${pages.length} selected`
            : `${pages.length} page${pages.length === 1 ? "" : "s"}`}
        </span>
        {busy ? (
          <span className="flex items-center gap-1.5">
            <Spinner className="size-3" />
            {busy}…
          </span>
        ) : isEncrypted ? (
          <span>Remove protection to edit pages.</span>
        ) : hasSelection ? (
          <button
            type="button"
            className="underline-offset-2 hover:underline"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </button>
        ) : null}
      </div>
      <PdfEditorScrollArea
        className="min-h-0 flex-1"
        viewportClassName="px-2.5 py-3"
      >
        <div
          data-slot="pdf-editor-pages-grid"
          className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] items-start gap-2"
        >
          {metas.map((meta) => {
            const pageNumber = meta.pageIndex + 1
            const isSelected = selected.has(meta.pageIndex)
            const isActive = pageNumber === activePage

            return (
              <button
                key={meta.pageIndex}
                type="button"
                aria-pressed={isSelected}
                className={cn(
                  "group flex min-w-0 flex-col items-center gap-1.5 rounded-lg border p-1.5 text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:bg-sidebar-accent",
                  isActive && !isSelected && "border-border"
                )}
                onClick={(event) => {
                  select(
                    meta.pageIndex,
                    event.shiftKey
                      ? "range"
                      : event.metaKey || event.ctrlKey
                        ? "toggle"
                        : "replace"
                  )
                }}
                onDoubleClick={() => scrollToPage(pageNumber)}
              >
                <span className="grid w-full place-items-center rounded-md border border-border/60 bg-muted/30 p-1">
                  <span
                    className="grid w-full place-items-center overflow-hidden rounded-sm bg-white shadow-xs"
                    style={{ aspectRatio: `${meta.width} / ${meta.height}` }}
                  >
                    <ThumbImg
                      documentId={documentId}
                      meta={meta}
                      className="block size-full object-contain"
                    />
                  </span>
                </span>
                <span
                  className={cn(
                    "tabular-nums",
                    isSelected ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {pageNumber}
                </span>
              </button>
            )
          })}
        </div>
      </PdfEditorScrollArea>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Comments                                                                   */
/* -------------------------------------------------------------------------- */

function CommentComposer({
  placeholder,
  initialValue = "",
  autoFocus,
  submitLabel = "Save",
  onSubmit,
  onCancel,
}: {
  placeholder: string
  initialValue?: string
  autoFocus?: boolean
  submitLabel?: string
  onSubmit: (value: string) => void
  onCancel?: () => void
}) {
  const [value, setValue] = React.useState(initialValue)

  return (
    <div className="space-y-1.5">
      <textarea
        value={value}
        autoFocus={autoFocus}
        rows={2}
        placeholder={placeholder}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            if (value.trim()) onSubmit(value.trim())
          }

          if (event.key === "Escape") onCancel?.()
        }}
        className="w-full resize-none rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex justify-end gap-1">
        {onCancel ? (
          <Button type="button" size="xs" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button
          type="button"
          size="xs"
          disabled={!value.trim()}
          onClick={() => onSubmit(value.trim())}
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  )
}

function CommentCard({
  entry,
  isSelected,
  readOnly,
  onSelect,
  onUpdate,
  onDelete,
  onReply,
}: {
  entry: SidebarAnnotationEntry
  isSelected: boolean
  readOnly: boolean
  onSelect: () => void
  onUpdate: (annotation: TrackedAnnotation, contents: string) => void
  onDelete: (annotation: TrackedAnnotation) => void
  onReply: (annotation: TrackedAnnotation, contents: string) => void
}) {
  const { annotation, replies } = entry
  const [isEditing, setIsEditing] = React.useState(false)
  const [isReplying, setIsReplying] = React.useState(false)
  const meta = getAnnotationMeta(annotation.object)
  const contents =
    typeof annotation.object.contents === "string"
      ? annotation.object.contents
      : ""
  const quotedText =
    annotation.object.custom &&
    typeof annotation.object.custom === "object" &&
    typeof (annotation.object.custom as { text?: unknown }).text === "string"
      ? ((annotation.object.custom as { text: string }).text as string)
      : null
  const Glyph = meta.glyph

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter") onSelect()
      }}
      className={cn(
        "rounded-lg border bg-background p-3 text-left shadow-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isSelected
          ? "border-primary ring-1 ring-primary/40"
          : "hover:bg-accent/40"
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className="grid size-7 shrink-0 place-items-center rounded-full bg-muted"
          style={meta.color ? { color: meta.color } : undefined}
        >
          <Glyph className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {annotation.object.author || "Guest"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {meta.label} · page {annotation.object.pageIndex + 1}
                {annotation.object.modified || annotation.object.created
                  ? ` · ${formatRelativeDate(annotation.object.modified ?? annotation.object.created)}`
                  : ""}
              </div>
            </div>
            {!readOnly ? (
              <div className="flex shrink-0 items-center gap-0.5">
                <PdfEditorToolButton
                  label={contents ? "Edit comment" : "Add comment"}
                  size="icon-xs"
                  onClick={(event) => {
                    event.stopPropagation()
                    setIsEditing(true)
                  }}
                >
                  <EditGlyph className="size-3.5" />
                </PdfEditorToolButton>
                <PdfEditorToolButton
                  label="Delete"
                  size="icon-xs"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDelete(annotation)
                  }}
                >
                  <TrashGlyph className="size-3.5" />
                </PdfEditorToolButton>
              </div>
            ) : null}
          </div>
          {quotedText ? (
            <blockquote className="mt-1.5 line-clamp-3 border-l-2 pl-2 text-xs text-muted-foreground italic">
              {quotedText}
            </blockquote>
          ) : null}
          {isEditing ? (
            <div className="mt-2" onClick={(event) => event.stopPropagation()}>
              <CommentComposer
                placeholder="Write a comment…"
                initialValue={contents}
                autoFocus
                onSubmit={(value) => {
                  onUpdate(annotation, value)
                  setIsEditing(false)
                }}
                onCancel={() => setIsEditing(false)}
              />
            </div>
          ) : contents ? (
            <p className="mt-1.5 text-sm whitespace-pre-wrap">{contents}</p>
          ) : (
            <p className="mt-1.5 text-xs text-muted-foreground">
              No comment yet.
            </p>
          )}
        </div>
      </div>
      {replies.length > 0 ? (
        <div className="mt-2 space-y-2 border-l pl-3">
          {replies.map((reply) => (
            <div key={reply.object.id} className="text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">
                  {reply.object.author || "Guest"}
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    {formatRelativeDate(
                      reply.object.modified ?? reply.object.created
                    )}
                  </span>
                </span>
                {!readOnly ? (
                  <PdfEditorToolButton
                    label="Delete reply"
                    size="icon-xs"
                    onClick={(event) => {
                      event.stopPropagation()
                      onDelete(reply)
                    }}
                  >
                    <TrashGlyph className="size-3" />
                  </PdfEditorToolButton>
                ) : null}
              </div>
              <p className="whitespace-pre-wrap">{reply.object.contents}</p>
            </div>
          ))}
        </div>
      ) : null}
      {!readOnly ? (
        <div className="mt-2" onClick={(event) => event.stopPropagation()}>
          {isReplying ? (
            <CommentComposer
              placeholder="Reply…"
              autoFocus
              submitLabel="Reply"
              onSubmit={(value) => {
                onReply(annotation, value)
                setIsReplying(false)
              }}
              onCancel={() => setIsReplying(false)}
            />
          ) : (
            <Button
              type="button"
              size="xs"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => setIsReplying(true)}
            >
              Reply
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function PdfEditorCommentsPanel({ documentId }: { documentId: string }) {
  const { provides: annotation, state } = useAnnotation(documentId)
  const { annotationAuthor, permissions, scrollToAnnotation } = usePdfEditor()
  const grouped = React.useMemo(
    () => getSidebarAnnotationsWithRepliesGroupedByPage(state),
    [state]
  )
  const selectedLeaderIds = React.useMemo(() => {
    const ids = new Set<string>()

    for (const item of getSelectedAnnotations(state)) {
      ids.add(getGroupLeaderId(state, item.object.id) ?? item.object.id)
    }

    return ids
  }, [state])
  const pageNumbers = React.useMemo(
    () =>
      Object.keys(grouped)
        .map(Number)
        .sort((a, b) => a - b),
    [grouped]
  )
  const readOnly = !permissions.canModifyAnnotations
  const cardRefs = React.useRef<Map<string, HTMLDivElement>>(new Map())
  const firstSelectedId = selectedLeaderIds.values().next().value

  React.useEffect(() => {
    if (!firstSelectedId) return

    const element = cardRefs.current.get(firstSelectedId)
    element?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [firstSelectedId])

  if (pageNumbers.length === 0) {
    return (
      <PdfEditorEmptyState
        glyph={CommentsGlyph}
        title="No comments yet"
        description="Annotations and notes you add to the document show up here."
      />
    )
  }

  return (
    <PdfEditorScrollArea className="h-full w-full" viewportClassName="p-3">
      <div className="space-y-5">
        {pageNumbers.map((pageIndex) => (
          <div key={pageIndex} className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">
              Page {pageIndex + 1}
            </div>
            <div className="space-y-2">
              {grouped[pageIndex].map((entry) => (
                <div
                  key={entry.annotation.object.id}
                  ref={(element) => {
                    if (element) {
                      cardRefs.current.set(entry.annotation.object.id, element)
                    } else {
                      cardRefs.current.delete(entry.annotation.object.id)
                    }
                  }}
                >
                  <CommentCard
                    entry={entry}
                    isSelected={selectedLeaderIds.has(
                      entry.annotation.object.id
                    )}
                    readOnly={readOnly}
                    onSelect={() => {
                      annotation?.selectAnnotation(
                        entry.annotation.object.pageIndex,
                        entry.annotation.object.id
                      )
                      scrollToAnnotation(entry.annotation.object)
                    }}
                    onUpdate={(item, contents) =>
                      annotation?.updateAnnotation(
                        item.object.pageIndex,
                        item.object.id,
                        {
                          contents,
                          modified: new Date(),
                        }
                      )
                    }
                    onDelete={(item) =>
                      annotation?.deleteAnnotation(
                        item.object.pageIndex,
                        item.object.id
                      )
                    }
                    onReply={(parent, contents) =>
                      annotation?.createAnnotation(parent.object.pageIndex, {
                        id: uuidV4(),
                        type: PdfAnnotationSubtype.TEXT,
                        pageIndex: parent.object.pageIndex,
                        rect: {
                          origin: {
                            x: parent.object.rect.origin.x,
                            y: parent.object.rect.origin.y,
                          },
                          size: { width: 24, height: 24 },
                        },
                        contents,
                        inReplyToId: parent.object.id,
                        flags: ["noRotate", "noZoom", "print"],
                        name: PdfAnnotationName.Comment,
                        author: annotationAuthor,
                        created: new Date(),
                        modified: new Date(),
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PdfEditorScrollArea>
  )
}

/* -------------------------------------------------------------------------- */
/* Redactions                                                                 */
/* -------------------------------------------------------------------------- */

export function PdfEditorRedactionsPanel({
  documentId,
}: {
  documentId: string
}) {
  const { state, provides } = useRedaction(documentId)
  const { provides: scroll } = useScrollCapability()
  const { openDialog, permissions, notify } = usePdfEditor()
  const items = React.useMemo(
    () =>
      Object.entries(state.pending)
        .flatMap(([page, pageItems]) =>
          pageItems.map((item) => ({ item, pageNumber: Number(page) + 1 }))
        )
        .sort((a, b) => a.pageNumber - b.pageNumber),
    [state.pending]
  )
  const [isApplying, setIsApplying] = React.useState(false)
  const canApply = permissions.canModifyContents && !isApplying

  const selectItem = (item: RedactionItem) => {
    provides?.selectPending(item.page, item.id)
    scroll?.forDocument(documentId).scrollToPage({
      pageNumber: item.page + 1,
      pageCoordinates: { x: item.rect.origin.x, y: item.rect.origin.y },
      alignX: 50,
      alignY: 25,
      behavior: "smooth",
    })
  }

  const applyAll = () =>
    openDialog({
      type: "confirm",
      title: `Apply ${items.length} redaction${items.length === 1 ? "" : "s"}?`,
      description:
        "Redaction permanently removes the marked content from the document. This cannot be undone.",
      confirmLabel: "Apply redactions",
      onConfirm: () => {
        if (!provides) return

        setIsApplying(true)
        provides.commitAllPending().wait(
          () => setIsApplying(false),
          () => {
            setIsApplying(false)
            notify("The redactions could not be applied.", "error")
          }
        )
      },
    })

  const applyOne = (item: RedactionItem) =>
    openDialog({
      type: "confirm",
      title: "Apply this redaction?",
      description: "The marked content is removed permanently.",
      confirmLabel: "Apply",
      onConfirm: () => {
        provides?.commitPending(item.page, item.id).wait(
          () => undefined,
          () => notify("The redaction could not be applied.", "error")
        )
      },
    })

  return (
    <div className="flex h-full flex-col">
      {items.length === 0 ? (
        <PdfEditorEmptyState
          glyph={EyeOffGlyph}
          title="No pending redactions"
          description="Use the Redact tools to mark text or areas. Marks stay editable until you apply them."
        />
      ) : (
        <PdfEditorScrollArea className="min-h-0 flex-1" viewportClassName="p-2">
          <div className="space-y-1.5">
            {items.map(({ item, pageNumber }) => {
              const isSelected = state.selected?.id === item.id
              const Glyph = item.kind === "text" ? EyeOffGlyph : RedactAreaGlyph

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectItem(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") selectItem(item)
                  }}
                  className={cn(
                    "flex items-start gap-2 rounded-lg border px-2.5 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected
                      ? "border-primary ring-1 ring-primary/40"
                      : "hover:bg-accent/40"
                  )}
                >
                  <span
                    className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md"
                    style={{
                      backgroundColor: `${item.markColor}22`,
                      color: item.markColor,
                    }}
                  >
                    <Glyph className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      {item.kind === "text" ? "Text" : "Area"}
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        page {pageNumber}
                      </span>
                    </div>
                    {item.kind === "text" && item.text ? (
                      <div className="truncate text-xs text-muted-foreground italic">
                        “{item.text}”
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <PdfEditorToolButton
                      label="Apply"
                      size="icon-xs"
                      disabled={!canApply}
                      onClick={(event) => {
                        event.stopPropagation()
                        applyOne(item)
                      }}
                    >
                      <CheckGlyph className="size-3.5" />
                    </PdfEditorToolButton>
                    <PdfEditorToolButton
                      label="Remove mark"
                      size="icon-xs"
                      onClick={(event) => {
                        event.stopPropagation()
                        provides?.removePending(item.page, item.id)
                      }}
                    >
                      <TrashGlyph className="size-3.5" />
                    </PdfEditorToolButton>
                  </div>
                </div>
              )
            })}
          </div>
        </PdfEditorScrollArea>
      )}
      {items.length > 0 ? (
        <div className="flex shrink-0 gap-2 border-t p-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={isApplying}
            onClick={() => provides?.clearPending()}
          >
            Clear all
          </Button>
          <Button
            type="button"
            size="sm"
            className="flex-1"
            loading={isApplying}
            disabled={!canApply}
            onClick={applyAll}
          >
            Apply all
          </Button>
        </div>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Stamps                                                                     */
/* -------------------------------------------------------------------------- */

const CUSTOM_STAMP_LIBRARY_ID = "custom"
const STAMP_THUMB_WIDTH = 120
const UNSUPPORTED_STAMP_SOURCE_TYPES = new Set<PdfAnnotationSubtype>([
  PdfAnnotationSubtype.REDACT,
  PdfAnnotationSubtype.HIGHLIGHT,
  PdfAnnotationSubtype.SQUIGGLY,
  PdfAnnotationSubtype.UNDERLINE,
  PdfAnnotationSubtype.STRIKEOUT,
  PdfAnnotationSubtype.CARET,
  PdfAnnotationSubtype.WIDGET,
  PdfAnnotationSubtype.LINK,
])

export function PdfEditorStampsPanel({ documentId }: { documentId: string }) {
  const { libraries } = useStampLibraries()
  const { provides: stampCapability } = useStampCapability()
  const { provides: annotation, state: annotationState } =
    useAnnotation(documentId)
  const { notify, permissions } = usePdfEditor()
  const [libraryId, setLibraryId] = React.useState("all")
  const stamps = useStampsByLibrary(libraryId === "all" ? undefined : libraryId)
  const activeStamp = useActiveStamp(documentId)
  const [busy, setBusy] = React.useState(false)
  const importInputRef = React.useRef<HTMLInputElement>(null)
  const selected = React.useMemo(
    () => getSelectedAnnotations(annotationState),
    [annotationState]
  )
  const canCreateFromSelection =
    selected.length === 1 &&
    !UNSUPPORTED_STAMP_SOURCE_TYPES.has(selected[0].object.type)
  const customLibrary = libraries.find(
    (library) => library.id === CUSTOM_STAMP_LIBRARY_ID
  )
  const libraryOptions = [
    { label: "All libraries", value: "all" },
    ...libraries.map((library) => ({
      label: library.name,
      value: library.id,
    })),
  ]

  if (
    libraryId !== "all" &&
    !libraries.some((library) => library.id === libraryId)
  ) {
    setLibraryId("all")
  }

  const placeStamp = (targetLibraryId: string, stamp: StampDefinition) => {
    if (!stampCapability) return

    const isActive =
      activeStamp?.libraryId === targetLibraryId &&
      activeStamp.stamp.id === stamp.id

    if (isActive) {
      annotation?.setActiveTool(null)
      return
    }

    stampCapability
      .forDocument(documentId)
      .activateStampPlacement(targetLibraryId, stamp)
      .wait(
        () => undefined,
        () => notify("The stamp could not be activated.", "error")
      )
  }

  const createFromSelection = () => {
    if (!stampCapability || !canCreateFromSelection) return

    const count = customLibrary?.stamps.length ?? 0

    setBusy(true)
    stampCapability
      .forDocument(documentId)
      .createStampFromAnnotation(
        selected[0].object,
        {
          name: PdfAnnotationName.Custom,
          subject: `Custom stamp ${count + 1}`,
          categories: ["custom", "sidebar"],
        },
        CUSTOM_STAMP_LIBRARY_ID
      )
      .wait(
        () => {
          setBusy(false)
          setLibraryId(CUSTOM_STAMP_LIBRARY_ID)
          notify("Stamp saved to your custom library.", "success")
        },
        () => {
          setBusy(false)
          notify("The stamp could not be created from the selection.", "error")
        }
      )
  }

  const exportLibrary = (targetLibraryId: string) => {
    stampCapability?.exportLibrary(targetLibraryId).wait(
      (exported) => downloadArrayBuffer(exported.pdf, `${exported.name}.pdf`),
      () => notify("The library could not be exported.", "error")
    )
  }

  const importLibrary = async (file: File) => {
    if (!stampCapability) return

    setBusy(true)

    try {
      const buffer = await file.arrayBuffer()
      const lib = await import("pdf-lib")
      const pageCount = (
        await lib.PDFDocument.load(buffer, { ignoreEncryption: true })
      ).getPageCount()
      const name = file.name.replace(/\.pdf$/i, "") || "Imported stamps"

      stampCapability
        .loadLibrary({
          name,
          pdf: buffer,
          categories: ["sidebar"],
          stamps: Array.from({ length: pageCount }, (_, index) => ({
            id: `page-${index + 1}`,
            pageIndex: index,
            name: PdfAnnotationName.Custom,
            subject: `${name} ${index + 1}`,
          })),
        })
        .wait(
          (id) => {
            setBusy(false)
            setLibraryId(id)
            notify(
              `Imported ${pageCount} stamp${pageCount === 1 ? "" : "s"}.`,
              "success"
            )
          },
          () => {
            setBusy(false)
            notify("The stamp library could not be imported.", "error")
          }
        )
    } catch {
      setBusy(false)
      notify("The file could not be read as a PDF.", "error")
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 space-y-2 border-b px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Select
            items={libraryOptions}
            value={libraryId}
            onValueChange={(value) => setLibraryId(String(value))}
          >
            <SelectTrigger size="sm" className="min-w-0 flex-1">
              <SelectValue placeholder="Library" />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {libraryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PdfEditorToolButton
            label="Import stamps from a PDF"
            disabled={busy}
            onClick={() => importInputRef.current?.click()}
          >
            <UploadGlyph className="size-4" />
          </PdfEditorToolButton>
          <PdfEditorToolButton
            label="Export library"
            disabled={
              busy ||
              (libraryId === "all"
                ? libraries.length === 0
                : !libraries.some((library) => library.id === libraryId))
            }
            onClick={() => {
              const targets =
                libraryId === "all"
                  ? libraries.map((library) => library.id)
                  : [libraryId]
              targets.forEach(exportLibrary)
            }}
          >
            <DownloadGlyph className="size-4" />
          </PdfEditorToolButton>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full"
          disabled={
            !canCreateFromSelection || busy || !permissions.canModifyAnnotations
          }
          onClick={createFromSelection}
        >
          <StampGlyph className="size-4" />
          Save selection as stamp
        </Button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void importLibrary(file)
            event.currentTarget.value = ""
          }}
        />
      </div>
      {stamps.length === 0 ? (
        <PdfEditorEmptyState
          glyph={StampGlyph}
          title={libraries.length === 0 ? "Loading stamps…" : "No stamps"}
          description="Pick a library, import stamps from a PDF, or save a selected annotation as a stamp."
        />
      ) : (
        <PdfEditorScrollArea className="min-h-0 flex-1" viewportClassName="p-3">
          <div className="grid grid-cols-2 gap-2.5">
            {stamps.map(({ library, stamp }) => {
              const isActive =
                activeStamp?.libraryId === library.id &&
                activeStamp.stamp.id === stamp.id

              return (
                <div
                  key={`${library.id}-${stamp.id}`}
                  className="group relative"
                >
                  <button
                    type="button"
                    aria-label={stamp.label ?? stamp.subject ?? "Rubber stamp"}
                    aria-pressed={isActive}
                    disabled={!permissions.canModifyAnnotations}
                    className={cn(
                      "flex aspect-square w-full items-center justify-center rounded-lg border p-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                      isActive
                        ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                        : "hover:bg-accent/50"
                    )}
                    onClick={() => placeStamp(library.id, stamp)}
                  >
                    <StampImg
                      libraryId={library.id}
                      pageIndex={stamp.pageIndex}
                      width={STAMP_THUMB_WIDTH}
                      style={{
                        maxWidth: "85%",
                        maxHeight: "85%",
                        objectFit: "contain",
                      }}
                    />
                  </button>
                  {!library.readonly ? (
                    <button
                      type="button"
                      aria-label="Remove stamp"
                      className="absolute top-1 right-1 grid size-5 place-items-center rounded-full border bg-background text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100"
                      onClick={() =>
                        stampCapability
                          ?.removeStampFromLibrary(library.id, stamp.id)
                          .wait(
                            () => undefined,
                            () =>
                              notify("The stamp could not be removed.", "error")
                          )
                      }
                    >
                      <TrashGlyph className="size-3" />
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
        </PdfEditorScrollArea>
      )}
      {activeStamp ? (
        <div className="shrink-0 border-t px-3 py-2 text-xs text-muted-foreground">
          Click a page to place{" "}
          <span className="font-medium text-foreground">
            {activeStamp.stamp.subject}
          </span>
          .
        </div>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Signatures                                                                 */
/* -------------------------------------------------------------------------- */

export function PdfEditorSignaturesPanel({
  documentId,
}: {
  documentId: string
}) {
  const { entries, provides } = useSignatureEntries()
  const activePlacement = useActivePlacement(documentId)
  const { openDialog, permissions } = usePdfEditor()
  const canPlace = permissions.canModifyAnnotations

  const isActive = (entryId: string, kind: SignatureFieldKind) =>
    activePlacement?.entryId === entryId && activePlacement.kind === kind

  const togglePlacement = (entryId: string, kind: SignatureFieldKind) => {
    if (!provides) return

    const scope = provides.forDocument(documentId)

    if (isActive(entryId, kind)) {
      scope.deactivatePlacement()
      return
    }

    if (kind === SignatureFieldKind.Initials) {
      scope.activateInitialsPlacement(entryId)
    } else {
      scope.activateSignaturePlacement(entryId)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b px-3 py-2">
        <Button
          type="button"
          size="sm"
          className="w-full"
          disabled={!canPlace}
          onClick={() => openDialog({ type: "signature" })}
        >
          <PlusGlyph className="size-4" />
          Create signature
        </Button>
      </div>
      {entries.length === 0 ? (
        <PdfEditorEmptyState
          glyph={SignatureGlyph}
          title="No signatures yet"
          description="Draw, type, or upload a signature, then click it to place it on the page."
        />
      ) : (
        <PdfEditorScrollArea className="min-h-0 flex-1" viewportClassName="p-3">
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="space-y-2 rounded-lg border p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Saved {formatRelativeDate(new Date(entry.createdAt))}
                  </span>
                  <PdfEditorToolButton
                    label="Delete signature"
                    size="icon-xs"
                    onClick={() => provides?.removeEntry(entry.id)}
                  >
                    <TrashGlyph className="size-3.5" />
                  </PdfEditorToolButton>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!canPlace}
                    aria-pressed={isActive(
                      entry.id,
                      SignatureFieldKind.Signature
                    )}
                    className={cn(
                      "flex h-16 min-w-0 flex-[2] items-center justify-center rounded-md border border-dashed bg-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                      isActive(entry.id, SignatureFieldKind.Signature)
                        ? "border-primary ring-1 ring-primary/40"
                        : "hover:border-muted-foreground/60"
                    )}
                    onClick={() =>
                      togglePlacement(entry.id, SignatureFieldKind.Signature)
                    }
                  >
                    <img
                      src={entry.signature.previewDataUrl}
                      alt="Signature"
                      className="h-12 max-w-[90%] object-contain"
                    />
                  </button>
                  {entry.initials ? (
                    <button
                      type="button"
                      disabled={!canPlace}
                      aria-pressed={isActive(
                        entry.id,
                        SignatureFieldKind.Initials
                      )}
                      className={cn(
                        "flex h-16 min-w-0 flex-1 items-center justify-center rounded-md border border-dashed bg-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                        isActive(entry.id, SignatureFieldKind.Initials)
                          ? "border-primary ring-1 ring-primary/40"
                          : "hover:border-muted-foreground/60"
                      )}
                      onClick={() =>
                        togglePlacement(entry.id, SignatureFieldKind.Initials)
                      }
                    >
                      <img
                        src={entry.initials.previewDataUrl}
                        alt="Initials"
                        className="h-10 max-w-[80%] object-contain"
                      />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </PdfEditorScrollArea>
      )}
      {activePlacement ? (
        <div className="shrink-0 border-t px-3 py-2 text-xs text-muted-foreground">
          Click a page to place your{" "}
          {activePlacement.kind === SignatureFieldKind.Initials
            ? "initials"
            : "signature"}
          .
        </div>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Forms                                                                      */
/* -------------------------------------------------------------------------- */

export function PdfEditorFormsPanel({ documentId }: { documentId: string }) {
  const { provides: form } = useFormCapability()
  const { provides: annotation, state: annotationState } =
    useAnnotation(documentId)
  const {
    features,
    fileName,
    formDesignMode,
    notify,
    permissions,
    scrollToAnnotation,
    setFormDesignMode,
  } = usePdfEditor()
  const scope = React.useMemo(
    () => form?.forDocument(documentId) ?? null,
    [documentId, form]
  )
  const fieldStore = React.useMemo(() => createFormFieldStore(scope), [scope])
  const fields = React.useSyncExternalStore(
    fieldStore.subscribe,
    fieldStore.getSnapshot,
    fieldStore.getSnapshot
  )
  const importInputRef = React.useRef<HTMLInputElement>(null)
  const designModeId = React.useId()

  const widgetsByName = React.useMemo(() => {
    const map = new Map<string, PdfWidgetAnnoObject>()

    for (const tracked of Object.values(annotationState.byUid)) {
      if (tracked.object.type !== PdfAnnotationSubtype.WIDGET) continue

      const widget = tracked.object as PdfWidgetAnnoObject

      if (!map.has(widget.field.name)) map.set(widget.field.name, widget)
    }

    return map
  }, [annotationState.byUid])

  const focusField = (field: FormFieldInfo) => {
    const widget = widgetsByName.get(field.name)

    if (!widget) return

    if (formDesignMode) {
      annotation?.selectAnnotation(widget.pageIndex, widget.id)
    } else {
      scope?.selectField(widget.id)
    }

    scrollToAnnotation(widget)
  }

  const exportValues = () => {
    if (!scope) return

    const values = scope.getFormValues()

    downloadBlob(
      new Blob([JSON.stringify(values, null, 2)], { type: "application/json" }),
      `${fileName.replace(/\.pdf$/i, "")}-form-values.json`
    )
  }

  const importValues = async (file: File) => {
    if (!scope) return

    try {
      const parsed = JSON.parse(await file.text()) as Record<string, unknown>
      const values = Object.fromEntries(
        Object.entries(parsed).map(([key, value]) => [key, String(value ?? "")])
      )

      scope.setFormValues(values).wait(
        () => notify("Form values imported.", "success"),
        () => notify("The form values could not be applied.", "error")
      )
    } catch {
      notify("The file is not valid JSON.", "error")
    }
  }

  const clearValues = () => {
    if (!scope || fields.length === 0) return

    const values = Object.fromEntries(
      fields.map((field) => [
        field.name,
        field.type === PDF_FORM_FIELD_TYPE.CHECKBOX ||
        field.type === PDF_FORM_FIELD_TYPE.RADIOBUTTON
          ? "Off"
          : "",
      ])
    )

    scope.setFormValues(values).wait(
      () => notify("Form cleared.", "success"),
      () => notify("The form could not be cleared.", "error")
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 space-y-2 border-b px-3 py-2">
        {features.forms && permissions.canModifyAnnotations ? (
          <label
            htmlFor={designModeId}
            data-slot="label"
            className="flex cursor-pointer items-center justify-between gap-4 py-1"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium">Design mode</span>
              <span className="text-xs text-muted-foreground">
                Move, resize, and configure fields instead of filling them.
              </span>
            </span>
            <Switch
              id={designModeId}
              checked={formDesignMode}
              onCheckedChange={setFormDesignMode}
            />
          </label>
        ) : null}
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={fields.length === 0}
            onClick={exportValues}
          >
            <DownloadGlyph className="size-3.5" />
            Export values
          </Button>
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={!permissions.canFillForms}
            onClick={() => importInputRef.current?.click()}
          >
            <UploadGlyph className="size-3.5" />
            Import values
          </Button>
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={fields.length === 0 || !permissions.canFillForms}
            onClick={clearValues}
          >
            Clear
          </Button>
        </div>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void importValues(file)
            event.currentTarget.value = ""
          }}
        />
      </div>
      {fields.length === 0 ? (
        <PdfEditorEmptyState
          glyph={TextFieldGlyph}
          title="No form fields"
          description={
            features.forms
              ? "Switch to the Forms mode to add text fields, checkboxes, radio buttons, dropdowns, and list boxes."
              : "This document has no fillable fields."
          }
        />
      ) : (
        <PdfEditorScrollArea className="min-h-0 flex-1" viewportClassName="p-2">
          <div className="space-y-1">
            {fields.map((field) => (
              <button
                key={field.name}
                type="button"
                className="flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left outline-none hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => focusField(field)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">
                      {field.name}
                    </span>
                    {field.readOnly ? (
                      <Badge variant="outline" className="h-4 px-1 text-[10px]">
                        Read only
                      </Badge>
                    ) : null}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {getFormFieldTypeLabel(field.type)}
                    {field.value ? ` · ${field.value}` : ""}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </PdfEditorScrollArea>
      )}
    </div>
  )
}

export { GridGlyph as PdfEditorPagesGlyph }
