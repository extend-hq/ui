"use client"

import dynamic from "next/dynamic"

import { withUiBasePath } from "@/lib/zone-path"
import { Spinner } from "@/components/ui/spinner"
import { DocsViewCodeBlock } from "@/components/docs-code-block"

const SAMPLE_PPTX_URL = withUiBasePath("/samples/demo.pptx")

function ViewerPreviewLoading() {
  return (
    <div className="grid h-[640px] place-items-center bg-background">
      <Spinner className="size-4" />
    </div>
  )
}

const PptxViewerPreview = dynamic(
  () =>
    import("@/components/extend/pptx-viewer").then(
      (mod) => mod.PptxViewerPreview
    ),
  {
    ssr: false,
    loading: () => <ViewerPreviewLoading />,
  }
)

export function PptxViewerDemo() {
  return (
    <div
      data-slot="component-preview"
      className="group relative mt-4 mb-12 flex flex-col overflow-hidden rounded-xl border"
    >
      <PptxViewerPreview src={SAMPLE_PPTX_URL} />
      <DocsViewCodeBlock code={pptxViewerUsageCode} />
    </div>
  )
}

const pptxViewerUsageCode = `"use client";

import { PptxViewerPreview } from "@/components/extend/pptx-viewer";

export function PptxViewerExample() {
  return <PptxViewerPreview src="/path/to/presentation.pptx" />;
}`
