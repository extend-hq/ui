"use client"

import * as React from "react"
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  useXlsxViewer,
  useXlsxViewerController,
  useXlsxViewerThumbnails,
  XlsxViewerProvider,
} from "@extend-ai/react-xlsx"
import {
  Add01Icon,
  Delete02Icon,
  DragDropVerticalIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useTheme } from "next-themes"
import type * as ReactPdf from "react-pdf"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  FileThumbnail,
  type ThumbnailFile,
} from "@/components/ui/file-thumbnail"
import { PDFViewer, type PDFViewerHandle } from "@/components/ui/pdf-viewer"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  useWorkbookNightRenderPreference,
  WorkbookSheetTabs,
  WorkbookTableHeaderMenu,
  XlsxWorkbookSurface,
} from "@/components/ui/xlsx-viewer"
import { HighlightedCodeBlock } from "@/components/highlighted-code-block"
import { PdfBlockResizableShell } from "@/components/pdf-block-resizable-shell"
import { Badge } from "@/registry/new-york-v4/ui/badge"
import { Card } from "@/registry/new-york-v4/ui/card"

type ReactPdfModule = typeof ReactPdf
export type DocumentSplitPageId = `page-${number}`
export type DocumentSplitItemId = string
type PageId = DocumentSplitItemId
type WorkbookSheetId = `sheet-${number}`

export type DocumentSplit = {
  id: string
  title: string
  pages: DocumentSplitItemId[]
}
type SplitGroup = DocumentSplit

const PDF_URL = "/samples/attention.pdf"
const XLSX_URL = "/samples/crazy-chart-zoo.xlsx"
const XLSX_THUMBNAIL_FILE = {
  name: "crazy-chart-zoo.xlsx",
  type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  url: XLSX_URL,
}
const PDF_WORKER_URL = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  import.meta.url
).toString()
const THUMBNAIL_WIDTH = 72
const THUMBNAIL_HEIGHT = 92
const SHEET_THUMBNAIL_WIDTH = 112
const SHEET_THUMBNAIL_HEIGHT = 76
const DEFAULT_ZOOM = 0.75
const DEFAULT_PREVIEW_PAGE_COUNT = 15
const DEFAULT_PREVIEW_SHEET_COUNT = 8
const DRAG_OVERLAY_DROP_ANIMATION = null

type ThumbnailLabelPlacement = "corner" | "bottom"

type ThumbnailSize = {
  width: number
  height: number
}

const splitterCollisionDetection: CollisionDetection = (args) => {
  const dragType = args.active.data.current?.type

  if (dragType === "page") {
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter(
        (container) =>
          container.data.current?.type === "page" ||
          (container.data.current?.type === "page-dropzone" &&
            container.data.current?.isEmpty)
      ),
    })
  }

  if (dragType === "split") {
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter(
        (container) => container.data.current?.type === "split"
      ),
    })
  }

  return closestCenter(args)
}

function toPageId(pageNumber: number): PageId {
  return `page-${pageNumber}`
}

function getPageNumber(pageId: DocumentSplitItemId): number {
  return Number(pageId.replace("page-", ""))
}

function getSplitSortableId(groupId: string) {
  return `split-sortable-${groupId}`
}

function toWorkbookSheetId(sheetIndex: number): WorkbookSheetId {
  return `sheet-${sheetIndex}`
}

function getWorkbookSheetIndex(sheetId: WorkbookSheetId): number {
  return Number(sheetId.replace("sheet-", ""))
}

function createInitialGroups(pageCount: number): SplitGroup[] {
  const pages = Array.from({ length: pageCount }, (_, index) =>
    toPageId(index + 1)
  )

  return [
    {
      id: "split-1",
      title: "Abstract and intro",
      pages: pages.slice(0, Math.min(3, pageCount)),
    },
    {
      id: "split-2",
      title: "Model architecture",
      pages: pages.slice(3, Math.min(8, pageCount)),
    },
    {
      id: "split-3",
      title: "Training and results",
      pages: pages.slice(8),
    },
  ].filter((group) => group.pages.length > 0)
}

function createInitialWorkbookSplits(sheetCount: number): DocumentSplit[] {
  const sheets = Array.from({ length: sheetCount }, (_, index) =>
    toWorkbookSheetId(index)
  )

  return [
    {
      id: "workbook-split-1",
      title: "Workbook guide",
      pages: sheets.slice(0, Math.min(1, sheetCount)),
    },
    {
      id: "workbook-split-2",
      title: "Chart review",
      pages: sheets.slice(1, Math.min(6, sheetCount)),
    },
    {
      id: "workbook-split-3",
      title: "Format checks",
      pages: sheets.slice(6),
    },
  ].filter((group) => group.pages.length > 0)
}

function formatPageRanges(pageIds: PageId[]) {
  if (pageIds.length === 0) return "No pages"

  const pages = pageIds.map(getPageNumber)
  const ranges: string[] = []
  let rangeStart = pages[0]
  let previous = pages[0]

  for (let index = 1; index <= pages.length; index += 1) {
    const current = pages[index]

    if (current !== previous + 1) {
      ranges.push(
        rangeStart === previous ? `${rangeStart}` : `${rangeStart}-${previous}`
      )
      rangeStart = current
    }

    previous = current
  }

  return `Pages ${ranges.join(", ")}`
}

function createPageRangeLabels(groups: SplitGroup[]) {
  return Object.fromEntries(
    groups.map((group) => [group.id, formatPageRanges(group.pages)])
  )
}

function createWorkbookSplitLabel(split: DocumentSplit, sheetNames: string[]) {
  if (split.pages.length === 0) return "No sheets"

  const names = split.pages.map((sheetId) => {
    const sheetIndex = getWorkbookSheetIndex(sheetId as WorkbookSheetId)

    return sheetNames[sheetIndex] ?? `Sheet ${sheetIndex + 1}`
  })
  const visibleNames = names.slice(0, 2).join(", ")
  const hiddenCount = names.length - 2

  return hiddenCount > 0 ? `${visibleNames} +${hiddenCount}` : visibleNames
}

function SplitGroupDropzone({
  id,
  isEmpty,
  children,
}: {
  id: string
  isEmpty: boolean
  children: React.ReactNode
}) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: {
      groupId: id,
      isEmpty,
      type: "page-dropzone",
    },
  })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[116px] rounded-lg p-2 transition-[background-color,box-shadow]",
        isOver && "bg-accent/30 shadow-[inset_0_0_0_1px_var(--border)]"
      )}
    >
      {children}
    </div>
  )
}

const PageThumbnailPreview = React.memo(function PageThumbnailPreview({
  itemFile,
  itemId,
  itemLabel,
  labelPlacement,
  isActive,
  imageUrl,
  thumbnailSize,
  onSelect,
}: {
  itemFile: ThumbnailFile
  itemId: DocumentSplitItemId
  itemLabel: React.ReactNode
  labelPlacement: ThumbnailLabelPlacement
  isActive: boolean
  imageUrl?: string
  thumbnailSize: ThumbnailSize
  onSelect: (itemId: DocumentSplitItemId) => void
}) {
  return (
    <div
      className="relative"
      style={{ width: thumbnailSize.width, height: thumbnailSize.height }}
    >
      <button
        type="button"
        className={cn(
          "relative cursor-grab overflow-hidden rounded-md border bg-muted text-left shadow-xs transition-[border-color,box-shadow,opacity] active:cursor-grabbing",
          isActive
            ? "border-blue-500 shadow-[0_0_0_2px_rgb(59_130_246_/_14%)]"
            : "border-border hover:border-foreground/30"
        )}
        style={{ width: thumbnailSize.width, height: thumbnailSize.height }}
        onClick={() => onSelect(itemId)}
      >
        <FileThumbnail
          file={itemFile}
          showMetadata={false}
          previewImageUrl={imageUrl}
          previewClassName="h-full aspect-auto"
          className="size-full rounded-[inherit] border-0"
          isLoading={!imageUrl}
        />
        <span
          className={cn(
            "absolute bottom-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium shadow-xs",
            labelPlacement === "bottom"
              ? "inset-x-1 truncate"
              : "right-1 max-w-[calc(100%-0.5rem)]"
          )}
        >
          {itemLabel}
        </span>
      </button>
    </div>
  )
})

function SortablePageThumbnail({
  getItemFile,
  getItemLabel,
  groupId,
  pageId,
  labelPlacement,
  isActive,
  imageUrl,
  thumbnailSize,
  onSelect,
}: {
  getItemFile: (itemId: DocumentSplitItemId) => ThumbnailFile
  getItemLabel: (itemId: DocumentSplitItemId) => React.ReactNode
  groupId: string
  pageId: PageId
  labelPlacement: ThumbnailLabelPlacement
  isActive: boolean
  imageUrl?: string
  thumbnailSize: ThumbnailSize
  onSelect: (itemId: DocumentSplitItemId) => void
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: pageId,
    data: {
      groupId,
      pageId,
      type: "page",
    },
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn("group relative shrink-0", isDragging && "z-20 opacity-0")}
      {...attributes}
      {...listeners}
    >
      <PageThumbnailPreview
        itemFile={getItemFile(pageId)}
        itemId={pageId}
        itemLabel={getItemLabel(pageId)}
        labelPlacement={labelPlacement}
        isActive={isActive}
        imageUrl={imageUrl}
        thumbnailSize={thumbnailSize}
        onSelect={onSelect}
      />
    </div>
  )
}

function SplitGroupCard({
  activeItemId,
  emptyLabel,
  getItemFile,
  getItemLabel,
  group,
  labelPlacement,
  pageRangeLabel,
  canReorder = false,
  dragHandleProps,
  isPageDragging = false,
  thumbnailImages,
  thumbnailSize,
  canRemove,
  onRemove,
  onSelectItem,
}: {
  activeItemId?: DocumentSplitItemId
  emptyLabel: string
  getItemFile: (itemId: DocumentSplitItemId) => ThumbnailFile
  getItemLabel: (itemId: DocumentSplitItemId) => React.ReactNode
  group: SplitGroup
  labelPlacement: ThumbnailLabelPlacement
  pageRangeLabel: string
  canReorder?: boolean
  dragHandleProps?: React.ComponentPropsWithoutRef<"button">
  isPageDragging?: boolean
  thumbnailImages?: Record<DocumentSplitItemId, string>
  thumbnailSize: ThumbnailSize
  canRemove: boolean
  onRemove: () => void
  onSelectItem: (itemId: DocumentSplitItemId) => void
}) {
  return (
    <Card className="overflow-hidden rounded-xl before:rounded-[calc(var(--radius-xl)-1px)]">
      <div className="flex items-start justify-between gap-3 border-b p-3">
        <div className="flex min-w-0 items-start gap-2">
          <button
            type="button"
            aria-label={`Reorder ${group.title}`}
            className={cn(
              "mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground",
              canReorder
                ? "cursor-grab hover:bg-muted active:cursor-grabbing"
                : "cursor-default"
            )}
            disabled={!canReorder}
            {...dragHandleProps}
          >
            <HugeiconsIcon icon={DragDropVerticalIcon} className="size-4" />
          </button>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{group.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {pageRangeLabel}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="secondary" className="rounded-full">
            {group.pages.length}
          </Badge>
          {canRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${group.title}`}
              onClick={onRemove}
            >
              <HugeiconsIcon icon={Delete02Icon} className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>
      <SplitGroupDropzone id={group.id} isEmpty={group.pages.length === 0}>
        {group.pages.length > 0 ? (
          <SortableContext
            items={group.pages}
            strategy={horizontalListSortingStrategy}
          >
            <ScrollArea
              className={cn(
                "h-[110px] w-full overflow-hidden",
                isPageDragging &&
                  "[&_[data-orientation=horizontal][data-slot=scroll-area-scrollbar]]:hidden"
              )}
              orientation="horizontal"
              scrollbarGutter
              scrollbarOverflowOnly
              viewportClassName="overflow-y-hidden"
            >
              <div className="flex w-max gap-2 overflow-y-hidden py-1 pr-6">
                {group.pages.map((pageId) => {
                  return (
                    <SortablePageThumbnail
                      key={pageId}
                      getItemFile={getItemFile}
                      getItemLabel={getItemLabel}
                      groupId={group.id}
                      pageId={pageId}
                      labelPlacement={labelPlacement}
                      isActive={activeItemId === pageId}
                      imageUrl={thumbnailImages?.[pageId]}
                      thumbnailSize={thumbnailSize}
                      onSelect={onSelectItem}
                    />
                  )
                })}
              </div>
            </ScrollArea>
          </SortableContext>
        ) : (
          <div className="grid h-[104px] place-items-center rounded-lg bg-muted/35 text-xs text-muted-foreground">
            {emptyLabel}
          </div>
        )}
      </SplitGroupDropzone>
    </Card>
  )
}

function SortableSplitGroupCard(
  props: Omit<React.ComponentProps<typeof SplitGroupCard>, "dragHandleProps">
) {
  const { group } = props
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: getSplitSortableId(group.id),
    data: {
      groupId: group.id,
      type: "split",
    },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(isDragging && "opacity-0")}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <SplitGroupCard
        {...props}
        canReorder
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

function PageDragOverlay({
  getItemFile,
  getItemLabel,
  labelPlacement,
  pageId,
  imageUrl,
  thumbnailSize,
}: {
  getItemFile: (itemId: DocumentSplitItemId) => ThumbnailFile
  getItemLabel: (itemId: DocumentSplitItemId) => React.ReactNode
  labelPlacement: ThumbnailLabelPlacement
  pageId: PageId
  imageUrl?: string
  thumbnailSize: ThumbnailSize
}) {
  return (
    <div
      className="relative overflow-hidden rounded-md border border-blue-500 bg-background shadow-lg shadow-black/10"
      style={{ width: thumbnailSize.width, height: thumbnailSize.height }}
    >
      <FileThumbnail
        file={getItemFile(pageId)}
        showMetadata={false}
        previewImageUrl={imageUrl}
        previewClassName="h-full aspect-auto"
        className="size-full rounded-[inherit] border-0"
        isLoading={!imageUrl}
      />
      <span
        className={cn(
          "absolute bottom-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium shadow-xs",
          labelPlacement === "bottom"
            ? "inset-x-1 truncate"
            : "right-1 max-w-[calc(100%-0.5rem)]"
        )}
      >
        {getItemLabel(pageId)}
      </span>
    </div>
  )
}

function SplitGroupDragOverlay(
  props: Omit<
    React.ComponentProps<typeof SplitGroupCard>,
    "canRemove" | "canReorder" | "dragHandleProps" | "onRemove"
  >
) {
  return (
    <div className="relative z-[1000] w-[min(360px,calc(100vw-2rem))]">
      <SplitGroupCard
        {...props}
        canRemove={false}
        canReorder={false}
        onRemove={() => {}}
      />
    </div>
  )
}

function findGroupId(groups: SplitGroup[], id: string) {
  if (groups.some((group) => group.id === id)) return id

  return groups.find((group) => group.pages.includes(id as PageId))?.id ?? null
}

function getGroupPages(groups: SplitGroup[], groupId: string | null) {
  return groups.find((group) => group.id === groupId)?.pages ?? []
}

function movePageToGroup({
  activePageId,
  groups,
  insertIndex,
  targetGroupId,
}: {
  activePageId: PageId
  groups: SplitGroup[]
  insertIndex: number
  targetGroupId: string
}) {
  return groups.map((group) => {
    const pagesWithoutActive = group.pages.filter(
      (pageId) => pageId !== activePageId
    )

    if (group.id !== targetGroupId) {
      return { ...group, pages: pagesWithoutActive }
    }

    const nextPages = [...pagesWithoutActive]
    nextPages.splice(insertIndex, 0, activePageId)
    return { ...group, pages: nextPages }
  })
}

function reorderPageInGroup({
  activePageId,
  groups,
  overPageId,
}: {
  activePageId: PageId
  groups: SplitGroup[]
  overPageId: PageId
}) {
  const groupId = findGroupId(groups, activePageId)
  const pages = getGroupPages(groups, groupId)
  const activeIndex = pages.indexOf(activePageId)
  const overIndex = pages.indexOf(overPageId)

  if (!groupId || activeIndex === -1 || overIndex === -1) return groups

  return groups.map((group) =>
    group.id === groupId
      ? { ...group, pages: arrayMove(group.pages, activeIndex, overIndex) }
      : group
  )
}

function useWorkbookSheetThumbnailUrls(workbookIdentity: string) {
  const { thumbnails } = useXlsxViewerThumbnails({
    includeHeaders: true,
    resolution: {
      maxHeight: 320,
      maxWidth: 520,
    },
  })
  const [thumbnailUrls, setThumbnailUrls] = React.useState<
    Record<number, string>
  >({})

  React.useEffect(() => {
    setThumbnailUrls({})
  }, [workbookIdentity])

  React.useEffect(() => {
    thumbnails.forEach((thumbnail) => {
      setThumbnailUrls((current) => {
        if (current[thumbnail.sheetIndex]) return current

        const canvas = document.createElement("canvas")
        canvas.width = thumbnail.width
        canvas.height = thumbnail.height

        if (!thumbnail.paint(canvas)) return current

        return {
          ...current,
          [thumbnail.sheetIndex]: canvas.toDataURL("image/png"),
        }
      })
    })
  }, [thumbnails])

  return thumbnailUrls
}

export function DocumentSplits({
  activeItemId,
  activePage,
  addSplitLabel = "Add split",
  className,
  dndId = "document-splits-dnd",
  emptyLabel = "Drop pages here",
  getItemFile,
  getItemLabel,
  getSplitLabel,
  labelPlacement = "corner",
  splits,
  thumbnailSize = { width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT },
  thumbnailImages = {},
  withFrameDivider = true,
  onSplitsChange,
  onSelectItem,
  onSelectPage,
  onAddSplit,
  onRemoveSplit,
}: {
  activeItemId?: DocumentSplitItemId
  activePage?: number
  addSplitLabel?: string
  className?: string
  dndId?: string
  emptyLabel?: string
  getItemFile?: (itemId: DocumentSplitItemId) => ThumbnailFile
  getItemLabel?: (itemId: DocumentSplitItemId) => React.ReactNode
  getSplitLabel?: (split: DocumentSplit) => string
  labelPlacement?: ThumbnailLabelPlacement
  splits: DocumentSplit[]
  thumbnailSize?: ThumbnailSize
  thumbnailImages?: Record<DocumentSplitItemId, string>
  withFrameDivider?: boolean
  onSplitsChange: (splits: DocumentSplit[]) => void
  onSelectItem?: (itemId: DocumentSplitItemId) => void
  onSelectPage?: (pageNumber: number) => void
  onAddSplit?: () => void
  onRemoveSplit?: (groupId: string) => void
}) {
  const [activePageId, setActivePageId] = React.useState<PageId | null>(null)
  const [activeSplitGroupId, setActiveSplitGroupId] = React.useState<
    string | null
  >(null)
  const dragStartGroupIdRef = React.useRef<string | null>(null)
  const dragStartGroupsRef = React.useRef<SplitGroup[] | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  const pageRangeLabels = React.useMemo(
    () => createPageRangeLabels(splits),
    [splits]
  )
  const resolvedActiveItemId =
    activeItemId ?? (activePage ? toPageId(activePage) : undefined)
  const resolvedGetItemLabel = React.useCallback(
    (itemId: DocumentSplitItemId) =>
      getItemLabel?.(itemId) ?? getPageNumber(itemId),
    [getItemLabel]
  )
  const resolvedGetItemFile = React.useCallback(
    (itemId: DocumentSplitItemId): ThumbnailFile => {
      if (getItemFile) return getItemFile(itemId)

      const pageNumber = getPageNumber(itemId)

      return {
        name: `page-${pageNumber}.pdf`,
        type: "application/pdf",
        size: `Page ${pageNumber}`,
      }
    },
    [getItemFile]
  )
  const selectItem = React.useCallback(
    (itemId: DocumentSplitItemId) => {
      if (onSelectItem) {
        onSelectItem(itemId)
        return
      }

      onSelectPage?.(getPageNumber(itemId))
    },
    [onSelectItem, onSelectPage]
  )

  const addSplit = React.useCallback(() => {
    if (onAddSplit) {
      onAddSplit()
      return
    }

    onSplitsChange([
      ...splits,
      {
        id: `split-${Date.now()}-${splits.length}`,
        title: `Split ${splits.length + 1}`,
        pages: [],
      },
    ])
  }, [onAddSplit, onSplitsChange, splits])

  const removeSplit = React.useCallback(
    (groupId: string) => {
      if (onRemoveSplit) {
        onRemoveSplit(groupId)
        return
      }

      const groupToRemove = splits.find((group) => group.id === groupId)
      const remainingGroups = splits.filter((group) => group.id !== groupId)

      if (!groupToRemove || remainingGroups.length === 0) return

      onSplitsChange(
        remainingGroups.map((group, index) =>
          index === 0
            ? { ...group, pages: [...group.pages, ...groupToRemove.pages] }
            : group
        )
      )
    },
    [onRemoveSplit, onSplitsChange, splits]
  )

  const updateSplits = React.useCallback(
    (updater: (currentSplits: SplitGroup[]) => SplitGroup[]) => {
      onSplitsChange(updater(splits))
    },
    [onSplitsChange, splits]
  )

  const handleDragStart = React.useCallback(
    (event: DragStartEvent) => {
      const dragType = event.active.data.current?.type

      if (dragType === "page") {
        const pageId = String(event.active.id) as PageId
        dragStartGroupIdRef.current = findGroupId(splits, pageId)
        dragStartGroupsRef.current = splits
        setActivePageId(pageId)
        setActiveSplitGroupId(null)
        return
      }

      if (dragType === "split") {
        dragStartGroupIdRef.current = null
        dragStartGroupsRef.current = null
        setActivePageId(null)
        setActiveSplitGroupId(
          (event.active.data.current?.groupId as string | undefined) ?? null
        )
        return
      }

      dragStartGroupIdRef.current = null
      dragStartGroupsRef.current = null
      setActivePageId(null)
      setActiveSplitGroupId(null)
    },
    [splits]
  )

  const handleDragOver = React.useCallback(
    (event: DragOverEvent) => {
      const dragType = event.active.data.current?.type
      const overId = event.over?.id

      if (dragType !== "page" || !overId) return

      const pageId = String(event.active.id) as PageId

      updateSplits((previousSplits) => {
        const sourceGroupId = findGroupId(previousSplits, pageId)
        const targetGroupId = findGroupId(previousSplits, String(overId))

        if (
          !sourceGroupId ||
          !targetGroupId ||
          sourceGroupId === targetGroupId
        ) {
          return previousSplits
        }

        const targetPages = getGroupPages(previousSplits, targetGroupId)
        const overPageIndex = targetPages.indexOf(String(overId) as PageId)
        const overRect = event.over?.rect
        const activeRect = event.active.rect.current.translated
        const isAfterOverPage =
          overPageIndex !== -1 &&
          activeRect &&
          overRect &&
          activeRect.left > overRect.left + overRect.width / 2
        const insertIndex =
          overPageIndex === -1
            ? targetPages.length
            : overPageIndex + (isAfterOverPage ? 1 : 0)

        return movePageToGroup({
          groups: previousSplits,
          activePageId: pageId,
          targetGroupId,
          insertIndex,
        })
      })
    },
    [updateSplits]
  )

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const dragType = event.active.data.current?.type
      const overId = event.over?.id

      if (dragType === "split" && overId) {
        const activeGroupId = event.active.data.current?.groupId as
          | string
          | undefined
        const overGroupId = event.over?.data.current?.groupId as
          | string
          | undefined

        updateSplits((previousSplits) => {
          const activeIndex = previousSplits.findIndex(
            (group) => group.id === activeGroupId
          )
          const overIndex = previousSplits.findIndex(
            (group) => group.id === overGroupId
          )

          if (activeIndex === -1 || overIndex === -1) return previousSplits

          return arrayMove(previousSplits, activeIndex, overIndex)
        })
      }

      if (dragType === "page" && overId) {
        const activePageId = String(event.active.id) as PageId
        const overPageId = String(overId) as PageId

        updateSplits((previousSplits) => {
          const overGroupId = findGroupId(previousSplits, String(overId))

          if (dragStartGroupIdRef.current !== overGroupId) {
            return previousSplits
          }

          return reorderPageInGroup({
            groups: previousSplits,
            activePageId,
            overPageId,
          })
        })
      }

      dragStartGroupIdRef.current = null
      dragStartGroupsRef.current = null
      setActivePageId(null)
      setActiveSplitGroupId(null)
    },
    [updateSplits]
  )

  const handleDragCancel = React.useCallback(() => {
    if (dragStartGroupsRef.current) {
      onSplitsChange(dragStartGroupsRef.current)
    }

    dragStartGroupIdRef.current = null
    dragStartGroupsRef.current = null
    setActivePageId(null)
    setActiveSplitGroupId(null)
  }, [onSplitsChange])

  const isPageDragging = activePageId !== null
  const activeSplitGroup = activeSplitGroupId
    ? splits.find((group) => group.id === activeSplitGroupId)
    : null

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col bg-muted/20",
        withFrameDivider && "border-t md:border-t-0 md:border-l",
        className
      )}
    >
      <div className="flex min-h-12 items-center justify-end gap-3 border-b bg-background px-3">
        <Button type="button" variant="outline" size="sm" onClick={addSplit}>
          <HugeiconsIcon icon={Add01Icon} className="size-4" />
          {addSplitLabel}
        </Button>
      </div>
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={splitterCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <ScrollArea className="min-h-0 flex-1" scrollFade>
          <SortableContext
            items={splits.map((group) => getSplitSortableId(group.id))}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3 p-3">
              {splits.map((group) => (
                <SortableSplitGroupCard
                  key={group.id}
                  activeItemId={
                    activePageId ? activePageId : resolvedActiveItemId
                  }
                  emptyLabel={emptyLabel}
                  getItemFile={resolvedGetItemFile}
                  getItemLabel={resolvedGetItemLabel}
                  group={group}
                  labelPlacement={labelPlacement}
                  pageRangeLabel={
                    getSplitLabel?.(group) ??
                    pageRangeLabels[group.id] ??
                    "No pages"
                  }
                  isPageDragging={isPageDragging}
                  thumbnailImages={thumbnailImages}
                  thumbnailSize={thumbnailSize}
                  canRemove={splits.length > 1}
                  onRemove={() => removeSplit(group.id)}
                  onSelectItem={selectItem}
                />
              ))}
            </div>
          </SortableContext>
        </ScrollArea>
        <DragOverlay dropAnimation={DRAG_OVERLAY_DROP_ANIMATION} zIndex={1000}>
          {activePageId ? (
            <PageDragOverlay
              getItemFile={resolvedGetItemFile}
              getItemLabel={resolvedGetItemLabel}
              labelPlacement={labelPlacement}
              pageId={activePageId}
              imageUrl={thumbnailImages[activePageId]}
              thumbnailSize={thumbnailSize}
            />
          ) : activeSplitGroup ? (
            <SplitGroupDragOverlay
              activeItemId={resolvedActiveItemId}
              emptyLabel={emptyLabel}
              getItemFile={resolvedGetItemFile}
              getItemLabel={resolvedGetItemLabel}
              group={activeSplitGroup}
              labelPlacement={labelPlacement}
              pageRangeLabel={
                getSplitLabel?.(activeSplitGroup) ??
                pageRangeLabels[activeSplitGroup.id] ??
                "No pages"
              }
              isPageDragging={false}
              thumbnailImages={thumbnailImages}
              thumbnailSize={thumbnailSize}
              onSelectItem={selectItem}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </aside>
  )
}

function usePdfThumbnailImages(documentKey: string) {
  const [thumbnailImages, setThumbnailImages] = React.useState<
    Record<PageId, string>
  >({})
  const thumbnailObjectUrlsRef = React.useRef(new Set<string>())

  const clearCachedThumbnails = React.useCallback(() => {
    thumbnailObjectUrlsRef.current.forEach((imageUrl) => {
      URL.revokeObjectURL(imageUrl)
    })
    thumbnailObjectUrlsRef.current.clear()
    setThumbnailImages({})
  }, [])

  React.useEffect(() => {
    clearCachedThumbnails()
  }, [clearCachedThumbnails, documentKey])

  React.useEffect(() => {
    const objectUrls = thumbnailObjectUrlsRef.current

    return () => {
      objectUrls.forEach((imageUrl) => {
        URL.revokeObjectURL(imageUrl)
      })
      objectUrls.clear()
    }
  }, [])

  const handleThumbnailReady = React.useCallback(
    (pageId: PageId, imageUrl: string) => {
      setThumbnailImages((currentImages) => {
        if (currentImages[pageId]) {
          URL.revokeObjectURL(imageUrl)
          return currentImages
        }

        thumbnailObjectUrlsRef.current.add(imageUrl)
        return { ...currentImages, [pageId]: imageUrl }
      })
    },
    []
  )

  return { thumbnailImages, onThumbnailReady: handleThumbnailReady }
}

function PdfThumbnailCacheItem({
  pageId,
  reactPdf,
  onThumbnailReady,
}: {
  pageId: PageId
  reactPdf: ReactPdfModule
  onThumbnailReady: (pageId: PageId, imageUrl: string) => void
}) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const pageNumber = getPageNumber(pageId)

  return (
    <div ref={rootRef} className="size-[1px] overflow-hidden">
      <reactPdf.Thumbnail
        pageNumber={pageNumber}
        width={THUMBNAIL_WIDTH}
        className="block [&_.react-pdf__Thumbnail__page]:!m-0"
        onRenderSuccess={() => {
          window.requestAnimationFrame(() => {
            const canvas = rootRef.current?.querySelector("canvas")

            if (!canvas) return

            try {
              canvas.toBlob((blob) => {
                if (!blob) return

                onThumbnailReady(pageId, URL.createObjectURL(blob))
              }, "image/png")
            } catch {
              // Canvas export can fail if the browser marks it tainted.
            }
          })
        }}
        loading={null}
      />
    </div>
  )
}

function PdfThumbnailCache({
  splits,
  thumbnailImages,
  reactPdf,
  onThumbnailReady,
}: {
  splits: SplitGroup[]
  thumbnailImages: Record<PageId, string>
  reactPdf: ReactPdfModule
  onThumbnailReady: (pageId: PageId, imageUrl: string) => void
}) {
  const uncachedPageIds = React.useMemo(
    () =>
      Array.from(new Set(splits.flatMap((split) => split.pages))).filter(
        (pageId) => !thumbnailImages[pageId]
      ),
    [splits, thumbnailImages]
  )

  if (uncachedPageIds.length === 0) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-[-10000px] z-[-1] opacity-0"
    >
      {uncachedPageIds.map((pageId) => (
        <PdfThumbnailCacheItem
          key={pageId}
          pageId={pageId}
          reactPdf={reactPdf}
          onThumbnailReady={onThumbnailReady}
        />
      ))}
    </div>
  )
}

function WorkbookViewerPane({
  workbookIdentity,
}: {
  workbookIdentity: string
}) {
  const { resolvedTheme } = useTheme()
  const { nightRenderEnabled, setNightRenderEnabled } =
    useWorkbookNightRenderPreference()
  const shouldRenderNightMode = resolvedTheme === "dark"
  const effectiveIsDark = shouldRenderNightMode && nightRenderEnabled

  return (
    <XlsxWorkbookSurface
      className="h-full"
      isDark={effectiveIsDark}
      onIsDarkChange={setNightRenderEnabled}
      onUploadClick={() => {}}
      renderTableHeaderMenu={(props) => <WorkbookTableHeaderMenu {...props} />}
      rounded={false}
      showNightRenderToggle={shouldRenderNightMode}
      showUploadButton={false}
      workbookIdentity={workbookIdentity}
    />
  )
}

function WorkbookSplitsPane({
  className,
  workbookIdentity,
}: {
  className?: string
  workbookIdentity: string
}) {
  const { activeSheetIndex, setActiveSheetIndex, sheets } = useXlsxViewer()
  const sheetNames = React.useMemo(
    () => sheets.map((sheet) => sheet.name),
    [sheets]
  )
  const [splits, setSplits] = React.useState<DocumentSplit[]>(() =>
    createInitialWorkbookSplits(DEFAULT_PREVIEW_SHEET_COUNT)
  )
  const thumbnailUrls = useWorkbookSheetThumbnailUrls(workbookIdentity)
  const thumbnailImages = React.useMemo(
    () =>
      Object.fromEntries(
        Object.entries(thumbnailUrls).map(([sheetIndex, imageUrl]) => [
          toWorkbookSheetId(Number(sheetIndex)),
          imageUrl,
        ])
      ),
    [thumbnailUrls]
  )

  React.useEffect(() => {
    if (sheets.length === 0) return

    setSplits(createInitialWorkbookSplits(sheets.length))
  }, [sheets.length, workbookIdentity])

  return (
    <DocumentSplits
      activeItemId={toWorkbookSheetId(activeSheetIndex)}
      addSplitLabel="Add split"
      className={className}
      dndId="workbook-document-splits-dnd"
      emptyLabel="Drop sheets here"
      getItemFile={() => ({
        name: XLSX_THUMBNAIL_FILE.name,
        type: XLSX_THUMBNAIL_FILE.type,
      })}
      getItemLabel={(itemId) => {
        const sheetIndex = getWorkbookSheetIndex(itemId as WorkbookSheetId)

        return sheetNames[sheetIndex] ?? `Sheet ${sheetIndex + 1}`
      }}
      getSplitLabel={(split) => createWorkbookSplitLabel(split, sheetNames)}
      labelPlacement="bottom"
      splits={splits}
      thumbnailImages={thumbnailImages}
      thumbnailSize={{
        width: SHEET_THUMBNAIL_WIDTH,
        height: SHEET_THUMBNAIL_HEIGHT,
      }}
      withFrameDivider={false}
      onSelectItem={(itemId) =>
        setActiveSheetIndex(getWorkbookSheetIndex(itemId as WorkbookSheetId))
      }
      onSplitsChange={setSplits}
    />
  )
}

export function XlsxDocumentSplitsBlock() {
  const controller = useXlsxViewerController(
    React.useMemo(
      () => ({
        allowResizeInReadOnly: true,
        fileName: "crazy-chart-zoo.xlsx",
        readOnly: true,
        src: XLSX_URL,
        useWorker: true,
      }),
      []
    )
  )

  return (
    <XlsxViewerProvider controller={controller}>
      <PdfBlockResizableShell
        autoSaveId="xlsx-block-document-splits"
        heightClassName="h-[720px]"
        rightDefaultSize={48}
        rightMaxSize={64}
        rightMinSize={30}
        left={<WorkbookViewerPane workbookIdentity={XLSX_URL} />}
        right={<WorkbookSplitsPane workbookIdentity={XLSX_URL} />}
      />
    </XlsxViewerProvider>
  )
}

export function DocumentSplitsBlock() {
  const [reactPdf, setReactPdf] = React.useState<ReactPdfModule | null>(null)
  const [pdfUrl, setPdfUrl] = React.useState(PDF_URL)
  const [numPages, setNumPages] = React.useState(0)
  const [activePage, setActivePage] = React.useState(1)
  const [splits, setSplits] = React.useState<SplitGroup[]>(() =>
    createInitialGroups(DEFAULT_PREVIEW_PAGE_COUNT)
  )
  const { thumbnailImages, onThumbnailReady } = usePdfThumbnailImages(pdfUrl)
  const viewerRef = React.useRef<PDFViewerHandle>(null)
  const uploadedPdfUrlRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    let isMounted = true

    import("react-pdf").then((module) => {
      module.pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL

      if (isMounted) {
        setReactPdf(module)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  React.useEffect(() => {
    return () => {
      if (uploadedPdfUrlRef.current) {
        URL.revokeObjectURL(uploadedPdfUrlRef.current)
      }
    }
  }, [])

  React.useEffect(() => {
    setSplits(createInitialGroups(numPages || DEFAULT_PREVIEW_PAGE_COUNT))
  }, [numPages, pdfUrl])

  const handleLoadSuccess = React.useCallback(
    ({ numPages: pageCount }: { numPages: number }) => {
      setNumPages(pageCount)
    },
    []
  )

  const handleActivePageChange = React.useCallback((pageNumber: number) => {
    window.queueMicrotask(() => {
      setActivePage((currentPage) =>
        currentPage === pageNumber ? currentPage : pageNumber
      )
    })
  }, [])

  const handlePdfUpload = React.useCallback((file: File) => {
    const nextUrl = URL.createObjectURL(file)

    if (uploadedPdfUrlRef.current) {
      URL.revokeObjectURL(uploadedPdfUrlRef.current)
    }

    uploadedPdfUrlRef.current = nextUrl
    setPdfUrl(nextUrl)
    setNumPages(0)
    setActivePage(1)
  }, [])

  const scrollToPage = React.useCallback((pageNumber: number) => {
    setActivePage(pageNumber)

    viewerRef.current?.scrollToPage(pageNumber, {
      block: "start",
      behavior: "auto",
    })
  }, [])

  const updatePageCountFromViewer = React.useCallback((pageCount: number) => {
    window.queueMicrotask(() => {
      setNumPages(pageCount)
    })
  }, [])

  const renderShell = () => (
    <PdfBlockResizableShell
      autoSaveId="pdf-block-document-splits"
      heightClassName="h-[720px]"
      rightDefaultSize={50}
      rightMaxSize={66}
      rightMinSize={30}
      left={
        <PDFViewer
          ref={viewerRef}
          file={pdfUrl}
          defaultZoom={DEFAULT_ZOOM}
          onActivePageChange={handleActivePageChange}
          onPdfUpload={handlePdfUpload}
          onDocumentLoadSuccess={updatePageCountFromViewer}
        />
      }
      right={
        <DocumentSplits
          activePage={activePage}
          splits={splits}
          thumbnailImages={thumbnailImages}
          withFrameDivider={false}
          onSplitsChange={setSplits}
          onSelectPage={scrollToPage}
        />
      }
    />
  )

  if (!reactPdf) {
    return renderShell()
  }

  return (
    <reactPdf.Document
      file={pdfUrl}
      onLoadSuccess={handleLoadSuccess}
      loading={renderShell()}
      error={
        <div className="grid h-[720px] place-items-center bg-background text-sm text-muted-foreground">
          Unable to load PDF.
        </div>
      }
    >
      <PdfThumbnailCache
        splits={splits}
        thumbnailImages={thumbnailImages}
        reactPdf={reactPdf}
        onThumbnailReady={onThumbnailReady}
      />
      {renderShell()}
    </reactPdf.Document>
  )
}

function DocumentSplitExampleCard({
  title,
  pages,
  activePage,
  className,
}: {
  title: string
  pages: number[]
  activePage?: number
  className?: string
}) {
  return (
    <section className={cn("rounded-lg border bg-background p-3", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 cursor-grab text-muted-foreground"
            aria-label={`Reorder ${title}`}
          >
            <HugeiconsIcon icon={DragDropVerticalIcon} className="size-4" />
          </Button>
          <div className="truncate text-sm font-medium">{title}</div>
        </div>
        <Badge variant="secondary" className="rounded-full">
          {pages.length} pages
        </Badge>
      </div>
      <ScrollArea
        className="h-[108px] w-full overflow-hidden"
        orientation="horizontal"
        scrollbarGutter
        scrollbarOverflowOnly
        viewportClassName="overflow-y-hidden"
      >
        <div className="flex w-max gap-2 overflow-y-hidden py-1 pr-4">
          {pages.map((page) => (
            <button
              key={page}
              type="button"
              className={cn(
                "relative h-[92px] w-[72px] shrink-0 overflow-hidden rounded-md border bg-muted text-xs text-muted-foreground transition-colors hover:border-primary/50",
                activePage === page &&
                  "border-primary bg-primary/5 text-primary"
              )}
            >
              <div className="absolute inset-2 rounded-sm bg-background/70 shadow-sm" />
              <span className="absolute right-1.5 bottom-1.5 rounded bg-background/90 px-1 text-[10px]">
                {page}
              </span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </section>
  )
}

function DocumentSplitsExample() {
  return (
    <div className="flex h-[520px] flex-col gap-3 bg-background p-3">
      <DocumentSplitExampleCard
        title="Abstract and intro"
        pages={[1, 2, 3]}
        activePage={2}
      />
      <DocumentSplitExampleCard
        title="Model architecture"
        pages={[4, 5, 6, 7, 8]}
        className="border-blue-500/50 bg-blue-500/5"
      />
      <DocumentSplitExampleCard
        title="Training and results"
        pages={[9, 10, 11, 12, 13, 14, 15]}
      />
    </div>
  )
}

function DocumentSplitsPreview({ file }: { file: string }) {
  const [reactPdf, setReactPdf] = React.useState<ReactPdfModule | null>(null)
  const [pageCount, setPageCount] = React.useState(0)
  const [splits, setSplits] = React.useState<SplitGroup[]>(() =>
    createInitialGroups(DEFAULT_PREVIEW_PAGE_COUNT)
  )
  const { thumbnailImages, onThumbnailReady } = usePdfThumbnailImages(file)

  React.useEffect(() => {
    let isMounted = true

    import("react-pdf").then((module) => {
      module.pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL

      if (isMounted) {
        setReactPdf(module)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  React.useEffect(() => {
    setSplits(createInitialGroups(pageCount || DEFAULT_PREVIEW_PAGE_COUNT))
  }, [file, pageCount])

  const panel = (
    <DocumentSplits
      activePage={1}
      className="h-[620px]"
      splits={splits}
      thumbnailImages={thumbnailImages}
      withFrameDivider={false}
      onSplitsChange={setSplits}
      onSelectPage={() => {}}
    />
  )

  if (!reactPdf) return panel

  return (
    <reactPdf.Document
      file={file}
      onLoadSuccess={({ numPages }) => setPageCount(numPages)}
      loading={panel}
      error={
        <div className="grid h-[620px] place-items-center bg-background text-sm text-muted-foreground">
          Unable to load PDF.
        </div>
      }
    >
      <PdfThumbnailCache
        splits={splits}
        thumbnailImages={thumbnailImages}
        reactPdf={reactPdf}
        onThumbnailReady={onThumbnailReady}
      />
      {panel}
    </reactPdf.Document>
  )
}

export function DocumentSplitsDemo() {
  const [isCodeVisible, setIsCodeVisible] = React.useState(false)

  return (
    <div
      data-slot="component-preview"
      className="group relative mt-4 mb-12 flex flex-col overflow-hidden rounded-xl border"
    >
      <DocumentSplitsPreview file="/samples/attention.pdf" />
      <div
        data-slot="code"
        data-mobile-code-visible={isCodeVisible}
        className="relative overflow-hidden **:data-[slot=copy-button]:right-4 **:data-[slot=copy-button]:hidden data-[mobile-code-visible=true]:**:data-[slot=copy-button]:flex [&_[data-rehype-pretty-code-figure]]:m-0! [&_[data-rehype-pretty-code-figure]]:rounded-t-none [&_[data-rehype-pretty-code-figure]]:border-t [&_pre]:max-h-72"
      >
        {isCodeVisible ? (
          <HighlightedCodeBlock
            code={documentSplitterUsageCode}
            className="rounded-none border-x-0 border-b-0"
          />
        ) : (
          <div className="relative">
            <HighlightedCodeBlock
              code={documentSplitterUsageCode}
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

const documentSplitterUsageCode = String.raw`"use client";

import * as React from "react";

import {
  DocumentSplits,
  type DocumentSplit,
  type DocumentSplitPageId,
} from "@/components/ui/document-splits";

type ReactPdfModule = typeof import("react-pdf");

const PDF_FILE = "/samples/attention.pdf";
const PDF_WORKER_URL = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();
const THUMBNAIL_WIDTH = 72;
const DEFAULT_PAGE_COUNT = 15;

function toPageId(pageNumber: number): DocumentSplitPageId {
  return ("page-" + pageNumber) as DocumentSplitPageId;
}

function getPageNumber(pageId: DocumentSplitPageId) {
  return Number(pageId.replace("page-", ""));
}

function createInitialSplits(pageCount: number): DocumentSplit[] {
  const pages = Array.from({ length: pageCount }, (_, index) => toPageId(index + 1));

  return [
    { id: "split-1", title: "Abstract and intro", pages: pages.slice(0, Math.min(3, pageCount)) },
    { id: "split-2", title: "Model architecture", pages: pages.slice(3, Math.min(8, pageCount)) },
    { id: "split-3", title: "Training and results", pages: pages.slice(8) },
  ].filter((split) => split.pages.length > 0);
}

function usePdfThumbnailImages(documentKey: string) {
  const [thumbnailImages, setThumbnailImages] = React.useState<Record<DocumentSplitPageId, string>>({});
  const objectUrlsRef = React.useRef(new Set<string>());

  React.useEffect(() => {
    objectUrlsRef.current.forEach((imageUrl) => URL.revokeObjectURL(imageUrl));
    objectUrlsRef.current.clear();
    setThumbnailImages({});
  }, [documentKey]);

  React.useEffect(() => {
    const objectUrls = objectUrlsRef.current;

    return () => {
      objectUrls.forEach((imageUrl) => URL.revokeObjectURL(imageUrl));
      objectUrls.clear();
    };
  }, []);

  const onThumbnailReady = React.useCallback((pageId: DocumentSplitPageId, imageUrl: string) => {
    setThumbnailImages((currentImages) => {
      if (currentImages[pageId]) {
        URL.revokeObjectURL(imageUrl);
        return currentImages;
      }

      objectUrlsRef.current.add(imageUrl);
      return { ...currentImages, [pageId]: imageUrl };
    });
  }, []);

  return { thumbnailImages, onThumbnailReady };
}

function PdfThumbnailCacheItem({
  pageId,
  reactPdf,
  onThumbnailReady,
}: {
  pageId: DocumentSplitPageId;
  reactPdf: ReactPdfModule;
  onThumbnailReady: (pageId: DocumentSplitPageId, imageUrl: string) => void;
}) {
  const rootRef = React.useRef<HTMLDivElement>(null);

  return (
    <div ref={rootRef} className="size-[1px] overflow-hidden">
      <reactPdf.Thumbnail
        pageNumber={getPageNumber(pageId)}
        width={THUMBNAIL_WIDTH}
        loading={null}
        onRenderSuccess={() => {
          window.requestAnimationFrame(() => {
            const canvas = rootRef.current?.querySelector("canvas");

            if (!canvas) return;

            canvas.toBlob((blob) => {
              if (!blob) return;
              onThumbnailReady(pageId, URL.createObjectURL(blob));
            }, "image/png");
          });
        }}
      />
    </div>
  );
}

function PdfThumbnailCache({
  splits,
  thumbnailImages,
  reactPdf,
  onThumbnailReady,
}: {
  splits: DocumentSplit[];
  thumbnailImages: Record<DocumentSplitPageId, string>;
  reactPdf: ReactPdfModule;
  onThumbnailReady: (pageId: DocumentSplitPageId, imageUrl: string) => void;
}) {
  const uncachedPageIds = React.useMemo(
    () =>
      Array.from(new Set(splits.flatMap((split) => split.pages))).filter(
        (pageId) => !thumbnailImages[pageId],
      ),
    [splits, thumbnailImages],
  );

  if (uncachedPageIds.length === 0) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed top-0 left-[-10000px] z-[-1] opacity-0">
      {uncachedPageIds.map((pageId) => (
        <PdfThumbnailCacheItem
          key={pageId}
          pageId={pageId}
          reactPdf={reactPdf}
          onThumbnailReady={onThumbnailReady}
        />
      ))}
    </div>
  );
}

export function DocumentSplitsExample() {
  const [reactPdf, setReactPdf] = React.useState<ReactPdfModule | null>(null);
  const [pageCount, setPageCount] = React.useState(0);
  const [splits, setSplits] = React.useState<DocumentSplit[]>(() => createInitialSplits(DEFAULT_PAGE_COUNT));
  const { thumbnailImages, onThumbnailReady } = usePdfThumbnailImages(PDF_FILE);

  React.useEffect(() => {
    let isMounted = true;

    import("react-pdf").then((module) => {
      module.pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;

      if (isMounted) setReactPdf(module);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    setSplits(createInitialSplits(pageCount || DEFAULT_PAGE_COUNT));
  }, [pageCount]);

  const panel = (
    <DocumentSplits
      activePage={1}
      className="h-[620px]"
      splits={splits}
      thumbnailImages={thumbnailImages}
      withFrameDivider={false}
      onSplitsChange={setSplits}
      onSelectPage={() => {}}
    />
  );

  if (!reactPdf) return panel;

  return (
    <reactPdf.Document file={PDF_FILE} onLoadSuccess={({ numPages }) => setPageCount(numPages)} loading={panel}>
      <PdfThumbnailCache
        splits={splits}
        thumbnailImages={thumbnailImages}
        reactPdf={reactPdf}
        onThumbnailReady={onThumbnailReady}
      />
      {panel}
    </reactPdf.Document>
  );
}`

const documentSplitterSourceCode = String.raw`"use client";

import * as React from "react";
import { closestCenter, DndContext, DragOverlay, PointerSensor, useDroppable, useSensor, useSensors, type DragEndEvent, type DragOverEvent, type DragStartEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Add01Icon, Delete02Icon, DragDropVerticalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { FileThumbnail } from "@/components/ui/file-thumbnail";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type DocumentSplitPageId = \`page-\${number}\`;
export type DocumentSplit = {
  id: string;
  title: string;
  pages: DocumentSplitPageId[];
};

type PageId = DocumentSplitPageId;
type SplitGroup = DocumentSplit;

const THUMBNAIL_WIDTH = 72;
const THUMBNAIL_HEIGHT = 92;

function getPageNumber(pageId: PageId) {
  return Number(pageId.replace("page-", ""));
}

function getSplitSortableId(groupId: string) {
  return "split-sortable-" + groupId;
}

function findGroupId(groups: SplitGroup[], id: string) {
  if (groups.some((group) => group.id === id)) return id;
  return groups.find((group) => group.pages.includes(id as PageId))?.id ?? null;
}

function getGroupPages(groups: SplitGroup[], groupId: string | null) {
  return groups.find((group) => group.id === groupId)?.pages ?? [];
}

function movePageToGroup({
  activePageId,
  groups,
  insertIndex,
  targetGroupId,
}: {
  activePageId: PageId;
  groups: SplitGroup[];
  insertIndex: number;
  targetGroupId: string;
}) {
  return groups.map((group) => {
    const pagesWithoutActive = group.pages.filter((pageId) => pageId !== activePageId);

    if (group.id !== targetGroupId) {
      return { ...group, pages: pagesWithoutActive };
    }

    const nextPages = [...pagesWithoutActive];
    nextPages.splice(insertIndex, 0, activePageId);
    return { ...group, pages: nextPages };
  });
}

function reorderPageInGroup({
  activePageId,
  groups,
  overPageId,
}: {
  activePageId: PageId;
  groups: SplitGroup[];
  overPageId: PageId;
}) {
  const groupId = findGroupId(groups, activePageId);
  const pages = getGroupPages(groups, groupId);
  const activeIndex = pages.indexOf(activePageId);
  const overIndex = pages.indexOf(overPageId);

  if (!groupId || activeIndex === -1 || overIndex === -1) return groups;

  return groups.map((group) =>
    group.id === groupId ? { ...group, pages: arrayMove(group.pages, activeIndex, overIndex) } : group,
  );
}

function createPageRangeLabel(pageIds: PageId[]) {
  if (pageIds.length === 0) return "No pages";
  return "Pages " + pageIds.map(getPageNumber).join(", ");
}

function SplitGroupDropzone({
  children,
  group,
}: {
  children: React.ReactNode;
  group: SplitGroup;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: group.id,
    data: { type: "page-dropzone", isEmpty: group.pages.length === 0 },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn("min-h-[116px] rounded-lg p-2 transition-[background-color,box-shadow]", isOver && "bg-accent/30 shadow-[inset_0_0_0_1px_var(--border)]")}
    >
      {children}
    </div>
  );
}

function PageThumbnail({
  imageUrl,
  isActive,
  onSelect,
  pageId,
}: {
  imageUrl?: string;
  isActive: boolean;
  onSelect: (pageNumber: number) => void;
  pageId: PageId;
}) {
  const pageNumber = getPageNumber(pageId);
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: pageId,
    data: { type: "page" },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={cn(
        "relative shrink-0 cursor-grab overflow-hidden rounded-md border bg-muted text-left shadow-xs active:cursor-grabbing",
        isActive ? "border-blue-500 shadow-[0_0_0_2px_rgb(59_130_246_/_14%)]" : "border-border hover:border-foreground/30",
        isDragging && "opacity-0",
      )}
      style={{
        width: THUMBNAIL_WIDTH,
        height: THUMBNAIL_HEIGHT,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      onClick={() => onSelect(pageNumber)}
      {...attributes}
      {...listeners}
    >
      <FileThumbnail
        file={{ name: "page-" + pageNumber + ".pdf", type: "application/pdf", size: "Page " + pageNumber }}
        showMetadata={false}
        previewImageUrl={imageUrl}
        isLoading={!imageUrl}
        previewClassName="h-full aspect-auto"
        className="size-full rounded-[inherit] border-0"
      />
      <span className="absolute right-1 bottom-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium shadow-xs">
        {pageNumber}
      </span>
    </button>
  );
}

function SplitGroupCard({
  activePage,
  group,
  dragHandleProps,
  thumbnailImages,
  onRemove,
  onSelectPage,
}: {
  activePage: number;
  group: SplitGroup;
  dragHandleProps?: React.ComponentPropsWithoutRef<"button">;
  thumbnailImages: Record<PageId, string>;
  onRemove: () => void;
  onSelectPage: (pageNumber: number) => void;
}) {
  return (
    <section className="rounded-lg border bg-background">
      <div className="flex items-center justify-between gap-3 border-b p-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            aria-label={"Reorder " + group.title}
            className="inline-flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
            {...dragHandleProps}
          >
            <HugeiconsIcon icon={DragDropVerticalIcon} className="size-4" />
          </button>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{group.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">{createPageRangeLabel(group.pages)}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {group.pages.length}
          </div>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={"Remove " + group.title} onClick={onRemove}>
            <HugeiconsIcon icon={Delete02Icon} className="size-4" />
          </Button>
        </div>
      </div>
      <SplitGroupDropzone group={group}>
        <SortableContext items={group.pages} strategy={horizontalListSortingStrategy}>
          <ScrollArea
            className="h-[110px] w-full overflow-hidden"
            orientation="horizontal"
            scrollbarGutter
            scrollbarOverflowOnly
            viewportClassName="overflow-y-hidden"
          >
            <div className="flex w-max gap-2 overflow-y-hidden py-1 pr-6">
              {group.pages.map((pageId) => (
                <PageThumbnail
                  key={pageId}
                  pageId={pageId}
                  imageUrl={thumbnailImages[pageId]}
                  isActive={activePage === getPageNumber(pageId)}
                  onSelect={onSelectPage}
                />
              ))}
            </div>
          </ScrollArea>
        </SortableContext>
      </SplitGroupDropzone>
    </section>
  );
}

function SortableSplitGroupCard({
  activePage,
  group,
  thumbnailImages,
  onRemove,
  onSelectPage,
}: {
  activePage: number;
  group: SplitGroup;
  thumbnailImages: Record<PageId, string>;
  onRemove: () => void;
  onSelectPage: (pageNumber: number) => void;
}) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: getSplitSortableId(group.id),
    data: { type: "split", groupId: group.id },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(isDragging && "opacity-0")}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <SplitGroupCard
        activePage={activePage}
        group={group}
        thumbnailImages={thumbnailImages}
        dragHandleProps={{ ...attributes, ...listeners }}
        onRemove={onRemove}
        onSelectPage={onSelectPage}
      />
    </div>
  );
}

export function DocumentSplits({
  activePage,
  className,
  splits,
  thumbnailImages = {},
  withFrameDivider = true,
  onSelectPage,
  onSplitsChange,
}: {
  activePage: number;
  className?: string;
  splits: SplitGroup[];
  thumbnailImages?: Record<PageId, string>;
  withFrameDivider?: boolean;
  onSelectPage: (pageNumber: number) => void;
  onSplitsChange: (splits: SplitGroup[]) => void;
}) {
  const [activePageId, setActivePageId] = React.useState<PageId | null>(null);
  const dragStartGroupIdRef = React.useRef<string | null>(null);
  const dragStartSplitsRef = React.useRef<SplitGroup[] | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragStart = React.useCallback((event: DragStartEvent) => {
    if (event.active.data.current?.type === "page") {
      const pageId = String(event.active.id);
      dragStartGroupIdRef.current = findGroupId(splits, pageId);
      dragStartSplitsRef.current = splits;
      setActivePageId(pageId as PageId);
    }
  }, [splits]);

  const handleDragOver = React.useCallback((event: DragOverEvent) => {
    if (event.active.data.current?.type !== "page" || !event.over) return;

    const pageId = String(event.active.id) as PageId;
    const overId = String(event.over.id);

    onSplitsChange((() => {
      const current = splits;
      const sourceGroupId = findGroupId(current, pageId);
      const targetGroupId = findGroupId(current, overId);

      if (!sourceGroupId || !targetGroupId || sourceGroupId === targetGroupId) {
        return current;
      }

      const targetPages = getGroupPages(current, targetGroupId);
      const overIndex = targetPages.indexOf(overId);
      const insertIndex = overIndex === -1 ? targetPages.length : overIndex;

      return movePageToGroup({
        activePageId: pageId,
        groups: current,
        insertIndex,
        targetGroupId,
      });
    })());
  }, [onSplitsChange, splits]);

  const handleDragEnd = React.useCallback((event: DragEndEvent) => {
    if (event.active.data.current?.type === "split" && event.over) {
      const activeGroupId = event.active.data.current.groupId;
      const overGroupId = event.over.data.current?.groupId;

      const activeIndex = splits.findIndex((group) => group.id === activeGroupId);
      const overIndex = splits.findIndex((group) => group.id === overGroupId);
      if (activeIndex !== -1 && overIndex !== -1) onSplitsChange(arrayMove(splits, activeIndex, overIndex));

      return;
    }

    if (event.active.data.current?.type !== "page" || !event.over) {
      dragStartGroupIdRef.current = null;
      setActivePageId(null);
      return;
    }

    const pageId = String(event.active.id) as PageId;
    const overId = String(event.over.id) as PageId;

    const overGroupId = findGroupId(splits, overId);

    if (dragStartGroupIdRef.current === overGroupId) {
      onSplitsChange(reorderPageInGroup({
        activePageId: pageId,
        groups: splits,
        overPageId: overId,
      }));
    }

    dragStartGroupIdRef.current = null;
    setActivePageId(null);
  }, [onSplitsChange, splits]);

  return (
    <aside className={cn("flex h-full min-h-0 flex-col bg-muted/20", withFrameDivider && "border-t md:border-t-0 md:border-l", className)}>
      <div className="flex min-h-12 items-center justify-end gap-3 border-b bg-background px-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onSplitsChange([
              ...splits,
              { id: "split-" + Date.now(), title: "Split " + (splits.length + 1), pages: [] },
            ])
          }
        >
          <HugeiconsIcon icon={Add01Icon} className="size-4" />
          Add split
        </Button>
      </div>
        <DndContext
          id="document-splits-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={() => {
            if (dragStartSplitsRef.current) onSplitsChange(dragStartSplitsRef.current);
            dragStartSplitsRef.current = null;
            dragStartGroupIdRef.current = null;
            setActivePageId(null);
          }}
        >
          <ScrollArea className="min-h-0 flex-1" scrollFade>
            <SortableContext items={splits.map((group) => getSplitSortableId(group.id))} strategy={verticalListSortingStrategy}>
              <div className="space-y-3 p-3">
                {splits.map((group) => (
                  <SortableSplitGroupCard
                    key={group.id}
                    activePage={activePageId ? getPageNumber(activePageId) : activePage}
                    group={group}
                    thumbnailImages={thumbnailImages}
                    onRemove={() => onSplitsChange(splits.filter((split) => split.id !== group.id))}
                    onSelectPage={onSelectPage}
                  />
                ))}
              </div>
            </SortableContext>
          </ScrollArea>
          <DragOverlay>
            {activePageId ? (
              <div
                className="relative overflow-hidden rounded-md border bg-background shadow-lg"
                style={{ width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT }}
              >
                <FileThumbnail
                  file={{ name: activePageId + ".pdf", type: "application/pdf" }}
                  showMetadata={false}
                  previewImageUrl={thumbnailImages[activePageId]}
                  isLoading={!thumbnailImages[activePageId]}
                  previewClassName="h-full aspect-auto"
                  className="size-full rounded-[inherit] border-0"
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
    </aside>
  );
}`

export function DocumentSplitsSource() {
  return <HighlightedCodeBlock code={documentSplitterSourceCode} />
}
