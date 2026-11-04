"use client"

import { getPdfViewerBlock } from "@/lib/pdf-viewer-blocks"
import { blockPreviews } from "@/components/block-previews"

export function PdfViewerBlockFullscreen({ blockId }: { blockId: string }) {
  const block = getPdfViewerBlock(blockId)

  if (!block) return null

  const Preview = blockPreviews[block.id]

  return (
    <main className="h-dvh min-h-0 overflow-hidden bg-background [&>*]:h-full [&>*]:min-h-0">
      <Preview key={block.id} defaultViewerZoom={1} heightClassName="h-full" />
    </main>
  )
}
