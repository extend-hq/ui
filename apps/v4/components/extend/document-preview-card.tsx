"use client"

import * as React from "react"
import { PreviewCard as PreviewCardPrimitive } from "@base-ui/react/preview-card"

export function PreviewCard({
  closeDelay: _closeDelay,
  openDelay: _openDelay,
  ...props
}: PreviewCardPrimitive.Root.Props & {
  closeDelay?: number
  openDelay?: number
}) {
  return <PreviewCardPrimitive.Root {...props} />
}

export function PreviewCardTrigger({
  asChild,
  children,
  closeDelay = 120,
  delay = 0,
  render,
  ...props
}: PreviewCardPrimitive.Trigger.Props & { asChild?: boolean }) {
  return (
    <PreviewCardPrimitive.Trigger
      closeDelay={closeDelay}
      delay={delay}
      render={
        render ??
        (asChild && React.isValidElement(children)
          ? (children as React.ReactElement<Record<string, unknown>>)
          : undefined)
      }
      {...props}
    >
      {asChild && React.isValidElement(children) ? undefined : children}
    </PreviewCardPrimitive.Trigger>
  )
}

export function PreviewCardContent({
  align = "start",
  alignOffset = 0,
  children,
  className,
  side = "right",
  sideOffset = 10,
  ...props
}: PreviewCardPrimitive.Popup.Props & {
  align?: PreviewCardPrimitive.Positioner.Props["align"]
  alignOffset?: PreviewCardPrimitive.Positioner.Props["alignOffset"]
  side?: PreviewCardPrimitive.Positioner.Props["side"]
  sideOffset?: PreviewCardPrimitive.Positioner.Props["sideOffset"]
}) {
  return (
    <PreviewCardPrimitive.Portal>
      <PreviewCardPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        className="z-40"
        side={side}
        sideOffset={sideOffset}
      >
        <PreviewCardPrimitive.Popup className={className} {...props}>
          {children}
        </PreviewCardPrimitive.Popup>
      </PreviewCardPrimitive.Positioner>
    </PreviewCardPrimitive.Portal>
  )
}
