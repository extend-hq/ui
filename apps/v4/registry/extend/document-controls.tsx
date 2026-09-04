"use client"

import type * as React from "react"

import type { RegistryIconProps } from "@/lib/registry-icon-props"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { IconPlaceholder } from "@/components/icon-placeholder"

export function Spinner({ className, ...props }: RegistryIconProps) {
  return (
    <IconPlaceholder
      lucide="LoaderCircle"
      tabler="IconLoader2"
      hugeicons="Loading03Icon"
      phosphor="CircleNotchIcon"
      remixicon="RiLoader4Line"
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export function DialogPanel({
  className,
  children,
  scrollFade = true,
  ...props
}: React.ComponentProps<"div"> & { scrollFade?: boolean }) {
  return (
    <ScrollArea scrollFade={scrollFade} className="min-h-0">
      <div
        data-slot="dialog-panel"
        className={cn("min-h-0", className)}
        {...props}
      >
        {children}
      </div>
    </ScrollArea>
  )
}

export function LoadingButton({
  loading,
  disabled,
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { loading?: boolean }) {
  return (
    <Button
      {...props}
      className={cn("relative", className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      <span className={cn("contents", loading && "invisible")}>{children}</span>
      {loading ? <Spinner className="pointer-events-none absolute" /> : null}
    </Button>
  )
}
