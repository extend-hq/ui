"use client"

import * as React from "react"
import type { ReactNode } from "react"
import { DragDropVerticalIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/utils"

function ResizablePanelGroup({
  className,
  ...props
}: ResizablePrimitive.GroupProps) {
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      className={cn(
        "flex h-full w-full aria-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    />
  )
}

const ResizablePanel = React.forwardRef<
  ResizablePrimitive.PanelImperativeHandle,
  ResizablePrimitive.PanelProps
>(function ResizablePanel(props, ref) {
  return (
    <ResizablePrimitive.Panel
      data-slot="resizable-panel"
      panelRef={ref}
      {...props}
    />
  )
})

function ResizableHandle({
  withHandle,
  className,
  ...props
}: ResizablePrimitive.SeparatorProps & {
  withHandle?: boolean | ReactNode
}) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      className={cn(
        "flex items-center justify-center",
        "relative isolate w-px bg-border",
        "after:absolute after:inset-y-0 after:left-1/2 after:z-20 after:w-3 after:-translate-x-1/2",
        "focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-hidden",
        "aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full [&[aria-orientation=horizontal]>div]:rotate-90",
        "aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-3 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2",
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
    </ResizablePrimitive.Separator>
  )
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup }
