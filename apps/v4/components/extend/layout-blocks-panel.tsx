"use client"

import * as React from "react"
import { useVirtualizer } from "@tanstack/react-virtual"

import type { RegistryIconProps } from "@/lib/registry-icon-props"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { IconPlaceholder } from "@/components/icon-placeholder"

function AlignBoxBottomCenterGlyph(props: RegistryIconProps) {
  return (
    <IconPlaceholder
      lucide="AlignVerticalJustifyEnd"
      tabler="IconAlignBoxBottomCenter"
      hugeicons="AlignBoxBottomCenterIcon"
      phosphor="AlignBottomIcon"
      remixicon="RiAlignBottom"
      {...props}
    />
  )
}

function Heading01Glyph(props: RegistryIconProps) {
  return (
    <IconPlaceholder
      lucide="Heading1"
      tabler="IconH1"
      hugeicons="Heading01Icon"
      phosphor="TextHOneIcon"
      remixicon="RiH1"
      {...props}
    />
  )
}

function ImageCompositionGlyph(props: RegistryIconProps) {
  return (
    <IconPlaceholder
      lucide="Image"
      tabler="IconPhoto"
      hugeicons="ImageCompositionIcon"
      phosphor="ImageSquareIcon"
      remixicon="RiImageLine"
      {...props}
    />
  )
}

function LeftToRightListBulletGlyph(props: RegistryIconProps) {
  return (
    <IconPlaceholder
      lucide="Columns3Icon"
      tabler="IconLayoutColumns"
      hugeicons="LeftToRightListBulletIcon"
      phosphor="ColumnsIcon"
      remixicon="RiLayoutColumnLine"
      {...props}
    />
  )
}

function ParagraphGlyph(props: RegistryIconProps) {
  return (
    <IconPlaceholder
      lucide="Pilcrow"
      tabler="IconPilcrow"
      hugeicons="ParagraphIcon"
      phosphor="ParagraphIcon"
      remixicon="RiParagraph"
      {...props}
    />
  )
}

function Table01Glyph(props: RegistryIconProps) {
  return (
    <IconPlaceholder
      lucide="Table"
      tabler="IconTable"
      hugeicons="Table01Icon"
      phosphor="TableIcon"
      remixicon="RiTableLine"
      {...props}
    />
  )
}

function TextCenterlineCenterTopGlyph(props: RegistryIconProps) {
  return (
    <IconPlaceholder
      lucide="PanelTop"
      tabler="IconLayoutNavbar"
      hugeicons="TextCenterlineCenterTopIcon"
      phosphor="AlignTopSimpleIcon"
      remixicon="RiLayoutTopLine"
      {...props}
    />
  )
}

function TextNumberSignGlyph(props: RegistryIconProps) {
  return (
    <IconPlaceholder
      lucide="Hash"
      tabler="IconHash"
      hugeicons="TextNumberSignIcon"
      phosphor="HashIcon"
      remixicon="RiHashtag"
      {...props}
    />
  )
}

export type LayoutBlockType =
  | "heading"
  | "paragraph"
  | "list"
  | "table"
  | "figure"
  | "header"
  | "footer"
  | "page_number"

export type LayoutBlockItem = {
  id: string
  type: LayoutBlockType
  label?: string
  text: string
  page?: number
  confidence?: number
}

export const layoutBlockStyles: Record<
  LayoutBlockType,
  {
    label: string
    icon: React.ComponentType<RegistryIconProps>
    color: string
    overlay: string
    mutedOverlay: string
    ring: string
    badge: string
  }
> = {
  heading: {
    label: "Heading",
    icon: Heading01Glyph,
    color: "#8b5cf6",
    overlay:
      "border-violet-500/70 bg-violet-500/10 shadow-[0_4px_16px_rgb(139_92_246_/_12%)]",
    mutedOverlay: "border-violet-500/35 bg-violet-500/5",
    ring: "border-violet-500/60 bg-violet-500/5",
    badge:
      "bg-violet-50 text-violet-600 dark:bg-violet-300/10 dark:text-violet-300",
  },
  paragraph: {
    label: "Paragraph",
    icon: ParagraphGlyph,
    color: "#3b82f6",
    overlay:
      "border-blue-500/70 bg-blue-500/10 shadow-[0_4px_16px_rgb(59_130_246_/_12%)]",
    mutedOverlay: "border-blue-500/35 bg-blue-500/5",
    ring: "border-blue-500/60 bg-blue-500/5",
    badge: "bg-blue-50 text-blue-600 dark:bg-blue-300/10 dark:text-blue-300",
  },
  list: {
    label: "List",
    icon: LeftToRightListBulletGlyph,
    color: "#10b981",
    overlay:
      "border-emerald-500/70 bg-emerald-500/10 shadow-[0_4px_16px_rgb(16_185_129_/_12%)]",
    mutedOverlay: "border-emerald-500/35 bg-emerald-500/5",
    ring: "border-emerald-500/60 bg-emerald-500/5",
    badge:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-300/10 dark:text-emerald-300",
  },
  table: {
    label: "Table",
    icon: Table01Glyph,
    color: "#f59e0b",
    overlay:
      "border-amber-500/70 bg-amber-500/10 shadow-[0_4px_16px_rgb(245_158_11_/_12%)]",
    mutedOverlay: "border-amber-500/35 bg-amber-500/5",
    ring: "border-amber-500/60 bg-amber-500/5",
    badge:
      "bg-amber-50 text-amber-600 dark:bg-amber-300/10 dark:text-amber-300",
  },
  figure: {
    label: "Figure",
    icon: ImageCompositionGlyph,
    color: "#f43f5e",
    overlay:
      "border-rose-500/70 bg-rose-500/10 shadow-[0_4px_16px_rgb(244_63_94_/_12%)]",
    mutedOverlay: "border-rose-500/35 bg-rose-500/5",
    ring: "border-rose-500/60 bg-rose-500/5",
    badge: "bg-rose-50 text-rose-600 dark:bg-rose-300/10 dark:text-rose-300",
  },
  header: {
    label: "Header",
    icon: TextCenterlineCenterTopGlyph,
    color: "#06b6d4",
    overlay:
      "border-cyan-500/70 bg-cyan-500/10 shadow-[0_4px_16px_rgb(6_182_212_/_12%)]",
    mutedOverlay: "border-cyan-500/35 bg-cyan-500/5",
    ring: "border-cyan-500/60 bg-cyan-500/5",
    badge: "bg-cyan-50 text-cyan-600 dark:bg-cyan-300/10 dark:text-cyan-300",
  },
  footer: {
    label: "Footer",
    icon: AlignBoxBottomCenterGlyph,
    color: "#64748b",
    overlay:
      "border-slate-500/70 bg-slate-500/10 shadow-[0_4px_16px_rgb(100_116_139_/_12%)]",
    mutedOverlay: "border-slate-500/35 bg-slate-500/5",
    ring: "border-slate-500/60 bg-slate-500/5",
    badge:
      "bg-slate-50 text-slate-600 dark:bg-slate-300/10 dark:text-slate-300",
  },
  page_number: {
    label: "Page number",
    icon: TextNumberSignGlyph,
    color: "#71717a",
    overlay:
      "border-zinc-500/70 bg-zinc-500/10 shadow-[0_4px_16px_rgb(113_113_122_/_12%)]",
    mutedOverlay: "border-zinc-500/35 bg-zinc-500/5",
    ring: "border-zinc-500/60 bg-zinc-500/5",
    badge: "bg-zinc-50 text-zinc-600 dark:bg-zinc-300/10 dark:text-zinc-300",
  },
}

const BLOCK_ROW_MIN_ESTIMATE = 92
const BLOCK_ROW_VERTICAL_CHROME = 62
const BLOCK_LINE_HEIGHT = 20
const BLOCK_ESTIMATED_CHARS_PER_LINE = 42
const BLOCK_ROW_GAP = 8
const BLOCK_LIST_PADDING = 12
function estimateRowHeight(block: LayoutBlockItem, clampText: boolean) {
  const plainText = block.text
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
  const explicitLineCount = block.text.split(/\n+/).filter(Boolean).length
  const wrappedLineCount = Math.max(
    explicitLineCount,
    Math.ceil(plainText.length / BLOCK_ESTIMATED_CHARS_PER_LINE)
  )
  const contentHeight =
    Math.max(1, clampText ? Math.min(3, wrappedLineCount) : wrappedLineCount) *
    BLOCK_LINE_HEIGHT
  const typeExtraHeight =
    block.type === "figure" ? 44 : block.type === "table" ? 28 : 0

  return Math.max(
    BLOCK_ROW_MIN_ESTIMATE,
    BLOCK_ROW_VERTICAL_CHROME + contentHeight + typeExtraHeight + BLOCK_ROW_GAP
  )
}

function LayoutBlockCard<Block extends LayoutBlockItem>({
  block,
  isActive,
  onFocusBlock,
  onBlurBlock,
  onSelectBlock,
  renderText,
}: {
  block: Block
  isActive: boolean
  onFocusBlock: (block: Block) => void
  onBlurBlock?: () => void
  onSelectBlock?: (block: Block) => void
  renderText?: (text: string) => React.ReactNode
}) {
  const style = layoutBlockStyles[block.type]

  return (
    <button
      type="button"
      aria-pressed={isActive}
      onMouseLeave={onBlurBlock}
      onBlur={onBlurBlock}
      onClick={() => {
        onFocusBlock(block)
        onSelectBlock?.(block)
      }}
      onMouseEnter={() => onFocusBlock(block)}
      onFocus={() => onFocusBlock(block)}
      className={cn(
        "w-full rounded-lg border bg-background p-3 text-left hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        isActive && cn("shadow-[0_0_0_1px_rgb(0_0_0_/_4%)]", style.ring)
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                style.badge
              )}
            >
              <style.icon className="size-3.5" />
              {block.label ?? style.label}
            </div>
            {block.confidence !== undefined && (
              <div className="truncate text-xs text-muted-foreground">
                {Math.round(block.confidence * 100)}%
              </div>
            )}
          </div>
          {block.page !== undefined && (
            <div className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              p. {block.page}
            </div>
          )}
        </div>
        <div className="mt-2 text-sm text-foreground/90">
          {renderText ? (
            renderText(block.text)
          ) : (
            <p className="line-clamp-3 text-[13px] leading-5 wrap-anywhere whitespace-pre-line">
              {block.text}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}

export function LayoutBlocksPanel<Block extends LayoutBlockItem>({
  activeBlockId,
  blocks,
  className,
  heading,
  ariaLabel,
  emptyMessage = "No layout blocks found.",
  onBlockFocus,
  onBlockBlur,
  onBlockSelect,
  renderText,
}: {
  activeBlockId?: string
  blocks: readonly Block[]
  className?: string
  heading?: string
  ariaLabel?: string
  emptyMessage?: string
  onBlockFocus?: (block: Block) => void
  onBlockBlur?: () => void
  onBlockSelect?: (block: Block) => void
  renderText?: (text: string) => React.ReactNode
}) {
  const scrollViewportRef = React.useRef<HTMLDivElement | null>(null)
  const [localActiveBlockId, setLocalActiveBlockId] = React.useState<string>()
  const activeId = activeBlockId ?? localActiveBlockId
  const focusedBlockId = blocks.some((block) => block.id === activeId)
    ? activeId
    : blocks[0]?.id

  const estimateBlockSize = React.useCallback(
    (index: number) => {
      const block = blocks[index]
      return block
        ? estimateRowHeight(block, !renderText)
        : BLOCK_ROW_MIN_ESTIMATE
    },
    [blocks, renderText]
  )
  const virtualizer = useVirtualizer({
    count: blocks.length,
    estimateSize: estimateBlockSize,
    getItemKey: (index) => blocks[index]?.id ?? index,
    getScrollElement: () => scrollViewportRef.current,
    overscan: 6,
  })

  const focusBlock = React.useCallback(
    (block: Block) => {
      if (block.id === focusedBlockId) return
      setLocalActiveBlockId(block.id)
      onBlockFocus?.(block)
    },
    [focusedBlockId, onBlockFocus]
  )

  return (
    <aside
      aria-label={ariaLabel}
      className={cn("flex h-[420px] min-h-0 flex-col bg-background", className)}
    >
      {heading && (
        <div className="flex items-center justify-between border-b px-4 py-3 text-sm font-medium">
          {heading}
          <span className="text-xs text-muted-foreground">{blocks.length}</span>
        </div>
      )}
      <ScrollArea
        className="min-h-0 flex-1"
        scrollFade
        viewportRef={scrollViewportRef}
      >
        {blocks.length ? (
          <div
            className="relative"
            style={{
              height: virtualizer.getTotalSize() + BLOCK_LIST_PADDING * 2,
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const block = blocks[virtualRow.index]
              if (!block) return null

              return (
                <div
                  key={virtualRow.key}
                  ref={virtualizer.measureElement}
                  data-index={virtualRow.index}
                  className="absolute top-0 right-3 left-3 pb-2 [contain:layout_paint]"
                  style={{
                    transform: `translateY(${
                      virtualRow.start + BLOCK_LIST_PADDING
                    }px)`,
                  }}
                >
                  <LayoutBlockCard
                    block={block}
                    isActive={block.id === focusedBlockId}
                    onFocusBlock={focusBlock}
                    onBlurBlock={onBlockBlur}
                    onSelectBlock={onBlockSelect}
                    renderText={renderText}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-3">
            <div
              role="status"
              className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground"
            >
              {emptyMessage}
            </div>
          </div>
        )}
      </ScrollArea>
    </aside>
  )
}
