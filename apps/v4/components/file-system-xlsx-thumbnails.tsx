"use client"

import * as React from "react"
import {
  useXlsxViewerController,
  useXlsxViewerThumbnails,
  XlsxViewerProvider,
} from "@extend-ai/react-xlsx"

const THUMBNAIL_WIDTH = 360

export function XlsxThumbnailUrlGenerator({
  fileName,
  onUrls,
  url,
}: {
  fileName: string
  onUrls: (dataUrls: string[], pageCount: number) => void
  url: string
}) {
  const [workbookBuffer, setWorkbookBuffer] =
    React.useState<ArrayBuffer | null>(null)

  React.useEffect(() => {
    let isCurrent = true

    void fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch ${fileName} (${response.status})`)
        }

        return response.arrayBuffer()
      })
      .then((buffer) => {
        if (isCurrent) {
          setWorkbookBuffer(buffer)
        }
      })
      .catch(() => {})

    return () => {
      isCurrent = false
    }
  }, [fileName, url])

  if (!workbookBuffer) return null

  return (
    <XlsxWorkbookThumbnailCapture
      fileName={fileName}
      onUrls={onUrls}
      workbookBuffer={workbookBuffer}
    />
  )
}

function XlsxWorkbookThumbnailCapture({
  fileName,
  onUrls,
  workbookBuffer,
}: {
  fileName: string
  onUrls: (dataUrls: string[], pageCount: number) => void
  workbookBuffer: ArrayBuffer
}) {
  const controller = useXlsxViewerController(
    React.useMemo(
      () => ({
        file: workbookBuffer,
        fileName,
        readOnly: true,
        useWorker: true,
      }),
      [fileName, workbookBuffer]
    )
  )

  return (
    <XlsxViewerProvider controller={controller}>
      <XlsxThumbnailCapture onUrls={onUrls} />
    </XlsxViewerProvider>
  )
}

function XlsxThumbnailCapture({
  onUrls,
}: {
  onUrls: (dataUrls: string[], pageCount: number) => void
}) {
  const { thumbnails } = useXlsxViewerThumbnails(
    React.useMemo(
      () => ({
        includeHeaders: true,
        resolution: {
          maxHeight: THUMBNAIL_WIDTH,
          maxWidth: THUMBNAIL_WIDTH * 1.6,
        },
      }),
      []
    )
  )

  React.useEffect(() => {
    if (thumbnails.length === 0) return

    const dataUrls: string[] = []

    for (const thumbnail of thumbnails) {
      const canvas = document.createElement("canvas")

      canvas.width = thumbnail.width
      canvas.height = thumbnail.height

      // Bail until every sheet paints; the effect reruns as they become ready.
      if (!thumbnail.paint(canvas)) return

      dataUrls.push(canvas.toDataURL("image/png"))
    }
    onUrls(dataUrls, dataUrls.length)
  }, [onUrls, thumbnails])

  return null
}
