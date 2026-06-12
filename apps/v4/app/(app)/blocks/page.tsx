import { getBlockCodeFileManifest } from "@/lib/block-code-samples"
import { PdfViewerBlocks } from "@/components/pdf-viewer-blocks"

export const dynamic = "force-static"
export const revalidate = false

export default async function BlocksPage() {
  // File paths only — contents are served by /blocks/[block]/code and
  // fetched client-side when a Code tab opens.
  const codeSamples = await getBlockCodeFileManifest()

  return <PdfViewerBlocks codeSamples={codeSamples} />
}
