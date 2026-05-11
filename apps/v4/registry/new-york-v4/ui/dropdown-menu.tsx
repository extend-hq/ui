"use client";

import { Menu as DropdownMenuPrimitive } from "@base-ui/react/menu";
import { ArrowRight01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";
import { cn } from "@/lib/utils";

function childContent(
  asChild: boolean | undefined,
  children: React.ReactNode,
): React.ReactNode {
  return asChild && React.isValidElement(children) ? undefined : children;
}

function DropdownMenu({
  ...props
}: DropdownMenuPrimitive.Root.Props): React.ReactElement {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({
  ...props
}: DropdownMenuPrimitive.Portal.Props): React.ReactElement {
  return (
    <DropdownMenuPrimitive.Portal
      data-slot="dropdown-menu-portal"
      {...props}
    />
  );
}

function DropdownMenuTrigger({
  asChild,
  children,
  render,
  ...props
}: DropdownMenuPrimitive.Trigger.Props & {
  asChild?: boolean;
}): React.ReactElement {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      render={
        render ??
        (asChild && React.isValidElement(children)
          ? (children as React.ReactElement<Record<string, unknown>>)
          : undefined)
      }
      {...props}
    >
      {childContent(asChild, children)}
    </DropdownMenuPrimitive.Trigger>
  );
}

function DropdownMenuContent({
  className,
  side = "bottom",
  sideOffset = 4,
  align = "start",
  alignOffset = 0,
  anchor,
  portalProps,
  children,
  ...props
}: DropdownMenuPrimitive.Popup.Props & {
  portalProps?: DropdownMenuPrimitive.Portal.Props;
  side?: DropdownMenuPrimitive.Positioner.Props["side"];
  sideOffset?: DropdownMenuPrimitive.Positioner.Props["sideOffset"];
  align?: DropdownMenuPrimitive.Positioner.Props["align"];
  alignOffset?: DropdownMenuPrimitive.Positioner.Props["alignOffset"];
  anchor?: DropdownMenuPrimitive.Positioner.Props["anchor"];
}): React.ReactElement {
  return (
    <DropdownMenuPrimitive.Portal {...portalProps}>
      <DropdownMenuPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="z-50 h-(--positioner-height) w-(--positioner-width) max-w-(--available-width) transition-[top,left,right,bottom,transform] data-instant:transition-none"
        data-slot="dropdown-menu-positioner"
        side={side}
        sideOffset={sideOffset}
      >
        <DropdownMenuPrimitive.Popup
          className={cn(
            "relative flex h-(--popup-height,auto) w-(--popup-width,auto) min-w-32 origin-(--transform-origin) rounded-lg border bg-popover not-dark:bg-clip-padding text-popover-foreground shadow-lg/5 outline-none transition-[width,height,scale,opacity] before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] data-ending-style:scale-98 data-starting-style:scale-98 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
            className,
          )}
          data-slot="dropdown-menu-content"
          {...props}
        >
          <DropdownMenuPrimitive.Viewport
            className="relative size-full max-h-(--available-height) overflow-y-auto p-1 data-instant:transition-none"
            data-slot="dropdown-menu-viewport"
          >
            {children}
          </DropdownMenuPrimitive.Viewport>
        </DropdownMenuPrimitive.Popup>
      </DropdownMenuPrimitive.Positioner>
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuGroup({
  ...props
}: DropdownMenuPrimitive.Group.Props): React.ReactElement {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
  );
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  asChild,
  children,
  render,
  ...props
}: DropdownMenuPrimitive.Item.Props & {
  inset?: boolean;
  variant?: "default" | "destructive";
  asChild?: boolean;
}): React.ReactElement {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "relative flex min-h-8 cursor-default select-none items-center gap-2 rounded-sm px-2 py-1 text-base outline-none data-disabled:pointer-events-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-64 data-[inset=true]:ps-8 data-[variant=destructive]:text-destructive-foreground sm:min-h-7 sm:text-sm [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      data-inset={inset}
      data-slot="dropdown-menu-item"
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
    </DropdownMenuPrimitive.Item>
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: DropdownMenuPrimitive.CheckboxItem.Props): React.ReactElement {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      checked={checked}
      className={cn(
        "relative flex min-h-8 cursor-default select-none items-center gap-2 rounded-sm py-1 pe-2 ps-8 text-base outline-none data-disabled:pointer-events-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-64 sm:min-h-7 sm:text-sm [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      data-slot="dropdown-menu-checkbox-item"
      {...props}
    >
      <span className="pointer-events-none absolute start-2 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.CheckboxItemIndicator>
          <HugeiconsIcon icon={Tick02Icon} />
        </DropdownMenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup({
  ...props
}: DropdownMenuPrimitive.RadioGroup.Props): React.ReactElement {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  );
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: DropdownMenuPrimitive.RadioItem.Props): React.ReactElement {
  return (
    <DropdownMenuPrimitive.RadioItem
      className={cn(
        "relative flex min-h-8 cursor-default select-none items-center gap-2 rounded-sm py-1 pe-2 ps-8 text-base outline-none data-disabled:pointer-events-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-64 sm:min-h-7 sm:text-sm [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      data-slot="dropdown-menu-radio-item"
      {...props}
    >
      <span className="pointer-events-none absolute start-2 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.RadioItemIndicator>
          <span className="size-2 rounded-full bg-current" />
        </DropdownMenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: DropdownMenuPrimitive.GroupLabel.Props & {
  inset?: boolean;
}): React.ReactElement {
  return (
    <DropdownMenuPrimitive.GroupLabel
      className={cn(
        "px-2 py-1.5 font-medium text-muted-foreground text-xs data-[inset=true]:ps-8",
        className,
      )}
      data-inset={inset}
      data-slot="dropdown-menu-label"
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: DropdownMenuPrimitive.Separator.Props): React.ReactElement {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn("mx-2 my-1 h-px bg-border", className)}
      data-slot="dropdown-menu-separator"
      {...props}
    />
  );
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">): React.ReactElement {
  return (
    <span
      className={cn("ms-auto font-medium text-muted-foreground text-xs", className)}
      data-slot="dropdown-menu-shortcut"
      {...props}
    />
  );
}

function DropdownMenuSub({
  ...props
}: DropdownMenuPrimitive.SubmenuRoot.Props): React.ReactElement {
  return (
    <DropdownMenuPrimitive.SubmenuRoot
      data-slot="dropdown-menu-sub"
      {...props}
    />
  );
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: DropdownMenuPrimitive.SubmenuTrigger.Props & {
  inset?: boolean;
}): React.ReactElement {
  return (
    <DropdownMenuPrimitive.SubmenuTrigger
      className={cn(
        "flex min-h-8 cursor-default select-none items-center gap-2 rounded-sm px-2 py-1 text-base outline-none data-popup-open:bg-accent data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[inset=true]:ps-8 sm:min-h-7 sm:text-sm [&_svg:not([class*='size-'])]:size-4.5 sm:[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      data-inset={inset}
      data-slot="dropdown-menu-sub-trigger"
      {...props}
    >
      {children}
      <HugeiconsIcon icon={ArrowRight01Icon} className="ms-auto size-4" />
    </DropdownMenuPrimitive.SubmenuTrigger>
  );
}

function DropdownMenuSubContent(
  props: React.ComponentProps<typeof DropdownMenuContent>,
): React.ReactElement {
  return <DropdownMenuContent side="right" sideOffset={8} {...props} />;
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
