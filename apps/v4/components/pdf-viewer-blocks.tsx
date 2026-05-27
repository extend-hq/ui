"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { ArrowUpRight01Icon, Refresh01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { siteConfig } from "@/lib/config"
import { Button } from "@/components/ui/button"

const PreviewLoading = () => (
  <div className="grid h-[420px] place-items-center bg-muted/20 text-sm text-muted-foreground">
    Loading preview...
  </div>
)

const PdfDropzoneBlock = dynamic(
  () =>
    import("@/components/pdf-dropzone-block").then(
      (mod) => mod.PdfDropzoneBlock
    ),
  { loading: PreviewLoading, ssr: false }
)
const CitationsBlock = dynamic(
  () => import("@/components/citations-docs").then((mod) => mod.CitationsBlock),
  { loading: PreviewLoading, ssr: false }
)
const OcrBlocksBlock = dynamic(
  () =>
    import("@/components/ocr-blocks-docs").then((mod) => mod.OcrBlocksBlock),
  { loading: PreviewLoading, ssr: false }
)
const ESignatureBlock = dynamic(
  () =>
    import("@/components/e-signature-docs").then((mod) => mod.ESignatureBlock),
  { loading: PreviewLoading, ssr: false }
)
const HumanReviewBlock = dynamic(
  () =>
    import("@/components/human-review-docs").then(
      (mod) => mod.HumanReviewBlock
    ),
  { loading: PreviewLoading, ssr: false }
)
const DocumentSplitsBlock = dynamic(
  () =>
    import("@/components/document-splitter-docs").then(
      (mod) => mod.DocumentSplitsBlock
    ),
  { loading: PreviewLoading, ssr: false }
)
const XlsxDocumentSplitsBlock = dynamic(
  () =>
    import("@/components/document-splitter-docs").then(
      (mod) => mod.XlsxDocumentSplitsBlock
    ),
  { loading: PreviewLoading, ssr: false }
)

function getRegistryAddCommand(name: string) {
  return `npx shadcn@latest add ${siteConfig.url}/r/${name}.json`
}

const pdfViewerBlocks = [
  {
    id: "pdf-dropzone",
    title: "PDF Dropzone",
    description:
      "A PDF-only upload dropzone that opens the dropped file in the shared viewer.",
    command: getRegistryAddCommand("pdf-dropzone"),
    docsHref: "/docs/components/file-upload",
    component: PdfDropzoneBlock,
  },
  {
    id: "citations",
    title: "Citations",
    description:
      "Evidence cards that scroll the PDF viewer to source bounding boxes.",
    command: getRegistryAddCommand("citations"),
    docsHref: "/docs/components/pdf-viewer/citations",
    component: CitationsBlock,
  },
  {
    id: "ocr-blocks",
    title: "OCR Blocks",
    description:
      "Structured OCR review with typed blocks, confidence, and page overlays.",
    hideHeader: true,
    command: getRegistryAddCommand("ocr-blocks"),
    docsHref: "/docs/components/pdf-viewer/ocr-blocks",
    component: OcrBlocksBlock,
  },
  {
    id: "e-signature",
    title: "E-Signature",
    description:
      "Signature fields connected to the PDF canvas and signed PDF export.",
    hideHeader: true,
    command: getRegistryAddCommand("e-signature"),
    docsHref: "/docs/components/pdf-viewer/e-signature",
    component: ESignatureBlock,
  },
  {
    id: "human-review",
    title: "Human Review",
    description:
      "Extraction review cards connected to source evidence in the PDF viewer.",
    command: getRegistryAddCommand("human-review"),
    docsHref: "/docs/components/pdf-viewer/human-review",
    component: HumanReviewBlock,
  },
  {
    id: "document-splits",
    title: "Document Splits",
    description:
      "Lazy page thumbnails, draggable split groups, and PDF navigation.",
    command: getRegistryAddCommand("document-splits"),
    docsHref: "/docs/components/pdf-viewer/document-splits",
    component: DocumentSplitsBlock,
  },
  {
    id: "excel-document-splits",
    title: "Excel Document Splits",
    description:
      "Workbook sheets split into draggable groups with thumbnails from the XLSX viewer.",
    command: getRegistryAddCommand("excel-document-splits"),
    docsHref: "/docs/components/xlsx-viewer",
    component: XlsxDocumentSplitsBlock,
  },
]

export function PdfViewerBlocks() {
  return (
    <section className="space-y-12">
      {pdfViewerBlocks.map((block) => (
        <PdfViewerBlockPreview key={block.id} block={block} />
      ))}
    </section>
  )
}

function PdfViewerBlockPreview({
  block,
}: {
  block: (typeof pdfViewerBlocks)[number]
}) {
  const rootRef = React.useRef<HTMLElement | null>(null)
  const [isPreviewVisible, setIsPreviewVisible] = React.useState(false)
  const [previewKey, setPreviewKey] = React.useState(0)
  const Preview = block.component

  React.useEffect(() => {
    const root = rootRef.current
    if (!root || isPreviewVisible) return

    if (!("IntersectionObserver" in window)) {
      setIsPreviewVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsPreviewVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "700px" }
    )

    observer.observe(root)

    return () => observer.disconnect()
  }, [isPreviewVisible])

  return (
    <article ref={rootRef} id={block.id} className="space-y-3">
      <div
        className={[
          "flex flex-col gap-3 sm:flex-row sm:items-end",
          block.hideHeader ? "sm:justify-end" : "sm:justify-between",
        ].join(" ")}
      >
        {block.hideHeader ? null : (
          <div className="min-w-0">
            <h3 className="font-heading text-lg font-medium tracking-tight">
              {block.title}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {block.description}
            </p>
          </div>
        )}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            render={<Link href={block.docsHref} target="_blank" />}
          >
            Open in New Tab
            <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={`Refresh ${block.title} preview`}
            onClick={() => setPreviewKey((value) => value + 1)}
          >
            <HugeiconsIcon icon={Refresh01Icon} className="size-4" />
          </Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border bg-background shadow-xs">
        <div className="flex min-h-11 items-center justify-between gap-3 border-b bg-muted/30 px-3">
          <code className="truncate text-xs text-muted-foreground">
            {block.command}
          </code>
          <div className="hidden text-xs text-muted-foreground sm:block">
            Preview
          </div>
        </div>
        <div className="bg-background">
          {isPreviewVisible ? <Preview key={previewKey} /> : <PreviewLoading />}
        </div>
      </div>
    </article>
  )
}
