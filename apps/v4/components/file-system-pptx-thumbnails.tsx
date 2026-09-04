"use client"

import * as React from "react"
import {
  ReactPptxViewer,
  usePptxViewer,
  usePptxViewerThumbnails,
} from "@extend-ai/react-pptx"
import { toPng } from "html-to-image"

import "@extend-ai/react-pptx/styles.css"

const THUMBNAIL_WIDTH = 360

function waitForPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve())
    })
  })
}

async function waitForImages(element: HTMLElement) {
  await Promise.all(
    Array.from(element.querySelectorAll("img")).map(async (image) => {
      if (!image.complete) {
        await new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true })
          image.addEventListener("error", () => resolve(), { once: true })
        })
      }

      await image.decode().catch(() => {})
    })
  )
}

export function PptxThumbnailUrlGenerator({
  onUrls,
  url,
}: {
  onUrls: (dataUrls: string[], pageCount: number) => void
  url: string
}) {
  const viewer = usePptxViewer()
  const captureHostRef = React.useRef<HTMLDivElement>(null)
  const [isReady, setIsReady] = React.useState(false)
  const { thumbnails } = usePptxViewerThumbnails(
    viewer.controller,
    React.useMemo(
      () => ({
        resolution: {
          maxHeight: THUMBNAIL_WIDTH,
          maxWidth: THUMBNAIL_WIDTH,
        },
      }),
      []
    )
  )
  const isCapturedRef = React.useRef(false)
  const isCapturingRef = React.useRef(false)
  const isMountedRef = React.useRef(true)

  React.useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
    }
  }, [])

  React.useEffect(() => {
    if (!isReady || thumbnails.length === 0 || !captureHostRef.current) return
    if (isCapturedRef.current || isCapturingRef.current) return

    const captureHost = captureHostRef.current

    isCapturingRef.current = true

    void (async () => {
      const dataUrls: string[] = []

      for (const thumbnail of thumbnails) {
        if (!isMountedRef.current) return

        const element = document.createElement("div")

        element.style.width = `${thumbnail.width}px`
        element.style.height = `${thumbnail.height}px`
        element.style.overflow = "hidden"
        element.style.background = "white"
        captureHost.append(element)

        try {
          await thumbnail.renderToContainer(element)
          await document.fonts.ready
          await waitForImages(element)
          await waitForPaint()

          dataUrls.push(
            await toPng(element, {
              backgroundColor: "#ffffff",
              cacheBust: false,
              height: thumbnail.height,
              pixelRatio: 1,
              skipAutoScale: true,
              width: thumbnail.width,
            })
          )
          if (isMountedRef.current) {
            onUrls([...dataUrls], thumbnails.length)
          }
        } finally {
          thumbnail.containerRef(null)
          element.remove()
        }
      }

      if (!isMountedRef.current || dataUrls.length === 0) return

      isCapturedRef.current = true
      onUrls(dataUrls, thumbnails.length)
    })()
      .catch(() => {})
      .finally(() => {
        isCapturingRef.current = false
      })
  }, [isReady, onUrls, thumbnails])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 -left-[10000px] h-[203px] w-[360px] overflow-hidden bg-white [contain:layout_paint]"
    >
      <ReactPptxViewer
        ref={viewer.ref}
        source={url}
        mode="slide"
        width={THUMBNAIL_WIDTH}
        height={203}
        showToolbar={false}
        showThumbnails={false}
        showNotes={false}
        showSlideLabels={false}
        virtualization={false}
        onReady={() => setIsReady(true)}
      />
      <div ref={captureHostRef} />
    </div>
  )
}
