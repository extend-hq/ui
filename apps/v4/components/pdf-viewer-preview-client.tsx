"use client"

import { PDFViewer } from "@/components/ui/pdf-viewer"

const SAMPLE_PDF_URL = "/samples/attention.pdf"

export function PdfViewerPreviewClient({
  file = SAMPLE_PDF_URL,
  showRotateControls = true,
}: {
  file?: string
  showRotateControls?: boolean
}) {
  return (
    <PDFViewer
      file={file}
      className="h-[560px]"
      defaultZoom={0.5}
      defaultThumbnailSidebarOpen={false}
      showRotateControls={showRotateControls}
    />
  )
}
