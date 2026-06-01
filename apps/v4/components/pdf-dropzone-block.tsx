"use client"

import * as React from "react"
import { FileUploadIcon } from "@hugeicons/core-free-icons"

import { PDFViewer } from "@/components/ui/pdf-viewer"
import { FileUpload } from "@/components/file-upload-docs"

const PDF_ACCEPT = "application/pdf,.pdf"
const DEFAULT_ZOOM = 0.75

function isPdfFile(file: File) {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  )
}

export function PdfDropzoneBlock() {
  const [pdfFile, setPdfFile] = React.useState<{
    name: string
    url: string
  } | null>(null)
  const objectUrlRef = React.useRef<string | null>(null)

  const loadPdf = React.useCallback((files: File[]) => {
    const nextFile = files.find(isPdfFile)

    if (!nextFile) return

    const nextUrl = URL.createObjectURL(nextFile)

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
    }

    objectUrlRef.current = nextUrl
    setPdfFile({
      name: nextFile.name,
      url: nextUrl,
    })
  }, [])

  React.useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
    }
  }, [])

  if (!pdfFile) {
    return (
      <div className="grid h-full min-h-[680px] place-items-center bg-background p-4">
        <FileUpload
          accept={PDF_ACCEPT}
          acceptedFileTypes={[{ label: "PDF", icon: FileUploadIcon }]}
          browseLabel="Browse PDF"
          className="w-full max-w-xl"
          description="PDF files only"
          draggingLabel="Drop PDF"
          multiple={false}
          showFileList={false}
          title="Drop a PDF to preview"
          onFilesAccepted={loadPdf}
        />
      </div>
    )
  }

  return (
    <div className="h-full min-h-[680px] bg-background">
      <PDFViewer
        key={pdfFile.url}
        file={pdfFile.url}
        defaultZoom={DEFAULT_ZOOM}
        downloadFileName={pdfFile.name}
        onPdfUpload={(file) => loadPdf([file])}
        toolbarActions={
          <div className="hidden max-w-40 truncate text-xs text-muted-foreground sm:block">
            {pdfFile.name}
          </div>
        }
      />
    </div>
  )
}
