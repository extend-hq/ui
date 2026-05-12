"use client"

import * as React from "react"
import {
  BorderFullIcon,
  Download01Icon,
  FilePenIcon,
  Loading03Icon,
  Pen01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type * as ReactPdf from "react-pdf"
import type SignaturePad from "signature_pad"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { HighlightedCodeBlock } from "@/components/highlighted-code-block"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from "@/registry/new-york-v4/ui/dialog"

type BoundingBox = {
  x: number
  y: number
  width: number
  height: number
}

type SignatureField = {
  id: string
  label: string
  page: number
  bbox: BoundingBox
  imageDataUrl?: string
}

type ReactPdfModule = typeof ReactPdf

const PDF_URL = "/samples/attention.pdf"
const PDF_WORKER_URL = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  import.meta.url
).toString()
const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const RENDERED_PAGE_WIDTH = 430
const RENDERED_PAGE_HEIGHT = Math.round(
  RENDERED_PAGE_WIDTH * (PAGE_HEIGHT / PAGE_WIDTH)
)
const DEVICE_PIXEL_RATIO_LIMIT = 2
const MIN_FIELD_WIDTH = 96
const MIN_FIELD_HEIGHT = 34
const SIGNATURE_PAD_PADDING = 8
const DEFAULT_SIGNATURE_ASPECT_RATIO = 3

const INITIAL_FIELD: SignatureField = {
  id: "signature-1",
  label: "Signature1",
  page: 1,
  bbox: {
    x: 300,
    y: 504,
    width: 250,
    height: 58,
  },
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function bboxToStyle(bbox: BoundingBox): React.CSSProperties {
  return {
    left: `${(bbox.x / PAGE_WIDTH) * 100}%`,
    top: `${(bbox.y / PAGE_HEIGHT) * 100}%`,
    width: `${(bbox.width / PAGE_WIDTH) * 100}%`,
    height: `${(bbox.height / PAGE_HEIGHT) * 100}%`,
  }
}

function normalizeBoundingBox(
  start: { x: number; y: number },
  end: { x: number; y: number }
): BoundingBox {
  const x = Math.min(start.x, end.x)
  const y = Math.min(start.y, end.y)
  const width = Math.abs(end.x - start.x)
  const height = Math.abs(end.y - start.y)

  return {
    x: clamp(x, 0, PAGE_WIDTH - MIN_FIELD_WIDTH),
    y: clamp(y, 0, PAGE_HEIGHT - MIN_FIELD_HEIGHT),
    width: clamp(width, MIN_FIELD_WIDTH, PAGE_WIDTH - x),
    height: clamp(height, MIN_FIELD_HEIGHT, PAGE_HEIGHT - y),
  }
}

function getPointerPagePoint(
  event: React.PointerEvent<HTMLElement>,
  element: HTMLElement
) {
  const rect = element.getBoundingClientRect()

  return {
    x: clamp(
      ((event.clientX - rect.left) / rect.width) * PAGE_WIDTH,
      0,
      PAGE_WIDTH
    ),
    y: clamp(
      ((event.clientY - rect.top) / rect.height) * PAGE_HEIGHT,
      0,
      PAGE_HEIGHT
    ),
  }
}

function getSignatureAspectRatio(bbox?: BoundingBox): number {
  if (!bbox || bbox.width <= 0 || bbox.height <= 0) {
    return DEFAULT_SIGNATURE_ASPECT_RATIO
  }

  return bbox.width / bbox.height
}

function getSignatureGuideSize({
  containerWidth,
  containerHeight,
  aspectRatio,
}: {
  containerWidth: number
  containerHeight: number
  aspectRatio: number
}): { width: number; height: number } {
  const maxWidth = Math.max(containerWidth - SIGNATURE_PAD_PADDING * 2, 1)
  const maxHeight = Math.max(containerHeight - SIGNATURE_PAD_PADDING * 2, 1)

  if (maxWidth / maxHeight > aspectRatio) {
    const height = maxHeight
    return {
      width: height * aspectRatio,
      height,
    }
  }

  const width = maxWidth
  return {
    width,
    height: width / aspectRatio,
  }
}

function getCroppedSignatureDataUrl(canvas: HTMLCanvasElement): string {
  const context = canvas.getContext("2d")
  if (!context) {
    return canvas.toDataURL("image/png")
  }

  const { width, height } = canvas
  const imageData = context.getImageData(0, 0, width, height)
  const { data } = imageData
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha === 0) continue

      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }

  if (maxX < minX || maxY < minY) {
    return canvas.toDataURL("image/png")
  }

  const croppedWidth = maxX - minX + 1
  const croppedHeight = maxY - minY + 1
  const croppedCanvas = document.createElement("canvas")
  croppedCanvas.width = croppedWidth
  croppedCanvas.height = croppedHeight

  const croppedContext = croppedCanvas.getContext("2d")
  if (!croppedContext) {
    return canvas.toDataURL("image/png")
  }

  croppedContext.drawImage(
    canvas,
    minX,
    minY,
    croppedWidth,
    croppedHeight,
    0,
    0,
    croppedWidth,
    croppedHeight
  )

  return croppedCanvas.toDataURL("image/png")
}

function SignatureDialog({
  open,
  fieldBbox,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  fieldBbox: BoundingBox
  onOpenChange: (open: boolean) => void
  onConfirm: (value: string) => void
}) {
  const canvasContainerRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const signaturePadRef = React.useRef<SignaturePad | null>(null)
  const [isReady, setIsReady] = React.useState(false)
  const [hasSignature, setHasSignature] = React.useState(false)
  const [guideSize, setGuideSize] = React.useState<{
    width: number
    height: number
  } | null>(null)
  const signatureAspectRatio = React.useMemo(
    () => getSignatureAspectRatio(fieldBbox),
    [fieldBbox]
  )

  React.useEffect(() => {
    if (!open) {
      setGuideSize(null)
      return
    }

    let frameId = 0
    let resizeObserver: ResizeObserver | null = null

    const updateGuideSize = (container?: HTMLDivElement | null) => {
      const currentContainer = container ?? canvasContainerRef.current
      if (
        !currentContainer ||
        currentContainer.clientWidth <= 0 ||
        currentContainer.clientHeight <= 0
      ) {
        return false
      }

      const nextSize = getSignatureGuideSize({
        containerWidth: currentContainer.clientWidth,
        containerHeight: currentContainer.clientHeight,
        aspectRatio: signatureAspectRatio,
      })

      setGuideSize((previousSize) => {
        if (
          previousSize &&
          Math.abs(previousSize.width - nextSize.width) < 0.5 &&
          Math.abs(previousSize.height - nextSize.height) < 0.5
        ) {
          return previousSize
        }

        return nextSize
      })

      return true
    }

    const connect = () => {
      const container = canvasContainerRef.current
      if (!updateGuideSize(container)) {
        frameId = window.requestAnimationFrame(connect)
        return
      }

      if (container) {
        resizeObserver = new ResizeObserver(() => {
          updateGuideSize(container)
        })
        resizeObserver.observe(container)
      }
    }

    connect()

    return () => {
      window.cancelAnimationFrame(frameId)
      resizeObserver?.disconnect()
    }
  }, [open, signatureAspectRatio])

  React.useEffect(() => {
    if (!open || !guideSize || guideSize.width <= 1 || guideSize.height <= 1) {
      signaturePadRef.current?.off()
      signaturePadRef.current = null
      setIsReady(false)
      if (!open) {
        setHasSignature(false)
      }
      return
    }

    let cancelled = false
    let resizeObserver: ResizeObserver | null = null

    const syncCanvasSize = (canvas: HTMLCanvasElement) => {
      const width = Math.max(canvas.offsetWidth, 1)
      const height = Math.max(canvas.offsetHeight, 1)
      const ratio = Math.max(window.devicePixelRatio || 1, 1)

      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      canvas.width = Math.floor(width * ratio)
      canvas.height = Math.floor(height * ratio)
      const context = canvas.getContext("2d")
      context?.setTransform(1, 0, 0, 1, 0, 0)
      context?.scale(ratio, ratio)

      return { width, height, ratio }
    }

    const initialize = async () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const { default: SignaturePadConstructor } = await import("signature_pad")
      if (cancelled) return

      const signaturePad = new SignaturePadConstructor(canvas, {
        minWidth: 1.4,
        maxWidth: 2.8,
        penColor: "rgb(15, 23, 42)",
      })

      signaturePadRef.current = signaturePad

      const loadSignature = async (dataUrl?: string) => {
        const size = syncCanvasSize(canvas)

        if (dataUrl) {
          await signaturePad.fromDataURL(dataUrl, size)
          setHasSignature(true)
          return
        }

        signaturePad.clear()
        setHasSignature(false)
      }

      await loadSignature()
      if (cancelled) return

      signaturePad.addEventListener("endStroke", () => {
        setHasSignature(true)
      })

      resizeObserver = new ResizeObserver(() => {
        const currentCanvas = canvasRef.current
        const currentSignaturePad = signaturePadRef.current
        if (!currentCanvas || !currentSignaturePad) return

        const previousSignature = currentSignaturePad.isEmpty()
          ? undefined
          : currentSignaturePad.toDataURL("image/png")
        void loadSignature(previousSignature)
      })
      resizeObserver.observe(canvas)
      setIsReady(true)
    }

    const animationFrame = window.requestAnimationFrame(() => {
      void initialize()
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(animationFrame)
      resizeObserver?.disconnect()
      signaturePadRef.current?.off()
      signaturePadRef.current = null
      setIsReady(false)
    }
  }, [open, guideSize])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add signature</DialogTitle>
          <DialogDescription>
            Draw a signature to place it into the selected PDF field.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <div className="rounded-xl border bg-muted/30 p-3">
            <div
              ref={canvasContainerRef}
              className="flex h-56 w-full items-center justify-center overflow-hidden rounded-lg border bg-muted/40 p-2"
            >
              <div
                className={cn(
                  "relative overflow-hidden rounded-md border border-dashed border-slate-400 bg-white shadow-xs",
                  isReady ? "cursor-crosshair" : "cursor-wait"
                )}
                style={{
                  width: guideSize ? `${guideSize.width}px` : undefined,
                  height: guideSize ? `${guideSize.height}px` : undefined,
                  opacity: guideSize ? 1 : 0,
                }}
              >
                <canvas
                  ref={canvasRef}
                  className={cn(
                    "absolute inset-0 size-full touch-none",
                    !isReady && "pointer-events-none"
                  )}
                  style={{ touchAction: "none" }}
                />
              </div>
            </div>
          </div>
        </DialogPanel>
        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={!isReady}
            onClick={() => {
              signaturePadRef.current?.clear()
              setHasSignature(false)
            }}
          >
            Clear
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!isReady || !hasSignature}
              onClick={() => {
                const canvas = canvasRef.current
                if (!canvas) return

                onConfirm(getCroppedSignatureDataUrl(canvas))
                onOpenChange(false)
              }}
            >
              Confirm
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SignatureFieldOverlay({
  field,
  isDrawing,
  onDragStart,
}: {
  field: SignatureField
  isDrawing: boolean
  onDragStart: (event: React.PointerEvent<HTMLDivElement>) => void
}) {
  return (
    <div
      className={cn(
        "absolute z-20 overflow-hidden rounded-[3px] border border-blue-500/70",
        field.imageDataUrl ? "bg-transparent shadow-none" : "bg-blue-500/10",
        isDrawing ? "pointer-events-none" : "cursor-move"
      )}
      style={bboxToStyle(field.bbox)}
      onPointerDown={onDragStart}
    >
      {field.imageDataUrl ? (
        <img
          src={field.imageDataUrl}
          alt=""
          className="size-full object-contain"
          draggable={false}
        />
      ) : (
        <div className="flex size-full items-center justify-center gap-1.5 px-2 text-[11px] font-medium text-blue-700 dark:text-blue-300">
          <HugeiconsIcon icon={Pen01Icon} className="size-3.5" />
          Signature
        </div>
      )}
    </div>
  )
}

function ESignaturePage({
  reactPdf,
  field,
  isDrawing,
  draftBox,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDragStart,
}: {
  reactPdf: ReactPdfModule
  field: SignatureField
  isDrawing: boolean
  draftBox: BoundingBox | null
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void
  onDragStart: (event: React.PointerEvent<HTMLDivElement>) => void
}) {
  const devicePixelRatio =
    typeof window === "undefined"
      ? 1
      : Math.min(DEVICE_PIXEL_RATIO_LIMIT, window.devicePixelRatio || 1)

  return (
    <div
      data-signature-page={field.page}
      className={cn(
        "relative touch-none select-none",
        isDrawing && "cursor-crosshair"
      )}
      style={{ width: RENDERED_PAGE_WIDTH, height: RENDERED_PAGE_HEIGHT }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <reactPdf.Page
        pageNumber={field.page}
        width={RENDERED_PAGE_WIDTH}
        className="overflow-hidden border bg-background shadow-xs"
        renderAnnotationLayer={false}
        renderTextLayer={false}
        devicePixelRatio={devicePixelRatio}
        loading={
          <div
            className="grid place-items-center"
            style={{ width: RENDERED_PAGE_WIDTH, height: RENDERED_PAGE_HEIGHT }}
          >
            <HugeiconsIcon
              icon={Loading03Icon}
              className="size-4 animate-spin"
            />
          </div>
        }
      />
      <SignatureFieldOverlay
        field={field}
        isDrawing={isDrawing}
        onDragStart={onDragStart}
      />
      {isDrawing ? (
        <div
          className="absolute inset-0 z-40 cursor-crosshair touch-none"
          onPointerDown={(event) => {
            event.stopPropagation()
            onPointerDown(event)
          }}
          onPointerMove={(event) => {
            event.stopPropagation()
            onPointerMove(event)
          }}
          onPointerUp={(event) => {
            event.stopPropagation()
            onPointerUp(event)
          }}
          onPointerCancel={(event) => {
            event.stopPropagation()
            onPointerUp(event)
          }}
        />
      ) : null}
      {draftBox ? (
        <div
          className="pointer-events-none absolute z-50 rounded-[3px] border border-dashed border-blue-500/70 bg-blue-500/10"
          style={bboxToStyle(draftBox)}
        />
      ) : null}
    </div>
  )
}

async function downloadSignedPdf(field: SignatureField) {
  const { PDFDocument } = await import("pdf-lib")
  const existingPdfBytes = await fetch(PDF_URL).then((response) =>
    response.arrayBuffer()
  )
  const pdfDocument = await PDFDocument.load(existingPdfBytes)
  const page = pdfDocument.getPage(field.page - 1)

  if (field.imageDataUrl) {
    const signatureImage = await pdfDocument.embedPng(field.imageDataUrl)
    const { width: pageWidth, height: pageHeight } = page.getSize()
    const scaleX = pageWidth / PAGE_WIDTH
    const scaleY = pageHeight / PAGE_HEIGHT
    const fieldWidth = field.bbox.width * scaleX
    const fieldHeight = field.bbox.height * scaleY
    const imageAspectRatio = signatureImage.width / signatureImage.height
    const fieldAspectRatio = fieldWidth / fieldHeight
    const drawWidth =
      fieldAspectRatio > imageAspectRatio
        ? fieldHeight * imageAspectRatio
        : fieldWidth
    const drawHeight =
      fieldAspectRatio > imageAspectRatio
        ? fieldHeight
        : fieldWidth / imageAspectRatio
    const fieldX = field.bbox.x * scaleX
    const fieldY = pageHeight - (field.bbox.y + field.bbox.height) * scaleY

    page.drawImage(signatureImage, {
      x: fieldX + (fieldWidth - drawWidth) / 2,
      y: fieldY + (fieldHeight - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight,
    })
  }

  const bytes = await pdfDocument.save()
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = "signed-attention.pdf"
  anchor.click()
  URL.revokeObjectURL(url)
}

export function ESignature() {
  const [field, setField] = React.useState<SignatureField>(INITIAL_FIELD)
  const [reactPdf, setReactPdf] = React.useState<ReactPdfModule | null>(null)
  const [loadError, setLoadError] = React.useState(false)
  const [isDrawing, setIsDrawing] = React.useState(false)
  const [drawStart, setDrawStart] = React.useState<{
    x: number
    y: number
  } | null>(null)
  const [draftBox, setDraftBox] = React.useState<BoundingBox | null>(null)
  const [dragOffset, setDragOffset] = React.useState<{
    x: number
    y: number
  } | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [isDownloading, setIsDownloading] = React.useState(false)

  React.useEffect(() => {
    let mounted = true

    void import("react-pdf")
      .then((module) => {
        module.pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL

        if (mounted) {
          setReactPdf(module)
        }
      })
      .catch(() => {
        if (mounted) {
          setLoadError(true)
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  const handlePagePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDrawing) return

      const point = getPointerPagePoint(event, event.currentTarget)
      event.currentTarget.setPointerCapture(event.pointerId)
      setDrawStart(point)
      setDraftBox({
        x: point.x,
        y: point.y,
        width: MIN_FIELD_WIDTH,
        height: MIN_FIELD_HEIGHT,
      })
    },
    [isDrawing]
  )

  const handlePagePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (drawStart) {
        const point = getPointerPagePoint(event, event.currentTarget)
        setDraftBox(normalizeBoundingBox(drawStart, point))
        return
      }

      if (dragOffset) {
        const point = getPointerPagePoint(event, event.currentTarget)
        setField((previousField) => ({
          ...previousField,
          bbox: {
            ...previousField.bbox,
            x: clamp(
              point.x - dragOffset.x,
              0,
              PAGE_WIDTH - previousField.bbox.width
            ),
            y: clamp(
              point.y - dragOffset.y,
              0,
              PAGE_HEIGHT - previousField.bbox.height
            ),
          },
        }))
      }
    },
    [dragOffset, drawStart]
  )

  const handlePagePointerUp = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (draftBox) {
        setField((previousField) => ({
          ...previousField,
          bbox: draftBox,
        }))
      }

      if (drawStart || dragOffset) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      setDrawStart(null)
      setDraftBox(null)
      setDragOffset(null)
      setIsDrawing(false)
    },
    [draftBox, dragOffset, drawStart]
  )

  const handleDragStart = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (isDrawing) return

      event.stopPropagation()
      const page = event.currentTarget.closest<HTMLElement>(
        "[data-signature-page]"
      )
      if (!page) return

      const point = getPointerPagePoint(event, page)
      page.setPointerCapture(event.pointerId)
      setDragOffset({
        x: point.x - field.bbox.x,
        y: point.y - field.bbox.y,
      })
    },
    [field.bbox.x, field.bbox.y, isDrawing]
  )

  const handleDownload = React.useCallback(async () => {
    setIsDownloading(true)
    try {
      await downloadSignedPdf(field)
    } finally {
      setIsDownloading(false)
    }
  }, [field])

  return (
    <div className="grid h-[620px] overflow-hidden bg-background lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-h-0 min-w-0 flex-col border-b lg:border-r lg:border-b-0">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
          <div className="mr-auto text-sm font-medium">PDF Viewer</div>
          <Button
            type="button"
            size="sm"
            variant={isDrawing ? "default" : "outline"}
            onClick={() => setIsDrawing((value) => !value)}
          >
            <HugeiconsIcon icon={BorderFullIcon} className="size-4" />
            Draw
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!field.imageDataUrl || isDownloading}
            onClick={handleDownload}
          >
            <HugeiconsIcon icon={Download01Icon} className="size-4" />
            Download
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-muted/30">
          {loadError ? (
            <div className="grid h-full place-items-center p-6 text-sm text-muted-foreground">
              Unable to load the PDF preview.
            </div>
          ) : reactPdf ? (
            <reactPdf.Document
              file={PDF_URL}
              className="flex min-h-full w-max min-w-full flex-col items-center p-6"
              loading={
                <div className="grid h-full min-h-80 place-items-center">
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    className="size-4 animate-spin"
                  />
                </div>
              }
              error={null}
              onLoadError={() => setLoadError(true)}
            >
              <ESignaturePage
                reactPdf={reactPdf}
                field={field}
                isDrawing={isDrawing}
                draftBox={draftBox}
                onPointerDown={handlePagePointerDown}
                onPointerMove={handlePagePointerMove}
                onPointerUp={handlePagePointerUp}
                onDragStart={handleDragStart}
              />
            </reactPdf.Document>
          ) : (
            <div className="grid h-full min-h-80 place-items-center">
              <HugeiconsIcon
                icon={Loading03Icon}
                className="size-4 animate-spin"
              />
            </div>
          )}
        </div>
      </div>
      <aside className="flex min-h-0 flex-col">
        <div className="border-b px-4 py-3">
          <div className="text-sm font-medium">Fields</div>
          <div className="text-xs text-muted-foreground">
            Draw, drag, sign, then download.
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="rounded-lg border bg-background p-3">
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-300">
                <HugeiconsIcon icon={FilePenIcon} className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">{field.label}</div>
                  <div
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs",
                      field.imageDataUrl
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {field.imageDataUrl ? "Signed" : "Unsigned"}
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {Math.round(field.bbox.width)} x{" "}
                  {Math.round(field.bbox.height)} on page {field.page}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={field.imageDataUrl ? "outline" : "default"}
                  className="mt-3 w-full"
                  onClick={() => setDialogOpen(true)}
                >
                  <HugeiconsIcon icon={Pen01Icon} className="size-4" />
                  {field.imageDataUrl ? "Edit signature" : "Sign"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </aside>
      <SignatureDialog
        open={dialogOpen}
        fieldBbox={field.bbox}
        onOpenChange={setDialogOpen}
        onConfirm={(imageDataUrl) => {
          setField((previousField) => ({ ...previousField, imageDataUrl }))
        }}
      />
    </div>
  )
}

export function ESignatureDemo() {
  const [isCodeVisible, setIsCodeVisible] = React.useState(false)

  return (
    <div
      data-slot="component-preview"
      className="group relative mt-4 mb-12 flex flex-col overflow-hidden rounded-xl border"
    >
      <ESignature />
      <div
        data-slot="code"
        data-mobile-code-visible={isCodeVisible}
        className="relative overflow-hidden **:data-[slot=copy-button]:right-4 **:data-[slot=copy-button]:hidden data-[mobile-code-visible=true]:**:data-[slot=copy-button]:flex [&_[data-rehype-pretty-code-figure]]:m-0! [&_[data-rehype-pretty-code-figure]]:rounded-t-none [&_[data-rehype-pretty-code-figure]]:border-t [&_pre]:max-h-72"
      >
        {isCodeVisible ? (
          <HighlightedCodeBlock
            code={eSignatureUsageCode}
            className="rounded-none border-x-0 border-b-0"
          />
        ) : (
          <div className="relative">
            <HighlightedCodeBlock
              code={eSignatureUsageCode}
              className="rounded-none border-x-0 border-b-0"
              maxHeightClassName="max-h-56"
              previewLines={10}
              showCopy={false}
            />
            <div className="absolute inset-0 flex items-center justify-center pb-4">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, var(--color-code), color-mix(in oklab, var(--color-code) 60%, transparent), transparent)",
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="relative z-10 rounded-lg bg-background text-foreground shadow-none hover:bg-muted dark:bg-background dark:text-foreground dark:hover:bg-muted"
                onClick={() => setIsCodeVisible(true)}
              >
                View Code
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const eSignatureUsageCode = `"use client";

import * as React from "react";
import type SignaturePad from "signature_pad";
import type * as ReactPdf from "react-pdf";

import { Button } from "@/components/ui/button";

const PDF_WORKER_URL = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();
const PDF_URL = "/samples/attention.pdf";
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
type ReactPdfModule = typeof ReactPdf;

type SignatureField = {
  page: number;
  bbox: { x: number; y: number; width: number; height: number };
  imageDataUrl?: string;
};

async function downloadSignedPdf(field: SignatureField) {
  const { PDFDocument } = await import("pdf-lib");
  const bytes = await fetch(PDF_URL).then((response) => response.arrayBuffer());
  const pdf = await PDFDocument.load(bytes);
  const page = pdf.getPage(field.page - 1);

  if (field.imageDataUrl) {
    const image = await pdf.embedPng(field.imageDataUrl);
    const { width, height } = page.getSize();
    const scaleX = width / PAGE_WIDTH;
    const scaleY = height / PAGE_HEIGHT;
    const fieldWidth = field.bbox.width * scaleX;
    const fieldHeight = field.bbox.height * scaleY;
    const imageAspectRatio = image.width / image.height;
    const fieldAspectRatio = fieldWidth / fieldHeight;
    const drawWidth =
      fieldAspectRatio > imageAspectRatio ? fieldHeight * imageAspectRatio : fieldWidth;
    const drawHeight =
      fieldAspectRatio > imageAspectRatio ? fieldHeight : fieldWidth / imageAspectRatio;
    const fieldX = field.bbox.x * scaleX;
    const fieldY = height - (field.bbox.y + field.bbox.height) * scaleY;

    page.drawImage(image, {
      x: fieldX + (fieldWidth - drawWidth) / 2,
      y: fieldY + (fieldHeight - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight,
    });
  }

  const signedBytes = await pdf.save();
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(signedBytes)], { type: "application/pdf" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "signed-document.pdf";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ESignature() {
  const [field, setField] = React.useState<SignatureField>({
    page: 1,
    bbox: { x: 300, y: 504, width: 250, height: 58 },
  });
  const [reactPdf, setReactPdf] = React.useState<ReactPdfModule | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const signaturePadRef = React.useRef<SignaturePad | null>(null);

  React.useEffect(() => {
    if (!canvasRef.current) return;
    let mounted = true;

    void import("signature_pad").then(({ default: SignaturePad }) => {
      if (!mounted || !canvasRef.current) return;
      signaturePadRef.current = new SignaturePad(canvasRef.current);
    });

    return () => signaturePadRef.current?.off();
  }, []);

  React.useEffect(() => {
    let mounted = true;

    void import("react-pdf").then((module) => {
      module.pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
      if (mounted) setReactPdf(module);
    });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      <Button variant="outline" onClick={() => downloadSignedPdf(field)}>
        Download
      </Button>
      {reactPdf ? (
      <reactPdf.Document file={PDF_URL}>
        <div className="relative w-[430px]">
          <reactPdf.Page pageNumber={field.page} width={430} renderTextLayer={false} />
          <div className="absolute border border-blue-500/70" />
        </div>
      </reactPdf.Document>
      ) : null}
      <div
        className="relative w-[430px] overflow-hidden rounded-md border border-dashed bg-white"
        style={{ aspectRatio: field.bbox.width / field.bbox.height }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 size-full touch-none" />
      </div>
      <Button
        variant={field.imageDataUrl ? "outline" : "default"}
        onClick={() => {
          const value = signaturePadRef.current?.toDataURL("image/png");
          if (value) setField((current) => ({ ...current, imageDataUrl: value }));
        }}
      >
        {field.imageDataUrl ? "Edit signature" : "Confirm signature"}
      </Button>
    </div>
  );
}`

export function ESignatureSource() {
  return <HighlightedCodeBlock code={eSignatureUsageCode} />
}
