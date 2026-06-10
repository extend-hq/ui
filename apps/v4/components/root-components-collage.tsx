"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { withUiBasePath } from "@/lib/zone-path"
import { Button } from "@/components/ui/button"
import {
  DocumentSplits,
  INITIAL_SPLITS,
  type DocumentSplit,
} from "@/components/ui/document-splits"
import { SchemaBuilderPanel } from "@/components/ui/schema-builder"
import { Spinner } from "@/components/ui/spinner"
import {
  DocumentAwareFileThumbnail,
  getFileKindLabel,
  SAMPLE_FILES,
} from "@/components/file-thumbnail-docs"
import { FileUpload } from "@/components/file-upload-docs"

const ROOT_PREVIEW_LAZY_ROOT_MARGIN = "900px 0px"
const ROOT_ATTENTION_PDF_URL = withUiBasePath("/samples/attention.pdf")
const ROOT_ATTENTION_THUMBNAIL_URL = withUiBasePath(
  "/samples/attention-page-1.png"
)
const ROOT_DOCX_URL = withUiBasePath("/samples/demo.docx")
const ROOT_XLSX_URL = withUiBasePath("/samples/crazy-chart-zoo.xlsx")

const PdfViewerPreview = dynamic(
  () =>
    import("@/components/pdf-viewer-preview-client").then(
      (mod) => mod.PdfViewerPreviewClient
    ),
  {
    ssr: false,
    loading: () => <ViewerPreviewLoading />,
  }
)

const DocxViewerPreview = dynamic(
  () =>
    import("@/components/ui/docx-viewer").then((mod) => mod.DocxViewerPreview),
  {
    ssr: false,
    loading: () => <ViewerPreviewLoading />,
  }
)

const XlsxViewerPreview = dynamic(
  () =>
    import("@/components/ui/xlsx-viewer").then((mod) => mod.XlsxViewerPreview),
  {
    ssr: false,
    loading: () => <ViewerPreviewLoading />,
  }
)

const LayoutBlocksBlock = dynamic(
  () =>
    import("@/components/layout-blocks-docs").then((mod) => mod.OcrBlocksBlock),
  {
    ssr: false,
    loading: () => <ViewerPreviewLoading />,
  }
)

const BoundingBoxCitationsBlock = dynamic(
  () =>
    import("@/components/bounding-box-citations-docs").then(
      (mod) => mod.HumanReviewBlock
    ),
  {
    ssr: false,
    loading: () => <ViewerPreviewLoading />,
  }
)

const DocxEditorBlock = dynamic(
  () =>
    import("@/components/docx-editor-docs").then((mod) => mod.DocxEditorBlock),
  {
    ssr: false,
    loading: () => <ViewerPreviewLoading />,
  }
)

const ESignatureBlock = dynamic(
  () =>
    import("@/components/e-signature-docs").then((mod) => mod.ESignatureBlock),
  {
    ssr: false,
    loading: () => <ViewerPreviewLoading />,
  }
)

export function MobileRootPreview() {
  return (
    <div className="relative bg-background px-4">
      <Image
        src={withUiBasePath("/images/root-components-showcase-light-v2.png")}
        width={1566}
        height={1114}
        alt="Document component previews"
        className="block h-auto w-[160vw] max-w-none dark:hidden"
        priority
        sizes="150vw"
      />
      <Image
        src={withUiBasePath("/images/root-components-showcase-dark-v2.png")}
        width={1566}
        height={1114}
        alt="Document component previews"
        className="hidden w-[160vw] max-w-none dark:block"
        priority
        sizes="150vw"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-background from-15% via-background/85 via-45% to-transparent" />
    </div>
  )
}

export function RootComponentsCollage() {
  return (
    <>
      <div className="mx-auto hidden items-start gap-4 py-1 md:grid md:grid-cols-2 lg:hidden">
        <div className="flex flex-col gap-4">
          <PdfViewerTile />
          <DocumentSplitsTile />
          <ComponentXlsxViewerTile />
        </div>
        <div className="flex flex-col gap-4">
          <FileUploadTile />
          <DocxViewerTile />
          <FileThumbnailTile />
          <SchemaBuilderTile />
        </div>
      </div>

      <div className="mx-auto hidden items-start gap-4 py-1 lg:grid lg:grid-cols-3">
        <div className="flex flex-col gap-4">
          <PdfViewerTile />
          <DocumentSplitsTile />
        </div>
        <div className="flex flex-col gap-4">
          <FileUploadTile />
          <DocxViewerTile />
          <FileThumbnailTile />
        </div>
        <div className="flex flex-col gap-4">
          <ComponentXlsxViewerTile />
          <SchemaBuilderTile />
        </div>
      </div>
    </>
  )
}

export function RootBlocksShowcase() {
  return (
    <div className="flex w-full flex-col gap-12 py-1">
      <LayoutBlocksTile />
      <BoundingBoxCitationsTile />
      <BlockXlsxViewerTile />
      <BlockFileUploadTile />
      <DocxEditorTile />
      <ESignatureTile />
    </div>
  )
}

function PdfViewerTile() {
  return (
    <ComponentCrop
      label="PDF Viewer"
      viewHref="/docs/components/pdf-viewer"
      className="h-[560px] bg-background"
    >
      <PdfViewerPreview
        file={ROOT_ATTENTION_PDF_URL}
        showRotateControls={false}
      />
    </ComponentCrop>
  )
}

function FileUploadTile() {
  return (
    <ComponentCrop
      label="File Upload"
      viewHref="/docs/components/file-upload"
      className="bg-background p-3"
    >
      <FileUpload showFileList={false} />
    </ComponentCrop>
  )
}

function FileThumbnailTile() {
  return (
    <ComponentCrop
      label="File Thumbnail"
      viewHref="/docs/components/file-thumbnail"
      className="bg-background"
    >
      <RootFileThumbnailGrid />
    </ComponentCrop>
  )
}

function DocxViewerTile() {
  return (
    <ComponentCrop
      label="DOCX Viewer"
      viewHref="/docs/components/docx-viewer"
      className="h-[560px] bg-background"
    >
      <DocxViewerPreview className="h-full" src={ROOT_DOCX_URL} />
    </ComponentCrop>
  )
}

function ComponentXlsxViewerTile() {
  return (
    <ComponentCrop
      label="XLSX Viewer"
      viewHref="/docs/components/xlsx-viewer"
      className="h-[540px] bg-background 4xl:h-[500px]"
    >
      <XlsxViewerPreview className="h-full" src={ROOT_XLSX_URL} />
    </ComponentCrop>
  )
}

function DocumentSplitsTile() {
  const [splits, setSplits] = React.useState<DocumentSplit[]>(INITIAL_SPLITS)

  return (
    <ComponentCrop
      label="Document Splits"
      viewHref="/docs/components/document-splits"
      className="h-[500px] bg-background"
    >
      <DocumentSplits
        className="h-full"
        splits={splits}
        thumbnailImages={ROOT_DOCUMENT_SPLIT_THUMBNAILS}
        withFrameDivider={false}
        onSelectPage={() => {}}
        onSplitsChange={setSplits}
      />
    </ComponentCrop>
  )
}

function SchemaBuilderTile() {
  return (
    <ComponentCrop
      label="Schema Builder"
      viewHref="/docs/components/schema-builder"
      className="h-[560px] bg-background"
    >
      <SchemaBuilderPanel className="h-full" />
    </ComponentCrop>
  )
}

function LayoutBlocksTile() {
  return (
    <ComponentCrop
      label="Layout Blocks"
      viewHref="/blocks#layout-blocks"
      className="h-[680px] bg-background"
    >
      <RootPreviewLoader>
        <LayoutBlocksBlock />
      </RootPreviewLoader>
    </ComponentCrop>
  )
}

function BoundingBoxCitationsTile() {
  return (
    <ComponentCrop
      label="Bounding Box Citations"
      viewHref="/blocks#bounding-box-citations"
      className="h-[680px] bg-background"
    >
      <RootPreviewLoader>
        <BoundingBoxCitationsBlock showExpected={false} />
      </RootPreviewLoader>
    </ComponentCrop>
  )
}

function BlockFileUploadTile() {
  return (
    <ComponentCrop
      label="File Upload"
      viewHref="/blocks#pdf-dropzone"
      className="bg-background p-3"
    >
      <RootPreviewLoader>
        <FileUpload showFileList={false} />
      </RootPreviewLoader>
    </ComponentCrop>
  )
}

function DocxEditorTile() {
  return (
    <ComponentCrop
      label="DOCX Editor"
      viewHref="/blocks#docx-editor-block"
      className="h-[680px] bg-background"
    >
      <RootPreviewLoader>
        <DocxEditorBlock />
      </RootPreviewLoader>
    </ComponentCrop>
  )
}

function BlockXlsxViewerTile() {
  return (
    <ComponentCrop
      label="XLSX Viewer"
      viewHref="/blocks#excel-document-splits"
      className="h-[640px] bg-background"
    >
      <RootPreviewLoader>
        <XlsxViewerPreview className="h-full" src={ROOT_XLSX_URL} />
      </RootPreviewLoader>
    </ComponentCrop>
  )
}

function ESignatureTile() {
  return (
    <ComponentCrop
      label="E-Signature"
      viewHref="/blocks#e-signature"
      className="h-[680px] bg-background"
    >
      <RootPreviewLoader>
        <ESignatureBlock />
      </RootPreviewLoader>
    </ComponentCrop>
  )
}

const ROOT_DOCUMENT_SPLIT_THUMBNAILS = Object.fromEntries(
  INITIAL_SPLITS.flatMap((split) => split.pages).map((pageId) => [
    pageId,
    ROOT_ATTENTION_THUMBNAIL_URL,
  ])
) as Record<DocumentSplit["pages"][number], string>

function RootFileThumbnailGrid() {
  return (
    <div className="flex flex-wrap content-start items-start justify-center gap-3 bg-background px-3 py-4">
      {SAMPLE_FILES.map((file) => (
        <div
          key={file.name}
          className="min-w-0 basis-[calc(50%-0.375rem)] space-y-1.5 sm:max-w-[7.5rem]"
        >
          <div className="text-xs font-medium">{getFileKindLabel(file)}</div>
          <DocumentAwareFileThumbnail file={file} className="w-full" />
        </div>
      ))}
    </div>
  )
}

function useLazyRootPreview() {
  const [node, setNode] = React.useState<HTMLDivElement | null>(null)
  const [shouldMountPreview, setShouldMountPreview] = React.useState(false)

  React.useEffect(() => {
    if (shouldMountPreview) return
    if (!node) return

    if (!("IntersectionObserver" in window)) {
      setShouldMountPreview(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return

        setShouldMountPreview(true)
        observer.disconnect()
      },
      { rootMargin: ROOT_PREVIEW_LAZY_ROOT_MARGIN }
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [node, shouldMountPreview])

  return [setNode, shouldMountPreview] as const
}

function RootPreviewLoader({ children }: { children: React.ReactNode }) {
  const [previewRef, shouldMountPreview] = useLazyRootPreview()

  return (
    <div ref={previewRef} className="h-full min-h-0">
      {shouldMountPreview ? children : <ViewerPreviewLoading />}
    </div>
  )
}

function ViewerPreviewLoading() {
  return (
    <div className="grid h-full min-h-52 place-items-center bg-background">
      <Spinner className="size-4" />
    </div>
  )
}

function ComponentCrop({
  className,
  label,
  viewHref,
  children,
}: {
  className?: string
  label: string
  viewHref: string
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <div className="flex h-8 items-center justify-between gap-2 rounded-t-[inherit] border-b bg-muted/45 px-3 text-xs font-medium text-muted-foreground">
        <span className="min-w-0 truncate">{label}</span>
        <Button
          size="xs"
          variant="ghost"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          render={<Link href={viewHref} aria-label={`View ${label}`} />}
        >
          View
          <HugeiconsIcon icon={ArrowRight01Icon} className="size-3" />
        </Button>
      </div>
      <div className={cn("overflow-hidden", className)}>{children}</div>
    </div>
  )
}
