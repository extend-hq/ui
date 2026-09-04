"use client"

import { Popover } from "@base-ui/react/popover"

import { cn } from "@/lib/utils"

export function ColorPopoverContent({
  anchor,
  align,
  sideOffset,
  className,
  ...props
}: Popover.Popup.Props &
  Pick<Popover.Positioner.Props, "anchor" | "align" | "sideOffset">) {
  return (
    <Popover.Portal>
      <Popover.Positioner
        anchor={anchor}
        align={align}
        sideOffset={sideOffset}
        className="z-50"
      >
        <Popover.Popup
          {...props}
          className={cn(
            "rounded-xl border bg-popover text-popover-foreground shadow-md outline-none",
            className,
            "p-3.5"
          )}
        />
      </Popover.Positioner>
    </Popover.Portal>
  )
}
