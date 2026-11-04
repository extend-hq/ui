"use client"

import * as React from "react"
import {
  DocxBlockHighlights,
  extractDocumentBlocks,
  flattenDocumentBlocks,
  revealDocxSource,
  type DocumentBlock,
} from "@extend-ai/react-docx"

import {
  DocxViewerPreview,
  type DocxViewerLayoutProps,
} from "@/components/extend/docx-viewer"
import {
  LayoutBlocksPanel,
  layoutBlockStyles,
  type LayoutBlockItem,
} from "@/components/extend/layout-blocks-panel"
import { PdfBlockResizableShell } from "@/components/extend/pdf-block-resizable-shell"

const blockTypes = {
  text: { type: "paragraph" },
  heading: { type: "heading" },
  section_heading: { type: "heading", label: "Section heading" },
  figure: { type: "figure" },
  table: { type: "table" },
  table_head: { type: "table", label: "Table header" },
  table_cell: { type: "table", label: "Table cell" },
  key_value: { type: "paragraph", label: "Key-value pair" },
  page_number: { type: "page_number" },
  barcode: { type: "figure", label: "Barcode" },
  formula: { type: "paragraph", label: "Formula" },
  header: { type: "header" },
  footer: { type: "footer" },
  watermark: { type: "figure", label: "Watermark" },
  legend: { type: "paragraph", label: "Legend" },
} satisfies Record<
  DocumentBlock["type"],
  Pick<LayoutBlockItem, "type" | "label">
>

function presentation(
  block: DocumentBlock
): Pick<LayoutBlockItem, "type" | "label"> {
  return block.type === "text" && block.details.numbering
    ? { type: "list" }
    : blockTypes[block.type]
}

function blockColor(block: DocumentBlock) {
  return layoutBlockStyles[presentation(block).type].color
}

function BlockLayout({
  children,
  model,
  viewportRef,
  isLoading,
  loadError,
}: DocxViewerLayoutProps) {
  const [result, setResult] = React.useState<{
    model: NonNullable<typeof model>
    blocks: DocumentBlock[]
    error?: string
  }>()
  const [selectedId, setSelectedId] = React.useState<string>()
  const [previewId, setPreviewId] = React.useState<string>()

  React.useEffect(() => {
    if (!model) return
    let current = true
    void extractDocumentBlocks(model).then(
      (output) => {
        if (current)
          setResult({ model, blocks: flattenDocumentBlocks(output.blocks) })
      },
      (error: unknown) => {
        if (current)
          setResult({
            model,
            blocks: [],
            error:
              error instanceof Error
                ? error.message
                : "Unable to read layout blocks.",
          })
      }
    )
    return () => {
      current = false
    }
  }, [model])

  const parsed = result?.model === model ? result : undefined
  const blocks = parsed?.blocks
  const rows = React.useMemo(
    () =>
      blocks?.map((block) => ({
        ...presentation(block),
        id: block.id,
        text: block.content,
        block,
      })) ?? [],
    [blocks]
  )
  const active =
    blocks?.find((block) => block.id === (previewId ?? selectedId)) ??
    blocks?.[0]
  const message =
    loadError ||
    parsed?.error ||
    (isLoading || (model && !parsed)
      ? "Reading layout blocks…"
      : !model
        ? "Open a DOCX to inspect its layout blocks."
        : "No layout blocks found.")

  return (
    <PdfBlockResizableShell
      autoSaveId="docx-layout-blocks-panels"
      heightClassName="h-[720px]"
      left={
        <>
          {children}
          {blocks?.length ? (
            <DocxBlockHighlights
              rootRef={viewportRef}
              blocks={blocks}
              block={active}
              colorForBlock={blockColor}
            />
          ) : null}
        </>
      }
      right={
        <LayoutBlocksPanel
          heading="Layout blocks"
          ariaLabel="DOCX layout blocks"
          className="h-full"
          blocks={rows}
          activeBlockId={active?.id}
          emptyMessage={message}
          onBlockFocus={(row) => setPreviewId(row.id)}
          onBlockBlur={() => setPreviewId(undefined)}
          onBlockSelect={({ block }) => {
            setSelectedId(block.id)
            const source = block.sourceRefs[0]
            if (viewportRef.current && source)
              revealDocxSource(viewportRef.current, source)
          }}
        />
      }
    />
  )
}

export function DocxLayoutBlocks({ file }: { file?: string }) {
  const [isDark, setIsDark] = React.useState(false)
  return (
    <DocxViewerPreview
      src={file}
      className="h-full"
      defaultZoom="fit-width"
      layout={BlockLayout}
      isDark={isDark}
      onIsDarkChange={setIsDark}
    />
  )
}
