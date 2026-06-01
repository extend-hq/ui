import { getBlockCodeFileManifest } from "@/lib/block-code-samples"
import { PdfViewerBlocks } from "@/components/pdf-viewer-blocks"

export const dynamic = "force-static"
export const revalidate = false

export default async function BlocksPage() {
  const codeSamples = await getBlockCodeFileManifest()

  return <PdfViewerBlocks codeSamples={codeSamples} />
}
