"use client"

import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

type ScrollAreaProps = React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  orientation?: "vertical" | "horizontal" | "both"
  scrollFade?: boolean
  scrollbarGutter?: boolean
  scrollbarOverflowOnly?: boolean
  viewportClassName?: string
  viewportProps?: React.ComponentProps<typeof ScrollAreaPrimitive.Viewport>
  viewportRef?: React.Ref<HTMLDivElement>
}

export function ScrollArea({
  className,
  children,
  orientation = "both",
  scrollFade = false,
  scrollbarGutter = false,
  scrollbarOverflowOnly = false,
  viewportClassName,
  viewportProps,
  viewportRef,
  ...props
}: ScrollAreaProps) {
  const localViewportRef = React.useRef<HTMLDivElement>(null)
  const {
    className: viewportPropsClassName,
    ref: viewportPropsRef,
    ...resolvedViewportProps
  } = viewportProps ?? {}
  const composedViewportRef = React.useMemo(
    () => composeRefs(localViewportRef, viewportPropsRef, viewportRef),
    [viewportPropsRef, viewportRef]
  )

  React.useEffect(() => {
    const viewport = localViewportRef.current
    if (!viewport || !scrollFade) return
    const updateOverflow = () => {
      const x = Math.abs(viewport.scrollLeft)
      const y = Math.max(0, viewport.scrollTop)
      const overflow = {
        "x-start": x,
        "x-end": Math.max(0, viewport.scrollWidth - viewport.clientWidth - x),
        "y-start": y,
        "y-end": Math.max(0, viewport.scrollHeight - viewport.clientHeight - y),
      }
      for (const [edge, value] of Object.entries(overflow)) {
        viewport.style.setProperty(
          `--scroll-area-overflow-${edge}`,
          `${value}px`
        )
      }
    }
    const observer = new ResizeObserver(updateOverflow)
    observer.observe(viewport)
    if (viewport.firstElementChild) observer.observe(viewport.firstElementChild)
    viewport.addEventListener("scroll", updateOverflow, { passive: true })
    updateOverflow()
    return () => {
      observer.disconnect()
      viewport.removeEventListener("scroll", updateOverflow)
    }
  }, [scrollFade])

  return (
    <ScrollAreaPrimitive.Root
      type={scrollbarOverflowOnly ? "auto" : "hover"}
      data-slot="scroll-area"
      className={cn("size-full min-h-0 overflow-hidden", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        {...resolvedViewportProps}
        ref={composedViewportRef}
        data-slot="scroll-area-viewport"
        className={cn(
          "h-full w-full rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring",
          scrollFade &&
            "mask-t-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-y-start)))] mask-r-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-x-end)))] mask-b-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-y-end)))] mask-l-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-x-start)))] [--fade-size:1.5rem]",
          scrollbarGutter && orientation !== "vertical" && "pb-3.5",
          scrollbarGutter && orientation !== "horizontal" && "pe-3.5",
          viewportPropsClassName,
          viewportClassName
        )}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {orientation !== "horizontal" ? (
        <ScrollAreaPrimitive.ScrollAreaScrollbar
          orientation="vertical"
          data-slot="scroll-area-scrollbar"
          className="m-1 flex w-1.5 touch-none select-none"
        >
          <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-foreground/20" />
        </ScrollAreaPrimitive.ScrollAreaScrollbar>
      ) : null}
      {orientation !== "vertical" ? (
        <ScrollAreaPrimitive.ScrollAreaScrollbar
          orientation="horizontal"
          data-slot="scroll-area-scrollbar"
          className="m-1 flex h-1.5 touch-none flex-col select-none"
        >
          <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-foreground/20" />
        </ScrollAreaPrimitive.ScrollAreaScrollbar>
      ) : null}
      {orientation === "both" ? <ScrollAreaPrimitive.Corner /> : null}
    </ScrollAreaPrimitive.Root>
  )
}

export function ScrollAreaContent(props: React.ComponentProps<"div">) {
  return <div {...props} />
}

function composeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue
      if (typeof ref === "function") ref(node)
      else ref.current = node
    }
  }
}
