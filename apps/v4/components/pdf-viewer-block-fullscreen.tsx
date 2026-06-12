"use client"

import * as React from "react"
import dynamic from "next/dynamic"

import {
  getPdfViewerBlock,
  type PdfViewerBlockId,
} from "@/lib/pdf-viewer-blocks"

type PdfViewerBlockFullscreenPreviewProps = {
  defaultViewerZoom?: number
  heightClassName?: string
}

// Every preview is a dynamic chunk so each fullscreen page only loads the
// block it renders instead of bundling all of them.
const HumanReviewBlock = dynamic<
  PdfViewerBlockFullscreenPreviewProps & { showExpected?: boolean }
>(
  () =>
    import("@/components/bounding-box-citations-docs").then(
      (mod) => mod.HumanReviewBlock
    ),
  { loading: () => <BlockViewPlaceholder /> }
)

const PdfDropzoneBlock = dynamic<PdfViewerBlockFullscreenPreviewProps>(
  () =>
    import("@/components/pdf-dropzone-block").then(
      (mod) => mod.PdfDropzoneBlock
    ),
  { loading: () => <BlockViewPlaceholder /> }
)

const OcrBlocksBlock = dynamic<PdfViewerBlockFullscreenPreviewProps>(
  () =>
    import("@/components/layout-blocks-docs").then((mod) => mod.OcrBlocksBlock),
  { loading: () => <BlockViewPlaceholder /> }
)

const ESignatureBlock = dynamic<PdfViewerBlockFullscreenPreviewProps>(
  () =>
    import("@/components/e-signature-docs").then((mod) => mod.ESignatureBlock),
  { loading: () => <BlockViewPlaceholder /> }
)

const DocumentSplitsBlock = dynamic<PdfViewerBlockFullscreenPreviewProps>(
  () =>
    import("@/components/document-splitter-docs").then(
      (mod) => mod.DocumentSplitsBlock
    ),
  { loading: () => <BlockViewPlaceholder /> }
)

const XlsxDocumentSplitsBlock = dynamic<PdfViewerBlockFullscreenPreviewProps>(
  () =>
    import("@/components/document-splitter-docs").then(
      (mod) => mod.XlsxDocumentSplitsBlock
    ),
  { loading: () => <BlockViewPlaceholder /> }
)

const DocxEditorBlock = dynamic<PdfViewerBlockFullscreenPreviewProps>(
  () =>
    import("@/components/docx-editor-docs").then((mod) => mod.DocxEditorBlock),
  { loading: () => <BlockViewPlaceholder /> }
)

const FileSystemFinderBlock = dynamic<PdfViewerBlockFullscreenPreviewProps>(
  () =>
    import("@/components/file-system-docs").then(
      (mod) => mod.FileSystemFinderBlock
    ),
  { loading: () => <BlockViewPlaceholder /> }
)

const blockComponents = {
  "bounding-box-citations": (props: PdfViewerBlockFullscreenPreviewProps) => (
    <HumanReviewBlock {...props} showExpected={false} />
  ),
  "pdf-dropzone": PdfDropzoneBlock,
  "layout-blocks": OcrBlocksBlock,
  "e-signature": ESignatureBlock,
  "document-splits": DocumentSplitsBlock,
  "excel-document-splits": XlsxDocumentSplitsBlock,
  "docx-editor-block": DocxEditorBlock,
  "file-system": FileSystemFinderBlock,
} satisfies Record<
  PdfViewerBlockId,
  React.ComponentType<PdfViewerBlockFullscreenPreviewProps>
>

function BlockViewPlaceholder() {
  return <div className="h-dvh bg-muted/20" />
}

export function PdfViewerBlockFullscreen({ blockId }: { blockId: string }) {
  const block = getPdfViewerBlock(blockId)

  if (!block) return null

  const Preview = blockComponents[block.id]

  return (
    <main className="h-dvh min-h-0 overflow-hidden bg-background [&>*]:h-full [&>*]:min-h-0">
      <Preview key={block.id} defaultViewerZoom={1} heightClassName="h-full" />
    </main>
  )
}
