"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PDFViewer, type PDFViewerHandle } from "@/components/ui/pdf-viewer"
import { ScrollArea } from "@/components/ui/scroll-area"
import { HighlightedCodeBlock } from "@/components/highlighted-code-block"
import { PdfBlockResizableShell } from "@/components/pdf-block-resizable-shell"

type Point = {
  x: number
  y: number
}

type Citation = {
  id: string
  description: string
  value: string
  page: number
  polygon: Point[]
}

type HighlightArea = {
  left: number
  top: number
  width: number
  height: number
}

const PDF_URL = "/samples/attention.pdf"
const ANNOTATION_PAGE_WIDTH = 792
const ANNOTATION_PAGE_HEIGHT = 612
const DEFAULT_ZOOM = 0.75
const CITATION_STYLE = {
  active:
    "border-blue-500/60 bg-blue-500/5 shadow-[0_0_0_1px_rgb(59_130_246_/_8%)]",
  overlay:
    "border-blue-500/70 bg-blue-500/12 shadow-[0_4px_16px_rgb(59_130_246_/_12%)]",
}

const CITATIONS: Citation[] = [
  {
    id: "title",
    description: "Paper title extracted from the first page heading.",
    value: "Attention Is All You Need",
    page: 1,
    polygon: [
      { x: 246, y: 188 },
      { x: 566, y: 188 },
      { x: 566, y: 222 },
      { x: 246, y: 222 },
    ],
  },
  {
    id: "authors",
    description: "Authors listed beneath the paper title.",
    value:
      "Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser, Polosukhin",
    page: 1,
    polygon: [
      { x: 92, y: 206 },
      { x: 698, y: 206 },
      { x: 698, y: 270 },
      { x: 92, y: 270 },
    ],
  },
  {
    id: "abstract",
    description: "Central model claim from the abstract.",
    value:
      "The Transformer relies entirely on attention mechanisms and avoids recurrence and convolutions.",
    page: 1,
    polygon: [
      { x: 108, y: 346 },
      { x: 692, y: 346 },
      { x: 692, y: 414 },
      { x: 108, y: 414 },
    ],
  },
  {
    id: "bleu",
    description: "Reported machine translation benchmark result.",
    value: "28.4 BLEU on WMT 2014 English-to-German",
    page: 1,
    polygon: [
      { x: 108, y: 412 },
      { x: 692, y: 412 },
      { x: 692, y: 458 },
      { x: 108, y: 458 },
    ],
  },
  {
    id: "architecture",
    description: "Architecture property described in the background section.",
    value:
      "Self-attention connects positions in a sequence through constant-time operations.",
    page: 2,
    polygon: [
      { x: 76, y: 74 },
      { x: 718, y: 74 },
      { x: 718, y: 184 },
      { x: 76, y: 184 },
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
    left: (left / ANNOTATION_PAGE_WIDTH) * 100,
    top: (top / ANNOTATION_PAGE_HEIGHT) * 100,
    width: ((right - left) / ANNOTATION_PAGE_WIDTH) * 100,
    height: ((bottom - top) / ANNOTATION_PAGE_HEIGHT) * 100,
  }
}

function CitationHighlight({ citation }: { citation: Citation }) {
  const highlight = convertPolygonToHighlightArea(citation.polygon)

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-10 rounded-[3px] border",
        CITATION_STYLE.overlay
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

function CitationsPanel({
  activeCitationId,
  className,
  onCitationFocus,
}: {
  activeCitationId?: string
  className?: string
  onCitationFocus?: (citation: Citation) => void
}) {
  const [localActiveCitationId, setLocalActiveCitationId] = React.useState(
    activeCitationId ?? CITATIONS[0].id
  )
  const activeCitation =
    CITATIONS.find(
      (citation) => citation.id === (activeCitationId ?? localActiveCitationId)
    ) ?? CITATIONS[0]

  const focusCitation = React.useCallback(
    (citation: Citation) => {
      setLocalActiveCitationId(citation.id)
      onCitationFocus?.(citation)
    },
    [onCitationFocus]
  )

  return (
    <aside
      className={cn("flex h-[420px] min-h-0 flex-col bg-background", className)}
    >
      <ScrollArea className="min-h-0 flex-1" scrollFade>
        <div className="p-3">
          <div className="space-y-2">
            {CITATIONS.map((citation) => {
              const isActive = citation.id === activeCitation.id

              return (
                <button
                  key={citation.id}
                  type="button"
                  onClick={() => focusCitation(citation)}
                  onFocus={() => focusCitation(citation)}
                  onMouseEnter={() => focusCitation(citation)}
                  className={cn(
                    "w-full rounded-lg border bg-background p-3 text-left transition-[border-color,background-color,box-shadow] hover:border-blue-500/50 hover:bg-blue-500/5 focus-visible:border-blue-500/60 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:outline-none",
                    isActive && CITATION_STYLE.active
                  )}
                >
                  <div className="mb-3 flex min-h-8 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {citation.id}
                      </div>
                      <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {citation.description}
                      </div>
                    </div>
                    <div className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      p. {citation.page}
                    </div>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-2">
                    <div className="min-h-7 rounded-md bg-background px-2 py-1.5 text-sm">
                      {citation.value}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </ScrollArea>
    </aside>
  )
}

export function Citations() {
  return <CitationsPanel />
}

export function CitationsBlock() {
  const [activeCitationId, setActiveCitationId] = React.useState(
    CITATIONS[0].id
  )
  const viewerRef = React.useRef<PDFViewerHandle>(null)
  const activeCitation =
    CITATIONS.find((citation) => citation.id === activeCitationId) ??
    CITATIONS[0]

  const scrollToCitation = React.useCallback((citation: Citation) => {
    setActiveCitationId(citation.id)
    viewerRef.current?.scrollToPageArea(
      citation.page,
      convertPolygonToHighlightArea(citation.polygon)
    )
  }, [])

  return (
    <PdfBlockResizableShell
      autoSaveId="pdf-block-citations"
      left={
        <PDFViewer
          ref={viewerRef}
          file={PDF_URL}
          defaultZoom={DEFAULT_ZOOM}
          renderPageOverlay={({ pageNumber }) =>
            activeCitation.page === pageNumber ? (
              <CitationHighlight citation={activeCitation} />
            ) : null
          }
        />
      }
      right={
        <CitationsPanel
          activeCitationId={activeCitation.id}
          className="h-full"
          onCitationFocus={scrollToCitation}
        />
      }
    />
  )
}

function CitationExampleCard({
  active,
  accentClassName,
  fieldKey,
  pageLabel,
  description,
  value,
}: {
  active?: boolean
  accentClassName?: string
  fieldKey: string
  pageLabel: string
  description: string
  value: string
}) {
  return (
    <button
      type="button"
      className={cn(
        "w-full rounded-lg border bg-background p-3 text-left transition-[border-color,background-color,box-shadow] hover:border-blue-500/50 hover:bg-blue-500/5 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:outline-none",
        active &&
          (accentClassName ??
            "border-blue-500/60 bg-blue-500/5 shadow-[0_0_0_1px_rgb(59_130_246_/_8%)]")
      )}
    >
      <div className="mb-3 flex min-h-8 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{fieldKey}</div>
          <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {description}
          </div>
        </div>
        <div className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {pageLabel}
        </div>
      </div>
      <div className="rounded-md border bg-muted/30 p-2">
        <div className="min-h-7 rounded-md bg-background px-2 py-1.5 text-sm">
          {value}
        </div>
      </div>
    </button>
  )
}

function CitationsExample() {
  return (
    <div className="flex h-[420px] flex-col gap-2 bg-background p-3">
      <CitationExampleCard
        active
        fieldKey="invoice_total"
        pageLabel="p. 1"
        value="$12,480.00"
        description="Total amount due, including tax and service fees."
      />
      <CitationExampleCard
        fieldKey="payment_terms"
        pageLabel="p. 2"
        value="Net 30"
        description="Payment is due within thirty days of receipt."
        accentClassName="border-emerald-500/60 bg-emerald-500/5"
      />
      <CitationExampleCard
        fieldKey="purchase_order"
        pageLabel="p. 3"
        value="PO-1048"
        description="Customer purchase order identifier."
        accentClassName="border-amber-500/60 bg-amber-500/5"
      />
    </div>
  )
}

export function CitationsDemo() {
  const [isCodeVisible, setIsCodeVisible] = React.useState(false)

  return (
    <div
      data-slot="component-preview"
      className="group relative mt-4 mb-12 flex flex-col overflow-hidden rounded-xl border"
    >
      <CitationsExample />
      <div
        data-slot="code"
        data-mobile-code-visible={isCodeVisible}
        className="relative overflow-hidden **:data-[slot=copy-button]:right-4 **:data-[slot=copy-button]:hidden data-[mobile-code-visible=true]:**:data-[slot=copy-button]:flex [&_[data-rehype-pretty-code-figure]]:m-0! [&_[data-rehype-pretty-code-figure]]:rounded-t-none [&_[data-rehype-pretty-code-figure]]:border-t [&_pre]:max-h-72"
      >
        {isCodeVisible ? (
          <HighlightedCodeBlock
            code={citationsUsageCode}
            className="rounded-none border-x-0 border-b-0"
          />
        ) : (
          <div className="relative">
            <HighlightedCodeBlock
              code={citationsUsageCode}
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

const citationsUsageCode = `"use client";

import { CitationCard } from "@/components/ui/citation-card";

export function CitationsExample() {
  return (
    <div className="flex h-[420px] flex-col gap-2 bg-background p-3">
      <CitationCard
        active
        fieldKey="invoice_total"
        pageLabel="p. 1"
        value="$12,480.00"
        description="Total amount due, including tax and service fees."
      />
      <CitationCard
        fieldKey="payment_terms"
        pageLabel="p. 2"
        value="Net 30"
        description="Payment is due within thirty days of receipt."
        accentClassName="border-emerald-500/60 bg-emerald-500/5"
      />
      <CitationCard
        fieldKey="purchase_order"
        pageLabel="p. 3"
        value="PO-1048"
        description="Customer purchase order identifier."
        accentClassName="border-amber-500/60 bg-amber-500/5"
      />
    </div>
  );
}`

const citationsSourceCode = `"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type CitationCardProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  fieldKey: string;
  value: string;
  description?: string;
  pageLabel?: string;
  active?: boolean;
  accentClassName?: string;
};

export function CitationCard({
  fieldKey,
  value,
  description,
  pageLabel,
  active = false,
  accentClassName = "border-blue-500/60 bg-blue-500/5 shadow-[0_0_0_1px_rgb(59_130_246_/_8%)]",
  className,
  ...props
}: CitationCardProps) {
  return (
    <button
      type="button"
      className={cn(
        "w-full rounded-lg border bg-background p-3 text-left transition-[border-color,background-color,box-shadow] hover:border-blue-500/50 hover:bg-blue-500/5 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:outline-none",
        active && accentClassName,
        className,
      )}
      {...props}
    >
      <div className="mb-3 flex min-h-8 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{fieldKey}</div>
          {description ? (
            <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {description}
            </div>
          ) : null}
        </div>
        {pageLabel ? (
          <div className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {pageLabel}
          </div>
        ) : null}
      </div>
      <div className="rounded-md border bg-muted/30 p-2">
        <div className="min-h-7 rounded-md bg-background px-2 py-1.5 text-sm">
          {value}
        </div>
      </div>
    </button>
  );
}`

export function CitationsSource() {
  return <HighlightedCodeBlock code={citationsSourceCode} />
}
