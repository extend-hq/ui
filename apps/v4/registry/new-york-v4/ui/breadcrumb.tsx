"use client"

import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"

import { cn } from "@/lib/utils"
import { IconPlaceholder } from "@/components/icon-placeholder"

export function Breadcrumb({
  ...props
}: React.ComponentProps<"nav">): React.ReactElement {
  return <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />
}

export function BreadcrumbList({
  className,
  ...props
}: React.ComponentProps<"ol">): React.ReactElement {
  return (
    <ol
      className={cn(
        "flex flex-wrap items-center gap-1.5 text-sm wrap-break-word text-muted-foreground sm:gap-2.5",
        className
      )}
      data-slot="breadcrumb-list"
      {...props}
    />
  )
}

export function BreadcrumbItem({
  className,
  ...props
}: React.ComponentProps<"li">): React.ReactElement {
  return (
    <li
      className={cn("inline-flex items-center gap-1.5", className)}
      data-slot="breadcrumb-item"
      {...props}
    />
  )
}

export function BreadcrumbLink({
  className,
  render,
  asChild = false,
  children,
  ...props
}: useRender.ComponentProps<"a"> & {
  asChild?: boolean
}): React.ReactElement {
  const renderValue =
    render ??
    (asChild && React.isValidElement(children)
      ? (children as React.ReactElement<Record<string, unknown>>)
      : undefined)
  const defaultProps = {
    children: asChild && React.isValidElement(children) ? undefined : children,
    className: cn("transition-colors hover:text-foreground", className),
    "data-slot": "breadcrumb-link",
  }

  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(defaultProps, props),
    render: renderValue,
  })
}

export function BreadcrumbPage({
  className,
  ...props
}: React.ComponentProps<"span">): React.ReactElement {
  return (
    <span
      aria-current="page"
      className={cn("font-normal text-foreground", className)}
      data-slot="breadcrumb-page"
      {...props}
    />
  )
}

export function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"li">): React.ReactElement {
  return (
    <li
      aria-hidden="true"
      className={cn("opacity-80 [&>svg]:size-4", className)}
      data-slot="breadcrumb-separator"
      role="presentation"
      {...props}
    >
      {children ?? (
        <IconPlaceholder
          lucide="ArrowRight"
          tabler="IconArrowRight"
          hugeicons="ArrowRight01Icon"
          phosphor="ArrowRightIcon"
          remixicon="RiArrowRightLine"
        />
      )}
    </li>
  )
}

export function BreadcrumbEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">): React.ReactElement {
  return (
    <span
      aria-hidden="true"
      className={className}
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      {...props}
    >
      <IconPlaceholder
        lucide="Ellipsis"
        tabler="IconDots"
        hugeicons="MoreHorizontalIcon"
        phosphor="DotsThreeIcon"
        remixicon="RiMoreLine"
        className="size-4"
      />
      <span className="sr-only">More</span>
    </span>
  )
}
