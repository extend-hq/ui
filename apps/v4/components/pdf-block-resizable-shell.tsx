"use client"

import * as React from "react"
import { useDefaultLayout } from "react-resizable-panels"

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

function toPercentSize(size: number) {
  return `${size}%`
}

export function PdfBlockResizableShell({
  autoSaveId,
  className,
  heightClassName = "h-[680px]",
  left,
  leftDefaultSize,
  leftMinSize,
  right,
  rightDefaultSize = 34,
  rightMaxSize = 52,
  rightMinSize = 24,
}: PdfBlockResizableShellProps) {
  const isDesktop = useMediaQuery("lg")
  const orientation = isDesktop ? "horizontal" : "vertical"
  const resolvedLeftDefaultSize =
    leftDefaultSize ?? (isDesktop ? 100 - rightDefaultSize : 62)
  const layoutId = `${autoSaveId}-${orientation}`
  const leftPanelId = `${layoutId}-left`
  const rightPanelId = `${layoutId}-right`
  const panelIds = React.useMemo(
    () => [leftPanelId, rightPanelId],
    [leftPanelId, rightPanelId]
  )
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: layoutId,
    panelIds,
  })

  return (
    <div
      className={cn(
        heightClassName,
        "relative min-h-[420px] overflow-hidden bg-background",
        className
      )}
    >
      <ResizablePanelGroup
        orientation={orientation}
        defaultLayout={defaultLayout}
        onLayoutChanged={onLayoutChanged}
        className="h-full min-h-0"
      >
        <ResizablePanel
          id={leftPanelId}
          defaultSize={toPercentSize(resolvedLeftDefaultSize)}
          minSize={toPercentSize(leftMinSize ?? (isDesktop ? 42 : 34))}
          className="min-h-0 min-w-0 overflow-hidden"
        >
          {left}
        </ResizablePanel>
        <ResizableHandle className="group z-[1000]" withHandle />
        <ResizablePanel
          id={rightPanelId}
          defaultSize={toPercentSize(isDesktop ? rightDefaultSize : 38)}
          minSize={toPercentSize(isDesktop ? rightMinSize : 24)}
          maxSize={toPercentSize(isDesktop ? rightMaxSize : 66)}
          className="min-h-0 min-w-0 overflow-hidden"
        >
          {right}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
