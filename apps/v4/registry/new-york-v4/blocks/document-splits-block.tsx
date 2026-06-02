"use client"

import * as React from "react"

import {
  createInitialSplits,
  DocumentSplits,
  INITIAL_SPLITS,
  type DocumentSplit,
  type DocumentSplitPageId,
} from "@/components/ui/document-splits"
import { PDFViewer, type PDFViewerHandle } from "@/components/ui/pdf-viewer"
import { PdfBlockResizableShell } from "@/components/pdf-block-resizable-shell"

export function DocumentSplitsBlock({
  file,
  heightClassName = "h-[720px]",
  thumbnailImages,
}: {
  file?: string
  heightClassName?: string
  thumbnailImages?: Record<DocumentSplitPageId, string>
}) {
  const [splits, setSplits] = React.useState<DocumentSplit[]>(INITIAL_SPLITS)
  const [pdfFile, setPdfFile] = React.useState(file)
  const viewerRef = React.useRef<PDFViewerHandle>(null)
  const uploadedPdfUrlRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    setPdfFile(file)
  }, [file])

  React.useEffect(() => {
    return () => {
      if (uploadedPdfUrlRef.current) {
        URL.revokeObjectURL(uploadedPdfUrlRef.current)
      }
    }
  }, [])

  const handlePdfUpload = React.useCallback((uploadedFile: File) => {
    const nextUrl = URL.createObjectURL(uploadedFile)

    if (uploadedPdfUrlRef.current) {
      URL.revokeObjectURL(uploadedPdfUrlRef.current)
    }

    uploadedPdfUrlRef.current = nextUrl
    setPdfFile(nextUrl)
  }, [])

  const handleDocumentLoadSuccess = React.useCallback((pageCount: number) => {
    setSplits(createInitialSplits(pageCount))
  }, [])

  const handleSelectPage = React.useCallback((pageNumber: number) => {
    viewerRef.current?.scrollToPage(pageNumber, {
      block: "start",
      behavior: "auto",
    })
  }, [])

  return (
    <PdfBlockResizableShell
      autoSaveId="pdf-block-document-splits"
      heightClassName={heightClassName}
      rightDefaultSize={50}
      rightMaxSize={66}
      rightMinSize={30}
      left={
        <PDFViewer
          ref={viewerRef}
          file={pdfFile}
          defaultZoom={0.75}
          onDocumentLoadSuccess={handleDocumentLoadSuccess}
          onPdfUpload={handlePdfUpload}
        />
      }
      right={
        <div className="flex min-h-0 flex-col bg-background">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-medium">Document splits</h3>
            <p className="text-xs text-muted-foreground">
              Drag pages between split groups and reorder output documents.
            </p>
          </div>
          <DocumentSplits
            className="min-h-0 flex-1"
            splits={splits}
            thumbnailImages={thumbnailImages}
            withFrameDivider={false}
            onSelectPage={handleSelectPage}
            onSplitsChange={setSplits}
          />
        </div>
      }
    />
  )
}
