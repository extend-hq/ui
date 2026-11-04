"use client"

import * as React from "react"
import { Anchor as PopoverAnchor } from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"
import { PopoverContent } from "@/components/ui/popover"

export function ColorPopoverContent({
  anchor,
  className,
  ...props
}: React.ComponentProps<typeof PopoverContent> & {
  anchor?: React.RefObject<HTMLElement | null>
}) {
  const virtualRef = {
    current: {
      getBoundingClientRect: () =>
        anchor?.current?.getBoundingClientRect() ?? new DOMRect(),
    },
  }
  return (
    <>
      {anchor ? <PopoverAnchor virtualRef={virtualRef} /> : null}
      <PopoverContent {...props} className={cn(className, "p-3.5")} />
    </>
  )
}
