"use client"

import * as React from "react"

import { FileThumbnail } from "@/components/ui/file-thumbnail"
import { XlsxViewerPreview } from "@/components/ui/xlsx-viewer"
import { PdfBlockResizableShell } from "@/components/pdf-block-resizable-shell"
import { ScrollArea } from "@/components/ui/scroll-area"

const SHEETS = ["Overview", "Chart review", "Format checks", "Exceptions"]

export function ExcelDocumentSplitsBlock({
  file,
  heightClassName = "h-[720px]",
}: {
  file?: string
  heightClassName?: string
}) {
  return (
    <PdfBlockResizableShell
      autoSaveId="xlsx-block-document-splits"
      heightClassName={heightClassName}
      rightDefaultSize={48}
      rightMaxSize={64}
      rightMinSize={30}
      left={<XlsxViewerPreview src={file} />}
      right={
        <aside className="min-h-0 bg-background">
          <ScrollArea className="h-full" scrollFade>
            <div className="space-y-3 p-3">
              {SHEETS.map((sheet, index) => (
                <section
                  key={sheet}
                  className="rounded-lg border bg-background"
                >
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
                      }}
                      className="h-20 w-full"
                    />
                  </div>
                </section>
              ))}
            </div>
          </ScrollArea>
        </aside>
      }
    />
  )
}
