"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Image from "next/image"

import { cn } from "@/lib/utils"
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

export function MobileRootPreview() {
  return (
    <div className="relative bg-background px-4">
      <Image
        src="/images/root-components-showcase-light-v2.png"
        width={1566}
        height={1114}
        alt="Document component previews"
        className="block h-auto w-[160vw] max-w-none dark:hidden"
        priority
        sizes="150vw"
      />
      <Image
        src="/images/root-components-showcase-dark-v2.png"
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
          <XlsxViewerTile />
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
          <XlsxViewerTile />
          <SchemaBuilderTile />
        </div>
      </div>
    </>
  )
}

function PdfViewerTile() {
  return (
    <ComponentCrop label="PDF Viewer" className="h-[560px] bg-background">
      <PdfViewerPreview
        file="/samples/attention.pdf"
        showRotateControls={false}
      />
    </ComponentCrop>
  )
}

function FileUploadTile() {
  return (
    <ComponentCrop label="File Upload" className="bg-background p-3">
      <FileUpload showFileList={false} />
    </ComponentCrop>
  )
}

function FileThumbnailTile() {
  return (
    <ComponentCrop label="File Thumbnail" className="bg-background">
      <RootFileThumbnailGrid />
    </ComponentCrop>
  )
}

function DocxViewerTile() {
  return (
    <ComponentCrop label="DOCX Viewer" className="h-[560px] bg-background">
      <DocxViewerPreview className="h-full" src="/samples/demo.docx" />
    </ComponentCrop>
  )
}

function XlsxViewerTile() {
  return (
    <ComponentCrop
      label="XLSX Viewer"
      className="h-[540px] bg-background 4xl:h-[500px]"
    >
      <XlsxViewerPreview
        className="h-full"
        src="/samples/crazy-chart-zoo.xlsx"
      />
    </ComponentCrop>
  )
}

function DocumentSplitsTile() {
  const [splits, setSplits] = React.useState<DocumentSplit[]>(INITIAL_SPLITS)

  return (
    <ComponentCrop label="Document Splits" className="h-[500px] bg-background">
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
    <ComponentCrop label="Schema Builder" className="h-[560px] bg-background">
      <SchemaBuilderPanel className="h-full" />
    </ComponentCrop>
  )
}

const ROOT_DOCUMENT_SPLIT_THUMBNAILS = Object.fromEntries(
  INITIAL_SPLITS.flatMap((split) => split.pages).map((pageId) => [
    pageId,
    "/samples/attention-page-1.png",
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
  children,
}: {
  className?: string
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <div className="flex h-8 items-center rounded-t-[inherit] border-b bg-muted/45 px-3 text-xs font-medium text-muted-foreground">
        {label}
      </div>
      <div className={cn("overflow-hidden", className)}>{children}</div>
    </div>
  )
}
