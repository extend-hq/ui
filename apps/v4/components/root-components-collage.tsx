"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn, withBasePath } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

const ROOT_PREVIEW_LAZY_ROOT_MARGIN = "900px 0px"

const LayoutBlocksBlock = dynamic(
  () =>
    import("@/components/ocr-blocks-docs").then((mod) => mod.OcrBlocksBlock),
  {
    ssr: false,
    loading: () => <ViewerPreviewLoading />,
  }
)

const BoundingBoxCitationsBlock = dynamic(
  () =>
    import("@/components/human-review-docs").then(
      (mod) => mod.HumanReviewBlock
    ),
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

const FileUpload = dynamic(
  () => import("@/components/file-upload-docs").then((mod) => mod.FileUpload),
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
        src={withBasePath("/images/root-components-showcase-light-v2.png")}
        width={1566}
        height={1114}
        alt="Document component previews"
        className="block h-auto w-[160vw] max-w-none dark:hidden"
        priority
        sizes="150vw"
      />
      <Image
        src={withBasePath("/images/root-components-showcase-dark-v2.png")}
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
    <div className="flex w-full flex-col gap-12 py-1">
      {/*
        Previous collage layout is intentionally paused for now. This ordered
        showcase mirrors the blocks/components sequence requested for the
        landing page.
      */}
      <LayoutBlocksTile />
      <BoundingBoxCitationsTile />
      <XlsxViewerTile />
      <FileUploadTile />
      <DocxEditorTile />
      <ESignatureTile />
    </div>
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

function FileUploadTile() {
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

function XlsxViewerTile() {
  return (
    <ComponentCrop
      label="XLSX Viewer"
      viewHref="/blocks#excel-document-splits"
      className="h-[640px] bg-background"
    >
      <RootPreviewLoader>
        <XlsxViewerPreview
          className="h-full"
          src={withBasePath("/samples/crazy-chart-zoo.xlsx")}
        />
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
