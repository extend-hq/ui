export function getRegistryFamily(style: string): "base" | "radix" | null {
  if (style.startsWith("base-")) return "base"
  if (style.startsWith("radix-") || ["new-york", "new-york-v4"].includes(style))
    return "radix"
  return null
}

export function styleRegistryDependencies<
  T extends { registryDependencies?: string[] },
>(item: T, style: string): T {
  return {
    ...item,
    registryDependencies: item.registryDependencies?.map((dependency) =>
      dependency.startsWith("@") || dependency.startsWith("http")
        ? dependency
        : `https://ui.shadcn.com/r/styles/${style}/${dependency}.json`
    ),
  }
}
