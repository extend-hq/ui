"use client"

import * as React from "react"
import {
  createDocxThumbnailRenderer,
  parseDocxForViewer,
  type DocxThumbnailRenderer,
} from "@extend-ai/react-docx"

const THUMBNAIL_WIDTH = 360

type DocxThumbnailSource = {
  pageCount: number
  renderer: DocxThumbnailRenderer
}

type DocxThumbnailResult = {
  pageCount: number
  url: string
}

const sourceCache = new Map<string, Promise<DocxThumbnailSource>>()
const thumbnailCache = new Map<string, Promise<DocxThumbnailResult | null>>()

function getDocxThumbnailSource(url: string, fileName: string) {
  let sourcePromise = sourceCache.get(url)

  if (!sourcePromise) {
    sourcePromise = fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch document (${response.status})`)
        }
        return response.blob()
      })
      .then((blob) =>
        parseDocxForViewer(blob, {
          fileName,
          loadEmbeddedFonts: false,
        })
      )
      .then((document) => {
        const renderer = createDocxThumbnailRenderer(document, {
          pixelRatio: 1,
          resolution: {
            maxHeight: THUMBNAIL_WIDTH * 1.35,
            maxWidth: THUMBNAIL_WIDTH,
          },
          scheduling: "immediate",
        })

        return { pageCount: renderer.pageCount, renderer }
      })
    sourceCache.set(url, sourcePromise)
  }
  return sourcePromise
}

export function renderDocxThumbnailUrl({
  fileName,
  pageIndex,
  url,
}: {
  fileName: string
  pageIndex: number
  url: string
}) {
  const cacheKey = `${url}#${pageIndex}`
  let thumbnailPromise = thumbnailCache.get(cacheKey)

  if (!thumbnailPromise) {
    thumbnailPromise = getDocxThumbnailSource(url, fileName).then(
      async ({ pageCount, renderer }) => {
        if (pageIndex < 0 || pageIndex >= pageCount) return null

        const result = await renderer.renderPage(pageIndex, {
          maxHeight: THUMBNAIL_WIDTH * 1.35,
          maxWidth: THUMBNAIL_WIDTH,
          output: "blob",
          pixelRatio: 1,
          scheduling: "immediate",
        })

        if (!result.blob) return null
        return { pageCount, url: URL.createObjectURL(result.blob) }
      }
    )
    thumbnailCache.set(cacheKey, thumbnailPromise)
  }
  return thumbnailPromise
}

export function DocxThumbnailUrlGenerator({
  fileName,
  onUrls,
  url,
}: {
  fileName: string
  onUrls: (urls: string[], pageCount: number) => void
  url: string
}) {
  React.useEffect(() => {
    let isCurrent = true

    void renderDocxThumbnailUrl({ fileName, pageIndex: 0, url })
      .then((thumbnail) => {
        if (isCurrent && thumbnail) {
          onUrls([thumbnail.url], thumbnail.pageCount)
        }
      })
      .catch(() => {})

    return () => {
      isCurrent = false
    }
  }, [fileName, onUrls, url])

  return null
}
