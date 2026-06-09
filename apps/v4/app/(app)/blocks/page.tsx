import { type Metadata } from "next"

import { getLoadedBlockCodeFileManifest } from "@/lib/block-code-samples"
import { absoluteUrl } from "@/lib/utils"
import { PdfViewerBlocks } from "@/components/pdf-viewer-blocks"

export const dynamic = "force-static"
export const revalidate = false

const title = "Document UI blocks"
const description =
  "Full document processing examples built with Extend UI components."

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: absoluteUrl("/blocks"),
  },
  openGraph: {
    title,
    description,
    url: absoluteUrl("/blocks"),
    images: [
      {
        url: absoluteUrl(
          `/og?title=${encodeURIComponent(
            title
          )}&description=${encodeURIComponent(description)}`
        ),
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [
      {
        url: absoluteUrl(
          `/og?title=${encodeURIComponent(
            title
          )}&description=${encodeURIComponent(description)}`
        ),
      },
    ],
  },
}

export default async function BlocksPage() {
  const codeSamples = await getLoadedBlockCodeFileManifest()

  return <PdfViewerBlocks codeSamples={codeSamples} />
}
