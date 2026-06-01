"use client"

import * as React from "react"

import { PDFViewer, type PDFViewerHandle } from "@/components/ui/pdf-viewer"
import { PdfBlockResizableShell } from "@/components/pdf-block-resizable-shell"

import {
  ATTENTION_OCR_OUTPUT,
  blockToArea,
  getOcrBlocks,
  OcrBlockOverlay,
  OcrBlocksPanel,
  PDF_URL,
  type OcrBlock,
  type ParsedOcrOutput,
} from "@/components/ui/ocr-blocks"

export function OcrBlocksBlock({
  file = PDF_URL,
  output = ATTENTION_OCR_OUTPUT,
}: {
  file?: string
  output?: ParsedOcrOutput
}) {
  const blocks = React.useMemo(() => getOcrBlocks(output), [output])
  const [activeBlockId, setActiveBlockId] = React.useState(blocks[0]?.id)
  const viewerRef = React.useRef<PDFViewerHandle>(null)
  const activeBlock = blocks.find((block) => block.id === activeBlockId)

  React.useEffect(() => {
    if (!blocks.length || blocks.some((block) => block.id === activeBlockId)) {
      return
    }

    setActiveBlockId(blocks[0].id)
  }, [activeBlockId, blocks])

  const focusBlock = React.useCallback((block: OcrBlock) => {
    const area = blockToArea(block)

    setActiveBlockId(block.id)
    viewerRef.current?.scrollToPageArea(block.page, {
      left: Number.parseFloat(String(area.left)),
      top: Number.parseFloat(String(area.top)),
      width: Number.parseFloat(String(area.width)),
      height: Number.parseFloat(String(area.height)),
    })
  }, [])

  return (
    <PdfBlockResizableShell
      autoSaveId="pdf-block-ocr"
      left={
        <PDFViewer
          ref={viewerRef}
          file={file}
          defaultZoom={0.75}
          renderPageOverlay={({ pageNumber }) =>
            blocks
              .filter((block) => block.page === pageNumber)
              .map((block) => (
                <OcrBlockOverlay
                  key={block.id}
                  block={block}
                  isActive={block.id === activeBlock?.id}
                />
              ))
          }
        />
      }
      right={
        <OcrBlocksPanel
          activeBlockId={activeBlock?.id}
          blocks={blocks}
          className="h-full"
          onBlockFocus={focusBlock}
        />
      }
    />
  )
}
