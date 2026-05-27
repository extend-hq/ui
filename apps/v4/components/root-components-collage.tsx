"use client"

import type * as React from "react"
import dynamic from "next/dynamic"
import {
  Loading03Icon,
  MinusSignCircleIcon,
  PlusSignCircleIcon,
  RotateClockwiseIcon,
  Search01Icon,
  SidebarLeftIcon,
  Upload01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { CsvViewerPreviewClient } from "@/components/csv-viewer-docs"
import {
  DocumentAwareFileThumbnail,
  getFileKindLabel,
  SAMPLE_FILES,
} from "@/components/file-thumbnail-docs"
import { FileUpload } from "@/components/file-upload-docs"
import { OcrBlocks } from "@/components/ocr-blocks-docs"
import { Separator } from "@/registry/new-york-v4/ui/separator"

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
      <RootPdfPreview />
    </ComponentCrop>
  )
}

export function RootComponentsCollage() {
  return (
    <div className="mx-auto grid gap-4 py-1 md:grid-cols-2 lg:grid-cols-3">
      <div className="flex flex-col gap-4">
        <ComponentCrop className="h-[560px] border bg-background">
          <RootPdfPreview />
        </ComponentCrop>
        <ComponentCrop className="h-[400px] border bg-background">
          <CsvViewerPreviewClient />
        </ComponentCrop>
      </div>
      <div className="flex flex-col gap-4">
        <ComponentCrop className="h-[280px]">
          <FileUpload className="p-4" />
        </ComponentCrop>
        <ComponentCrop className="h-[540px] border bg-background">
          <RootFileThumbnailGrid />
        </ComponentCrop>
        <ComponentCrop className="h-[560px] border bg-background">
          <DocxViewerPreview className="h-full" src="/samples/demo.docx" />
        </ComponentCrop>
      </div>
      <div className="flex flex-col gap-4">
        <ComponentCrop className="h-[560px] border bg-background">
          <XlsxViewerPreview
            className="h-full"
            src="/samples/crazy-chart-zoo.xlsx"
          />
        </ComponentCrop>
        <ComponentCrop className="h-[430px]">
          <OcrBlocks />
        </ComponentCrop>
      </div>
    </div>
  )
}

function RootFileThumbnailGrid() {
  return (
    <div className="grid h-full gap-4 bg-background p-4 sm:grid-cols-2">
      {SAMPLE_FILES.map((file, index) => (
        <div key={file.url} className="min-w-0 space-y-2">
          <div className="text-sm font-medium">{getFileKindLabel(file)}</div>
          <DocumentAwareFileThumbnail
            file={file}
            generationDelayMs={250 + index * 220}
            className="w-full"
          />
        </div>
      ))}
    </div>
  )
}

function ViewerPreviewLoading() {
  return (
    <div className="grid h-full min-h-52 place-items-center bg-background">
      <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
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

function RootPdfPreview() {
  return (
    <div
      data-slot="pdf-viewer"
      className="flex h-[560px] w-full flex-col overflow-hidden bg-background [overflow-anchor:none]"
    >
      <div className="flex min-h-12 items-center justify-between gap-3 border-b px-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Toggle thumbnails"
            disabled
          >
            <HugeiconsIcon icon={SidebarLeftIcon} className="size-4" />
          </Button>
          <div className="text-sm whitespace-nowrap text-primary">
            Page 1 of 15
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Rotate counterclockwise"
            disabled
          >
            <HugeiconsIcon
              icon={RotateClockwiseIcon}
              className="size-4 -scale-x-100"
            />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Rotate clockwise"
            disabled
          >
            <HugeiconsIcon icon={RotateClockwiseIcon} className="size-4" />
          </Button>
          <Separator orientation="vertical" className="mx-1 h-4 self-center" />
          <Button variant="ghost" size="icon-sm" aria-label="Zoom out" disabled>
            <HugeiconsIcon icon={MinusSignCircleIcon} className="size-4" />
          </Button>
          <div className="hidden h-8 w-[84px] items-center justify-center rounded-md border bg-background text-sm sm:flex">
            75%
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Zoom in" disabled>
            <HugeiconsIcon icon={PlusSignCircleIcon} className="size-4" />
          </Button>
          <Separator orientation="vertical" className="mx-1 h-4 self-center" />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Search text"
            disabled
          >
            <HugeiconsIcon icon={Search01Icon} className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Upload PDF"
            disabled
          >
            <HugeiconsIcon icon={Upload01Icon} className="size-4" />
          </Button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 bg-muted/30">
        <div className="absolute inset-0 grid place-items-center text-muted-foreground">
          <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
        </div>
        <iframe
          src="/samples/attention.pdf#toolbar=0&navpanes=0&scrollbar=0"
          title="Attention PDF preview"
          className="relative z-10 size-full border-0 bg-background"
        />
      </div>
    </div>
  )
}
