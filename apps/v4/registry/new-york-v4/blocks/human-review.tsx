"use client"

import * as React from "react"
import {
  CheckmarkCircle02Icon,
  MessageQuestionIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { PDFViewer, type PDFViewerHandle } from "@/components/ui/pdf-viewer"
import { Badge } from "@/registry/new-york-v4/ui/badge"
import { Button } from "@/registry/new-york-v4/ui/button"
import { ScrollArea } from "@/registry/new-york-v4/ui/scroll-area"

type ReviewField = {
  id: string
  label: string
  extractedValue: string
  suggestedValue: string
  page: number
  confidence: number
  status: "needs-review" | "approved"
  area: { left: number; top: number; width: number; height: number }
}

const REVIEW_FIELDS: ReviewField[] = [
  {
    id: "title",
    label: "Title",
    extractedValue: "Attention Is All You Need",
    suggestedValue: "Attention Is All You Need",
    page: 1,
    confidence: 0.98,
    status: "approved",
    area: { left: 31, top: 31, width: 40, height: 6 },
  },
  {
    id: "authors",
    label: "Authors",
    extractedValue: "Vaswani, Shazeer, Parmar, Uszkoreit",
    suggestedValue: "Vaswani, Shazeer, Parmar, Uszkoreit, Jones",
    page: 1,
    confidence: 0.82,
    status: "needs-review",
    area: { left: 12, top: 34, width: 76, height: 10 },
  },
]

export function HumanReviewBlock({ file }: { file?: string }) {
  const [fields, setFields] = React.useState(REVIEW_FIELDS)
  const [activeFieldId, setActiveFieldId] = React.useState(fields[0].id)
  const viewerRef = React.useRef<PDFViewerHandle>(null)
  const activeField =
    fields.find((field) => field.id === activeFieldId) ?? fields[0]

  const focusField = React.useCallback((field: ReviewField) => {
    setActiveFieldId(field.id)
    viewerRef.current?.scrollToPageArea(field.page, field.area)
  }, [])

  const approveField = React.useCallback((fieldId: string) => {
    setFields((currentFields) =>
      currentFields.map((field) =>
        field.id === fieldId
          ? { ...field, status: "approved", extractedValue: field.suggestedValue }
          : field
      )
    )
  }, [])

  return (
    <div className="grid h-[620px] min-h-[420px] overflow-hidden bg-background lg:grid-cols-[minmax(0,1fr)_390px]">
      <PDFViewer
        ref={viewerRef}
        file={file}
        defaultZoom={0.75}
        renderPageOverlay={({ pageNumber }) =>
          activeField.page === pageNumber ? (
            <div
              className="pointer-events-none absolute z-10 rounded-[3px] border border-amber-500/70 bg-amber-500/12"
              style={{
                left: `${activeField.area.left}%`,
                top: `${activeField.area.top}%`,
                width: `${activeField.area.width}%`,
                height: `${activeField.area.height}%`,
              }}
            />
          ) : null
        }
      />
      <aside className="min-h-0 border-t bg-background lg:border-t-0 lg:border-l">
        <ScrollArea className="h-full" scrollFade>
          <div className="space-y-3 p-3">
            {fields.map((field) => {
              const isActive = field.id === activeField.id

              return (
                <button
                  key={field.id}
                  type="button"
                  onClick={() => focusField(field)}
                  className={cn(
                    "w-full rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    isActive && "border-amber-500/60 bg-amber-500/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{field.label}</div>
                      <div className="text-xs text-muted-foreground">
                        Confidence {Math.round(field.confidence * 100)}%
                      </div>
                    </div>
                    <Badge
                      variant={
                        field.status === "approved" ? "default" : "secondary"
                      }
                    >
                      {field.status === "approved" ? "Approved" : "Review"}
                    </Badge>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Extracted</div>
                      <div className="mt-1 rounded-md bg-muted p-2 text-foreground">
                        {field.extractedValue}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Suggested</div>
                      <div className="mt-1 rounded-md bg-emerald-500/10 p-2 text-emerald-700 dark:text-emerald-300">
                        {field.suggestedValue}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={(event) => {
                        event.stopPropagation()
                        focusField(field)
                      }}
                    >
                      <HugeiconsIcon
                        icon={MessageQuestionIcon}
                        className="size-4"
                      />
                      Review
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1"
                      onClick={(event) => {
                        event.stopPropagation()
                        approveField(field.id)
                      }}
                    >
                      <HugeiconsIcon
                        icon={CheckmarkCircle02Icon}
                        className="size-4"
                      />
                      Approve
                    </Button>
                  </div>
                </button>
              )
            })}
          </div>
        </ScrollArea>
      </aside>
    </div>
  )
}
