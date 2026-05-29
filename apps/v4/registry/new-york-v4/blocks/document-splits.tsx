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
  Add01Icon,
  Delete02Icon,
  DragDropVerticalIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { FileThumbnail } from "@/components/ui/file-thumbnail"
import { PDFViewer, type PDFViewerHandle } from "@/components/ui/pdf-viewer"
import { PdfBlockResizableShell } from "@/components/pdf-block-resizable-shell"
import { Button } from "@/registry/new-york-v4/ui/button"
import { ScrollArea } from "@/registry/new-york-v4/ui/scroll-area"

export type DocumentSplitPageId = `page-${number}`
export type DocumentSplit = {
  id: string
  title: string
  pages: DocumentSplitPageId[]
}

type PageId = DocumentSplitPageId
type SplitGroup = DocumentSplit

const THUMBNAIL_WIDTH = 72
const THUMBNAIL_HEIGHT = 92
const DRAG_OVERLAY_DROP_ANIMATION = null

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

const INITIAL_SPLITS: DocumentSplit[] = [
  {
    id: "split-1",
    title: "Abstract and intro",
    pages: ["page-1", "page-2", "page-3"],
  },
  {
    id: "split-2",
    title: "Model architecture",
    pages: ["page-4", "page-5", "page-6", "page-7"],
  },
  {
    id: "split-3",
    title: "Training and results",
    pages: ["page-8", "page-9", "page-10"],
  },
]

function createInitialSplits(pageCount: number) {
  if (pageCount <= 0) return INITIAL_SPLITS

  const pages = Array.from(
    { length: pageCount },
    (_, index) => `page-${index + 1}` as PageId
  )
  const chunkSize = Math.max(1, Math.ceil(pageCount / 3))

  return Array.from(
    { length: Math.ceil(pageCount / chunkSize) },
    (_, index) => {
      const startIndex = index * chunkSize
      const groupPages = pages.slice(startIndex, startIndex + chunkSize)
      const firstPage = getPageNumber(groupPages[0])
      const lastPage = getPageNumber(groupPages[groupPages.length - 1])

      return {
        id: `split-${index + 1}`,
        title:
          firstPage === lastPage
            ? `Page ${firstPage}`
            : `Pages ${firstPage}-${lastPage}`,
        pages: groupPages,
      }
    }
  )
}

function getPageNumber(pageId: PageId) {
  return Number(pageId.replace("page-", ""))
}

function getSplitSortableId(groupId: string) {
  return `split-sortable-${groupId}`
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
      ? {
          ...group,
          pages: arrayMove(group.pages, activeIndex, overIndex),
        }
      : group
  )
}

function createPageRangeLabel(pageIds: PageId[]) {
  if (pageIds.length === 0) return "No pages"

  return `Pages ${pageIds.map(getPageNumber).join(", ")}`
}

function SplitGroupDropzone({
  children,
  group,
}: {
  children: React.ReactNode
  group: SplitGroup
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: group.id,
    data: { type: "page-dropzone", isEmpty: group.pages.length === 0 },
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

function PageThumbnail({
  imageUrl,
  isActive,
  onSelect,
  pageId,
}: {
  imageUrl?: string
  isActive: boolean
  onSelect: (pageNumber: number) => void
  pageId: PageId
}) {
  const pageNumber = getPageNumber(pageId)
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: pageId,
    data: { type: "page" },
  })

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={cn(
        "relative shrink-0 cursor-grab overflow-hidden rounded-md border bg-muted text-left shadow-xs transition-[border-color,box-shadow,opacity] active:cursor-grabbing",
        isActive
          ? "border-blue-500 shadow-[0_0_0_2px_rgb(59_130_246_/_14%)]"
          : "border-border hover:border-foreground/30",
        isDragging && "opacity-0"
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
        file={{
          name: `page-${pageNumber}.pdf`,
          type: "application/pdf",
          size: `Page ${pageNumber}`,
        }}
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
  )
}

function SplitGroupCard({
  activePage,
  canRemove,
  group,
  dragHandleProps,
  thumbnailImages,
  onRemove,
  onSelectPage,
}: {
  activePage: number
  canRemove: boolean
  group: SplitGroup
  dragHandleProps?: React.ComponentPropsWithoutRef<"button">
  thumbnailImages: Record<PageId, string>
  onRemove: () => void
  onSelectPage: (pageNumber: number) => void
}) {
  return (
    <section className="w-full rounded-lg border bg-background">
      <div className="flex items-center justify-between gap-3 border-b p-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            aria-label={`Reorder ${group.title}`}
            className="inline-flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
            {...dragHandleProps}
          >
            <HugeiconsIcon icon={DragDropVerticalIcon} className="size-4" />
          </button>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{group.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {createPageRangeLabel(group.pages)}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {group.pages.length}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${group.title}`}
            disabled={!canRemove}
            onClick={onRemove}
          >
            <HugeiconsIcon icon={Delete02Icon} className="size-4" />
          </Button>
        </div>
      </div>
      <SplitGroupDropzone group={group}>
        {group.pages.length ? (
          <SortableContext
            items={group.pages}
            strategy={horizontalListSortingStrategy}
          >
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
        ) : (
          <div className="grid h-[104px] place-items-center rounded-lg bg-muted/35 text-xs text-muted-foreground">
            Drop pages here
          </div>
        )}
      </SplitGroupDropzone>
    </section>
  )
}

function SortableSplitGroupCard({
  activePage,
  canRemove,
  group,
  thumbnailImages,
  onRemove,
  onSelectPage,
}: {
  activePage: number
  canRemove: boolean
  group: SplitGroup
  thumbnailImages: Record<PageId, string>
  onRemove: () => void
  onSelectPage: (pageNumber: number) => void
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: getSplitSortableId(group.id),
    data: { type: "split", groupId: group.id },
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
        activePage={activePage}
        canRemove={canRemove}
        group={group}
        thumbnailImages={thumbnailImages}
        dragHandleProps={{ ...attributes, ...listeners }}
        onRemove={onRemove}
        onSelectPage={onSelectPage}
      />
    </div>
  )
}

function SplitGroupDragOverlay({
  activePage,
  group,
  thumbnailImages,
  width,
  onSelectPage,
}: {
  activePage: number
  group: SplitGroup
  thumbnailImages: Record<PageId, string>
  width?: number
  onSelectPage: (pageNumber: number) => void
}) {
  return (
    <div
      className="relative z-[1000] max-w-[calc(100vw-2rem)]"
      style={{ width }}
    >
      <SplitGroupCard
        activePage={activePage}
        canRemove={false}
        group={group}
        thumbnailImages={thumbnailImages}
        onRemove={() => {}}
        onSelectPage={onSelectPage}
      />
    </div>
  )
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
  activePage: number
  className?: string
  splits: SplitGroup[]
  thumbnailImages?: Record<PageId, string>
  withFrameDivider?: boolean
  onSelectPage: (pageNumber: number) => void
  onSplitsChange: (splits: SplitGroup[]) => void
}) {
  const [activePageId, setActivePageId] = React.useState<PageId | null>(null)
  const [activeSplitGroupId, setActiveSplitGroupId] = React.useState<
    string | null
  >(null)
  const [activeSplitGroupWidth, setActiveSplitGroupWidth] = React.useState<
    number | undefined
  >()
  const dragStartGroupIdRef = React.useRef<string | null>(null)
  const dragStartSplitsRef = React.useRef<SplitGroup[] | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const handleDragStart = React.useCallback(
    (event: DragStartEvent) => {
      const dragType = event.active.data.current?.type

      if (dragType === "split") {
        dragStartGroupIdRef.current = null
        dragStartSplitsRef.current = null
        setActivePageId(null)
        setActiveSplitGroupId(
          (event.active.data.current?.groupId as string | undefined) ?? null
        )
        setActiveSplitGroupWidth(event.active.rect.current.initial?.width)
        return
      }

      if (dragType !== "page") {
        dragStartGroupIdRef.current = null
        dragStartSplitsRef.current = null
        setActivePageId(null)
        setActiveSplitGroupId(null)
        setActiveSplitGroupWidth(undefined)
        return
      }

      const pageId = String(event.active.id) as PageId
      dragStartGroupIdRef.current = findGroupId(splits, pageId)
      dragStartSplitsRef.current = splits
      setActivePageId(pageId)
      setActiveSplitGroupId(null)
      setActiveSplitGroupWidth(undefined)
    },
    [splits]
  )

  const handleDragOver = React.useCallback(
    (event: DragOverEvent) => {
      if (event.active.data.current?.type !== "page" || !event.over) return

      const pageId = String(event.active.id) as PageId
      const overId = String(event.over.id)

      const sourceGroupId = findGroupId(splits, pageId)
      const targetGroupId = findGroupId(splits, overId)

      if (!sourceGroupId || !targetGroupId || sourceGroupId === targetGroupId) {
        return
      }

      const targetPages = getGroupPages(splits, targetGroupId)
      const overIndex = targetPages.indexOf(overId as PageId)
      const insertIndex = overIndex === -1 ? targetPages.length : overIndex

      const nextSplits = movePageToGroup({
        activePageId: pageId,
        groups: splits,
        insertIndex,
        targetGroupId,
      })

      if (!areSplitGroupsEqual(splits, nextSplits)) {
        onSplitsChange(nextSplits)
      }
    },
    [onSplitsChange, splits]
  )

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      if (event.active.data.current?.type === "split" && event.over) {
        const activeGroupId = event.active.data.current.groupId
        const overGroupId = event.over.data.current?.groupId

        const activeIndex = splits.findIndex(
          (group) => group.id === activeGroupId
        )
        const overIndex = splits.findIndex((group) => group.id === overGroupId)

        if (activeIndex !== -1 && overIndex !== -1) {
          const nextSplits = arrayMove(splits, activeIndex, overIndex)

          if (!areSplitGroupsEqual(splits, nextSplits)) {
            onSplitsChange(nextSplits)
          }
        }

        dragStartGroupIdRef.current = null
        dragStartSplitsRef.current = null
        setActivePageId(null)
        setActiveSplitGroupId(null)
        setActiveSplitGroupWidth(undefined)
        return
      }

      if (event.active.data.current?.type !== "page" || !event.over) {
        dragStartGroupIdRef.current = null
        dragStartSplitsRef.current = null
        setActivePageId(null)
        setActiveSplitGroupId(null)
        setActiveSplitGroupWidth(undefined)
        return
      }

      const pageId = String(event.active.id) as PageId
      const overId = String(event.over.id) as PageId
      const overGroupId = findGroupId(splits, overId)

      if (dragStartGroupIdRef.current === overGroupId) {
        const nextSplits = reorderPageInGroup({
          activePageId: pageId,
          groups: splits,
          overPageId: overId,
        })

        if (!areSplitGroupsEqual(splits, nextSplits)) {
          onSplitsChange(nextSplits)
        }
      }

      dragStartGroupIdRef.current = null
      dragStartSplitsRef.current = null
      setActivePageId(null)
      setActiveSplitGroupId(null)
      setActiveSplitGroupWidth(undefined)
    },
    [onSplitsChange, splits]
  )

  const handleDragCancel = React.useCallback(() => {
    if (dragStartSplitsRef.current) {
      onSplitsChange(dragStartSplitsRef.current)
    }

    dragStartSplitsRef.current = null
    dragStartGroupIdRef.current = null
    setActivePageId(null)
    setActiveSplitGroupId(null)
    setActiveSplitGroupWidth(undefined)
  }, [onSplitsChange])

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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onSplitsChange([
              ...splits,
              {
                id: `split-${Date.now()}`,
                title: `Split ${splits.length + 1}`,
                pages: [],
              },
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
                  activePage={
                    activePageId ? getPageNumber(activePageId) : activePage
                  }
                  canRemove={splits.length > 1}
                  group={group}
                  thumbnailImages={thumbnailImages}
                  onRemove={() => {
                    if (splits.length <= 1) return
                    onSplitsChange(
                      splits.filter((split) => split.id !== group.id)
                    )
                  }}
                  onSelectPage={onSelectPage}
                />
              ))}
            </div>
          </SortableContext>
        </ScrollArea>
        <DragOverlay dropAnimation={DRAG_OVERLAY_DROP_ANIMATION} zIndex={1000}>
          {activePageId ? (
            <div
              className="relative overflow-hidden rounded-md border bg-background shadow-lg shadow-black/10"
              style={{ width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT }}
            >
              <FileThumbnail
                file={{ name: `${activePageId}.pdf`, type: "application/pdf" }}
                showMetadata={false}
                previewImageUrl={thumbnailImages[activePageId]}
                isLoading={!thumbnailImages[activePageId]}
                previewClassName="h-full aspect-auto"
                className="size-full rounded-[inherit] border-0"
              />
            </div>
          ) : activeSplitGroup ? (
            <SplitGroupDragOverlay
              activePage={activePage}
              group={activeSplitGroup}
              thumbnailImages={thumbnailImages}
              width={activeSplitGroupWidth}
              onSelectPage={onSelectPage}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </aside>
  )
}

export function DocumentSplitsBlock({
  file,
  thumbnailImages,
}: {
  file?: string
  thumbnailImages?: Record<PageId, string>
}) {
  const [activePage, setActivePage] = React.useState(1)
  const [splits, setSplits] = React.useState<DocumentSplit[]>(INITIAL_SPLITS)
  const [pdfFile, setPdfFile] = React.useState(file)
  const viewerRef = React.useRef<PDFViewerHandle>(null)
  const uploadedPdfUrlRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    setPdfFile(file)
    setActivePage(1)
  }, [file])

  React.useEffect(() => {
    return () => {
      if (uploadedPdfUrlRef.current) {
        URL.revokeObjectURL(uploadedPdfUrlRef.current)
      }
    }
  }, [])

  const handlePdfUpload = React.useCallback((uploadedFile: File) => {
    const nextUrl = URL.createObjectURL(uploadedFile)

    if (uploadedPdfUrlRef.current) {
      URL.revokeObjectURL(uploadedPdfUrlRef.current)
    }

    uploadedPdfUrlRef.current = nextUrl
    setPdfFile(nextUrl)
    setActivePage(1)
  }, [])

  const handleDocumentLoadSuccess = React.useCallback((pageCount: number) => {
    setSplits(createInitialSplits(pageCount))
  }, [])

  const handleSelectPage = React.useCallback((pageNumber: number) => {
    setActivePage(pageNumber)
    viewerRef.current?.scrollToPage(pageNumber, {
      block: "start",
      behavior: "auto",
    })
  }, [])

  return (
    <PdfBlockResizableShell
      autoSaveId="pdf-block-document-splits"
      heightClassName="h-[720px]"
      rightDefaultSize={50}
      rightMaxSize={66}
      rightMinSize={30}
      left={
        <PDFViewer
          ref={viewerRef}
          file={pdfFile}
          defaultZoom={0.75}
          onActivePageChange={setActivePage}
          onDocumentLoadSuccess={handleDocumentLoadSuccess}
          onPdfUpload={handlePdfUpload}
        />
      }
      right={
        <div className="flex min-h-0 flex-col bg-background">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-medium">Document splits</h3>
            <p className="text-xs text-muted-foreground">
              Drag pages between split groups and reorder output documents.
            </p>
          </div>
          <DocumentSplits
            activePage={activePage}
            className="min-h-0 flex-1"
            splits={splits}
            thumbnailImages={thumbnailImages}
            withFrameDivider={false}
            onSelectPage={handleSelectPage}
            onSplitsChange={setSplits}
          />
        </div>
      }
    />
  )
}
