import { type Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  PageActions,
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading,
} from "@/components/page-header"

const title = "Document Blocks"
const description =
  "Composed PDF viewer workflows built from layout blocks, signing fields, and document splits."

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

export default function BlocksLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <PageHeader>
        <PageHeaderHeading>{title}</PageHeaderHeading>
        <PageHeaderDescription>{description}</PageHeaderDescription>
        <PageActions>
          <Button size="sm" render={<a href="#blocks" />}>
            Browse Blocks
          </Button>
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/docs/components" />}
          >
            View Components
          </Button>
        </PageActions>
      </PageHeader>
      <div
        id="blocks"
        className="container-wrapper flex-1 section-soft md:py-12"
      >
        <div className="container">{children}</div>
      </div>
    </>
  )
}
