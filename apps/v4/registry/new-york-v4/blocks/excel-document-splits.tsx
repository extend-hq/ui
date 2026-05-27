"use client"

import * as React from "react"

import { FileThumbnail } from "@/components/ui/file-thumbnail"
import { XlsxViewerPreview } from "@/components/ui/xlsx-viewer"
import { ScrollArea } from "@/registry/new-york-v4/ui/scroll-area"

const SHEETS = ["Overview", "Chart review", "Format checks", "Exceptions"]

export function ExcelDocumentSplitsBlock({ file }: { file?: string }) {
  return (
    <div className="grid h-[620px] min-h-[420px] overflow-hidden bg-background lg:grid-cols-[minmax(0,1fr)_340px]">
      <XlsxViewerPreview src={file} />
      <aside className="min-h-0 border-t bg-background lg:border-t-0 lg:border-l">
        <ScrollArea className="h-full" scrollFade>
          <div className="space-y-3 p-3">
            {SHEETS.map((sheet, index) => (
              <section key={sheet} className="rounded-lg border bg-background">
                <div className="border-b px-3 py-2">
                  <div className="text-sm font-medium">{sheet}</div>
                  <div className="text-xs text-muted-foreground">
                    Sheet {index + 1}
                  </div>
                </div>
                <div className="p-3">
                  <FileThumbnail
                    file={{
                      name: sheet,
                      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                      size: "XLSX sheet",
                    }}
                    className="h-20 w-full"
                    showMetadata={false}
                  />
                </div>
              </section>
            ))}
          </div>
        </ScrollArea>
      </aside>
    </div>
  )
}
