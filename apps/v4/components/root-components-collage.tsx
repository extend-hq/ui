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
  }
)

const DocxViewerPreview = dynamic(
  () =>
    import("@/components/ui/docx-viewer").then((mod) => mod.DocxViewerPreview),
  {
    ssr: false,
  }
)

const XlsxViewerPreview = dynamic(
  () =>
    import("@/components/ui/xlsx-viewer").then((mod) => mod.XlsxViewerPreview),
  {
    ssr: false,
  }
)

const FileSystemBlock = dynamic(
  () =>
    import("@/components/file-system-docs").then(
      (mod) => mod.FileSystemFinderBlock
    ),
  {
    ssr: false,
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
          <FileSystemTile />
          <DocxViewerTile />
          <SchemaBuilderTile />
        </div>
      </div>

      <div className="mx-auto hidden items-start gap-4 py-1 lg:grid lg:grid-cols-3">
        <div className="flex flex-col gap-4">
          <PdfViewerTile />
          <DocumentSplitsTile />
        </div>
        <div className="flex flex-col gap-4">
          <FileSystemTile />
          <DocxViewerTile />
        </div>
        <div className="flex flex-col gap-4">
          <ComponentXlsxViewerTile />
          <SchemaBuilderTile />
        </div>
      </div>
    </>
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

function FileSystemTile() {
  return (
    <ComponentCrop
      label="File System"
      viewHref="/docs/components/file-system"
      className="h-[560px] bg-background"
    >
      <FileSystemBlock heightClassName="h-full" />
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

const ROOT_DOCUMENT_SPLIT_THUMBNAILS = Object.fromEntries(
  INITIAL_SPLITS.flatMap((split) => split.pages).map((pageId) => [
    pageId,
    ROOT_ATTENTION_THUMBNAIL_URL,
  ])
) as Record<DocumentSplit["pages"][number], string>

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
