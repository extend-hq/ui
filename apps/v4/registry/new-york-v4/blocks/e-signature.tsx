"use client"

import * as React from "react"
import {
  Download01Icon,
  FilePenIcon,
  Pen01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type SignaturePad from "signature_pad"

import { cn } from "@/lib/utils"
import { PDFViewer } from "@/components/ui/pdf-viewer"
import { PdfBlockResizableShell } from "@/components/pdf-block-resizable-shell"
import { Button } from "@/registry/new-york-v4/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from "@/registry/new-york-v4/ui/dialog"
import { ScrollArea } from "@/registry/new-york-v4/ui/scroll-area"

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

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const DEFAULT_ZOOM = 0.75
const SIGNATURE_PAD_PADDING = 8
const DEFAULT_SIGNATURE_ASPECT_RATIO = 3

const INITIAL_FIELD: SignatureField = {
  id: "signature-1",
  label: "Signature",
  page: 1,
  bbox: { x: 300, y: 504, width: 250, height: 58 },
}

function bboxToStyle(bbox: BoundingBox): React.CSSProperties {
  return {
    left: `${(bbox.x / PAGE_WIDTH) * 100}%`,
    top: `${(bbox.y / PAGE_HEIGHT) * 100}%`,
    width: `${(bbox.width / PAGE_WIDTH) * 100}%`,
    height: `${(bbox.height / PAGE_HEIGHT) * 100}%`,
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
  initialValue,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  fieldBbox: BoundingBox
  initialValue?: string
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

      await loadSignature(initialValue)
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
  }, [open, guideSize, initialValue])

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
  onOpen,
}: {
  field: SignatureField
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        "absolute z-20 overflow-hidden rounded-[3px] border border-blue-500/70 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        field.imageDataUrl
          ? "bg-transparent shadow-none hover:bg-blue-500/5"
          : "bg-blue-500/10 hover:bg-blue-500/15"
      )}
      style={bboxToStyle(field.bbox)}
      onClick={onOpen}
    >
      {field.imageDataUrl ? (
        <img
          src={field.imageDataUrl}
          alt=""
          className="size-full object-contain"
          draggable={false}
        />
      ) : (
        <span className="flex size-full items-center justify-center gap-1.5 px-2 text-[11px] font-medium text-blue-700 dark:text-blue-300">
          <HugeiconsIcon icon={Pen01Icon} className="size-3.5" />
          Signature
        </span>
      )}
    </button>
  )
}

async function downloadSignedPdf({
  file,
  field,
}: {
  file: string
  field: SignatureField
}) {
  const { PDFDocument } = await import("pdf-lib")
  const existingPdfBytes = await fetch(file).then((response) =>
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
  anchor.download = "signed-document.pdf"
  anchor.click()
  URL.revokeObjectURL(url)
}

function SignatureFieldsPanel({
  field,
  className,
  canExport,
  isDownloading,
  onSign,
  onClear,
  onDownload,
}: {
  field: SignatureField
  className?: string
  canExport: boolean
  isDownloading: boolean
  onSign: () => void
  onClear: () => void
  onDownload: () => void
}) {
  return (
    <aside className={cn("flex min-h-0 flex-col bg-background", className)}>
      <ScrollArea className="min-h-0 flex-1" scrollFade>
        <div className="space-y-4 p-4">
          <div className="space-y-1">
            <h3 className="text-sm font-medium">Signature fields</h3>
            <p className="text-xs text-muted-foreground">
              Review fields, collect signatures, and export a signed PDF.
            </p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <div className="flex items-start gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-300">
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
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={field.imageDataUrl ? "outline" : "default"}
                    className="flex-1"
                    onClick={onSign}
                  >
                    <HugeiconsIcon icon={Pen01Icon} className="size-4" />
                    {field.imageDataUrl ? "Edit" : "Sign"}
                  </Button>
                  {field.imageDataUrl ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={onClear}
                    >
                      Clear
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={!canExport || isDownloading}
            onClick={onDownload}
          >
            <HugeiconsIcon icon={Download01Icon} className="size-4" />
            {isDownloading ? "Exporting..." : "Export signed PDF"}
          </Button>
        </div>
      </ScrollArea>
    </aside>
  )
}

export function ESignatureBlock({ file }: { file?: string }) {
  const [field, setField] = React.useState<SignatureField>(INITIAL_FIELD)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [isDownloading, setIsDownloading] = React.useState(false)

  const handleDownload = React.useCallback(async () => {
    if (!file || !field.imageDataUrl) return

    setIsDownloading(true)
    try {
      await downloadSignedPdf({ file, field })
    } finally {
      setIsDownloading(false)
    }
  }, [field, file])

  return (
    <>
      <PdfBlockResizableShell
        autoSaveId="pdf-block-e-signature"
        left={
          <PDFViewer
            file={file}
            defaultZoom={DEFAULT_ZOOM}
            pageWidth={PAGE_WIDTH}
            pageHeight={PAGE_HEIGHT}
            toolbarActions={
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!file || !field.imageDataUrl || isDownloading}
                onClick={handleDownload}
              >
                <HugeiconsIcon icon={Download01Icon} className="size-4" />
                Download
              </Button>
            }
            renderPageOverlay={({ pageNumber }) =>
              pageNumber === field.page ? (
                <SignatureFieldOverlay
                  field={field}
                  onOpen={() => setDialogOpen(true)}
                />
              ) : null
            }
          />
        }
        right={
          <SignatureFieldsPanel
            field={field}
            canExport={Boolean(file && field.imageDataUrl)}
            isDownloading={isDownloading}
            onSign={() => setDialogOpen(true)}
            onClear={() =>
              setField((previousField) => ({
                ...previousField,
                imageDataUrl: undefined,
              }))
            }
            onDownload={handleDownload}
          />
        }
      />
      <SignatureDialog
        open={dialogOpen}
        fieldBbox={field.bbox}
        initialValue={field.imageDataUrl}
        onOpenChange={setDialogOpen}
        onConfirm={(imageDataUrl) => {
          setField((previousField) => ({ ...previousField, imageDataUrl }))
        }}
      />
    </>
  )
}
