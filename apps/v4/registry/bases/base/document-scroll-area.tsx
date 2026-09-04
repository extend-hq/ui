"use client"

import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"

import { cn } from "@/lib/utils"

type ScrollAreaProps = ScrollAreaPrimitive.Root.Props & {
  orientation?: "vertical" | "horizontal" | "both"
  scrollFade?: boolean
  scrollbarGutter?: boolean
  scrollbarOverflowOnly?: boolean
  viewportClassName?: string
  viewportProps?: ScrollAreaPrimitive.Viewport.Props
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
  const {
    className: viewportPropsClassName,
    ref: viewportPropsRef,
    ...resolvedViewportProps
  } = viewportProps ?? {}
  const composedViewportRef = React.useMemo(
    () => composeRefs(viewportPropsRef, viewportRef),
    [viewportPropsRef, viewportRef]
  )

  return (
    <ScrollAreaPrimitive.Root
      className={cn(
        "size-full min-h-0",
        scrollbarOverflowOnly &&
          "[&:not(:has([data-slot=scroll-area-viewport][data-has-overflow-x]))_[data-orientation=horizontal]]:hidden [&:not(:has([data-slot=scroll-area-viewport][data-has-overflow-y]))_[data-orientation=vertical]]:hidden",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        {...resolvedViewportProps}
        ref={composedViewportRef}
        className={cn(
          "h-full rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring",
          scrollFade &&
            "mask-t-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-y-start)))] mask-r-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-x-end)))] mask-b-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-y-end)))] mask-l-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-x-start)))] [--fade-size:1.5rem]",
          scrollbarGutter && orientation !== "vertical" && "pb-3.5",
          scrollbarGutter && orientation !== "horizontal" && "pe-3.5",
          viewportPropsClassName,
          viewportClassName
        )}
        data-slot="scroll-area-viewport"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {orientation !== "horizontal" ? (
        <ScrollAreaPrimitive.Scrollbar
          data-slot="scroll-area-scrollbar"
          orientation="vertical"
          className="m-1 flex w-1.5"
        >
          <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-foreground/20" />
        </ScrollAreaPrimitive.Scrollbar>
      ) : null}
      {orientation !== "vertical" ? (
        <ScrollAreaPrimitive.Scrollbar
          data-slot="scroll-area-scrollbar"
          orientation="horizontal"
          className="m-1 flex h-1.5 flex-col"
        >
          <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-foreground/20" />
        </ScrollAreaPrimitive.Scrollbar>
      ) : null}
      {orientation === "both" ? <ScrollAreaPrimitive.Corner /> : null}
    </ScrollAreaPrimitive.Root>
  )
}

export function ScrollAreaContent(props: ScrollAreaPrimitive.Content.Props) {
  return <ScrollAreaPrimitive.Content {...props} />
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
