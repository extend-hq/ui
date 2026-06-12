"use client"

import * as React from "react"
import {
  DocxEditorViewer,
  useDocxEditor,
  useDocxViewerThumbnails,
  type DocxEditorController,
} from "@extend-ai/react-docx"

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
const THUMBNAIL_WIDTH = 360
// Quiet period after the last reported page-count change before the DOCX
// page thumbnails are captured.
const DOCX_PAGINATION_SETTLE_MS = 600

// The docx canvas reports "ready" once for the blank pre-import page; only
// capture once actual content has been painted.
function canvasHasInk(canvas: HTMLCanvasElement) {
  const sampleSize = 32
  const sample = document.createElement("canvas")

  sample.width = sampleSize
  sample.height = sampleSize

  const context = sample.getContext("2d")

  if (!context) return false

  context.drawImage(canvas, 0, 0, sampleSize, sampleSize)

  const { data } = context.getImageData(0, 0, sampleSize, sampleSize)

  for (let index = 0; index < data.length; index += 4) {
    if (
      data[index + 3] > 0 &&
      (data[index] < 240 || data[index + 1] < 240 || data[index + 2] < 240)
    ) {
      return true
    }
  }
  return false
}

export function DocxThumbnailUrlGenerator({
  fileName,
  onUrls,
  url,
}: {
  fileName: string
  onUrls: (dataUrls: string[], pageCount: number) => void
  url: string
}) {
  const editor = useDocxEditor({
    initialDocumentTheme: "light",
    initialFileName: fileName,
  })
  const { importDocxFile } = editor
  const [isImported, setIsImported] = React.useState(false)
  // Pagination reports the live page count through the viewer while pages
  // are still being measured (1, 2, … final); mirror it so the thumbnails
  // hook covers every page.
  const [reportedPageCount, setReportedPageCount] = React.useState(0)
  // Capturing at the first reported count would snapshot a partially
  // paginated document, so wait until the count stops changing.
  const [settledPageCount, setSettledPageCount] = React.useState(0)
  const settledPageCountRef = React.useRef(0)
  const thumbnailEditor = React.useMemo<DocxEditorController>(
    () => ({
      ...editor,
      totalPages: Math.max(editor.totalPages, reportedPageCount, 1),
    }),
    [editor, reportedPageCount]
  )
  const { thumbnails } = useDocxViewerThumbnails(
    thumbnailEditor,
    React.useMemo(
      () => ({
        pixelRatio: 2,
        resolution: {
          maxHeight: THUMBNAIL_WIDTH * 1.35,
          maxWidth: THUMBNAIL_WIDTH,
        },
      }),
      []
    )
  )
  const isCapturedRef = React.useRef(false)
  const isCapturingRef = React.useRef(false)

  React.useEffect(() => {
    let isCurrent = true

    void fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch ${fileName} (${response.status})`)
        }

        const blob = await response.blob()

        return new File([blob], fileName, {
          type: blob.type || DOCX_MIME_TYPE,
        })
      })
      .then((docxFile) => {
        if (isCurrent) {
          return importDocxFile(docxFile).then(() => {
            if (isCurrent) {
              setIsImported(true)
            }
          })
        }
      })
      .catch(() => {})

    return () => {
      isCurrent = false
    }
  }, [fileName, importDocxFile, url])

  React.useEffect(() => {
    if (!isImported || reportedPageCount === 0) return

    settledPageCountRef.current = 0
    setSettledPageCount(0)

    const timeoutId = window.setTimeout(() => {
      settledPageCountRef.current = reportedPageCount
      setSettledPageCount(reportedPageCount)
    }, DOCX_PAGINATION_SETTLE_MS)

    return () => window.clearTimeout(timeoutId)
  }, [isImported, reportedPageCount])

  React.useEffect(() => {
    if (settledPageCount === 0) return
    if (isCapturedRef.current || isCapturingRef.current) return
    if (thumbnails.length < settledPageCount) return
    if (thumbnails.some((thumbnail) => !thumbnail.isMounted)) return

    // Guarded by a ref instead of effect cleanup: each render call updates
    // the hook's thumbnail state, which would cancel an abortable effect
    // before the capture ever finished.
    isCapturingRef.current = true

    void Promise.all(
      thumbnails.map(async (thumbnail) => {
        const canvas = document.createElement("canvas")

        canvas.width = thumbnail.pixelWidthPx
        canvas.height = thumbnail.pixelHeightPx
        await thumbnail.renderToCanvas(canvas)
        return canvas
      })
    )
      .then((canvases) => {
        isCapturingRef.current = false

        if (isCapturedRef.current) return
        // Pagination moved on while the capture was in flight — drop the
        // stale snapshot and let the next settled count retry.
        if (settledPageCountRef.current !== settledPageCount) return
        // The first paint can race the imported content; skip blank frames
        // so the next thumbnail state change retries.
        if (!canvases[0] || !canvasHasInk(canvases[0])) return

        isCapturedRef.current = true
        onUrls(
          canvases.map((canvas) => canvas.toDataURL("image/png")),
          canvases.length
        )
      })
      .catch(() => {
        isCapturingRef.current = false
      })
  }, [onUrls, settledPageCount, thumbnails])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 -z-10 h-[1056px] w-[816px] overflow-hidden bg-white opacity-0 [contain:layout_paint]"
    >
      <div className="w-[816px]">
        <DocxEditorViewer
          editor={editor}
          mode="read-only"
          pageBackgroundColor="#ffffff"
          pageGapBackgroundColor="transparent"
          pageVirtualization={{ enabled: false }}
          deferInitialPaginationPaint={false}
          onPageCountChange={(pageCount) =>
            setReportedPageCount(Math.max(1, Math.round(pageCount || 1)))
          }
        />
      </div>
    </div>
  )
}
