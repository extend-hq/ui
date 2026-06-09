type PdfViewerBlockConfig = {
  id: string
  title: string
  badge?: string
  description: string
  command: string
  docsHref: string
  viewHref: string
  hideHeader?: boolean
  previewHeightClassName?: string
}

function getRegistryAddCommand(name: string) {
  return `pnpm dlx shadcn@latest add @extend/${name}`
}

export const PDF_VIEWER_BLOCKS = [
  {
    id: "layout-blocks",
    title: "Layout Blocks",
    description:
      "Structured layout review with typed blocks, confidence, and page overlays.",
    hideHeader: true,
    command: getRegistryAddCommand("layout-blocks-block"),
    docsHref: "/docs/components/layout-blocks",
    viewHref: "/view/blocks/layout-blocks",
  },
  {
    id: "bounding-box-citations",
    title: "Bounding Box Citations",
    description:
      "Extraction citations connected to source bounding boxes in the PDF viewer.",
    command: getRegistryAddCommand("bounding-box-citations-block"),
    docsHref: "/docs/components/bounding-box-citations",
    viewHref: "/view/blocks/bounding-box-citations",
  },
  {
    id: "pdf-dropzone",
    title: "PDF Dropzone",
    description:
      "A PDF-only upload dropzone that opens the dropped file in the shared viewer.",
    command: getRegistryAddCommand("pdf-dropzone"),
    docsHref: "/docs/components/file-upload",
    viewHref: "/view/blocks/pdf-dropzone",
  },
  {
    id: "e-signature",
    title: "E-Signature",
    description:
      "Signature fields connected to the PDF canvas and signed PDF export.",
    hideHeader: true,
    command: getRegistryAddCommand("e-signature"),
    docsHref: "/docs/components/e-signature",
    viewHref: "/view/blocks/e-signature",
  },
  {
    id: "document-splits",
    title: "Document Splits",
    description:
      "Lazy page thumbnails, draggable split groups, and PDF navigation.",
    command: getRegistryAddCommand("document-splits-block"),
    docsHref: "/docs/components/document-splits",
    viewHref: "/view/blocks/document-splits",
  },
  {
    id: "excel-document-splits",
    title: "Excel Document Splits",
    description:
      "Workbook sheets split into draggable groups with thumbnails from the XLSX viewer.",
    command: getRegistryAddCommand("excel-document-splits"),
    docsHref: "/docs/components/xlsx-viewer",
    viewHref: "/view/blocks/excel-document-splits",
  },
  {
    id: "docx-editor-block",
    title: "DOCX Editor",
    badge: "Experimental",
    description:
      "A Word-style document editor with formatting controls, page thumbnails, and DOCX export.",
    command: getRegistryAddCommand("docx-editor-block"),
    docsHref: "/docs/components/docx-editor",
    viewHref: "/view/blocks/docx-editor-block",
    previewHeightClassName: "h-[720px]",
  },
] as const satisfies readonly PdfViewerBlockConfig[]

export type PdfViewerBlockId = (typeof PDF_VIEWER_BLOCKS)[number]["id"]
export type PdfViewerBlockMetadata = PdfViewerBlockConfig & {
  id: PdfViewerBlockId
}

export function getPdfViewerBlock(
  blockId: string
): PdfViewerBlockMetadata | undefined {
  return PDF_VIEWER_BLOCKS.find((block) => block.id === blockId)
}
