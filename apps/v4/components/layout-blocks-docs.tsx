"use client"

import dynamic from "next/dynamic"

import { withUiBasePath } from "@/lib/zone-path"
import {
  ATTENTION_OCR_OUTPUT,
  getOcrBlocks,
  OcrBlocksPanel,
  PDF_URL,
  renderOcrBlockText,
  type ParsedOcrOutput,
} from "@/components/extend/layout-blocks"
import {
  LayoutBlocksPanel,
  type LayoutBlockItem,
} from "@/components/extend/layout-blocks-panel"
import { OcrBlocksBlock as PdfLayoutBlocks } from "@/registry/new-york-v4/blocks/layout-blocks-block"

const DocsViewCodeBlock = dynamic(() =>
  import("@/components/docs-code-block").then((mod) => mod.DocsViewCodeBlock)
)

export function OcrBlocks() {
  return (
    <OcrBlocksPanel
      blocks={getOcrBlocks(ATTENTION_OCR_OUTPUT).filter(
        (block) => block.page === 1
      )}
    />
  )
}

export function OcrBlocksBlock({
  file = withUiBasePath(PDF_URL),
  defaultViewerZoom,
  output,
}: {
  file?: string
  defaultViewerZoom?: number
  output?: ParsedOcrOutput
}) {
  return (
    <PdfLayoutBlocks
      autoSaveId="pdf-block-layout-blocks"
      file={file}
      defaultViewerZoom={defaultViewerZoom}
      output={output}
    />
  )
}

const exampleBlocks: LayoutBlockItem[] = [
  {
    id: "heading",
    type: "heading",
    page: 1,
    confidence: 0.99,
    text: "# Attention Is All You Need",
  },
  {
    id: "paragraph",
    type: "paragraph",
    page: 1,
    confidence: 0.94,
    text: "The model relies **only on attention**, avoiding recurrence and convolutions.",
  },
  {
    id: "table",
    type: "table",
    page: 6,
    confidence: 0.91,
    text: "- **Layer type**\n- Path length\n- Sequential operations",
  },
]

export function OcrBlocksDemo() {
  return (
    <div
      data-slot="component-preview"
      className="group relative mt-4 mb-12 flex flex-col overflow-hidden rounded-xl border"
    >
      <LayoutBlocksPanel
        blocks={exampleBlocks}
        renderText={renderOcrBlockText}
      />
      <DocsViewCodeBlock code={ocrBlocksUsageCode} />
    </div>
  )
}

const ocrBlocksUsageCode = `"use client";

import { OcrBlocks } from "@/components/extend/layout-blocks";

export function OcrBlocksExample() {
  return <OcrBlocks />;
}`
