import { cn } from "@/lib/utils"
import { Button } from "@/registry/new-york-v4/ui/button"

export function ExtendDeployCta({ className }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "group relative flex flex-col gap-2 rounded-lg bg-surface p-6 text-sm text-surface-foreground",
        className
      )}
    >
      <div className="text-base leading-tight font-semibold text-balance group-hover:underline">
        Deploy your document processing on Extend
      </div>
      <div className="text-muted-foreground">
        Trusted by Brex, Flatiron, Square, and more.
      </div>
      <div className="text-muted-foreground">
        Extend provides production ready tools to handle your toughest
        documents.
      </div>
      <Button variant="outline" size="sm" className="mt-2 w-fit">
        Deploy now
      </Button>
      <a
        href="https://www.extend.ai?utm_source=extend-ui"
        target="_blank"
        rel="noreferrer"
        className="absolute inset-0"
      >
        <span className="sr-only">Deploy on Extend</span>
      </a>
    </div>
  )
}
