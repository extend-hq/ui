import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/new-york-v4/ui/card"

export const dynamic = "force-static"
export const revalidate = false

const blocks = [
  {
    id: "viewers",
    title: "Viewer Workspace",
    description:
      "A file preview layout with sidebar navigation, toolbar actions, and a responsive document canvas.",
  },
  {
    id: "review",
    title: "Review Queue",
    description:
      "A document approval screen with annotations, comment threads, redline status, and metadata.",
  },
  {
    id: "comparison",
    title: "Comparison Review",
    description:
      "A side-by-side comparison workspace with synchronized scrolling and diff navigation.",
  },
  {
    id: "metadata",
    title: "Extraction Console",
    description:
      "A processing view for OCR confidence, extracted properties, parse warnings, and retry states.",
  },
]

export default async function BlocksPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {blocks.map((block) => (
        <Card id={block.id} key={block.id} className="rounded-lg shadow-none">
          <CardHeader>
            <CardTitle>{block.title}</CardTitle>
            <CardDescription>{block.description}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
