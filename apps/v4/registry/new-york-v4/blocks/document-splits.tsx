"use client"

import * as React from "react"
import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { FileThumbnail } from "@/components/ui/file-thumbnail"
import { Button } from "@/registry/new-york-v4/ui/button"
import { ScrollArea } from "@/registry/new-york-v4/ui/scroll-area"

type SplitGroup = {
  id: string
  title: string
  pages: number[]
}

const INITIAL_SPLITS: SplitGroup[] = [
  { id: "split-1", title: "Abstract and intro", pages: [1, 2, 3] },
  { id: "split-2", title: "Model architecture", pages: [4, 5, 6, 7] },
  { id: "split-3", title: "Training and results", pages: [8, 9, 10] },
]

export function DocumentSplitsBlock() {
  const [splits, setSplits] = React.useState(INITIAL_SPLITS)

  const addSplit = React.useCallback(() => {
    setSplits((currentSplits) => [
      ...currentSplits,
      {
        id: `split-${currentSplits.length + 1}`,
        title: `New document ${currentSplits.length + 1}`,
        pages: [],
      },
    ])
  }, [])

  const removeSplit = React.useCallback((splitId: string) => {
    setSplits((currentSplits) =>
      currentSplits.length === 1
        ? currentSplits
        : currentSplits.filter((split) => split.id !== splitId)
    )
  }, [])

  return (
    <div className="flex h-[620px] min-h-[420px] flex-col overflow-hidden bg-background">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-medium">Document splits</h3>
          <p className="text-xs text-muted-foreground">
            Group extracted pages into output documents.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={addSplit}>
          <HugeiconsIcon icon={Add01Icon} className="size-4" />
          Add split
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1" scrollFade>
        <div className="space-y-3 p-4">
          {splits.map((split) => (
            <section key={split.id} className="rounded-lg border bg-background">
              <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
                <div>
                  <div className="text-sm font-medium">{split.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {split.pages.length === 0
                      ? "No pages"
                      : `${split.pages.length} pages`}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${split.title}`}
                  onClick={() => removeSplit(split.id)}
                >
                  <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                </Button>
              </div>
              <div className="flex gap-2 overflow-x-auto p-3">
                {split.pages.map((page) => (
                  <FileThumbnail
                    key={page}
                    file={{
                      name: `Page ${page}`,
                      type: "application/pdf",
                      size: "PDF page",
                    }}
                    className="h-28 w-20 shrink-0"
                    showMetadata={false}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
