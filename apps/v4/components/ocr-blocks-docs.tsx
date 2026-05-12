"use client"

import * as React from "react"
import {
  Heading01Icon,
  Image01Icon,
  LeftToRightListBulletIcon,
  Loading03Icon,
  ParagraphIcon,
  Table01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type * as ReactPdf from "react-pdf"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { HighlightedCodeBlock } from "@/components/highlighted-code-block"

type Point = {
  x: number
  y: number
}

type OcrBlockType = "heading" | "paragraph" | "list" | "table" | "image"

type OcrBlock = {
  id: string
  type: OcrBlockType
  label: string
  text: string
  page: number
  confidence: number
  polygon: Point[]
}

type HighlightArea = {
  left: number
  top: number
  width: number
  height: number
}

type ReactPdfModule = typeof ReactPdf

const PDF_URL = "/samples/attention.pdf"
const PDF_WORKER_URL = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  import.meta.url
).toString()
const PAGE_WIDTH = 792
const PAGE_HEIGHT = 612
const RENDERED_PAGE_WIDTH = 430
const RENDERED_PAGE_HEIGHT = Math.round(
  RENDERED_PAGE_WIDTH * (PAGE_HEIGHT / PAGE_WIDTH)
)
const DEVICE_PIXEL_RATIO_LIMIT = 2
const PREVIEW_PAGES = [1, 2, 3, 6]

const BLOCK_STYLES: Record<
  OcrBlockType,
  {
    label: string
    icon: typeof Heading01Icon
    overlay: string
    mutedOverlay: string
    ring: string
    soft: string
    text: string
  }
> = {
  heading: {
    label: "Heading",
    icon: Heading01Icon,
    overlay:
      "border-violet-500/70 bg-violet-500/10 shadow-[0_4px_16px_rgb(139_92_246_/_12%)]",
    mutedOverlay: "border-violet-500/35 bg-violet-500/5",
    ring: "border-violet-500/60 bg-violet-500/5",
    soft: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
    text: "text-violet-600 dark:text-violet-300",
  },
  paragraph: {
    label: "Paragraph",
    icon: ParagraphIcon,
    overlay:
      "border-blue-500/70 bg-blue-500/10 shadow-[0_4px_16px_rgb(59_130_246_/_12%)]",
    mutedOverlay: "border-blue-500/35 bg-blue-500/5",
    ring: "border-blue-500/60 bg-blue-500/5",
    soft: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
    text: "text-blue-600 dark:text-blue-300",
  },
  list: {
    label: "List",
    icon: LeftToRightListBulletIcon,
    overlay:
      "border-emerald-500/70 bg-emerald-500/10 shadow-[0_4px_16px_rgb(16_185_129_/_12%)]",
    mutedOverlay: "border-emerald-500/35 bg-emerald-500/5",
    ring: "border-emerald-500/60 bg-emerald-500/5",
    soft: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    text: "text-emerald-600 dark:text-emerald-300",
  },
  table: {
    label: "Table",
    icon: Table01Icon,
    overlay:
      "border-amber-500/70 bg-amber-500/10 shadow-[0_4px_16px_rgb(245_158_11_/_12%)]",
    mutedOverlay: "border-amber-500/35 bg-amber-500/5",
    ring: "border-amber-500/60 bg-amber-500/5",
    soft: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    text: "text-amber-700 dark:text-amber-300",
  },
  image: {
    label: "Image",
    icon: Image01Icon,
    overlay:
      "border-rose-500/70 bg-rose-500/10 shadow-[0_4px_16px_rgb(244_63_94_/_12%)]",
    mutedOverlay: "border-rose-500/35 bg-rose-500/5",
    ring: "border-rose-500/60 bg-rose-500/5",
    soft: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
    text: "text-rose-600 dark:text-rose-300",
  },
}

const OCR_BLOCKS: OcrBlock[] = [
  {
    id: "title",
    type: "heading",
    label: "Paper title",
    text: "Attention Is All You Need",
    page: 1,
    confidence: 0.99,
    polygon: [
      { x: 246, y: 188 },
      { x: 566, y: 188 },
      { x: 566, y: 222 },
      { x: 246, y: 222 },
    ],
  },
  {
    id: "author-grid",
    type: "paragraph",
    label: "Authors",
    text: "Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit...",
    page: 1,
    confidence: 0.96,
    polygon: [
      { x: 92, y: 206 },
      { x: 698, y: 206 },
      { x: 698, y: 270 },
      { x: 92, y: 270 },
    ],
  },
  {
    id: "abstract-heading",
    type: "heading",
    label: "Section heading",
    text: "Abstract",
    page: 1,
    confidence: 0.98,
    polygon: [
      { x: 360, y: 330 },
      { x: 434, y: 330 },
      { x: 434, y: 350 },
      { x: 360, y: 350 },
    ],
  },
  {
    id: "abstract-body",
    type: "paragraph",
    label: "Abstract body",
    text: "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...",
    page: 1,
    confidence: 0.94,
    polygon: [
      { x: 108, y: 346 },
      { x: 692, y: 346 },
      { x: 692, y: 458 },
      { x: 108, y: 458 },
    ],
  },
  {
    id: "background-body",
    type: "paragraph",
    label: "Background text",
    text: "Recurrent neural networks, long short-term memory and gated recurrent neural networks...",
    page: 2,
    confidence: 0.92,
    polygon: [
      { x: 76, y: 74 },
      { x: 718, y: 74 },
      { x: 718, y: 184 },
      { x: 76, y: 184 },
    ],
  },
  {
    id: "attention-diagram",
    type: "image",
    label: "Architecture figure",
    text: "Transformer architecture diagram",
    page: 2,
    confidence: 0.89,
    polygon: [
      { x: 462, y: 250 },
      { x: 720, y: 250 },
      { x: 720, y: 602 },
      { x: 462, y: 602 },
    ],
  },
  {
    id: "comparison-table",
    type: "table",
    label: "Complexity table",
    text: "Layer type, complexity per layer, sequential operations, maximum path length",
    page: 6,
    confidence: 0.91,
    polygon: [
      { x: 52, y: 58 },
      { x: 740, y: 58 },
      { x: 740, y: 190 },
      { x: 52, y: 190 },
    ],
  },
  {
    id: "layer-list",
    type: "list",
    label: "Comparison criteria",
    text: "Total computational complexity, parallelizable computation, and maximum path length",
    page: 6,
    confidence: 0.88,
    polygon: [
      { x: 56, y: 440 },
      { x: 735, y: 440 },
      { x: 735, y: 548 },
      { x: 56, y: 548 },
    ],
  },
]

function convertPolygonToHighlightArea(polygon: Point[]): HighlightArea {
  const xValues = polygon.map((point) => point.x)
  const yValues = polygon.map((point) => point.y)
  const left = Math.min(...xValues)
  const right = Math.max(...xValues)
  const top = Math.min(...yValues)
  const bottom = Math.max(...yValues)

  return {
    left: (left / PAGE_WIDTH) * 100,
    top: (top / PAGE_HEIGHT) * 100,
    width: ((right - left) / PAGE_WIDTH) * 100,
    height: ((bottom - top) / PAGE_HEIGHT) * 100,
  }
}

function BlockOverlay({
  block,
  isActive,
}: {
  block: OcrBlock
  isActive: boolean
}) {
  const highlight = convertPolygonToHighlightArea(block.polygon)
  const style = BLOCK_STYLES[block.type]

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-10 rounded-[3px] border transition-[opacity,box-shadow]",
        isActive
          ? cn("opacity-100", style.overlay)
          : cn("opacity-55", style.mutedOverlay)
      )}
      style={{
        left: `${highlight.left}%`,
        top: `${highlight.top}%`,
        width: `${highlight.width}%`,
        height: `${highlight.height}%`,
      }}
    />
  )
}

function OcrPage({
  pageNumber,
  activeBlock,
  reactPdf,
}: {
  pageNumber: number
  activeBlock: OcrBlock | null
  reactPdf: ReactPdfModule
}) {
  const devicePixelRatio =
    typeof window === "undefined"
      ? 1
      : Math.min(DEVICE_PIXEL_RATIO_LIMIT, window.devicePixelRatio || 1)
  const pageBlocks = OCR_BLOCKS.filter((block) => block.page === pageNumber)

  return (
    <div
      data-ocr-page={pageNumber}
      className="relative"
      style={{ width: RENDERED_PAGE_WIDTH, height: RENDERED_PAGE_HEIGHT }}
    >
      <reactPdf.Page
        pageNumber={pageNumber}
        width={RENDERED_PAGE_WIDTH}
        className="overflow-hidden border bg-background shadow-xs"
        renderAnnotationLayer={false}
        renderTextLayer={false}
        devicePixelRatio={devicePixelRatio}
        loading={
          <div
            className="grid place-items-center"
            style={{ width: RENDERED_PAGE_WIDTH, height: RENDERED_PAGE_HEIGHT }}
          >
            <HugeiconsIcon
              icon={Loading03Icon}
              className="size-4 animate-spin"
            />
          </div>
        }
      />
      {pageBlocks.map((block) => (
        <BlockOverlay
          key={block.id}
          block={block}
          isActive={activeBlock?.id === block.id}
        />
      ))}
    </div>
  )
}

export function OcrBlocks() {
  const [activeBlockId, setActiveBlockId] = React.useState(OCR_BLOCKS[0].id)
  const [reactPdf, setReactPdf] = React.useState<ReactPdfModule | null>(null)
  const [loadError, setLoadError] = React.useState(false)
  const viewportRef = React.useRef<HTMLDivElement>(null)
  const activeBlock =
    OCR_BLOCKS.find((block) => block.id === activeBlockId) ?? OCR_BLOCKS[0]

  React.useEffect(() => {
    let mounted = true

    void import("react-pdf")
      .then((module) => {
        module.pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL

        if (mounted) {
          setReactPdf(module)
        }
      })
      .catch(() => {
        if (mounted) {
          setLoadError(true)
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  const focusBlock = React.useCallback((block: OcrBlock) => {
    setActiveBlockId(block.id)

    window.requestAnimationFrame(() => {
      const viewport = viewportRef.current
      const page = viewport?.querySelector<HTMLElement>(
        `[data-ocr-page="${block.page}"]`
      )

      if (!viewport || !page) return

      const highlight = convertPolygonToHighlightArea(block.polygon)
      const pageTop =
        page.getBoundingClientRect().top -
        viewport.getBoundingClientRect().top +
        viewport.scrollTop
      const targetTop =
        pageTop + (highlight.top / 100) * RENDERED_PAGE_HEIGHT - 96

      viewport.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth",
      })
    })
  }, [])

  return (
    <div className="grid h-[620px] overflow-hidden bg-background lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-h-0 min-w-0 flex-col border-b lg:border-r lg:border-b-0">
        <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
          <div className="text-sm font-medium">PDF Viewer</div>
          <div className="text-xs text-muted-foreground">
            Page {activeBlock.page}
          </div>
        </div>
        <div
          ref={viewportRef}
          className="min-h-0 flex-1 overflow-auto bg-muted/30"
        >
          {loadError ? (
            <div className="grid h-full place-items-center p-6 text-sm text-muted-foreground">
              Unable to load the PDF preview.
            </div>
          ) : reactPdf ? (
            <reactPdf.Document
              file={PDF_URL}
              className="flex min-h-full w-max min-w-full flex-col items-center gap-6 p-6"
              loading={
                <div className="grid h-full min-h-80 place-items-center">
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    className="size-4 animate-spin"
                  />
                </div>
              }
              error={null}
              onLoadError={() => setLoadError(true)}
            >
              {PREVIEW_PAGES.map((pageNumber) => (
                <OcrPage
                  key={pageNumber}
                  pageNumber={pageNumber}
                  activeBlock={activeBlock}
                  reactPdf={reactPdf}
                />
              ))}
            </reactPdf.Document>
          ) : (
            <div className="grid h-full min-h-80 place-items-center">
              <HugeiconsIcon
                icon={Loading03Icon}
                className="size-4 animate-spin"
              />
            </div>
          )}
        </div>
      </div>
      <aside className="flex min-h-0 flex-col">
        <div className="border-b px-4 py-3">
          <div className="text-sm font-medium">OCR Blocks</div>
          <div className="text-xs text-muted-foreground">
            Hover a block to inspect its extracted region.
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="space-y-2">
            {OCR_BLOCKS.map((block) => {
              const isActive = block.id === activeBlock.id
              const style = BLOCK_STYLES[block.type]

              return (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => focusBlock(block)}
                  onFocus={() => focusBlock(block)}
                  onMouseEnter={() => focusBlock(block)}
                  className={cn(
                    "w-full rounded-lg border bg-background p-3 text-left transition-[border-color,background-color,box-shadow] hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    isActive &&
                      cn("shadow-[0_0_0_1px_rgb(0_0_0_/_4%)]", style.ring)
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
                        style.soft
                      )}
                    >
                      <HugeiconsIcon icon={style.icon} className="size-4" />
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
                      <div
                        className={cn("mt-0.5 text-xs font-medium", style.text)}
                      >
                        {style.label} · {Math.round(block.confidence * 100)}%
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
        </div>
      </aside>
    </div>
  )
}

export function OcrBlocksDemo() {
  const [isCodeVisible, setIsCodeVisible] = React.useState(false)

  return (
    <div
      data-slot="component-preview"
      className="group relative mt-4 mb-12 flex flex-col overflow-hidden rounded-xl border"
    >
      <OcrBlocks />
      <div
        data-slot="code"
        data-mobile-code-visible={isCodeVisible}
        className="relative overflow-hidden **:data-[slot=copy-button]:right-4 **:data-[slot=copy-button]:hidden data-[mobile-code-visible=true]:**:data-[slot=copy-button]:flex [&_[data-rehype-pretty-code-figure]]:m-0! [&_[data-rehype-pretty-code-figure]]:rounded-t-none [&_[data-rehype-pretty-code-figure]]:border-t [&_pre]:max-h-72"
      >
        {isCodeVisible ? (
          <HighlightedCodeBlock
            code={ocrBlocksUsageCode}
            className="rounded-none border-x-0 border-b-0"
          />
        ) : (
          <div className="relative">
            <HighlightedCodeBlock
              code={ocrBlocksUsageCode}
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

const ocrBlocksUsageCode = `"use client";

import * as React from "react";
import {
  Heading01Icon,
  Image01Icon,
  LeftToRightListBulletIcon,
  Loading03Icon,
  ParagraphIcon,
  Table01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type * as ReactPdf from "react-pdf";

import { cn } from "@/lib/utils";

type ReactPdfModule = typeof ReactPdf;
type Point = { x: number; y: number };
type OcrBlockType = "heading" | "paragraph" | "list" | "table" | "image";

type OcrBlock = {
  id: string;
  type: OcrBlockType;
  label: string;
  text: string;
  page: number;
  confidence: number;
  polygon: Point[];
};

const PDF_URL = "/samples/attention.pdf";
const PDF_WORKER_URL = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();
const PAGE_WIDTH = 792;
const PAGE_HEIGHT = 612;
const RENDERED_PAGE_WIDTH = 430;
const RENDERED_PAGE_HEIGHT = Math.round(RENDERED_PAGE_WIDTH * (PAGE_HEIGHT / PAGE_WIDTH));

const OCR_BLOCKS: OcrBlock[] = [
  {
    id: "title",
    type: "heading",
    label: "Paper title",
    text: "Attention Is All You Need",
    page: 1,
    confidence: 0.99,
    polygon: [
      { x: 246, y: 188 },
      { x: 566, y: 188 },
      { x: 566, y: 222 },
      { x: 246, y: 222 },
    ],
  },
  {
    id: "abstract-body",
    type: "paragraph",
    label: "Abstract body",
    text: "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...",
    page: 1,
    confidence: 0.94,
    polygon: [
      { x: 108, y: 346 },
      { x: 692, y: 346 },
      { x: 692, y: 458 },
      { x: 108, y: 458 },
    ],
  },
];

const BLOCK_STYLES = {
  heading: {
    icon: Heading01Icon,
    active: "border-violet-500/70 bg-violet-500/10 shadow-[0_4px_16px_rgb(139_92_246_/_12%)]",
    muted: "border-violet-500/35 bg-violet-500/5",
  },
  paragraph: {
    icon: ParagraphIcon,
    active: "border-blue-500/70 bg-blue-500/10 shadow-[0_4px_16px_rgb(59_130_246_/_12%)]",
    muted: "border-blue-500/35 bg-blue-500/5",
  },
  list: {
    icon: LeftToRightListBulletIcon,
    active: "border-emerald-500/70 bg-emerald-500/10 shadow-[0_4px_16px_rgb(16_185_129_/_12%)]",
    muted: "border-emerald-500/35 bg-emerald-500/5",
  },
  table: {
    icon: Table01Icon,
    active: "border-amber-500/70 bg-amber-500/10 shadow-[0_4px_16px_rgb(245_158_11_/_12%)]",
    muted: "border-amber-500/35 bg-amber-500/5",
  },
  image: {
    icon: Image01Icon,
    active: "border-rose-500/70 bg-rose-500/10 shadow-[0_4px_16px_rgb(244_63_94_/_12%)]",
    muted: "border-rose-500/35 bg-rose-500/5",
  },
};

function toHighlight(polygon: Point[]) {
  const xs = polygon.map((point) => point.x);
  const ys = polygon.map((point) => point.y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);

  return {
    left: (left / PAGE_WIDTH) * 100,
    top: (top / PAGE_HEIGHT) * 100,
    width: ((right - left) / PAGE_WIDTH) * 100,
    height: ((bottom - top) / PAGE_HEIGHT) * 100,
  };
}

export function OcrBlocks() {
  const [reactPdf, setReactPdf] = React.useState<ReactPdfModule | null>(null);
  const [activeBlockId, setActiveBlockId] = React.useState(OCR_BLOCKS[0].id);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const activeBlock =
    OCR_BLOCKS.find((block) => block.id === activeBlockId) ?? OCR_BLOCKS[0];

  React.useEffect(() => {
    let mounted = true;

    void import("react-pdf").then((module) => {
      module.pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
      if (mounted) setReactPdf(module);
    });

    return () => {
      mounted = false;
    };
  }, []);

  function focusBlock(block: OcrBlock) {
    setActiveBlockId(block.id);
    window.requestAnimationFrame(() => {
      const page = viewportRef.current?.querySelector<HTMLElement>(
        \`[data-ocr-page="\${block.page}"]\`,
      );
      if (!viewportRef.current || !page) return;

      const highlight = toHighlight(block.polygon);
      const pageTop =
        page.getBoundingClientRect().top -
        viewportRef.current.getBoundingClientRect().top +
        viewportRef.current.scrollTop;

      viewportRef.current.scrollTo({
        top: Math.max(0, pageTop + (highlight.top / 100) * RENDERED_PAGE_HEIGHT - 96),
        behavior: "smooth",
      });
    });
  }

  return (
    <div className="grid h-[620px] overflow-hidden bg-background lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div ref={viewportRef} className="min-h-0 overflow-auto bg-muted/30 p-6">
        {reactPdf ? (
          <reactPdf.Document file={PDF_URL}>
            {[1, 2, 3].map((pageNumber) => (
              <div
                key={pageNumber}
                data-ocr-page={pageNumber}
                className="relative mx-auto mb-6"
                style={{ width: RENDERED_PAGE_WIDTH, height: RENDERED_PAGE_HEIGHT }}
              >
                <reactPdf.Page
                  pageNumber={pageNumber}
                  width={RENDERED_PAGE_WIDTH}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  loading={<HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />}
                />
                {OCR_BLOCKS.filter((block) => block.page === pageNumber).map((block) => {
                  const area = toHighlight(block.polygon);
                  const style = BLOCK_STYLES[block.type];

                  return (
                    <div
                      key={block.id}
                      className={cn(
                        "pointer-events-none absolute z-10 rounded-[3px] border",
                        block.id === activeBlock.id ? style.active : cn("opacity-55", style.muted),
                      )}
                      style={{
                        left: area.left + "%",
                        top: area.top + "%",
                        width: area.width + "%",
                        height: area.height + "%",
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </reactPdf.Document>
        ) : (
          <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
        )}
      </div>
      <aside className="min-h-0 overflow-y-auto p-3">
        {OCR_BLOCKS.map((block) => {
          const style = BLOCK_STYLES[block.type];

          return (
            <button
              key={block.id}
              type="button"
              onClick={() => focusBlock(block)}
              onMouseEnter={() => focusBlock(block)}
              onFocus={() => focusBlock(block)}
              className="mb-2 w-full rounded-lg border bg-background p-3 text-left text-sm"
            >
              <HugeiconsIcon icon={style.icon} className="size-4" />
              <div className="mt-2 font-medium">{block.label}</div>
              <div className="mt-1">{block.text}</div>
            </button>
          );
        })}
      </aside>
    </div>
  );
}`

export function OcrBlocksSource() {
  return <HighlightedCodeBlock code={ocrBlocksUsageCode} />
}
