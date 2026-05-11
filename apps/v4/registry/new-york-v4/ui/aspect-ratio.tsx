"use client";

import type React from "react";

function AspectRatio({
  ratio = 1,
  style,
  ...props
}: React.ComponentProps<"div"> & {
  ratio?: number;
}): React.ReactElement {
  return (
    <div
      data-slot="aspect-ratio"
      style={{ aspectRatio: ratio, ...style }}
      {...props}
    />
  );
}

export { AspectRatio };
