"use client"

import type { ComponentPropsWithRef, ReactNode } from "react"
import { DragDropVerticalIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"

import { cn } from "@/lib/utils"

function ResizablePanelGroup({
  className,
  ...props
}: ComponentPropsWithRef<typeof PanelGroup>) {
  return (
    <PanelGroup
      data-slot="resizable-panel-group"
      className={cn(
        "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
        className
      )}
      {...props}
    />
  )
}

function ResizablePanel({ ...props }: ComponentPropsWithRef<typeof Panel>) {
  return <Panel data-slot="resizable-panel" {...props} />
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: ComponentPropsWithRef<typeof PanelResizeHandle> & {
  withHandle?: boolean | ReactNode
}) {
  return (
    <PanelResizeHandle
      data-slot="resizable-handle"
      className={cn(
        "flex items-center justify-center",
        "relative isolate w-px bg-border",
        "after:absolute after:inset-y-0 after:left-1/2 after:z-20 after:w-3 after:-translate-x-1/2",
        "focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-hidden",
        "data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full [&[data-panel-group-direction=vertical]>div]:rotate-90",
        "data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-3 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:translate-x-0 data-[panel-group-direction=vertical]:after:-translate-y-1/2",
        className
      )}
      {...props}
    >
      {withHandle &&
        (typeof withHandle === "boolean" ? (
          <div className="relative z-30 flex h-4 w-3 items-center justify-center rounded-xs border bg-muted shadow-sm">
            <HugeiconsIcon icon={DragDropVerticalIcon} className="size-2.5" />
          </div>
        ) : (
          withHandle
        ))}
    </PanelResizeHandle>
  )
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup }
