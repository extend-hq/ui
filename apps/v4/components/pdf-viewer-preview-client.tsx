"use client"

import { withUiBasePath } from "@/lib/zone-path"
import { PDFViewer } from "@/components/ui/pdf-viewer"

const SAMPLE_PDF_URL = withUiBasePath("/samples/attention.pdf")

export function PdfViewerPreviewClient({
  src = SAMPLE_PDF_URL,
  showRotateControls = true,
}: {
  src?: string
  showRotateControls?: boolean
}) {
  return (
    <PDFViewer
      src={src}
      className="h-[560px]"
      defaultZoom={0.5}
      showRotateControls={showRotateControls}
    />
  )
}
