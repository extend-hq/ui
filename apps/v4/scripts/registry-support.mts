import { readFile } from "node:fs/promises"
import path from "node:path"

import {
  transformRegistrySource,
  type PrimitiveFamily,
} from "./registry-source.mts"

export async function getRegistrySupport(
  appRoot: string,
  family: PrimitiveFamily
) {
  const files = [
    [
      "@/components/extend/document-controls",
      "registry/extend/document-controls.tsx",
    ],
    [
      "@/components/extend/document-scroll-area",
      `registry/bases/${family}/document-scroll-area.tsx`,
    ],
    [
      "@/components/extend/document-color-popover",
      `registry/bases/${family}/document-color-popover.tsx`,
    ],
    ["@/lib/registry-icon-props", "lib/registry-icon-props.ts"],
  ] as const
  return new Map(
    await Promise.all(
      files.map(async ([name, file]) => {
        const content = await readFile(path.join(appRoot, file), "utf8")
        return [
          name,
          name.endsWith("document-controls")
            ? transformRegistrySource(content, family)
            : content,
        ] as const
      })
    )
  )
}
