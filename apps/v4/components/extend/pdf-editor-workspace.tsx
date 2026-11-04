"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

function PanelBorder({ side }: { side: "left" | "right" }) {
  return (
    <ResizableHandle
      aria-label={`Resize ${side} panel`}
      className={cn(
        "pointer-events-auto z-40 w-px bg-border before:absolute before:inset-y-2 before:w-px before:bg-primary/50 before:[mask-image:linear-gradient(to_bottom,transparent,black_8%,black_92%,transparent)] before:opacity-0 before:transition-opacity before:duration-200 before:ease-in-out hover:before:opacity-100 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:before:opacity-100 data-[separator=active]:before:opacity-100 data-[separator=hover]:before:opacity-100 motion-reduce:before:transition-none",
        side === "left" ? "before:-left-px" : "before:left-full"
      )}
    />
  )
}

function SidebarPanel({
  defaultSize,
  ...props
}: React.ComponentProps<typeof ResizablePanel>) {
  // Keep the registration size stable until the panel is mounted again.
  const [initialSize] = React.useState(defaultSize)

  return <ResizablePanel {...props} defaultSize={initialSize} />
}

export function PdfEditorWorkspace({
  children,
  left,
  right,
  leftInline,
  rightInline,
}: {
  children: React.ReactNode
  left: React.ReactNode
  right: React.ReactNode
  leftInline: boolean
  rightInline: boolean
}) {
  const id = React.useId()
  const [leftSize, setLeftSize] = React.useState<string | number>("14rem")
  const [rightSize, setRightSize] = React.useState<string | number>("21rem")
  const leftElement = React.useRef<HTMLDivElement>(null)
  const rightElement = React.useRef<HTMLDivElement>(null)
  const leftId = `${id}-left`
  const rightId = `${id}-right`
  const rememberSizes = () => {
    if (leftElement.current)
      setLeftSize(leftElement.current.getBoundingClientRect().width)
    if (rightElement.current)
      setRightSize(rightElement.current.getBoundingClientRect().width)
  }
  const sidebar = (side: "left" | "right", content: React.ReactNode) => (
    <SidebarPanel
      id={side === "left" ? leftId : rightId}
      defaultSize={side === "left" ? leftSize : rightSize}
      minSize={side === "left" ? "14rem" : "21rem"}
      maxSize={side === "left" ? "28rem" : "32rem"}
      groupResizeBehavior="preserve-pixel-size"
      elementRef={side === "left" ? leftElement : rightElement}
      className="pointer-events-auto h-full min-h-0 overflow-hidden bg-sidebar"
    >
      <aside
        data-slot={`pdf-editor-${side}-panel`}
        className="flex h-full min-h-0 flex-col"
      >
        {content}
      </aside>
    </SidebarPanel>
  )

  return (
    <div className="relative h-full min-h-0 w-full flex-1 overflow-hidden">
      <ResizablePanelGroup
        orientation="horizontal"
        onLayoutChanged={rememberSizes}
      >
        {left && leftInline ? sidebar("left", left) : null}
        {left && leftInline ? <PanelBorder side="left" /> : null}
        <ResizablePanel
          id={`${id}-document`}
          minSize={leftInline || rightInline ? "15rem" : "0%"}
          className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
        >
          {children}
        </ResizablePanel>
        {right && rightInline ? <PanelBorder side="right" /> : null}
        {right && rightInline ? sidebar("right", right) : null}
      </ResizablePanelGroup>
      {(["left", "right"] as const).map((side) => {
        const content = side === "left" ? left : right
        const inline = side === "left" ? leftInline : rightInline
        if (!content || inline) return null
        return (
          <ResizablePanelGroup
            key={side}
            orientation="horizontal"
            onLayoutChanged={rememberSizes}
            className={cn(
              "pointer-events-none absolute inset-y-0 z-30",
              side === "left" ? "left-0 min-w-60" : "right-0 min-w-88"
            )}
          >
            {side === "right" ? (
              <ResizablePanel id={`${id}-right-space`} minSize="1rem" />
            ) : null}
            {side === "right" ? <PanelBorder side="right" /> : null}
            {sidebar(side, content)}
            {side === "left" ? <PanelBorder side="left" /> : null}
            {side === "left" ? (
              <ResizablePanel id={`${id}-left-space`} minSize="1rem" />
            ) : null}
          </ResizablePanelGroup>
        )
      })}
    </div>
  )
}
