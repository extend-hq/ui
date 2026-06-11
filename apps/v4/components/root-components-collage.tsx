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
import { FileUpload } from "@/components/ui/file-upload"
import { SchemaBuilderPanel } from "@/components/ui/schema-builder"

const ROOT_ATTENTION_PDF_URL = withUiBasePath("/samples/attention.pdf")
const ROOT_ATTENTION_THUMBNAIL_URL = withUiBasePath(
  "/samples/attention-page-1.png"
)
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

// Both responsive grids stay in the DOM so the tile frames paint with the
// server HTML, but CSS only ever shows one. Each viewer parses a real
// document on mount, so the hidden twin grid (and the mobile viewport, which
// shows a static image instead) must not mount the previews — that doubles
// every PDF/DOCX/XLSX parse and rasterization pass.
function useCollageBreakpoint() {
  const [breakpoint, setBreakpoint] = React.useState<"mobile" | "md" | "lg">()

  React.useEffect(() => {
    const mdQuery = window.matchMedia("(min-width: 768px)")
    const lgQuery = window.matchMedia("(min-width: 1024px)")
    const update = () =>
      setBreakpoint(lgQuery.matches ? "lg" : mdQuery.matches ? "md" : "mobile")

    update()
    mdQuery.addEventListener("change", update)
    lgQuery.addEventListener("change", update)
    return () => {
      mdQuery.removeEventListener("change", update)
      lgQuery.removeEventListener("change", update)
    }
  }, [])

  return breakpoint
}

export function RootComponentsCollage() {
  const breakpoint = useCollageBreakpoint()

  return (
    <>
      <div className="mx-auto hidden items-start gap-4 py-1 md:grid md:grid-cols-2 lg:hidden">
        <div className="flex flex-col gap-4">
          <PdfViewerTile mountPreview={breakpoint === "md"} />
          <DocumentSplitsTile mountPreview={breakpoint === "md"} />
          <ComponentXlsxViewerTile mountPreview={breakpoint === "md"} />
        </div>
        <div className="flex flex-col gap-4">
          <FileSystemTile mountPreview={breakpoint === "md"} />
          <FileUploadTile mountPreview={breakpoint === "md"} />
          <SchemaBuilderTile mountPreview={breakpoint === "md"} />
        </div>
      </div>

      <div className="mx-auto hidden items-start gap-4 py-1 lg:grid lg:grid-cols-3">
        <div className="flex flex-col gap-4">
          <PdfViewerTile mountPreview={breakpoint === "lg"} />
          <DocumentSplitsTile mountPreview={breakpoint === "lg"} />
        </div>
        <div className="flex flex-col gap-4">
          <FileSystemTile mountPreview={breakpoint === "lg"} />
          <FileUploadTile mountPreview={breakpoint === "lg"} />
        </div>
        <div className="flex flex-col gap-4">
          <ComponentXlsxViewerTile mountPreview={breakpoint === "lg"} />
          <SchemaBuilderTile mountPreview={breakpoint === "lg"} />
        </div>
      </div>
    </>
  )
}

type TileProps = {
  mountPreview: boolean
}

function PdfViewerTile({ mountPreview }: TileProps) {
  return (
    <ComponentCrop
      label="PDF Viewer"
      viewHref="/docs/components/pdf-viewer"
      className="h-[560px] bg-background"
    >
      {mountPreview && (
        <PdfViewerPreview
          file={ROOT_ATTENTION_PDF_URL}
          showRotateControls={false}
        />
      )}
    </ComponentCrop>
  )
}

function FileSystemTile({ mountPreview }: TileProps) {
  return (
    <ComponentCrop
      label="File System"
      viewHref="/docs/components/file-system"
      className="h-[560px] bg-background"
    >
      {mountPreview && (
        <FileSystemBlock defaultView="gallery" heightClassName="h-full" />
      )}
    </ComponentCrop>
  )
}

function FileUploadTile({ mountPreview }: TileProps) {
  return (
    <ComponentCrop
      label="File Upload"
      viewHref="/docs/components/file-upload"
      className="grid h-[360px] place-items-center bg-background p-4"
    >
      {mountPreview && <FileUpload className="w-full max-w-xl" />}
    </ComponentCrop>
  )
}

function ComponentXlsxViewerTile({ mountPreview }: TileProps) {
  return (
    <ComponentCrop
      label="XLSX Viewer"
      viewHref="/docs/components/xlsx-viewer"
      className="h-[540px] bg-background 4xl:h-[500px]"
    >
      {mountPreview && (
        <XlsxViewerPreview className="h-full" src={ROOT_XLSX_URL} />
      )}
    </ComponentCrop>
  )
}

function DocumentSplitsTile({ mountPreview }: TileProps) {
  const [splits, setSplits] = React.useState<DocumentSplit[]>(INITIAL_SPLITS)

  return (
    <ComponentCrop
      label="Document Splits"
      viewHref="/docs/components/document-splits"
      className="h-[500px] bg-background"
    >
      {mountPreview && (
        <DocumentSplits
          className="h-full"
          splits={splits}
          thumbnailImages={ROOT_DOCUMENT_SPLIT_THUMBNAILS}
          withFrameDivider={false}
          onSelectPage={() => {}}
          onSplitsChange={setSplits}
        />
      )}
    </ComponentCrop>
  )
}

function SchemaBuilderTile({ mountPreview }: TileProps) {
  return (
    <ComponentCrop
      label="Schema Builder"
      viewHref="/docs/components/schema-builder"
      className="h-[560px] bg-background"
    >
      {mountPreview && <SchemaBuilderPanel className="h-full" />}
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
