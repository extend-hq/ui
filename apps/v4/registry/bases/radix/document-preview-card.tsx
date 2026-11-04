"use client"

import * as React from "react"
import * as HoverCard from "@radix-ui/react-hover-card"

export const PreviewCard = HoverCard.Root
export const PreviewCardTrigger = HoverCard.Trigger

export function PreviewCardContent(
  props: React.ComponentProps<typeof HoverCard.Content>
) {
  return (
    <HoverCard.Portal>
      <HoverCard.Content {...props} />
    </HoverCard.Portal>
  )
}
