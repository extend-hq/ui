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
      "@/components/extend/workbook-menu",
      "registry/new-york-v4/ui/context-menu.tsx",
    ],
    [
      "@/components/extend/workbook-select",
      "registry/new-york-v4/ui/select.tsx",
    ],
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
        let content = await readFile(path.join(appRoot, file), "utf8")
        if (name.endsWith("workbook-select")) {
          content = content.replace(
            /\b(Select(?:Trigger|Content|Item|Value|Button|Group|Label|Separator|ScrollUpButton|ScrollDownButton|Primitive)?)\b/g,
            "Workbook$1"
          )
          content = content.replace(
            "import { WorkbookSelect as WorkbookSelectPrimitive }",
            "import { Select as WorkbookSelectPrimitive }"
          )
        }
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
