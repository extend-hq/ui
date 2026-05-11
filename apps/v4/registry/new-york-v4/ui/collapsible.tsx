"use client";

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";
import type React from "react";
import { isValidElement } from "react";
import { cn } from "@/lib/utils";

export function Collapsible({
  ...props
}: CollapsiblePrimitive.Root.Props): React.ReactElement {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

export function CollapsibleTrigger({
  className,
  asChild,
  children,
  render,
  ...props
}: CollapsiblePrimitive.Trigger.Props & {
  asChild?: boolean;
}): React.ReactElement {
  return (
    <CollapsiblePrimitive.Trigger
      className={className}
      data-slot="collapsible-trigger"
      render={
        render ??
        (asChild && isValidElement(children)
          ? (children as React.ReactElement<Record<string, unknown>>)
          : undefined)
      }
      {...props}
    >
      {asChild && isValidElement(children) ? undefined : children}
    </CollapsiblePrimitive.Trigger>
  );
}

export function CollapsiblePanel({
  className,
  forceMount: _forceMount,
  ...props
}: CollapsiblePrimitive.Panel.Props & {
  forceMount?: boolean;
}): React.ReactElement {
  return (
    <CollapsiblePrimitive.Panel
      className={cn(
        "h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 data-ending-style:h-0 data-starting-style:h-0",
        className,
      )}
      data-slot="collapsible-panel"
      {...props}
    />
  );
}

export { CollapsiblePrimitive, CollapsiblePanel as CollapsibleContent };
