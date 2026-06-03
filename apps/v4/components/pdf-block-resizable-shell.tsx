"use client"

import * as React from "react"
import { useDefaultLayout, type LayoutStorage } from "react-resizable-panels"

import { cn } from "@/lib/utils"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

type PdfBlockResizableShellProps = {
  autoSaveId: string
  className?: string
  heightClassName?: string
  initialOrientation?: React.ComponentProps<
    typeof ResizablePanelGroup
  >["orientation"]
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

const HORIZONTAL_LAYOUT_MIN_WIDTH = 900

function useElementWidth<T extends HTMLElement>() {
  const [node, setNode] = React.useState<T | null>(null)
  const [width, setWidth] = React.useState<number>()

  React.useEffect(() => {
    if (!node || typeof ResizeObserver === "undefined") return

    const updateWidth = () => {
      const nextWidth = node.getBoundingClientRect().width

      setWidth((currentWidth) =>
        currentWidth !== undefined && Math.abs(currentWidth - nextWidth) < 0.5
          ? currentWidth
          : nextWidth
      )
    }

    updateWidth()

    const observer = new ResizeObserver(updateWidth)
    observer.observe(node)

    return () => observer.disconnect()
  }, [node])

  return [setNode, width] as const
}

const layoutStorage: LayoutStorage = {
  getItem(key) {
    if (typeof window === "undefined") return null

    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem(key, value) {
    if (typeof window === "undefined") return

    try {
      window.localStorage.setItem(key, value)
    } catch {
      // Ignore storage failures so previews still render in restricted contexts.
    }
  },
}

export function PdfBlockResizableShell({
  autoSaveId,
  className,
  heightClassName = "h-[680px]",
  initialOrientation = "horizontal",
  left,
  leftDefaultSize,
  leftMinSize,
  right,
  rightDefaultSize = 34,
  rightMaxSize = 52,
  rightMinSize = 24,
}: PdfBlockResizableShellProps) {
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <PdfBlockResizableShellLayout
        className={className}
        heightClassName={heightClassName}
        left={left}
        leftDefaultSize={
          leftDefaultSize ??
          (initialOrientation === "horizontal" ? 100 - rightDefaultSize : 62)
        }
        leftMinSize={leftMinSize}
        orientation={initialOrientation}
        right={right}
        rightDefaultSize={
          initialOrientation === "horizontal" ? rightDefaultSize : 38
        }
        rightMaxSize={initialOrientation === "horizontal" ? rightMaxSize : 66}
        rightMinSize={initialOrientation === "horizontal" ? rightMinSize : 24}
      />
    )
  }

  return (
    <PdfBlockResizableShellWithSavedLayout
      autoSaveId={autoSaveId}
      className={className}
      heightClassName={heightClassName}
      initialOrientation={initialOrientation}
      left={left}
      leftDefaultSize={leftDefaultSize}
      leftMinSize={leftMinSize}
      right={right}
      rightDefaultSize={rightDefaultSize}
      rightMaxSize={rightMaxSize}
      rightMinSize={rightMinSize}
    />
  )
}

function PdfBlockResizableShellWithSavedLayout({
  autoSaveId,
  className,
  heightClassName,
  initialOrientation = "horizontal",
  left,
  leftDefaultSize,
  leftMinSize,
  right,
  rightDefaultSize = 34,
  rightMaxSize = 52,
  rightMinSize = 24,
}: Required<Pick<PdfBlockResizableShellProps, "autoSaveId">> &
  Omit<PdfBlockResizableShellProps, "autoSaveId">) {
  const [containerRef, containerWidth] = useElementWidth<HTMLDivElement>()
  const isHorizontal =
    containerWidth === undefined
      ? initialOrientation === "horizontal"
      : containerWidth >= HORIZONTAL_LAYOUT_MIN_WIDTH
  const orientation = isHorizontal ? "horizontal" : "vertical"
  const resolvedLeftDefaultSize =
    leftDefaultSize ?? (isHorizontal ? 100 - rightDefaultSize : 62)
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
    storage: layoutStorage,
  })

  return (
    <PdfBlockResizableShellLayout
      className={className}
      containerRef={containerRef}
      defaultLayout={defaultLayout}
      groupKey={layoutId}
      heightClassName={heightClassName}
      left={left}
      leftDefaultSize={resolvedLeftDefaultSize}
      leftMinSize={leftMinSize}
      leftPanelId={leftPanelId}
      onLayoutChanged={onLayoutChanged}
      orientation={orientation}
      right={right}
      rightDefaultSize={isHorizontal ? rightDefaultSize : 38}
      rightMaxSize={isHorizontal ? rightMaxSize : 66}
      rightMinSize={isHorizontal ? rightMinSize : 24}
      rightPanelId={rightPanelId}
    />
  )
}

function PdfBlockResizableShellLayout({
  className,
  containerRef,
  defaultLayout,
  groupKey,
  heightClassName,
  left,
  leftDefaultSize,
  leftMinSize,
  leftPanelId,
  onLayoutChanged,
  orientation = "vertical",
  right,
  rightDefaultSize = 34,
  rightMaxSize = 52,
  rightMinSize = 24,
  rightPanelId,
}: Omit<PdfBlockResizableShellProps, "autoSaveId"> & {
  containerRef?: React.Ref<HTMLDivElement>
  defaultLayout?: React.ComponentProps<
    typeof ResizablePanelGroup
  >["defaultLayout"]
  groupKey?: React.Key
  leftPanelId?: string
  onLayoutChanged?: React.ComponentProps<
    typeof ResizablePanelGroup
  >["onLayoutChanged"]
  orientation?: React.ComponentProps<typeof ResizablePanelGroup>["orientation"]
  rightPanelId?: string
}) {
  const resolvedLeftDefaultSize = leftDefaultSize ?? 62

  return (
    <div
      ref={containerRef}
      className={cn(
        heightClassName,
        "relative min-h-[420px] overflow-hidden bg-background",
        className
      )}
    >
      <ResizablePanelGroup
        key={groupKey ?? orientation}
        orientation={orientation}
        defaultLayout={defaultLayout}
        onLayoutChanged={onLayoutChanged}
        className="h-full min-h-0"
      >
        <ResizablePanel
          id={leftPanelId ?? "left"}
          defaultSize={toPercentSize(resolvedLeftDefaultSize)}
          minSize={toPercentSize(leftMinSize ?? 34)}
          className="min-h-0 min-w-0 overflow-hidden"
        >
          {left}
        </ResizablePanel>
        <ResizableHandle className="group z-10" withHandle />
        <ResizablePanel
          id={rightPanelId ?? "right"}
          defaultSize={toPercentSize(rightDefaultSize)}
          minSize={toPercentSize(rightMinSize)}
          maxSize={toPercentSize(rightMaxSize)}
          className="min-h-0 min-w-0 overflow-hidden"
        >
          {right}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
