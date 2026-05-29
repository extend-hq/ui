"use client"

import type * as React from "react"
import dynamic from "next/dynamic"

import { useMediaQuery } from "@/hooks/use-media-query"
import { Spinner } from "@/components/ui/spinner"
import { CsvViewerPreviewClient } from "@/components/csv-viewer-docs"
import {
  DocumentAwareFileThumbnail,
  getFileKindLabel,
  SAMPLE_FILES,
} from "@/components/file-thumbnail-docs"
import { FileUpload } from "@/components/file-upload-docs"
import { OcrBlocks } from "@/components/ocr-blocks-docs"

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
    <ComponentCrop className="h-[560px] border bg-background">
      <PdfViewerPreview />
    </ComponentCrop>
  )
}

export function RootComponentsCollage() {
  const isLargeLayout = useMediaQuery("lg")

  if (!isLargeLayout) {
    return (
      <div className="mx-auto grid gap-4 py-1 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <PdfViewerTile />
          <CsvViewerTile />
          <XlsxViewerTile />
        </div>
        <div className="flex flex-col gap-4">
          <FileUploadTile />
          <FileThumbnailTile />
          <DocxViewerTile />
          <OcrBlocksTile />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto grid gap-4 py-1 lg:grid-cols-3">
      <div className="flex flex-col gap-4">
        <PdfViewerTile />
        <CsvViewerTile />
      </div>
      <div className="flex flex-col gap-4">
        <FileUploadTile />
        <FileThumbnailTile />
        <DocxViewerTile />
      </div>
      <div className="flex flex-col gap-4">
        <XlsxViewerTile />
        <OcrBlocksTile />
      </div>
    </div>
  )
}

function PdfViewerTile() {
  return (
    <ComponentCrop className="h-[560px] border bg-background">
      <PdfViewerPreview />
    </ComponentCrop>
  )
}

function CsvViewerTile() {
  return (
    <ComponentCrop className="h-[400px] border bg-background">
      <CsvViewerPreviewClient />
    </ComponentCrop>
  )
}

function FileUploadTile() {
  return (
    <ComponentCrop className="h-[280px]">
      <FileUpload
        className="h-full [&>label]:h-full [&>label]:min-h-0 [&>label]:rounded-lg"
        showBorderBeam={false}
      />
    </ComponentCrop>
  )
}

function FileThumbnailTile() {
  return (
    <ComponentCrop className="h-[340px] border bg-background">
      <RootFileThumbnailGrid />
    </ComponentCrop>
  )
}

function DocxViewerTile() {
  return (
    <ComponentCrop className="h-[560px] border bg-background">
      <DocxViewerPreview className="h-full" src="/samples/demo.docx" />
    </ComponentCrop>
  )
}

function XlsxViewerTile() {
  return (
    <ComponentCrop className="h-[560px] border bg-background">
      <XlsxViewerPreview
        className="h-full"
        src="/samples/crazy-chart-zoo.xlsx"
      />
    </ComponentCrop>
  )
}

function OcrBlocksTile() {
  return (
    <ComponentCrop className="h-[430px]">
      <OcrBlocks />
    </ComponentCrop>
  )
}

function RootFileThumbnailGrid() {
  return (
    <div className="flex h-full flex-wrap content-start items-start justify-center gap-3 bg-background px-3 py-1.5">
      {SAMPLE_FILES.map((file, index) => (
        <div
          key={file.url}
          className="min-w-0 basis-[calc(50%-0.375rem)] space-y-1.5 sm:max-w-[7.5rem]"
        >
          <div className="text-xs font-medium">{getFileKindLabel(file)}</div>
          <DocumentAwareFileThumbnail
            file={file}
            generationDelayMs={250 + index * 220}
            className="w-full"
            thumbnailWidth={260}
          />
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
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={["overflow-hidden rounded-lg", className].join(" ")}>
      {children}
    </div>
  )
}
