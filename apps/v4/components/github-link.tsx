import Link from "next/link"

import { siteConfig } from "@/lib/config"
import { Icons } from "@/components/icons"
import { Button } from "@/registry/new-york-v4/ui/button"

export function GitHubLink() {
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 shadow-none"
      render={
        <Link href={siteConfig.links.github} target="_blank" rel="noreferrer" />
      }
    >
      <Icons.gitHub />
      <span className="text-xs text-muted-foreground">GitHub</span>
    </Button>
  )
}
