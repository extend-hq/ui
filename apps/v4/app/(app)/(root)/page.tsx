import { type Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  PageActions,
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading,
} from "@/components/page-header"
import {
  MobileRootPreview,
  RootComponentsCollage,
} from "@/components/root-components-collage"
import { RootLiquidLogo } from "@/components/root-liquid-logo"

const title = "Document components for modern apps"
const description =
  "Open source PDF, DOCX, and XLSX viewers, uploads, CSV previews, OCR blocks, and e-signing primitives for document processing products."

export const dynamic = "force-static"
export const revalidate = false

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    images: [
      {
        url: `/og?title=${encodeURIComponent(
          title
        )}&description=${encodeURIComponent(description)}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [
      {
        url: `/og?title=${encodeURIComponent(
          title
        )}&description=${encodeURIComponent(description)}`,
      },
    ],
  },
}

export default function IndexPage() {
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader className="[&_.container]:pt-12 md:[&_.container]:pt-16 lg:[&_.container]:pt-20">
        <RootLiquidLogo />
        <PageHeaderHeading className="max-w-4xl">{title}</PageHeaderHeading>
        <PageHeaderDescription>{description}</PageHeaderDescription>
        <PageActions>
          <Button
            size="sm"
            className="h-[31px] rounded-lg"
            render={<Link href="/docs/components" />}
          >
            Browse Components
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-lg"
            render={<Link href="/docs/components/pdf-viewer" />}
          >
            View PDF Viewer
          </Button>
        </PageActions>
      </PageHeader>
      <div className="flex-1 overflow-hidden px-4 pb-6 md:px-6 lg:px-8">
        <div className="w-full overflow-hidden">
          <section className="-mx-4 w-[158vw] overflow-hidden rounded-lg md:hidden">
            <MobileRootPreview />
          </section>
          <section className="hidden md:block">
            <RootComponentsCollage />
          </section>
        </div>
      </div>
    </div>
  )
}
