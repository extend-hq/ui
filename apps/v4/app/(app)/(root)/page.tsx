import { type Metadata } from "next"
import Link from "next/link"
import { ArrowRightIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import {
  PageActions,
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading,
} from "@/components/page-header"
import { Badge } from "@/registry/new-york-v4/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/new-york-v4/ui/card"

const title = "Document components for modern apps"
const description =
  "Extend UI gives teams open source viewers, navigation, review, OCR, and metadata components for document processing products."

const featuredComponents = [
  ["PDF Viewer", "Page rendering, zoom, search, thumbnails, and text layers."],
  [
    "DOCX Viewer",
    "Word document rendering with sections, headings, and comments.",
  ],
  [
    "Excel Viewer",
    "Workbook previews with sheets, frozen panes, and large-grid ergonomics.",
  ],
  [
    "File Upload",
    "Drag-and-drop intake with validation, progress, queues, and retry states.",
  ],
  [
    "Annotation Layer",
    "Highlights, pins, rectangles, notes, and anchored review comments.",
  ],
]

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
      <PageHeader>
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
            render={<Link href="/blocks" />}
          >
            View Blocks
          </Button>
        </PageActions>
      </PageHeader>
      <div className="container-wrapper flex-1 pb-10">
        <div className="container grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredComponents.map(([name, detail]) => (
              <Card key={name} className="rounded-lg shadow-none">
                <CardHeader>
                  <div className="mb-3">
                    <Badge variant="secondary">Extend UI</Badge>
                  </div>
                  <CardTitle>{name}</CardTitle>
                  <CardDescription>{detail}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </section>
          <aside className="lg:sticky lg:top-[calc(var(--header-height)+2rem)] lg:self-start">
            <Card className="rounded-lg shadow-none">
              <CardHeader>
                <CardTitle>Deploy your document processing on Extend</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Trusted by Brex, Flatiron, Square, and more. Extend provides
                  production ready tools to handle your toughest documents.
                </CardDescription>
              </CardContent>
              <CardFooter>
                <Button
                  size="sm"
                  className="rounded-lg"
                  render={
                    <a
                      href="https://www.extend.ai?utm_source=extend-ui"
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                >
                  Deploy now <HugeiconsIcon icon={ArrowRightIcon} />
                </Button>
              </CardFooter>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  )
}
