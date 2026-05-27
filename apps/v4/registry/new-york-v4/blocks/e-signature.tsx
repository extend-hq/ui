"use client"

import * as React from "react"
import {
  Download01Icon,
  FilePenIcon,
  Pen01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { PDFViewer } from "@/components/ui/pdf-viewer"
import { Button } from "@/registry/new-york-v4/ui/button"
import { ScrollArea } from "@/registry/new-york-v4/ui/scroll-area"

type SignatureField = {
  id: string
  label: string
  page: number
  bbox: { x: number; y: number; width: number; height: number }
  signed?: boolean
}

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const INITIAL_FIELDS: SignatureField[] = [
  {
    id: "signature-1",
    label: "Signature",
    page: 1,
    bbox: { x: 300, y: 504, width: 250, height: 58 },
  },
]

function bboxToStyle(field: SignatureField) {
  return {
    left: `${(field.bbox.x / PAGE_WIDTH) * 100}%`,
    top: `${(field.bbox.y / PAGE_HEIGHT) * 100}%`,
    width: `${(field.bbox.width / PAGE_WIDTH) * 100}%`,
    height: `${(field.bbox.height / PAGE_HEIGHT) * 100}%`,
  }
}

export function ESignatureBlock({ file }: { file?: string }) {
  const [fields, setFields] = React.useState(INITIAL_FIELDS)
  const activeField = fields[0]

  const toggleSigned = React.useCallback((fieldId: string) => {
    setFields((currentFields) =>
      currentFields.map((field) =>
        field.id === fieldId ? { ...field, signed: !field.signed } : field
      )
    )
  }, [])

  return (
    <div className="grid h-[620px] min-h-[420px] overflow-hidden bg-background lg:grid-cols-[minmax(0,1fr)_340px]">
      <PDFViewer
        file={file}
        defaultZoom={0.75}
        renderPageOverlay={({ pageNumber }) =>
          fields
            .filter((field) => field.page === pageNumber)
            .map((field) => (
              <button
                key={field.id}
                type="button"
                onClick={() => toggleSigned(field.id)}
                className={cn(
                  "absolute z-10 flex items-center justify-center rounded border border-dashed text-xs font-medium transition-colors",
                  field.signed
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-700"
                    : "border-blue-500 bg-blue-500/10 text-blue-700"
                )}
                style={bboxToStyle(field)}
              >
                {field.signed ? "Signed" : field.label}
              </button>
            ))
        }
      />
      <aside className="min-h-0 border-t bg-background lg:border-t-0 lg:border-l">
        <ScrollArea className="h-full" scrollFade>
          <div className="space-y-4 p-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Signature fields</h3>
              <p className="text-xs text-muted-foreground">
                Review fields, collect signatures, and export a signed PDF.
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleSigned(activeField.id)}
              className={cn(
                "w-full rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                activeField.signed && "border-emerald-500/60 bg-emerald-500/5"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-md bg-blue-500/10 text-blue-600">
                  <HugeiconsIcon icon={Pen01Icon} className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{activeField.label}</div>
                  <div className="text-xs text-muted-foreground">
                    Page {activeField.page}
                  </div>
                </div>
                <div className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {activeField.signed ? "Signed" : "Pending"}
                </div>
              </div>
            </button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => toggleSigned(activeField.id)}
              >
                <HugeiconsIcon icon={FilePenIcon} className="size-4" />
                {activeField.signed ? "Clear" : "Sign"}
              </Button>
              <Button type="button" className="flex-1">
                <HugeiconsIcon icon={Download01Icon} className="size-4" />
                Export
              </Button>
            </div>
          </div>
        </ScrollArea>
      </aside>
    </div>
  )
}
