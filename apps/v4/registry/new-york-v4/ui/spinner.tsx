import type React from "react"

import { cn } from "@/lib/utils"
import { IconPlaceholder } from "@/components/icon-placeholder"

export function Spinner({
  className,
  ...props
}: React.ComponentProps<"svg">): React.ReactElement {
  return (
    <IconPlaceholder
      lucide="Loader2"
      tabler="IconLoader"
      hugeicons="Loading03Icon"
      phosphor="SpinnerIcon"
      remixicon="RiLoaderLine"
      aria-label="Loading"
      className={cn("animate-spin", className)}
      role="status"
      {...props}
    />
  )
}
