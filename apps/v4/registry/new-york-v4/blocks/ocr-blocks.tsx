"use client"

import * as React from "react"
import {
  Heading01Icon,
  ParagraphIcon,
  Table01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { PDFViewer, type PDFViewerHandle } from "@/components/ui/pdf-viewer"
import { ScrollArea } from "@/registry/new-york-v4/ui/scroll-area"

type OcrBlock = {
  id: string
  label: string
  kind: string
  text: string
  page: number
  confidence: number
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"]
  accentClassName: string
  polygon: { x: number; y: number }[]
}

const PAGE_WIDTH = 792
const PAGE_HEIGHT = 612
const OCR_BLOCKS: OcrBlock[] = [
  {
    id: "title",
    label: "Paper title",
    kind: "Heading",
    text: "Attention Is All You Need",
    page: 1,
    confidence: 0.99,
    icon: Heading01Icon,
    accentClassName: "border-violet-500/60 bg-violet-500/5 text-violet-600",
    polygon: [
      { x: 246, y: 188 },
      { x: 566, y: 188 },
      { x: 566, y: 222 },
      { x: 246, y: 222 },
    ],
  },
  {
    id: "abstract",
    label: "Abstract body",
    kind: "Paragraph",
    text: "The dominant sequence transduction models are based on recurrent or convolutional neural networks.",
    page: 1,
    confidence: 0.94,
    icon: ParagraphIcon,
    accentClassName: "border-blue-500/60 bg-blue-500/5 text-blue-600",
    polygon: [
      { x: 108, y: 346 },
      { x: 692, y: 346 },
      { x: 692, y: 458 },
      { x: 108, y: 458 },
    ],
  },
  {
    id: "table",
    label: "Complexity table",
    kind: "Table",
    text: "Layer type, complexity per layer, sequential operations, maximum path length.",
    page: 6,
    confidence: 0.91,
    icon: Table01Icon,
    accentClassName: "border-amber-500/60 bg-amber-500/5 text-amber-700",
    polygon: [
      { x: 52, y: 58 },
      { x: 740, y: 58 },
      { x: 740, y: 190 },
      { x: 52, y: 190 },
    ],
  },
]

function polygonToArea(polygon: OcrBlock["polygon"]) {
  const xValues = polygon.map((point) => point.x)
  const yValues = polygon.map((point) => point.y)
  const left = Math.min(...xValues)
  const right = Math.max(...xValues)
  const top = Math.min(...yValues)
  const bottom = Math.max(...yValues)

  return {
    left: `${(left / PAGE_WIDTH) * 100}%`,
    top: `${(top / PAGE_HEIGHT) * 100}%`,
    width: `${((right - left) / PAGE_WIDTH) * 100}%`,
    height: `${((bottom - top) / PAGE_HEIGHT) * 100}%`,
  }
}

export function OcrBlocksBlock({ file }: { file?: string }) {
  const [activeBlockId, setActiveBlockId] = React.useState(OCR_BLOCKS[0].id)
  const viewerRef = React.useRef<PDFViewerHandle>(null)
  const activeBlock =
    OCR_BLOCKS.find((block) => block.id === activeBlockId) ?? OCR_BLOCKS[0]

  const focusBlock = React.useCallback((block: OcrBlock) => {
    setActiveBlockId(block.id)
    viewerRef.current?.scrollToPageArea(block.page, {
      left: Number.parseFloat(polygonToArea(block.polygon).left),
      top: Number.parseFloat(polygonToArea(block.polygon).top),
      width: Number.parseFloat(polygonToArea(block.polygon).width),
      height: Number.parseFloat(polygonToArea(block.polygon).height),
    })
  }, [])

  return (
    <div className="grid h-[620px] min-h-[420px] overflow-hidden bg-background lg:grid-cols-[minmax(0,1fr)_360px]">
      <PDFViewer
        ref={viewerRef}
        file={file}
        defaultZoom={0.75}
        renderPageOverlay={({ pageNumber }) =>
          OCR_BLOCKS.filter((block) => block.page === pageNumber).map(
            (block) => (
              <div
                key={block.id}
                className={cn(
                  "pointer-events-none absolute z-10 rounded-[3px] border",
                  block.id === activeBlock.id
                    ? block.accentClassName
                    : "border-muted-foreground/30 bg-muted/20"
                )}
                style={polygonToArea(block.polygon)}
              />
            )
          )
        }
      />
      <aside className="min-h-0 border-t bg-background lg:border-t-0 lg:border-l">
        <ScrollArea className="h-full" scrollFade>
          <div className="space-y-2 p-3">
            {OCR_BLOCKS.map((block) => {
              const isActive = block.id === activeBlock.id

              return (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => focusBlock(block)}
                  onFocus={() => focusBlock(block)}
                  onMouseEnter={() => focusBlock(block)}
                  className={cn(
                    "w-full rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    isActive && block.accentClassName
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-muted">
                      <HugeiconsIcon icon={block.icon} className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-sm font-medium">
                          {block.label}
                        </div>
                        <div className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          p. {block.page}
                        </div>
                      </div>
                      <div className="mt-0.5 text-xs font-medium text-muted-foreground">
                        {block.kind} - {Math.round(block.confidence * 100)}%
                      </div>
                      <div className="mt-2 line-clamp-3 text-sm text-foreground/90">
                        {block.text}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </ScrollArea>
      </aside>
    </div>
  )
}
