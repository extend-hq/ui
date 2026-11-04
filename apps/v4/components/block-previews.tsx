"use client"

import type * as React from "react"
import dynamic from "next/dynamic"

import type { PdfViewerBlockId } from "@/lib/pdf-viewer-blocks"
import { withUiBasePath } from "@/lib/zone-path"

export function BlockPreviewPlaceholder() {
  return <div className="h-full min-h-[560px] bg-muted/20" />
}

type BlockPreviewProps = {
  file?: string
  defaultViewerZoom?: number
  heightClassName?: string
}

const HumanReviewBlock = dynamic<
  BlockPreviewProps & { showExpected?: boolean }
>(
  () =>
    import("@/components/bounding-box-citations-docs").then(
      (mod) => mod.HumanReviewBlock
    ),
  { loading: BlockPreviewPlaceholder }
)

const PdfDropzoneBlock = dynamic<BlockPreviewProps>(
  () =>
    import("@/components/pdf-dropzone-block").then(
      (mod) => mod.PdfDropzoneBlock
    ),
  { loading: BlockPreviewPlaceholder }
)

const OcrBlocksBlock = dynamic<BlockPreviewProps>(
  () =>
    import("@/components/layout-blocks-docs").then((mod) => mod.OcrBlocksBlock),
  { loading: BlockPreviewPlaceholder }
)

const ESignatureBlock = dynamic<BlockPreviewProps>(
  () =>
    import("@/components/e-signature-docs").then((mod) => mod.ESignatureBlock),
  { loading: BlockPreviewPlaceholder }
)

const DocumentSplitsBlock = dynamic<BlockPreviewProps>(
  () =>
    import("@/components/document-splitter-docs").then(
      (mod) => mod.DocumentSplitsBlock
    ),
  { loading: BlockPreviewPlaceholder }
)

const XlsxEditorBlock = dynamic<BlockPreviewProps>(
  () =>
    import("@/registry/new-york-v4/blocks/excel-editor").then(
      (mod) => mod.ExcelEditorBlock
    ),
  { ssr: false, loading: BlockPreviewPlaceholder }
)

const PdfEditorBlock = dynamic<BlockPreviewProps>(
  () =>
    import("@/components/pdf-editor-preview-client").then(
      (mod) => mod.PdfEditorPreviewClient
    ),
  { ssr: false, loading: BlockPreviewPlaceholder }
)

const DocxLayoutBlocks = dynamic<BlockPreviewProps>(
  () =>
    import("@/registry/new-york-v4/blocks/docx-layout-blocks").then(
      (mod) => mod.DocxLayoutBlocks
    ),
  { ssr: false, loading: BlockPreviewPlaceholder }
)

const DocxEditorBlock = dynamic<BlockPreviewProps>(
  () =>
    import("@/components/docx-editor-docs").then((mod) => mod.DocxEditorBlock),
  { loading: BlockPreviewPlaceholder }
)

const FileSystemFinderBlock = dynamic<BlockPreviewProps>(
  () =>
    import("@/components/file-system-docs").then(
      (mod) => mod.FileSystemFinderBlock
    ),
  { loading: BlockPreviewPlaceholder }
)

export const blockPreviews: Record<
  PdfViewerBlockId,
  React.ComponentType<BlockPreviewProps>
> = {
  "bounding-box-citations": (props) => (
    <HumanReviewBlock {...props} showExpected={false} />
  ),
  "pdf-dropzone": PdfDropzoneBlock,
  "layout-blocks": OcrBlocksBlock,
  "e-signature": ESignatureBlock,
  "document-splits": DocumentSplitsBlock,
  "excel-editor": ({ heightClassName = "h-[680px]" }) => (
    <XlsxEditorBlock
      file={withUiBasePath("/samples/crazy-chart-zoo.xlsx")}
      heightClassName={heightClassName}
    />
  ),
  "docx-layout-blocks": () => (
    <DocxLayoutBlocks file={withUiBasePath("/samples/demo.docx")} />
  ),
  "docx-editor-block": DocxEditorBlock,
  "pdf-editor-block": ({ heightClassName = "h-full" }) => (
    <PdfEditorBlock heightClassName={heightClassName} />
  ),
  "file-system": FileSystemFinderBlock,
}
