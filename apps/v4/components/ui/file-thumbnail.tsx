"use client"

import * as React from "react"

export type ThumbnailFile = {
  name: string
  type: string
}

export type FileThumbnailProps = {
  file: ThumbnailFile | File
  className?: string
  previewAspectRatio?: number
  previewClassName?: string
  previewContent?: React.ReactNode
  previewImageUrl?: string | null
  isLoading?: boolean
  hasError?: boolean
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export function FileThumbnailLoadingOverlay() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 z-10 overflow-hidden bg-muted"
    >
      <div className="absolute inset-0 bg-muted" />
      <div className="absolute inset-0 animate-pulse bg-background/55 motion-reduce:animate-none" />
    </div>
  )
}

export function FileThumbnail({
  file: _file,
  className,
  previewAspectRatio,
  previewClassName,
  previewContent,
  previewImageUrl,
  isLoading = false,
  hasError = false,
}: FileThumbnailProps) {
  const imageRef = React.useRef<HTMLImageElement | null>(null)
  const revealFrameRef = React.useRef<number | null>(null)
  const [loadedPreviewImageUrl, setLoadedPreviewImageUrl] = React.useState<
    string | null
  >(null)
  const [failedPreviewImageUrl, setFailedPreviewImageUrl] = React.useState<
    string | null
  >(null)
  const imageFailed = Boolean(
    previewImageUrl && failedPreviewImageUrl === previewImageUrl
  )
  const isImageLoading = Boolean(
    previewImageUrl && loadedPreviewImageUrl !== previewImageUrl && !imageFailed
  )
  const showLoading = isLoading || isImageLoading
  const hasPreviewContent = Boolean(previewContent)
  const showFallback =
    !showLoading &&
    (hasError || imageFailed || (!previewImageUrl && !hasPreviewContent))
  const cancelImageReveal = React.useCallback(() => {
    if (revealFrameRef.current === null) return

    window.cancelAnimationFrame(revealFrameRef.current)
    revealFrameRef.current = null
  }, [])
  const markImageLoaded = React.useCallback(
    (image: HTMLImageElement, imageUrl: string | null | undefined) => {
      if (!imageUrl) return

      const didLoad = image.naturalWidth > 0 && image.naturalHeight > 0

      setFailedPreviewImageUrl(didLoad ? null : imageUrl)
      if (didLoad) {
        cancelImageReveal()
        revealFrameRef.current = window.requestAnimationFrame(() => {
          revealFrameRef.current = window.requestAnimationFrame(() => {
            setLoadedPreviewImageUrl(imageUrl)
            revealFrameRef.current = null
          })
        })
      }
    },
    [cancelImageReveal]
  )

  React.useEffect(() => {
    cancelImageReveal()

    if (previewImageUrl) return

    setLoadedPreviewImageUrl(null)
    setFailedPreviewImageUrl(null)
  }, [cancelImageReveal, previewImageUrl])

  React.useEffect(() => cancelImageReveal, [cancelImageReveal])

  React.useEffect(() => {
    const image = imageRef.current

    if (!image || !previewImageUrl) return

    if (image.complete) {
      markImageLoaded(image, previewImageUrl)
    }
  }, [markImageLoaded, previewImageUrl])

  return (
    <div
      className={cx(
        "group overflow-hidden rounded-lg border bg-background text-foreground",
        className
      )}
    >
      <div
        className={cx(
          "relative aspect-square overflow-hidden bg-muted [contain:layout_paint]",
          previewClassName
        )}
        style={
          previewAspectRatio
            ? { aspectRatio: String(previewAspectRatio) }
            : undefined
        }
      >
        {previewImageUrl ? (
          <img
            ref={imageRef}
            src={previewImageUrl}
            alt=""
            draggable={false}
            loading="lazy"
            decoding="async"
            className={cx(
              "absolute inset-0 block size-full object-cover transition-[opacity,filter] duration-[160ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              showLoading ? "opacity-0 blur-sm" : "blur-0 opacity-100"
            )}
            onLoad={(event) => {
              markImageLoaded(event.currentTarget, previewImageUrl)
            }}
            onError={() => {
              if (previewImageUrl) {
                cancelImageReveal()
                setFailedPreviewImageUrl(previewImageUrl)
                setLoadedPreviewImageUrl((currentUrl) =>
                  currentUrl === previewImageUrl ? null : currentUrl
                )
              }
            }}
          />
        ) : null}
        {previewContent ? (
          <div
            className={cx(
              "absolute inset-0 size-full transition-[opacity,filter] duration-[160ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              showLoading ? "opacity-0 blur-sm" : "blur-0 opacity-100"
            )}
          >
            {previewContent}
          </div>
        ) : null}
        {showLoading ? <FileThumbnailLoadingOverlay /> : null}
        {showFallback ? (
          <div className="absolute inset-0 bg-muted" aria-hidden="true" />
        ) : null}
      </div>
    </div>
  )
}
