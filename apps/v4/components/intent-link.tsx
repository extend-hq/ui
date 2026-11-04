"use client"

import * as React from "react"
import Link from "next/link"

export function IntentLink({
  onMouseEnter,
  onFocus,
  onTouchStart,
  prefetch = null,
  ...props
}: React.ComponentProps<typeof Link>) {
  const [active, setActive] = React.useState(false)

  return (
    <Link
      {...props}
      prefetch={active ? prefetch : false}
      onMouseEnter={(event) => {
        onMouseEnter?.(event)
        if (!event.defaultPrevented) setActive(true)
      }}
      onFocus={(event) => {
        onFocus?.(event)
        if (!event.defaultPrevented) setActive(true)
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event)
        if (!event.defaultPrevented) setActive(true)
      }}
    />
  )
}
