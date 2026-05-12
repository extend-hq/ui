"use client"

import * as React from "react"
import { Loading03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type * as ReactPdf from "react-pdf"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { HighlightedCodeBlock } from "@/components/highlighted-code-block"

type Point = {
  x: number
  y: number
}

type Citation = {
  id: string
  label: string
  value: string
  page: number
  referenceText: string
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
const PAGE_RENDER_BUFFER = 2
const CITATION_STYLE = {
  active:
    "border-blue-500/60 bg-blue-500/5 shadow-[0_0_0_1px_rgb(59_130_246_/_8%)]",
  overlay:
    "border-blue-500/70 bg-blue-500/12 shadow-[0_4px_16px_rgb(59_130_246_/_12%)]",
}

const CITATIONS: Citation[] = [
  {
    id: "title",
    label: "Title",
    value: "Attention Is All You Need",
    page: 1,
    referenceText: "Attention Is All You Need",
    polygon: [
      { x: 246, y: 188 },
      { x: 566, y: 188 },
      { x: 566, y: 222 },
      { x: 246, y: 222 },
    ],
  },
  {
    id: "authors",
    label: "Authors",
    value:
      "Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser, Polosukhin",
    page: 1,
    referenceText: "Ashish Vaswani ... Illia Polosukhin",
    polygon: [
      { x: 92, y: 206 },
      { x: 698, y: 206 },
      { x: 698, y: 270 },
      { x: 92, y: 270 },
    ],
  },
  {
    id: "abstract",
    label: "Abstract claim",
    value:
      "The Transformer relies entirely on attention mechanisms and avoids recurrence and convolutions.",
    page: 1,
    referenceText:
      "The Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.",
    polygon: [
      { x: 108, y: 346 },
      { x: 692, y: 346 },
      { x: 692, y: 414 },
      { x: 108, y: 414 },
    ],
  },
  {
    id: "bleu",
    label: "Translation quality",
    value: "28.4 BLEU on WMT 2014 English-to-German",
    page: 1,
    referenceText:
      "our model achieves 28.4 BLEU on the WMT 2014 English-to-German translation task",
    polygon: [
      { x: 108, y: 412 },
      { x: 692, y: 412 },
      { x: 692, y: 458 },
      { x: 108, y: 458 },
    ],
  },
  {
    id: "architecture",
    label: "Background",
    value:
      "Self-attention connects positions in a sequence through constant-time operations.",
    page: 2,
    referenceText:
      "Self-attention connects all positions with a constant number of sequentially executed operations.",
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
    left: (left / PAGE_WIDTH) * 100,
    top: (top / PAGE_HEIGHT) * 100,
    width: ((right - left) / PAGE_WIDTH) * 100,
    height: ((bottom - top) / PAGE_HEIGHT) * 100,
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

function CitationPage({
  pageNumber,
  activeCitation,
  reactPdf,
  shouldRenderPage,
  onFirstPageRender,
}: {
  pageNumber: number
  activeCitation: Citation | null
  reactPdf: ReactPdfModule
  shouldRenderPage: boolean
  onFirstPageRender?: () => void
}) {
  const devicePixelRatio =
    typeof window === "undefined"
      ? 1
      : Math.min(DEVICE_PIXEL_RATIO_LIMIT, window.devicePixelRatio || 1)

  return (
    <div
      data-citation-page={pageNumber}
      className="relative"
      style={{ width: RENDERED_PAGE_WIDTH, height: RENDERED_PAGE_HEIGHT }}
    >
      {shouldRenderPage ? (
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
              style={{
                width: RENDERED_PAGE_WIDTH,
                height: RENDERED_PAGE_HEIGHT,
              }}
            >
              <HugeiconsIcon
                icon={Loading03Icon}
                className="size-4 animate-spin"
              />
            </div>
          }
          onRenderSuccess={pageNumber === 1 ? onFirstPageRender : undefined}
          onRenderError={pageNumber === 1 ? onFirstPageRender : undefined}
        />
      ) : (
        <div className="size-full border bg-muted/30 shadow-xs" />
      )}
      {activeCitation?.page === pageNumber ? (
        <CitationHighlight citation={activeCitation} />
      ) : null}
    </div>
  )
}

export function Citations() {
  const [activeCitationId, setActiveCitationId] = React.useState(
    CITATIONS[0].id
  )
  const [reactPdf, setReactPdf] = React.useState<ReactPdfModule | null>(null)
  const [loadError, setLoadError] = React.useState(false)
  const [isDocumentLoading, setIsDocumentLoading] = React.useState(true)
  const [isPageRendering, setIsPageRendering] = React.useState(true)
  const [numPages, setNumPages] = React.useState<number | null>(null)
  const [currentPage, setCurrentPage] = React.useState(1)
  const viewportRef = React.useRef<HTMLDivElement>(null)
  const activeCitation =
    CITATIONS.find((citation) => citation.id === activeCitationId) ??
    CITATIONS[0]
  const pageNumbers = React.useMemo(() => {
    return Array.from({ length: numPages ?? 0 }, (_, index) => index + 1)
  }, [numPages])
  const isViewerLoading = !reactPdf || isDocumentLoading || isPageRendering

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
          setIsDocumentLoading(false)
          setIsPageRendering(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  const handleFirstPageRender = React.useCallback(() => {
    setIsPageRendering(false)
  }, [])

  const handleDocumentLoadStart = React.useCallback(() => {
    setIsDocumentLoading(true)
    setIsPageRendering(true)
    setLoadError(false)
    setNumPages(null)
    setCurrentPage(1)
    viewportRef.current?.scrollTo({ top: 0, left: 0 })
  }, [])

  const handleDocumentLoadSuccess = React.useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages)
      setCurrentPage(1)
      setIsDocumentLoading(false)
      setIsPageRendering(true)
      setLoadError(false)
      viewportRef.current?.scrollTo({ top: 0, left: 0 })
    },
    []
  )

  const handleDocumentLoadError = React.useCallback(() => {
    setIsDocumentLoading(false)
    setIsPageRendering(false)
    setLoadError(true)
    setNumPages(null)
  }, [])

  const updateCurrentPageFromViewport = React.useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport || !numPages) {
      return
    }

    const viewportRect = viewport.getBoundingClientRect()
    const viewportCenter = viewportRect.top + viewportRect.height / 2
    let closestPage = 1
    let closestDistance = Number.POSITIVE_INFINITY

    viewport
      .querySelectorAll<HTMLElement>("[data-citation-page]")
      .forEach((page) => {
        const pageRect = page.getBoundingClientRect()
        const pageCenter = pageRect.top + pageRect.height / 2
        const distance = Math.abs(pageCenter - viewportCenter)

        if (distance < closestDistance) {
          closestDistance = distance
          closestPage = Number(page.dataset.citationPage || "1")
        }
      })

    setCurrentPage((page) => (page === closestPage ? page : closestPage))
  }, [numPages])

  React.useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || !numPages) {
      return
    }

    let frameId = 0
    const handleScroll = () => {
      window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(updateCurrentPageFromViewport)
    }

    frameId = window.requestAnimationFrame(updateCurrentPageFromViewport)
    viewport.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.cancelAnimationFrame(frameId)
      viewport.removeEventListener("scroll", handleScroll)
    }
  }, [numPages, updateCurrentPageFromViewport])

  const scrollToCitation = React.useCallback((citation: Citation) => {
    setActiveCitationId(citation.id)
    setCurrentPage(citation.page)

    window.requestAnimationFrame(() => {
      const viewport = viewportRef.current
      const page = viewport?.querySelector<HTMLElement>(
        `[data-citation-page="${citation.page}"]`
      )

      if (!viewport || !page) return

      const highlight = convertPolygonToHighlightArea(citation.polygon)
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
        <div className="flex min-h-12 items-center justify-between gap-3 border-b px-3">
          <div className="text-sm whitespace-nowrap text-primary">
            Page {currentPage} of {numPages ?? "-"}
          </div>
        </div>
        <div className="relative flex h-full min-h-0 w-full flex-1 bg-muted/30">
          {isViewerLoading && !loadError ? (
            <div className="absolute inset-0 z-10 grid place-items-center bg-background">
              <HugeiconsIcon
                icon={Loading03Icon}
                className="size-4 animate-spin"
              />
            </div>
          ) : null}
          {loadError ? (
            <div className="absolute inset-0 z-10 grid place-items-center bg-background p-6 text-sm text-muted-foreground">
              Unable to load the PDF preview.
            </div>
          ) : null}
          {reactPdf ? (
            <reactPdf.Document
              file={PDF_URL}
              className={cn(
                "flex h-full min-h-0 w-full flex-1",
                (isViewerLoading || loadError) && "invisible"
              )}
              loading={null}
              error={null}
              onLoadStart={handleDocumentLoadStart}
              onLoadSuccess={handleDocumentLoadSuccess}
              onLoadError={handleDocumentLoadError}
            >
              <div
                ref={viewportRef}
                className={cn(
                  "min-h-0 min-w-0 flex-1 overflow-auto",
                  isPageRendering && !loadError && "invisible"
                )}
              >
                <div className="flex min-h-full w-max min-w-full flex-col items-center justify-start gap-6 p-6">
                  {pageNumbers.map((pageNumber) => (
                    <CitationPage
                      key={pageNumber}
                      pageNumber={pageNumber}
                      activeCitation={activeCitation}
                      reactPdf={reactPdf}
                      shouldRenderPage={
                        Math.abs(pageNumber - currentPage) <= PAGE_RENDER_BUFFER
                      }
                      onFirstPageRender={handleFirstPageRender}
                    />
                  ))}
                </div>
              </div>
            </reactPdf.Document>
          ) : null}
        </div>
      </div>
      <aside className="flex min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="space-y-2">
            {CITATIONS.map((citation) => {
              const isActive = citation.id === activeCitation.id

              return (
                <button
                  key={citation.id}
                  type="button"
                  onClick={() => scrollToCitation(citation)}
                  onFocus={() => scrollToCitation(citation)}
                  onMouseEnter={() => scrollToCitation(citation)}
                  className={cn(
                    "w-full rounded-lg border bg-background p-3 text-left transition-[border-color,background-color,box-shadow] hover:border-blue-500/50 hover:bg-blue-500/5 focus-visible:border-blue-500/60 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:outline-none",
                    isActive && CITATION_STYLE.active
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">{citation.label}</div>
                    <div className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      p. {citation.page}
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-foreground/90">
                    {citation.value}
                  </div>
                  <div className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {citation.referenceText}
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

export function CitationsDemo() {
  const [isCodeVisible, setIsCodeVisible] = React.useState(false)

  return (
    <div
      data-slot="component-preview"
      className="group relative mt-4 mb-12 flex flex-col overflow-hidden rounded-xl border"
    >
      <Citations />
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

import * as React from "react";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type * as ReactPdf from "react-pdf";

import { cn } from "@/lib/utils";

type ReactPdfModule = typeof ReactPdf;

type Point = { x: number; y: number };

type Citation = {
  id: string;
  label: string;
  value: string;
  page: number;
  referenceText: string;
  polygon: Point[];
};

const PAGE_WIDTH = 792;
const PAGE_HEIGHT = 612;
const RENDERED_PAGE_WIDTH = 430;
const RENDERED_PAGE_HEIGHT = Math.round(RENDERED_PAGE_WIDTH * (PAGE_HEIGHT / PAGE_WIDTH));
const PAGE_RENDER_BUFFER = 2;
const CITATION_STYLE = {
  active:
    "border-blue-500/60 bg-blue-500/5 shadow-[0_0_0_1px_rgb(59_130_246_/_8%)]",
  overlay:
    "border-blue-500/70 bg-blue-500/12 shadow-[0_4px_16px_rgb(59_130_246_/_12%)]",
};
const PDF_URL = "/samples/attention.pdf";
const PDF_WORKER_URL = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const CITATIONS: Citation[] = [
  {
    id: "title",
    label: "Title",
    value: "Attention Is All You Need",
    page: 1,
    referenceText: "Attention Is All You Need",
    polygon: [
      { x: 246, y: 188 },
      { x: 566, y: 188 },
      { x: 566, y: 222 },
      { x: 246, y: 222 },
    ],
  },
  {
    id: "architecture",
    label: "Background",
    value: "Self-attention connects positions in a sequence through constant-time operations.",
    page: 2,
    referenceText:
      "Self-attention connects all positions with a constant number of sequentially executed operations.",
    polygon: [
      { x: 76, y: 74 },
      { x: 718, y: 74 },
      { x: 718, y: 184 },
      { x: 76, y: 184 },
    ],
  },
];

function convertPolygonToHighlightArea(polygon: Point[]) {
  const xValues = polygon.map((point) => point.x);
  const yValues = polygon.map((point) => point.y);
  const left = Math.min(...xValues);
  const right = Math.max(...xValues);
  const top = Math.min(...yValues);
  const bottom = Math.max(...yValues);

  return {
    left: (left / PAGE_WIDTH) * 100,
    top: (top / PAGE_HEIGHT) * 100,
    width: ((right - left) / PAGE_WIDTH) * 100,
    height: ((bottom - top) / PAGE_HEIGHT) * 100,
  };
}

function CitationHighlight({ citation }: { citation: Citation }) {
  const highlight = convertPolygonToHighlightArea(citation.polygon);

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-10 rounded-[3px] border",
        CITATION_STYLE.overlay,
      )}
      style={{
        left: highlight.left + "%",
        top: highlight.top + "%",
        width: highlight.width + "%",
        height: highlight.height + "%",
      }}
    />
  );
}

export function Citations() {
  const [activeCitationId, setActiveCitationId] = React.useState(CITATIONS[0].id);
  const [reactPdf, setReactPdf] = React.useState<ReactPdfModule | null>(null);
  const [loadError, setLoadError] = React.useState(false);
  const [isDocumentLoading, setIsDocumentLoading] = React.useState(true);
  const [isPageRendering, setIsPageRendering] = React.useState(true);
  const [numPages, setNumPages] = React.useState<number | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const activeCitation =
    CITATIONS.find((citation) => citation.id === activeCitationId) ?? CITATIONS[0];
  const pageNumbers = React.useMemo(
    () => Array.from({ length: numPages ?? 0 }, (_, index) => index + 1),
    [numPages],
  );
  const isViewerLoading = !reactPdf || isDocumentLoading || isPageRendering;

  React.useEffect(() => {
    let mounted = true;

    void import("react-pdf")
      .then((module) => {
        module.pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;

        if (mounted) setReactPdf(module);
      })
      .catch(() => {
        if (mounted) {
          setLoadError(true);
          setIsDocumentLoading(false);
          setIsPageRendering(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleFirstPageRender = React.useCallback(() => {
    setIsPageRendering(false);
  }, []);

  const handleDocumentLoadStart = React.useCallback(() => {
    setIsDocumentLoading(true);
    setIsPageRendering(true);
    setLoadError(false);
    setNumPages(null);
    setCurrentPage(1);
    viewportRef.current?.scrollTo({ top: 0, left: 0 });
  }, []);

  const handleDocumentLoadSuccess = React.useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
    setIsDocumentLoading(false);
    setIsPageRendering(true);
    setLoadError(false);
    viewportRef.current?.scrollTo({ top: 0, left: 0 });
  }, []);

  const handleDocumentLoadError = React.useCallback(() => {
    setIsDocumentLoading(false);
    setIsPageRendering(false);
    setLoadError(true);
    setNumPages(null);
  }, []);

  const updateCurrentPageFromViewport = React.useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || !numPages) return;

    const viewportRect = viewport.getBoundingClientRect();
    const viewportCenter = viewportRect.top + viewportRect.height / 2;
    let closestPage = 1;
    let closestDistance = Number.POSITIVE_INFINITY;

    viewport.querySelectorAll<HTMLElement>("[data-citation-page]").forEach((page) => {
      const pageRect = page.getBoundingClientRect();
      const pageCenter = pageRect.top + pageRect.height / 2;
      const distance = Math.abs(pageCenter - viewportCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestPage = Number(page.dataset.citationPage || "1");
      }
    });

    setCurrentPage((page) => (page === closestPage ? page : closestPage));
  }, [numPages]);

  React.useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !numPages) return;

    let frameId = window.requestAnimationFrame(updateCurrentPageFromViewport);
    const handleScroll = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateCurrentPageFromViewport);
    };

    viewport.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(frameId);
      viewport.removeEventListener("scroll", handleScroll);
    };
  }, [numPages, updateCurrentPageFromViewport]);

  function scrollToCitation(citation: Citation) {
    setActiveCitationId(citation.id);
    setCurrentPage(citation.page);

    window.requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      const page = viewport?.querySelector<HTMLElement>(
        \`[data-citation-page="\${citation.page}"]\`,
      );

      if (!viewport || !page) return;

      const highlight = convertPolygonToHighlightArea(citation.polygon);
      const pageTop =
        page.getBoundingClientRect().top -
        viewport.getBoundingClientRect().top +
        viewport.scrollTop;

      viewport.scrollTo({
        top: Math.max(0, pageTop + (highlight.top / 100) * RENDERED_PAGE_HEIGHT - 96),
        behavior: "smooth",
      });
    });
  }

  return (
    <div className="grid h-[620px] overflow-hidden bg-background lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-h-0 min-w-0 flex-col border-b lg:border-r lg:border-b-0">
        <div className="flex min-h-12 items-center justify-between gap-3 border-b px-3">
          <div className="text-sm whitespace-nowrap text-primary">
            Page {currentPage} of {numPages ?? "-"}
          </div>
        </div>
        <div className="relative flex h-full min-h-0 w-full flex-1 bg-muted/30">
          {isViewerLoading && !loadError ? (
            <div className="absolute inset-0 z-10 grid place-items-center bg-background">
              <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
            </div>
          ) : null}
        {loadError ? (
            <div className="absolute inset-0 z-10 grid place-items-center bg-background p-6 text-sm text-muted-foreground">
            Unable to load the PDF preview.
          </div>
          ) : null}
          {reactPdf ? (
            <reactPdf.Document
              file={PDF_URL}
              className={cn(
                "flex h-full min-h-0 w-full flex-1",
                (isViewerLoading || loadError) && "invisible",
              )}
              loading={null}
              error={null}
              onLoadStart={handleDocumentLoadStart}
              onLoadSuccess={handleDocumentLoadSuccess}
              onLoadError={handleDocumentLoadError}
            >
              <div
                ref={viewportRef}
                className={cn(
                  "min-h-0 min-w-0 flex-1 overflow-auto",
                  isPageRendering && !loadError && "invisible",
                )}
              >
                <div className="flex min-h-full w-max min-w-full flex-col items-center justify-start gap-6 p-6">
                  {pageNumbers.map((pageNumber) => {
                    const shouldRenderPage =
                      Math.abs(pageNumber - currentPage) <= PAGE_RENDER_BUFFER;

                    return (
                      <div
                        key={pageNumber}
                        data-citation-page={pageNumber}
                        className="relative"
                        style={{ width: RENDERED_PAGE_WIDTH, height: RENDERED_PAGE_HEIGHT }}
                      >
                        {shouldRenderPage ? (
                          <reactPdf.Page
                            pageNumber={pageNumber}
                            width={RENDERED_PAGE_WIDTH}
                            className="overflow-hidden border bg-background shadow-xs"
                            renderAnnotationLayer={false}
                            renderTextLayer={false}
                            loading={
                              <div
                                className="grid place-items-center"
                                style={{
                                  width: RENDERED_PAGE_WIDTH,
                                  height: RENDERED_PAGE_HEIGHT,
                                }}
                              >
                                <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
                              </div>
                            }
                            onRenderSuccess={pageNumber === 1 ? handleFirstPageRender : undefined}
                            onRenderError={pageNumber === 1 ? handleFirstPageRender : undefined}
                          />
                        ) : (
                          <div className="size-full border bg-muted/30 shadow-xs" />
                        )}
                        {activeCitation.page === pageNumber ? (
                          <CitationHighlight citation={activeCitation} />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </reactPdf.Document>
          ) : null}
        </div>
      </div>
      <aside className="min-h-0 overflow-y-auto p-3">
        {CITATIONS.map((citation) => (
          <button
            key={citation.id}
            type="button"
            onClick={() => scrollToCitation(citation)}
            onMouseEnter={() => scrollToCitation(citation)}
            onFocus={() => scrollToCitation(citation)}
            className={cn(
              "mb-2 w-full rounded-lg border bg-background p-3 text-left text-sm",
              citation.id === activeCitation.id && CITATION_STYLE.active,
            )}
          >
            <div className="font-medium">{citation.label}</div>
            <div className="mt-1">{citation.value}</div>
            <div className="mt-2 text-xs text-muted-foreground">{citation.referenceText}</div>
          </button>
        ))}
      </aside>
    </div>
  );
}`

export function CitationsSource() {
  return <HighlightedCodeBlock code={citationsUsageCode} />
}
