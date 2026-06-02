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

const title = "UI Components for document agents"
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
      <PageHeader className="[&_.container]:pt-4 md:[&_.container]:pt-8 lg:[&_.container]:pt-10">
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
      <div className="container-wrapper flex-1 p-0">
        <div className="container overflow-hidden px-0 md:px-6 lg:max-w-none lg:px-8">
          <section className="-mx-2 w-[136vw] overflow-hidden md:hidden">
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
