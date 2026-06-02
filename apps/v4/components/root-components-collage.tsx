"use client"

import type * as React from "react"
import dynamic from "next/dynamic"
import Image from "next/image"

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
    <div className="mx-auto columns-2 gap-4 py-1 lg:columns-3">
      <div className="mb-4 break-inside-avoid">
        <PdfViewerTile />
      </div>
      <div className="mb-4 break-inside-avoid">
        <CsvViewerTile />
      </div>
      <div className="mb-4 break-inside-avoid">
        <FileUploadTile />
      </div>
      <div className="mb-4 break-inside-avoid">
        <FileThumbnailTile />
      </div>
      <div className="mb-4 break-inside-avoid">
        <DocxViewerTile />
      </div>
      <div className="mb-4 break-inside-avoid">
        <XlsxViewerTile />
      </div>
      <div className="mb-4 break-inside-avoid">
        <OcrBlocksTile />
      </div>
    </div>
  )
}

function PdfViewerTile() {
  return (
    <ComponentCrop className="h-[560px] border bg-background">
      <PdfViewerPreview showRotateControls={false} />
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
  return <FileUpload showFileList={false} />
}

function FileThumbnailTile() {
  return (
    <ComponentCrop className="border bg-background">
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
