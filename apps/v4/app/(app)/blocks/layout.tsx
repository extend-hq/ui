import { type Metadata } from "next"
import Link from "next/link"

import { Announcement } from "@/components/announcement"
import { BlocksNav } from "@/components/blocks-nav"
import {
  PageActions,
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading,
} from "@/components/page-header"
import { PageNav } from "@/components/page-nav"
import { Button } from "@/registry/new-york-v4/ui/button"

const title = "Document Blocks"
const description =
  "Composed document workflows built from the viewer, navigation, review, comparison, OCR, and metadata components."

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
        <Announcement />
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
      <PageNav id="blocks">
        <BlocksNav />
        <Button
          variant="secondary"
          size="sm"
          className="mr-7 hidden shadow-none lg:flex"
          render={<Link href="/docs/components" />}
        >
          Browse components
        </Button>
      </PageNav>
      <div className="container-wrapper flex-1 section-soft md:py-12">
        <div className="container">{children}</div>
      </div>
    </>
  )
}
