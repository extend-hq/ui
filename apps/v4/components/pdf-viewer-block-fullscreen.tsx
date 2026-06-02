"use client"

import * as React from "react"
import dynamic from "next/dynamic"

import {
  getPdfViewerBlock,
  type PdfViewerBlockId,
} from "@/lib/pdf-viewer-blocks"
import {
  DocumentSplitsBlock,
  XlsxDocumentSplitsBlock,
} from "@/components/document-splitter-docs"
import { DocxEditorBlock } from "@/components/docx-editor-docs"
import { ESignatureBlock } from "@/components/e-signature-docs"
import { HumanReviewBlock } from "@/components/human-review-docs"
import { PdfDropzoneBlock } from "@/components/pdf-dropzone-block"

const OcrBlocksBlock = dynamic(
  () =>
    import("@/components/ocr-blocks-docs").then((mod) => mod.OcrBlocksBlock),
  {
    loading: () => <BlockViewPlaceholder />,
  }
)

const blockComponents = {
  "human-review": HumanReviewBlock,
  "pdf-dropzone": PdfDropzoneBlock,
  "ocr-blocks": OcrBlocksBlock,
  "e-signature": ESignatureBlock,
  "document-splits": DocumentSplitsBlock,
  "excel-document-splits": XlsxDocumentSplitsBlock,
  "docx-editor-block": DocxEditorBlock,
} satisfies Record<PdfViewerBlockId, React.ComponentType>

function BlockViewPlaceholder() {
  return <div className="h-dvh bg-muted/20" />
}

export function PdfViewerBlockFullscreen({ blockId }: { blockId: string }) {
  const block = getPdfViewerBlock(blockId)

  if (!block) return null

  const Preview = blockComponents[block.id]

  return (
    <main className="h-dvh min-h-0 overflow-hidden bg-background [&>*]:h-full [&>*]:min-h-0">
      <Preview />
    </main>
  )
}
