import { type Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  PageActions,
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading,
} from "@/components/page-header"
import { RootComponentsCollage } from "@/components/root-components-collage"
import { RootLiquidLogo } from "@/components/root-liquid-logo"

const title = "UI Components for document agents"
const description =
  "Open source PDF, DOCX, and XLSX viewers, uploads, CSV previews, layout blocks, and e-signing primitives for document processing products."

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
      <PageHeader className="relative overflow-hidden">
        <RootLiquidLogo />
        <PageHeaderHeading className="relative z-10 mt-2 max-w-4xl sm:mt-3">
          {title}
        </PageHeaderHeading>
        <PageHeaderDescription className="relative z-10">
          {description}
        </PageHeaderDescription>
        <PageActions className="relative z-10">
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
            render={<Link href="/blocks" />}
          >
            View full examples
          </Button>
        </PageActions>
      </PageHeader>
      <div className="container-wrapper flex-1 p-0">
        <div className="container overflow-hidden px-4 md:px-6 lg:max-w-none lg:px-8">
          {/*
          <section className="-mx-2 w-[136vw] overflow-hidden md:hidden">
            <MobileRootPreview />
          </section>
          */}
          <section>
            <RootComponentsCollage />
          </section>
        </div>
      </div>
    </div>
  )
}
