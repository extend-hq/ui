"use client"

import * as React from "react"
import {
  BorderFullIcon,
  Download01Icon,
  FilePenIcon,
  Pen01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type SignaturePad from "signature_pad"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PDFViewer } from "@/components/ui/pdf-viewer"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DocsSourceCodeBlock,
  DocsViewCodeBlock,
} from "@/components/docs-code-block"
import { PdfBlockResizableShell } from "@/components/pdf-block-resizable-shell"
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

const PDF_URL = "/samples/loan-application.pdf"
const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const DEFAULT_ZOOM = 0.75
const MIN_FIELD_WIDTH = 96
const MIN_FIELD_HEIGHT = 34
const SIGNATURE_PAD_PADDING = 8
const SIGNATURE_PAD_BACKGROUND_COLOR = "#ffffff"
const SIGNATURE_PAD_PEN_COLOR = "#000000"
const DEFAULT_SIGNATURE_ASPECT_RATIO = 3

const INITIAL_FIELD: SignatureField = {
  id: "signature-1",
  label: "Loan originator signature",
  page: 1,
  bbox: {
    x: 88,
    y: 177,
    width: 294,
    height: 42,
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
  const isDraggingRight = end.x >= start.x
  const isDraggingDown = end.y >= start.y
  const maxWidth = isDraggingRight ? PAGE_WIDTH - start.x : start.x
  const maxHeight = isDraggingDown ? PAGE_HEIGHT - start.y : start.y
  const width = Math.min(
    Math.max(Math.abs(end.x - start.x), Math.min(MIN_FIELD_WIDTH, maxWidth)),
    maxWidth
  )
  const height = Math.min(
    Math.max(Math.abs(end.y - start.y), Math.min(MIN_FIELD_HEIGHT, maxHeight)),
    maxHeight
  )
  const x = isDraggingRight ? start.x : start.x - width
  const y = isDraggingDown ? start.y : start.y - height

  return {
    x: clamp(x, 0, PAGE_WIDTH),
    y: clamp(y, 0, PAGE_HEIGHT),
    width: clamp(width, 0, PAGE_WIDTH - x),
    height: clamp(height, 0, PAGE_HEIGHT - y),
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

function getSignatureDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png")
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
        minWidth: 1,
        maxWidth: 2,
        penColor: SIGNATURE_PAD_PEN_COLOR,
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
          <div className="rounded-xl border bg-white p-3 text-slate-950 shadow-xs dark:bg-white dark:text-slate-950">
            <div
              ref={canvasContainerRef}
              className="flex h-56 w-full items-center justify-center overflow-hidden rounded-lg bg-white p-2 dark:bg-white"
            >
              <div
                className={cn(
                  "relative overflow-hidden rounded-[3px] border border-dashed border-blue-500/70 bg-white",
                  isReady ? "cursor-crosshair" : "cursor-wait"
                )}
                style={{
                  width: guideSize ? `${guideSize.width}px` : undefined,
                  height: guideSize ? `${guideSize.height}px` : undefined,
                  opacity: guideSize ? 1 : 0,
                  backgroundColor: SIGNATURE_PAD_BACKGROUND_COLOR,
                }}
              >
                <canvas
                  ref={canvasRef}
                  className={cn(
                    "absolute inset-0 size-full touch-none",
                    !isReady && "pointer-events-none"
                  )}
                  style={{
                    backgroundColor: SIGNATURE_PAD_BACKGROUND_COLOR,
                    touchAction: "none",
                  }}
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

                onConfirm(getSignatureDataUrl(canvas))
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
          className="size-full object-fill"
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
    const fieldX = field.bbox.x * scaleX
    const fieldY = pageHeight - (field.bbox.y + field.bbox.height) * scaleY

    page.drawImage(signatureImage, {
      x: fieldX,
      y: fieldY,
      width: fieldWidth,
      height: fieldHeight,
    })
  }

  const bytes = await pdfDocument.save()
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = "signed-loan-application.pdf"
  anchor.click()
  URL.revokeObjectURL(url)
}

function SignatureFieldsPanel({
  field,
  className,
  onFieldChange,
}: {
  field: SignatureField
  className?: string
  onFieldChange: (field: SignatureField) => void
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false)

  return (
    <aside
      className={cn("flex h-[420px] min-h-0 flex-col bg-background", className)}
    >
      <ScrollArea className="min-h-0 flex-1" scrollFade>
        <div className="p-3">
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
      </ScrollArea>
      <SignatureDialog
        open={dialogOpen}
        fieldBbox={field.bbox}
        initialValue={field.imageDataUrl}
        onOpenChange={setDialogOpen}
        onConfirm={(imageDataUrl) => {
          onFieldChange({ ...field, imageDataUrl })
        }}
      />
    </aside>
  )
}

export function ESignature() {
  const [field, setField] = React.useState<SignatureField>(INITIAL_FIELD)

  return <SignatureFieldsPanel field={field} onFieldChange={setField} />
}

export function ESignatureBlock({
  defaultViewerZoom = DEFAULT_ZOOM,
}: {
  defaultViewerZoom?: number
} = {}) {
  const [field, setField] = React.useState<SignatureField>(INITIAL_FIELD)
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
  const [isDownloading, setIsDownloading] = React.useState(false)

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
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId)
        }
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
        "[data-pdf-viewer-page]"
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
    <PdfBlockResizableShell
      autoSaveId="pdf-block-e-signature"
      left={
        <PDFViewer
          file={PDF_URL}
          defaultZoom={defaultViewerZoom}
          pageWidth={PAGE_WIDTH}
          pageHeight={PAGE_HEIGHT}
          pageClassName={() =>
            cn("touch-none select-none", isDrawing && "cursor-crosshair")
          }
          toolbarActions={
            <>
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
            </>
          }
          onPagePointerMove={handlePagePointerMove}
          onPagePointerUp={handlePagePointerUp}
          onPagePointerCancel={handlePagePointerUp}
          renderPageOverlay={({ pageNumber }) =>
            pageNumber === field.page ? (
              <>
                <SignatureFieldOverlay
                  field={field}
                  isDrawing={isDrawing}
                  onDragStart={handleDragStart}
                />
                {isDrawing ? (
                  <div
                    className="absolute inset-0 z-40 cursor-crosshair touch-none"
                    onPointerDown={(event) => {
                      event.stopPropagation()
                      handlePagePointerDown(event)
                    }}
                    onPointerMove={(event) => {
                      event.stopPropagation()
                      handlePagePointerMove(event)
                    }}
                    onPointerUp={(event) => {
                      event.stopPropagation()
                      handlePagePointerUp(event)
                    }}
                    onPointerCancel={(event) => {
                      event.stopPropagation()
                      handlePagePointerUp(event)
                    }}
                  />
                ) : null}
                {draftBox ? (
                  <div
                    className="pointer-events-none absolute z-50 rounded-[3px] border border-dashed border-blue-500/70 bg-blue-500/10"
                    style={bboxToStyle(draftBox)}
                  />
                ) : null}
              </>
            ) : null
          }
        />
      }
      right={
        <SignatureFieldsPanel
          field={field}
          className="h-full"
          onFieldChange={setField}
        />
      }
    />
  )
}

function SignatureFieldExampleCard({
  label,
  status = "unsigned",
  pageLabel,
  description,
  iconClassName,
  actionLabel,
  onAction,
}: {
  label: string
  status?: "unsigned" | "signed" | "optional"
  pageLabel?: string
  description?: string
  iconClassName?: string
  actionLabel?: string
  onAction?: () => void
}) {
  const statusLabel =
    status === "signed"
      ? "Signed"
      : status === "optional"
        ? "Optional"
        : "Needs signature"

  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-300",
            iconClassName
          )}
        >
          <HugeiconsIcon icon={FilePenIcon} className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="truncate text-sm font-medium">{label}</div>
            {pageLabel ? (
              <div className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {pageLabel}
              </div>
            ) : null}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {statusLabel}
            {description ? ` · ${description}` : null}
          </div>
          <Button
            type="button"
            size="sm"
            variant={status === "signed" ? "outline" : "default"}
            className="mt-3 w-full"
            onClick={onAction}
          >
            <HugeiconsIcon icon={Pen01Icon} className="size-4" />
            {actionLabel ?? (status === "signed" ? "Edit signature" : "Sign")}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ESignatureExample() {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [signatureSigned, setSignatureSigned] = React.useState(false)

  return (
    <>
      <div className="flex h-[420px] flex-col gap-2 bg-background p-3">
        <SignatureFieldExampleCard
          label="Loan originator signature"
          status={signatureSigned ? "signed" : "unsigned"}
          pageLabel="p. 1"
          description={
            signatureSigned ? "Completed just now" : "294 x 42 field"
          }
          actionLabel={signatureSigned ? "Edit signature" : undefined}
          onAction={() => setDialogOpen(true)}
        />
        <SignatureFieldExampleCard
          label="Initials"
          status="signed"
          pageLabel="p. 2"
          description="Completed by Andrew"
          iconClassName="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          onAction={() => setDialogOpen(true)}
        />
      </div>
      <SignatureDialog
        open={dialogOpen}
        fieldBbox={INITIAL_FIELD.bbox}
        onOpenChange={setDialogOpen}
        onConfirm={() => {
          setSignatureSigned(true)
        }}
      />
    </>
  )
}

export function ESignatureDemo() {
  return (
    <div
      data-slot="component-preview"
      className="group relative mt-4 mb-12 flex flex-col overflow-hidden rounded-xl border"
    >
      <ESignatureExample />
      <DocsViewCodeBlock code={eSignatureUsageCode} />
    </div>
  )
}

const eSignatureUsageCode = `"use client";

import { SignatureFieldCard } from "@/components/ui/signature-field-card";

export function ESignatureExample() {
  return (
    <div className="flex h-[420px] flex-col gap-2 bg-background p-3">
      <SignatureFieldCard
        label="Loan originator signature"
        pageLabel="p. 1"
        description="294 x 42 field"
        onAction={() => {}}
      />
      <SignatureFieldCard
        label="Initials"
        status="signed"
        pageLabel="p. 2"
        description="Completed by Andrew"
        iconClassName="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        onAction={() => {}}
      />
    </div>
  );
}`

const eSignatureSourceCode =
  '"use client"\n\nimport * as React from "react"\nimport {\n  Download01Icon,\n  FilePenIcon,\n  Pen01Icon,\n} from "@hugeicons/core-free-icons"\nimport { HugeiconsIcon } from "@hugeicons/react"\nimport type SignaturePad from "signature_pad"\n\nimport { cn } from "@/lib/utils"\nimport { PDFViewer } from "@/components/ui/pdf-viewer"\nimport { PdfBlockResizableShell } from "@/components/pdf-block-resizable-shell"\nimport { Button } from "@/registry/new-york-v4/ui/button"\nimport {\n  Dialog,\n  DialogContent,\n  DialogDescription,\n  DialogFooter,\n  DialogHeader,\n  DialogPanel,\n  DialogTitle,\n} from "@/registry/new-york-v4/ui/dialog"\nimport { ScrollArea } from "@/registry/new-york-v4/ui/scroll-area"\n\ntype BoundingBox = {\n  x: number\n  y: number\n  width: number\n  height: number\n}\n\ntype SignatureField = {\n  id: string\n  label: string\n  page: number\n  bbox: BoundingBox\n  imageDataUrl?: string\n}\n\nconst PAGE_WIDTH = 612\nconst PAGE_HEIGHT = 792\nconst DEFAULT_ZOOM = 0.75\nconst SIGNATURE_PAD_PADDING = 8\nconst SIGNATURE_PAD_BACKGROUND_COLOR = "#ffffff"\nconst SIGNATURE_PAD_PEN_COLOR = "#000000"\nconst DEFAULT_SIGNATURE_ASPECT_RATIO = 3\n\nconst INITIAL_FIELD: SignatureField = {\n  id: "signature-1",\n  label: "Signature",\n  page: 1,\n  bbox: { x: 300, y: 504, width: 250, height: 58 },\n}\n\nfunction bboxToStyle(bbox: BoundingBox): React.CSSProperties {\n  return {\n    left: `${(bbox.x / PAGE_WIDTH) * 100}%`,\n    top: `${(bbox.y / PAGE_HEIGHT) * 100}%`,\n    width: `${(bbox.width / PAGE_WIDTH) * 100}%`,\n    height: `${(bbox.height / PAGE_HEIGHT) * 100}%`,\n  }\n}\n\nfunction getSignatureAspectRatio(bbox?: BoundingBox): number {\n  if (!bbox || bbox.width <= 0 || bbox.height <= 0) {\n    return DEFAULT_SIGNATURE_ASPECT_RATIO\n  }\n\n  return bbox.width / bbox.height\n}\n\nfunction getSignatureGuideSize({\n  containerWidth,\n  containerHeight,\n  aspectRatio,\n}: {\n  containerWidth: number\n  containerHeight: number\n  aspectRatio: number\n}): { width: number; height: number } {\n  const maxWidth = Math.max(containerWidth - SIGNATURE_PAD_PADDING * 2, 1)\n  const maxHeight = Math.max(containerHeight - SIGNATURE_PAD_PADDING * 2, 1)\n\n  if (maxWidth / maxHeight > aspectRatio) {\n    const height = maxHeight\n    return {\n      width: height * aspectRatio,\n      height,\n    }\n  }\n\n  const width = maxWidth\n  return {\n    width,\n    height: width / aspectRatio,\n  }\n}\n\nfunction getSignatureDataUrl(canvas: HTMLCanvasElement): string {\n  return canvas.toDataURL("image/png")\n}\n\nfunction SignatureDialog({\n  open,\n  fieldBbox,\n  initialValue,\n  onOpenChange,\n  onConfirm,\n}: {\n  open: boolean\n  fieldBbox: BoundingBox\n  initialValue?: string\n  onOpenChange: (open: boolean) => void\n  onConfirm: (value: string) => void\n}) {\n  const canvasContainerRef = React.useRef<HTMLDivElement>(null)\n  const canvasRef = React.useRef<HTMLCanvasElement>(null)\n  const signaturePadRef = React.useRef<SignaturePad | null>(null)\n  const [isReady, setIsReady] = React.useState(false)\n  const [hasSignature, setHasSignature] = React.useState(false)\n  const [guideSize, setGuideSize] = React.useState<{\n    width: number\n    height: number\n  } | null>(null)\n  const signatureAspectRatio = React.useMemo(\n    () => getSignatureAspectRatio(fieldBbox),\n    [fieldBbox]\n  )\n\n  React.useEffect(() => {\n    if (!open) {\n      setGuideSize(null)\n      return\n    }\n\n    let frameId = 0\n    let resizeObserver: ResizeObserver | null = null\n\n    const updateGuideSize = (container?: HTMLDivElement | null) => {\n      const currentContainer = container ?? canvasContainerRef.current\n      if (\n        !currentContainer ||\n        currentContainer.clientWidth <= 0 ||\n        currentContainer.clientHeight <= 0\n      ) {\n        return false\n      }\n\n      const nextSize = getSignatureGuideSize({\n        containerWidth: currentContainer.clientWidth,\n        containerHeight: currentContainer.clientHeight,\n        aspectRatio: signatureAspectRatio,\n      })\n\n      setGuideSize((previousSize) => {\n        if (\n          previousSize &&\n          Math.abs(previousSize.width - nextSize.width) < 0.5 &&\n          Math.abs(previousSize.height - nextSize.height) < 0.5\n        ) {\n          return previousSize\n        }\n\n        return nextSize\n      })\n\n      return true\n    }\n\n    const connect = () => {\n      const container = canvasContainerRef.current\n      if (!updateGuideSize(container)) {\n        frameId = window.requestAnimationFrame(connect)\n        return\n      }\n\n      if (container) {\n        resizeObserver = new ResizeObserver(() => {\n          updateGuideSize(container)\n        })\n        resizeObserver.observe(container)\n      }\n    }\n\n    connect()\n\n    return () => {\n      window.cancelAnimationFrame(frameId)\n      resizeObserver?.disconnect()\n    }\n  }, [open, signatureAspectRatio])\n\n  React.useEffect(() => {\n    if (!open || !guideSize || guideSize.width <= 1 || guideSize.height <= 1) {\n      signaturePadRef.current?.off()\n      signaturePadRef.current = null\n      setIsReady(false)\n      if (!open) {\n        setHasSignature(false)\n      }\n      return\n    }\n\n    let cancelled = false\n    let resizeObserver: ResizeObserver | null = null\n\n    const syncCanvasSize = (canvas: HTMLCanvasElement) => {\n      const width = Math.max(canvas.offsetWidth, 1)\n      const height = Math.max(canvas.offsetHeight, 1)\n      const ratio = Math.max(window.devicePixelRatio || 1, 1)\n\n      canvas.style.width = `${width}px`\n      canvas.style.height = `${height}px`\n      canvas.width = Math.floor(width * ratio)\n      canvas.height = Math.floor(height * ratio)\n      const context = canvas.getContext("2d")\n      context?.setTransform(1, 0, 0, 1, 0, 0)\n      context?.scale(ratio, ratio)\n\n      return { width, height, ratio }\n    }\n\n    const initialize = async () => {\n      const canvas = canvasRef.current\n      if (!canvas) return\n\n      const { default: SignaturePadConstructor } = await import("signature_pad")\n      if (cancelled) return\n\n      const signaturePad = new SignaturePadConstructor(canvas, {\n        minWidth: 1,\n        maxWidth: 2,\n        penColor: SIGNATURE_PAD_PEN_COLOR,\n      })\n\n      signaturePadRef.current = signaturePad\n\n      const loadSignature = async (dataUrl?: string) => {\n        const size = syncCanvasSize(canvas)\n\n        if (dataUrl) {\n          await signaturePad.fromDataURL(dataUrl, size)\n          setHasSignature(true)\n          return\n        }\n\n        signaturePad.clear()\n        setHasSignature(false)\n      }\n\n      await loadSignature(initialValue)\n      if (cancelled) return\n\n      signaturePad.addEventListener("endStroke", () => {\n        setHasSignature(true)\n      })\n\n      resizeObserver = new ResizeObserver(() => {\n        const currentCanvas = canvasRef.current\n        const currentSignaturePad = signaturePadRef.current\n        if (!currentCanvas || !currentSignaturePad) return\n\n        const previousSignature = currentSignaturePad.isEmpty()\n          ? undefined\n          : currentSignaturePad.toDataURL("image/png")\n        void loadSignature(previousSignature)\n      })\n      resizeObserver.observe(canvas)\n      setIsReady(true)\n    }\n\n    const animationFrame = window.requestAnimationFrame(() => {\n      void initialize()\n    })\n\n    return () => {\n      cancelled = true\n      window.cancelAnimationFrame(animationFrame)\n      resizeObserver?.disconnect()\n      signaturePadRef.current?.off()\n      signaturePadRef.current = null\n      setIsReady(false)\n    }\n  }, [open, guideSize, initialValue])\n\n  return (\n    <Dialog open={open} onOpenChange={onOpenChange}>\n      <DialogContent className="max-w-xl">\n        <DialogHeader>\n          <DialogTitle>Add signature</DialogTitle>\n          <DialogDescription>\n            Draw a signature to place it into the selected PDF field.\n          </DialogDescription>\n        </DialogHeader>\n        <DialogPanel>\n          <div className="rounded-xl border bg-white p-3 text-slate-950 shadow-xs dark:bg-white dark:text-slate-950">\n            <div\n              ref={canvasContainerRef}\n              className="flex h-56 w-full items-center justify-center overflow-hidden rounded-lg bg-white p-2 dark:bg-white"\n            >\n              <div\n                className={cn(\n                  "relative overflow-hidden rounded-[3px] border border-dashed border-blue-500/70 bg-white",\n                  isReady ? "cursor-crosshair" : "cursor-wait"\n                )}\n                style={{\n                  width: guideSize ? `${guideSize.width}px` : undefined,\n                  height: guideSize ? `${guideSize.height}px` : undefined,\n                  opacity: guideSize ? 1 : 0,\n                  backgroundColor: SIGNATURE_PAD_BACKGROUND_COLOR,\n                }}\n              >\n                <canvas\n                  ref={canvasRef}\n                  className={cn(\n                    "absolute inset-0 size-full touch-none",\n                    !isReady && "pointer-events-none"\n                  )}\n                  style={{\n                    backgroundColor: SIGNATURE_PAD_BACKGROUND_COLOR,\n                    touchAction: "none",\n                  }}\n                />\n              </div>\n            </div>\n          </div>\n        </DialogPanel>\n        <DialogFooter className="sm:justify-between">\n          <Button\n            type="button"\n            variant="outline"\n            disabled={!isReady}\n            onClick={() => {\n              signaturePadRef.current?.clear()\n              setHasSignature(false)\n            }}\n          >\n            Clear\n          </Button>\n          <div className="flex flex-col-reverse gap-2 sm:flex-row">\n            <Button\n              type="button"\n              variant="outline"\n              onClick={() => onOpenChange(false)}\n            >\n              Cancel\n            </Button>\n            <Button\n              type="button"\n              disabled={!isReady || !hasSignature}\n              onClick={() => {\n                const canvas = canvasRef.current\n                if (!canvas) return\n\n                onConfirm(getSignatureDataUrl(canvas))\n                onOpenChange(false)\n              }}\n            >\n              Confirm\n            </Button>\n          </div>\n        </DialogFooter>\n      </DialogContent>\n    </Dialog>\n  )\n}\n\nfunction SignatureFieldOverlay({\n  field,\n  onOpen,\n}: {\n  field: SignatureField\n  onOpen: () => void\n}) {\n  return (\n    <button\n      type="button"\n      className={cn(\n        "absolute z-20 overflow-hidden rounded-[3px] border border-blue-500/70 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",\n        field.imageDataUrl\n          ? "bg-transparent shadow-none hover:bg-blue-500/5"\n          : "bg-blue-500/10 hover:bg-blue-500/15"\n      )}\n      style={bboxToStyle(field.bbox)}\n      onClick={onOpen}\n    >\n      {field.imageDataUrl ? (\n        <img\n          src={field.imageDataUrl}\n          alt=""\n          className="size-full object-fill"\n          draggable={false}\n        />\n      ) : (\n        <span className="flex size-full items-center justify-center gap-1.5 px-2 text-[11px] font-medium text-blue-700 dark:text-blue-300">\n          <HugeiconsIcon icon={Pen01Icon} className="size-3.5" />\n          Signature\n        </span>\n      )}\n    </button>\n  )\n}\n\nasync function downloadSignedPdf({\n  file,\n  field,\n}: {\n  file: string\n  field: SignatureField\n}) {\n  const { PDFDocument } = await import("pdf-lib")\n  const existingPdfBytes = await fetch(file).then((response) =>\n    response.arrayBuffer()\n  )\n  const pdfDocument = await PDFDocument.load(existingPdfBytes)\n  const page = pdfDocument.getPage(field.page - 1)\n\n  if (field.imageDataUrl) {\n    const signatureImage = await pdfDocument.embedPng(field.imageDataUrl)\n    const { width: pageWidth, height: pageHeight } = page.getSize()\n    const scaleX = pageWidth / PAGE_WIDTH\n    const scaleY = pageHeight / PAGE_HEIGHT\n    const fieldWidth = field.bbox.width * scaleX\n    const fieldHeight = field.bbox.height * scaleY\n    const fieldX = field.bbox.x * scaleX\n    const fieldY = pageHeight - (field.bbox.y + field.bbox.height) * scaleY\n\n    page.drawImage(signatureImage, {\n      x: fieldX,\n      y: fieldY,\n      width: fieldWidth,\n      height: fieldHeight,\n    })\n  }\n\n  const bytes = await pdfDocument.save()\n  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" })\n  const url = URL.createObjectURL(blob)\n  const anchor = document.createElement("a")\n  anchor.href = url\n  anchor.download = "signed-document.pdf"\n  anchor.click()\n  URL.revokeObjectURL(url)\n}\n\nfunction SignatureFieldsPanel({\n  field,\n  className,\n  canExport,\n  isDownloading,\n  onSign,\n  onClear,\n  onDownload,\n}: {\n  field: SignatureField\n  className?: string\n  canExport: boolean\n  isDownloading: boolean\n  onSign: () => void\n  onClear: () => void\n  onDownload: () => void\n}) {\n  return (\n    <aside className={cn("flex min-h-0 flex-col bg-background", className)}>\n      <ScrollArea className="min-h-0 flex-1" scrollFade>\n        <div className="space-y-4 p-4">\n          <div className="space-y-1">\n            <h3 className="text-sm font-medium">Signature fields</h3>\n            <p className="text-xs text-muted-foreground">\n              Review fields, collect signatures, and export a signed PDF.\n            </p>\n          </div>\n          <div className="rounded-lg border bg-background p-3">\n            <div className="flex items-start gap-3">\n              <div className="grid size-9 shrink-0 place-items-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-300">\n                <HugeiconsIcon icon={FilePenIcon} className="size-4" />\n              </div>\n              <div className="min-w-0 flex-1">\n                <div className="flex items-center justify-between gap-2">\n                  <div className="text-sm font-medium">{field.label}</div>\n                  <div\n                    className={cn(\n                      "rounded-full px-2 py-0.5 text-xs",\n                      field.imageDataUrl\n                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"\n                        : "bg-muted text-muted-foreground"\n                    )}\n                  >\n                    {field.imageDataUrl ? "Signed" : "Unsigned"}\n                  </div>\n                </div>\n                <div className="mt-2 text-xs text-muted-foreground">\n                  {Math.round(field.bbox.width)} x{" "}\n                  {Math.round(field.bbox.height)} on page {field.page}\n                </div>\n                <div className="mt-3 flex gap-2">\n                  <Button\n                    type="button"\n                    size="sm"\n                    variant={field.imageDataUrl ? "outline" : "default"}\n                    className="flex-1"\n                    onClick={onSign}\n                  >\n                    <HugeiconsIcon icon={Pen01Icon} className="size-4" />\n                    {field.imageDataUrl ? "Edit" : "Sign"}\n                  </Button>\n                  {field.imageDataUrl ? (\n                    <Button\n                      type="button"\n                      size="sm"\n                      variant="outline"\n                      onClick={onClear}\n                    >\n                      Clear\n                    </Button>\n                  ) : null}\n                </div>\n              </div>\n            </div>\n          </div>\n          <Button\n            type="button"\n            className="w-full"\n            disabled={!canExport || isDownloading}\n            onClick={onDownload}\n          >\n            <HugeiconsIcon icon={Download01Icon} className="size-4" />\n            {isDownloading ? "Exporting..." : "Export signed PDF"}\n          </Button>\n        </div>\n      </ScrollArea>\n    </aside>\n  )\n}\n\nexport function ESignatureBlock({ file }: { file?: string }) {\n  const [field, setField] = React.useState<SignatureField>(INITIAL_FIELD)\n  const [dialogOpen, setDialogOpen] = React.useState(false)\n  const [isDownloading, setIsDownloading] = React.useState(false)\n\n  const handleDownload = React.useCallback(async () => {\n    if (!file || !field.imageDataUrl) return\n\n    setIsDownloading(true)\n    try {\n      await downloadSignedPdf({ file, field })\n    } finally {\n      setIsDownloading(false)\n    }\n  }, [field, file])\n\n  return (\n    <>\n      <PdfBlockResizableShell\n        autoSaveId="pdf-block-e-signature"\n        left={\n          <PDFViewer\n            file={file}\n            defaultZoom={DEFAULT_ZOOM}\n            pageWidth={PAGE_WIDTH}\n            pageHeight={PAGE_HEIGHT}\n            toolbarActions={\n              <Button\n                type="button"\n                size="sm"\n                variant="outline"\n                disabled={!file || !field.imageDataUrl || isDownloading}\n                onClick={handleDownload}\n              >\n                <HugeiconsIcon icon={Download01Icon} className="size-4" />\n                Download\n              </Button>\n            }\n            renderPageOverlay={({ pageNumber }) =>\n              pageNumber === field.page ? (\n                <SignatureFieldOverlay\n                  field={field}\n                  onOpen={() => setDialogOpen(true)}\n                />\n              ) : null\n            }\n          />\n        }\n        right={\n          <SignatureFieldsPanel\n            field={field}\n            canExport={Boolean(file && field.imageDataUrl)}\n            isDownloading={isDownloading}\n            onSign={() => setDialogOpen(true)}\n            onClear={() =>\n              setField((previousField) => ({\n                ...previousField,\n                imageDataUrl: undefined,\n              }))\n            }\n            onDownload={handleDownload}\n          />\n        }\n      />\n      <SignatureDialog\n        open={dialogOpen}\n        fieldBbox={field.bbox}\n        initialValue={field.imageDataUrl}\n        onOpenChange={setDialogOpen}\n        onConfirm={(imageDataUrl) => {\n          setField((previousField) => ({ ...previousField, imageDataUrl }))\n        }}\n      />\n    </>\n  )\n}\n'

export function ESignatureSource() {
  return (
    <DocsSourceCodeBlock
      code={eSignatureSourceCode}
      fileName="components/ui/e-signature.tsx"
    />
  )
}
