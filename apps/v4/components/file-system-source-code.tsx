import { readFileSync } from "node:fs"
import { join } from "node:path"

import { DocsSourceCodeBlock } from "@/components/docs-code-block"

export function FileSystemSource() {
  const code = readFileSync(
    join(process.cwd(), "components/extend/file-system.tsx"),
    "utf8"
  )

  return (
    <DocsSourceCodeBlock
      code={code}
      fileName="components/extend/file-system.tsx"
    />
  )
}
