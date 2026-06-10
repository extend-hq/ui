"use client"

import * as React from "react"
import dynamic from "next/dynamic"

import {
  getPdfViewerBlock,
  type PdfViewerBlockId,
} from "@/lib/pdf-viewer-blocks"
import { HumanReviewBlock } from "@/components/bounding-box-citations-docs"
import {
  DocumentSplitsBlock,
  XlsxDocumentSplitsBlock,
} from "@/components/document-splitter-docs"
import { DocxEditorBlock } from "@/components/docx-editor-docs"
import { ESignatureBlock } from "@/components/e-signature-docs"
import { FileSystemFinderBlock } from "@/components/file-system-docs"
import { PdfDropzoneBlock } from "@/components/pdf-dropzone-block"

type PdfViewerBlockFullscreenPreviewProps = {
  defaultViewerZoom?: number
  heightClassName?: string
}

const OcrBlocksBlock = dynamic<PdfViewerBlockFullscreenPreviewProps>(
  () =>
    import("@/components/layout-blocks-docs").then((mod) => mod.OcrBlocksBlock),
  {
    loading: () => <BlockViewPlaceholder />,
  }
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
