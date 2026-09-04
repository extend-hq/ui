"use client"

import * as React from "react"
import dynamic from "next/dynamic"

import { cn } from "@/lib/utils"
import { useMounted } from "@/hooks/use-mounted"
import { Spinner } from "@/components/ui/spinner"
import { DocsViewCodeBlock } from "@/components/docs-code-block"

function PdfEditorLoadingShell({
  heightClassName = "h-[720px]",
}: {
  heightClassName?: string
}) {
  return (
    <div
      data-slot="pdf-editor"
      data-loading
      className={cn(
        "flex w-full flex-col overflow-hidden bg-background",
        heightClassName
      )}
    >
      <div className="flex min-h-12 items-center border-b px-3" />
      <div className="flex min-h-10 items-center border-b bg-muted/30 px-3" />
      <div className="grid min-h-0 flex-1 place-items-center bg-muted/30">
        <Spinner className="size-4" />
      </div>
    </div>
  )
}

const PdfEditorPreview = dynamic(
  () =>
    import("@/components/pdf-editor-preview-client").then(
      (mod) => mod.PdfEditorPreviewClient
    ),
  {
    ssr: false,
    loading: () => <PdfEditorLoadingShell />,
  }
)

const PdfEditorSourceCode = dynamic(
  () =>
    import("@/components/pdf-editor-source-code").then(
      (mod) => mod.PdfEditorSourceCode
    ),
  {
    ssr: false,
    loading: () => <PdfEditorSourceShell />,
  }
)

const PdfEditorDependencySourceCode = dynamic(
  () =>
    import("@/components/pdf-editor-dependency-source-code").then(
      (mod) => mod.PdfEditorDependencySourceCode
    ),
  {
    ssr: false,
    loading: () => <PdfEditorSourceShell />,
  }
)

function PdfEditorSourceShell() {
  return (
    <div
      data-slot="pdf-editor-source-shell"
      className="h-72 rounded-lg border bg-code"
    />
  )
}

const pdfEditorUsageCode = `"use client";

import { PDFEditor } from "@/components/extend/pdf-editor";

export function PdfEditorExample() {
  return (
    <PDFEditor
      src="/path/to/document.pdf"
      className="h-[720px]"
      defaultMode="annotate"
      annotationAuthor="Jane Doe"
      onAnnotationsChange={(annotations) => {
        // Persist the annotation JSON however you like.
      }}
      onSave={({ buffer, fileName }) => {
        // Upload the edited PDF bytes to your backend.
      }}
    />
  );
}`

export function PdfEditorDemo() {
  return (
    <div
      data-slot="component-preview"
      className="group relative mt-4 mb-12 flex flex-col overflow-hidden rounded-xl border"
    >
      <PdfEditorPreview />
      <DocsViewCodeBlock code={pdfEditorUsageCode} />
    </div>
  )
}

export function PdfEditorBlock({
  heightClassName = "h-full",
}: {
  defaultViewerZoom?: number
  heightClassName?: string
}) {
  return <PdfEditorPreview heightClassName={heightClassName} />
}

export function PdfEditorSource({
  sharedDependencies = false,
}: {
  sharedDependencies?: boolean
}) {
  const [hasIntersected, setShouldLoadSource] = React.useState(false)
  const isMounted = useMounted()
  const shouldLoadSource =
    hasIntersected || (isMounted && !("IntersectionObserver" in window))
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    if (!("IntersectionObserver" in window)) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return

        setShouldLoadSource(true)
        observer.disconnect()
      },
      { rootMargin: "700px 0px" }
    )

    observer.observe(container)

    return () => observer.disconnect()
  }, [])

  const SourceCode = sharedDependencies
    ? PdfEditorDependencySourceCode
    : PdfEditorSourceCode

  return (
    <div ref={containerRef}>
      {shouldLoadSource ? <SourceCode /> : <PdfEditorSourceShell />}
    </div>
  )
}
