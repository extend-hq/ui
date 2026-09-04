"use client"

import * as React from "react"

import { withUiBasePath } from "@/lib/zone-path"
import { PDFEditor, type PdfEditorMode } from "@/components/extend/pdf-editor"

export function PdfEditorPreviewClient({
  heightClassName = "h-[720px]",
  defaultMode,
}: {
  heightClassName?: string
  defaultMode?: PdfEditorMode
}) {
  return (
    <PDFEditor
      src={withUiBasePath("/samples/attention.pdf")}
      fileName="attention-is-all-you-need.pdf"
      className={heightClassName}
      defaultZoom="fit-width"
      defaultMode={defaultMode ?? "annotate"}
      annotationAuthor="Extend"
    />
  )
}
