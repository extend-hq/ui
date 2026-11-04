import type { ViewportEvent, ViewportMetrics } from "@embedpdf/plugin-viewport"

type PdfViewportReadySource = {
  forDocument: (documentId: string) => {
    getMetrics: () => ViewportMetrics
  }
  onViewportResize: (listener: (event: ViewportEvent) => void) => () => void
}

function hasVisibleArea(metrics: ViewportMetrics) {
  return metrics.clientWidth > 0 && metrics.clientHeight > 0
}

/**
 * Runs setup once EmbedPDF has measured a visible viewport.
 *
 * A fast route remount can load the PDF before ResizeObserver reports the new
 * viewport size. EmbedPDF ignores numeric zoom requests while either dimension
 * is zero, so the caller must retry after the first usable measurement.
 */
export function whenPdfViewportReady(
  viewport: PdfViewportReadySource,
  documentId: string,
  setup: () => void
) {
  let complete = false
  let unsubscribe: (() => void) | undefined = undefined

  const finish = () => {
    if (complete) return
    complete = true
    setup()
    unsubscribe?.()
  }

  if (hasVisibleArea(viewport.forDocument(documentId).getMetrics())) {
    finish()
    return () => undefined
  }

  unsubscribe = viewport.onViewportResize((event) => {
    if (event.documentId === documentId && hasVisibleArea(event.metrics))
      finish()
  })

  // Behavior emitters can call the listener during subscription.
  if (complete) unsubscribe()

  return () => unsubscribe?.()
}
