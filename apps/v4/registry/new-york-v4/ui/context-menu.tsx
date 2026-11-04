"use client"

import * as React from "react"
import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu"

import { cn } from "@/lib/utils"
import { IconPlaceholder } from "@/components/icon-placeholder"

function childContent(
  asChild: boolean | undefined,
  children: React.ReactNode
): React.ReactNode {
  return asChild && React.isValidElement(children) ? undefined : children
}

function ContextMenu({
  ...props
}: ContextMenuPrimitive.Root.Props): React.ReactElement {
  return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />
}

function ContextMenuPortal({
  ...props
}: ContextMenuPrimitive.Portal.Props): React.ReactElement {
  return (
    <ContextMenuPrimitive.Portal data-slot="context-menu-portal" {...props} />
  )
}

function ContextMenuTrigger({
  asChild,
  children,
  render,
  ...props
}: ContextMenuPrimitive.Trigger.Props & {
  asChild?: boolean
}): React.ReactElement {
  return (
    <ContextMenuPrimitive.Trigger
      data-slot="context-menu-trigger"
      render={
        render ??
        (asChild && React.isValidElement(children)
          ? (children as React.ReactElement<Record<string, unknown>>)
          : undefined)
      }
      {...props}
    >
      {childContent(asChild, children)}
    </ContextMenuPrimitive.Trigger>
  )
}

function ContextMenuContent({
  className,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset,
  anchor,
  portalProps,
  children,
  ...props
}: ContextMenuPrimitive.Popup.Props & {
  portalProps?: ContextMenuPrimitive.Portal.Props
  side?: ContextMenuPrimitive.Positioner.Props["side"]
  sideOffset?: ContextMenuPrimitive.Positioner.Props["sideOffset"]
  align?: ContextMenuPrimitive.Positioner.Props["align"]
  alignOffset?: ContextMenuPrimitive.Positioner.Props["alignOffset"]
  anchor?: ContextMenuPrimitive.Positioner.Props["anchor"]
}): React.ReactElement {
  return (
    <ContextMenuPrimitive.Portal {...portalProps}>
      <ContextMenuPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="z-50"
        data-slot="context-menu-positioner"
        side={side}
        sideOffset={sideOffset}
      >
        <ContextMenuPrimitive.Popup
          className={cn(
            "relative flex origin-(--transform-origin) rounded-lg border bg-popover shadow-lg/5 outline-none not-dark:bg-clip-padding not-[class*='w-']:min-w-32 before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] focus:outline-none dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
            className
          )}
          data-slot="context-menu-content"
          {...props}
        >
          <div
            className="max-h-(--available-height) w-full overflow-y-auto p-1"
            data-slot="context-menu-viewport"
          >
            {children}
          </div>
        </ContextMenuPrimitive.Popup>
      </ContextMenuPrimitive.Positioner>
    </ContextMenuPrimitive.Portal>
  )
}

function ContextMenuGroup({
  ...props
}: ContextMenuPrimitive.Group.Props): React.ReactElement {
  return (
    <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />
  )
}

function ContextMenuItem({
  className,
  inset,
  variant = "default",
  asChild,
  children,
  render,
  ...props
}: ContextMenuPrimitive.Item.Props & {
  inset?: boolean
  variant?: "default" | "destructive"
  asChild?: boolean
}): React.ReactElement {
  return (
    <ContextMenuPrimitive.Item
      className={cn(
        "flex min-h-8 cursor-default items-center gap-2 rounded-sm px-2 py-1 text-base text-foreground outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-inset:ps-8 data-[variant=destructive]:text-destructive-foreground sm:min-h-7 sm:text-sm data-disabled:pointer-events-none data-disabled:opacity-64 [&>svg]:pointer-events-none [&>svg]:-mx-0.5 [&>svg]:shrink-0 [&>svg:not([class*='opacity-'])]:opacity-80 [&>svg:not([class*='size-'])]:size-4.5 sm:[&>svg:not([class*='size-'])]:size-4",
        className
      )}
      data-inset={inset}
      data-slot="context-menu-item"
      data-variant={variant}
      render={
        render ??
        (asChild && React.isValidElement(children)
          ? (children as React.ReactElement<Record<string, unknown>>)
          : undefined)
      }
      {...props}
    >
      {childContent(asChild, children)}
    </ContextMenuPrimitive.Item>
  )
}

function ContextMenuCheckboxItem({
  className,
  children,
  checked,
  variant = "default",
  ...props
}: ContextMenuPrimitive.CheckboxItem.Props & {
  variant?: "default" | "switch"
}): React.ReactElement {
  return (
    <ContextMenuPrimitive.CheckboxItem
      checked={checked}
      className={cn(
        "relative flex min-h-8 cursor-default items-center gap-2 rounded-sm py-1 pe-2 text-base outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground sm:min-h-7 sm:text-sm data-disabled:pointer-events-none data-disabled:opacity-64 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4",
        variant === "default" && "ps-8",
        variant === "switch" && "justify-between ps-2",
        className
      )}
      data-slot="context-menu-checkbox-item"
      data-variant={variant}
      {...props}
    >
      {variant === "switch" ? null : (
        <span className="pointer-events-none absolute start-2 flex size-4 items-center justify-center">
          <ContextMenuPrimitive.CheckboxItemIndicator>
            <IconPlaceholder
              lucide="Check"
              tabler="IconCheck"
              hugeicons="Tick02Icon"
              phosphor="CheckIcon"
              remixicon="RiCheckLine"
            />
          </ContextMenuPrimitive.CheckboxItemIndicator>
        </span>
      )}
      {children}
      {variant === "switch" ? (
        <span
          aria-hidden="true"
          className="pointer-events-none relative ms-4 inline-flex h-4 w-7 shrink-0 items-center rounded-full bg-input transition-colors data-[checked=true]:bg-primary"
          data-checked={checked ? "true" : "false"}
        >
          <span
            className="size-3 translate-x-0.5 rounded-full bg-background shadow-xs transition-transform data-[checked=true]:translate-x-3.5"
            data-checked={checked ? "true" : "false"}
          />
        </span>
      ) : null}
    </ContextMenuPrimitive.CheckboxItem>
  )
}

function ContextMenuRadioGroup({
  ...props
}: ContextMenuPrimitive.RadioGroup.Props): React.ReactElement {
  return (
    <ContextMenuPrimitive.RadioGroup
      data-slot="context-menu-radio-group"
      {...props}
    />
  )
}

function ContextMenuRadioItem({
  className,
  children,
  ...props
}: ContextMenuPrimitive.RadioItem.Props): React.ReactElement {
  return (
    <ContextMenuPrimitive.RadioItem
      className={cn(
        "relative flex min-h-8 cursor-default items-center gap-2 rounded-sm py-1 ps-8 pe-2 text-base outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground sm:min-h-7 sm:text-sm data-disabled:pointer-events-none data-disabled:opacity-64 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4",
        className
      )}
      data-slot="context-menu-radio-item"
      {...props}
    >
      <span className="pointer-events-none absolute start-2 flex size-4 items-center justify-center rounded-full border border-input">
        <ContextMenuPrimitive.RadioItemIndicator>
          <span className="size-2 rounded-full bg-current" />
        </ContextMenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  )
}

function ContextMenuLabel({
  className,
  inset,
  ...props
}: ContextMenuPrimitive.GroupLabel.Props & {
  inset?: boolean
}): React.ReactElement {
  return (
    <ContextMenuPrimitive.GroupLabel
      className={cn(
        "px-2 py-1.5 text-xs font-medium text-muted-foreground data-inset:ps-9 sm:data-inset:ps-8",
        className
      )}
      data-inset={inset}
      data-slot="context-menu-label"
      {...props}
    />
  )
}

function ContextMenuSeparator({
  className,
  ...props
}: ContextMenuPrimitive.Separator.Props): React.ReactElement {
  return (
    <ContextMenuPrimitive.Separator
      className={cn("mx-2 my-1 h-px bg-border", className)}
      data-slot="context-menu-separator"
      {...props}
    />
  )
}

function ContextMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"kbd">): React.ReactElement {
  return (
    <kbd
      className={cn(
        "ms-auto font-sans text-xs font-medium tracking-widest text-muted-foreground/72",
        className
      )}
      data-slot="context-menu-shortcut"
      {...props}
    />
  )
}

function ContextMenuSub({
  ...props
}: ContextMenuPrimitive.SubmenuRoot.Props): React.ReactElement {
  return (
    <ContextMenuPrimitive.SubmenuRoot data-slot="context-menu-sub" {...props} />
  )
}

function ContextMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: ContextMenuPrimitive.SubmenuTrigger.Props & {
  inset?: boolean
}): React.ReactElement {
  return (
    <ContextMenuPrimitive.SubmenuTrigger
      className={cn(
        "flex min-h-8 items-center gap-2 rounded-sm px-2 py-1 text-base text-foreground outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-inset:ps-8 data-popup-open:bg-accent data-popup-open:text-accent-foreground sm:min-h-7 sm:text-sm data-disabled:pointer-events-none data-disabled:opacity-64 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&>svg:not(:last-child)]:-mx-0.5",
        className
      )}
      data-inset={inset}
      data-slot="context-menu-sub-trigger"
      {...props}
    >
      {children}
      <IconPlaceholder
        lucide="ChevronRight"
        tabler="IconChevronRight"
        hugeicons="ArrowRight01Icon"
        phosphor="CaretRightIcon"
        remixicon="RiArrowRightSLine"
        className="ms-auto -me-0.5 opacity-80"
      />
    </ContextMenuPrimitive.SubmenuTrigger>
  )
}

function ContextMenuSubContent(
  props: React.ComponentProps<typeof ContextMenuContent>
): React.ReactElement {
  return (
    <ContextMenuContent
      side="inline-end"
      sideOffset={0}
      align="start"
      alignOffset={-5}
      {...props}
    />
  )
}

export {
  ContextMenu,
  ContextMenuPortal,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuLabel,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
}
