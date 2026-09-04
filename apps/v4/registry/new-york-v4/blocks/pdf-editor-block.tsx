"use client"

import * as React from "react"

import { PDFEditor, type PdfEditorMode } from "@/components/extend/pdf-editor"

export function PdfEditorBlock({
  file,
  fileName,
  defaultMode = "annotate",
}: {
  file?: string
  fileName?: string
  defaultMode?: PdfEditorMode
}) {
  return (
    <div className="h-full min-h-0 bg-background">
      <PDFEditor
        src={file ?? "/samples/attention.pdf"}
        fileName={fileName}
        className="h-full"
        defaultZoom="fit-width"
        defaultMode={defaultMode}
        annotationAuthor="Reviewer"
      />
    </div>
  )
}
