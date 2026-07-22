import { readFileSync } from "node:fs"
import { join } from "node:path"

import { DocsSourceCodeBlock } from "@/components/docs-code-block"

export { SchemaBuilderDemo } from "@/components/schema-builder-demo"

export function SchemaBuilderSource() {
  const code = readFileSync(
    join(process.cwd(), "components/extend/schema-builder.tsx"),
    "utf8"
  )

  return (
    <DocsSourceCodeBlock
      code={code}
      fileName="components/extend/schema-builder.tsx"
    />
  )
}
