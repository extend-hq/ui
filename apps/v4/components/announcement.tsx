import Link from "next/link"
import { ArrowRightIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Badge } from "@/registry/new-york-v4/ui/badge"

export function Announcement() {
  return (
    <Badge asChild variant="secondary" className="bg-muted">
      <Link href="/docs/components/document-thumbnail-strip">
        Thumbnail Tab Switcher <HugeiconsIcon icon={ArrowRightIcon} />
      </Link>
    </Badge>
  )
}
