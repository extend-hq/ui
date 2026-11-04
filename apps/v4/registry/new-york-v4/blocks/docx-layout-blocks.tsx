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
  const [activeId, setActiveId] = React.useState<string>()
  const pendingReveal = React.useRef<DocumentBlock | null>(null)

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
      pendingReveal.current = null
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
  const active = blocks?.find((block) => block.id === activeId) ?? blocks?.[0]

  const scrollToMountedBlock = React.useCallback(() => {
    const block = pendingReveal.current
    const viewport = viewportRef.current
    const source = block?.sourceRefs[0]
    if (!viewport || !block || !source) return

    const target =
      viewport.querySelector(
        `[data-docx-block-highlight="${CSS.escape(block.id)}"]`
      ) ??
      viewport.querySelector(
        `[data-docx-source-id="${CSS.escape(source.nodeId)}"]`
      )
    if (!target) return

    pendingReveal.current = null
    const bounds = target.getBoundingClientRect()
    const frame = viewport.getBoundingClientRect()
    viewport.scrollBy({
      top: bounds.top - frame.top - viewport.clientHeight / 4,
      left:
        bounds.left < frame.left || bounds.right > frame.right
          ? bounds.left - frame.left
          : 0,
      behavior: "instant",
    })
  }, [viewportRef])

  function focusBlock({ block }: { block: DocumentBlock }) {
    setActiveId(block.id)
    pendingReveal.current = block
    scrollToMountedBlock()

    // Ask the viewer to mount the source page. Its next geometry update finishes the scroll.
    const source = pendingReveal.current?.sourceRefs[0]
    if (source && viewportRef.current)
      revealDocxSource(viewportRef.current, source.nodeId)
  }

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
              onGeometry={scrollToMountedBlock}
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
          onBlockFocus={focusBlock}
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
