"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

type PdfBlockResizableShellProps = {
  autoSaveId: string
  className?: string
  heightClassName?: string
  left: React.ReactNode
  leftDefaultSize?: number
  leftMinSize?: number
  right: React.ReactNode
  rightDefaultSize?: number
  rightMaxSize?: number
  rightMinSize?: number
}

export function PdfBlockResizableShell({
  autoSaveId,
  className,
  heightClassName = "h-[620px]",
  left,
  leftDefaultSize,
  leftMinSize,
  right,
  rightDefaultSize = 34,
  rightMaxSize = 52,
  rightMinSize = 24,
}: PdfBlockResizableShellProps) {
  const isDesktop = useMediaQuery("lg")
  const direction = isDesktop ? "horizontal" : "vertical"
  const resolvedLeftDefaultSize =
    leftDefaultSize ?? (isDesktop ? 100 - rightDefaultSize : 62)

  return (
    <ResizablePanelGroup
      direction={direction}
      autoSaveId={`${autoSaveId}-${direction}`}
      className={cn(
        heightClassName,
        "relative max-h-[calc(100vh-8rem)] min-h-[420px] overflow-hidden bg-background",
        className
      )}
    >
      <ResizablePanel
        defaultSize={resolvedLeftDefaultSize}
        minSize={leftMinSize ?? (isDesktop ? 42 : 34)}
        className="min-h-0 min-w-0 overflow-hidden"
      >
        {left}
      </ResizablePanel>
      <ResizableHandle className="group z-[1000]" withHandle />
      <ResizablePanel
        defaultSize={isDesktop ? rightDefaultSize : 38}
        minSize={isDesktop ? rightMinSize : 24}
        maxSize={isDesktop ? rightMaxSize : 66}
        className="min-h-0 min-w-0 overflow-hidden"
      >
        {right}
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
