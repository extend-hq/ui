"use client"

import dynamic from "next/dynamic"

export const HumanReviewDemo = dynamic(() =>
  import("@/components/bounding-box-citations-docs").then(
    (module) => module.HumanReviewDemo
  )
)

export const HumanReviewSource = dynamic(() =>
  import("@/components/bounding-box-citations-docs").then(
    (module) => module.HumanReviewSource
  )
)

export const CsvViewerDemo = dynamic(() =>
  import("@/components/csv-viewer-docs").then((module) => module.CsvViewerDemo)
)

export const CsvViewerSource = dynamic(() =>
  import("@/components/csv-viewer-docs").then(
    (module) => module.CsvViewerSource
  )
)

export const DocumentSplitsDemo = dynamic(() =>
  import("@/components/document-splitter-docs").then(
    (module) => module.DocumentSplitsDemo
  )
)

export const DocumentSplitsSource = dynamic(() =>
  import("@/components/document-splitter-docs").then(
    (module) => module.DocumentSplitsSource
  )
)

export const DocumentViewerSidebarDemo = dynamic(() =>
  import("@/components/document-viewer-sidebar-docs").then(
    (module) => module.DocumentViewerSidebarDemo
  )
)

export const DocumentViewerSidebarSource = dynamic(() =>
  import("@/components/document-viewer-sidebar-docs").then(
    (module) => module.DocumentViewerSidebarSource
  )
)

export const DocxEditorDemo = dynamic(() =>
  import("@/components/docx-editor-docs").then(
    (module) => module.DocxEditorDemo
  )
)

export const DocxEditorSource = dynamic(() =>
  import("@/components/docx-editor-docs").then(
    (module) => module.DocxEditorSource
  )
)

export const DocxViewerDemo = dynamic(() =>
  import("@/components/docx-viewer-docs").then(
    (module) => module.DocxViewerDemo
  )
)

export const DocxViewerSource = dynamic(() =>
  import("@/components/docx-viewer-docs").then(
    (module) => module.DocxViewerSource
  )
)

export const ESignatureDemo = dynamic(() =>
  import("@/components/e-signature-docs").then(
    (module) => module.ESignatureDemo
  )
)

export const ESignatureSource = dynamic(() =>
  import("@/components/e-signature-docs").then(
    (module) => module.ESignatureSource
  )
)

export const FileSystemDemo = dynamic(() =>
  import("@/components/file-system-docs").then(
    (module) => module.FileSystemDemo
  )
)

export const FileThumbnailDemo = dynamic(() =>
  import("@/components/file-thumbnail-docs").then(
    (module) => module.FileThumbnailDemo
  )
)

export const FileThumbnailSource = dynamic(() =>
  import("@/components/file-thumbnail-docs").then(
    (module) => module.FileThumbnailSource
  )
)

export const FileUploadDemo = dynamic(() =>
  import("@/components/file-upload-docs").then(
    (module) => module.FileUploadDemo
  )
)

export const FileUploadSource = dynamic(() =>
  import("@/components/file-upload-docs").then(
    (module) => module.FileUploadSource
  )
)

export const OcrBlocksDemo = dynamic(() =>
  import("@/components/layout-blocks-docs").then(
    (module) => module.OcrBlocksDemo
  )
)

export const OcrBlocksSource = dynamic(() =>
  import("@/components/layout-blocks-source-code").then(
    (module) => module.OcrBlocksSource
  )
)

export const PdfEditorDemo = dynamic(() =>
  import("@/components/pdf-editor-docs").then((module) => module.PdfEditorDemo)
)

export const PdfEditorSource = dynamic(() =>
  import("@/components/pdf-editor-docs").then(
    (module) => module.PdfEditorSource
  )
)

export const PdfViewerDemo = dynamic(() =>
  import("@/components/pdf-viewer-docs").then((module) => module.PdfViewerDemo)
)

export const PdfViewerSource = dynamic(() =>
  import("@/components/pdf-viewer-docs").then(
    (module) => module.PdfViewerSource
  )
)

export const XlsxEditorDemo = dynamic(() =>
  import("@/components/xlsx-editor-docs").then(
    (module) => module.XlsxEditorDemo
  )
)

export const XlsxEditorSource = dynamic(() =>
  import("@/components/xlsx-editor-docs").then(
    (module) => module.XlsxEditorSource
  )
)

export const XlsxViewerDemo = dynamic(() =>
  import("@/components/xlsx-viewer-docs").then(
    (module) => module.XlsxViewerDemo
  )
)

export const XlsxViewerSource = dynamic(() =>
  import("@/components/xlsx-viewer-docs").then(
    (module) => module.XlsxViewerSource
  )
)

export const PptxViewerDemo = dynamic(() =>
  import("@/components/pptx-viewer-demo").then(
    (module) => module.PptxViewerDemo
  )
)

export const SchemaBuilderDemo = dynamic(() =>
  import("@/components/schema-builder-demo").then(
    (module) => module.SchemaBuilderDemo
  )
)
