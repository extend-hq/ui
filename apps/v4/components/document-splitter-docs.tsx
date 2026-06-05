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
  useControllableDarkMode,
  WorkbookSheetTabs,
  WorkbookTableHeaderMenu,
  XlsxWorkbookSurface,
} from "@/components/ui/xlsx-viewer"
import {
  DocsSourceCodeBlock,
  DocsViewCodeBlock,
} from "@/components/docs-code-block"
import { PdfBlockResizableShell } from "@/components/pdf-block-resizable-shell"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

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
const DEFAULT_THUMBNAIL_SIZE = {
  width: THUMBNAIL_WIDTH,
  height: THUMBNAIL_HEIGHT,
} satisfies ThumbnailSize
const SHEET_THUMBNAIL_WIDTH = 112
const SHEET_THUMBNAIL_HEIGHT = 76
const SHEET_THUMBNAIL_PREVIEW_CLASS_NAME =
  "size-full !aspect-auto bg-white [&>img]:!h-auto [&>img]:!w-full [&>img]:object-left-top"
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
  imageUrl,
  thumbnailSize,
  onSelect,
}: {
  itemFile: ThumbnailFile
  itemId: DocumentSplitItemId
  itemLabel: React.ReactNode
  labelPlacement: ThumbnailLabelPlacement
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
        className="relative cursor-grab overflow-hidden rounded-md border border-border bg-muted text-left shadow-xs transition-[border-color,opacity] hover:border-foreground/30 active:cursor-grabbing"
        style={{ width: thumbnailSize.width, height: thumbnailSize.height }}
        onClick={() => onSelect(itemId)}
      >
        <FileThumbnail
          file={itemFile}
          previewImageUrl={imageUrl}
          previewClassName={
            labelPlacement === "bottom"
              ? SHEET_THUMBNAIL_PREVIEW_CLASS_NAME
              : "h-full aspect-auto"
          }
          className="size-full rounded-[inherit] border-0"
          isLoading={!imageUrl}
        />
        <span
          className={cn(
            "absolute bottom-1 rounded bg-background/95 px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow-xs ring-1 ring-border/80",
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
  imageUrl,
  thumbnailSize,
  onSelect,
}: {
  getItemFile: (itemId: DocumentSplitItemId) => ThumbnailFile
  getItemLabel: (itemId: DocumentSplitItemId) => React.ReactNode
  groupId: string
  pageId: PageId
  labelPlacement: ThumbnailLabelPlacement
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
        imageUrl={imageUrl}
        thumbnailSize={thumbnailSize}
        onSelect={onSelect}
      />
    </div>
  )
}

function SplitGroupCard({
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
    <Card className="w-full overflow-hidden rounded-xl before:rounded-[calc(var(--radius-xl)-1px)]">
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
      className={cn("w-full", isDragging && "opacity-0")}
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
      className="relative overflow-hidden rounded-md border border-border bg-background shadow-lg shadow-black/10"
      style={{ width: thumbnailSize.width, height: thumbnailSize.height }}
    >
      <FileThumbnail
        file={getItemFile(pageId)}
        previewImageUrl={imageUrl}
        previewClassName={
          labelPlacement === "bottom"
            ? SHEET_THUMBNAIL_PREVIEW_CLASS_NAME
            : "h-full aspect-auto"
        }
        className="size-full rounded-[inherit] border-0"
        isLoading={!imageUrl}
      />
      <span
        className={cn(
          "absolute bottom-1 rounded bg-background/95 px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow-xs ring-1 ring-border/80",
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
  > & { width?: number }
) {
  const { width, ...cardProps } = props

  return (
    <div className="relative z-40 max-w-[calc(100vw-2rem)]" style={{ width }}>
      <SplitGroupCard
        {...cardProps}
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
  draggedPageId,
  groups,
  insertIndex,
  targetGroupId,
}: {
  draggedPageId: PageId
  groups: SplitGroup[]
  insertIndex: number
  targetGroupId: string
}) {
  return groups.map((group) => {
    const pagesWithoutDragged = group.pages.filter(
      (pageId) => pageId !== draggedPageId
    )

    if (group.id !== targetGroupId) {
      return { ...group, pages: pagesWithoutDragged }
    }

    const nextPages = [...pagesWithoutDragged]
    nextPages.splice(insertIndex, 0, draggedPageId)
    return { ...group, pages: nextPages }
  })
}

function areSplitGroupsEqual(left: SplitGroup[], right: SplitGroup[]) {
  if (left === right) return true
  if (left.length !== right.length) return false

  return left.every((leftGroup, groupIndex) => {
    const rightGroup = right[groupIndex]
    if (!rightGroup) return false

    return (
      leftGroup.id === rightGroup.id &&
      leftGroup.title === rightGroup.title &&
      leftGroup.pages.length === rightGroup.pages.length &&
      leftGroup.pages.every(
        (pageId, pageIndex) => pageId === rightGroup.pages[pageIndex]
      )
    )
  })
}

function reorderPageInGroup({
  draggedPageId,
  groups,
  overPageId,
}: {
  draggedPageId: PageId
  groups: SplitGroup[]
  overPageId: PageId
}) {
  const groupId = findGroupId(groups, draggedPageId)
  const pages = getGroupPages(groups, groupId)
  const draggedIndex = pages.indexOf(draggedPageId)
  const overIndex = pages.indexOf(overPageId)

  if (!groupId || draggedIndex === -1 || overIndex === -1) return groups

  return groups.map((group) =>
    group.id === groupId
      ? { ...group, pages: arrayMove(group.pages, draggedIndex, overIndex) }
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
  addSplitLabel = "Add split",
  className,
  dndId = "document-splits-dnd",
  emptyLabel = "Drop pages here",
  getItemFile,
  getItemLabel,
  getSplitLabel,
  labelPlacement = "corner",
  splits,
  thumbnailSize = DEFAULT_THUMBNAIL_SIZE,
  thumbnailImages = {},
  withFrameDivider = true,
  onSplitsChange,
  onSelectItem,
  onSelectPage,
  onAddSplit,
  onRemoveSplit,
}: {
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
  const [draggedPageId, setDraggedPageId] = React.useState<PageId | null>(null)
  const [activeSplitGroupId, setActiveSplitGroupId] = React.useState<
    string | null
  >(null)
  const [activeSplitGroupWidth, setActiveSplitGroupWidth] = React.useState<
    number | undefined
  >()
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
      const nextSplits = updater(splits)

      if (areSplitGroupsEqual(splits, nextSplits)) return

      onSplitsChange(nextSplits)
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
        setDraggedPageId(pageId)
        setActiveSplitGroupId(null)
        setActiveSplitGroupWidth(undefined)
        return
      }

      if (dragType === "split") {
        dragStartGroupIdRef.current = null
        dragStartGroupsRef.current = null
        setDraggedPageId(null)
        setActiveSplitGroupId(
          (event.active.data.current?.groupId as string | undefined) ?? null
        )
        setActiveSplitGroupWidth(event.active.rect.current.initial?.width)
        return
      }

      dragStartGroupIdRef.current = null
      dragStartGroupsRef.current = null
      setDraggedPageId(null)
      setActiveSplitGroupId(null)
      setActiveSplitGroupWidth(undefined)
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
          draggedPageId: pageId,
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
          const draggedIndex = previousSplits.findIndex(
            (group) => group.id === activeGroupId
          )
          const overIndex = previousSplits.findIndex(
            (group) => group.id === overGroupId
          )

          if (draggedIndex === -1 || overIndex === -1) return previousSplits

          return arrayMove(previousSplits, draggedIndex, overIndex)
        })
      }

      if (dragType === "page" && overId) {
        const draggedPageId = String(event.active.id) as PageId
        const overPageId = String(overId) as PageId

        updateSplits((previousSplits) => {
          const overGroupId = findGroupId(previousSplits, String(overId))

          if (dragStartGroupIdRef.current !== overGroupId) {
            return previousSplits
          }

          return reorderPageInGroup({
            groups: previousSplits,
            draggedPageId,
            overPageId,
          })
        })
      }

      dragStartGroupIdRef.current = null
      dragStartGroupsRef.current = null
      setDraggedPageId(null)
      setActiveSplitGroupId(null)
      setActiveSplitGroupWidth(undefined)
    },
    [updateSplits]
  )

  const handleDragCancel = React.useCallback(() => {
    if (dragStartGroupsRef.current) {
      onSplitsChange(dragStartGroupsRef.current)
    }

    dragStartGroupIdRef.current = null
    dragStartGroupsRef.current = null
    setDraggedPageId(null)
    setActiveSplitGroupId(null)
    setActiveSplitGroupWidth(undefined)
  }, [onSplitsChange])

  const isPageDragging = draggedPageId !== null
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
        <DragOverlay dropAnimation={DRAG_OVERLAY_DROP_ANIMATION} zIndex={40}>
          {draggedPageId ? (
            <PageDragOverlay
              getItemFile={resolvedGetItemFile}
              getItemLabel={resolvedGetItemLabel}
              labelPlacement={labelPlacement}
              pageId={draggedPageId}
              imageUrl={thumbnailImages[draggedPageId]}
              thumbnailSize={thumbnailSize}
            />
          ) : activeSplitGroup ? (
            <SplitGroupDragOverlay
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
              width={activeSplitGroupWidth}
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
  const [effectiveIsDark, setIsDark] = useControllableDarkMode({})

  return (
    <XlsxWorkbookSurface
      className="h-full"
      isDark={effectiveIsDark}
      onIsDarkChange={setIsDark}
      onUploadClick={() => {}}
      renderTableHeaderMenu={(props) => <WorkbookTableHeaderMenu {...props} />}
      rounded={false}
      showNightRenderToggle
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

export function XlsxDocumentSplitsBlock({
  heightClassName = "h-[680px]",
}: {
  defaultViewerZoom?: number
  heightClassName?: string
} = {}) {
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
        heightClassName={heightClassName}
        rightDefaultSize={48}
        rightMaxSize={64}
        rightMinSize={30}
        left={<WorkbookViewerPane workbookIdentity={XLSX_URL} />}
        right={<WorkbookSplitsPane workbookIdentity={XLSX_URL} />}
      />
    </XlsxViewerProvider>
  )
}

export function DocumentSplitsBlock({
  defaultViewerZoom = DEFAULT_ZOOM,
  heightClassName = "h-[680px]",
}: {
  defaultViewerZoom?: number
  heightClassName?: string
} = {}) {
  const [reactPdf, setReactPdf] = React.useState<ReactPdfModule | null>(null)
  const [pdfUrl, setPdfUrl] = React.useState(PDF_URL)
  const [numPages, setNumPages] = React.useState(0)
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

  const handlePdfUpload = React.useCallback((file: File) => {
    const nextUrl = URL.createObjectURL(file)

    if (uploadedPdfUrlRef.current) {
      URL.revokeObjectURL(uploadedPdfUrlRef.current)
    }

    uploadedPdfUrlRef.current = nextUrl
    setPdfUrl(nextUrl)
    setNumPages(0)
  }, [])

  const scrollToPage = React.useCallback((pageNumber: number) => {
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
      heightClassName={heightClassName}
      rightDefaultSize={50}
      rightMaxSize={66}
      rightMinSize={30}
      left={
        <PDFViewer
          ref={viewerRef}
          file={pdfUrl}
          defaultZoom={defaultViewerZoom}
          onPdfUpload={handlePdfUpload}
          onDocumentLoadSuccess={updatePageCountFromViewer}
        />
      }
      right={
        <DocumentSplits
          splits={splits}
          thumbnailImages={thumbnailImages}
          withFrameDivider={false}
          onSplitsChange={setSplits}
          onSelectPage={scrollToPage}
        />
      }
    />
  )

  return (
    <>
      {renderShell()}
      {reactPdf ? (
        <reactPdf.Document
          file={pdfUrl}
          className="pointer-events-none fixed top-0 left-[-10000px] z-[-1] size-px overflow-hidden opacity-0"
          onLoadSuccess={handleLoadSuccess}
          loading={null}
          error={null}
        >
          <PdfThumbnailCache
            splits={splits}
            thumbnailImages={thumbnailImages}
            reactPdf={reactPdf}
            onThumbnailReady={onThumbnailReady}
          />
        </reactPdf.Document>
      ) : null}
    </>
  )
}

function DocumentSplitExampleCard({
  title,
  pages,
  className,
}: {
  title: string
  pages: number[]
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
              className="relative h-[92px] w-[72px] shrink-0 overflow-hidden rounded-md border border-border bg-muted text-xs text-foreground transition-colors hover:border-foreground/30"
            >
              <div className="absolute inset-2 rounded-sm bg-background/70 shadow-sm" />
              <span className="absolute right-1.5 bottom-1.5 rounded bg-background/95 px-1 text-[10px] font-semibold text-foreground shadow-xs ring-1 ring-border/80">
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
      <DocumentSplitExampleCard title="Abstract and intro" pages={[1, 2, 3]} />
      <DocumentSplitExampleCard
        title="Model architecture"
        pages={[4, 5, 6, 7, 8]}
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
  return (
    <div
      data-slot="component-preview"
      className="group relative mt-4 mb-12 flex flex-col overflow-hidden rounded-xl border"
    >
      <DocumentSplitsPreview file="/samples/attention.pdf" />
      <DocsViewCodeBlock code={documentSplitterUsageCode} />
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

const documentSplitterSourceCode =
  '"use client"\n\nimport * as React from "react"\nimport {\n  closestCenter,\n  DndContext,\n  DragOverlay,\n  PointerSensor,\n  useDroppable,\n  useSensor,\n  useSensors,\n  type CollisionDetection,\n  type DragEndEvent,\n  type DragOverEvent,\n  type DragStartEvent,\n} from "@dnd-kit/core"\nimport {\n  arrayMove,\n  horizontalListSortingStrategy,\n  SortableContext,\n  useSortable,\n  verticalListSortingStrategy,\n} from "@dnd-kit/sortable"\nimport { CSS } from "@dnd-kit/utilities"\nimport {\n  Add01Icon,\n  Delete02Icon,\n  DragDropVerticalIcon,\n} from "@hugeicons/core-free-icons"\nimport { HugeiconsIcon } from "@hugeicons/react"\n\nimport { cn } from "@/lib/utils"\nimport { FileThumbnail } from "@/components/ui/file-thumbnail"\nimport { Button } from "@/components/ui/button"\nimport { ScrollArea } from "@/components/ui/scroll-area"\n\nexport type DocumentSplitPageId = `page-${number}`\nexport type DocumentSplit = {\n  id: string\n  title: string\n  pages: DocumentSplitPageId[]\n}\n\ntype PageId = DocumentSplitPageId\ntype SplitGroup = DocumentSplit\n\nconst THUMBNAIL_WIDTH = 72\nconst THUMBNAIL_HEIGHT = 92\nconst DRAG_OVERLAY_DROP_ANIMATION = null\n\nconst splitterCollisionDetection: CollisionDetection = (args) => {\n  const dragType = args.active.data.current?.type\n\n  if (dragType === "page") {\n    return closestCenter({\n      ...args,\n      droppableContainers: args.droppableContainers.filter(\n        (container) =>\n          container.data.current?.type === "page" ||\n          (container.data.current?.type === "page-dropzone" &&\n            container.data.current?.isEmpty)\n      ),\n    })\n  }\n\n  if (dragType === "split") {\n    return closestCenter({\n      ...args,\n      droppableContainers: args.droppableContainers.filter(\n        (container) => container.data.current?.type === "split"\n      ),\n    })\n  }\n\n  return closestCenter(args)\n}\n\nexport const INITIAL_SPLITS: DocumentSplit[] = [\n  {\n    id: "split-1",\n    title: "Abstract and intro",\n    pages: ["page-1", "page-2", "page-3"],\n  },\n  {\n    id: "split-2",\n    title: "Model architecture",\n    pages: ["page-4", "page-5", "page-6", "page-7"],\n  },\n  {\n    id: "split-3",\n    title: "Training and results",\n    pages: ["page-8", "page-9", "page-10"],\n  },\n]\n\nexport function createInitialSplits(pageCount: number) {\n  if (pageCount <= 0) return INITIAL_SPLITS\n\n  const pages = Array.from(\n    { length: pageCount },\n    (_, index) => `page-${index + 1}` as PageId\n  )\n  const chunkSize = Math.max(1, Math.ceil(pageCount / 3))\n\n  return Array.from(\n    { length: Math.ceil(pageCount / chunkSize) },\n    (_, index) => {\n      const startIndex = index * chunkSize\n      const groupPages = pages.slice(startIndex, startIndex + chunkSize)\n      const firstPage = getPageNumber(groupPages[0])\n      const lastPage = getPageNumber(groupPages[groupPages.length - 1])\n\n      return {\n        id: `split-${index + 1}`,\n        title:\n          firstPage === lastPage\n            ? `Page ${firstPage}`\n            : `Pages ${firstPage}-${lastPage}`,\n        pages: groupPages,\n      }\n    }\n  )\n}\n\nfunction getPageNumber(pageId: PageId) {\n  return Number(pageId.replace("page-", ""))\n}\n\nfunction getSplitSortableId(groupId: string) {\n  return `split-sortable-${groupId}`\n}\n\nfunction findGroupId(groups: SplitGroup[], id: string) {\n  if (groups.some((group) => group.id === id)) return id\n\n  return groups.find((group) => group.pages.includes(id as PageId))?.id ?? null\n}\n\nfunction getGroupPages(groups: SplitGroup[], groupId: string | null) {\n  return groups.find((group) => group.id === groupId)?.pages ?? []\n}\n\nfunction movePageToGroup({\n  draggedPageId,\n  groups,\n  insertIndex,\n  targetGroupId,\n}: {\n  draggedPageId: PageId\n  groups: SplitGroup[]\n  insertIndex: number\n  targetGroupId: string\n}) {\n  return groups.map((group) => {\n    const pagesWithoutDragged = group.pages.filter(\n      (pageId) => pageId !== draggedPageId\n    )\n\n    if (group.id !== targetGroupId) {\n      return { ...group, pages: pagesWithoutDragged }\n    }\n\n    const nextPages = [...pagesWithoutDragged]\n    nextPages.splice(insertIndex, 0, draggedPageId)\n\n    return { ...group, pages: nextPages }\n  })\n}\n\nfunction areSplitGroupsEqual(left: SplitGroup[], right: SplitGroup[]) {\n  if (left === right) return true\n  if (left.length !== right.length) return false\n\n  return left.every((leftGroup, groupIndex) => {\n    const rightGroup = right[groupIndex]\n    if (!rightGroup) return false\n\n    return (\n      leftGroup.id === rightGroup.id &&\n      leftGroup.title === rightGroup.title &&\n      leftGroup.pages.length === rightGroup.pages.length &&\n      leftGroup.pages.every(\n        (pageId, pageIndex) => pageId === rightGroup.pages[pageIndex]\n      )\n    )\n  })\n}\n\nfunction reorderPageInGroup({\n  draggedPageId,\n  groups,\n  overPageId,\n}: {\n  draggedPageId: PageId\n  groups: SplitGroup[]\n  overPageId: PageId\n}) {\n  const groupId = findGroupId(groups, draggedPageId)\n  const pages = getGroupPages(groups, groupId)\n  const draggedIndex = pages.indexOf(draggedPageId)\n  const overIndex = pages.indexOf(overPageId)\n\n  if (!groupId || draggedIndex === -1 || overIndex === -1) return groups\n\n  return groups.map((group) =>\n    group.id === groupId\n      ? {\n          ...group,\n          pages: arrayMove(group.pages, draggedIndex, overIndex),\n        }\n      : group\n  )\n}\n\nfunction createPageRangeLabel(pageIds: PageId[]) {\n  if (pageIds.length === 0) return "No pages"\n\n  return `Pages ${pageIds.map(getPageNumber).join(", ")}`\n}\n\nfunction SplitGroupDropzone({\n  children,\n  group,\n}: {\n  children: React.ReactNode\n  group: SplitGroup\n}) {\n  const { isOver, setNodeRef } = useDroppable({\n    id: group.id,\n    data: { type: "page-dropzone", isEmpty: group.pages.length === 0 },\n  })\n\n  return (\n    <div\n      ref={setNodeRef}\n      className={cn(\n        "min-h-[116px] rounded-lg p-2 transition-[background-color,box-shadow]",\n        isOver && "bg-accent/30 shadow-[inset_0_0_0_1px_var(--border)]"\n      )}\n    >\n      {children}\n    </div>\n  )\n}\n\nfunction PageThumbnail({\n  imageUrl,\n  onSelect,\n  pageId,\n}: {\n  imageUrl?: string\n  onSelect: (pageNumber: number) => void\n  pageId: PageId\n}) {\n  const pageNumber = getPageNumber(pageId)\n  const {\n    attributes,\n    isDragging,\n    listeners,\n    setNodeRef,\n    transform,\n    transition,\n  } = useSortable({\n    id: pageId,\n    data: { type: "page" },\n  })\n\n  return (\n    <button\n      ref={setNodeRef}\n      type="button"\n      className={cn(\n        "relative shrink-0 cursor-grab overflow-hidden rounded-md border border-border bg-muted text-left shadow-xs transition-[border-color,opacity] hover:border-foreground/30 active:cursor-grabbing",\n        isDragging && "opacity-0"\n      )}\n      style={{\n        width: THUMBNAIL_WIDTH,\n        height: THUMBNAIL_HEIGHT,\n        transform: CSS.Transform.toString(transform),\n        transition,\n      }}\n      onClick={() => onSelect(pageNumber)}\n      {...attributes}\n      {...listeners}\n    >\n      <FileThumbnail\n        file={{\n          name: `page-${pageNumber}.pdf`,\n          type: "application/pdf",\n        }}\n        previewImageUrl={imageUrl}\n        isLoading={!imageUrl}\n        previewClassName="h-full aspect-auto"\n        className="size-full rounded-[inherit] border-0"\n      />\n      <span className="absolute right-1 bottom-1 rounded bg-background/95 px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow-xs ring-1 ring-border/80">\n        {pageNumber}\n      </span>\n    </button>\n  )\n}\n\nfunction SplitGroupCard({\n  canRemove,\n  group,\n  dragHandleProps,\n  thumbnailImages,\n  onRemove,\n  onSelectPage,\n}: {\n  canRemove: boolean\n  group: SplitGroup\n  dragHandleProps?: React.ComponentPropsWithoutRef<"button">\n  thumbnailImages: Record<PageId, string>\n  onRemove: () => void\n  onSelectPage: (pageNumber: number) => void\n}) {\n  return (\n    <section className="w-full rounded-lg border bg-background">\n      <div className="flex items-center justify-between gap-3 border-b p-3">\n        <div className="flex min-w-0 items-center gap-2">\n          <button\n            type="button"\n            aria-label={`Reorder ${group.title}`}\n            className="inline-flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"\n            {...dragHandleProps}\n          >\n            <HugeiconsIcon icon={DragDropVerticalIcon} className="size-4" />\n          </button>\n          <div className="min-w-0">\n            <div className="truncate text-sm font-medium">{group.title}</div>\n            <div className="mt-1 text-xs text-muted-foreground">\n              {createPageRangeLabel(group.pages)}\n            </div>\n          </div>\n        </div>\n        <div className="flex shrink-0 items-center gap-2">\n          <div className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">\n            {group.pages.length}\n          </div>\n          <Button\n            type="button"\n            variant="ghost"\n            size="icon-sm"\n            aria-label={`Remove ${group.title}`}\n            disabled={!canRemove}\n            onClick={onRemove}\n          >\n            <HugeiconsIcon icon={Delete02Icon} className="size-4" />\n          </Button>\n        </div>\n      </div>\n      <SplitGroupDropzone group={group}>\n        {group.pages.length ? (\n          <SortableContext\n            items={group.pages}\n            strategy={horizontalListSortingStrategy}\n          >\n            <ScrollArea\n              className="h-[110px] w-full overflow-hidden"\n              orientation="horizontal"\n              scrollbarGutter\n              scrollbarOverflowOnly\n              viewportClassName="overflow-y-hidden"\n            >\n              <div className="flex w-max gap-2 overflow-y-hidden py-1 pr-6">\n                {group.pages.map((pageId) => (\n                  <PageThumbnail\n                    key={pageId}\n                    pageId={pageId}\n                    imageUrl={thumbnailImages[pageId]}\n                    onSelect={onSelectPage}\n                  />\n                ))}\n              </div>\n            </ScrollArea>\n          </SortableContext>\n        ) : (\n          <div className="grid h-[104px] place-items-center rounded-lg bg-muted/35 text-xs text-muted-foreground">\n            Drop pages here\n          </div>\n        )}\n      </SplitGroupDropzone>\n    </section>\n  )\n}\n\nfunction SortableSplitGroupCard({\n  canRemove,\n  group,\n  thumbnailImages,\n  onRemove,\n  onSelectPage,\n}: {\n  canRemove: boolean\n  group: SplitGroup\n  thumbnailImages: Record<PageId, string>\n  onRemove: () => void\n  onSelectPage: (pageNumber: number) => void\n}) {\n  const {\n    attributes,\n    isDragging,\n    listeners,\n    setNodeRef,\n    transform,\n    transition,\n  } = useSortable({\n    id: getSplitSortableId(group.id),\n    data: { type: "split", groupId: group.id },\n  })\n\n  return (\n    <div\n      ref={setNodeRef}\n      className={cn("w-full", isDragging && "opacity-0")}\n      style={{\n        transform: CSS.Transform.toString(transform),\n        transition,\n      }}\n    >\n      <SplitGroupCard\n        canRemove={canRemove}\n        group={group}\n        thumbnailImages={thumbnailImages}\n        dragHandleProps={{ ...attributes, ...listeners }}\n        onRemove={onRemove}\n        onSelectPage={onSelectPage}\n      />\n    </div>\n  )\n}\n\nfunction SplitGroupDragOverlay({\n  group,\n  thumbnailImages,\n  width,\n  onSelectPage,\n}: {\n  group: SplitGroup\n  thumbnailImages: Record<PageId, string>\n  width?: number\n  onSelectPage: (pageNumber: number) => void\n}) {\n  return (\n    <div\n      className="relative z-40 max-w-[calc(100vw-2rem)]"\n      style={{ width }}\n    >\n      <SplitGroupCard\n        canRemove={false}\n        group={group}\n        thumbnailImages={thumbnailImages}\n        onRemove={() => {}}\n        onSelectPage={onSelectPage}\n      />\n    </div>\n  )\n}\n\nexport function DocumentSplits({\n  className,\n  splits,\n  thumbnailImages = {},\n  withFrameDivider = true,\n  onSelectPage,\n  onSplitsChange,\n}: {\n  className?: string\n  splits: SplitGroup[]\n  thumbnailImages?: Record<PageId, string>\n  withFrameDivider?: boolean\n  onSelectPage: (pageNumber: number) => void\n  onSplitsChange: (splits: SplitGroup[]) => void\n}) {\n  const [draggedPageId, setDraggedPageId] = React.useState<PageId | null>(null)\n  const [activeSplitGroupId, setActiveSplitGroupId] = React.useState<\n    string | null\n  >(null)\n  const [activeSplitGroupWidth, setActiveSplitGroupWidth] = React.useState<\n    number | undefined\n  >()\n  const dragStartGroupIdRef = React.useRef<string | null>(null)\n  const dragStartSplitsRef = React.useRef<SplitGroup[] | null>(null)\n  const sensors = useSensors(\n    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })\n  )\n\n  const handleDragStart = React.useCallback(\n    (event: DragStartEvent) => {\n      const dragType = event.active.data.current?.type\n\n      if (dragType === "split") {\n        dragStartGroupIdRef.current = null\n        dragStartSplitsRef.current = null\n        setDraggedPageId(null)\n        setActiveSplitGroupId(\n          (event.active.data.current?.groupId as string | undefined) ?? null\n        )\n        setActiveSplitGroupWidth(event.active.rect.current.initial?.width)\n        return\n      }\n\n      if (dragType !== "page") {\n        dragStartGroupIdRef.current = null\n        dragStartSplitsRef.current = null\n        setDraggedPageId(null)\n        setActiveSplitGroupId(null)\n        setActiveSplitGroupWidth(undefined)\n        return\n      }\n\n      const pageId = String(event.active.id) as PageId\n      dragStartGroupIdRef.current = findGroupId(splits, pageId)\n      dragStartSplitsRef.current = splits\n      setDraggedPageId(pageId)\n      setActiveSplitGroupId(null)\n      setActiveSplitGroupWidth(undefined)\n    },\n    [splits]\n  )\n\n  const handleDragOver = React.useCallback(\n    (event: DragOverEvent) => {\n      if (event.active.data.current?.type !== "page" || !event.over) return\n\n      const pageId = String(event.active.id) as PageId\n      const overId = String(event.over.id)\n\n      const sourceGroupId = findGroupId(splits, pageId)\n      const targetGroupId = findGroupId(splits, overId)\n\n      if (!sourceGroupId || !targetGroupId || sourceGroupId === targetGroupId) {\n        return\n      }\n\n      const targetPages = getGroupPages(splits, targetGroupId)\n      const overIndex = targetPages.indexOf(overId as PageId)\n      const insertIndex = overIndex === -1 ? targetPages.length : overIndex\n\n      const nextSplits = movePageToGroup({\n        draggedPageId: pageId,\n        groups: splits,\n        insertIndex,\n        targetGroupId,\n      })\n\n      if (!areSplitGroupsEqual(splits, nextSplits)) {\n        onSplitsChange(nextSplits)\n      }\n    },\n    [onSplitsChange, splits]\n  )\n\n  const handleDragEnd = React.useCallback(\n    (event: DragEndEvent) => {\n      if (event.active.data.current?.type === "split" && event.over) {\n        const activeGroupId = event.active.data.current.groupId\n        const overGroupId = event.over.data.current?.groupId\n\n        const draggedIndex = splits.findIndex(\n          (group) => group.id === activeGroupId\n        )\n        const overIndex = splits.findIndex((group) => group.id === overGroupId)\n\n        if (draggedIndex !== -1 && overIndex !== -1) {\n          const nextSplits = arrayMove(splits, draggedIndex, overIndex)\n\n          if (!areSplitGroupsEqual(splits, nextSplits)) {\n            onSplitsChange(nextSplits)\n          }\n        }\n\n        dragStartGroupIdRef.current = null\n        dragStartSplitsRef.current = null\n        setDraggedPageId(null)\n        setActiveSplitGroupId(null)\n        setActiveSplitGroupWidth(undefined)\n        return\n      }\n\n      if (event.active.data.current?.type !== "page" || !event.over) {\n        dragStartGroupIdRef.current = null\n        dragStartSplitsRef.current = null\n        setDraggedPageId(null)\n        setActiveSplitGroupId(null)\n        setActiveSplitGroupWidth(undefined)\n        return\n      }\n\n      const pageId = String(event.active.id) as PageId\n      const overId = String(event.over.id) as PageId\n      const overGroupId = findGroupId(splits, overId)\n\n      if (dragStartGroupIdRef.current === overGroupId) {\n        const nextSplits = reorderPageInGroup({\n          draggedPageId: pageId,\n          groups: splits,\n          overPageId: overId,\n        })\n\n        if (!areSplitGroupsEqual(splits, nextSplits)) {\n          onSplitsChange(nextSplits)\n        }\n      }\n\n      dragStartGroupIdRef.current = null\n      dragStartSplitsRef.current = null\n      setDraggedPageId(null)\n      setActiveSplitGroupId(null)\n      setActiveSplitGroupWidth(undefined)\n    },\n    [onSplitsChange, splits]\n  )\n\n  const handleDragCancel = React.useCallback(() => {\n    if (dragStartSplitsRef.current) {\n      onSplitsChange(dragStartSplitsRef.current)\n    }\n\n    dragStartSplitsRef.current = null\n    dragStartGroupIdRef.current = null\n    setDraggedPageId(null)\n    setActiveSplitGroupId(null)\n    setActiveSplitGroupWidth(undefined)\n  }, [onSplitsChange])\n\n  const activeSplitGroup = activeSplitGroupId\n    ? splits.find((group) => group.id === activeSplitGroupId)\n    : null\n\n  return (\n    <aside\n      className={cn(\n        "flex h-full min-h-0 flex-col bg-muted/20",\n        withFrameDivider && "border-t md:border-t-0 md:border-l",\n        className\n      )}\n    >\n      <div className="flex min-h-12 items-center justify-end gap-3 border-b bg-background px-3">\n        <Button\n          type="button"\n          variant="outline"\n          size="sm"\n          onClick={() =>\n            onSplitsChange([\n              ...splits,\n              {\n                id: `split-${Date.now()}`,\n                title: `Split ${splits.length + 1}`,\n                pages: [],\n              },\n            ])\n          }\n        >\n          <HugeiconsIcon icon={Add01Icon} className="size-4" />\n          Add split\n        </Button>\n      </div>\n      <DndContext\n        id="document-splits-dnd"\n        sensors={sensors}\n        collisionDetection={splitterCollisionDetection}\n        onDragStart={handleDragStart}\n        onDragOver={handleDragOver}\n        onDragEnd={handleDragEnd}\n        onDragCancel={handleDragCancel}\n      >\n        <ScrollArea className="min-h-0 flex-1" scrollFade>\n          <SortableContext\n            items={splits.map((group) => getSplitSortableId(group.id))}\n            strategy={verticalListSortingStrategy}\n          >\n            <div className="space-y-3 p-3">\n              {splits.map((group) => (\n                <SortableSplitGroupCard\n                  key={group.id}\n                  canRemove={splits.length > 1}\n                  group={group}\n                  thumbnailImages={thumbnailImages}\n                  onRemove={() => {\n                    if (splits.length <= 1) return\n                    onSplitsChange(\n                      splits.filter((split) => split.id !== group.id)\n                    )\n                  }}\n                  onSelectPage={onSelectPage}\n                />\n              ))}\n            </div>\n          </SortableContext>\n        </ScrollArea>\n        <DragOverlay dropAnimation={DRAG_OVERLAY_DROP_ANIMATION} zIndex={40}>\n          {draggedPageId ? (\n            <div\n              className="relative overflow-hidden rounded-md border bg-background shadow-lg shadow-black/10"\n              style={{ width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT }}\n            >\n              <FileThumbnail\n                file={{ name: `${draggedPageId}.pdf`, type: "application/pdf" }}\n                previewImageUrl={thumbnailImages[draggedPageId]}\n                isLoading={!thumbnailImages[draggedPageId]}\n                previewClassName="h-full aspect-auto"\n                className="size-full rounded-[inherit] border-0"\n              />\n            </div>\n          ) : activeSplitGroup ? (\n            <SplitGroupDragOverlay\n              group={activeSplitGroup}\n              thumbnailImages={thumbnailImages}\n              width={activeSplitGroupWidth}\n              onSelectPage={onSelectPage}\n            />\n          ) : null}\n        </DragOverlay>\n      </DndContext>\n    </aside>\n  )\n}'

export function DocumentSplitsSource() {
  return (
    <DocsSourceCodeBlock
      code={documentSplitterSourceCode}
      fileName="components/ui/document-splits.tsx"
    />
  )
}
