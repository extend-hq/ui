"use client"

import * as React from "react"
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { trackEvent, type Event } from "@/lib/events"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function legacyCopyToClipboard(value: string) {
  const textArea = document.createElement("textarea")
  textArea.value = value
  textArea.setAttribute("readonly", "")
  textArea.style.position = "fixed"
  textArea.style.opacity = "0"
  textArea.style.pointerEvents = "none"

  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  textArea.setSelectionRange(0, value.length)

  let hasCopied = false
  try {
    hasCopied = document.execCommand("copy")
  } catch {
    hasCopied = false
  }

  document.body.removeChild(textArea)
  return hasCopied
}

export async function copyToClipboardWithMeta(value: string, event?: Event) {
  if (typeof window === "undefined") {
    return false
  }

  if (!value) {
    return false
  }

  let hasCopied = false

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      hasCopied = true
    } catch {
      hasCopied = legacyCopyToClipboard(value)
    }
  } else {
    hasCopied = legacyCopyToClipboard(value)
  }

  if (!hasCopied) {
    return false
  }

  if (event) {
    trackEvent(event)
  }

  return true
}

export function CopyButtonIcon({
  copied,
  className,
}: {
  copied: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex size-4 items-center justify-center",
        className
      )}
    >
      <span
        className={cn(
          "inline-flex transition-all duration-200 ease-out",
          copied
            ? "scale-100 opacity-100 blur-none"
            : "scale-70 opacity-0 blur-[2px]"
        )}
      >
        <HugeiconsIcon icon={Tick02Icon} className="size-4" />
      </span>
      <span
        className={cn(
          "absolute inline-flex transition-all duration-200 ease-out",
          copied
            ? "scale-0 opacity-0 blur-[2px]"
            : "scale-100 opacity-100 blur-none"
        )}
      >
        <HugeiconsIcon icon={Copy01Icon} className="size-4" />
      </span>
    </span>
  )
}

export const codeHeaderCopyButtonClassName =
  "static z-auto shrink-0 bg-transparent"

export function CopyButton({
  value,
  className,
  copied,
  variant = "ghost",
  event,
  onClick,
  ...props
}: React.ComponentProps<typeof Button> & {
  value: string
  src?: string
  event?: Event["name"]
  tooltip?: string
  copied?: boolean
}) {
  const [hasCopied, setHasCopied] = React.useState(false)
  const isCopied = copied ?? hasCopied

  React.useEffect(() => {
    if (hasCopied) {
      const timer = setTimeout(() => setHasCopied(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [hasCopied])

  return (
    <Button
      data-slot="copy-button"
      data-copied={isCopied}
      aria-label={isCopied ? "Copied" : "Copy to clipboard"}
      disabled={isCopied}
      size="icon"
      variant={variant}
      className={cn(
        "absolute top-3 right-2 z-10 size-7 bg-code opacity-70 transition-all duration-200 ease-out hover:opacity-100 focus-visible:opacity-100 active:scale-[0.97] disabled:opacity-100",
        className
      )}
      onClick={async (event_) => {
        if (onClick) {
          onClick(event_)
          return
        }

        const hasCopied = await copyToClipboardWithMeta(
          value,
          event
            ? {
                name: event,
                properties: {
                  code: value,
                },
              }
            : undefined
        )

        if (hasCopied) {
          setHasCopied(true)
        }
      }}
      {...props}
    >
      <span className="sr-only">{isCopied ? "Copied" : "Copy"}</span>
      <CopyButtonIcon copied={isCopied} />
    </Button>
  )
}

export function CodeHeaderCopyButton({
  className,
  ...props
}: React.ComponentProps<typeof CopyButton>) {
  return (
    <CopyButton
      className={cn(codeHeaderCopyButtonClassName, className)}
      {...props}
    />
  )
}
